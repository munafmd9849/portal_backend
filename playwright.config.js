import { defineConfig, devices } from '@playwright/test';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const backend = join(root, 'backend');
const frontend = join(root, 'frontend');

const API_PORT = process.env.E2E_API_PORT || '3100';
const FRONTEND_PORT = process.env.E2E_FRONTEND_PORT || '5174';
const API_URL = `http://localhost:${API_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  webServer: [
    {
      command: 'node scripts/seed-e2e.js && node src/server.js',
      cwd: backend,
      url: `${API_URL}/health`,
      reuseExistingServer: process.env.E2E_REUSE === '1',
      timeout: 120_000,
      env: {
        ...process.env,
        E2E: '1',
        NODE_ENV: 'development',
        PORT: API_PORT,
      },
    },
    {
      command: 'npx vite --port 5174 --strictPort',
      cwd: frontend,
      url: FRONTEND_URL,
      reuseExistingServer: process.env.E2E_REUSE === '1',
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_BASE_URL: `${API_URL}/api`,
        VITE_API_URL: `${API_URL}/api`,
        VITE_SOCKET_URL: API_URL,
        VITE_FRONTEND_URL: FRONTEND_URL,
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
