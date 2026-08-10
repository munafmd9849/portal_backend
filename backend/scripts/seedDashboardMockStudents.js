/**
 * Seed dashboard mock students for SOT & SOM + normalize legacy center/school values.
 *
 * Usage: node scripts/seedDashboardMockStudents.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  canonicalBatchStorage,
  canonicalCenterStorage,
  canonicalSchoolStorage,
} from '../src/utils/academicFilter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env'), override: true });

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_STUDENT_PASSWORD || 'Student@123';

const SCHOOLS = [
  { name: 'School of Technology', code: 'SOT' },
  { name: 'School of Management', code: 'SOM' },
];

const CENTERS = [
  { name: 'Bangalore' },
  { name: 'Noida' },
  { name: 'Lucknow' },
];

const BATCHES = [
  { year: '2023-2027', label: '23-27' },
  { year: '2024-2028', label: '24-28' },
  { year: '2025-2029', label: '25-29' },
];

const MOCK_STUDENTS = [
  {
    email: 'sarthak.chauhan@pw.live',
    fullName: 'Sarthak Chauhan',
    school: 'SOM',
    center: 'Bangalore',
    batch: '24-28',
    enrollmentId: 'PW-SOM-24001',
    cgpa: 8.4,
  },
  {
    email: 'priya.sharma@pw.live',
    fullName: 'Priya Sharma',
    school: 'SOT',
    center: 'Bangalore',
    batch: '23-27',
    enrollmentId: 'PW-SOT-23001',
    cgpa: 8.1,
  },
  {
    email: 'rohan.verma@pw.live',
    fullName: 'Rohan Verma',
    school: 'SOT',
    center: 'Noida',
    batch: '24-28',
    enrollmentId: 'PW-SOT-24002',
    cgpa: 7.8,
  },
  {
    email: 'ananya.singh@pw.live',
    fullName: 'Ananya Singh',
    school: 'SOT',
    center: 'Lucknow',
    batch: '25-29',
    enrollmentId: 'PW-SOT-25001',
    cgpa: 8.6,
  },
  {
    email: 'karan.mehta@pw.live',
    fullName: 'Karan Mehta',
    school: 'SOM',
    center: 'Noida',
    batch: '23-27',
    enrollmentId: 'PW-SOM-23002',
    cgpa: 7.9,
  },
  {
    email: 'isha.patel@pw.live',
    fullName: 'Isha Patel',
    school: 'SOM',
    center: 'Bangalore',
    batch: '25-29',
    enrollmentId: 'PW-SOM-25002',
    cgpa: 8.2,
  },
  {
    email: 'vikram.reddy@pw.live',
    fullName: 'Vikram Reddy',
    school: 'SOM',
    center: 'Lucknow',
    batch: '24-28',
    enrollmentId: 'PW-SOM-24003',
    cgpa: 7.6,
  },
];

async function ensureAcademicStructure() {
  const schoolMap = {};
  for (const s of SCHOOLS) {
    const record = await prisma.school.upsert({
      where: { name: s.name },
      update: { code: s.code, status: 'ACTIVE' },
      create: { name: s.name, code: s.code, status: 'ACTIVE' },
    });
    schoolMap[s.code] = record.id;
  }

  const centerMap = {};
  for (const c of CENTERS) {
    const record = await prisma.center.upsert({
      where: { name: c.name },
      update: { location: c.name, status: 'ACTIVE' },
      create: { name: c.name, location: c.name, status: 'ACTIVE' },
    });
    centerMap[c.name] = record.id;
  }

  const batchMap = {};
  for (const b of BATCHES) {
    const record = await prisma.batch.upsert({
      where: { year: b.year },
      update: { label: b.label, status: 'ACTIVE' },
      create: { year: b.year, label: b.label, status: 'ACTIVE' },
    });
    batchMap[b.label] = record.id;
  }

  return { schoolMap, centerMap, batchMap };
}

async function normalizeExistingStudents() {
  const students = await prisma.student.findMany({
    select: { id: true, school: true, center: true, batch: true },
  });

  let updated = 0;
  for (const student of students) {
    const school = canonicalSchoolStorage(student.school);
    const center = canonicalCenterStorage(student.center);
    const batch = canonicalBatchStorage(student.batch);
    if (school !== student.school || center !== student.center || batch !== student.batch) {
      await prisma.student.update({
        where: { id: student.id },
        data: { school, center, batch },
      });
      updated += 1;
    }
  }
  return updated;
}

async function upsertMockStudent(student, maps, passwordHash) {
  const school = canonicalSchoolStorage(student.school);
  const center = canonicalCenterStorage(student.center);
  const batch = canonicalBatchStorage(student.batch);

  const existing = await prisma.user.findUnique({
    where: { email: student.email },
    include: { student: true },
  });

  const studentData = {
    fullName: student.fullName,
    email: student.email,
    phone: `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
    enrollmentId: student.enrollmentId,
    school,
    center,
    batch,
    schoolId: maps.schoolMap[school] || null,
    centerId: maps.centerMap[center] || null,
    batchId: maps.batchMap[batch] || null,
    profileCompleted: true,
    cgpa: student.cgpa,
    backlogs: '0',
    city: center,
  };

  if (existing?.student) {
    await prisma.student.update({
      where: { id: existing.student.id },
      data: studentData,
    });
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        displayName: student.fullName,
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    return 'updated';
  }

  if (existing && !existing.student) {
    await prisma.student.create({
      data: { ...studentData, userId: existing.id },
    });
    return 'linked';
  }

  await prisma.user.create({
    data: {
      email: student.email,
      passwordHash,
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      displayName: student.fullName,
      student: { create: studentData },
    },
  });
  return 'created';
}

async function main() {
  console.log('🌱 Seeding dashboard mock students (SOT & SOM)...');

  const maps = await ensureAcademicStructure();
  const normalized = await normalizeExistingStudents();
  console.log(`  ↪ Normalized ${normalized} existing student academic fields`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;
  let updated = 0;

  for (const student of MOCK_STUDENTS) {
    const result = await upsertMockStudent(student, maps, passwordHash);
    if (result === 'created' || result === 'linked') {
      created += 1;
      console.log(`  ✅ ${student.fullName} (${student.email}) — ${student.school} / ${student.center} / ${student.batch}`);
    } else {
      updated += 1;
      console.log(`  ♻️  ${student.fullName} (${student.email}) — updated`);
    }
  }

  console.log(`\n🎉 Done. Created/linked ${created}, updated ${updated}.`);
  console.log(`   Default password: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
