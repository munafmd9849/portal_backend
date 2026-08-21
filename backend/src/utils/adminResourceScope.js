/**
 * Centralized admin resource scope — assessments, mocks, AI interviews, jobs, search.
 */

import prisma from '../config/database.js';
import {
  getAdminScopeFilter,
  isFullAccessScope,
  mergeScopeIntoStudentWhere,
  safeParseScope,
  SCOPE_WILDCARD,
} from './adminScope.js';

export function isAdminScopeBlocked(admin, userRole) {
  if (userRole === 'SUPER_ADMIN') return false;
  if (!admin) return true;
  const scope = getAdminScopeFilter(admin, userRole);
  return scope.id === 'BLOCK_ALL';
}

function parseJsonArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function scopedIdList(admin, field) {
  return safeParseScope(admin?.[field]).filter((v) => v && v !== SCOPE_WILDCARD);
}

function scopedNameList(admin, field) {
  return safeParseScope(admin?.[field]).filter((v) => v && v !== SCOPE_WILDCARD);
}

/** Prisma where for students visible to this admin. */
export function buildScopedStudentWhere(admin, userRole, baseWhere = {}) {
  if (userRole === 'SUPER_ADMIN') return baseWhere;
  const adminScope = getAdminScopeFilter(admin, userRole);
  return mergeScopeIntoStudentWhere(baseWhere, adminScope);
}

/**
 * Assessments visible when at least one assignment overlaps admin scope.
 */
export async function buildAssessmentListWhere(admin, userRole) {
  if (userRole === 'SUPER_ADMIN') return {};
  if (isAdminScopeBlocked(admin, userRole)) return { id: '__BLOCKED__' };
  if (isFullAccessScope(admin)) return {};

  const assignmentOr = [];
  const batchIds = scopedIdList(admin, 'allowedBatchIds');
  const schoolIds = scopedIdList(admin, 'allowedSchoolIds');
  if (batchIds.length) assignmentOr.push({ batchId: { in: batchIds } });
  if (schoolIds.length) assignmentOr.push({ schoolId: { in: schoolIds } });

  const studentWhere = buildScopedStudentWhere(admin, userRole);
  if (studentWhere.id !== '__BLOCKED__') {
    const scopedStudents = await prisma.student.findMany({
      where: studentWhere,
      select: { id: true },
      take: 5000,
    });
    const ids = scopedStudents.map((s) => s.id);
    if (ids.length) {
      assignmentOr.push({ studentId: { in: ids } });
    }
  }

  if (!assignmentOr.length) return { id: '__BLOCKED__' };
  return { assignments: { some: { OR: assignmentOr } } };
}

/**
 * Mock drives targeting scoped batches or students.
 */
export async function buildMockDriveListWhere(admin, userRole) {
  if (userRole === 'SUPER_ADMIN') return {};
  if (isAdminScopeBlocked(admin, userRole)) return { id: '__BLOCKED__' };
  if (isFullAccessScope(admin)) return {};

  const or = [];
  for (const batch of scopedNameList(admin, 'allowedBatches')) {
    or.push({ targetBatches: { contains: batch } });
  }

  const studentWhere = buildScopedStudentWhere(admin, userRole);
  const scopedStudents = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true },
    take: 5000,
  });
  for (const s of scopedStudents) {
    or.push({ targetStudentIds: { contains: s.id } });
  }

  if (!or.length) return { id: '__BLOCKED__' };
  return { OR: or };
}

/**
 * AI mock interviews targeting scoped schools/centers/batches/students.
 */
