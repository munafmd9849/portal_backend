import { E2E_PASSWORD, USERS } from '../fixtures/users.js';

export async function openLoginModal(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^Login$/i }).first().click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).waitFor({ state: 'visible' });
}

export async function uiLogin(page, { email, password = E2E_PASSWORD, role = 'Student' }) {
  await openLoginModal(page);
  if (role && role !== 'Student') {
    await page.getByRole('button', { name: new RegExp(`^${role}$`, 'i') }).click();
  }
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /^Sign in$/i }).click();
}

export async function loginAsStudentA(page) {
  await uiLogin(page, { email: USERS.studentA.email, role: 'Student' });
  await page.waitForURL(/\/student/, { timeout: 20000 });
}

export async function loginAsRecruiter(page) {
  await uiLogin(page, { email: USERS.recruiter.email, role: 'Recruiter' });
  await page.waitForURL(/\/recruiter/, { timeout: 20000 });
}

export async function loginAsAdminA(page) {
  await uiLogin(page, { email: USERS.adminA.email, role: 'Admin' });
  await page.waitForURL(/\/admin/, { timeout: 20000 });
}

export async function loginAsSuperAdmin(page) {
  await uiLogin(page, { email: USERS.superAdmin.email, role: 'Admin' });
  await page.waitForURL(/\/(super-admin|admin)/, { timeout: 20000 });
}

export async function injectAuth(page, { accessToken, refreshToken = 'e2e-refresh', user }) {
  await page.addInitScript(([token, refresh, userJson]) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refresh);
    if (userJson) localStorage.setItem('user', userJson);
  }, [accessToken, refreshToken, user ? JSON.stringify(user) : null]);
}
