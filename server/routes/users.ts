import { Router, Response } from 'express';
import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '../config/index.js';
import { AuthenticatedRequest } from '../auth.js';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user || !['admin', 'mentor'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Akses daftar pengguna tidak diizinkan.' });
  }

  try {
    const pool = getPool();
    const columns = `id, nim, name, email, role, avatar, phone, kejuruan_id, kejuruan_name,
      status, joined_date, login_code`;
    let rows: any[];
    if (user.role === 'admin') {
      [rows] = await pool.query<any[]>(`SELECT ${columns} FROM users ORDER BY name`);
    } else {
      [rows] = await pool.query<any[]>(
        `SELECT ${columns} FROM users
          WHERE id = ? OR (role = 'trainee' AND (
            kejuruan_id IN (SELECT id FROM kejuruan WHERE mentor_id = ? OR id = ?)
            OR LOWER(TRIM(kejuruan_name)) = LOWER(TRIM(?))
            OR LOWER(TRIM(kejuruan_name)) IN
              (SELECT LOWER(TRIM(name)) FROM kejuruan
                WHERE mentor_id = ?
                  OR LOWER(TRIM(mentor_name)) = LOWER(TRIM(?))
                  OR LOWER(TRIM(mentor_name)) LIKE CONCAT('%', LOWER(TRIM(?)), '%'))
          ))
          ORDER BY name`,
        [user.id, user.id, user.kejuruanId || '', user.kejuruanName || '', user.id, user.name || '', user.name || ''],
      );
    }

    const users = rows.map(row => ({
      id: String(row.id),
      nim: String(row.nim || ''),
      name: String(row.name || ''),
      email: row.email || '',
      role: row.role,
      avatar: row.avatar || '',
      phone: row.phone || '',
      kejuruanId: row.kejuruan_id || undefined,
      kejuruanName: row.kejuruan_name || undefined,
      status: row.status || 'active',
      joinedDate: row.joined_date || '',
      loginCode: row.login_code || undefined,
    }));
    return res.json({ success: true, users });
  } catch (error: any) {
    console.error('[Users] get list error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat daftar pengguna.' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Hanya admin yang dapat membuat akun.' });
  }

  const body = req.body || {};
  const name = String(body.name || '').trim();
  const role = body.role;
  const password = String(body.password || '');
  const providedNim = String(body.nim || '').trim();
  if (!name || !['mentor', 'trainee'].includes(role) || !/^\d{8}$/.test(password)) {
    return res.status(400).json({ success: false, message: 'Nama, role, dan kata sandi 8 digit wajib diisi.' });
  }
  if (providedNim && !/^\d{8}$/.test(providedNim)) {
    return res.status(400).json({ success: false, message: 'NIM harus terdiri dari 8 digit angka.' });
  }
  if (!body.kejuruanId || !body.kejuruanName) {
    return res.status(400).json({ success: false, message: 'Program kejuruan wajib dipilih.' });
  }

  try {
    const pool = getPool();
    const [programRows] = await pool.query<any[]>('SELECT id,name FROM kejuruan WHERE id = ? LIMIT 1', [body.kejuruanId]);
    if (!programRows.length) return res.status(400).json({ success: false, message: 'Program kejuruan tidak ditemukan.' });
    const programName = String(programRows[0].name);
    let loginCode = '';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = String(randomInt(10_000_000, 100_000_000));
      const [existing] = await pool.query<any[]>(
        'SELECT id FROM users WHERE login_code = ? OR nim = ? LIMIT 1',
        [candidate, candidate],
      );
      if (!existing.length) {
        loginCode = candidate;
        break;
      }
    }
    if (!loginCode) throw new Error('Gagal membuat kode login unik. Coba lagi.');

    const nim = providedNim || loginCode;
    const email = String(body.email || `${loginCode}@hadirku.id`).trim();
    const [duplicates] = await pool.query<any[]>(
      'SELECT id FROM users WHERE nim = ? OR email = ? LIMIT 1',
      [nim, email],
    );
    if (duplicates.length) {
      return res.status(409).json({ success: false, message: 'NIM atau email sudah digunakan akun lain.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    await pool.query(
      `INSERT INTO users
        (id, nim, name, email, role, avatar, phone, kejuruan_id, kejuruan_name,
         status, joined_date, login_code, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [id, nim, name, email, role, body.avatar || null, body.phone || null,
        body.kejuruanId, programName,
        body.joinedDate || new Date().toISOString().slice(0, 10), loginCode, passwordHash],
    );

    const user = {
      id, nim, name, email, role, avatar: body.avatar || '', phone: body.phone || '',
      kejuruanId: body.kejuruanId, kejuruanName: programName,
      status: 'active', joinedDate: body.joinedDate || new Date().toISOString().slice(0, 10),
      loginCode, password, plainPassword: password,
    };
    return res.status(201).json({ success: true, message: 'Akun pengguna berhasil dibuat.', user });
  } catch (error: any) {
    console.error('[Users] create error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat akun pengguna.' });
  }
});

router.post('/batch', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengimpor akun.' });
  const incoming = Array.isArray(req.body?.users) ? req.body.users : [];
  if (!incoming.length) return res.status(400).json({ success: false, message: 'Tidak ada akun untuk diimpor.' });

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const createdUsers: any[] = [];
    const createdPrograms: string[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < incoming.length; index += 1) {
      const body = incoming[index] || {};
      const name = String(body.name || '').trim();
      const roleValue = String(body.role || '').trim().toLowerCase();
      const role = ['peserta', 'siswa', 'magang'].includes(roleValue) ? 'trainee'
        : ['instruktur', 'pengajar'].includes(roleValue) ? 'mentor' : roleValue;
      const nim = String(body.nim || body.loginCode || '').trim();
      const loginCode = String(body.loginCode || nim).trim();
      const password = String(body.password || body.plainPassword || '');
      let kejuruanId = String(body.kejuruanId || '').trim();
      if (!name || !['mentor', 'trainee'].includes(role) || !/^\d{8}$/.test(nim) || !/^\d{8}$/.test(loginCode) || !/^\d{8}$/.test(password)) {
        throw new Error(`Data baris ${index + 1} tidak lengkap: nama, role, NIM/kode, sandi 8 digit, dan program wajib valid.`);
      }
      if (seen.has(nim) || seen.has(loginCode)) throw new Error(`NIM atau kode login ganda pada baris ${index + 1}.`);
      seen.add(nim); seen.add(loginCode);
      let programRows: any[] = [];
      if (kejuruanId) {
        [programRows] = await connection.query<any[]>('SELECT id,name FROM kejuruan WHERE id = ? LIMIT 1', [kejuruanId]);
      }
      // Excel files can contain a program label instead of the database ID.
      // Resolve it against the canonical catalog instead of rejecting the whole import.
      const programLabel = String(body.kejuruanName || '').trim();
      if (!programRows.length && programLabel) {
        const [catalog] = await connection.query<any[]>('SELECT id,name,code FROM kejuruan');
        const normalizeProgram = (value: unknown) => String(value || '').normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedLabel = normalizeProgram(programLabel);
        const matchedProgram = catalog.find((program) => {
          const normalizedName = normalizeProgram(program.name);
          const normalizedCode = normalizeProgram(program.code);
          return normalizedLabel === normalizedName || normalizedLabel === normalizedCode ||
            (!!normalizedCode && normalizedLabel.startsWith(normalizedCode)) ||
            (!!normalizedName && normalizedLabel.startsWith(normalizedName));
        });
        programRows = matchedProgram ? [matchedProgram] : [];
        if (programRows.length) kejuruanId = String(programRows[0].id);
      }
      if (!programRows.length && programLabel) {
        // A new program name in an import is a valid catalog entry. Create it
        // inside this transaction so the participant can reference it safely.
        const programId = randomUUID();
        const programCode = programLabel.trim().split(/\s+/).filter(Boolean)
          .map((word: string) => word.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 1))
          .join('').toLocaleUpperCase('id-ID').slice(0, 16) || 'KJ';
        await connection.query(
          `INSERT INTO kejuruan (id,name,code,category,color,description,mentor_id,mentor_name)
           VALUES (?,?,?,'Umum','#2563eb','',NULL,NULL)`,
          [programId, programLabel, programCode],
        );
        programRows = [{ id: programId, name: programLabel }];
        kejuruanId = programId;
        createdPrograms.push(programLabel);
      }
      if (!programRows.length) throw new Error(`Nama program pada baris ${index + 1} wajib diisi.`);
      const email = String(body.email || `${loginCode}@hadirku.id`).trim();
      const [duplicates] = await connection.query<any[]>('SELECT id FROM users WHERE nim = ? OR login_code = ? OR email = ? LIMIT 1', [nim, loginCode, email]);
      if (duplicates.length) throw new Error(`NIM, kode login, atau email pada baris ${index + 1} sudah digunakan.`);
      const id = randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const programName = String(body.kejuruanName || programRows[0].name);
      await connection.query(
        `INSERT INTO users (id,nim,name,email,role,avatar,phone,kejuruan_id,kejuruan_name,status,joined_date,login_code,password_hash)
         VALUES (?,?,?,?,?,?,?,?,?,'active',?,?,?)`,
        [id,nim,name,email,role,body.avatar || null,body.phone || null,kejuruanId,programName,body.joinedDate || new Date().toISOString().slice(0,10),loginCode,passwordHash]
      );
      createdUsers.push({ id,nim,name,email,role,avatar:body.avatar || '',phone:body.phone || '',kejuruanId,kejuruanName:programName,status:'active',joinedDate:body.joinedDate || new Date().toISOString().slice(0,10),loginCode,password,plainPassword:password });
    }
    await connection.commit();
    const programMessage = createdPrograms.length
      ? ` ${[...new Set(createdPrograms)].length} program kejuruan baru juga ditambahkan ke katalog.`
      : '';
    return res.status(201).json({ success: true, count: createdUsers.length, createdUsers, message: `${createdUsers.length} akun berhasil diimpor.${programMessage}` });
  } catch (error: any) {
    await connection.rollback();
    const duplicate = error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062;
    const status = duplicate ? 409 : (error instanceof Error && /baris \d+|tidak lengkap|tidak ditemukan|ganda|sudah digunakan/i.test(error.message) ? 400 : 500);
    const message = duplicate
      ? 'Impor dibatalkan karena NIM, kode login, atau email sudah terdaftar. Periksa baris yang diimpor dan gunakan data unik.'
      : error?.message || 'Impor akun gagal.';
    if (status === 500) console.error('[Users] batch import database error:', error);
    return res.status(status).json({ success: false, message, ...(duplicate ? { code: 'DUPLICATE_USER' } : {}) });
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengubah akun.' });
  const body = req.body || {};
  const updates: string[] = [];
  const values: any[] = [];
  const fields: Record<string, string> = { name: 'name', nim: 'nim', email: 'email', phone: 'phone', avatar: 'avatar', kejuruanId: 'kejuruan_id', kejuruanName: 'kejuruan_name', status: 'status' };
  if (body.kejuruanName !== undefined && body.kejuruanId === undefined) {
    return res.status(400).json({ success: false, message: 'Nama program harus mengikuti ID kejuruan kanonik.' });
  }
  let canonicalProgramName: string | undefined;
  if (body.kejuruanId !== undefined) {
    try {
      const [programRows] = await getPool().query<any[]>('SELECT name FROM kejuruan WHERE id = ? LIMIT 1', [body.kejuruanId]);
      if (!programRows.length) return res.status(400).json({ success: false, message: 'Program kejuruan tidak ditemukan.' });
      canonicalProgramName = String(programRows[0].name);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Program kejuruan gagal diverifikasi.' });
    }
  }
  for (const [key, column] of Object.entries(fields)) {
    if (key === 'kejuruanName' && canonicalProgramName !== undefined) {
      updates.push(`${column} = ?`); values.push(canonicalProgramName); continue;
    }
    if (body[key] !== undefined) { updates.push(`${column} = ?`); values.push(body[key] || null); }
  }
  if (body.nim !== undefined && !/^\d{8}$/.test(String(body.nim))) return res.status(400).json({ success: false, message: 'NIM harus terdiri dari 8 digit angka.' });
  if (!updates.length) return res.status(400).json({ success: false, message: 'Tidak ada perubahan akun.' });
  try {
    values.push(req.params.id);
    const [result]: any = await getPool().query(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role <> 'admin'`, values);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Akun tidak ditemukan atau akun admin tidak dapat diubah melalui menu ini.' });
    const [rows] = await getPool().query<any[]>('SELECT id,nim,name,email,role,avatar,phone,kejuruan_id,kejuruan_name,status,joined_date,login_code FROM users WHERE id = ?', [req.params.id]);
    return res.json({ success: true, user: rows[0] });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error?.message || 'Gagal memperbarui akun.' });
  }
});

