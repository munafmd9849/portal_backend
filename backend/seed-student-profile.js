/**
 * Seed student profile: education, skills, projects, achievements, certs, experience, endorsements.
 * Usage: node data/seed-student-profile.js
 */
import { prisma, assertSqliteFriendly } from './prisma.js';
import { CREDENTIALS } from './credentials.js';

export async function seedStudentProfile() {
  assertSqliteFriendly();

  const user = await prisma.user.findUnique({
    where: { email: CREDENTIALS.student.email },
    include: { student: true },
  });

  if (!user?.student) {
    throw new Error(`Student not found for ${CREDENTIALS.student.email}. Run seed-users first.`);
  }

  const studentId = user.student.id;
  const { school, center, batch } = user.student;
  const batchStart = batch ? parseInt(String(batch).split('-')[0], 10) : 2024;
  const batchEnd = batch ? parseInt(String(batch).split('-')[1], 10) : 2028;

  await prisma.education.deleteMany({ where: { studentId } });
  await prisma.skill.deleteMany({ where: { studentId } });
  await prisma.project.deleteMany({ where: { studentId } });
  await prisma.achievement.deleteMany({ where: { studentId } });
  await prisma.certification.deleteMany({ where: { studentId } });
  await prisma.experience.deleteMany({ where: { studentId } });
  await prisma.codingProfile.deleteMany({ where: { studentId } });
  await prisma.endorsement.deleteMany({ where: { studentId } });

  await prisma.education.createMany({
    data: [
      {
        studentId,
        institution: school ? `${school} — ${center || 'Campus'}` : 'School of Technology',
        degree: 'B.Tech Computer Science',
        startYear: batchStart,
        endYear: batchEnd,
        cgpa: 8.6,
        description: 'DSA, DBMS, OS, networks, and full-stack development. Active in placements.',
      },
      {
        studentId,
        institution: 'Narayana Junior College',
        degree: 'Intermediate (MPC)',
        startYear: batchStart - 2,
        endYear: batchStart,
        cgpa: 9.2,
        description: 'Science stream with focus on mathematics and physics.',
      },
    ],
  });

  await prisma.skill.createMany({
    data: [
      { studentId, skillName: 'JavaScript', rating: 5 },
      { studentId, skillName: 'TypeScript', rating: 4 },
      { studentId, skillName: 'React', rating: 5 },
      { studentId, skillName: 'Node.js', rating: 4 },
      { studentId, skillName: 'Python', rating: 4 },
      { studentId, skillName: 'SQL', rating: 4 },
      { studentId, skillName: 'Data Structures', rating: 5 },
      { studentId, skillName: 'System Design', rating: 3 },
      { studentId, skillName: 'Docker', rating: 3 },
    ],
  });

  await prisma.project.createMany({
    data: [
      {
        studentId,
        title: 'Placement Portal',
        description:
          'Campus placement platform with jobs, assessments, mock interviews, and student tracking.',
        liveUrl: 'https://github.com/charansai0108/PORTAL',
        githubUrl: 'https://github.com/charansai0108/PORTAL',
        technologies: JSON.stringify(['React', 'Node.js', 'SQLite', 'Prisma', 'Tailwind']),
      },
      {
        studentId,
        title: 'Coding Assessment Engine',
        description: 'Multi-language coding workspace with Judge0 evaluation and test cases.',
        githubUrl: 'https://github.com/charansai0108/PORTAL',
        technologies: JSON.stringify(['JavaScript', 'Judge0', 'Monaco Editor', 'Express']),
      },
      {
        studentId,
        title: 'AI Mock Interview Module',
        description: 'One-way video mock interviews with proctoring and admin review.',
        technologies: JSON.stringify(['React', 'WebRTC', 'Gemini']),
      },
    ],
  });

  await prisma.achievement.createMany({
    data: [
      {
        studentId,
        title: 'Winner — Internal Hackathon 2025',
        date: new Date('2025-02-14'),
        description: 'Built an AI-assisted placement readiness dashboard.',
        hasCertificate: true,
        certificateUrl: 'https://example.com/certs/hackathon-2025',
      },
      {
        studentId,
        title: '500+ LeetCode Problems Solved',
        date: new Date('2025-11-01'),
        description: 'Strong focus on arrays, graphs, and dynamic programming.',
        hasCertificate: false,
      },
      {
        studentId,
        title: 'Smart India Hackathon — College Finalist',
        date: new Date('2024-09-20'),
        description: 'Student employability analytics team project.',
        hasCertificate: false,
      },
    ],
  });

  await prisma.certification.createMany({
    data: [
      {
        studentId,
        title: 'AWS Cloud Practitioner',
        issuer: 'Amazon Web Services',
        issuedDate: new Date('2025-06-01'),
        certificateUrl: 'https://aws.amazon.com/verification/example',
        description: 'Cloud fundamentals, security, and core AWS services.',
      },
      {
        studentId,
        title: 'Meta Front-End Developer',
        issuer: 'Coursera / Meta',
        issuedDate: new Date('2024-12-10'),
        certificateUrl: 'https://coursera.org/verify/example',
        description: 'HTML, CSS, JavaScript, React, responsive design.',
      },
      {
        studentId,
        title: 'SQL for Data Science',
        issuer: 'Coursera',
        issuedDate: new Date('2025-03-15'),
        description: 'Joins, aggregations, window functions, query optimization basics.',
      },
    ],
  });

  await prisma.experience.createMany({
    data: [
      {
        studentId,
        title: 'Software Engineering Intern',
        company: 'TechCorp India',
        start: '2025-05',
        end: '2025-07',
        description: 'Built internal dashboards in React/Node; improved API latency by ~20%.',
      },
      {
        studentId,
        title: 'Teaching Assistant — DSA',
        company: 'PW IOI',
        start: '2024-08',
        end: '2025-04',
        description: 'Mentored juniors on arrays, trees, and mock interview prep.',
      },
    ],
  });

  await prisma.codingProfile.createMany({
    data: [
      {
        studentId,
        platform: 'LeetCode',
        profileUrl: 'https://leetcode.com/charansai',
        username: 'charansai',
      },
      {
        studentId,
        platform: 'GitHub',
        profileUrl: 'https://github.com/charansai0108',
        username: 'charansai0108',
      },
      {
        studentId,
        platform: 'Codeforces',
        profileUrl: 'https://codeforces.com/profile/charansai',
        username: 'charansai',
      },
    ],
  });

  await prisma.endorsement.createMany({
    data: [
      {
        studentId,
        endorserName: 'Dr. Ramesh Kumar',
        endorserEmail: 'ramesh.kumar@pwioi.live',
        endorserRole: 'Placement Coordinator',
        organization: 'PW IOI',
        relationship: 'Faculty',
        context: 'Placement preparation mentor',
        message:
          'Charan demonstrates strong full-stack skills and ownership. Clean code and clear communication.',
        skills: JSON.stringify(['React', 'Node.js', 'Problem Solving']),
        skillRatings: JSON.stringify({ React: 5, 'Node.js': 4, 'Problem Solving': 5 }),
        overallRating: 5,
        consent: true,
        verified: true,
      },
      {
        studentId,
        endorserName: 'Priya Sharma',
        endorserEmail: 'priya.sharma@techcorp.com',
        endorserRole: 'Senior Software Engineer',
        organization: 'TechCorp',
        relationship: 'Industry Mentor',
        context: 'Internship project guide',
        message: 'Reliable developer with solid fundamentals. Recommended for product roles.',
        skills: JSON.stringify(['JavaScript', 'System Design', 'Teamwork']),
        skillRatings: JSON.stringify({ JavaScript: 5, 'System Design': 4, Teamwork: 5 }),
        overallRating: 4,
        consent: true,
        verified: true,
      },
    ],
  });

  console.log(`✅ Student profile seeded for ${CREDENTIALS.student.email}`);
  return { studentId };
}

const runningDirect = process.argv[1]?.includes('seed-student-profile.js');
if (runningDirect) {
  seedStudentProfile()
    .catch((e) => {
      console.error('❌ seed-student-profile failed:', e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
