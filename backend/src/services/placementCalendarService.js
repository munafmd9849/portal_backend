/**
 * Centralized placement drive calendar — aggregates deadlines, drives, sessions, results.
 */

import prisma from '../config/database.js';
import { computeDrivePhase, getDrivePhaseLabel } from './drivePhaseService.js';

function toEvent({ id, title, start, end, type, jobId, meta = {} }) {
  return {
    id,
    title,
    start: start instanceof Date ? start.toISOString() : start,
    end: end ? (end instanceof Date ? end.toISOString() : end) : null,
    type,
    jobId,
    ...meta,
  };
}

export async function getPlacementCalendarEvents(filters = {}) {
  const where = {
    status: { in: ['POSTED', 'IN_REVIEW'] },
  };

  if (filters.status) where.status = filters.status;

  const adminScope = filters.adminScope || {};
  if (adminScope.id === 'BLOCK_ALL') {
    return [];
  }
  if (filters.userRole === 'ADMIN' && (adminScope.school || adminScope.center || adminScope.batch)) {
    const scopeParts = [];
    if (adminScope.school?.in?.length) {
      scopeParts.push({ OR: adminScope.school.in.map((s) => ({ targetSchools: { contains: s } })) });
    }
    if (adminScope.center?.in?.length) {
      scopeParts.push({ OR: adminScope.center.in.map((c) => ({ targetCenters: { contains: c } })) });
    }
    if (adminScope.batch?.in?.length) {
      scopeParts.push({ OR: adminScope.batch.in.map((b) => ({ targetBatches: { contains: b } })) });
    }
    if (scopeParts.length) {
      where.OR = [
        { AND: scopeParts },
        ...(filters.userId ? [{ createdBy: filters.userId }] : []),
      ];
    }
  }

  const jobs = await prisma.job.findMany({
    where,
    select: {
      id: true,
      jobTitle: true,
      companyName: true,
      status: true,
      isPosted: true,
      applicationDeadline: true,
      driveDate: true,
      interviewMode: true,
      requiresScreening: true,
      requiresTest: true,
      resultsDeclaredAt: true,
      resultsLocked: true,
      screeningSession: { select: { finalizedAt: true } },
      interviewSession: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          resultsDeclaredAt: true,
          resultsLocked: true,
        },
      },
    },
    orderBy: { applicationDeadline: 'asc' },
    take: filters.limit || 200,
  });

  const events = [];

  for (const job of jobs) {
    const phase = computeDrivePhase(job, {
      session: job.interviewSession,
      screeningFinalized: Boolean(job.screeningSession?.finalizedAt),
    });
    const label = job.companyName || 'Drive';
    const titleBase = `${label} — ${job.jobTitle}`;

    if (job.applicationDeadline) {
      events.push(toEvent({
        id: `deadline-${job.id}`,
        title: `${titleBase} · Apply by`,
        start: job.applicationDeadline,
        type: 'APPLICATION_DEADLINE',
        jobId: job.id,
        meta: { phase, phaseLabel: getDrivePhaseLabel(phase) },
      }));
    }

    if (job.driveDate) {
      events.push(toEvent({
        id: `drive-${job.id}`,
        title: `${titleBase} · Interview drive`,
        start: job.driveDate,
        type: 'INTERVIEW_DRIVE',
        jobId: job.id,
        meta: { phase, phaseLabel: getDrivePhaseLabel(phase) },
      }));
    }

    const session = job.interviewSession;
    if (session?.startedAt) {
      events.push(toEvent({
        id: `session-start-${session.id}`,
        title: `${titleBase} · Session started`,
        start: session.startedAt,
        type: 'SESSION_START',
        jobId: job.id,
        meta: { sessionStatus: session.status },
      }));
    }

    if (session?.completedAt) {
      events.push(toEvent({
        id: `session-end-${session.id}`,
        title: `${titleBase} · Session ended`,
        start: session.completedAt,
        type: 'SESSION_END',
        jobId: job.id,
        meta: { sessionStatus: session.status },
      }));
    }

    const resultsAt = job.resultsDeclaredAt || session?.resultsDeclaredAt;
    if (resultsAt) {
      events.push(toEvent({
        id: `results-${job.id}`,
        title: `${titleBase} · Results declared`,
        start: resultsAt,
        type: 'RESULTS_DECLARED',
        jobId: job.id,
        meta: { locked: job.resultsLocked || session?.resultsLocked },
      }));
    }

    if (job.screeningSession?.finalizedAt) {
      events.push(toEvent({
        id: `screening-${job.id}`,
        title: `${titleBase} · Screening finalized`,
        start: job.screeningSession.finalizedAt,
        type: 'SCREENING_FINALIZED',
        jobId: job.id,
      }));
    }
  }

  const jobIdList = jobs.map((j) => j.id);
  if (jobIdList.length > 0) {
    const scheduledSlots = await prisma.interviewSlot.findMany({
      where: {
        scheduledAt: { not: null },
        session: { jobId: { in: jobIdList } },
      },
      include: {
        session: { select: { jobId: true } },
        application: {
          select: {
            student: { select: { fullName: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: filters.limit || 500,
    });

    for (const slot of scheduledSlots) {
      const job = jobs.find((j) => j.id === slot.session.jobId);
      if (!job) continue;
      const label = job.companyName || 'Drive';
      const candidate = slot.application?.student?.fullName || 'Candidate';
      const isOnline = Boolean(slot.meetingLink);
      const end = new Date(new Date(slot.scheduledAt).getTime() + 45 * 60 * 1000);
      events.push(toEvent({
        id: `slot-${slot.id}`,
        title: `${label} — ${candidate} · ${isOnline ? 'Online interview' : 'Interview slot'}`,
        start: slot.scheduledAt,
        end,
        type: 'INTERVIEW_SLOT',
        jobId: job.id,
        meta: {
          meetingLink: slot.meetingLink,
          room: slot.room,
          isOnline,
          interviewMode: job.interviewMode || 'OFFLINE',
          slotDeliveryMode: slot.slotDeliveryMode,
        },
      }));
    }
  }

  if (filters.from) {
    const fromMs = new Date(filters.from).getTime();
    return events.filter((e) => new Date(e.start).getTime() >= fromMs);
  }

  return events.sort((a, b) => new Date(a.start) - new Date(b.start));
}
