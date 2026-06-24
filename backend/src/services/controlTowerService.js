/**
 * Control Tower — aggregated analytics for Job Opportunities, Students, Career Services tabs.
 * Separate from legacy AdminHome dashboard; reuses jobOpportunitiesPipeline + placement data.
 */

import prisma from '../config/database.js';
import { getAdminScopeFilter } from '../utils/adminScope.js';
import {
  buildFilters,
  getJobOpportunitiesOverview,
  getCrManagerOverview,
  getMomTable,
  getFilterOptions,
} from './jobOpportunitiesPipeline.js';
import { computeProfileCompletionScore } from './placementReadinessService.js';

const PLACED = ['SELECTED', 'OFFERED', 'ACCEPTED', 'JOINED'];
const DECLINED = ['DECLINED', 'REJECTED', 'WITHDRAWN'];
const ET_PASSED_SCREENING = ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'];
const ASSESSMENT_PASS_SCORE = 60;

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function parseStipendNumber(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (s.includes('lpa') || s.includes('lac')) n *= 100000;
  return Number.isFinite(n) ? n : null;
}

export function buildControlTowerContext(query = {}, user = null) {
  const pipelineQuery = {
    school: query.school || query.program,
    center: query.center,
    batch: query.batch || query.cohort,
    segment: query.segment,
    quarter: query.quarter,
    month: query.month,
    year: query.year,
    crManager: query.crManager,
    search: query.search,
  };

  const { studentWhere, jobWhere, appWhere } = buildFilters(pipelineQuery);
  let scopedStudentWhere = { ...studentWhere };

  if (user?.admin || user?.role) {
    const scope = getAdminScopeFilter(user.admin, user.role);
    if (scope.id === 'BLOCK_ALL') {
      return { blocked: true, studentWhere: {}, jobWhere, appWhere, pipelineQuery };
    }
    scopedStudentWhere = { ...scopedStudentWhere, ...scope };
  }

  if (query.from || query.to) {
    const created = {};
    if (query.from) created.gte = new Date(query.from);
    if (query.to) created.lte = new Date(query.to);
    scopedStudentWhere = { ...scopedStudentWhere, createdAt: created };
  }

  return {
    blocked: false,
    studentWhere: scopedStudentWhere,
    jobWhere,
    appWhere,
    pipelineQuery,
  };
}

export async function getControlTowerFilters() {
  const [base, schools, centers, batches] = await Promise.all([
    getFilterOptions(),
    prisma.school.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 100 }).catch(() => []),
    prisma.center.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 100 }).catch(() => []),
    prisma.batch.findMany({
      select: { id: true, year: true, label: true },
      orderBy: { year: 'asc' },
      take: 100,
    }).catch(() => []),
  ]);

  return {
    programs: schools.length
      ? schools.map((s) => ({ id: s.name, name: s.name }))
      : [{ id: 'SOT', name: 'School of Technology' }, { id: 'SOM', name: 'School of Management' }],
    cohorts: batches.length
      ? batches.map((b) => {
          const name = b.label || b.year;
          return { id: name, name };
        })
      : [],
    centers: centers.map((c) => ({ id: c.name, name: c.name })),
    quarters: base.quarters,
    months: base.months,
    crManagers: base.crManagers,
    segments: base.segments,
  };
}

export async function getControlTowerJobOpportunities(query = {}, user = null) {
  const ctx = buildControlTowerContext(query, user);
  if (ctx.blocked) return { blocked: true };

  const [overview, crManagers, momTable] = await Promise.all([
    getJobOpportunitiesOverview(ctx.pipelineQuery),
    getCrManagerOverview(ctx.pipelineQuery),
    getMomTable({ ...ctx.pipelineQuery, search: query.search }),
  ]);

  return {
    overview: {
      row1: overview.row1,
      row2: overview.row2,
    },
    crManagers,
    momTable,
  };
}

async function loadStudentsForMetrics(studentWhere) {
  return prisma.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      gender: true,
      profileCompleted: true,
      profileImageUrl: true,
      resumeUrl: true,
      cgpa: true,
      createdAt: true,
      invitedAt: true,
      resumeVerifiedAt: true,
      fullName: true,
      email: true,
      phone: true,
      bio: true,
      headline: true,
      summary: true,
      linkedin: true,
      githubUrl: true,
      user: { select: { status: true, emailVerified: true, createdAt: true } },
      skills: { select: { id: true } },
      projects: { select: { id: true }, take: 1 },
      education: { select: { id: true }, take: 1 },
      resumeFiles: { select: { id: true }, take: 1 },
    },
    take: 5000,
  });
}

