import { test, expect } from '@playwright/test';
import { apiForm, apiRequest, loadIds, startAssessment, tokens } from '../helpers/api.js';
import { loginAsStudentA } from '../helpers/auth.js';

test.describe('P1 applications assessments coding proctoring', () => {
  test('APP-07 student withdraws own application', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/applications/${ids.applications.withdraw}/withdraw`, {
      method: 'POST',
      token: t.studentA,
      body: {},
    });
    expect(status).toBe(200);
    expect(JSON.stringify(json)).toMatch(/WITHDRAWN/i);
  });

  test('APP-08 student declines offer', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/applications/${ids.applications.decline}/offer-response`, {
      method: 'POST',
      token: t.studentA,
      body: { action: 'decline' },
    });
    expect(status).toBe(200);
    expect(JSON.stringify(json)).toMatch(/DECLINED/i);
  });

  test('APP-09 illegal status transition', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/applications/${ids.applications.illegal}/status`, {
      method: 'PATCH',
      token: t.adminA,
      body: { status: 'JOINED' },
    });
    expect(status).toBe(400);
    expect(json.error || json.message).toBeTruthy();
  });

  test('ASM-07 descriptive submit pending review', async () => {
    const ids = loadIds();
    const t = await tokens();
    const details = await apiRequest(`/assessments/details/${ids.assessments.essay}`, { token: t.studentA });
    const essay = (details.json.questions || []).find((q) => q.type === 'DESCRIPTIVE');
    expect(essay).toBeTruthy();
    const started = await startAssessment(t.studentA, ids.assessments.essay);
    expect([200, 201]).toContain(started.status);
    const completed = await apiRequest(`/assessments/session/complete/${started.json.id}`, {
      method: 'POST',
      token: t.studentA,
      body: { answers: JSON.stringify({ [essay.id]: 'E2E essay answer about a project.' }) },
    });
    expect(completed.status).toBe(200);
    expect(String(completed.json.status || completed.json.session?.status)).toMatch(/PENDING_REVIEW/i);
  });

  test('ASM-08 join window closed', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.closed);
    expect(started.status).toBe(403);
    expect(JSON.stringify(started.json)).toMatch(/TOO_LATE|closed|entry window/i);
  });

  test('ASM-09 bulk import questions', async () => {
    const ids = loadIds();
    const t = await tokens();
    const csv = [
      'Type,Question,Points,Option A,Option B,Correct',
      'MCQ,E2E bulk imported question,5,yes,no,yes',
    ].join('\n');
    const form = new FormData();
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'e2e-import.csv');
    form.append('assessmentId', ids.assessments.import);
    const preview = await apiForm('/assessment-imports/preview', { token: t.superAdmin, form });
    expect([200, 201]).toContain(preview.status);
    const batchId = preview.json?.batch?.id || preview.json?.id;
    expect(batchId).toBeTruthy();
    const committed = await apiRequest(`/assessment-imports/${batchId}/commit`, {
      method: 'POST',
      token: t.superAdmin,
      body: { assessmentId: ids.assessments.import },
    });
    expect([200, 201]).toContain(committed.status);
    const details = await apiRequest(`/assessments/details/${ids.assessments.import}`, { token: t.superAdmin });
    const questions = details.json.questions || details.json.assessment?.questions || [];
    expect(questions.some((q) => /bulk imported/i.test(q.questionText || q.title || ''))).toBeTruthy();
  });

  test('COD-04 hidden cases not rendered in UI', async ({ page }) => {
    const ids = loadIds();
    await loginAsStudentA(page);
    await page.goto(`/assessment/${ids.assessments.mixed}`);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(ids.coding.hiddenExpected);
  });

  test('COD-05 run rate limit', async () => {
    const t = await tokens();
    let last;
    for (let i = 0; i < 9; i += 1) {
      last = await apiRequest('/code/run', {
        method: 'POST',
        token: t.studentA,
        body: { language: 'javascript', code: 'console.log(1)' },
      });
    }
    expect(last.status).toBe(429);
    expect(JSON.stringify(last.json)).toMatch(/too many run requests/i);
  });

  test('PRC-09 paste attempt logged', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.paste);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress proc session');
    const { status, json } = await apiRequest(`/assessments/session/violation/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { type: 'PASTE_ATTEMPT' },
    });
    expect(status).toBe(200);
    expect(json.violation?.type || json.violationType).toMatch(/PASTE_ATTEMPT/);
  });
});
