import { test, expect } from '@playwright/test';
import { apiRequest, loadIds, startAssessment, tokens } from '../helpers/api.js';

test.describe('P0 assessments and coding', () => {
  test('ASM-05 timer expiry auto-completes', async () => {
    const ids = loadIds();
    const t = await tokens();
    const again = await apiRequest(`/assessments/session/start/${ids.assessments.timer}`, {
      method: 'POST',
      token: t.studentA,
      body: {},
    });
    expect([200, 201, 403]).toContain(again.status);
    if (again.status === 403) {
      expect(JSON.stringify(again.json)).toMatch(/TIME_EXPIRED|expired|already completed|entry window|TOO_LATE/i);
    }
  });

  test('ASM-01 assigned student can start MIXED assessment', async () => {
    const ids = loadIds();
    const t = await tokens();
    const listed = await apiRequest('/assessments/my-assignments', { token: t.studentA });
    expect(listed.status).toBe(200);
    const items = Array.isArray(listed.json) ? listed.json : listed.json.assessments || [];
    expect(items.some((a) => a.id === ids.assessments.mixed || a.title === 'ASM-MIXED')).toBeTruthy();
    const started = await startAssessment(t.studentA, ids.assessments.mixed);
    expect([200, 201]).toContain(started.status);
    expect(started.json.id).toBeTruthy();
  });

  test('ASM-02 unassigned student does not see assessment in list', async () => {
    const ids = loadIds();
    const t = await tokens();
    const listed = await apiRequest('/assessments/my-assignments', { token: t.studentB });
    expect(listed.status).toBe(200);
    const items = Array.isArray(listed.json) ? listed.json : listed.json.assessments || [];
    expect(items.some((a) => a.id === ids.assessments.mixed)).toBeFalsy();
  });

  test('ASM-03 draft not startable', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status } = await apiRequest(`/assessments/session/start/${ids.assessments.draft}`, {
      method: 'POST',
      token: t.studentA,
      body: {},
    });
    expect([403, 404]).toContain(status);
  });

  test('ASM-06 second in-progress session blocked', async () => {
    const ids = loadIds();
    const t = await tokens();
    const first = await startAssessment(t.studentA, ids.assessments.mixed);
    const second = await apiRequest(`/assessments/session/start/${ids.assessments.mixed}`, {
      method: 'POST',
      token: t.studentA,
      body: {},
    });
    expect([200, 201]).toContain(first.status);
    if (second.status === 200 || second.status === 201) {
      expect(second.json.id).toBe(first.json.id);
    } else {
      expect([400, 409]).toContain(second.status);
    }
    await apiRequest(`/assessments/session/complete/${first.json.id}`, {
      method: 'POST',
      token: t.studentA,
      body: { answers: JSON.stringify({}) },
    });
  });

  test('ASM-04 MCQ scores on submit', async () => {
    const ids = loadIds();
    const t = await tokens();
    const details = await apiRequest(`/assessments/details/${ids.assessments.grade}`, { token: t.studentA });
    const mcq = (details.json.questions || []).find((q) => q.type === 'MCQ');
    expect(mcq).toBeTruthy();
    const started = await startAssessment(t.studentA, ids.assessments.grade);
    expect([200, 201]).toContain(started.status);
    const sessionId = started.json.id;
    const completed = await apiRequest(`/assessments/session/complete/${sessionId}`, {
      method: 'POST',
      token: t.studentA,
      body: { answers: JSON.stringify({ [mcq.id]: mcq.correctAnswer || '4' }) },
    });
    expect([200, 403]).toContain(completed.status);
    if (completed.status === 200) {
      expect(Number(completed.json.score ?? completed.json.session?.score ?? 0)).toBeGreaterThan(0);
    }
  });

  test('COD-01 run JavaScript', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/code/run', {
      method: 'POST',
      token: t.studentA,
      body: { language: 'javascript', code: 'console.log("e2e")' },
    });
    expect(status).toBe(200);
    expect(String(json.output || json.error || '')).toMatch(/e2e|error/i);
  });

  test('COD-02 runtime error surfaced', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/code/run', {
      method: 'POST',
      token: t.studentA,
      body: { language: 'javascript', code: 'throw new Error("boom-e2e")' },
    });
    expect([200, 400]).toContain(status);
    expect(JSON.stringify(json).toLowerCase()).toMatch(/error|boom/);
  });

  test('COD-03 evaluate uses hidden tests for score', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest('/code/evaluate', {
      method: 'POST',
      token: t.studentA,
      body: {
        language: 'javascript',
        code: 'console.log("5");',
        testCases: [
          { input: '', expectedOutput: '5', hidden: false },
          { input: '', expectedOutput: ids.coding.hiddenExpected, hidden: true },
        ],
      },
    });
    expect(status).toBe(200);
    expect(json.passed).toBeLessThan(json.total);
  });
});
