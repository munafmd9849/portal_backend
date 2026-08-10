/**
 * Shared Prisma client for data/ seed scripts.
 * Loads backend/.env so DATABASE_URL=file:./dev.db works.
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env'), override: true });

const dbUrl = (process.env.DATABASE_URL || '').trim();
if (!dbUrl) {
  throw new Error('DATABASE_URL missing. Set it in backend/.env (e.g. file:./dev.db).');
}

export const prisma = new PrismaClient();

export function assertSqliteFriendly() {
  const lowered = dbUrl.toLowerCase();
  if (
    !lowered.startsWith('file:')
    && !lowered.startsWith('postgresql://')
    && !lowered.startsWith('postgres://')
  ) {
    throw new Error(`Unsupported DATABASE_URL: ${dbUrl}`);
  }
  console.log(`📦 Seed target: ${dbUrl.startsWith('file:') ? 'SQLite' : 'PostgreSQL'} (${dbUrl})`);
}
