/**
 * Success Stories API helpers
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

export async function listPublicStories(params = {}) {
  const res = await api.get(`/success-stories/public${buildQuery(params)}`, { noCache: true });
  return res?.data ?? res;
}

export async function getPublicStory(id) {
  const res = await api.get(`/success-stories/public/${id}`, { noCache: true });
  return res?.data ?? res;
}

export async function listStories(params = {}) {
  const res = await api.get(`/success-stories${buildQuery(params)}`, { noCache: true });
  return res?.data ?? res;
}

export async function getStory(id) {
  const res = await api.get(`/success-stories/${id}`, { noCache: true });
  return res?.data ?? res;
}

export async function createStory(payload) {
  const res = await api.post('/success-stories', payload);
  return res?.data ?? res;
}

export async function updateStory(id, payload) {
  const res = await api.put(`/success-stories/${id}`, payload);
  return res?.data ?? res;
}

export async function deleteStory(id, { hard = false } = {}) {
  const res = await api.delete(`/success-stories/${id}${buildQuery({ hard: hard ? 'true' : undefined })}`);
  return res?.data ?? res;
}

export async function uploadStoryMedia(file) {
  const token = api.getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/success-stories/media`, {
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
  listPublicStories,
  getPublicStory,
  listStories,
  getStory,
  createStory,
  updateStory,
  deleteStory,
  uploadStoryMedia,
};
