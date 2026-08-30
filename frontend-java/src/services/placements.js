import api from './api.js';

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') q.append(key, value);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchPlacements(filters = {}) {
  const res = await api.get(`/admin/placements${buildQuery(filters)}`, { noCache: true });
  return res?.data ?? res;
}

export async function updatePlacementCompensation(applicationId, payload) {
  const res = await api.patch(`/admin/placements/${applicationId}`, payload);
  return res?.data ?? res;
}
