/**
 * Run all local seed scripts in order.
 *
 *   cd backend && npm run db:seed-local
 *   # or: node data/seed-all.js
 */
import { prisma, assertSqliteFriendly } from './prisma.js';
import { seedUsers } from './seed-users.js';
import { seedStudentProfile } from './seed-student-profile.js';
import { seedAdminData } from './seed-admin-data.js';
import { CREDENTIALS } from './credentials.js';

async function main() {
  console.log('\n🌱 Seeding local portal database...\n');
  assertSqliteFriendly();

  await seedUsers();
  await seedStudentProfile();
  await seedAdminData();

  console.log('\n✅ All seeds complete.\n');
  console.log('Login credentials:');
  console.log(`  Student     : ${CREDENTIALS.student.email} / ${CREDENTIALS.student.password}`);
  console.log(`  Admin       : ${CREDENTIALS.admin.email} / ${CREDENTIALS.admin.password}`);
  console.log(`  Super Admin : ${CREDENTIALS.superAdmin.email} / ${CREDENTIALS.superAdmin.password}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ seed-all failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