export async function getControlTowerStudents(query = {}, user = null) {
  const ctx = buildControlTowerContext(query, user);
  if (ctx.blocked) return { blocked: true };

  const sw = ctx.studentWhere;
  const [
    totalStudents,
    activeStudents,
    inactiveStudents,
    maleCount,
    femaleCount,
    students,
    placedApps,
    allPlacedApps,
  ] = await Promise.all([
    prisma.student.count({ where: sw }),
    prisma.student.count({ where: { ...sw, user: { status: 'ACTIVE' } } }),
    prisma.student.count({ where: { ...sw, user: { status: { not: 'ACTIVE' } } } }),
    prisma.student.count({ where: { ...sw, gender: { in: ['MALE', 'Male', 'male', 'M'] } } }),
    prisma.student.count({ where: { ...sw, gender: { in: ['FEMALE', 'Female', 'female', 'F'] } } }),
    loadStudentsForMetrics(sw),
    prisma.application.findMany({
      where: {
        student: sw,
        status: { in: PLACED },
      },
      select: {
        id: true,
        studentId: true,
        status: true,
        placementType: true,
        internshipStatus: true,
        applicationSource: true,
        offerCtc: true,
        job: { select: { jobType: true, salary: true, ctc: true, salaryRange: true } },
      },
    }),
    prisma.application.findMany({
      where: { student: sw, status: { in: [...PLACED, ...DECLINED] } },
      select: {
        studentId: true,
        status: true,
        placementType: true,
        internshipStatus: true,
        applicationSource: true,
        offerCtc: true,
        job: { select: { jobType: true, salary: true } },
      },
    }),
  ]);

  const invitationsSent = totalStudents;
  const invitationsAccepted = students.filter(
    (s) => s.user?.status === 'ACTIVE' && s.user?.emailVerified,
  ).length;
  const invitationsNotAccepted = Math.max(0, invitationsSent - invitationsAccepted);

  const brackets = { b0_25: 0, b25_50: 0, b50_75: 0, b75_100: 0 };
  let completionSum = 0;
  let withResume = 0;
  let withProfilePic = 0;
  let withSkills = 0;
  const cgpaBands = { below6: 0, b6_7: 0, b7_8: 0, b8_9: 0, above9: 0 };

  students.forEach((s) => {
    const score = computeProfileCompletionScore(s);
    completionSum += score;
    if (score < 25) brackets.b0_25 += 1;
    else if (score < 50) brackets.b25_50 += 1;
    else if (score < 75) brackets.b50_75 += 1;
    else brackets.b75_100 += 1;
    if (s.resumeUrl || s.resumeFiles?.length) withResume += 1;
    if (s.profileImageUrl) withProfilePic += 1;
    if ((s.skills?.length || 0) > 0) withSkills += 1;
    const cg = s.cgpa != null ? parseFloat(s.cgpa) : null;
    if (cg == null || Number.isNaN(cg)) return;
    if (cg < 6) cgpaBands.below6 += 1;
    else if (cg < 7) cgpaBands.b6_7 += 1;
    else if (cg < 8) cgpaBands.b7_8 += 1;
    else if (cg < 9) cgpaBands.b8_9 += 1;
    else cgpaBands.above9 += 1;
  });

  const isInternship = (app) => {
    const pt = (app.placementType || '').toUpperCase();
    if (pt === 'INTERNSHIP') return true;
    if (pt === 'FULL_TIME') return false;
    return (app.job?.jobType || '').toLowerCase().includes('intern');
  };

  const placed = allPlacedApps.filter((a) => PLACED.includes((a.status || '').toUpperCase()));
  const internshipPlaced = placed.filter(isInternship);
  const fullTimePlaced = placed.filter((a) => !isInternship(a));

  const placedByStudent = new Map();
  internshipPlaced.forEach((a) => {
    placedByStudent.set(a.studentId, (placedByStudent.get(a.studentId) || 0) + 1);
  });
  const multipleInternships = [...placedByStudent.values()].filter((c) => c > 1).length;
  const uniqueInternshipPlaced = placedByStudent.size;
  const uniqueFulltimePlaced = new Set(fullTimePlaced.map((a) => a.studentId)).size;

  const activeInternships = placed.filter(
    (a) => isInternship(a) && (a.internshipStatus || '').toUpperCase() === 'ACTIVE',
  ).length;
  const completedInternships = placed.filter(
    (a) => isInternship(a) && (a.internshipStatus || '').toUpperCase() === 'COMPLETED',
  ).length;
  const leftMidway = placed.filter(
    (a) => isInternship(a) && (a.internshipStatus || '').toUpperCase() === 'LEFT_MIDWAY',
  ).length;

  const internshipRejected = allPlacedApps.filter(
    (a) => isInternship(a) && DECLINED.includes((a.status || '').toUpperCase()),
  ).length;
  const fullTimeRejected = allPlacedApps.filter(
    (a) => !isInternship(a) && DECLINED.includes((a.status || '').toUpperCase()),
  ).length;

  const stipends = internshipPlaced
    .map((a) => parseStipendNumber(
      a.offerCtc || a.job?.salary || a.job?.ctc || a.job?.salaryRange,
    ))
    .filter((n) => n != null && n > 0);
  const avgStipend = stipends.length
    ? Math.round((stipends.reduce((s, n) => s + n, 0) / stipends.length) * 100) / 100
    : 0;
  const maxStipend = stipends.length ? Math.max(...stipends) : 0;

  const selfSourced = placed.filter(
    (a) => (a.applicationSource || '').toUpperCase() === 'SELF',
  ).length;

  return {
    keyMetrics: {
      totalStudents,
      activeStudents,
      inactiveStudents,
      invitationsSent,
      invitationsAccepted,
      invitationAcceptanceRate: pct(invitationsAccepted, invitationsSent),
      invitationsNotAccepted,
      maleStudents: maleCount,
      femaleStudents: femaleCount,
      activeRate: pct(activeStudents, totalStudents),
    },
    profileReadiness: {
      avgProfileCompletion: students.length ? Math.round(completionSum / students.length) : 0,
      brackets: [
        { label: '0–25%', count: brackets.b0_25 },
        { label: '25–50%', count: brackets.b25_50 },
        { label: '50–75%', count: brackets.b50_75 },
        { label: '75–100%', count: brackets.b75_100 },
      ],
      resumeUploaded: withResume,
      profilePicture: withProfilePic,
      skillsSection: withSkills,
      profilePictureMetric: withProfilePic,
    },
    careerOutcomes: {
      totalPlacement: placed.length,
      internshipPlaced: internshipPlaced.length,
      studentsWithMultipleInternships: multipleInternships,
      totalFullTimePlaced: fullTimePlaced.length,
      uniqueInternshipPlaced,
      uniqueFulltimePlaced,
      currentlyActiveInternships: activeInternships,
      completedInternships,
      studentsLeftMidway: leftMidway,
      internshipOffersRejected: internshipRejected,
      fullTimeOffersRejected: fullTimeRejected,
      avgStipendTpm: avgStipend,
      highestStipendTpm: maxStipend,
      totalSelfSourced: selfSourced,
    },
    academicOverview: [
      { label: '< 6.0', count: cgpaBands.below6 },
      { label: '6.0 – 7.0', count: cgpaBands.b6_7 },
      { label: '7.0 – 8.0', count: cgpaBands.b7_8 },
      { label: '8.0 – 9.0', count: cgpaBands.b8_9 },
      { label: '9.0+', count: cgpaBands.above9 },
    ],
  };
}

