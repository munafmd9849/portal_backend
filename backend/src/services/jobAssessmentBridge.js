/**
 * Links job QA (requiresTest) to the Assessment Engine.
 */

import prisma from '../config/database.js';
import { syncApplicationPipeline } from './jobOpportunitiesPipeline.js';
import { notifyStudentApplicationUpdate } from '../controllers/applications.js';
import { createNotification } from '../controllers/notifications.js';

export async function ensureAssessmentAssignmentForJob(studentId, job) {
  if (!job?.requiresTest || !job?.linkedAssessmentId) return;

  const existing = await prisma.assessmentAssignment.findFirst({
    where: { assessmentId: job.linkedAssessmentId, studentId },
  });
  if (existing) return;

  await prisma.assessmentAssignment.create({
    data: {
      assessmentId: job.linkedAssessmentId,
      studentId,
    },
  });
}

export async function syncJobApplicationsFromAssessment(studentId, assessmentId, scorePercent) {
  if (!studentId || !assessmentId) return { updated: 0 };

  const jobs = await prisma.job.findMany({
    where: {
      linkedAssessmentId: assessmentId,
      requiresTest: true,
    },
    select: {
      id: true,
      jobTitle: true,
      requiresScreening: true,
      assessmentPassPercent: true,
    },
  });

  let updated = 0;
  for (const job of jobs) {
    const application = await prisma.application.findUnique({
      where: { studentId_jobId: { studentId, jobId: job.id } },
      include: { student: { include: { user: { select: { id: true } } } } },
    });
    if (!application) continue;
    if (['WITHDRAWN', 'REVOKED_BY_ADMIN'].includes(String(application.status || '').toUpperCase())) continue;

    const screening = String(application.screeningStatus || 'APPLIED').toUpperCase();
    if (['TEST_SELECTED', 'INTERVIEW_ELIGIBLE', 'TEST_REJECTED'].includes(screening)) continue;

    const passThreshold = job.assessmentPassPercent ?? 60;
    const passed = Number(scorePercent) >= Number(passThreshold);
    const newScreening = passed
      ? (job.requiresScreening ? 'TEST_SELECTED' : 'INTERVIEW_ELIGIBLE')
      : 'TEST_REJECTED';

    await prisma.application.update({
      where: { id: application.id },
      data: {
        screeningStatus: newScreening,
        screeningRemarks: passed
          ? null
          : `Assessment score ${Number(scorePercent).toFixed(1)}% below required ${passThreshold}%`,
        screeningCompletedAt: passed && !job.requiresScreening ? new Date() : application.screeningCompletedAt,
      },
    });

    await syncApplicationPipeline(application.id);
    await notifyStudentApplicationUpdate(application.id);

    if (application.student?.user?.id) {
      await createNotification({
        userId: application.student.user.id,
        title: passed ? 'Assessment passed' : 'Assessment not cleared',
        body: passed
          ? `You cleared the assessment for ${job.jobTitle}.`
          : `You did not meet the cutoff for ${job.jobTitle}.`,
        data: {
          type: 'assessment_result',
          jobId: job.id,
          applicationId: application.id,
          score: scorePercent,
          passed,
        },
      });
    }

    updated += 1;
  }

  return { updated };
}
