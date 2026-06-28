/**
 * Joined placements registry — students with status JOINED.
 */

import prisma from '../config/database.js';
import { getAdminScopeFilter, mergeScopeIntoStudentWhere } from '../utils/adminScope.js';
import { patchApplication } from './applicationStateService.js';

const PLACEMENT_TYPES = ['FULL_TIME', 'INTERNSHIP'];

function normalizePlacementType(value) {
  if (value == null || value === '') return null;
  const v = String(value).trim().toUpperCase().replace(/\s+/g, '_');
  if (v === 'FT' || v === 'FULLTIME' || v === 'FULL-TIME') return 'FULL_TIME';
  if (v === 'INTERN' || v === 'INTERNSHIP') return 'INTERNSHIP';
  return PLACEMENT_TYPES.includes(v) ? v : null;
}

function formatPlacement(row) {
  const student = row.student || {};
  const job = row.job || {};
  const companyName =
    job.company?.name || job.companyName || job.recruiter?.company?.name || 'Unknown';

  return {
    applicationId: row.id,
    studentId: student.id,
    studentName: student.fullName || student.user?.displayName || student.email || 'Unknown',
    studentEmail: student.email || student.user?.email || '',
    school: student.school || '',
    center: student.center || '',
    batch: student.batch || '',
    jobId: job.id,
    jobTitle: job.jobTitle || 'Untitled',
    companyName,
    placementType: row.placementType || null,
    offerCtc: row.offerCtc || null,
    offerStipend: row.offerStipend || null,
    joinedAt: row.joinedAt || row.updatedAt,
    updatedAt: row.updatedAt,
  };
}

function buildStudentWhere(query = {}, adminScope = {}) {
  const where = mergeScopeIntoStudentWhere({}, adminScope);

  if (query.school) where.school = query.school;
  if (query.center) where.center = query.center;
  if (query.batch) where.batch = query.batch;

  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { fullName: { contains: q } },
      { email: { contains: q } },
      { enrollmentId: { contains: q } },
    ];
  }

  return where;
}

export async function listJoinedPlacements(query = {}, user = {}) {
  const adminScope = getAdminScopeFilter(user.admin, user.role);
  const studentWhere = buildStudentWhere(query, adminScope);

  const applicationWhere = {
    status: 'JOINED',
    student: studentWhere,
  };

  if (query.jobId) {
    applicationWhere.jobId = query.jobId;
  }

  if (query.studentId) {
    applicationWhere.studentId = query.studentId;
  }

  if (query.company?.trim()) {
    const companyQ = query.company.trim();
    applicationWhere.job = {
      OR: [
        { companyName: { contains: companyQ } },
        { company: { name: { contains: companyQ } } },
      ],
    };
  }

  const placementType = normalizePlacementType(query.placementType);
  if (placementType) {
    applicationWhere.placementType = placementType;
  }

  const [rows, total] = await Promise.all([
    prisma.application.findMany({
      where: applicationWhere,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            school: true,
            center: true,
            batch: true,
            user: { select: { email: true, displayName: true } },
          },
        },
        job: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            salary: true,
            ctc: true,
            jobType: true,
            company: { select: { name: true } },
            recruiter: { select: { company: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ joinedAt: 'desc' }, { updatedAt: 'desc' }],
      take: Math.min(parseInt(query.limit, 10) || 500, 500),
    }),
    prisma.application.count({ where: applicationWhere }),
  ]);

  const placements = rows.map(formatPlacement);

  const filterOptions = await prisma.student.findMany({
    where: mergeScopeIntoStudentWhere(
      { applications: { some: { status: 'JOINED' } } },
      adminScope,
    ),
    select: { school: true, center: true, batch: true },
    distinct: ['school', 'center', 'batch'],
  });

  const schools = [...new Set(filterOptions.map((s) => s.school).filter(Boolean))].sort();
  const centers = [...new Set(filterOptions.map((s) => s.center).filter(Boolean))].sort();
  const batches = [...new Set(filterOptions.map((s) => s.batch).filter(Boolean))].sort();

  return {
    placements,
    total,
    filters: { schools, centers, batches },
  };
}

export async function updateJoinedPlacementCompensation(applicationId, payload = {}, user = {}) {
  const adminScope = getAdminScopeFilter(user.admin, user.role);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      student: {
        select: {
          id: true,
          school: true,
          center: true,
          batch: true,
        },
      },
    },
  });

  if (!application) {
    const err = new Error('Application not found');
    err.status = 404;
    throw err;
  }

  if (String(application.status).toUpperCase() !== 'JOINED') {
    const err = new Error('Only JOINED placements can be edited here');
    err.status = 400;
    throw err;
  }

  if (adminScope?.id === 'BLOCK_ALL') {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }

  const scopedWhere = mergeScopeIntoStudentWhere({ id: application.studentId }, adminScope);
  const allowed = await prisma.student.findFirst({ where: scopedWhere, select: { id: true } });
  if (!allowed) {
    const err = new Error('Access denied for this student');
    err.status = 403;
    throw err;
  }

  const data = {};
  if (payload.offerCtc !== undefined) {
    data.offerCtc = payload.offerCtc == null || String(payload.offerCtc).trim() === ''
      ? null
      : String(payload.offerCtc).trim();
  }
  if (payload.offerStipend !== undefined) {
    data.offerStipend = payload.offerStipend == null || String(payload.offerStipend).trim() === ''
      ? null
      : String(payload.offerStipend).trim();
  }
  if (payload.placementType !== undefined) {
    const pt = normalizePlacementType(payload.placementType);
    data.placementType = pt;
  }

  if (Object.keys(data).length === 0) {
    const err = new Error('No fields to update');
    err.status = 400;
    throw err;
  }

  const updated = await patchApplication(applicationId, data, {
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
          school: true,
          center: true,
          batch: true,
          user: { select: { email: true, displayName: true } },
        },
      },
      job: {
        select: {
          id: true,
          jobTitle: true,
          companyName: true,
          company: { select: { name: true } },
          recruiter: { select: { company: { select: { name: true } } } },
        },
      },
    },
    notify: false,
  });

  return formatPlacement(updated);
}