export async function getControlTowerCareerServices(query = {}, user = null) {
  const ctx = buildControlTowerContext(query, user);
  if (ctx.blocked) return { blocked: true };

  const sw = ctx.studentWhere;
  const studentIdRows = await prisma.student.findMany({
    where: sw,
    select: { id: true },
  });
  const studentIds = studentIdRows.map((r) => r.id);
  const inStudents = studentIds.length ? { in: studentIds } : { in: ['__none__'] };

  const [
    programPool,
    profileCompleted,
    withResume,
    resumeVerified,
    placedStudents,
    etAssignments,
    etSessions,
    mockSlots,
    mockFeedback,
    aiEnrollments,
    students,
    neverOnboarded,
    jobReady,
  ] = await Promise.all([
    prisma.student.count({ where: sw }),
    prisma.student.count({ where: { ...sw, profileCompleted: true } }),
    prisma.student.count({
      where: { ...sw, OR: [{ resumeUrl: { not: null } }, { resumeFiles: { some: {} } }] },
    }),
    prisma.student.count({ where: { ...sw, resumeVerifiedAt: { not: null } } }),
    prisma.student.count({
      where: {
        ...sw,
        applications: { some: { status: { in: PLACED } } },
      },
    }),
    prisma.assessmentAssignment.count({
      where: { studentId: inStudents },
    }),
    prisma.assessmentSession.findMany({
      where: { studentId: inStudents },
      select: { studentId: true, status: true, score: true },
    }),
    prisma.mockInterviewSlot.count({
      where: {
        studentId: inStudents,
        status: { in: ['COMPLETED', 'LIVE', 'SCHEDULED'] },
      },
    }),
    prisma.mockInterviewFeedback.findMany({
      where: { slot: { studentId: inStudents } },
      select: { overallPerformance: true, communication: true, technicalSkills: true },
    }),
    prisma.aiMockInterviewEnrollment.findMany({
      where: { studentId: inStudents },
      select: { status: true, progressPercent: true },
    }),
    prisma.student.findMany({
      where: sw,
      select: {
        id: true,
        createdAt: true,
        user: { select: { status: true, createdAt: true } },
      },
      take: 5000,
    }),
    prisma.student.count({ where: { ...sw, user: { status: 'PENDING' } } }),
    prisma.student.count({
      where: {
        ...sw,
        OR: [
          { statsShortlisted: { gt: 0 } },
          { applications: { some: { screeningStatus: { in: ET_PASSED_SCREENING } } } },
        ],
      },
    }),
  ]);

  const etAttempted = etSessions.length;
  const etCleared = etSessions.filter(
    (s) => (s.score != null && s.score >= ASSESSMENT_PASS_SCORE)
      || ['SUBMITTED', 'AUTO_SUBMITTED'].includes((s.status || '').toUpperCase()),
  ).length;
  const etFailed = Math.max(0, etAttempted - etCleared);
  const etEligible = etAssignments || programPool;

  const mockCompleted = mockSlots + aiEnrollments.filter((e) => e.status === 'COMPLETED').length;
  const mockScores = mockFeedback.map(
    (f) => ((f.overallPerformance || 0) + (f.communication || 0) + (f.technicalSkills || 0)) / 3 * 20,
  );
  const aiScores = aiEnrollments.filter((e) => e.status === 'COMPLETED').map((e) => e.progressPercent || 0);
  const allMockScores = [...mockScores, ...aiScores];
  const mockAvgScore = allMockScores.length
    ? Math.round(allMockScores.reduce((a, b) => a + b, 0) / allMockScores.length)
    : 0;
  const mockEligible = studentIds.length;

  const now = Date.now();
  const tenure = { m0_3: 0, m3_6: 0, m6plus: 0 };
  students.forEach((s) => {
    const start = new Date(s.user?.createdAt || s.createdAt).getTime();
    const months = (now - start) / (1000 * 60 * 60 * 24 * 30);
    if (months < 3) tenure.m0_3 += 1;
    else if (months < 6) tenure.m3_6 += 1;
    else tenure.m6plus += 1;
  });

  const onboarded = students.filter((s) => s.user?.status === 'ACTIVE').length;
  const profileDone = profileCompleted;
  const resumeOk = withResume;
  const etPassed = etCleared;

  const funnel = [
    { id: 'invited', label: 'Invited', count: programPool },
    { id: 'never_onboarded', label: 'Never Onboarded', count: neverOnboarded },
    { id: 'onboarded', label: 'Onboarded', count: onboarded },
    { id: 'profile_completed', label: 'Profile Completed', count: profileDone },
    { id: 'resume_verified', label: 'Resume Verified', count: resumeVerified || resumeOk },
    { id: 'et_passed', label: 'ET Passed', count: etPassed },
    { id: 'job_ready', label: 'Active (Job-Ready)', count: jobReady },
  ];

  return {
    keyMetrics: {
      programPool,
      etEligible,
      etAttempted,
      etCleared,
      etFailed,
      etPassRate: pct(etCleared, etAttempted),
      placementRate: pct(placedStudents, programPool),
      profileCompletionRate: pct(profileCompleted, programPool),
      resumeVerificationRate: pct(resumeVerified || withResume, programPool),
      mockCompletion: mockCompleted,
      mockAvgScore,
      mockEligible,
      tenure0to3: tenure.m0_3,
      tenure3to6: tenure.m3_6,
      tenure6plus: tenure.m6plus,
    },
    funnel,
  };
}

export async function getControlTowerAll(query = {}, user = null) {
  const [filters, jobOpportunities, students, careerServices] = await Promise.all([
    getControlTowerFilters(),
    getControlTowerJobOpportunities(query, user),
    getControlTowerStudents(query, user),
    getControlTowerCareerServices(query, user),
  ]);
  return { filters, jobOpportunities, students, careerServices };
}
