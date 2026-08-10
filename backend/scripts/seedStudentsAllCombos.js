/**
 * Seed one student per batch × school × center combination.
 * Ensures academic structure tables exist, then creates users + student profiles.
 *
 * Usage: node scripts/seedStudentsAllCombos.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env'), override: true });

const prisma = new PrismaClient();

const SCHOOLS = [
  { name: 'School of Technology', code: 'SOT', storage: 'SOT' },
  { name: 'School of Management', code: 'SOM', storage: 'SOM' },
  { name: 'School of Healthcare', code: 'SOH', storage: 'SOH' },
];

const CENTERS = [
  { name: 'Bangalore', storage: 'BANGALORE' },
  { name: 'Noida', storage: 'NOIDA' },
  { name: 'Lucknow', storage: 'LUCKNOW' },
];

const BATCHES = [
  { year: '2023-2027', label: '23-27', storage: '23-27' },
  { year: '2024-2028', label: '24-28', storage: '24-28' },
  { year: '2025-2029', label: '25-29', storage: '25-29' },
];

const DEFAULT_PASSWORD = process.env.SEED_STUDENT_PASSWORD || 'Student@123';
const EMAIL_DOMAIN = process.env.SEED_STUDENT_EMAIL_DOMAIN || 'pwioi.test';

const FIRST_NAMES = ['Aarav', 'Isha', 'Rohan', 'Priya', 'Karan', 'Ananya', 'Vikram', 'Neha', 'Arjun', 'Sneha'];
const LAST_NAMES = ['Sharma', 'Patel', 'Reddy', 'Gupta', 'Singh', 'Iyer', 'Nair', 'Khan', 'Das', 'Mehta'];

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

async function ensureAcademicStructure() {
  const schoolMap = {};
  for (const s of SCHOOLS) {
    const record = await prisma.school.upsert({
      where: { name: s.name },
      update: { code: s.code, status: 'ACTIVE' },
      create: { name: s.name, code: s.code, status: 'ACTIVE' },
    });
    schoolMap[s.storage] = record.id;
  }

  const centerMap = {};
  for (const c of CENTERS) {
    const record = await prisma.center.upsert({
      where: { name: c.name },
      update: { location: c.name, status: 'ACTIVE' },
      create: { name: c.name, location: c.name, status: 'ACTIVE' },
    });
    centerMap[c.storage] = record.id;
  }

  const batchMap = {};
  for (const b of BATCHES) {
    const record = await prisma.batch.upsert({
      where: { year: b.year },
      update: { label: b.label, status: 'ACTIVE' },
      create: { year: b.year, label: b.label, status: 'ACTIVE' },
    });
    batchMap[b.storage] = record.id;
  }

  return { schoolMap, centerMap, batchMap };
}

async function main() {
  console.log('🌱 Seeding students across all batch × school × center combinations...');

  const { schoolMap, centerMap, batchMap } = await ensureAcademicStructure();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0;
  let skipped = 0;
  let index = 0;

  for (const school of SCHOOLS) {
    for (const center of CENTERS) {
      for (const batch of BATCHES) {
        index += 1;
        const first = FIRST_NAMES[index % FIRST_NAMES.length];
        const last = LAST_NAMES[(index * 3) % LAST_NAMES.length];
        const fullName = `${first} ${last}`;
        const email = `${slug(school.storage)}.${slug(center.storage)}.${slug(batch.storage)}.${String(index).padStart(2, '0')}@${EMAIL_DOMAIN}`;
        const enrollmentId = `SEED-${school.storage}-${center.storage}-${batch.storage.replace('-', '')}-${String(index).padStart(2, '0')}`;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          skipped += 1;
          continue;
        }

        await prisma.user.create({
          data: {
            email,
            passwordHash,
            role: 'STUDENT',
            status: 'ACTIVE',
            emailVerified: true,
            emailVerifiedAt: new Date(),
            displayName: fullName,
            student: {
              create: {
                fullName,
                email,
                phone: `9${String(100000000 + index).slice(-9)}`,
                enrollmentId,
                school: school.storage,
                center: center.name,
                batch: batch.storage,
                schoolId: schoolMap[school.storage],
                centerId: centerMap[center.storage],
                batchId: batchMap[batch.storage],
                profileCompleted: true,
                cgpa: 7.5 + (index % 20) / 10,
                backlogs: '0',
                city: center.name,
              },
            },
          },
        });

        created += 1;
        console.log(`  ✅ ${fullName} — ${school.storage} / ${center.storage} / ${batch.storage}`);
      }
    }
  }

  console.log(`\n🎉 Done. Created ${created} students, skipped ${skipped} existing.`);
  console.log(`   Default password: ${DEFAULT_PASSWORD}`);
  console.log(`   Email pattern: *@${EMAIL_DOMAIN}`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
