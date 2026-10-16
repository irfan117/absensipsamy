import { Router, Response } from 'express';
import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '../config/index.js';
import { AuthenticatedRequest } from '../auth.js';

const router = Router();

const USER_COLUMNS = `id, name, role, avatar, kejuruan_id, kejuruan_name,
      status, joined_date, login_code`;

const mapUserRow = (row: any, extras: Record<string, unknown> = {}) => ({
  id: String(row.id),
  nim: String(row.login_code || row.nim || ''),
  name: String(row.name || ''),
  role: row.role,
  avatar: row.avatar || '',
  kejuruanId: row.kejuruan_id || undefined,
  kejuruanName: row.kejuruan_name || undefined,
  status: row.status || 'active',
  joinedDate: row.joined_date || '',
  loginCode: String(row.login_code || row.nim || ''),
  ...extras,
});

const requireAdmin = (req: AuthenticatedRequest, res: Response): boolean => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Hanya admin yang dapat melakukan aksi ini.' });
    return false;
  }
  return true;
};

const generateUniqueLoginCode = async (pool: ReturnType<typeof getPool>): Promise<string> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = String(randomInt(10_000_000, 100_000_000));
    const [existing] = await pool.query<any[]>(
      'SELECT id FROM users WHERE login_code = ? LIMIT 1',
      [candidate],
    );
    if (!existing.length) return candidate;
  }
  throw new Error('Gagal membuat kode login unik. Coba lagi.');
};

const generatePassword = () => String(randomInt(10_000_000, 100_000_000));

