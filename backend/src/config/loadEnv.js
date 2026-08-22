/**
 * Load backend environment.
 * When E2E=1, overlay backend/.env.e2e so Playwright can use an isolated database
 * without changing the developer's local .env.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: join(backendRoot, '.env') });

if (process.env.E2E === '1') {
  const e2eEnvFile = process.env.E2E_DB === 'postgres' ? '.env.e2e.postgres' : '.env.e2e';
  dotenv.config({ path: join(backendRoot, e2eEnvFile), override: true });
}
