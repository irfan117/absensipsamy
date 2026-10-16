import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getPool } from '../config/index.js';
import { authenticateToken, comparePassword, generateToken, AuthenticatedRequest } from '../auth.js';

const router = Router();

function normalizeUserRow(row: any) {
  const loginCode = row.login_code || row.loginCode || row.nim || '';
  return {
    id: String(row.id),
    nim: String(loginCode),
    name: String(row.name || ''),
    role: row.role,
    avatar: row.avatar || '',
    status: row.status || 'active',
    joinedDate: row.joined_date || '',
    kejuruanId: row.kejuruan_id || undefined,
    kejuruanName: row.kejuruan_name || undefined,
    loginCode: String(loginCode || ''),
  };
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const code = String(req.body?.code ?? req.body?.identifier ?? '').trim();
    const password = String(req.body?.password ?? '').trim();

    if (!code || !password) {
      return res.status(400).json({
        success: false,
        message: 'Kode login/NIM dan kata sandi wajib diisi.',
      });
    }

    const [rows] = await getPool().query<any[]>(
      'SELECT * FROM users WHERE login_code = ? LIMIT 1',
      [code]
    );

    const userRow = rows?.[0];
    if (!userRow) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan. Periksa kode login/NIM atau kata sandi Anda.',
      });
    }

    const validPassword = await comparePassword(password, userRow.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Kata sandi salah. Silakan coba lagi.',
      });
    }

    const safeUser = normalizeUserRow(userRow);
    const token = generateToken({
      id: safeUser.id,
      nim: safeUser.nim,
      name: safeUser.name,
      role: safeUser.role,
      kejuruanId: safeUser.kejuruanId,
      kejuruanName: safeUser.kejuruanName,
      loginCode: safeUser.loginCode,
      avatar: safeUser.avatar,
    });

    return res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('[Auth] login error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Gagal memproses login.',
    });
  }
});

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await getPool().query<any[]>(
      'SELECT id, name, role, avatar, status, joined_date, kejuruan_id, kejuruan_name, login_code FROM users WHERE id = ? LIMIT 1',
      [req.user?.id]
    );

    if (!rows?.[0]) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    return res.json({ success: true, user: normalizeUserRow(rows[0]) });
  } catch (error: any) {
    console.error('[Auth] me error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Gagal mengambil profil user.' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('hadirku_auth', { path: '/' });
  return res.json({ success: true, message: 'Logout berhasil.' });
});

router.put('/kejuruan', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'mentor') {
      return res.status(403).json({ success: false, message: 'Pengaturan kejuruan ini hanya untuk mentor.' });
    }

    const kejuruanId = String(req.body?.kejuruanId ?? '').trim();
    const pool = getPool();
    const [programs] = await pool.query<any[]>(
      'SELECT id, name, mentor_id, mentor_name FROM kejuruan WHERE id = ? LIMIT 1',
      [kejuruanId]
    );

    if (!programs?.[0]) {
      return res.status(400).json({ success: false, message: 'Pilih kejuruan yang valid.' });
    }

    const program = programs[0];
    if (program.mentor_id && String(program.mentor_id) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Kejuruan ini sudah terikat ke mentor lain. Pilih kejuruan yang sesuai dengan mentor Anda.',
      });
    }

    await pool.query(
      'UPDATE kejuruan SET mentor_id = ?, mentor_name = ? WHERE id = ?',
      [req.user.id, req.user.name, program.id]
    );

    await pool.query(
      'UPDATE users SET kejuruan_id = ?, kejuruan_name = ? WHERE id = ?',
      [program.id, program.name, req.user.id]
    );

    return res.json({
      success: true,
      message: 'Kejuruan profil berhasil diperbarui.',
      kejuruanId: String(program.id),
      kejuruanName: String(program.name),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Gagal memperbarui kejuruan profil.' });
  }
});

router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentPassword = String(req.body?.currentPassword ?? '').trim();
    const newPassword = String(req.body?.newPassword ?? '').trim();

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Kata sandi lama dan baru wajib diisi.' });
    }

    if (!/^\d{8}$/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Kata sandi baru harus 8 digit angka.' });
    }

    const [rows] = await getPool().query<any[]>(
      'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
      [req.user!.id]
    );

    if (!rows?.[0]) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, rows[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: 'Kata sandi lama tidak valid.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await getPool().query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user!.id]);

    return res.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
  } catch (error: any) {
    console.error('[Auth] change-password error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Gagal mengubah kata sandi.' });
  }
});

export default router;