const validateKejuruanForUser = async (pool: ReturnType<typeof getPool>, role: string, kejuruanId?: string, kejuruanName?: string) => {
  if (!['mentor', 'trainee'].includes(role)) return { valid: true };

  const normalizedId = String(kejuruanId || '').trim();
  if (!normalizedId) {
    return { valid: false, message: 'Kejuruan wajib dipilih untuk mentor atau peserta.' };
  }

  const [programRows] = await pool.query<any[]>('SELECT id, name FROM kejuruan WHERE id = ? LIMIT 1', [normalizedId]);
  if (!programRows.length) {
    return { valid: false, message: 'Kejuruan yang dipilih tidak valid.' };
  }

  return { valid: true, program: programRows[0] };
};

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user || !['admin', 'mentor'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Akses daftar pengguna tidak diizinkan.' });
  }

  try {
    const pool = getPool();
    let rows: any[];
    if (user.role === 'admin') {
      [rows] = await pool.query<any[]>(`SELECT ${USER_COLUMNS} FROM users ORDER BY name`);
    } else {
      [rows] = await pool.query<any[]>(
        `SELECT ${USER_COLUMNS} FROM users
          WHERE id = ? OR (role = 'trainee' AND kejuruan_id IN
            (SELECT id FROM kejuruan WHERE mentor_id = ? OR id = ?))
          ORDER BY name`,
        [user.id, user.id, user.kejuruanId || ''],
      );
    }

    return res.json({ success: true, users: rows.map((row) => mapUserRow(row)) });
  } catch (error: any) {
    console.error('[Users] get list error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat daftar pengguna.' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const body = req.body || {};
  const name = String(body.name || '').trim();
  const role = typeof body.role === 'string' ? body.role.toLowerCase() : body.role;
  const password = String(body.password || '');
  if (!name || !['mentor', 'trainee'].includes(role) || !password) {
    return res.status(400).json({ success: false, message: 'Import akun hanya diperbolehkan untuk mentor dan peserta. Role admin tidak didukung.' });
  }

  try {
    const pool = getPool();
    const kejuruanCheck = await validateKejuruanForUser(pool, role, body.kejuruanId, body.kejuruanName);
    if (!kejuruanCheck.valid) {
      return res.status(400).json({ success: false, message: kejuruanCheck.message });
    }

    const preferredLoginCode = String(body.loginCode ?? body.nim ?? '').trim();
    const loginCode = /^\d{8}$/.test(preferredLoginCode)
      ? preferredLoginCode
      : await generateUniqueLoginCode(pool);
    const [duplicates] = await pool.query<any[]>(
      'SELECT id FROM users WHERE login_code = ? LIMIT 1',
      [loginCode],
    );
    if (duplicates.length) {
      return res.status(409).json({ success: false, message: 'Kode login sudah digunakan akun lain.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    const joinedDate = body.joinedDate || new Date().toISOString().slice(0, 10);
    await pool.query(
      `INSERT INTO users
        (id, name, role, avatar, kejuruan_id, kejuruan_name,
         status, joined_date, login_code, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [id, name, role, body.avatar || null,
        body.kejuruanId || null, body.kejuruanName || null,
        joinedDate, loginCode, passwordHash],
    );

    const user = {
      id, nim: loginCode, name, role, avatar: body.avatar || '',
      kejuruanId: body.kejuruanId || undefined, kejuruanName: body.kejuruanName || undefined,
      status: 'active', joinedDate, loginCode, password, plainPassword: password,
    };
    return res.status(201).json({ success: true, message: 'Akun pengguna berhasil dibuat.', user });
  } catch (error: any) {
    console.error('[Users] create error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat akun pengguna.' });
  }
});

router.post('/batch', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const usersInput = Array.isArray(req.body?.users) ? req.body.users : [];
  if (!usersInput.length) {
    return res.status(400).json({ success: false, count: 0, message: 'Daftar pengguna kosong.' });
  }

  try {
    const pool = getPool();
    const createdUsers: any[] = [];
    let skipped = 0;

    for (const body of usersInput) {
      const name = String(body.name || '').trim();
      const roleValue = typeof body.role === 'string' ? body.role.toLowerCase() : body.role;
      const role = roleValue === 'mentor' ? 'mentor' : roleValue === 'trainee' ? 'trainee' : null;
      if (!name || !role) {
        skipped += 1;
        continue;
      }

      const kejuruanCheck = await validateKejuruanForUser(pool, role, body.kejuruanId, body.kejuruanName);
      if (!kejuruanCheck.valid) {
        skipped += 1;
        continue;
      }

      const preferredLoginCode = String(body.loginCode ?? body.nim ?? '').trim();
      const loginCode = /^\d{8}$/.test(preferredLoginCode)
        ? preferredLoginCode
        : await generateUniqueLoginCode(pool);
      const password = String(body.password || generatePassword());

      const [duplicates] = await pool.query<any[]>(
        'SELECT id FROM users WHERE login_code = ? LIMIT 1',
        [loginCode],
      );
      if (duplicates.length) {
        skipped += 1;
        continue;
      }

      const id = randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const joinedDate = body.joinedDate || new Date().toISOString().slice(0, 10);
      await pool.query(
        `INSERT INTO users
          (id, name, role, avatar, kejuruan_id, kejuruan_name,
           status, joined_date, login_code, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        [id, name, role, body.avatar || null,
          body.kejuruanId || null, body.kejuruanName || null,
          joinedDate, loginCode, passwordHash],
      );

      createdUsers.push({
        id, nim: loginCode, name, role, avatar: body.avatar || '',
        kejuruanId: body.kejuruanId || undefined, kejuruanName: body.kejuruanName || undefined,
        status: 'active', joinedDate, loginCode, password, plainPassword: password,
      });
    }

    return res.status(201).json({
      success: true,
      count: createdUsers.length,
      skipped,
      createdUsers,
      message: `${createdUsers.length} pengguna berhasil diimpor${skipped ? `, ${skipped} dilewati` : ''}.`,
    });
  } catch (error: any) {
    console.error('[Users] batch import error:', error);
    return res.status(500).json({ success: false, count: 0, message: 'Gagal mengimpor pengguna.' });
  }
});

router.post('/batch-delete-trainees', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((id: unknown) => String(id)).filter(Boolean)
    : [];
  if (!ids.length) {
    return res.status(400).json({ success: false, count: 0, message: 'Tidak ada ID peserta yang dipilih.' });
  }

  try {
    const pool = getPool();
    const placeholders = ids.map(() => '?').join(',');
    const [result]: any = await pool.query(
      `DELETE FROM users WHERE role = 'trainee' AND id IN (${placeholders})`,
      ids,
    );
    const count = Number(result?.affectedRows || 0);
    return res.json({
      success: true,
      count,
      message: `${count} akun peserta berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('[Users] batch-delete-trainees error:', error);
    return res.status(500).json({ success: false, count: 0, message: 'Gagal menghapus peserta terpilih.' });
  }
});

router.delete('/clear/:role', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const roleTarget = String(req.params.role || '');
  if (!['trainee', 'mentor', 'all'].includes(roleTarget)) {
    return res.status(400).json({ success: false, count: 0, message: 'Target role tidak valid.' });
  }

  try {
    const pool = getPool();
    let result: any;
    if (roleTarget === 'all') {
      [result] = await pool.query(`DELETE FROM users WHERE role IN ('trainee', 'mentor')`);
    } else {
      [result] = await pool.query(`DELETE FROM users WHERE role = ?`, [roleTarget]);
    }
    const count = Number(result?.affectedRows || 0);
    return res.json({
      success: true,
      count,
      message: `${count} akun berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('[Users] clear by role error:', error);
    return res.status(500).json({ success: false, count: 0, message: 'Gagal menghapus pengguna secara massal.' });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const body = req.body || {};

  try {
    const pool = getPool();
    const [existingRows] = await pool.query<any[]>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }
    if (existingRows[0].role === 'admin') {
      return res.status(403).json({ success: false, message: 'Akun admin tidak dapat diubah lewat endpoint ini.' });
    }

    const name = body.name != null ? String(body.name).trim() : existingRows[0].name;
    const avatar = body.avatar != null ? String(body.avatar) : existingRows[0].avatar;
    const status = body.status != null ? String(body.status) : existingRows[0].status;
    const kejuruanId = body.kejuruanId !== undefined ? (body.kejuruanId || null) : existingRows[0].kejuruan_id;
    const kejuruanName = body.kejuruanName !== undefined ? (body.kejuruanName || null) : existingRows[0].kejuruan_name;
    const role = body.role && ['mentor', 'trainee'].includes(body.role) ? body.role : existingRows[0].role;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama wajib diisi.' });
    }

    await pool.query(
      `UPDATE users SET name = ?, avatar = ?, status = ?,
        kejuruan_id = ?, kejuruan_name = ?, role = ? WHERE id = ?`,
      [name, avatar, status, kejuruanId, kejuruanName, role, id],
    );

    if (body.password) {
      const passwordHash = await bcrypt.hash(String(body.password), 10);
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    }

    const [updatedRows] = await pool.query<any[]>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
      [id],
    );
    return res.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      user: mapUserRow(updatedRows[0]),
    });
  } catch (error: any) {
    console.error('[Users] update error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui data pengguna.' });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  try {
    const pool = getPool();
    const [existingRows] = await pool.query<any[]>(
      'SELECT id, role FROM users WHERE id = ? LIMIT 1',
      [id],
    );
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }
    if (existingRows[0].role === 'admin') {
      return res.status(403).json({ success: false, message: 'Akun admin tidak dapat dihapus.' });
    }

    const [result]: any = await pool.query('DELETE FROM users WHERE id = ? AND role != ?', [id, 'admin']);
    const deleted = Number(result?.affectedRows || 0) > 0;
    return res.json({
      success: deleted,
      message: deleted ? 'Pengguna berhasil dihapus.' : 'Pengguna gagal dihapus.',
    });
  } catch (error: any) {
    console.error('[Users] delete error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus pengguna.' });
  }
});

router.post('/:id/regenerate-credentials', async (req: AuthenticatedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  try {
    const pool = getPool();
    const [existingRows] = await pool.query<any[]>(
      'SELECT id, role FROM users WHERE id = ? LIMIT 1',
      [id],
    );
    if (!existingRows.length) {
      return res.status(404).json({
        success: false, loginCode: '', password: '', message: 'Pengguna tidak ditemukan.',
      });
    }
    if (existingRows[0].role === 'admin') {
      return res.status(403).json({
        success: false, loginCode: '', password: '', message: 'Kredensial admin tidak dapat diacak ulang lewat endpoint ini.',
      });
    }

    const loginCode = await generateUniqueLoginCode(pool);
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET login_code = ?, password_hash = ? WHERE id = ?',
      [loginCode, passwordHash, id],
    );

    return res.json({
      success: true,
      loginCode,
      password,
      message: 'Kredensial berhasil diacak ulang.',
    });
  } catch (error: any) {
    console.error('[Users] regenerate credentials error:', error);
    return res.status(500).json({
      success: false, loginCode: '', password: '', message: 'Gagal mengacak ulang kredensial.',
    });
  }
});

export default router;
