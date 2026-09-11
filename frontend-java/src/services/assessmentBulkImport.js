/**
 * Assessment bulk import API helpers
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

export async function downloadTemplate() {
  const token = api.getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${API_BASE_URL}/assessment-imports/template`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Failed to download template');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'assessment_questions_template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

export async function previewImport(file, { assessmentId } = {}) {
  const token = api.getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const formData = new FormData();
  formData.append('file', file);
  if (assessmentId) formData.append('assessmentId', assessmentId);
  const response = await fetch(`${API_BASE_URL}/assessment-imports/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Preview failed');
  }
  return data;
}

export async function commitImport(batchId, { assessmentId, partial = true } = {}) {
  const res = await api.post(`/assessment-imports/${batchId}/commit`, {
    assessmentId,
    partial,
  });
  return res?.data ?? res;
}

export async function rollbackImport(batchId) {
  const res = await api.post(`/assessment-imports/${batchId}/rollback`, {});
  return res?.data ?? res;
}

export async function getImportBatch(batchId) {
  const res = await api.get(`/assessment-imports/${batchId}`, { noCache: true });
  return res?.data ?? res;
}

export async function listImportHistory(params = {}) {
  const res = await api.get(`/assessment-imports/history${buildQuery(params)}`, {
    noCache: true,
  });
  return res?.data ?? res;
}

export default {
  downloadTemplate,
  previewImport,
  commitImport,
  rollbackImport,
  getImportBatch,
  listImportHistory,
};
