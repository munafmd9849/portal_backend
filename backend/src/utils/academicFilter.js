/**
 * Normalize school / center / batch filter values so UI labels, codes,
 * and legacy seed storage (e.g. BANGALORE vs Bangalore) all match.
 */

const SCHOOL_ALIASES = {
  sot: ['SOT', 'School of Technology'],
  'school of technology': ['SOT', 'School of Technology'],
  som: ['SOM', 'School of Management'],
  'school of management': ['SOM', 'School of Management'],
  soh: ['SOH', 'School of Healthcare'],
  'school of healthcare': ['SOH', 'School of Healthcare'],
};

const CENTER_ALIASES = {
  bangalore: ['Bangalore', 'BANGALORE'],
  noida: ['Noida', 'NOIDA'],
  lucknow: ['Lucknow', 'LUCKNOW'],
};

const BATCH_ALIASES = {
  '23-27': ['23-27', '2023-2027'],
  '2023-2027': ['23-27', '2023-2027'],
  '24-28': ['24-28', '2024-2028'],
  '2024-2028': ['24-28', '2024-2028'],
  '25-29': ['25-29', '2025-2029'],
  '2025-2029': ['25-29', '2025-2029'],
};

function toList(raw) {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
  return String(raw)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function expandValues(aliasMap, raw) {
  const expanded = new Set();
  for (const value of toList(raw)) {
    expanded.add(value);
    const key = value.toLowerCase();
    const aliases = aliasMap[key];
    if (aliases) {
      aliases.forEach((a) => expanded.add(a));
    }
    if (key !== value) expanded.add(key.toUpperCase());
  }
  return [...expanded];
}

export function expandSchoolFilterValues(raw) {
  return expandValues(SCHOOL_ALIASES, raw);
}

export function expandCenterFilterValues(raw) {
  return expandValues(CENTER_ALIASES, raw);
}

export function expandBatchFilterValues(raw) {
  return expandValues(BATCH_ALIASES, raw);
}

/** Apply school/center/batch `{ in: [...] }` filters with alias expansion. */
export function applyAcademicStudentFilters(where = {}, query = {}) {
  const next = { ...where };
  const { school, center, batch } = query;

  if (school) {
    const values = expandSchoolFilterValues(school);
    if (values.length) next.school = { in: values };
  }
  if (center) {
    const values = expandCenterFilterValues(center);
    if (values.length) next.center = { in: values };
  }
  if (batch) {
    const values = expandBatchFilterValues(batch);
    if (values.length) next.batch = { in: values };
  }

  return next;
}

/** Canonical storage values written to Student rows. */
export function canonicalSchoolStorage(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  const lower = v.toLowerCase();
  if (lower === 'sot' || lower === 'school of technology') return 'SOT';
  if (lower === 'som' || lower === 'school of management') return 'SOM';
  if (lower === 'soh' || lower === 'school of healthcare') return 'SOH';
  return v;
}

export function canonicalCenterStorage(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  const lower = v.toLowerCase();
  if (lower === 'bangalore') return 'Bangalore';
  if (lower === 'noida') return 'Noida';
  if (lower === 'lucknow') return 'Lucknow';
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

export function canonicalBatchStorage(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  const expanded = expandBatchFilterValues(v);
  return expanded.find((x) => x.includes('-') && x.length <= 5) || expanded[0] || v;
}
