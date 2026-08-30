/**
 * Global search API helpers
 */

import api from './api.js';

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || String(value).trim() === '') return;
    if (Array.isArray(value)) {
      q.append(key, value.join(','));
    } else {
      q.append(key, value);
    }
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

/**
 * Debounce helper — returns a function that delays invoking `fn` until
 * `wait` ms have elapsed since the last call. Cancel via `.cancel()`.
 */
export function debounce(fn, wait = 300) {
  let timer = null;
  const debounced = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}

export async function search(params = {}) {
  const { q, types, page, limit, offset, sort } = params;
  const res = await api.get(
    `/search${buildQuery({
      q,
      types: Array.isArray(types) ? types.join(',') : types,
      page,
      limit,
      offset,
      sort,
    })}`,
    { noCache: true, silent: true },
  );
  return res?.data ?? res;
}

export async function suggest(q, { limit } = {}) {
  const res = await api.get(`/search/suggest${buildQuery({ q, limit })}`, {
    noCache: true,
    silent: true,
  });
  return res?.data ?? res;
}

export async function getSearchMeta() {
  const res = await api.get('/search/meta', { noCache: true, silent: true });
  return res?.data ?? res;
}

export default {
  search,
  suggest,
  getSearchMeta,
  debounce,
};