router.post('/batch-delete-trainees', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat menghapus peserta.' });
  const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(String))] : [];
  if (!ids.length) return res.status(400).json({ success: false, count: 0, message: 'Pilih minimal satu peserta.' });
  try {
    const [result]: any = await getPool().query(`DELETE FROM users WHERE role = 'trainee' AND id IN (${ids.map(() => '?').join(',')})`, ids);
    return res.json({ success: true, count: result.affectedRows || 0, message: `${result.affectedRows || 0} peserta berhasil dihapus.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, count: 0, message: error?.message || 'Gagal menghapus peserta.' });
  }
});

router.delete('/clear/:role', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, count: 0, message: 'Hanya admin yang dapat menghapus akun massal.' });
  const role = req.params.role;
  if (!['trainee', 'mentor', 'all'].includes(role)) return res.status(400).json({ success: false, count: 0, message: 'Target penghapusan tidak valid.' });
  try {
    const where = role === 'all' ? "role IN ('trainee','mentor')" : 'role = ?';
    const [result]: any = await getPool().query(`DELETE FROM users WHERE ${where}`, role === 'all' ? [] : [role]);
    return res.json({ success: true, count: result.affectedRows || 0, message: `${result.affectedRows || 0} akun berhasil dihapus.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, count: 0, message: error?.message || 'Gagal menghapus akun.' });
  }
});

