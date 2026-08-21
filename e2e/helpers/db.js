import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../../backend');
const dbPath = join(backendRoot, 'prisma/e2e.db');

export function latestOtp(email, purpose = 'RESET_PASSWORD') {
  const sql = `SELECT otp FROM otps WHERE email = '${email.replace(/'/g, "''")}' AND purpose = '${purpose}' AND isUsed = 0 ORDER BY createdAt DESC LIMIT 1;`;
  try {
    const otp = execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' }).trim();
    return otp ? { otp } : null;
  } catch {
    return null;
  }
}
