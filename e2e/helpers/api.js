import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { USERS, E2E_PASSWORD } from '../fixtures/users.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const API_URL = process.env.E2E_API_URL || 'http://localhost:3100/api';
export const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://localhost:5174';

export function loadIds() {
  const path = join(__dirname, '../fixtures/ids.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

export { USERS, E2E_PASSWORD };

export async function apiRequest(path, { method = 'GET', token, body, headers } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text };
}

export async function loginApi(email, password, role) {
  let last = { status: 0, json: null };
  for (let attempt = 0; attempt < 4; attempt += 1) {
    last = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
        selectedRole: role,
      },
    });
    if (last.status === 200 && last.json?.accessToken) return last;
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return last;
}

export async function tokenFor(email, role) {
  const ids = loadIds();
  const { status, json } = await loginApi(email, ids.password || E2E_PASSWORD, role);
  if (status !== 200 || !json?.accessToken) {
    throw new Error(`Login failed for ${email} (${role}): ${status} ${JSON.stringify(json)}`);
  }
  return json.accessToken;
}

export async function tokens() {
  const ids = loadIds();
  const pwd = ids.password || E2E_PASSWORD;
  const specs = [
    ['studentA', USERS.studentA.email, 'STUDENT'],
    ['studentB', USERS.studentB.email, 'STUDENT'],
    ['adminA', USERS.adminA.email, 'ADMIN'],
    ['adminB', USERS.adminB.email, 'ADMIN'],
    ['adminEmpty', USERS.adminEmpty.email, 'ADMIN'],
    ['recruiterPending', USERS.recruiterPending.email, 'RECRUITER'],
    ['recruiter', USERS.recruiter.email, 'RECRUITER'],
    ['superAdmin', USERS.superAdmin.email, 'SUPER_ADMIN'],
    ['incomplete', USERS.studentIncomplete.email, 'STUDENT'],
  ];
  const out = {};
  for (const [key, email, role] of specs) {
    const result = await loginApi(email, pwd, role);
    out[key] = result.json?.accessToken;
    await new Promise((r) => setTimeout(r, 150));
  }
  return out;
}

export async function startAssessment(token, assessmentId) {
  let res = await apiRequest(`/assessments/session/start/${assessmentId}`, {
    method: 'POST',
    token,
    body: {},
  });
  if (res.status === 409 && res.json?.activeSessionId) {
    await apiRequest(`/assessments/session/complete/${res.json.activeSessionId}`, {
      method: 'POST',
      token,
      body: { answers: JSON.stringify({}) },
    });
    res = await apiRequest(`/assessments/session/start/${assessmentId}`, {
      method: 'POST',
      token,
      body: {},
    });
  }
  return res;
}

export async function apiForm(path, { token, form }) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text };
}

export function emailsIn(list = []) {
  return list.map((row) => (row.email || row.user?.email || '').toLowerCase());
}

export function hasCorrectAnswer(assessment) {
  const questions = assessment?.questions || [];
  return questions.some((q) => q.correctAnswer != null && String(q.correctAnswer).length > 0);
}

export function hasHiddenExpected(evaluateBody) {
  const results = evaluateBody?.results || [];
  return results.some((r) => r.hidden === true && r.expectedOutput);
}
