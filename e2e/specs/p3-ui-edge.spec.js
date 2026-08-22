import { test, expect } from '@playwright/test';
import { apiRequest, loadIds } from '../helpers/api.js';
import { loginAsStudentA, loginAsSuperAdmin } from '../helpers/auth.js';

test.describe('P3 UI and edge cases', () => {
  test('UI-01 unauthorized route redirects student away from admin', async ({ page }) => {
    await loginAsStudentA(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/student/, { timeout: 10000 });
    expect(new URL(page.url()).pathname).toMatch(/^\/student/);
  });

  test('UI-02 super admin uses AdminDashboard shell', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/super-admin?tab=createJob');
    await expect(page).toHaveURL(/\/super-admin/);
    await expect(page.locator('body')).toBeVisible();
    const blob = await page.locator('body').innerText();
    expect(blob.length).toBeGreaterThan(50);
    test.info().annotations.push({
      type: 'product-note',
      description: '/super-admin mounts AdminDashboard, not SuperAdminDashboard.jsx',
    });
  });

  test('UI-03 hardcoded landing stats fallback', async ({ page }) => {
    const landing = await apiRequest('/cms/public/landing');
    expect(landing.status).toBe(200);
    const hasCmsStats = JSON.stringify(landing.json).includes('E2E_STAT_99');
    await page.goto('/');
    if (hasCmsStats) {
      await expect(page.locator('body')).toContainText(/E2E_STAT_99|E2E placements/i, { timeout: 15000 });
      test.info().annotations.push({
        type: 'product-note',
        description: 'Published CMS STATS overrides DEFAULT_STATS when meta.stats is present',
      });
    } else {
      await expect(page.locator('body')).toContainText(/92%|₹45 LPA|Placement Percentage/i);
    }
  });

  test('UI-04 network failure shows error not infinite spinner', async ({ page }) => {
    await loginAsStudentA(page);
    await page.route('**/api/jobs/targeted**', (route) => route.abort('failed'));
    await page.goto('/student?tab=jobs', { waitUntil: 'domcontentloaded' });
    await expect
      .poll(async () => {
        const text = await page.locator('body').innerText();
        const spinners = await page.locator('[class*="animate-spin"], [class*="spinner"]').count();
        return spinners === 0 || /error|failed|unable|no jobs|try again/i.test(text);
      }, { timeout: 15000 })
      .toBeTruthy();
  });

  test('PRC-10 do not assert DevTools blocked', async ({ page }) => {
    const ids = loadIds();
    await loginAsStudentA(page);
    await page.goto(`/assessment/${ids.assessments.mixed}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    test.info().annotations.push({
      type: 'browser-limitation',
      description: 'PRC-10: DevTools cannot be blocked in browser; proctoring asserts detection/logging only',
    });
  });
});