export async function buildAiMockInterviewListWhere(admin, userRole) {
  if (userRole === 'SUPER_ADMIN') return {};
  if (isAdminScopeBlocked(admin, userRole)) return { id: '__BLOCKED__' };
  if (isFullAccessScope(admin)) return {};

  const or = [];
  for (const schoolId of scopedIdList(admin, 'allowedSchoolIds')) {
    or.push({ targetSchoolIds: { contains: schoolId } });
  }
  for (const center of scopedNameList(admin, 'allowedCenters')) {
    or.push({ targetCenters: { contains: center } });
  }
  for (const batch of scopedNameList(admin, 'allowedBatches')) {
    or.push({ targetBatches: { contains: batch } });
  }

  const studentWhere = buildScopedStudentWhere(admin, userRole);
  const scopedStudents = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true },
    take: 5000,
  });
  for (const s of scopedStudents) {
    or.push({ targetStudentIds: { contains: s.id } });
  }

  if (!or.length) return { id: '__BLOCKED__' };
  return { OR: or };
}

function jobTargetValues(job, jsonField, idField) {
  const fromJson = parseJsonArray(job?.[jsonField]);
  const fromIds = parseJsonArray(job?.[idField]);
  return [...fromJson, ...fromIds];
}

function valuesOverlap(allowed, targets) {
  if (!allowed.length || !targets.length) return false;
  const norm = (v) => String(v).trim().toLowerCase();
  const targetSet = new Set(targets.map(norm));
  return allowed.some((a) => targetSet.has(norm(a)));
}

/**
 * Whether an admin may access a job (list, interview scheduling, etc.).
 */
export function adminCanAccessJob(job, admin, userRole, adminUserId) {
  if (userRole === 'SUPER_ADMIN') return true;
  if (!admin || !job) return false;
  if (isAdminScopeBlocked(admin, userRole)) return false;
  if (isFullAccessScope(admin)) return true;
  if (adminUserId && job.createdBy === adminUserId) return true;

  const schools = scopedNameList(admin, 'allowedSchools');
  const centers = scopedNameList(admin, 'allowedCenters');
  const batches = scopedNameList(admin, 'allowedBatches');
  const schoolIds = scopedIdList(admin, 'allowedSchoolIds');
  const centerIds = scopedIdList(admin, 'allowedCenterIds');
  const batchIds = scopedIdList(admin, 'allowedBatchIds');

  const jobSchools = jobTargetValues(job, 'targetSchools', 'targetSchoolIds');
  const jobCenters = jobTargetValues(job, 'targetCenters', 'targetCenterIds');
  const jobBatches = jobTargetValues(job, 'targetBatches', 'targetBatchIds');

  const schoolOk =
    !schools.length && !schoolIds.length
      ? true
      : valuesOverlap([...schools, ...schoolIds], jobSchools);
  const centerOk =
    !centers.length && !centerIds.length
      ? true
      : valuesOverlap([...centers, ...centerIds], jobCenters);
  const batchOk =
    !batches.length && !batchIds.length
      ? true
      : valuesOverlap([...batches, ...batchIds], jobBatches);

  return schoolOk && centerOk && batchOk;
}

/**
 * Prisma where clause for jobs visible to this admin (list/search/pipeline).
 */
export function buildJobListWhere(admin, userRole, adminUserId) {
  if (userRole === 'SUPER_ADMIN') return {};
  if (isAdminScopeBlocked(admin, userRole)) return { id: '__BLOCKED__' };
  if (isFullAccessScope(admin)) return {};

  const schools = scopedNameList(admin, 'allowedSchools');
  const centers = scopedNameList(admin, 'allowedCenters');
  const batches = scopedNameList(admin, 'allowedBatches');
  const schoolIds = scopedIdList(admin, 'allowedSchoolIds');
  const centerIds = scopedIdList(admin, 'allowedCenterIds');
  const batchIds = scopedIdList(admin, 'allowedBatchIds');

  const andParts = [];

  const schoolOr = [];
  for (const s of [...schools, ...schoolIds]) {
    schoolOr.push({ targetSchools: { contains: s } });
    schoolOr.push({ targetSchoolIds: { contains: s } });
  }
  if (schoolOr.length) andParts.push({ OR: schoolOr });

  const centerOr = [];
  for (const c of [...centers, ...centerIds]) {
    centerOr.push({ targetCenters: { contains: c } });
    centerOr.push({ targetCenterIds: { contains: c } });
  }
  if (centerOr.length) andParts.push({ OR: centerOr });

  const batchOr = [];
  for (const b of [...batches, ...batchIds]) {
    batchOr.push({ targetBatches: { contains: b } });
    batchOr.push({ targetBatchIds: { contains: b } });
  }
  if (batchOr.length) andParts.push({ OR: batchOr });

  const accessOr = [];
  if (andParts.length) accessOr.push({ AND: andParts });
  if (adminUserId) accessOr.push({ createdBy: adminUserId });

  if (!accessOr.length) return { id: '__BLOCKED__' };
  return { OR: accessOr };
}

