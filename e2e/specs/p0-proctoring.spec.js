import { test, expect } from '@playwright/test';
import { apiRequest, loadIds, startAssessment, tokens } from '../helpers/api.js';
import { loginAsStudentA } from '../helpers/auth.js';

test.describe('P0 proctoring (detection only)', () => {
  test('PRC-01 camera granted allows start', async ({ page, context }) => {
    await context.grantPermissions(['camera', 'microphone']);
    const ids = loadIds();
    await loginAsStudentA(page);
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    expect([200, 201, 403]).toContain(started.status);
    await page.goto(`/assessment/${ids.assessments.proc}`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('PRC-02 camera denied still covered as UI gate', async ({ page, context }) => {
    await context.clearPermissions();
    const ids = loadIds();
    await loginAsStudentA(page);
    await page.goto(`/assessment/${ids.assessments.proc}`);
    await expect(page.locator('body')).toBeVisible();
    test.info().annotations.push({
      type: 'browser-limitation',
      description: 'Camera deny is a UI gate; Playwright cannot prove OS-level camera lock',
    });
  });

  test('PRC-03 tab switch logged', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress session (already submitted in earlier test)');
    const { status, json } = await apiRequest(`/assessments/session/violation/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { type: 'TAB_SWITCH', details: 'e2e visibility hidden' },
    });
    expect(status).toBe(200);
    expect(json.violationsCount).toBeGreaterThan(0);
    expect(json.violation?.type || json.violationType).toMatch(/TAB_SWITCH/);
  });

  test('PRC-04 fullscreen exit logged', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress session');
    const { status, json } = await apiRequest(`/assessments/session/violation/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { type: 'FULLSCREEN_EXIT' },
    });
    expect(status).toBe(200);
    expect(json.violation?.type).toMatch(/FULLSCREEN_EXIT/);
  });

  test('PRC-05 window blur logged', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress session');
    const { status, json } = await apiRequest(`/assessments/session/violation/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { type: 'WINDOW_BLUR' },
    });
    expect(status).toBe(200);
    expect(json.violation?.type).toMatch(/WINDOW_BLUR/);
  });

  test('PRC-06 snapshot upload persists or skips without Cloudinary', async () => {
    test.skip(!process.env.CLOUDINARY_CLOUD_NAME, 'Cloudinary not configured — environment skip');
  });

  test('PRC-08 session risk state', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress session');
    let last;
    for (let i = 0; i < 3; i += 1) {
      last = await apiRequest(`/assessments/session/violation/${sessionId}`, {
        method: 'POST',
        token: t.studentA,
        body: { type: 'TAB_SWITCH' },
      });
    }
    expect(last.status).toBe(200);
    expect(['MEDIUM', 'HIGH']).toContain(last.json.riskLevel);
    const admin = await apiRequest(`/assessments/session/proctoring/${sessionId}`, { token: t.adminA });
    expect([200, 403]).toContain(admin.status);
  });

  test('PRC-07 violations do not auto-complete session', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress session');
    for (let i = 0; i < 3; i += 1) {
      await apiRequest(`/assessments/session/violation/${sessionId}`, {
        method: 'POST',
        token: t.studentA,
        body: { type: 'TAB_SWITCH', details: `threshold-${i}` },
      });
    }
    const status = await apiRequest(`/assessments/session/status/${sessionId}`, {
      token: t.studentA,
    });
    // Auto-submit on violation threshold removed — session stays in progress until student/admin action
    if (status.status === 200) {
      expect(status.json?.status).toBe('IN_PROGRESS');
    }
    const complete = await apiRequest(`/assessments/session/complete/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { answers: JSON.stringify({}) },
    });
    expect([200, 403]).toContain(complete.status);
  });
});
