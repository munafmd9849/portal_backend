/**
 * Run all portal seed scripts in order (users, academic structure, profile, jobs).
 *
 *   cd backend && node seed-all.js
 *   # Docker Compose runs this after prisma db push on every start.
 */
import { prisma, assertSqliteFriendly } from './prisma.js';
import { seedUsers } from './seed-users.js';
import { seedStudentProfile } from './seed-student-profile.js';
import { seedAdminData } from './seed-admin-data.js';
import { CREDENTIALS } from './credentials.js';

async function main() {
  console.log('\n🌱 Seeding portal database...\n');
  assertSqliteFriendly();

  console.log('1/3 Users, school, center, batch, branch...');
  await seedUsers();

  console.log('2/3 Student profile (education, skills, projects)...');
  await seedStudentProfile();

  console.log('3/3 Companies, jobs, applications, assessments...');
  await seedAdminData();

  console.log('\n✅ All seeds complete.\n');
  console.log('Login credentials:');
  console.log(`  Super Admin : ${CREDENTIALS.superAdmin.email} / ${CREDENTIALS.superAdmin.password}`);
  console.log(`  Admin       : ${CREDENTIALS.admin.email} / ${CREDENTIALS.admin.password}`);
  console.log(`  Student     : ${CREDENTIALS.student.email} / ${CREDENTIALS.student.password}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ seed-all failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
