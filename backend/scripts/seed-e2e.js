/**
 * Deterministic E2E fixture seeder.
 * Usage (from repo root): npm run e2e:seed
 * Or: E2E=1 node backend/scripts/seed-e2e.js
 */
import { execSync } from 'child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { ACADEMIC, E2E_PASSWORD, USERS } from '../../e2e/fixtures/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '..');
const repoRoot = join(backendRoot, '..');

process.env.E2E = '1';

const usePostgres = process.env.E2E_DB === 'postgres';
const sqliteSchemaPath = join(backendRoot, 'prisma/schema.e2e.sqlite.prisma');

if (usePostgres) {
  dotenv.config({ path: join(backendRoot, '.env.e2e.postgres'), override: true });
} else {
  dotenv.config({ path: join(backendRoot, '.env.e2e'), override: true });
}
process.env.E2E = '1';

if (usePostgres) {
  execSync('npx prisma generate', {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env, E2E: '1', E2E_DB: 'postgres' },
  });
  execSync(
    'npx prisma db push --skip-generate --force-reset --accept-data-loss',
    {
      cwd: backendRoot,
      stdio: 'inherit',
      env: { ...process.env, E2E: '1', E2E_DB: 'postgres' },
    },
  );
} else {
  const dbFile = join(backendRoot, 'e2e.db');
  const prismaDbFile = join(backendRoot, 'prisma/e2e.db');
  for (const dbPath of [dbFile, prismaDbFile]) {
    for (const extra of ['', '-journal', '-wal', '-shm']) {
      const path = `${dbPath}${extra}`;
      if (existsSync(path)) unlinkSync(path);
    }
  }

  const baseSchema = readFileSync(join(backendRoot, 'prisma/schema.prisma'), 'utf8');
  writeFileSync(
    sqliteSchemaPath,
    baseSchema.replace('provider = "postgresql"', 'provider = "sqlite"'),
  );

  execSync(`npx prisma db push --schema=${sqliteSchemaPath} --skip-generate --force-reset --accept-data-loss`, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./e2e.db', E2E: '1' },
  });
  execSync(`npx prisma generate --schema=${sqliteSchemaPath}`, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./e2e.db', E2E: '1' },
  });
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);
const jwtSecret = process.env.JWT_SECRET;

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function joinConfig(extra = {}) {
  const {
    joinOpensMinutesBeforeStart = 1440,
    joinClosesMinutesAfterStart = 1440,
    ...rest
  } = extra;
  return JSON.stringify({
    ...rest,
    joinWindow: {
      opensMinutesBeforeStart: joinOpensMinutesBeforeStart,
      closesMinutesAfterStart: joinClosesMinutesAfterStart,
    },
  });
}

async function upsertUser({ email, role, status = 'ACTIVE', displayName }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      status,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      displayName,
    },
    create: {
      email,
      passwordHash,
      role,
      status,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      displayName,
    },
  });
}

