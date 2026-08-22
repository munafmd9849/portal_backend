import { test, expect } from '@playwright/test';
import { USERS, E2E_PASSWORD, loginApi, apiRequest } from '../helpers/api.js';
import { loginAsStudentA, uiLogin } from '../helpers/auth.js';

test.describe('P0 Authentication', () => {
  test('AUTH-01 valid student login', async ({ page }) => {
    await loginAsStudentA(page);
    await expect(page).toHaveURL(/\/student/);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
  });

  test('AUTH-02 invalid password', async ({ page }) => {
    await uiLogin(page, { email: USERS.studentA.email, password: 'WrongPass#999', role: 'Student' });
    await expect(page.getByText(/invalid credentials|incorrect password|authentication failed|login failed/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page).not.toHaveURL(/\/student/, { timeout: 2000 });
  });

  test('AUTH-03 blocked user cannot login', async ({ page }) => {
    const { status, json } = await loginApi(USERS.studentBlocked.email, E2E_PASSWORD, 'STUDENT');
    expect(status).toBe(403);
    expect(JSON.stringify(json).toLowerCase()).toMatch(/block/);

    await uiLogin(page, { email: USERS.studentBlocked.email, role: 'Student' });
    await expect(page.getByText(/block|disabled|access denied/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('AUTH-04 logout', async ({ page }) => {
    await loginAsStudentA(page);
    const logout = page.getByRole('button', { name: /logout/i }).first();
    await logout.click();
    const confirm = page.locator('#logout-confirm');
    if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirm.click();
    }
    await page.waitForURL((url) => !url.pathname.startsWith('/student'), { timeout: 15000 });
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeFalsy();
    await page.goto('/student');
    await expect(page).not.toHaveURL(/\/student\/?$/);
  });

  test('AUTH-05 unauthenticated protected route', async ({ page }) => {
    await page.goto('/student');
    await expect(page).toHaveURL(/\/$|\/login/);
  });

  test('AUTH-06 student single-device session', async () => {
    const first = await loginApi(USERS.studentA.email, E2E_PASSWORD, 'STUDENT');
    expect(first.status).toBe(200);
    await new Promise((r) => setTimeout(r, 1200));
    const second = await loginApi(USERS.studentA.email, E2E_PASSWORD, 'STUDENT');
    expect(second.status).toBe(200);
    const stale = await apiRequest('/auth/me', { token: first.json.accessToken });
    expect(stale.status).toBe(401);
    expect(stale.json?.code || '').toMatch(/SESSION_SUPERSEDED/i);
    const live = await apiRequest('/auth/me', { token: second.json.accessToken });
    expect(live.status).toBe(200);
  });
});
