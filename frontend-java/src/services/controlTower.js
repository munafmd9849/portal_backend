import api from './api.js';

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') q.append(key, value);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchControlTowerFilters() {
  const res = await api.get('/admin/control-tower/filters');
  return res?.data ?? res;
}

export async function fetchControlTowerAll(filters = {}) {
  const res = await api.get(`/admin/control-tower/all${buildQuery(filters)}`);
  return res?.data ?? res;
}

export async function fetchControlTowerJobOpportunities(filters = {}) {
  const res = await api.get(`/admin/control-tower/job-opportunities${buildQuery(filters)}`);
  return res?.data ?? res;
}

export async function fetchControlTowerStudents(filters = {}) {
  const res = await api.get(`/admin/control-tower/students${buildQuery(filters)}`);
  return res?.data ?? res;
}

export async function fetchControlTowerCareerServices(filters = {}) {
  const res = await api.get(`/admin/control-tower/career-services${buildQuery(filters)}`);
  return res?.data ?? res;
}
