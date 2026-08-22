/**
 * Seed login users: student, admin, super admin.
 * Usage: node data/seed-users.js
 */
import bcrypt from 'bcryptjs';
import { prisma, assertSqliteFriendly } from './prisma.js';
import { CREDENTIALS, ACADEMIC } from './credentials.js';

async function upsertUser({ email, password, role, status = 'ACTIVE', displayName }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      status,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      displayName: displayName || null,
    },
    create: {
      email,
      passwordHash,
      role,
      status,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      displayName: displayName || null,
    },
  });
}

export async function seedUsers() {
  assertSqliteFriendly();

  let school = await prisma.school.findFirst({
    where: {
      OR: [{ name: ACADEMIC.school.name }, { code: ACADEMIC.school.code }],
    },
  });
  if (school) {
    school = await prisma.school.update({
      where: { id: school.id },
      data: {
        name: ACADEMIC.school.name,
        code: ACADEMIC.school.code,
        status: 'ACTIVE',
      },
    });
  } else {
    school = await prisma.school.create({
      data: {
        name: ACADEMIC.school.name,
        code: ACADEMIC.school.code,
        status: 'ACTIVE',
      },
    });
  }

  const center = await prisma.center.upsert({
    where: { name: ACADEMIC.center.name },
    update: { location: ACADEMIC.center.location, status: 'ACTIVE' },
    create: {
      name: ACADEMIC.center.name,
      location: ACADEMIC.center.location,
      status: 'ACTIVE',
    },
  });

  const batch = await prisma.batch.upsert({
    where: { year: ACADEMIC.batch.year },
    update: { label: ACADEMIC.batch.label, status: 'ACTIVE' },
    create: {
      year: ACADEMIC.batch.year,
      label: ACADEMIC.batch.label,
      status: 'ACTIVE',
    },
  });

  const superAdminUser = await upsertUser({
    email: CREDENTIALS.superAdmin.email,
    password: CREDENTIALS.superAdmin.password,
    role: 'SUPER_ADMIN',
    displayName: CREDENTIALS.superAdmin.displayName,
  });

  await prisma.admin.upsert({
    where: { userId: superAdminUser.id },
    update: {
      name: CREDENTIALS.superAdmin.name,
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify(['*']),
      allowedCenters: JSON.stringify(['*']),
      allowedBatches: JSON.stringify(['*']),
      allowedSchoolIds: JSON.stringify(['*']),
      allowedCenterIds: JSON.stringify(['*']),
      allowedBatchIds: JSON.stringify(['*']),
    },
    create: {
      userId: superAdminUser.id,
      name: CREDENTIALS.superAdmin.name,
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

  const adminUser = await upsertUser({
    email: CREDENTIALS.admin.email,
    password: CREDENTIALS.admin.password,
    role: 'ADMIN',
    displayName: CREDENTIALS.admin.displayName,
  });

  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {
      name: CREDENTIALS.admin.name,
      role: 'ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify(['*']),
      allowedCenters: JSON.stringify(['*']),
      allowedBatches: JSON.stringify(['*']),
      allowedSchoolIds: JSON.stringify(['*']),
      allowedCenterIds: JSON.stringify(['*']),
      allowedBatchIds: JSON.stringify(['*']),
    },
    create: {
      userId: adminUser.id,
      name: CREDENTIALS.admin.name,
      role: 'ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify(['*']),
      allowedCenters: JSON.stringify(['*']),
      allowedBatches: JSON.stringify(['*']),
      allowedSchoolIds: JSON.stringify(['*']),
      allowedCenterIds: JSON.stringify(['*']),
      allowedBatchIds: JSON.stringify(['*']),
    },
  });

  const studentUser = await upsertUser({
    email: CREDENTIALS.student.email,
    password: CREDENTIALS.student.password,
    role: 'STUDENT',
    displayName: CREDENTIALS.student.displayName,
  });

  const student = await prisma.student.upsert({
    where: { email: CREDENTIALS.student.email },
    update: {
      userId: studentUser.id,
      fullName: CREDENTIALS.student.fullName,
      phone: '9876543210',
      enrollmentId: 'ENR-CHARAN-001',
      school: ACADEMIC.school.code,
      center: ACADEMIC.center.name,
      batch: ACADEMIC.batch.year,
      schoolId: school.id,
      centerId: center.id,
      batchId: batch.id,
      branch: 'CSE',
      cgpa: 8.6,
      backlogs: '0',
      profileCompleted: true,
      headline: 'Full-stack developer | DSA | Placement ready',
      bio: 'Passionate about building products and solving algorithmic problems.',
      summary: 'B.Tech CSE student with strong React/Node skills and active DSA practice.',
      city: 'Bangalore',
      stateRegion: 'Karnataka',
      linkedin: 'https://linkedin.com/in/charansai',
      githubUrl: 'https://github.com/charansai0108',
      leetcode: 'https://leetcode.com/charansai',
      gender: 'Male',
    },
    create: {
      userId: studentUser.id,
      fullName: CREDENTIALS.student.fullName,
      email: CREDENTIALS.student.email,
      phone: '9876543210',
      enrollmentId: 'ENR-CHARAN-001',
      school: ACADEMIC.school.code,
      center: ACADEMIC.center.name,
      batch: ACADEMIC.batch.year,
      schoolId: school.id,
      centerId: center.id,
      batchId: batch.id,
      branch: 'CSE',
      cgpa: 8.6,
      backlogs: '0',
      profileCompleted: true,
      headline: 'Full-stack developer | DSA | Placement ready',
      bio: 'Passionate about building products and solving algorithmic problems.',
      summary: 'B.Tech CSE student with strong React/Node skills and active DSA practice.',
      city: 'Bangalore',
      stateRegion: 'Karnataka',
      linkedin: 'https://linkedin.com/in/charansai',
      githubUrl: 'https://github.com/charansai0108',
      leetcode: 'https://leetcode.com/charansai',
      gender: 'Male',
    },
  });

  console.log('✅ Users seeded');
  console.log(`   SUPER_ADMIN: ${CREDENTIALS.superAdmin.email}`);
  console.log(`   ADMIN      : ${CREDENTIALS.admin.email}`);
  console.log(`   STUDENT    : ${CREDENTIALS.student.email}`);

  return { school, center, batch, superAdminUser, adminUser, studentUser, student };
}

const runningDirect = process.argv[1]?.includes('seed-users.js');
if (runningDirect) {
  seedUsers()
    .catch((e) => {
      console.error('❌ seed-users failed:', e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
