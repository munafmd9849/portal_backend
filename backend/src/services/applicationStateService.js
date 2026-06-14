/**
 * Centralized application writes — keeps pipeline + tracker in sync.
 */

import prisma from '../config/database.js';
import { syncApplicationPipeline } from './jobOpportunitiesPipeline.js';
import { notifyStudentApplicationUpdate } from '../controllers/applications.js';
import { assertTransitionAllowed } from './applicationTransitionService.js';

export async function isJobResultsLocked(jobId) {
  if (!jobId) return false;
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { resultsLocked: true, resultsDeclaredAt: true },
  });
  return Boolean(job?.resultsLocked || job?.resultsDeclaredAt);
}

export async function assertApplicationEditable(applicationId) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { jobId: true },
  });
  if (!app) return;
  if (await isJobResultsLocked(app.jobId)) {
    throw new Error('Results have been declared for this drive. Application edits are locked.');
  }
}

/**
 * Promote legacy no-gate applications stuck at APPLIED → INTERVIEW_ELIGIBLE.
 */
export async function backfillNoGateInterviewEligibility(jobId) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, requiresScreening: true, requiresTest: true, applicationDeadline: true },
  });
  if (!job || job.requiresScreening || job.requiresTest) return 0;

  const deadlinePassed = job.applicationDeadline && new Date(job.applicationDeadline) <= new Date();
  if (!deadlinePassed) return 0;

  const result = await prisma.application.updateMany({
    where: {
      jobId,
      screeningStatus: { in: ['APPLIED', null] },
      status: { notIn: ['WITHDRAWN', 'REVOKED_BY_ADMIN', 'REJECTED'] },
    },
    data: { screeningStatus: 'INTERVIEW_ELIGIBLE' },
  });

  if (result.count > 0) {
    const apps = await prisma.application.findMany({
      where: { jobId, screeningStatus: 'INTERVIEW_ELIGIBLE' },
      select: { id: true },
    });
    for (const app of apps) {
      await syncApplicationPipeline(app.id);
    }
  }

  return result.count;
}

export async function patchApplication(applicationId, data, options = {}) {
  if (!options.skipLockCheck) {
    await assertApplicationEditable(applicationId);
  }

  const current = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!current) throw new Error('Application not found');

  if (!options.skipTransitionCheck) {
    await assertTransitionAllowed(current, data);
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data,
    include: options.include || undefined,
  });

  await syncApplicationPipeline(applicationId);
  if (options.notify !== false) {
    await notifyStudentApplicationUpdate(applicationId);
  }

  return updated;
}