/** HTTP error payload when admin cannot access a job, or null if allowed. */
export function assertAdminJobAccess(req, job) {
  const role = req.user?.role;
  if (role === 'SUPER_ADMIN' || role === 'RECRUITER') return null;
  if (role === 'ADMIN') {
    const allowed = adminCanAccessJob(
      job,
      req.user.admin,
      role,
      req.userId || req.user?.id,
    );
    if (!allowed) {
      return { status: 403, error: 'Job not in your admin scope' };
    }
    return null;
  }
  return null;
}

/** Recruiters with at least one job in admin scope (recruiters are global; scope via jobs). */
export function buildRecruiterListWhere(admin, userRole, adminUserId) {
  if (userRole === 'SUPER_ADMIN') return {};
  if (isAdminScopeBlocked(admin, userRole)) return { id: '__BLOCKED__' };
  if (isFullAccessScope(admin)) return {};
  const jobWhere = buildJobListWhere(admin, userRole, adminUserId);
  if (jobWhere.id === '__BLOCKED__') return { id: '__BLOCKED__' };
  return { jobs: { some: jobWhere } };
}

/**
 * Announcements visible to admin — broadcast only for full-access; scoped by target overlap.
 */
export function buildAnnouncementListWhere(admin, userRole, adminUserId) {
  if (userRole === 'SUPER_ADMIN') return {};
  if (isAdminScopeBlocked(admin, userRole)) return { id: '__BLOCKED__' };
  if (isFullAccessScope(admin)) return {};

  const or = [];
  if (adminUserId) or.push({ createdBy: adminUserId });

  for (const school of scopedNameList(admin, 'allowedSchools')) {
    or.push({ targetSchools: { contains: school } });
  }
  for (const center of scopedNameList(admin, 'allowedCenters')) {
    or.push({ targetCenters: { contains: center } });
  }
  for (const batch of scopedNameList(admin, 'allowedBatches')) {
    or.push({ targetBatches: { contains: batch } });
  }

  if (!or.length) return { id: '__BLOCKED__' };
  return { OR: or };
}

/** Reject announcement targeting outside admin scope. Returns error message or null. */
export function assertAnnouncementTargetingWithinScope(
  { targetSchools = [], targetBatches = [], targetCenters = [] },
  admin,
  userRole,
) {
  if (userRole === 'SUPER_ADMIN' || isFullAccessScope(admin)) return null;

  const isBroadcast =
    (!targetSchools.length && !targetBatches.length && !targetCenters.length)
    || targetSchools.includes('ALL')
    || targetBatches.includes('ALL')
    || targetCenters.includes('ALL');

  if (isBroadcast) {
    return 'Only full-access admins may send broadcast announcements';
  }

  const allowedSchools = scopedNameList(admin, 'allowedSchools');
  const allowedCenters = scopedNameList(admin, 'allowedCenters');
  const allowedBatches = scopedNameList(admin, 'allowedBatches');

  const norm = (v) => String(v).trim().toLowerCase();
  const inAllowed = (values, allowed) => {
    if (!values.length) return true;
    if (!allowed.length) return true;
    const set = new Set(allowed.map(norm));
    return values.every((v) => set.has(norm(v)));
  };

  if (!inAllowed(targetSchools, allowedSchools)) {
    return 'Target schools are outside your admin scope';
  }
  if (!inAllowed(targetCenters, allowedCenters)) {
    return 'Target centers are outside your admin scope';
  }
  if (!inAllowed(targetBatches, allowedBatches)) {
    return 'Target batches are outside your admin scope';
  }

  return null;
}

