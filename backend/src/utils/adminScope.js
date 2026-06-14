/**
 * Admin scope — full access vs restricted, ID resolution, and student filters.
 */

import prisma from '../config/database.js';

export const SCOPE_WILDCARD = '*';

function asIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => v && v !== SCOPE_WILDCARD);
  return [];
}

export function safeParseScope(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return val.trim() ? [val] : [];
  }
}

function dimensionIsWildcard(values) {
  const list = values.filter(Boolean);
  return list.length === 0 || list.includes(SCOPE_WILDCARD);
}

/** True when admin may see all students (no school/center/batch restriction). */
export function isFullAccessScope(admin) {
  if (!admin) return false;

  const schools = safeParseScope(admin.allowedSchools);
  const centers = safeParseScope(admin.allowedCenters);
  const batches = safeParseScope(admin.allowedBatches);
  const schoolIds = safeParseScope(admin.allowedSchoolIds);
  const centerIds = safeParseScope(admin.allowedCenterIds);
  const batchIds = safeParseScope(admin.allowedBatchIds);

  const legacyEmpty =
    schools.length === 0 &&
    centers.length === 0 &&
    batches.length === 0 &&
    schoolIds.length === 0 &&
    centerIds.length === 0 &&
    batchIds.length === 0;

  const explicitWildcard =
    schools.includes(SCOPE_WILDCARD) &&
    centers.includes(SCOPE_WILDCARD) &&
    batches.includes(SCOPE_WILDCARD);

  return legacyEmpty || explicitWildcard;
}

export function buildFullAccessPayload() {
  return {
    allowedSchoolIds: '[]',
    allowedCenterIds: '[]',
    allowedBatchIds: '[]',
    allowedSchools: JSON.stringify([SCOPE_WILDCARD]),
    allowedCenters: JSON.stringify([SCOPE_WILDCARD]),
    allowedBatches: JSON.stringify([SCOPE_WILDCARD]),
  };
}

/**
 * Resolve checkbox IDs from the UI into stored scope fields.
 */
export async function resolveAdminScopeFromIds({
  fullAccess = false,
  allowedSchoolIds = [],
  allowedCenterIds = [],
  allowedBatchIds = [],
}) {
  if (fullAccess) {
    return buildFullAccessPayload();
  }

  const schoolIds = asIdList(allowedSchoolIds);
  const centerIds = asIdList(allowedCenterIds);
  const batchIds = asIdList(allowedBatchIds);

  const [schools, centers, batches] = await Promise.all([
    schoolIds.length
      ? prisma.school.findMany({
          where: { id: { in: schoolIds } },
          select: { id: true, name: true, code: true },
        })
      : [],
    centerIds.length
      ? prisma.center.findMany({
          where: { id: { in: centerIds } },
          select: { id: true, name: true },
        })
      : [],
    batchIds.length
      ? prisma.batch.findMany({
          where: { id: { in: batchIds } },
          select: { id: true, year: true, label: true },
        })
      : [],
  ]);

  const schoolValues = [
    ...new Set(schools.flatMap((s) => [s.name, s.code].filter(Boolean))),
  ];
  const centerValues = centers.map((c) => c.name).filter(Boolean);
  const batchValues = [
    ...new Set(
      batches.flatMap((b) => [b.year?.trim(), b.label?.trim()].filter(Boolean))
    ),
  ];

  return {
    allowedSchoolIds: JSON.stringify(schoolIds),
    allowedCenterIds: JSON.stringify(centerIds),
    allowedBatchIds: JSON.stringify(batchIds),
    allowedSchools: JSON.stringify(schoolValues),
    allowedCenters: JSON.stringify(centerValues),
    allowedBatches: JSON.stringify(batchValues),
  };
}

/** Expand values so `{ in: [...] }` matches DB rows regardless of casing. */
function expandCaseVariants(values) {
  const set = new Set();
  for (const value of values) {
    if (!value || value === SCOPE_WILDCARD) continue;
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    set.add(trimmed);
    set.add(trimmed.toLowerCase());
    set.add(trimmed.toUpperCase());
    set.add(trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase());
  }
  return [...set];
}

/**
 * Build Prisma where fragment for student queries.
 * Returns `{ school?, center?, batch? }` with `{ in: string[] }` for compatibility
 * with existing controllers (students, jobs, applications, dashboard).
 */
export function getAdminScopeFilter(admin, userRole) {
  if (userRole === 'SUPER_ADMIN') {
    return {};
  }

  if (!admin) {
    return { id: 'BLOCK_ALL' };
  }

  if (isFullAccessScope(admin)) {
    return {};
  }

  const filter = {};
  const schools = safeParseScope(admin.allowedSchools).filter((v) => v !== SCOPE_WILDCARD);
  const centers = safeParseScope(admin.allowedCenters).filter((v) => v !== SCOPE_WILDCARD);
  const batches = safeParseScope(admin.allowedBatches).filter((v) => v !== SCOPE_WILDCARD);

  if (!dimensionIsWildcard(safeParseScope(admin.allowedSchools)) && schools.length) {
    filter.school = { in: expandCaseVariants(schools) };
  }

  if (!dimensionIsWildcard(safeParseScope(admin.allowedCenters)) && centers.length) {
    filter.center = { in: expandCaseVariants(centers) };
  }

  if (!dimensionIsWildcard(safeParseScope(admin.allowedBatches)) && batches.length) {
    filter.batch = { in: expandCaseVariants(batches) };
  }

  return filter;
}

/**
 * Merge scoped-admin constraints into an existing Prisma student where clause.
 */
export function mergeScopeIntoStudentWhere(where = {}, adminScope = {}) {
  if (adminScope?.id === 'BLOCK_ALL') {
    return { id: '__BLOCKED__' };
  }

  const next = { ...where };
  for (const dim of ['school', 'center', 'batch']) {
    if (!adminScope?.[dim]?.in?.length) continue;
    const allowed = adminScope[dim].in;
    if (next[dim]?.in) {
      next[dim] = {
        in: next[dim].in.filter((value) =>
          allowed.some((allowedValue) => String(allowedValue).toLowerCase() === String(value).toLowerCase()),
        ),
      };
    } else {
      next[dim] = { in: allowed };
    }
  }
  return next;
}

export function hasPermission(admin, userRole, permission) {
  if (userRole === 'SUPER_ADMIN') return true;
  if (!admin) return false;

  const permissions = safeParseScope(admin.permissions);
  if (permissions.includes(SCOPE_WILDCARD)) return true;
  return permissions.includes(permission);
}
