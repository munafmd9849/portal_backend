/**
 * Seed a deterministic dataset to verify placement-pipeline changes end-to-end.
 * Targets local SQLite (DATABASE_URL=file:./dev.db).
 *
 * Run:
 *   cd backend
 *   node scripts/seedPlacementPipelineVerificationData.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env'), override: true });

const PREFIX = 'VERIFY';
const DEFAULT_PASSWORD = 'Password@123';

function json(v) {
  return JSON.stringify(v);
}

function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function ensureUser({
  id,
  email,
  password = DEFAULT_PASSWORD,
  role,
  status = 'ACTIVE',
  displayName,
}) {
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role,
        status,
        emailVerified: true,
        displayName: displayName ?? existing.displayName,
      },
    });
  }
  return prisma.user.create({
    data: {
      id,
      email,
      passwordHash,
      role,
      status,
      emailVerified: true,
      displayName: displayName ?? null,
    },
  });
}

async function ensureAdmin({ userId, name, role = 'ADMIN', allowedSchools, allowedCenters, allowedBatches }) {
  const existing = await prisma.admin.findUnique({ where: { userId } });
  const data = {
    name,
    role,
    allowedSchools: json(allowedSchools || []),
    allowedCenters: json(allowedCenters || []),
    allowedBatches: json(allowedBatches || []),
  };
  if (existing) return prisma.admin.update({ where: { userId }, data });
  return prisma.admin.create({ data: { userId, ...data } });
}

async function ensureStudent({
  userId,
  fullName,
  email,
  phone,
  school,
  center,
  batch,
  cgpa,
  profileCompleted,
  resumeUrl,
}) {
  const existing = await prisma.student.findUnique({ where: { userId } });
  const data = {
    fullName,
    email,
    phone,
    school,
    center,
    batch,
    cgpa,
    profileCompleted: Boolean(profileCompleted),
    resumeUrl: resumeUrl ?? null,
    resumeFileName: resumeUrl ? `${PREFIX}_Resume.pdf` : null,
    resumeUploadedAt: resumeUrl ? new Date() : null,
  };
  if (existing) return prisma.student.update({ where: { userId }, data });
  return prisma.student.create({ data: { userId, ...data } });
}

async function ensureAssessment({ id, title }) {
  const existing = await prisma.assessment.findUnique({ where: { id } });
  const data = {
    title,
    description: `${PREFIX}: Linked test for job apply CTA verification.`,
    type: 'MOCK_TEST',
    duration: 20,
    status: 'PUBLISHED',
    instructions: 'Attempt this short assessment. This is seeded mock data.',
  };
  if (existing) return prisma.assessment.update({ where: { id }, data });
  return prisma.assessment.create({ data: { id, ...data } });
}

async function ensureAssessmentQuestion({ id, assessmentId, order }) {
  const existing = await prisma.assessmentQuestion.findUnique({ where: { id } });
  const data = {
    assessmentId,
    order,
    type: 'MCQ',
    questionText: `${PREFIX}: Sample MCQ #${order + 1}`,
    options: json(['Option A', 'Option B', 'Option C', 'Option D']),
    correctAnswer: 'Option A',
    points: 1,
    difficulty: 'EASY',
  };
  if (existing) return prisma.assessmentQuestion.update({ where: { id }, data });
  return prisma.assessmentQuestion.create({ data: { id, ...data } });
}

async function ensureAssessmentAssignment({ id, assessmentId, studentId }) {
  const existing = await prisma.assessmentAssignment.findUnique({ where: { id } });
  const data = {
    assessmentId,
    studentId,
    scheduledAt: new Date(),
  };
  if (existing) return prisma.assessmentAssignment.update({ where: { id }, data });
  return prisma.assessmentAssignment.create({ data: { id, ...data } });
}

async function ensureJob(job) {
  const existing = await prisma.job.findUnique({ where: { id: job.id } });
  if (existing) return prisma.job.update({ where: { id: job.id }, data: job });
  return prisma.job.create({ data: job });
}

async function ensureApplication(app) {
  const existing = await prisma.application.findUnique({
    where: { studentId_jobId: { studentId: app.studentId, jobId: app.jobId } },
  });
  if (existing) {
    return prisma.application.update({ where: { id: existing.id }, data: app });
  }
  return prisma.application.create({ data: app });
}

async function ensureInterviewSession(session) {
  const existing = await prisma.interviewSession.findUnique({ where: { jobId: session.jobId } });
  if (existing) return prisma.interviewSession.update({ where: { id: existing.id }, data: session });
  return prisma.interviewSession.create({ data: session });
}

async function ensureInterviewRound(round) {
  const existing = await prisma.interviewRound.findFirst({
    where: { sessionId: round.sessionId, roundNumber: round.roundNumber },
  });
  if (existing) return prisma.interviewRound.update({ where: { id: existing.id }, data: round });
  return prisma.interviewRound.create({ data: round });
}

async function ensureInterviewSlot(slot) {
  const existing = await prisma.interviewSlot.findUnique({ where: { id: slot.id } }).catch(() => null);
  if (existing) return prisma.interviewSlot.update({ where: { id: slot.id }, data: slot });
  return prisma.interviewSlot.create({ data: slot });
}

async function ensureRecruiterScreeningSession({ jobId, token }) {
  const existing = await prisma.recruiterScreeningSession.findUnique({ where: { jobId } }).catch(() => null);
  const data = {
    jobId,
    token,
    expiresAt: daysFromNow(30),
  };
  if (existing) return prisma.recruiterScreeningSession.update({ where: { id: existing.id }, data });
  return prisma.recruiterScreeningSession.create({ data: { id: `verify_rss_${jobId}`, ...data } });
}

async function ensureNotification({ id, userId, title, body, data }) {
  const existing = await prisma.notification.findUnique({ where: { id } }).catch(() => null);
  const row = {
    id,
    userId,
    title,
    body,
    data: json(data || {}),
    isRead: false,
  };
  if (existing) {
    return prisma.notification.update({ where: { id }, data: row });
  }
  return prisma.notification.create({ data: row });
}

async function main() {
  const dbUrl = (process.env.DATABASE_URL || '').toLowerCase();
  if (!dbUrl.startsWith('file:')) {
    throw new Error('This seed is intended for local SQLite (DATABASE_URL=file:./dev.db).');
  }

  // --- Users ---
  const adminUser = await ensureUser({
    id: 'verify_user_admin',
    email: 'verify.admin@pwioi.in',
    role: 'ADMIN',
    displayName: `${PREFIX} Admin`,
  });

  const scopedAdminUser = await ensureUser({
    id: 'verify_user_scoped_admin',
    email: 'verify.scoped.admin@pwioi.in',
    role: 'ADMIN',
    displayName: `${PREFIX} Scoped Admin`,
  });

  const studentAUser = await ensureUser({
    id: 'verify_user_student_a',
    email: 'verify.student.a@pwioi.in',
    role: 'STUDENT',
    displayName: `${PREFIX} Student A`,
  });

  const studentBUser = await ensureUser({
    id: 'verify_user_student_b',
    email: 'verify.student.b@pwioi.in',
    role: 'STUDENT',
    displayName: `${PREFIX} Student B`,
  });

  const studentOtherCenterUser = await ensureUser({
    id: 'verify_user_student_other_center',
    email: 'verify.student.other@pwioi.in',
    role: 'STUDENT',
    displayName: `${PREFIX} Student Other`,
  });

  // --- Admin scope (directory) ---
  await ensureAdmin({
    userId: adminUser.id,
    name: adminUser.displayName,
    role: 'ADMIN',
    allowedSchools: [],
    allowedCenters: [],
    allowedBatches: [],
  });

  await ensureAdmin({
    userId: scopedAdminUser.id,
    name: scopedAdminUser.displayName,
    role: 'ADMIN',
    allowedSchools: ['SOT'],
    allowedCenters: ['Bangalore'],
    allowedBatches: ['2024-2028'],
  });

  // --- Students ---
  const studentA = await ensureStudent({
    userId: studentAUser.id,
    fullName: `${PREFIX} Student A`,
    email: studentAUser.email,
    phone: '9999999991',
    school: 'SOT',
    center: 'Bangalore',
    batch: '2024-2028',
    cgpa: 8.4,
    profileCompleted: true,
    resumeUrl: 'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
  });

  const studentB = await ensureStudent({
    userId: studentBUser.id,
    fullName: `${PREFIX} Student B (ineligible)`,
    email: studentBUser.email,
    phone: '9999999992',
    school: 'SOT',
    center: 'Bangalore',
    batch: '2024-2028',
    cgpa: 5.5,
    profileCompleted: false,
    resumeUrl: null,
  });

  await ensureStudent({
    userId: studentOtherCenterUser.id,
    fullName: `${PREFIX} Student Other Center`,
    email: studentOtherCenterUser.email,
    phone: '9999999993',
    school: 'SOT',
    center: 'Hyderabad',
    batch: '2024-2028',
    cgpa: 8.1,
    profileCompleted: true,
    resumeUrl: null,
  });

  // --- Assessment (for requiresTest CTA) ---
  const assessment = await ensureAssessment({
    id: 'verify_assessment_aptitude',
    title: `${PREFIX}: Aptitude Test (Linked)`,
  });
  await ensureAssessmentQuestion({ id: 'verify_assessment_q1', assessmentId: assessment.id, order: 0 });
  await ensureAssessmentQuestion({ id: 'verify_assessment_q2', assessmentId: assessment.id, order: 1 });
  await ensureAssessmentAssignment({
    id: 'verify_assignment_a',
    assessmentId: assessment.id,
    studentId: studentA.id,
  });

  // --- Jobs ---
  // IMPORTANT: student job feed targeting matches by exact string equality (case-insensitive),
  // so we include common variants to ensure seeded jobs appear for real accounts.
  const targeting = {
    targetSchools: json(['SOT', 'School of Technology', 'school of technology']),
    targetCenters: json(['Bangalore', 'bangalore', 'BANGALORE']),
    targetBatches: json(['2024-2028', '24-28']),
    targetBranches: json([]),
    targetSchoolIds: json([]),
    targetCenterIds: json([]),
    targetBatchIds: json([]),
  };

  const baseJob = {
    description: `${PREFIX}: Seeded job for pipeline verification.`,
    requirements: 'Strong fundamentals. This is seeded mock data.',
    requiredSkills: 'JavaScript, React, Node.js',
    driveVenues: 'Campus',
    spocs: 'spoc@pwioi.in',
    location: 'Bangalore',
    companyLocation: 'Bangalore',
    workMode: 'Onsite',
    experienceLevel: 'Fresher',
    applicationDeadline: daysFromNow(10),
    isActive: true,
    ...targeting,
  };

  const jobCustomQ = await ensureJob({
    id: 'verify_job_custom_questions',
    jobTitle: `${PREFIX} — Custom Questions Job`,
    companyName: `${PREFIX} Corp`,
    status: 'POSTED',
    isPosted: true,
    requiresScreening: false,
    requiresTest: false,
    customQuestions: json([
      'Are you willing to relocate?',
      'What is your notice period (days)?',
    ]),
    companyTier: 'REGULAR',
    ...baseJob,
  });

  const jobNoGate = await ensureJob({
    id: 'verify_job_no_gate',
    jobTitle: `${PREFIX} — No Screening/Test Job`,
    companyName: `${PREFIX} Labs`,
    status: 'POSTED',
    isPosted: true,
    requiresScreening: false,
    requiresTest: false,
    customQuestions: json([]),
    companyTier: 'REGULAR',
    ...baseJob,
  });

  const jobWithTest = await ensureJob({
    id: 'verify_job_requires_test',
    jobTitle: `${PREFIX} — Requires Assessment Job`,
    companyName: `${PREFIX} Ventures`,
    status: 'POSTED',
    isPosted: true,
    requiresScreening: false,
    requiresTest: true,
    linkedAssessmentId: assessment.id,
    assessmentPassPercent: 60,
    companyTier: 'DREAM',
    customQuestions: json([]),
    ...baseJob,
  });

  const jobOffer = await ensureJob({
    id: 'verify_job_offer_flow',
    jobTitle: `${PREFIX} — Offer Flow Job`,
    companyName: `${PREFIX} Hiring`,
    status: 'POSTED',
    isPosted: true,
    requiresScreening: false,
    requiresTest: false,
    companyTier: 'SUPER_DREAM',
    customQuestions: json([]),
    driveDate: daysFromNow(14),
    ...baseJob,
  });

  await ensureJob({
    id: 'verify_job_in_review',
    jobTitle: `${PREFIX} — In Review Job`,
    companyName: `${PREFIX} Pending`,
    status: 'IN_REVIEW',
    isPosted: false,
    isActive: false,
    requiresScreening: false,
    requiresTest: false,
    customQuestions: json([]),
    companyTier: 'REGULAR',
    ...baseJob,
  });

  // --- Applications ---
  await ensureApplication({
    id: 'verify_app_customq_a',
    studentId: studentA.id,
    jobId: jobCustomQ.id,
    status: 'APPLIED',
    screeningStatus: 'APPLIED',
    customAnswers: json({
      relocate: 'Yes, anywhere in India',
      notice: 0,
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const appNoGate = await ensureApplication({
    id: 'verify_app_nogate_a',
    studentId: studentA.id,
    jobId: jobNoGate.id,
    status: 'APPLIED',
    screeningStatus: 'APPLIED',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await ensureApplication({
    id: 'verify_app_offer_a',
    studentId: studentA.id,
    jobId: jobOffer.id,
    status: 'OFFERED',
    screeningStatus: 'INTERVIEW_ELIGIBLE',
    offerCtc: '12 LPA',
    offerLetterUrl: 'https://example.com/offer-letter.pdf',
    offerDeadlineAt: daysFromNow(5),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // --- Interview scheduling session + slot (Present/No-show) ---
  const session = await ensureInterviewSession({
    id: 'verify_session_nogate',
    jobId: jobNoGate.id,
    status: 'COMPLETED',
    createdBy: adminUser.id,
    startedAt: daysFromNow(-2),
    completedAt: daysFromNow(-1),
    resultsDeclaredAt: null,
    resultsLocked: false,
  });

  const round1 = await ensureInterviewRound({
    id: 'verify_round1_nogate',
    sessionId: session.id,
    roundNumber: 1,
    name: 'Technical Round',
    status: 'LOCKED',
  });

  await ensureInterviewSlot({
    id: 'verify_slot1_nogate',
    sessionId: session.id,
    applicationId: appNoGate.id,
    roundId: round1.id,
    scheduledAt: daysFromNow(-2),
    room: 'Room 101',
    slotDeliveryMode: 'OFFLINE',
    status: 'SCHEDULED',
    notes: `${PREFIX}: Use Present / No-show buttons.`,
  });

  // --- Recruiter screening token session (custom answers visible) ---
  const token = crypto.randomBytes(18).toString('hex');
  await ensureRecruiterScreeningSession({ jobId: jobCustomQ.id, token });

  // --- Notifications (bell) ---
  await ensureNotification({
    id: 'verify_notif_student_a_1',
    userId: studentAUser.id,
    title: `${PREFIX}: Application update`,
    body: 'Your application was received and is under review.',
    data: { kind: 'application', jobId: jobCustomQ.id },
  });
  await ensureNotification({
    id: 'verify_notif_student_a_2',
    userId: studentAUser.id,
    title: `${PREFIX}: Offer received`,
    body: 'You have received an offer. Please accept/decline before the deadline.',
    data: { kind: 'offer', jobId: jobOffer.id },
  });
  await ensureNotification({
    id: 'verify_notif_admin_1',
    userId: adminUser.id,
    title: `${PREFIX}: Job pending review`,
    body: 'A job is waiting in IN_REVIEW state.',
    data: { kind: 'job_review', jobId: 'verify_job_in_review' },
  });

  // --- Output ---
  // eslint-disable-next-line no-console
  console.log(`\n✅ Seeded ${PREFIX} dataset into SQLite.\n`);
  // eslint-disable-next-line no-console
  console.log('Login accounts (password: Password@123):');
  // eslint-disable-next-line no-console
  console.log('  Admin:         verify.admin@pwioi.in');
  // eslint-disable-next-line no-console
  console.log('  Scoped Admin:  verify.scoped.admin@pwioi.in');
  // eslint-disable-next-line no-console
  console.log('  Student A:     verify.student.a@pwioi.in');
  // eslint-disable-next-line no-console
  console.log('  Student B:     verify.student.b@pwioi.in  (ineligible profile)');
  // eslint-disable-next-line no-console
  console.log('\nUseful IDs:');
  // eslint-disable-next-line no-console
  console.log('  Job (custom Q):', jobCustomQ.id);
  // eslint-disable-next-line no-console
  console.log('  Job (no gate): ', jobNoGate.id);
  // eslint-disable-next-line no-console
  console.log('  Job (test):    ', jobWithTest.id);
  // eslint-disable-next-line no-console
  console.log('  Job (offer):   ', jobOffer.id);
  // eslint-disable-next-line no-console
  console.log('\nRecruiter screening token (copy into recruiter screening route if you use it):');
  // eslint-disable-next-line no-console
  console.log('  token:', token);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

