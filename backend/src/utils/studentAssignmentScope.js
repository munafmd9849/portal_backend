import prisma from '../config/database.js';

// Prisma "mode: insensitive" is PostgreSQL-only — omit on SQLite.
const isSqliteDb = () => (process.env.DATABASE_URL || '').toLowerCase().startsWith('file:');
const eqCI = (value) => (isSqliteDb() ? { equals: value } : { equals: value, mode: 'insensitive' });
const containsCI = (value) => (isSqliteDb() ? { contains: value } : { contains: value, mode: 'insensitive' });
const inCI = (values) => (isSqliteDb() ? { in: values } : { in: values, mode: 'insensitive' });

/**
 * Resolve batch/school IDs for a student so batch- and school-level
 * AssessmentAssignment rows match even when only string fields are set.
 */
export async function resolveStudentAssignmentScope(student) {
  const batchIds = new Set();
  const schoolIds = new Set();

  if (student.batchId) batchIds.add(student.batchId);
  if (student.schoolId) schoolIds.add(student.schoolId);

  const batchLabel = (student.batch || '').trim();
  if (batchLabel) {
    const batches = await prisma.batch.findMany({
      where: {
        OR: [
          { year: eqCI(batchLabel) },
          { label: eqCI(batchLabel) },
        ],
      },
      select: { id: true },
    });
    batches.forEach((b) => batchIds.add(b.id));
  }

  const schoolLabel = (student.school || '').trim();
  if (schoolLabel) {
    const schools = await prisma.school.findMany({
      where: {
        OR: [
          { name: eqCI(schoolLabel) },
          { code: eqCI(schoolLabel) },
          { name: containsCI(schoolLabel) },
        ],
      },
      select: { id: true },
    });
    schools.forEach((s) => schoolIds.add(s.id));
  }

  const assignmentMatch = [{ studentId: student.id }];
  if (batchIds.size) {
    assignmentMatch.push({ batchId: { in: [...batchIds] } });
  }
  if (schoolIds.size) {
    assignmentMatch.push({ schoolId: { in: [...schoolIds] } });
  }

  return { assignmentMatch, batchIds: [...batchIds], schoolIds: [...schoolIds] };
}

/**
 * Students targeted by batch IDs (UUID and/or batch year/label strings).
 */
export async function findStudentsForBatchIds(targetBatchIds = []) {
  if (!targetBatchIds.length) return [];

  const batches = await prisma.batch.findMany({
    where: { id: { in: targetBatchIds } },
    select: { id: true, year: true, label: true },
  });

  const batchLabels = [
    ...new Set(
      batches.flatMap((b) => [b.year, b.label].filter(Boolean))
    ),
  ];

  return prisma.student.findMany({
    where: {
      OR: [
        { batchId: { in: targetBatchIds } },
        ...(batchLabels.length ? [{ batch: inCI(batchLabels) }] : []),
      ],
    },
    include: { user: { select: { email: true } } },
  });
}
