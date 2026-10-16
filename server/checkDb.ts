import dotenv from 'dotenv';
dotenv.config();

import { pingDatabase } from './db';

(async function main() {
  try {
    const res = await pingDatabase();
    console.log('PING_RESULT', JSON.stringify(res));
    if (!res.ok) process.exitCode = 2;
  } catch (err: any) {
    console.error('PING_EXCEPTION', err?.message || String(err));
    process.exitCode = 3;
  }
})();
