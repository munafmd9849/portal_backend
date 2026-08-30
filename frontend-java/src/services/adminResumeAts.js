import api from './api.js';

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') q.append(key, value);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchResumeAtsList(filters = {}) {
  const res = await api.get(`/admin/resume-ats${buildQuery(filters)}`);
  return res?.data ?? res;
}

export async function scoreStudentResumeAts(studentId) {
  const res = await api.post(`/admin/resume-ats/score/${studentId}`, {});
  return res?.data ?? res;
}

export async function batchScoreResumeAts(payload = {}) {
  const res = await api.post('/admin/resume-ats/score-batch', payload);
  return res?.data ?? res;
}
