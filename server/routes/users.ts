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
          WHERE id = ? OR (role = 'trainee' AND kejuruan_id IN
            (SELECT id FROM kejuruan WHERE mentor_id = ? OR id = ?))
          ORDER BY name`,
        [user.id, user.id, user.kejuruanId || ''],
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
  if (!name || !['mentor', 'trainee'].includes(role) || !password) {
    return res.status(400).json({ success: false, message: 'Nama, role, dan kata sandi wajib diisi.' });
  }
  if (providedNim && !/^\d{8}$/.test(providedNim)) {
    return res.status(400).json({ success: false, message: 'NIM harus terdiri dari 8 digit angka.' });
  }

  try {
    const pool = getPool();
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
        body.kejuruanId || null, body.kejuruanName || null,
        body.joinedDate || new Date().toISOString().slice(0, 10), loginCode, passwordHash],
    );

    const user = {
      id, nim, name, email, role, avatar: body.avatar || '', phone: body.phone || '',
      kejuruanId: body.kejuruanId || undefined, kejuruanName: body.kejuruanName || undefined,
      status: 'active', joinedDate: body.joinedDate || new Date().toISOString().slice(0, 10),
      loginCode, password, plainPassword: password,
    };
    return res.status(201).json({ success: true, message: 'Akun pengguna berhasil dibuat.', user });
  } catch (error: any) {
    console.error('[Users] create error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat akun pengguna.' });
  }
});

export default router;
