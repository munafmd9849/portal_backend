import { test, expect } from '@playwright/test';
import {
  apiRequest,
  emailsIn,
  hasCorrectAnswer,
  hasHiddenExpected,
  loadIds,
  startAssessment,
  tokens,
} from '../helpers/api.js';

test.describe('P0 defect regressions', () => {
  test('REG-SEC-01 unassigned student cannot read assessment answers', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/assessments/details/${ids.assessments.mixed}`, {
      token: t.studentB,
    });
    expect([403, 404]).toContain(status);
    if (status === 200) {
      expect(hasCorrectAnswer(json)).toBeFalsy();
    }
  });

  test('REG-SEC-01b assigned student receives sanitized assessment', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/assessments/details/${ids.assessments.mixed}`, {
      token: t.studentA,
    });
    expect(status).toBe(200);
    expect(hasCorrectAnswer(json)).toBeFalsy();
  });

  test('REG-SEC-02 hidden test expected output redacted on evaluate', async () => {
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
    expect(hasHiddenExpected(json)).toBeFalsy();
    expect(json.hiddenTestsTotal).toBeGreaterThanOrEqual(1);
  });

  test('REG-SEC-03a restricted admin cannot list another campus assessments', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest('/assessments/all', { token: t.adminA });
    expect(status).toBe(200);
    const list = Array.isArray(json) ? json : json.assessments || [];
    const seesB = list.some((a) => a.id === ids.assessments.b || a.title === 'ASM-B');
    expect(seesB).toBeFalsy();
  });

  test('REG-SEC-03b restricted admin cannot list another campus mock drives', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest('/mock-interviews/all', { token: t.adminA });
    expect(status).toBe(200);
    const list = Array.isArray(json) ? json : [];
    const seesB = list.some((d) => d.id === ids.mocks.driveB || d.title?.includes('Mock Drive B'));
    expect(seesB).toBeFalsy();
  });

  test('REG-SEC-03c restricted admin cannot list another campus AI interviews', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest('/ai-mock-interviews', { token: t.adminA });
    expect(status).toBe(200);
    const list = Array.isArray(json) ? json : json.interviews || json.data || [];
    const seesB = list.some((d) => d.id === ids.ai.interviewB || d.title?.includes('AI B'));
    expect(seesB).toBeFalsy();
  });

  test('REG-SEC-03d restricted admin interview-scheduling scoped', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status } = await apiRequest(`/admin/interview-scheduling/session/${ids.jobs.som}`, {
      token: t.adminA,
    });
    expect([403, 404]).toContain(status);
  });

  test('REG-SEC-04 recruiter cannot search students/resumes', async () => {
    const t = await tokens();
    const { status } = await apiRequest(
      '/search?q=e2e.student.a&types=STUDENT,RESUME',
      { token: t.recruiter },
    );
    expect(status).toBe(403);
  });

  test('REG-SEC-05 placement AI requires authentication', async () => {
    const { status } = await apiRequest('/placement/ai', {
      method: 'POST',
      body: { topic: 'resume tips' },
    });
    expect(status).toBe(401);
  });

  test('REG-SEC-07 empty allowed lists block all access', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/students?limit=100', { token: t.adminEmpty });
    expect(status).toBe(200);
    const emails = emailsIn(json.students || []);
    expect(emails).not.toContain('e2e.student.a@pwioi.test');
    expect(emails).not.toContain('e2e.student.b@pwioi.test');
  });

  test('REG-DATA-05a duplicate job application', async () => {
    const ids = loadIds();
    const t = await tokens();
    const first = await apiRequest(`/applications/jobs/${ids.jobs.dup}`, {
      method: 'POST',
      token: t.studentA,
      body: {},
    });
    expect([200, 201]).toContain(first.status);
    const second = await apiRequest(`/applications/jobs/${ids.jobs.dup}`, {
      method: 'POST',
      token: t.studentA,
      body: {},
    });
    expect([400, 409]).toContain(second.status);
  });

  test('REG-DATA-05b double assessment complete', async () => {
    const ids = loadIds();
    const t = await tokens();
    const started = await startAssessment(t.studentA, ids.assessments.race);
    expect([200, 201]).toContain(started.status);
    const sessionId = started.json.id;
    expect(sessionId).toBeTruthy();
    const payload = { answers: JSON.stringify({}) };
    const [a, b] = await Promise.all([
      apiRequest(`/assessments/session/complete/${sessionId}`, { method: 'POST', token: t.studentA, body: payload }),
      apiRequest(`/assessments/session/complete/${sessionId}`, { method: 'POST', token: t.studentA, body: payload }),
    ]);
    const statuses = [a.status, b.status].sort();
    const oneSuccess = statuses.some((s) => s === 200);
    expect(oneSuccess).toBeTruthy();
    expect(statuses.filter((s) => s === 200).length).toBe(1);
    expect(statuses.some((s) => s === 409)).toBeTruthy();
  });
});
