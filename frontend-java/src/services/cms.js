/**
 * Landing CMS API helpers
 */

import api from './api.js';
import { API_BASE_URL } from '../config/api.js';

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') {
      q.append(key, value);
    }
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function getPublicLanding(page = 'landing') {
  const res = await api.get(`/cms/public/landing${buildQuery({ page })}`, { noCache: true });
  return res?.data ?? res;
}

export async function listSections(params = {}) {
  const res = await api.get(`/cms/sections${buildQuery(params)}`, { noCache: true });
  return res?.data ?? res;
}

export async function upsertSection(payload) {
  const res = await api.post('/cms/sections', payload);
  return res?.data ?? res;
}

export async function setSectionStatus(id, status) {
  const res = await api.put(`/cms/sections/${id}/status`, { status });
  return res?.data ?? res;
}

export async function deleteSection(id) {
  const res = await api.delete(`/cms/sections/${id}`);
  return res?.data ?? res;
}

export async function reorderSections(orderedIds) {
  const res = await api.post('/cms/sections/reorder', { orderedIds });
  return res?.data ?? res;
}

export async function publishPage(payload = {}) {
  const res = await api.post('/cms/publish', {
    pageSlug: payload.pageSlug || 'landing',
    label: payload.label,
  });
  return res?.data ?? res;
}

export async function listVersions(page = 'landing') {
  const res = await api.get(`/cms/versions${buildQuery({ page })}`, { noCache: true });
  return res?.data ?? res;
}

export async function restoreVersion(version, pageSlug = 'landing') {
  const res = await api.post(`/cms/versions/${version}/restore`, { pageSlug });
  return res?.data ?? res;
}

export async function uploadCmsMedia(file) {
  const token = api.getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/cms/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Upload failed');
  }
  return data;
}

export default {
  getPublicLanding,
  listSections,
  upsertSection,
  setSectionStatus,
  deleteSection,
  reorderSections,
  publishPage,
  listVersions,
  restoreVersion,
  uploadCmsMedia,
};
