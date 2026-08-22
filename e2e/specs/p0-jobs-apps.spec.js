import { test, expect } from '@playwright/test';
import { apiRequest, loadIds, tokens } from '../helpers/api.js';
import { jobCreatePayload } from '../helpers/jobs.js';

test.describe('P0 jobs and applications', () => {
  test('JOB-01 posted targeted job visible to Student A only', async () => {
    const ids = loadIds();
    const t = await tokens();
    const a = await apiRequest('/jobs/targeted', { token: t.studentA });
    const b = await apiRequest('/jobs/targeted', { token: t.studentB });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const listA = Array.isArray(a.json) ? a.json : a.json.jobs || [];
    const listB = Array.isArray(b.json) ? b.json : b.json.jobs || [];
    const titlesA = listA.map((j) => j.jobTitle);
    const titlesB = listB.map((j) => j.jobTitle);
    expect(titlesA).toContain('JOB-POSTED-A');
    expect(titlesA).not.toContain('JOB-DRAFT');
    expect(titlesB).not.toContain('JOB-POSTED-A');
    expect(listA.some((j) => j.id === ids.jobs.draft)).toBeFalsy();
  });

  test('JOB-02 create job as scoped admin', async () => {
    const t = await tokens();
    const created = await apiRequest('/jobs', {
      method: 'POST',
      token: t.adminA,
      body: jobCreatePayload(`JOB-E2E-${Date.now()}`),
    });
    expect([200, 201]).toContain(created.status);
    const jobId = created.json?.data?.id || created.json?.id || created.json?.job?.id;
    expect(jobId).toBeTruthy();
    expect(created.json?.isPosted === true ? false : true).toBeTruthy();
  });

  test('APP-01 student apply happy path', async () => {
    const ids = loadIds();
    const t = await tokens();
    const apply = await apiRequest(`/applications/jobs/${ids.jobs.applyOpen}`, {
      method: 'POST',
      token: t.studentA,
      body: {},
    });
    if (apply.status === 400 && /already applied/i.test(JSON.stringify(apply.json))) {
      expect(apply.status).toBe(400);
    } else {
      expect([200, 201]).toContain(apply.status);
    }
  });

  test('APP-02 incomplete profile cannot apply', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/applications/jobs/${ids.jobs.applyOpen}`, {
      method: 'POST',
      token: t.incomplete,
      body: {},
    });
    expect(status).toBe(403);
    expect(JSON.stringify(json).toLowerCase()).toMatch(/profile incomplete|profile_incomplete/);
  });

  test('APP-03 admin shortlist', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/applications/${ids.applications.postedA}/status`, {
      method: 'PATCH',
      token: t.adminA,
      body: { status: 'SHORTLISTED' },
    });
    expect(status).toBe(200);
    expect(json.status || json.application?.status).toMatch(/SHORTLISTED/i);
  });

  test('APP-04 revoke blocks updates', async () => {
    const ids = loadIds();
    const t = await tokens();
    const revoke = await apiRequest(`/applications/${ids.applications.postedA}/revoke`, {
      method: 'POST',
      token: t.adminA,
      body: { reason: 'E2E revoke' },
    });
    expect(revoke.status).toBe(200);
    const patch = await apiRequest(`/applications/${ids.applications.postedA}/status`, {
      method: 'PATCH',
      token: t.adminA,
      body: { status: 'REJECTED' },
    });
    expect(patch.status).toBe(400);
  });

  test('APP-05 restore then update', async () => {
    const ids = loadIds();
    const t = await tokens();
    const restore = await apiRequest(`/applications/${ids.applications.postedA}/restore`, {
      method: 'POST',
      token: t.adminA,
      body: {},
    });
    expect(restore.status).toBe(200);
    const patch = await apiRequest(`/applications/${ids.applications.postedA}/status`, {
      method: 'PATCH',
      token: t.adminA,
      body: { status: 'SHORTLISTED' },
    });
    expect(patch.status).toBe(200);
  });

  test('APP-06 offer accept', async () => {
    const ids = loadIds();
    const t = await tokens();
    const { status, json } = await apiRequest(`/applications/${ids.applications.offer}/offer-response`, {
      method: 'POST',
      token: t.studentA,
      body: { action: 'accept' },
    });
    expect(status).toBe(200);
    expect(JSON.stringify(json)).toMatch(/ACCEPTED/i);
  });
});
