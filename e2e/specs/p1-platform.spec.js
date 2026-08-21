import { test, expect } from '@playwright/test';
import { apiRequest, loadIds, tokens, USERS } from '../helpers/api.js';
import { loginAsRecruiter, loginAsSuperAdmin } from '../helpers/auth.js';
import { jobCreatePayload } from '../helpers/jobs.js';

test.describe('P1 interviews CMS search dashboard recruiter', () => {
  test('MCK-04 completed slot results', async () => {
    const ids = loadIds();
    const t = await tokens();
    const student = await apiRequest(`/mock-interviews/results/slot/${ids.mocks.slotDone}`, {
      token: t.studentA,
    });
    expect(student.status).toBe(200);
    expect(JSON.stringify(student.json)).toMatch(/GOOD|E2E completed mock/i);
    const admin = await apiRequest(`/mock-interviews/results/slot/${ids.mocks.slotDone}`, {
      token: t.adminA,
    });
    expect(admin.status).toBe(200);
    const other = await apiRequest(`/mock-interviews/results/slot/${ids.mocks.slotDone}`, {
      token: t.studentB,
    });
    expect([403, 404]).toContain(other.status);
  });

  test('AI-02 student starts guided interview', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await apiRequest(`/ai-mock-interviews/enrollment/${ids.ai.enrollmentA}/start`, {
      method: 'POST',
      token: t.studentA,
      body: {},
    });
    expect(started.status).toBe(200);
    expect(String(started.json.status || started.json.enrollment?.status)).toMatch(/IN_PROGRESS/i);
    const progress = await apiRequest(`/ai-mock-interviews/enrollment/${ids.ai.enrollmentA}/progress`, {
      method: 'PATCH',
      token: t.studentA,
      body: { currentQuestionIndex: 0, progressPercent: 10 },
    });
    expect(progress.status).toBe(200);
  });

  test('AI-03 student result after complete', async () => {
    const ids = loadIds();
    const t = await tokens();
    const a = await apiRequest(`/ai-mock-interviews/student/results/${ids.ai.enrollmentDone}`, {
      token: t.studentA,
    });
    expect(a.status).toBe(200);
    expect(JSON.stringify(a.json)).not.toMatch(/CONVERSATIONAL/);
    const b = await apiRequest(`/ai-mock-interviews/student/results/${ids.ai.enrollmentDone}`, {
      token: t.studentB,
    });
    expect([403, 404]).toContain(b.status);
  });

  test('AI-04 admin review dashboard', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/ai-mock-interviews/${ids.ai.interviewDone}/review`, {
      token: t.adminA,
    });
    expect(status).toBe(200);
    expect(json).toBeTruthy();
  });

  test('RSV-01 resume PDF generate', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/students/generate-resume-pdf', {
      method: 'POST',
      token: t.studentA,
      body: { templateId: '1' },
    });
    expect([200, 503]).toContain(status);
    if (status === 503) {
      test.info().annotations.push({
        type: 'environment',
        description: 'Puppeteer not installed — frontend PDF fallback',
      });
      expect(json.fallback || json.error).toBeTruthy();
    }
  });

  test('RSV-02 ATS analysis score', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/students/resume/ats-analysis', {
      method: 'POST',
      token: t.studentA,
      body: {
        resumeText: 'JavaScript React Node.js intern at E2E TechCorp. Built REST APIs and React dashboards.',
      },
    });
    expect(status).toBe(200);
    const score = json.analysis?.atsScore ?? json.atsScore;
    expect(typeof score).toBe('number');
  });

  test('ATS-01 admin ATS list scoped', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/admin/resume-ats', { token: t.adminA });
    expect(status).toBe(200);
    const rows = json.rows || json.students || json.items || json.data || [];
    const blob = JSON.stringify(json).toLowerCase();
    expect(blob).not.toContain(USERS.studentB.email);
    expect(Array.isArray(rows) || blob.includes('e2e.student.a')).toBeTruthy();
  });

  test('DSH-02 control tower loads scoped', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/admin/control-tower/all', { token: t.adminA });
    expect(status).toBe(200);
    expect(json).toBeTruthy();
    const blob = JSON.stringify(json).toLowerCase();
    expect(blob).not.toContain(USERS.studentB.email);
  });

  test('DSH-03 super admin stats', async ({ page }) => {
    const t = await tokens();
    const ok = await apiRequest('/super-admin/stats/summary', { token: t.superAdmin });
    expect(ok.status).toBe(200);
    const denied = await apiRequest('/super-admin/stats/summary', { token: t.adminA });
    expect(denied.status).toBe(403);
    await loginAsSuperAdmin(page);
    await page.goto('/super-admin?tab=superAdminStats');
    await expect(page.locator('body')).toBeVisible();
  });

  test('DSH-04 super admin analytics funnel', async () => {
    const t = await tokens();
    const ok = await apiRequest('/super-admin/analytics/funnel', { token: t.superAdmin });
    expect(ok.status).toBe(200);
    const numbers = JSON.stringify(ok.json).match(/-?\d+(\.\d+)?/g) || [];
    expect(numbers.some((n) => Number(n) >= 0)).toBeTruthy();
    const denied = await apiRequest('/super-admin/analytics/funnel', { token: t.adminA });
    expect(denied.status).toBe(403);
  });

  test('CMS-01 published STATS on public landing', async ({ page }) => {
    const { status, json } = await apiRequest('/cms/public/landing');
    expect(status).toBe(200);
    expect(JSON.stringify(json)).toMatch(/E2E_STAT_99/);
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/E2E_STAT_99|E2E placements/i, { timeout: 15000 });
  });

  test('CMS-02 draft STATS omitted from public landing', async ({ page }) => {
    const { status, json } = await apiRequest('/cms/public/landing');
    expect(status).toBe(200);
    expect(JSON.stringify(json)).not.toMatch(/E2E_DRAFT_HIDDEN/);
    await page.goto('/');
    await expect(page.locator('body')).not.toContainText('E2E_DRAFT_HIDDEN');
  });

  test('SRCH-01 super admin search students', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest(
      '/search?q=e2e.student.a&types=STUDENT',
      { token: t.superAdmin },
    );
    expect(status).toBe(200);
    expect(JSON.stringify(json).toLowerCase()).toContain('e2e.student.a');
  });

  test('SRCH-02 empty and injection-like queries are safe', async () => {
    const t = await tokens();
    const empty = await apiRequest('/search?q=&types=STUDENT', { token: t.superAdmin });
    const sqli = await apiRequest("/search?q=%27%20OR%201=1&types=STUDENT", { token: t.superAdmin });
    expect(empty.status).not.toBe(500);
    expect(sqli.status).not.toBe(500);
    expect([200, 400]).toContain(empty.status);
    expect([200, 400]).toContain(sqli.status);
  });

  test('AUD-01 super admin audit logs after login', async () => {
    const t = await tokens();
    const sa = await apiRequest('/admin/audit-logs', { token: t.superAdmin });
    expect(sa.status).toBe(200);
    const admin = await apiRequest('/admin/audit-logs', { token: t.adminA });
    expect([401, 403]).toContain(admin.status);
  });

  test('REC-02 recruiter dashboard', async ({ page }) => {
    const t = await tokens();
    const { status, json } = await apiRequest('/recruiters/dashboard-stats', { token: t.recruiter });
    expect(status).toBe(200);
    expect(json).toBeTruthy();
    await loginAsRecruiter(page);
    await expect(page).toHaveURL(/\/recruiter/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('REC-03 recruiter creates job', async () => {
    const t = await tokens();
    const created = await apiRequest('/jobs', {
      method: 'POST',
      token: t.recruiter,
      body: jobCreatePayload(`JOB-REC-${Date.now()}`),
    });
    expect([200, 201]).toContain(created.status);
    expect(created.json?.data?.id || created.json?.id || created.json?.job?.id).toBeTruthy();
  });

  test('INT-03 legacy interview API is gone', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/admin/interview/anything', { token: t.adminA });
    expect(status).toBe(410);
    expect(JSON.stringify(json)).toMatch(/legacy|removed|interview-scheduling/i);
  });
});