async function main() {
  const schoolSot = await prisma.school.create({
    data: { name: ACADEMIC.sot.name, code: ACADEMIC.sot.code, status: 'ACTIVE' },
  });
  const schoolSom = await prisma.school.create({
    data: { name: ACADEMIC.som.name, code: ACADEMIC.som.code, status: 'ACTIVE' },
  });
  const centerBlr = await prisma.center.create({
    data: { name: ACADEMIC.bangalore.name, location: ACADEMIC.bangalore.location, status: 'ACTIVE' },
  });
  const centerHyd = await prisma.center.create({
    data: { name: ACADEMIC.hyderabad.name, location: ACADEMIC.hyderabad.location, status: 'ACTIVE' },
  });
  const batch2428 = await prisma.batch.create({
    data: { year: ACADEMIC.batch2428.year, label: ACADEMIC.batch2428.label, status: 'ACTIVE' },
  });
  const batch2327 = await prisma.batch.create({
    data: { year: ACADEMIC.batch2327.year, label: ACADEMIC.batch2327.label, status: 'ACTIVE' },
  });

  const superUser = await upsertUser({
    email: USERS.superAdmin.email,
    role: 'SUPER_ADMIN',
    displayName: USERS.superAdmin.name,
  });
  await prisma.admin.create({
    data: {
      userId: superUser.id,
      name: USERS.superAdmin.name,
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify(['*']),
      allowedCenters: JSON.stringify(['*']),
      allowedBatches: JSON.stringify(['*']),
      allowedSchoolIds: JSON.stringify(['*']),
      allowedCenterIds: JSON.stringify(['*']),
      allowedBatchIds: JSON.stringify(['*']),
    },
  });

  const adminAUser = await upsertUser({
    email: USERS.adminA.email,
    role: 'ADMIN',
    displayName: USERS.adminA.name,
  });
  await prisma.admin.create({
    data: {
      userId: adminAUser.id,
      name: USERS.adminA.name,
      role: 'ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify([ACADEMIC.sot.code]),
      allowedCenters: JSON.stringify([ACADEMIC.bangalore.name]),
      allowedBatches: JSON.stringify([ACADEMIC.batch2428.year]),
      allowedSchoolIds: JSON.stringify([schoolSot.id]),
      allowedCenterIds: JSON.stringify([centerBlr.id]),
      allowedBatchIds: JSON.stringify([batch2428.id]),
    },
  });

  const adminBUser = await upsertUser({
    email: USERS.adminB.email,
    role: 'ADMIN',
    displayName: USERS.adminB.name,
  });
  await prisma.admin.create({
    data: {
      userId: adminBUser.id,
      name: USERS.adminB.name,
      role: 'ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify([ACADEMIC.som.code]),
      allowedCenters: JSON.stringify([ACADEMIC.hyderabad.name]),
      allowedBatches: JSON.stringify([ACADEMIC.batch2327.year]),
      allowedSchoolIds: JSON.stringify([schoolSom.id]),
      allowedCenterIds: JSON.stringify([centerHyd.id]),
      allowedBatchIds: JSON.stringify([batch2327.id]),
    },
  });

  const adminEmptyUser = await upsertUser({
    email: USERS.adminEmpty.email,
    role: 'ADMIN',
    displayName: USERS.adminEmpty.name,
  });
  await prisma.admin.create({
    data: {
      userId: adminEmptyUser.id,
      name: USERS.adminEmpty.name,
      role: 'ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: '[]',
      allowedCenters: '[]',
      allowedBatches: '[]',
      allowedSchoolIds: '[]',
      allowedCenterIds: '[]',
      allowedBatchIds: '[]',
    },
  });

  const company = await prisma.company.create({
    data: {
      name: 'E2E TechCorp',
      website: 'https://e2e-techcorp.test',
      location: 'Bangalore',
      description: 'E2E fixture company',
    },
  });

  const recruiterUser = await upsertUser({
    email: USERS.recruiter.email,
    role: 'RECRUITER',
    displayName: USERS.recruiter.name,
  });
  await prisma.recruiter.create({
    data: {
      userId: recruiterUser.id,
      companyId: company.id,
      companyName: company.name,
      location: 'Bangalore',
    },
  });

  const recruiterPendingUser = await upsertUser({
    email: USERS.recruiterPending.email,
    role: 'RECRUITER',
    status: 'PENDING',
    displayName: USERS.recruiterPending.name,
  });
  await prisma.recruiter.create({
    data: {
      userId: recruiterPendingUser.id,
      companyId: company.id,
      companyName: company.name,
      location: 'Hyderabad',
    },
  });

  async function createStudent({ userSpec, school, center, batch, enrollmentId, profileCompleted, extra = {} }) {
    const user = await upsertUser({
      email: userSpec.email,
      role: 'STUDENT',
      status: extra.status || 'ACTIVE',
      displayName: userSpec.name,
    });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        fullName: userSpec.name,
        email: userSpec.email,
        phone: extra.phone || '9876543210',
        enrollmentId,
        school: school?.code || extra.schoolText || '',
        center: center?.name || extra.centerText || '',
        batch: batch?.year || extra.batchText || '',
        schoolId: school?.id || null,
        centerId: center?.id || null,
        batchId: batch?.id || null,
        branch: extra.branch || 'CSE',
        cgpa: extra.cgpa ?? 8.5,
        backlogs: extra.backlogs || '0',
        profileCompleted: profileCompleted === true,
        headline: extra.headline || 'E2E student',
        bio: extra.bio || 'Fixture student',
        city: extra.city || 'Bangalore',
      },
    });
    return { user, student };
  }

  const { user: studentAUser, student: studentA } = await createStudent({
    userSpec: USERS.studentA,
    school: schoolSot,
    center: centerBlr,
    batch: batch2428,
    enrollmentId: 'E2E-STU-A',
    profileCompleted: true,
  });
  await prisma.student.update({
    where: { id: studentA.id },
    data: {
      publicProfileId: 'e2e-public-profile-a',
      publicProfileShowEmail: true,
      publicProfileShowPhone: false,
    },
  });
  const { student: studentB } = await createStudent({
    userSpec: USERS.studentB,
    school: schoolSom,
    center: centerHyd,
    batch: batch2327,
    enrollmentId: 'E2E-STU-B',
    profileCompleted: true,
    extra: { city: 'Hyderabad' },
  });
  const { student: studentIncomplete } = await createStudent({
    userSpec: USERS.studentIncomplete,
    school: null,
    center: null,
    batch: null,
    enrollmentId: 'E2E-STU-I',
    profileCompleted: false,
    extra: { schoolText: '', centerText: '', batchText: '', phone: '0000000000', cgpa: null, backlogs: '' },
  });
  await createStudent({
    userSpec: USERS.studentBlocked,
    school: schoolSot,
    center: centerBlr,
    batch: batch2428,
    enrollmentId: 'E2E-STU-X',
    profileCompleted: true,
    extra: { status: 'BLOCKED' },
  });
  const { student: studentReset } = await createStudent({
    userSpec: USERS.studentReset,
    school: schoolSot,
    center: centerBlr,
    batch: batch2428,
    enrollmentId: 'E2E-STU-R',
    profileCompleted: true,
  });

  const emptyArr = '[]';
  const targetA = {
    targetSchools: JSON.stringify([ACADEMIC.sot.code]),
    targetCenters: JSON.stringify([ACADEMIC.bangalore.name]),
    targetBatches: JSON.stringify([ACADEMIC.batch2428.year]),
    targetBranches: JSON.stringify(['CSE']),
    targetSchoolIds: JSON.stringify([schoolSot.id]),
    targetCenterIds: JSON.stringify([centerBlr.id]),
    targetBatchIds: JSON.stringify([batch2428.id]),
  };
  const targetB = {
    targetSchools: JSON.stringify([ACADEMIC.som.code]),
    targetCenters: JSON.stringify([ACADEMIC.hyderabad.name]),
    targetBatches: JSON.stringify([ACADEMIC.batch2327.year]),
    targetBranches: JSON.stringify(['CSE']),
    targetSchoolIds: JSON.stringify([schoolSom.id]),
    targetCenterIds: JSON.stringify([centerHyd.id]),
    targetBatchIds: JSON.stringify([batch2327.id]),
  };

  const jobBase = (overrides) => ({
    description: 'E2E fixture job description with enough detail for applications.',
    requirements: 'DSA, JavaScript, Node.js',
    requiredSkills: JSON.stringify(['JavaScript', 'React', 'Node.js']),
    companyId: company.id,
    companyName: company.name,
    salary: '12 LPA',
    ctc: '12 LPA',
    location: 'Bangalore',
    companyLocation: 'Bangalore',
    applicationDeadline: daysFromNow(14),
    driveDate: daysFromNow(21),
    jobType: 'FULL_TIME',
    workMode: 'HYBRID',
    experienceLevel: 'FRESHER',
    driveVenues: JSON.stringify([{ venue: 'Bangalore', date: daysFromNow(21).toISOString() }]),
    reportingTime: '09:30 AM',
    qualification: 'B.Tech',
    specialization: 'CSE',
    yop: '2028',
    minCgpa: '7.0',
    gapAllowed: 'No',
    backlogs: '0',
    spocs: JSON.stringify([{ name: USERS.adminA.name, email: USERS.adminA.email }]),
    interviewRounds: JSON.stringify(['Online Assessment', 'Technical', 'HR']),
    interviewMode: 'HYBRID',
    companyTier: 'REGULAR',
    customQuestions: emptyArr,
    createdBy: adminAUser.id,
    recruiterEmail: USERS.recruiter.email,
    recruiterName: USERS.recruiter.name,
    recruiterEmails: JSON.stringify([{ email: USERS.recruiter.email, name: USERS.recruiter.name }]),
    ...overrides,
  });

  const jobPostedA = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-POSTED-A',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      postedBy: adminAUser.id,
      approvedAt: new Date(),
      approvedBy: adminAUser.id,
      ...targetA,
    }),
  });
  const jobDraft = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-DRAFT',
      status: 'IN_REVIEW',
      isActive: false,
      isPosted: false,
      ...targetA,
    }),
  });
  const jobDup = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-DUP',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      postedBy: adminAUser.id,
      ...targetA,
    }),
  });
  const jobApplyOpen = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-APPLY-OPEN',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      postedBy: adminAUser.id,
      ...targetA,
    }),
  });
  const jobOffer = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-OFFER',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      postedBy: adminAUser.id,
      ...targetA,
    }),
  });
  const jobSom = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-SOM',
      location: 'Hyderabad',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      createdBy: adminBUser.id,
      ...targetB,
    }),
  });
  const jobInterviewA = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-INTERVIEW-A',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      ...targetA,
    }),
  });
  const jobScreening = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-SCREENING',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      applicationDeadline: daysFromNow(-1),
      ...targetA,
    }),
  });
  const jobWithdraw = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-WITHDRAW',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      ...targetA,
    }),
  });
  const jobDecline = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-DECLINE',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      ...targetA,
    }),
  });
  const jobIllegal = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-ILLEGAL-STATUS',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      ...targetA,
    }),
  });

  const appPostedA = await prisma.application.create({
    data: {
      studentId: studentA.id,
      jobId: jobPostedA.id,
      companyId: company.id,
      status: 'APPLIED',
      pipelineStatus: 'APPLIED',
      screeningStatus: 'APPLIED',
    },
  });
  await prisma.jobTracking.create({
    data: {
      studentId: studentA.id,
      jobId: jobPostedA.id,
      viewed: true,
      applied: true,
      appliedAt: new Date(),
      isNew: false,
    },
  });
  const appOffer = await prisma.application.create({
    data: {
      studentId: studentA.id,
      jobId: jobOffer.id,
      companyId: company.id,
      status: 'OFFERED',
      pipelineStatus: 'OFFERED',
      screeningStatus: 'SHORTLISTED',
      offerCtc: '12 LPA',
      offerDeadlineAt: daysFromNow(7),
    },
  });
  const appSomB = await prisma.application.create({
    data: {
      studentId: studentB.id,
      jobId: jobSom.id,
      companyId: company.id,
      status: 'APPLIED',
      pipelineStatus: 'APPLIED',
      screeningStatus: 'APPLIED',
    },
  });
  const appWithdraw = await prisma.application.create({
    data: {
      studentId: studentA.id,
      jobId: jobWithdraw.id,
      companyId: company.id,
      status: 'APPLIED',
      pipelineStatus: 'APPLIED',
      screeningStatus: 'APPLIED',
    },
  });
  const appDecline = await prisma.application.create({
    data: {
      studentId: studentA.id,
      jobId: jobDecline.id,
      companyId: company.id,
      status: 'OFFERED',
      pipelineStatus: 'OFFERED',
      screeningStatus: 'SHORTLISTED',
      offerCtc: '10 LPA',
      offerDeadlineAt: daysFromNow(7),
    },
  });
  const appIllegal = await prisma.application.create({
    data: {
      studentId: studentA.id,
      jobId: jobIllegal.id,
      companyId: company.id,
      status: 'APPLIED',
      pipelineStatus: 'APPLIED',
      screeningStatus: 'APPLIED',
    },
  });

  const hiddenExpected = 'HIDDEN_E2E_SECRET_OUTPUT';
  const codingTestCases = JSON.stringify([
    { input: '2 3', expectedOutput: '5', hidden: false },
    { input: '10 1', expectedOutput: hiddenExpected, hidden: true },
  ]);

  const asmMixed = await prisma.assessment.create({
    data: {
      title: 'ASM-MIXED',
      description: 'E2E mixed assessment assigned only to Student A',
      type: 'MIXED',
      difficulty: 'MEDIUM',
      duration: 60,
      startTime: new Date(),
      endTime: daysFromNow(30),
      instructions: 'E2E fixture. Do not switch tabs.',
      status: 'PUBLISHED',
      config: joinConfig({
        proctoring: true,
        cameraRequired: true,
        fullscreen: true,
        autoSubmit: { threshold: 3 },
        allowedLanguages: ['javascript'],
      }),
      questions: {
        create: [
          {
            questionText: 'What is 2 + 2?',
            type: 'MCQ',
            options: JSON.stringify(['3', '4', '5', '22']),
            correctAnswer: '4',
            points: 10,
            order: 0,
          },
          {
            questionText: 'Sum two numbers from stdin',
            type: 'CODING',
            points: 20,
            order: 1,
            language: 'javascript',
            starterCode: 'const fs=require("fs"); const [a,b]=fs.readFileSync(0,"utf8").trim().split(/\\s+/).map(Number); console.log(a+b);',
            testCases: codingTestCases,
            examples: JSON.stringify([{ input: '2 3', output: '5' }]),
          },
        ],
      },
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmMixed.id, studentId: studentA.id },
  });

  const asmGrade = await prisma.assessment.create({
    data: {
      title: 'ASM-GRADE',
      description: 'MCQ grading fixture',
      type: 'MIXED',
      duration: 30,
      startTime: new Date(),
      endTime: daysFromNow(30),
      status: 'PUBLISHED',
      config: joinConfig(),
      questions: {
        create: [
          {
            questionText: 'What is 2 + 2?',
            type: 'MCQ',
            options: JSON.stringify(['3', '4', '5', '22']),
            correctAnswer: '4',
            points: 10,
            order: 0,
          },
        ],
      },
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmGrade.id, studentId: studentA.id },
  });

  const asmProc = await prisma.assessment.create({
    data: {
      title: 'ASM-PROC',
      description: 'Proctoring fixture',
      type: 'MIXED',
      duration: 60,
      startTime: new Date(),
      endTime: daysFromNow(30),
      status: 'PUBLISHED',
      config: joinConfig({
        proctoring: true,
        cameraRequired: true,
        autoSubmit: { threshold: 3 },
      }),
      questions: {
        create: [{
          questionText: 'Proc MCQ',
          type: 'MCQ',
          options: JSON.stringify(['a', 'b']),
          correctAnswer: 'a',
          points: 1,
          order: 0,
        }],
      },
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmProc.id, studentId: studentA.id },
  });

  const asmRace = await prisma.assessment.create({
    data: {
      title: 'ASM-RACE',
      description: 'Double-complete fixture',
      type: 'MIXED',
      duration: 30,
      startTime: new Date(),
      endTime: daysFromNow(30),
      status: 'PUBLISHED',
      config: joinConfig(),
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmRace.id, studentId: studentA.id },
  });

  const asmDraft = await prisma.assessment.create({
    data: {
      title: 'ASM-DRAFT',
      description: 'Draft — students must not start',
      type: 'MIXED',
      duration: 30,
      status: 'DRAFT',
      config: '{}',
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmDraft.id, studentId: studentA.id },
  });

  const asmB = await prisma.assessment.create({
    data: {
      title: 'ASM-B',
      description: 'Assigned only to Student B',
      type: 'MIXED',
      duration: 30,
      startTime: new Date(),
      endTime: daysFromNow(30),
      status: 'PUBLISHED',
      config: joinConfig(),
      questions: {
        create: [
          {
            questionText: 'SOM only question',
            type: 'MCQ',
            options: JSON.stringify(['a', 'b']),
            correctAnswer: 'a',
            points: 5,
            order: 0,
          },
        ],
      },
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmB.id, studentId: studentB.id },
  });
  const sessionB = await prisma.assessmentSession.create({
    data: {
      assessmentId: asmB.id,
      studentId: studentB.id,
      status: 'IN_PROGRESS',
    },
  });

  const asmTimer = await prisma.assessment.create({
    data: {
      title: 'ASM-TIMER',
      description: 'Pre-expired session for timer tests',
      type: 'MIXED',
      duration: 1,
      startTime: new Date(),
      endTime: daysFromNow(30),
      status: 'PUBLISHED',
      config: joinConfig(),
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmTimer.id, studentId: studentA.id },
  });
  await prisma.assessmentSession.create({
    data: {
      assessmentId: asmTimer.id,
      studentId: studentA.id,
      status: 'IN_PROGRESS',
      startTime: new Date(Date.now() - 10 * 60 * 1000),
    },
  });

  const asmEssay = await prisma.assessment.create({
    data: {
      title: 'ASM-ESSAY',
      description: 'Descriptive pending-review fixture',
      type: 'MIXED',
      duration: 30,
      startTime: new Date(),
      endTime: daysFromNow(30),
      status: 'PUBLISHED',
      config: joinConfig(),
      questions: {
        create: [{
          questionText: 'Explain a recent project.',
          type: 'DESCRIPTIVE',
          points: 10,
          order: 0,
        }],
      },
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmEssay.id, studentId: studentA.id },
  });

  const asmClosed = await prisma.assessment.create({
    data: {
      title: 'ASM-CLOSED',
      description: 'Join window already closed',
      type: 'MIXED',
      duration: 30,
      startTime: hoursFromNow(-48),
      endTime: hoursFromNow(-24),
      status: 'PUBLISHED',
      config: joinConfig({
        joinOpensMinutesBeforeStart: 10,
        joinClosesMinutesAfterStart: 10,
      }),
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmClosed.id, studentId: studentA.id },
  });

  const asmImport = await prisma.assessment.create({
    data: {
      title: 'ASM-IMPORT',
      description: 'Bulk import target',
      type: 'MIXED',
      duration: 30,
      startTime: new Date(),
      endTime: daysFromNow(30),
      status: 'DRAFT',
      config: joinConfig(),
    },
  });

  const asmPaste = await prisma.assessment.create({
    data: {
      title: 'ASM-PASTE',
      description: 'Paste violation fixture',
      type: 'MIXED',
      duration: 60,
      startTime: new Date(),
      endTime: daysFromNow(30),
      status: 'PUBLISHED',
      config: joinConfig({ proctoring: true }),
      questions: {
        create: [{
          questionText: 'Paste MCQ',
          type: 'MCQ',
          options: JSON.stringify(['a', 'b']),
          correctAnswer: 'a',
          points: 1,
          order: 0,
        }],
      },
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmPaste.id, studentId: studentA.id },
  });

  const asmSql = await prisma.assessment.create({
    data: {
      title: 'ASM-SQL',
      description: 'SQL not auto-scored fixture',
      type: 'MIXED',
      duration: 30,
      startTime: new Date(),
      endTime: daysFromNow(30),
      status: 'PUBLISHED',
      config: joinConfig(),
      questions: {
        create: [{
          questionText: 'List all students with CGPA above 8',
          type: 'SQL',
          points: 10,
          order: 0,
          language: 'sql',
        }],
      },
    },
  });
  await prisma.assessmentAssignment.create({
    data: { assessmentId: asmSql.id, studentId: studentA.id },
  });

  const jobTest = await prisma.job.create({
    data: jobBase({
      jobTitle: 'JOB-TEST',
      status: 'POSTED',
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      requiresTest: true,
      linkedAssessmentId: asmMixed.id,
      ...targetA,
    }),
  });

  const mockInWindow = await prisma.mockInterviewDrive.create({
    data: {
      title: 'E2E Mock In-Window A',
      category: 'TECHNICAL',
      enableCodeConsole: true,
      date: new Date(),
      startTime: hoursFromNow(-1),
      endTime: hoursFromNow(3),
      slotDuration: 30,
      targetStudentIds: JSON.stringify([studentA.id]),
      status: 'PUBLISHED',
    },
  });
  const mockSlotA = await prisma.mockInterviewSlot.create({
    data: {
      driveId: mockInWindow.id,
      studentId: studentA.id,
      startTime: hoursFromNow(-0.25),
      endTime: hoursFromNow(0.25),
      status: 'SCHEDULED',
      joinLink: `/mock-interview-room/Room_${mockInWindow.id}_${studentA.id}`,
    },
  });

  const mockOutside = await prisma.mockInterviewDrive.create({
    data: {
      title: 'E2E Mock Outside Window A',
      category: 'HR',
      date: daysFromNow(-2),
      startTime: hoursFromNow(-48),
      endTime: hoursFromNow(-46),
      slotDuration: 30,
      targetStudentIds: JSON.stringify([studentA.id]),
      status: 'PUBLISHED',
    },
  });
  const mockSlotOutside = await prisma.mockInterviewSlot.create({
    data: {
      driveId: mockOutside.id,
      studentId: studentA.id,
      startTime: hoursFromNow(-48),
      endTime: hoursFromNow(-46),
      status: 'SCHEDULED',
    },
  });

  const mockB = await prisma.mockInterviewDrive.create({
    data: {
      title: 'E2E Mock Drive B',
      category: 'TECHNICAL',
      date: new Date(),
      startTime: hoursFromNow(-1),
      endTime: hoursFromNow(3),
      slotDuration: 30,
      targetStudentIds: JSON.stringify([studentB.id]),
      status: 'PUBLISHED',
    },
  });
  const mockSlotB = await prisma.mockInterviewSlot.create({
    data: {
      driveId: mockB.id,
      studentId: studentB.id,
      startTime: hoursFromNow(-0.25),
      endTime: hoursFromNow(0.25),
      status: 'SCHEDULED',
    },
  });

  const mockDone = await prisma.mockInterviewDrive.create({
    data: {
      title: 'E2E Mock Completed A',
      category: 'TECHNICAL',
      date: daysFromNow(-1),
      startTime: hoursFromNow(-26),
      endTime: hoursFromNow(-25),
      slotDuration: 30,
      targetStudentIds: JSON.stringify([studentA.id]),
      status: 'PUBLISHED',
    },
  });
  const mockSlotDone = await prisma.mockInterviewSlot.create({
    data: {
      driveId: mockDone.id,
      studentId: studentA.id,
      startTime: hoursFromNow(-26),
      endTime: hoursFromNow(-25.5),
      status: 'COMPLETED',
    },
  });
  await prisma.mockInterviewFeedback.create({
    data: {
      slotId: mockSlotDone.id,
      communication: 4,
      confidence: 4,
      technicalSkills: 5,
      problemSolving: 4,
      bodyLanguage: 3,
      resumeKnowledge: 4,
      overallPerformance: 4,
      result: 'GOOD',
      detailedRemarks: 'E2E completed mock remarks',
    },
  });

  const aiA = await prisma.aiMockInterview.create({
    data: {
      title: 'E2E Guided AI A',
      sessionMode: 'GUIDED',
      interviewType: 'HR',
      startDate: daysFromNow(-1),
      endDate: daysFromNow(14),
      targetStudentIds: JSON.stringify([studentA.id]),
      status: 'PUBLISHED',
      questions: {
        create: [
          {
            orderIndex: 0,
            questionText: 'Tell us about yourself.',
            prepTimeSeconds: 10,
            answerTimeSeconds: 30,
          },
        ],
      },
    },
    include: { questions: true },
  });
  const aiEnrollmentA = await prisma.aiMockInterviewEnrollment.create({
    data: { interviewId: aiA.id, studentId: studentA.id, status: 'ASSIGNED' },
  });

  const aiDone = await prisma.aiMockInterview.create({
    data: {
      title: 'E2E Guided AI Completed A',
      sessionMode: 'GUIDED',
      interviewType: 'HR',
      startDate: daysFromNow(-7),
      endDate: daysFromNow(14),
      targetStudentIds: JSON.stringify([studentA.id]),
      status: 'PUBLISHED',
      questions: {
        create: [
          {
            orderIndex: 0,
            questionText: 'Describe a challenge you solved.',
            prepTimeSeconds: 10,
            answerTimeSeconds: 30,
          },
        ],
      },
    },
    include: { questions: true },
  });
  const aiEnrollmentDone = await prisma.aiMockInterviewEnrollment.create({
    data: {
      interviewId: aiDone.id,
      studentId: studentA.id,
      status: 'COMPLETED',
      startedAt: hoursFromNow(-2),
      completedAt: hoursFromNow(-1),
      progressPercent: 100,
    },
  });
  await prisma.aiMockInterviewAnswer.create({
    data: {
      enrollmentId: aiEnrollmentDone.id,
      questionId: aiDone.questions[0].id,
      transcriptText: 'E2E stub answer about a challenge.',
      transcriptStatus: 'SKIPPED',
      submittedAt: hoursFromNow(-1),
    },
  });

  const aiB = await prisma.aiMockInterview.create({
    data: {
      title: 'E2E Guided AI B',
      sessionMode: 'GUIDED',
      interviewType: 'TECHNICAL',
      startDate: daysFromNow(-1),
      endDate: daysFromNow(14),
      targetStudentIds: JSON.stringify([studentB.id]),
      status: 'PUBLISHED',
    },
  });
  await prisma.aiMockInterviewEnrollment.create({
    data: { interviewId: aiB.id, studentId: studentB.id, status: 'ASSIGNED' },
  });

  const sessionA = await prisma.interviewSession.create({
    data: {
      jobId: jobInterviewA.id,
      companyId: company.id,
      status: 'NOT_STARTED',
      createdBy: adminAUser.id,
    },
  });
  const interviewerToken = jwt.sign(
    { sessionId: sessionA.id, email: 'e2e.interviewer@pwioi.test', type: 'interviewer' },
    jwtSecret,
    { expiresIn: '30d' },
  );
  await prisma.interviewerInvite.create({
    data: {
      sessionId: sessionA.id,
      email: 'e2e.interviewer@pwioi.test',
      token: interviewerToken,
      expiresAt: daysFromNow(30),
    },
  });

  const sessionSom = await prisma.interviewSession.create({
    data: {
      jobId: jobSom.id,
      companyId: company.id,
      status: 'NOT_STARTED',
      createdBy: adminBUser.id,
    },
  });

  const screeningToken = jwt.sign(
    { jobId: jobScreening.id, recruiterEmail: USERS.recruiter.email, type: 'recruiter_screening' },
    jwtSecret,
    { expiresIn: '14d' },
  );
  await prisma.recruiterScreeningSession.create({
    data: {
      jobId: jobScreening.id,
      token: screeningToken,
      expiresAt: daysFromNow(14),
    },
  });

  await prisma.cmsSection.create({
    data: {
      pageSlug: 'landing',
      sectionKey: 'STATS',
      title: 'E2E Stats',
      meta: JSON.stringify({
        stats: [{ value: 'E2E_STAT_99', label: 'E2E placements' }],
      }),
      sortOrder: 1,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      createdById: superUser.id,
    },
  });
  await prisma.cmsSection.create({
    data: {
      pageSlug: 'landing',
      sectionKey: 'STATS',
      title: 'E2E Draft Stat',
      meta: JSON.stringify({
        stats: [{ value: 'E2E_DRAFT_HIDDEN', label: 'should not appear' }],
      }),
      sortOrder: 2,
      status: 'DRAFT',
      createdById: superUser.id,
    },
  });
  await prisma.successStory.create({
    data: {
      type: 'STUDENT_SUCCESS',
      title: 'E2E Success Story',
      description: 'Published fixture story',
      studentName: USERS.studentA.name,
      status: 'PUBLISHED',
      featured: true,
      publishedAt: new Date(),
      createdById: superUser.id,
    },
  });
  await prisma.cmsSection.create({
    data: {
      pageSlug: 'landing',
      sectionKey: 'FAQ',
      title: 'E2E FAQ CMS',
      meta: JSON.stringify({
        faqs: [{ question: 'E2E_FAQ_UNIQUE?', answer: 'This CMS FAQ should not appear on landing.' }],
      }),
      sortOrder: 3,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      createdById: superUser.id,
    },
  });

  const ids = {
    password: E2E_PASSWORD,
    users: {
      superAdmin: { email: USERS.superAdmin.email, userId: superUser.id },
      adminA: { email: USERS.adminA.email, userId: adminAUser.id },
      adminB: { email: USERS.adminB.email, userId: adminBUser.id },
      adminEmpty: { email: USERS.adminEmpty.email, userId: adminEmptyUser.id },
      recruiter: { email: USERS.recruiter.email, userId: recruiterUser.id },
      recruiterPending: { email: USERS.recruiterPending.email, userId: recruiterPendingUser.id },
      studentA: { email: USERS.studentA.email, userId: studentAUser.id, studentId: studentA.id },
      studentB: { email: USERS.studentB.email, userId: studentB.userId, studentId: studentB.id },
      studentIncomplete: { email: USERS.studentIncomplete.email, studentId: studentIncomplete.id },
      studentBlocked: { email: USERS.studentBlocked.email },
      studentReset: { email: USERS.studentReset.email, studentId: studentReset.id },
    },
    academic: {
      schoolSotId: schoolSot.id,
      schoolSomId: schoolSom.id,
      centerBlrId: centerBlr.id,
      centerHydId: centerHyd.id,
      batch2428Id: batch2428.id,
      batch2327Id: batch2327.id,
    },
    companyId: company.id,
    publicProfileId: 'e2e-public-profile-a',
    jobs: {
      postedA: jobPostedA.id,
      draft: jobDraft.id,
      applyOpen: jobApplyOpen.id,
      dup: jobDup.id,
      offer: jobOffer.id,
      som: jobSom.id,
      interviewA: jobInterviewA.id,
      test: jobTest.id,
      screening: jobScreening.id,
      withdraw: jobWithdraw.id,
      decline: jobDecline.id,
      illegal: jobIllegal.id,
    },
    applications: {
      postedA: appPostedA.id,
      offer: appOffer.id,
      somB: appSomB.id,
      withdraw: appWithdraw.id,
      decline: appDecline.id,
      illegal: appIllegal.id,
    },
    assessments: {
      mixed: asmMixed.id,
      draft: asmDraft.id,
      b: asmB.id,
      timer: asmTimer.id,
      grade: asmGrade.id,
      proc: asmProc.id,
      race: asmRace.id,
      essay: asmEssay.id,
      closed: asmClosed.id,
      import: asmImport.id,
      paste: asmPaste.id,
      sql: asmSql.id,
    },
    sessions: {
      studentBInProgress: sessionB.id,
    },
    mocks: {
      slotA: mockSlotA.id,
      slotOutside: mockSlotOutside.id,
      slotB: mockSlotB.id,
      driveB: mockB.id,
      slotDone: mockSlotDone.id,
      driveDone: mockDone.id,
    },
    ai: {
      interviewA: aiA.id,
      enrollmentA: aiEnrollmentA.id,
      interviewB: aiB.id,
      interviewDone: aiDone.id,
      enrollmentDone: aiEnrollmentDone.id,
    },
    interviews: {
      sessionA: sessionA.id,
      interviewerToken,
      sessionSom: sessionSom.id,
    },
    screening: {
      jobId: jobScreening.id,
      token: screeningToken,
    },
    coding: {
      hiddenExpected,
    },
  };

  const outDir = join(repoRoot, 'e2e/fixtures');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'ids.json'), JSON.stringify(ids, null, 2));
  console.log('E2E seed complete → e2e/fixtures/ids.json');
}

main()
  .catch((err) => {
    console.error('E2E seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
