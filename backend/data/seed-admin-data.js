/**
 * Seed admin-facing data: companies, jobs, applications, assessments, interviews, mock drive.
 * Usage: node data/seed-admin-data.js
 */
import { prisma, assertSqliteFriendly } from './prisma.js';
import { CREDENTIALS, ACADEMIC } from './credentials.js';

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function seedAdminData() {
  assertSqliteFriendly();

  const adminUser = await prisma.user.findUnique({
    where: { email: CREDENTIALS.admin.email },
  });
  const student = await prisma.student.findUnique({
    where: { email: CREDENTIALS.student.email },
  });

  if (!adminUser) throw new Error('Admin user missing. Run seed-users first.');
  if (!student) throw new Error('Student missing. Run seed-users first.');

  const school = await prisma.school.findUnique({ where: { name: ACADEMIC.school.name } });
  const batch = await prisma.batch.findUnique({ where: { year: ACADEMIC.batch.year } });

  const companies = [];
  for (const c of [
    {
      name: 'TechCorp India',
      website: 'https://techcorp.example',
      location: 'Bangalore',
      description: 'Product engineering company hiring full-stack and backend talent.',
    },
    {
      name: 'CloudNova',
      website: 'https://cloudnova.example',
      location: 'Hyderabad',
      description: 'Cloud infrastructure and DevOps platform company.',
    },
    {
      name: 'DataPulse Analytics',
      website: 'https://datapulse.example',
      location: 'Pune',
      description: 'Analytics and ML-driven insights for enterprises.',
    },
  ]) {
    companies.push(
      await prisma.company.upsert({
        where: { name: c.name },
        update: c,
        create: c,
      }),
    );
  }

  const targetSchools = JSON.stringify([ACADEMIC.school.code]);
  const targetCenters = JSON.stringify([ACADEMIC.center.name]);
  const targetBatches = JSON.stringify([ACADEMIC.batch.year]);
  const emptyArr = '[]';

  const jobSpecs = [
    {
      key: 'techcorp-sde',
      jobTitle: 'Software Development Engineer',
      company: companies[0],
      ctc: '12 LPA',
      location: 'Bangalore',
      status: 'POSTED',
      daysDeadline: 14,
      daysDrive: 21,
    },
    {
      key: 'cloudnova-backend',
      jobTitle: 'Backend Engineer Intern',
      company: companies[1],
      ctc: '40k/month stipend',
      location: 'Hyderabad / Remote',
      status: 'POSTED',
      daysDeadline: 10,
      daysDrive: 18,
    },
    {
      key: 'datapulse-analyst',
      jobTitle: 'Data Analyst',
      company: companies[2],
      ctc: '8 LPA',
      location: 'Pune',
      status: 'POSTED',
      daysDeadline: 7,
      daysDrive: 15,
    },
  ];

  const jobs = [];
  for (const spec of jobSpecs) {
    const existing = await prisma.job.findFirst({
      where: {
        jobTitle: spec.jobTitle,
        companyId: spec.company.id,
        createdBy: adminUser.id,
      },
    });

    const payload = {
      jobTitle: spec.jobTitle,
      description: `${spec.jobTitle} role at ${spec.company.name}. Build scalable products with a strong engineering culture.`,
      requirements: 'Strong DSA, problem solving, and at least one backend/frontend stack.',
      requiredSkills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'SQL', 'DSA']),
      companyId: spec.company.id,
      companyName: spec.company.name,
      salary: spec.ctc,
      ctc: spec.ctc,
      location: spec.location,
      companyLocation: spec.company.location,
      applicationDeadline: daysFromNow(spec.daysDeadline),
      driveDate: daysFromNow(spec.daysDrive),
      jobType: 'FULL_TIME',
      workMode: 'HYBRID',
      experienceLevel: 'FRESHER',
      driveVenues: JSON.stringify([{ venue: spec.location, date: daysFromNow(spec.daysDrive).toISOString() }]),
      reportingTime: '09:30 AM',
      qualification: 'B.Tech',
      specialization: 'CSE / IT',
      yop: '2028',
      minCgpa: '7.0',
      gapAllowed: 'No',
      backlogs: '0',
      spocs: JSON.stringify([{ name: CREDENTIALS.admin.name, email: CREDENTIALS.admin.email }]),
      status: spec.status,
      isActive: true,
      isPosted: true,
      postedAt: new Date(),
      postedBy: adminUser.id,
      approvedAt: new Date(),
      approvedBy: adminUser.id,
      createdBy: adminUser.id,
      interviewRounds: JSON.stringify(['Online Assessment', 'Technical', 'HR']),
      interviewMode: 'HYBRID',
      companyTier: 'REGULAR',
      targetSchools,
      targetCenters,
      targetBatches,
      targetBranches: JSON.stringify(['CSE']),
      targetSchoolIds: school ? JSON.stringify([school.id]) : emptyArr,
      targetCenterIds: emptyArr,
      targetBatchIds: batch ? JSON.stringify([batch.id]) : emptyArr,
      customQuestions: emptyArr,
    };

    const job = existing
      ? await prisma.job.update({ where: { id: existing.id }, data: payload })
      : await prisma.job.create({ data: payload });
    jobs.push(job);
  }

  // Applications + tracking for student
  const appStatuses = ['APPLIED', 'SHORTLISTED', 'APPLIED'];
  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    const status = appStatuses[i] || 'APPLIED';

    await prisma.jobTracking.upsert({
      where: { studentId_jobId: { studentId: student.id, jobId: job.id } },
      update: { viewed: true, viewedAt: new Date(), applied: true, appliedAt: new Date(), isNew: false },
      create: {
        studentId: student.id,
        jobId: job.id,
        viewed: true,
        viewedAt: new Date(),
        applied: true,
        appliedAt: new Date(),
        isNew: false,
      },
    });

    const existingApp = await prisma.application.findFirst({
      where: { studentId: student.id, jobId: job.id },
    });

    if (existingApp) {
      await prisma.application.update({
        where: { id: existingApp.id },
        data: {
          status,
          pipelineStatus: status,
          screeningStatus: status === 'SHORTLISTED' ? 'SHORTLISTED' : 'APPLIED',
        },
      });
    } else {
      await prisma.application.create({
        data: {
          studentId: student.id,
          jobId: job.id,
          companyId: job.companyId,
          status,
          pipelineStatus: status,
          screeningStatus: status === 'SHORTLISTED' ? 'SHORTLISTED' : 'APPLIED',
          applicationSource: 'PORTAL',
        },
      });
    }
  }

  await prisma.student.update({
    where: { id: student.id },
    data: {
      statsApplied: jobs.length,
      statsShortlisted: 1,
      statsInterviewed: 0,
      statsOffers: 0,
    },
  });

  // Assessment with MCQ + coding question, assigned to student
  let assessment = await prisma.assessment.findFirst({
    where: { title: 'Placement Readiness Mixed Test' },
  });

  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        title: 'Placement Readiness Mixed Test',
        description: 'MCQ + coding warm-up for campus drives.',
        type: 'MIXED',
        difficulty: 'MEDIUM',
        duration: 60,
        startTime: daysFromNow(-1),
        endTime: daysFromNow(30),
        instructions: 'Do not switch tabs. Submit before time ends.',
        status: 'PUBLISHED',
        config: JSON.stringify({
          proctoring: true,
          fullscreen: true,
          tabSwitchLimit: 3,
        }),
        questions: {
          create: [
            {
              questionText: 'What is the time complexity of binary search?',
              type: 'MCQ',
              options: JSON.stringify(['O(n)', 'O(log n)', 'O(n log n)', 'O(1)']),
              correctAnswer: 'O(log n)',
              points: 2,
              order: 1,
              difficulty: 'EASY',
              topic: 'DSA',
            },
            {
              questionText: 'Which HTTP method is idempotent?',
              type: 'MCQ',
              options: JSON.stringify(['POST', 'PATCH', 'GET', 'CONNECT']),
              correctAnswer: 'GET',
              points: 2,
              order: 2,
              difficulty: 'EASY',
              topic: 'Web',
            },
            {
              questionText: 'Two Sum',
              description: 'Return indices of two numbers that add up to target.',
              type: 'CODING',
              points: 10,
              order: 3,
              difficulty: 'EASY',
              language: 'javascript',
              starterCode:
                'function twoSum(nums, target) {\n  // write your solution\n}\n',
              examples: JSON.stringify([
                { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: '2+7=9' },
              ]),
              testCases: JSON.stringify([
                { input: '2 7 11 15\n9', expectedOutput: '0 1', hidden: false },
                { input: '3 2 4\n6', expectedOutput: '1 2', hidden: true },
              ]),
              topic: 'Arrays',
            },
          ],
        },
      },
      include: { questions: true },
    });
  }

  const existingAssignment = await prisma.assessmentAssignment.findFirst({
    where: { assessmentId: assessment.id, studentId: student.id },
  });
  if (!existingAssignment) {
    await prisma.assessmentAssignment.create({
      data: {
        assessmentId: assessment.id,
        studentId: student.id,
        schoolId: school?.id,
        batchId: batch?.id,
        scheduledAt: new Date(),
      },
    });
  }

  // Link first job to assessment
  await prisma.job.update({
    where: { id: jobs[0].id },
    data: {
      linkedAssessmentId: assessment.id,
      requiresTest: true,
      assessmentPassPercent: 60,
    },
  });

  // Interview pipeline for first job
  const interviewJob = jobs[0];
  const interview = await prisma.interview.upsert({
    where: { jobId: interviewJob.id },
    update: {
      status: 'ONGOING',
      currentRound: 'Technical',
      rounds: JSON.stringify(['Online Assessment', 'Technical', 'HR']),
      totalCandidates: 1,
      pendingCandidates: 1,
      createdBy: adminUser.id,
    },
    create: {
      jobId: interviewJob.id,
      companyId: interviewJob.companyId,
      status: 'ONGOING',
      currentRound: 'Technical',
      rounds: JSON.stringify(['Online Assessment', 'Technical', 'HR']),
      totalCandidates: 1,
      pendingCandidates: 1,
      createdBy: adminUser.id,
    },
  });

  await prisma.interviewEvaluation.upsert({
    where: {
      interviewId_studentId_roundName: {
        interviewId: interview.id,
        studentId: student.id,
        roundName: 'Online Assessment',
      },
    },
    update: {
      marks: 78,
      remarks: 'Cleared OA with good DSA score.',
      status: 'SELECTED',
      evaluatedBy: adminUser.id,
    },
    create: {
      interviewId: interview.id,
      studentId: student.id,
      roundName: 'Online Assessment',
      marks: 78,
      remarks: 'Cleared OA with good DSA score.',
      status: 'SELECTED',
      evaluatedBy: adminUser.id,
    },
  });

  // Live mock interview drive + scheduled slot for student
  const driveStart = daysFromNow(3);
  driveStart.setHours(10, 0, 0, 0);
  const driveEnd = new Date(driveStart);
  driveEnd.setHours(13, 0, 0, 0);

  let drive = await prisma.mockInterviewDrive.findFirst({
    where: { title: 'Technical Mock Drive — Local Seed' },
  });

  if (!drive) {
    drive = await prisma.mockInterviewDrive.create({
      data: {
        title: 'Technical Mock Drive — Local Seed',
        category: 'TECHNICAL',
        enableCodeConsole: true,
        description: 'Practice technical round with optional code console.',
        instructions: 'Join 5 minutes early. Keep camera on.',
        date: driveStart,
        startTime: driveStart,
        endTime: driveEnd,
        slotDuration: 30,
        breakDuration: 5,
        targetBatches: JSON.stringify([ACADEMIC.batch.year]),
        targetBranches: JSON.stringify(['CSE']),
        targetStudentIds: JSON.stringify([student.id]),
        status: 'PUBLISHED',
        codingQuestions: JSON.stringify([
          {
            id: 'q1',
            title: 'Reverse Linked List',
            description: 'Reverse a singly linked list.',
            starterCode: 'function reverseList(head) {\n  \n}\n',
            language: 'javascript',
          },
        ]),
      },
    });
  }

  const slotStart = new Date(driveStart);
  slotStart.setMinutes(slotStart.getMinutes() + 30);
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 30);

  const existingSlot = await prisma.mockInterviewSlot.findFirst({
    where: { driveId: drive.id, studentId: student.id },
  });

  if (!existingSlot) {
    await prisma.mockInterviewSlot.create({
      data: {
        driveId: drive.id,
        studentId: student.id,
        interviewerId: adminUser.id,
        startTime: slotStart,
        endTime: slotEnd,
        status: 'SCHEDULED',
        meetingRoomId: `seed-room-${student.id.slice(0, 8)}`,
        joinLink: `https://meet.jit.si/portal-seed-${student.id.slice(0, 8)}`,
        liveCodeLanguage: 'javascript',
      },
    });
  }

  console.log('✅ Admin data seeded');
  console.log(`   Companies : ${companies.length}`);
  console.log(`   Jobs      : ${jobs.length}`);
  console.log(`   Assessment: ${assessment.title}`);
  console.log(`   Interview : job "${interviewJob.jobTitle}"`);
  console.log(`   Mock drive: ${drive.title}`);

  return { companies, jobs, assessment, interview, drive };
}

const runningDirect = process.argv[1]?.includes('seed-admin-data.js');
if (runningDirect) {
  seedAdminData()
    .catch((e) => {
      console.error('❌ seed-admin-data failed:', e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