/** Entity types recruiters may not search. */
export const RECRUITER_FORBIDDEN_SEARCH_TYPES = new Set([
  'STUDENT',
  'RESUME',
  'APPLICATION',
  'ADMIN',
]);

/** Whether admin may access a student by primary key. */
export async function adminCanAccessStudentById(studentId, admin, userRole) {
  if (userRole === 'SUPER_ADMIN') return true;
  if (!studentId) return false;
  const adminScope = getAdminScopeFilter(admin, userRole);
  const scopedWhere = mergeScopeIntoStudentWhere({ id: studentId }, adminScope);
  if (scopedWhere.id === '__BLOCKED__') return false;
  const allowed = await prisma.student.findFirst({
    where: scopedWhere,
    select: { id: true },
  });
  return Boolean(allowed);
}

/** Whether admin may access an assessment by ID (list-scope rules). */
export async function adminCanAccessAssessmentById(assessmentId, admin, userRole) {
  if (userRole === 'SUPER_ADMIN') return true;
  if (!assessmentId) return false;
  const scopeWhere = await buildAssessmentListWhere(admin, userRole);
  if (scopeWhere.id === '__BLOCKED__') return false;
  const allowed = await prisma.assessment.findFirst({
    where: { id: assessmentId, ...scopeWhere },
    select: { id: true },
  });
  return Boolean(allowed);
}

/** Whether admin may access an assessment session (student + assessment scope). */
export async function adminCanAccessSessionById(sessionId, admin, userRole) {
  if (userRole === 'SUPER_ADMIN') return true;
  if (!sessionId) return false;
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    select: { studentId: true, assessmentId: true },
  });
  if (!session) return false;
  const studentOk = await adminCanAccessStudentById(session.studentId, admin, userRole);
  if (!studentOk) return false;
  return adminCanAccessAssessmentById(session.assessmentId, admin, userRole);
}

/**
 * Enforce admin/recruiter access before application mutations or sensitive lookups.
 * Returns an HTTP error payload or null when allowed.
 */
export async function assertApplicationMutationAccess(req, application) {
  const userRole = req.user?.role;
  const userId = req.userId || req.user?.id;

  if (userRole === 'SUPER_ADMIN') return null;

  if (userRole === 'RECRUITER') {
    const job = await prisma.job.findUnique({
      where: { id: application.jobId },
      include: { recruiter: { select: { userId: true } } },
    });
    if (!job?.recruiter || job.recruiter.userId !== userId) {
      return { status: 403, error: 'Not authorized to modify this application' };
    }
    return null;
  }

  if (userRole === 'ADMIN') {
    const allowed = await adminCanAccessStudentById(
      application.studentId,
      req.user.admin,
      userRole,
    );
    if (!allowed) {
      return { status: 403, error: 'Not authorized to modify this application (out of scope)' };
    }
    return null;
  }

  return { status: 403, error: 'Forbidden' };
}

/** Filter search types by role. Returns null if entire request forbidden. */
export function filterSearchTypesForRole(userRole, requestedTypes) {
  const types = (requestedTypes?.length ? requestedTypes : null);
  if (userRole === 'RECRUITER') {
    const selected = (types || []).map((t) => String(t).toUpperCase());
    if (selected.some((t) => RECRUITER_FORBIDDEN_SEARCH_TYPES.has(t))) {
      return null;
    }
    const allowed = selected.length
      ? selected.filter((t) => !RECRUITER_FORBIDDEN_SEARCH_TYPES.has(t))
      : ['JOB', 'COMPANY', 'RECRUITER', 'ASSESSMENT', 'INTERVIEW'];
    return allowed;
  }
  return types;
}
