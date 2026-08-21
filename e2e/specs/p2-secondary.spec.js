import { test, expect } from '@playwright/test';
import { apiRequest, loadIds, loginApi, startAssessment, tokens, USERS, E2E_PASSWORD } from '../helpers/api.js';
import { jobCreatePayload } from '../helpers/jobs.js';
import { loginAsAdminA, loginAsRecruiter, loginAsStudentA } from '../helpers/auth.js';

test.describe('P2 secondary workflows', () => {
  test('AUTH-10 refresh token rotation path', async () => {
    const login = await loginApi(USERS.studentA.email, E2E_PASSWORD, 'STUDENT');
    expect(login.status).toBe(200);
    expect(login.json.refreshToken).toBeTruthy();
    const refreshed = await apiRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: login.json.refreshToken },
    });
    expect(refreshed.status).toBe(200);
    expect(refreshed.json.accessToken).toBeTruthy();
    const invalid = await apiRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: 'invalid-refresh-token' },
    });
    expect(invalid.status).toBe(401);
  });

  test('STU-03 raise query', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/queries', {
      method: 'POST',
      token: t.studentA,
      body: {
        subject: 'E2E placement query',
        message: 'This is an E2E test query about placement eligibility.',
        type: 'question',
      },
    });
    expect(status).toBe(201);
    expect(json.query?.id || json.referenceId).toBeTruthy();
  });

  test('STU-04 public profile', async ({ page }) => {
    const ids = loadIds();
    const { status, json } = await apiRequest(`/public/profile/${ids.publicProfileId}`);
    expect(status).toBe(200);
    expect(json.fullName || json.data?.fullName).toMatch(/E2E Student A/i);
    const email = json.email ?? json.data?.email;
    if (email) {
      expect(email).toBe(USERS.studentA.email);
    }
    expect(JSON.stringify(json)).not.toMatch(/passwordHash|sessionVersion/i);
    await page.goto(`/profile/${ids.publicProfileId}`);
    await expect(page.locator('body')).toContainText(/E2E Student A/i);
  });

  test('JOB-03 duplicate company handling', async () => {
    const ids = loadIds();
    const t = await tokens();
    const created = await apiRequest('/jobs', {
      method: 'POST',
      token: t.adminA,
      body: jobCreatePayload(`JOB-COMPANY-DUP-${Date.now()}`),
    });
    expect([200, 201]).toContain(created.status);
    const companyId =
      created.json?.data?.companyId ||
      created.json?.companyId ||
      created.json?.job?.companyId;
    expect(companyId).toBe(ids.companyId);
  });

  test('ASM-10 SQL question not auto-scored', async () => {
    const ids = loadIds();
    const t = await tokens();
    const details = await apiRequest(`/assessments/details/${ids.assessments.sql}`, { token: t.studentA });
    const sqlQ = (details.json.questions || []).find((q) => q.type === 'SQL');
    expect(sqlQ).toBeTruthy();
    const started = await startAssessment(t.studentA, ids.assessments.sql);
    expect([200, 201]).toContain(started.status);
    const completed = await apiRequest(`/assessments/session/complete/${started.json.id}`, {
      method: 'POST',
      token: t.studentA,
      body: { answers: JSON.stringify({ [sqlQ.id]: 'SELECT * FROM students;' }) },
    });
    expect(completed.status).toBe(200);
    const score = Number(completed.json.score ?? completed.json.session?.score ?? 0);
    expect(score).toBe(0);
    test.info().annotations.push({
      type: 'product-gap',
      description: 'DATA-02: SQL answers are not graded in completeAssessment pipeline',
    });
  });

  test('COD-06 unsupported language', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/code/run', {
      method: 'POST',
      token: t.studentA,
      body: { language: 'ruby', code: 'puts "e2e"' },
    });
    expect(status).toBe(200);
    expect(String(json.error || json.output || '')).toMatch(/unsupported language/i);
  });

  test('MCK-05 code console slot access denied for B', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status } = await apiRequest(`/mock-interviews/slot/${ids.mocks.slotA}/live-code`, {
      token: t.studentB,
    });
    expect([403, 404]).toContain(status);
  });

  test('RSV-03 optimize suggestions stubbed or unavailable', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest('/students/resume/optimize', {
      method: 'POST',
      token: t.studentA,
      body: { jobId: ids.jobs.postedA },
    });
    expect([200, 503, 500]).toContain(status);
    if (status === 503) {
      test.info().annotations.push({
        type: 'environment',
        description: 'Mistral not configured — RSV-03 skipped AI body',
      });
      expect(JSON.stringify(json)).toMatch(/not configured|MISTRAL/i);
    } else if (status === 200) {
      expect(json.optimized || json.success).toBeTruthy();
    }
  });

  test('CMS-03 landing FAQs still hardcoded', async ({ page }) => {
    const landing = await apiRequest('/cms/public/landing');
    expect(landing.status).toBe(200);
    expect(JSON.stringify(landing.json)).toMatch(/E2E_FAQ_UNIQUE/);
    await page.goto('/');
    await expect(page.locator('body')).not.toContainText('E2E_FAQ_UNIQUE');
    await expect(page.locator('body')).toContainText(/Baar Baar Puche Gaye Sawaal|FAQs/i);
    test.info().annotations.push({
      type: 'product-gap',
      description: 'FAQs.jsx uses hardcoded faqData; published CMS FAQ section is ignored on landing',
    });
  });

  test('SRCH-03 no global search nav item', async ({ page }) => {
    await loginAsAdminA(page);
    await page.goto('/admin');
    await expect(page.locator('body')).not.toContainText(/Global Search/i);
    test.info().annotations.push({
      type: 'product-note',
      description: '?tab=globalSearch aliases to dashboard; no dedicated sidebar item',
    });
  });

  test('REC-04 pending recruiter cannot post job', async () => {
    const t = await tokens();
    const created = await apiRequest('/jobs', {
      method: 'POST',
      token: t.recruiterPending,
      body: jobCreatePayload(`JOB-PENDING-${Date.now()}`),
    });
    expect(created.status).toBe(403);
    expect(JSON.stringify(created.json).toLowerCase()).toMatch(/not active|forbidden|pending/i);
  });

  test('REC-05 recruiter analytics', async ({ page }) => {
    const t = await tokens();
    const { status, json } = await apiRequest('/recruiters/company-analytics', { token: t.recruiter });
    expect(status).toBe(200);
    expect(json).toBeTruthy();
    await loginAsRecruiter(page);
    await page.goto('/recruiter?tab=analytics');
    await expect(page.locator('body')).toBeVisible();
  });

  test('ERR-01 missing job fields', async () => {
    const t = await tokens();
    const payload = jobCreatePayload('Should Fail Validation');
    payload.jobTitle = '';
    const { status, json } = await apiRequest('/jobs', {
      method: 'POST',
      token: t.adminA,
      body: payload,
    });
    expect(status).toBe(400);
    expect(JSON.stringify(json).toLowerCase()).toMatch(/job title|required|validation/i);
  });
});
