import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export default async function globalSetup() {
  execSync('node backend/scripts/seed-e2e.js', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, E2E: '1' },
  });
}
