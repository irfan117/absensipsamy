import express, { Response } from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createPool, initDatabase, getPool, pingDatabase } from './config';
import cors from 'cors';
import kejuruanRoutes from './routes/kejuruan.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leave.js';
import missionsRoutes from './routes/missions.js';
import dailyReportsRoutes from './routes/daily-reports.js';
import settingsRoutes from './routes/settings.js';
import hallOfFameRoutes from './routes/hall-of-fame.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import { authenticateToken } from './auth.js';
import { appDataRouter } from './appData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const AUTH_COOKIE = 'hadirku_auth';
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const isVercelRuntime = process.env.VERCEL === '1';
const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || isVercelRuntime,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: AUTH_COOKIE_MAX_AGE,
};

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// Cookie-based auth
app.use((req: any, res: any, next: any) => {
  const cookieToken = req.headers.cookie
    ?.split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('hadirku_auth='))
    ?.slice('hadirku_auth='.length);
  if (cookieToken) {
    req.headers.authorization = `Bearer ${cookieToken}`;
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/kejuruan', authenticateToken, kejuruanRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/leaves', authenticateToken, leaveRoutes);
app.use('/api/missions', authenticateToken, missionsRoutes);
app.use('/api/daily-reports', authenticateToken, dailyReportsRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/hall-of-fame', authenticateToken, hallOfFameRoutes);
app.use('/api/app-data', appDataRouter);

// Health check
app.get('/api/health', (_req: any, res: Response) => {
  res.json({ success: true, message: 'API is running' });
});

async function ensureDefaultAdmin() {
  const pool = getPool();
  const loginCode = '10101010';
  const password = '12341234';
  const email = `${loginCode}@hadirku.id`;
  const passwordHash = '$2b$10$1OyoJU/3oeJvbWitoUSORuenG0gmzBsZUHwXCkzkc/69mXH/SDpba';

  const [existingAdmins] = await pool.query<any[]>(
    "SELECT id FROM users WHERE role = 'admin' AND (login_code IN (?, ?) OR nim IN (?, ?) OR email IN (?, ?) OR name LIKE '%Rozzak%' OR name LIKE '%rozzak%') LIMIT 1",
    [loginCode, '10000001', loginCode, '10000001', email, '10000001@hadirku.id']
  );

  if (existingAdmins.length > 0) {
    await pool.query(
      `UPDATE users SET nim = ?, name = ?, email = ?, login_code = ?, password_hash = ?, status = 'active', joined_date = '2025-01-10' WHERE id = ?`,
      [loginCode, 'Abdul Rozzak Junaidi', email, loginCode, passwordHash, existingAdmins[0].id]
    );
    console.log(`[Auth] Akun admin default dipastikan: Kode login ${loginCode}, password ${password}`);
    return;
  }

  const id = `user-admin-${Date.now()}`;
  await pool.query(
    `INSERT INTO users (
      id, nim, name, email, role, status, joined_date, login_code, password_hash
    ) VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?, ?)`,
    [id, loginCode, 'Abdul Rozzak Junaidi', email, '2025-01-10', loginCode, passwordHash]
  );

  console.log(`[Auth] Akun admin default dibuat: Kode login ${loginCode}, password ${password}`);
}

// Start server after initializing TiDB
async function startServer() {
  try {
    await initDatabase();
    await ensureDefaultAdmin();
    const server = app.listen(PORT, () => {
      console.log(`[Server] AbsensiPsa API running on port ${PORT}`);
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server Error] Port ${PORT} sedang dipakai proses lain.`);
      } else {
        console.error('[Server Error] Gagal membuka HTTP server:', err);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('[Server Error] Failed to initialize TiDB:', err);
    process.exit(1);
  }
}

export default app;

if (!isVercelRuntime) {
  void startServer();
}
