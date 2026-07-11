/**
 * Enterprise global search service — federated queries across core entities.
 * Uses SQLite-safe contains filters + lightweight ranking / fuzzy scoring.
 */

import prisma from '../config/database.js';

const ENTITY_TYPES = [
  'STUDENT',
  'JOB',
  'RECRUITER',
  'COMPANY',
  'APPLICATION',
  'ASSESSMENT',
  'INTERVIEW',
  'RESUME',
  'ADMIN',
  'CAMPUS',
  'BRANCH',
  'BATCH',
];

function normalizeQuery(q) {
  return String(q || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

function tokens(q) {
  return normalizeQuery(q)
    .toLowerCase()
    .split(/[\s,._-]+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
}

/** Simple fuzzy score: exact > prefix > contains > token overlap */
export function scoreMatch(haystack, query) {
  const h = String(haystack || '').toLowerCase();
  const q = String(query || '').toLowerCase();
  if (!h || !q) return 0;
  if (h === q) return 100;
  if (h.startsWith(q)) return 85;
  if (h.includes(q)) return 70;
  const toks = tokens(q);
  if (!toks.length) return 0;
  let hits = 0;
  for (const t of toks) {
    if (h.includes(t)) hits += 1;
  }
  return Math.round((hits / toks.length) * 55);
}

function highlight(text, query) {
  const raw = String(text || '');
  const q = normalizeQuery(query);
  if (!raw || !q) return raw;
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return raw.replace(new RegExp(`(${escaped})`, 'ig'), '<mark>$1</mark>');
  } catch {
    return raw;
  }
}

function containsFilter(fields, q) {
  return fields.map((field) => ({ [field]: { contains: q } }));
}

async function searchStudents(q, take) {
  const rows = await prisma.student.findMany({
    where: {
      OR: containsFilter(['fullName', 'enrollmentId', 'email', 'branch', 'center', 'school', 'batch'], q),
    },
    take,
    select: {
      id: true,
      fullName: true,
      enrollmentId: true,
      email: true,
      branch: true,
      center: true,
      school: true,
      batch: true,
      userId: true,
    },
  });
  return rows.map((r) => ({
    entityType: 'STUDENT',
    entityId: r.id,
    title: r.fullName || r.email || 'Student',
    subtitle: [r.enrollmentId, r.branch, r.center, r.school, r.batch].filter(Boolean).join(' · '),
    href: `/admin?tab=studentDirectory&studentId=${r.id}`,
    score: Math.max(
      scoreMatch(r.fullName, q),
      scoreMatch(r.enrollmentId, q),
      scoreMatch(r.email, q)
    ),
    meta: r,
  }));
}

async function searchJobs(q, take) {
  const rows = await prisma.job.findMany({
    where: {
      OR: [
        ...containsFilter(['jobTitle', 'companyName', 'location', 'jobDescription'], q),
      ],
    },
    take,
    select: {
      id: true,
      jobTitle: true,
      companyName: true,
      location: true,
      status: true,
    },
  });
  return rows.map((r) => ({
    entityType: 'JOB',
    entityId: r.id,
    title: r.jobTitle || 'Job',
    subtitle: [r.companyName, r.location, r.status].filter(Boolean).join(' · '),
    href: `/admin?tab=manageJobs&jobId=${r.id}`,
    score: Math.max(scoreMatch(r.jobTitle, q), scoreMatch(r.companyName, q)),
    meta: r,
  }));
}

async function searchRecruiters(q, take) {
  const rows = await prisma.recruiter.findMany({
    where: {
      OR: [
        { companyName: { contains: q } },
        { user: { is: { email: { contains: q } } } },
        { user: { is: { displayName: { contains: q } } } },
      ],
    },
    take,
    include: { user: { select: { email: true, displayName: true } } },
  });
  return rows.map((r) => ({
    entityType: 'RECRUITER',
    entityId: r.id,
    title: r.user?.displayName || r.companyName || 'Recruiter',
    subtitle: [r.companyName, r.user?.email].filter(Boolean).join(' · '),
    href: `/admin?tab=recruiterDirectory`,
    score: Math.max(scoreMatch(r.companyName, q), scoreMatch(r.user?.email, q)),
    meta: { id: r.id, companyName: r.companyName },
  }));
}

async function searchCompanies(q, take) {
  const rows = await prisma.company.findMany({
    where: { OR: containsFilter(['name', 'website', 'location', 'description'], q) },
    take,
    select: { id: true, name: true, website: true, location: true },
  });
  return rows.map((r) => ({
    entityType: 'COMPANY',
    entityId: r.id,
    title: r.name,
    subtitle: [r.location, r.website].filter(Boolean).join(' · '),
    href: `/admin?tab=manageJobs`,
    score: scoreMatch(r.name, q),
    meta: r,
  }));
}

async function searchApplications(q, take) {
  const rows = await prisma.application.findMany({
    where: {
      OR: [
        { status: { contains: q } },
        { student: { is: { fullName: { contains: q } } } },
        { job: { is: { jobTitle: { contains: q } } } },
        { job: { is: { companyName: { contains: q } } } },
      ],
    },
    take,
    include: {
      student: { select: { fullName: true, enrollmentNumber: true } },
      job: { select: { jobTitle: true, companyName: true } },
    },
  });
  return rows.map((r) => ({
    entityType: 'APPLICATION',
    entityId: r.id,
    title: `${r.student?.fullName || 'Student'} → ${r.job?.jobTitle || 'Job'}`,
    subtitle: [r.job?.companyName, r.status].filter(Boolean).join(' · '),
    href: `/admin?tab=jobApplications`,
    score: Math.max(
      scoreMatch(r.student?.fullName, q),
      scoreMatch(r.job?.jobTitle, q),
      scoreMatch(r.job?.companyName, q)
    ),
    meta: { id: r.id, status: r.status },
  }));
}

async function searchAssessments(q, take) {
  const rows = await prisma.assessment.findMany({
    where: { OR: containsFilter(['title', 'description', 'type', 'status'], q) },
    take,
    select: { id: true, title: true, type: true, status: true, difficulty: true },
  });
  return rows.map((r) => ({
    entityType: 'ASSESSMENT',
    entityId: r.id,
    title: r.title,
    subtitle: [r.type, r.status, r.difficulty].filter(Boolean).join(' · '),
    href: `/admin?tab=assessments`,
    score: scoreMatch(r.title, q),
    meta: r,
  }));
}

async function searchInterviews(q, take) {
  try {
    const mocks = await prisma.mockInterviewDrive.findMany({
      where: { OR: containsFilter(['title', 'description', 'status', 'category'], q) },
      take,
      select: { id: true, title: true, status: true, category: true },
    });
    return mocks.map((r) => ({
      entityType: 'INTERVIEW',
      entityId: r.id,
      title: r.title || 'Mock Interview',
      subtitle: [r.category, r.status].filter(Boolean).join(' · '),
      href: `/admin?tab=mockInterviews`,
      score: scoreMatch(r.title, q),
      meta: r,
    }));
  } catch {
    return [];
  }
}

async function searchResumes(q, take) {
  try {
    const rows = await prisma.studentResumeFile.findMany({
      where: {
        OR: [
          { fileName: { contains: q } },
          { title: { contains: q } },
          { student: { is: { fullName: { contains: q } } } },
        ],
      },
      take,
      include: { student: { select: { fullName: true, id: true } } },
    });
    return rows.map((r) => ({
      entityType: 'RESUME',
      entityId: r.id,
      title: r.title || r.fileName || 'Resume',
      subtitle: r.student?.fullName || '',
      href: `/admin?tab=studentDirectory&studentId=${r.student?.id || ''}`,
      score: Math.max(scoreMatch(r.fileName, q), scoreMatch(r.student?.fullName, q)),
      meta: { id: r.id },
    }));
  } catch {
    return [];
  }
}

async function searchAdmins(q, take) {
  const rows = await prisma.admin.findMany({
    where: {
      OR: [
        { user: { is: { email: { contains: q } } } },
        { user: { is: { displayName: { contains: q } } } },
      ],
    },
    take,
    include: { user: { select: { email: true, displayName: true, role: true } } },
  });
  return rows.map((r) => ({
    entityType: 'ADMIN',
    entityId: r.id,
    title: r.user?.displayName || r.user?.email || 'Admin',
    subtitle: [r.user?.role, r.user?.email].filter(Boolean).join(' · '),
    href: `/admin?tab=createDisableAdmins`,
    score: Math.max(scoreMatch(r.user?.displayName, q), scoreMatch(r.user?.email, q)),
    meta: { id: r.id },
  }));
}

async function searchAcademic(q, take) {
  const [schools, centers, batches] = await Promise.all([
    prisma.school.findMany({
      where: { OR: containsFilter(['name', 'code'], q) },
      take,
      select: { id: true, name: true, code: true },
    }),
    prisma.center.findMany({
      where: { OR: containsFilter(['name', 'location'], q) },
      take,
      select: { id: true, name: true, location: true },
    }),
    prisma.batch.findMany({
      where: {
        OR: [
          { year: { contains: q } },
          { label: { contains: q } },
        ],
      },
      take,
      select: { id: true, year: true, label: true },
    }),
  ]);

  return [
    ...schools.map((r) => ({
      entityType: 'CAMPUS',
      entityId: r.id,
      title: r.name,
      subtitle: r.code || 'School / Campus',
      href: `/admin?tab=academicStructure`,
      score: scoreMatch(r.name, q),
      meta: r,
    })),
    ...centers.map((r) => ({
      entityType: 'BRANCH',
      entityId: r.id,
      title: r.name,
      subtitle: r.location || 'Center',
      href: `/admin?tab=academicStructure`,
      score: scoreMatch(r.name, q),
      meta: r,
    })),
    ...batches.map((r) => ({
      entityType: 'BATCH',
      entityId: r.id,
      title: r.label || r.year,
      subtitle: r.year || 'Batch',
      href: `/admin?tab=academicStructure`,
      score: Math.max(scoreMatch(r.label, q), scoreMatch(r.year, q)),
      meta: r,
    })),
  ];
}

const SEARCHERS = {
  STUDENT: searchStudents,
  JOB: searchJobs,
  RECRUITER: searchRecruiters,
  COMPANY: searchCompanies,
  APPLICATION: searchApplications,
  ASSESSMENT: searchAssessments,
  INTERVIEW: searchInterviews,
  RESUME: searchResumes,
  ADMIN: searchAdmins,
  CAMPUS: (q, take) => searchAcademic(q, take).then((r) => r.filter((x) => x.entityType === 'CAMPUS')),
  BRANCH: (q, take) => searchAcademic(q, take).then((r) => r.filter((x) => x.entityType === 'BRANCH')),
  BATCH: (q, take) => searchAcademic(q, take).then((r) => r.filter((x) => x.entityType === 'BATCH')),
};

/**
 * @param {{ q: string, types?: string[], limit?: number, offset?: number, sort?: 'relevance'|'title' }} opts
 */
export async function globalSearch({
  q,
  types,
  limit = 20,
  offset = 0,
  sort = 'relevance',
} = {}) {
  const query = normalizeQuery(q);
  if (query.length < 2) {
    return { q: query, total: 0, items: [], tookMs: 0, types: ENTITY_TYPES };
  }

  const started = Date.now();
  const selected = (types?.length ? types : ENTITY_TYPES)
    .map((t) => String(t).toUpperCase())
    .filter((t) => ENTITY_TYPES.includes(t));

  const perType = Math.min(Math.max(Number(limit) || 20, 5), 50);
  const settled = await Promise.all(
    selected.map(async (type) => {
      try {
        const fn = SEARCHERS[type];
        if (!fn) return [];
        return await fn(query, perType);
      } catch (err) {
        console.warn(`[globalSearch] ${type} failed:`, err.message);
        return [];
      }
    })
  );

  let items = settled.flat().map((item) => ({
    ...item,
    titleHighlighted: highlight(item.title, query),
    subtitleHighlighted: highlight(item.subtitle, query),
  }));

  if (sort === 'title') {
    items.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  } else {
    items.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  const total = items.length;
  const start = Math.max(Number(offset) || 0, 0);
  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  items = items.slice(start, start + take);

  return {
    q: query,
    total,
    limit: take,
    offset: start,
    items,
    tookMs: Date.now() - started,
    types: ENTITY_TYPES,
  };
}

export async function autocomplete(q, { limit = 8 } = {}) {
  const result = await globalSearch({ q, limit: Math.min(Number(limit) || 8, 12) });
  return {
    q: result.q,
    suggestions: result.items.map((i) => ({
      label: i.title,
      description: i.subtitle,
      entityType: i.entityType,
      entityId: i.entityId,
      href: i.href,
      highlight: i.titleHighlighted,
    })),
    tookMs: result.tookMs,
  };
}

export { ENTITY_TYPES };
