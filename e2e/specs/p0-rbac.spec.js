import { test, expect } from '@playwright/test';
import { USERS, apiRequest, tokens } from '../helpers/api.js';
import { loginAsStudentA, uiLogin } from '../helpers/auth.js';

test.describe('P0 RBAC', () => {
  test('RBAC-01 student cannot use admin UI', async ({ page }) => {
    await loginAsStudentA(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/student/, { timeout: 10000 });
    expect(new URL(page.url()).pathname).toMatch(/^\/student/);
  });

  test('RBAC-02 student cannot create jobs', async () => {
    const t = await tokens();
    const { status } = await apiRequest('/jobs', {
      method: 'POST',
      token: t.studentA,
      body: { jobTitle: 'Should Fail', description: 'x', requirements: 'x' },
    });
    expect(status).toBe(403);
  });

  test('RBAC-03 recruiter cannot list all students', async () => {
    const t = await tokens();
    const { status } = await apiRequest('/students', { token: t.recruiter });
    expect(status).toBe(403);
  });

  test('RBAC-04 student cannot fetch audit logs', async () => {
    const t = await tokens();
    const { status } = await apiRequest('/admin/audit-logs', { token: t.studentA });
    expect([401, 403]).toContain(status);
  });

  test('RBAC-05 admin cannot mutate CMS', async () => {
    const t = await tokens();
    const { status } = await apiRequest('/cms/sections', {
      method: 'POST',
      token: t.adminA,
      body: { sectionKey: 'STATS', title: 'nope', status: 'DRAFT' },
    });
    expect(status).toBe(403);
  });

  test('RBAC-06 recruiter cannot open student dashboard', async ({ page }) => {
    await uiLogin(page, { email: USERS.recruiter.email, role: 'Recruiter' });
    await page.waitForURL(/\/recruiter/, { timeout: 20000 });
    await page.goto('/student', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/recruiter/, { timeout: 10000 });
    expect(new URL(page.url()).pathname).toMatch(/^\/recruiter/);
  });
});
