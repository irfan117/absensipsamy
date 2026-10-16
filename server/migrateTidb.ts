import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'node:crypto';
import { ensureDatabaseExists, getPool, initDatabase } from './db.js';

function randomEightDigitNumber(): string {
  return String(randomInt(10_000_000, 100_000_000));
}

async function main() {
  await ensureDatabaseExists();
  await initDatabase();
  const pool = getPool();

  for (const [table, column] of [
    ['users', 'kejuruan_name'], ['kejuruan', 'name'], ['attendance_records', 'kejuruan_name'],
    ['leave_requests', 'kejuruan_name'], ['missions', 'kejuruan_name'],
    ['mission_submissions', 'kejuruan_name'], ['daily_reports', 'kejuruan_name'],
  ]) {
    await pool.query(`ALTER TABLE ${table} MODIFY COLUMN ${column} VARCHAR(255)${table === 'kejuruan' || table === 'missions' ? ' NOT NULL' : ' NULL'}`);
  }

  const [nimColumnExists] = await pool.query<any[]>(
    `SELECT COLUMN_NAME AS column_name FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'nim' LIMIT 1`,
    [process.env.TIDB_DATABASE || 'absensi_psa']
  );

  if (nimColumnExists.length > 0) {
    await pool.query('ALTER TABLE users DROP COLUMN nim');
    console.log('[TiDB] Kolom nim berhasil dihapus dari tabel users.');
  }

  const [emailColumnExists] = await pool.query<any[]>(
    `SELECT COLUMN_NAME AS column_name FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email' LIMIT 1`,
    [process.env.TIDB_DATABASE || 'absensi_psa']
  );

  if (emailColumnExists.length > 0) {
    await pool.query('ALTER TABLE users DROP COLUMN email');
    console.log('[TiDB] Kolom email berhasil dihapus dari tabel users.');
  }

  const [invalidUserCodes] = await pool.query<any[]>(
    `SELECT COUNT(*) AS total FROM users WHERE login_code NOT REGEXP '^[0-9]{8}$'`
  );

  if (Number(invalidUserCodes[0]?.total || 0) > 0) {
    console.warn(`[TiDB] Terdapat kode login lama yang bukan 8 digit; data dipertahankan namun perlu diselaraskan ke pola 8 digit.`);
  }

  const [existingAdmins] = await pool.query<any[]>(
    "SELECT id FROM users WHERE role = 'admin' AND name = ? LIMIT 1",
    ['Abdul rozzak junaidi']
  );
  if (existingAdmins.length > 0) {
    const [tables] = await pool.query<any[]>('SHOW TABLES');
    console.log(`[TiDB] Skema selesai; ${tables.length} tabel tersedia: ${tables.map(row => Object.values(row)[0]).join(', ')}.`);
    console.log('[TiDB] Akun admin Abdul rozzak junaidi sudah ada; tidak membuat duplikat.');
    await pool.end();
    return;
  }

  let loginCode = randomEightDigitNumber();
  let password = randomEightDigitNumber();
  let freeCode = false;

  while (!freeCode) {
    loginCode = randomEightDigitNumber();
    password = randomEightDigitNumber();
    const [matches] = await pool.query<any[]>(
      'SELECT id FROM users WHERE login_code = ? LIMIT 1',
      [loginCode]
    );
    freeCode = matches.length === 0;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString().slice(0, 10);
  const id = `user-admin-${randomUUID()}`;

  await pool.query(
    `INSERT INTO users (
      id, name, role, status, joined_date, login_code, password_hash
    ) VALUES (?, ?, 'admin', 'active', ?, ?, ?)`,
    [id, 'Abdul rozzak junaidi', now, loginCode, passwordHash]
  );

  const [tables] = await pool.query<any[]>('SHOW TABLES');
  console.log(`[TiDB] Migrasi selesai; ${tables.length} tabel terdeteksi: ${tables.map(row => Object.values(row)[0]).join(', ')}.`);
  console.log(`Akun admin dibuat: Abdul rozzak junaidi | Kode login: ${loginCode} | Sandi: ${password}`);
  await pool.end();
}

main().catch(error => {
  console.error(`[TiDB] Migrasi gagal: ${error.code || error.message}`);
  process.exitCode = 1;
});