router.post('/:id/regenerate-credentials', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengubah kredensial.' });
  try {
    const pool = getPool();
    const [rows] = await pool.query<any[]>("SELECT id FROM users WHERE id = ? AND role <> 'admin' LIMIT 1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Akun tidak ditemukan atau merupakan akun admin.' });
    let loginCode = '';
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const candidate = String(randomInt(10_000_000, 100_000_000));
      const [taken] = await pool.query<any[]>('SELECT id FROM users WHERE id <> ? AND (nim = ? OR login_code = ?) LIMIT 1', [req.params.id, candidate, candidate]);
      if (!taken.length) { loginCode = candidate; break; }
    }
    if (!loginCode) throw new Error('Gagal membuat kredensial unik.');
    const password = String(randomInt(10_000_000, 100_000_000));
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET login_code = ?, password_hash = ? WHERE id = ?', [loginCode, hash, req.params.id]);
    return res.json({ success: true, loginCode, password, message: 'Kredensial berhasil diperbarui.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Gagal membuat kredensial baru.' });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat menghapus akun.' });
  try {
    const [result]: any = await getPool().query("DELETE FROM users WHERE id = ? AND role <> 'admin'", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Akun tidak ditemukan atau akun admin tidak dapat dihapus.' });
    return res.json({ success: true, message: 'Akun berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Gagal menghapus akun.' });
  }
});

export default router;
