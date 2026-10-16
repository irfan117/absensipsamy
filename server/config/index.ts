import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: mysql.Pool | null = null;

function isCloudDatabase(host: string, port: number): boolean {
  return /tidbcloud|aws|google|azure|cloud/i.test(host) || port === 4000;
}

function shouldUseSsl(host: string, port: number): boolean {
  if (process.env.TIDB_SSL !== undefined) {
    return process.env.TIDB_SSL === 'true';
  }
  return isCloudDatabase(host, port);
}

export function createPool(): mysql.Pool {
  if (!pool) {
    const host = process.env.TIDB_HOST || 'localhost';
    const port = Number(process.env.TIDB_PORT) || 3306;
    const rawSocketPath = process.env.TIDB_SOCKET_PATH;
    const socketPath = (rawSocketPath && fs.existsSync(rawSocketPath)) ? rawSocketPath : undefined;
    const user = process.env.TIDB_USER || 'root';
    const password = process.env.TIDB_PASSWORD || '';
    const database = process.env.TIDB_DATABASE || '';
    const useTls = !socketPath && shouldUseSsl(host, port);

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      socketPath,
      ssl: useTls ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
      connectTimeout: 60_000,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function initDatabase(): Promise<void> {
  try {
    const connection = await createPool().getConnection();
    connection.release();
    console.log('[DB] Database connection initialized');
  } catch (error) {
    throw error;
  }
}

export function getPool(): mysql.Pool {
  if (!pool) createPool();
  return pool!;
}

export async function pingDatabase(): Promise<{ ok: boolean; error?: string }> {
  const connection = await getPool().getConnection();
  try {
    await connection.query('SELECT 1 AS test');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  } finally {
    connection.release();
  }
}

export default getPool;
