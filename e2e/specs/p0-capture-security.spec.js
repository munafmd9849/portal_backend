import { test, expect } from '@playwright/test';
import { apiRequest, loadIds, startAssessment, tokens } from '../helpers/api.js';

test.describe('P0 capture security (server-authoritative)', () => {
  test('CAP-01 capture violation pauses session server-side', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress session');

    const { status, json } = await apiRequest(`/assessments/session/violation/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { type: 'SCREEN_CAPTURE_DETECTED', details: 'e2e simulated capture' },
    });
    expect(status).toBe(200);
    expect(json.paused).toBe(true);
    expect(json.pauseReason).toBe('SCREEN_CAPTURE');
  });

  test('CAP-02 duplicate capture events are deduplicated', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress session');

    const first = await apiRequest(`/assessments/session/violation/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { type: 'SCREEN_CAPTURE_DETECTED' },
    });
    expect(first.status).toBe(200);
    const countAfterFirst = first.json?.violationsCount;

    const second = await apiRequest(`/assessments/session/violation/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { type: 'SCREEN_CAPTURE_DETECTED' },
    });
    expect(second.status).toBe(200);
    expect(second.json?.deduped === true || second.json?.violationsCount === countAfterFirst).toBeTruthy();
  });

  test('CAP-03 save rejected while security paused', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress session');

    await apiRequest(`/assessments/session/violation/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { type: 'SCREEN_CAPTURE_DETECTED' },
    });

    const { status } = await apiRequest(`/assessments/session/progress/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { answers: { e2e: 'blocked' } },
    });
    expect(status).toBe(423);
  });

  test('CAP-04 security recovery after re-check', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress session');

    await apiRequest(`/assessments/session/violation/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { type: 'SCREEN_CAPTURE_DETECTED' },
    });

    const recovery = await apiRequest(`/assessments/session/security-recovery/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { checksPassed: true },
    });
    expect(recovery.status).toBe(200);
    expect(recovery.json?.paused).toBe(false);
  });

  test('CAP-05 security-ready starts authoritative timer', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.proc);
    const sessionId = started.json?.id;
    test.skip(!sessionId, 'No in-progress session');

    const { status, json } = await apiRequest(`/assessments/session/security-ready/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
    });
    expect(status).toBe(200);
    expect(json.timerStarted).toBe(true);
    expect(Number.isFinite(json.remainingSeconds)).toBe(true);
  });
});
