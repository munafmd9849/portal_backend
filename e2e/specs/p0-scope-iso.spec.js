import { test, expect } from '@playwright/test';
import { apiRequest, emailsIn, loadIds, tokens, USERS } from '../helpers/api.js';

test.describe('P0 admin scoping and isolation', () => {
  test('SCOPE-01 Admin A directory excludes Student B', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/students?limit=100', { token: t.adminA });
    expect(status).toBe(200);
    const emails = emailsIn(json.students || []);
    expect(emails).toContain(USERS.studentA.email);
    expect(emails).not.toContain(USERS.studentB.email);
  });

  test('SCOPE-02 Admin A applications exclude Student B', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/applications?limit=100', { token: t.adminA });
    expect(status).toBe(200);
    const apps = json.applications || [];
    const emails = apps.map((a) => (a.student?.email || '').toLowerCase());
    expect(emails).not.toContain(USERS.studentB.email);
  });

  test('SCOPE-03 Super Admin sees both students', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/students?limit=100', { token: t.superAdmin });
    expect(status).toBe(200);
    const emails = emailsIn(json.students || []);
    expect(emails).toContain(USERS.studentA.email);
    expect(emails).toContain(USERS.studentB.email);
  });

  test('ISO-01 Student A cannot read Student B profile', async () => {
    const ids = loadIds();
    const t = await tokens();
    const listed = await apiRequest('/students', { token: t.studentA });
    expect([401, 403]).toContain(listed.status);
    const viaQuery = await apiRequest(`/students/profile?studentId=${ids.users.studentB.studentId}`, {
      token: t.studentA,
    });
    expect(viaQuery.status).toBe(200);
    expect((viaQuery.json.email || '').toLowerCase()).not.toBe(USERS.studentB.email);
    expect((viaQuery.json.email || '').toLowerCase()).toBe(USERS.studentA.email);
  });

  test('ISO-02 Student A cannot complete B assessment session', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(
      `/assessments/session/complete/${ids.sessions.studentBInProgress}`,
      {
        method: 'POST',
        token: t.studentA,
        body: { answers: JSON.stringify({}) },
      },
    );
    expect([403, 404]).toContain(status);
    expect(json.error).toBeTruthy();
  });

  test('ISO-03 Student B cannot join Student A mock slot', async () => {
    const ids = loadIds();
    const t = await tokens();
    const live = await apiRequest(`/mock-interviews/slot/${ids.mocks.slotA}/live-code`, {
      token: t.studentB,
    });
    const results = await apiRequest(`/mock-interviews/results/slot/${ids.mocks.slotA}`, {
      token: t.studentB,
    });
    expect([403, 404]).toContain(live.status);
    expect([403, 404]).toContain(results.status);
  });

  test('SCOPE-04 Admin A cannot patch Student B application', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/applications/${ids.applications.somB}/status`, {
      method: 'PATCH',
      token: t.adminA,
      body: { status: 'REJECTED' },
    });
    expect(status).toBe(403);
    expect(json.error).toBeTruthy();
  });

  test('SCOPE-05 Admin A cannot get Student B resume-view token', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/applications/${ids.applications.somB}/resume-view-url`, {
      token: t.adminA,
    });
    expect(status).toBe(403);
    expect(json.error).toBeTruthy();
  });

  test('SCOPE-06 Super Admin can patch Student B application', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status } = await apiRequest(`/applications/${ids.applications.somB}/status`, {
      method: 'PATCH',
      token: t.superAdmin,
      body: { status: 'SHORTLISTED' },
    });
    expect(status).toBe(200);
  });

  test('SCOPE-07 Admin A cannot read Student B readiness detail', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(
      `/admin/readiness/students/${ids.users.studentB.studentId}`,
      { token: t.adminA },
    );
    expect(status).toBe(403);
    expect(json.error).toBeTruthy();
  });

  test('SCOPE-08 Admin A cannot read Student B assessment session results', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(
      `/assessments/results/${ids.sessions.studentBInProgress}`,
      { token: t.adminA },
    );
    expect(status).toBe(403);
    expect(json.error).toBeTruthy();
  });

  test('SCOPE-JOB-01 Admin A cannot read out-of-scope job', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/jobs/${ids.jobs.som}`, { token: t.adminA });
    expect(status).toBe(403);
    expect(json.error).toBeTruthy();
  });

  test('SCOPE-JOB-02 Admin A cannot analyze out-of-scope job', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status } = await apiRequest(`/jobs/${ids.jobs.som}/analyze`, { token: t.adminA });
    expect(status).toBe(403);
  });

  test('SCOPE-JOP-01 job opportunities overview scoped for Admin A', async () => {
    const t = await tokens();
    const a = await apiRequest('/admin/job-opportunities/overview', { token: t.adminA });
    const s = await apiRequest('/admin/job-opportunities/overview', { token: t.superAdmin });
    expect(a.status).toBe(200);
    expect(s.status).toBe(200);
    expect(a.json.row1.jdsAnnounced).toBeLessThanOrEqual(s.json.row1.jdsAnnounced);
  });

  test('SCOPE-ANN-01 Admin A cannot create announcement outside scope', async () => {
    const t = await tokens();
    const { status, json } = await apiRequest('/announcements', {
      method: 'POST',
      token: t.adminA,
      body: {
        title: 'E2E scope test',
        description: 'Should be rejected',
        targetSchools: '["SOM"]',
      },
    });
    expect(status).toBe(403);
    expect(json.error).toBeTruthy();
  });
});
