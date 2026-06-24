/**
 * Placement interview slot booking, calendar sync, and attendance (P2 #12 + online interviews).
 */

import prisma from '../config/database.js';
import { patchApplication } from './applicationStateService.js';
import {
  syncInterviewSlotCalendar,
  resolveEffectiveDeliveryMode,
  detectMeetingProvider,
  notifyStudentInterviewSlot,
} from './interviewSlotCalendarService.js';
import { buildInterviewEligibleApplicationWhere } from '../utils/applicationTrackerState.js';

const VALID_SLOT_STATUSES = new Set(['SCHEDULED', 'ATTENDED', 'NO_SHOW', 'RESCHEDULED', 'CANCELLED']);

function formatSlotForApi(slot) {
  let panelEmails = [];
  try {
    panelEmails = JSON.parse(slot.panelEmails || '[]');
  } catch {
    panelEmails = [];
  }
  return { ...slot, panelEmails };
}

export async function listSessionSlots(sessionId) {
  const slots = await prisma.interviewSlot.findMany({
    where: { sessionId },
    include: {
      application: {
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              enrollmentId: true,
            },
          },
        },
      },
      round: { select: { id: true, roundNumber: true, name: true, status: true } },
    },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
  });
  return slots.map(formatSlotForApi);
}

export async function listEligibleApplicationsForSession(sessionId) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { job: true },
  });
  if (!session) {
    throw Object.assign(new Error('Interview session not found'), { status: 404 });
  }

  const applications = await prisma.application.findMany({
    where: buildInterviewEligibleApplicationWhere(session.jobId, session.job),
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
          enrollmentId: true,
        },
      },
    },
    orderBy: { appliedDate: 'asc' },
  });

  return { session, applications };
}

export async function upsertInterviewSlot(sessionId, payload, options = {}) {
  const {
    applicationId,
    roundId,
    scheduledAt,
    room,
    panelEmails,
    notes,
    slotDeliveryMode,
    meetingLink,
    meetingProvider,
    joinInstructions,
    autoGenerateMeet,
  } = payload;

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      job: {
        select: {
          id: true,
          jobTitle: true,
          companyName: true,
          interviewMode: true,
          defaultMeetingProvider: true,
        },
      },
    },
  });
  if (!session) throw Object.assign(new Error('Interview session not found'), { status: 404 });
  if (session.resultsLocked || session.resultsDeclaredAt) {
    throw Object.assign(new Error('Results declared — slot edits are locked.'), { status: 409 });
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      student: {
        select: {
          id: true,
          userId: true,
          fullName: true,
          email: true,
          enrollmentId: true,
        },
      },
    },
  });
  if (!application || application.jobId !== session.jobId) {
    throw Object.assign(new Error('Application does not belong to this drive.'), { status: 400 });
  }

  if (roundId) {
    const round = await prisma.interviewRound.findFirst({
      where: { id: roundId, sessionId },
    });
    if (!round) throw Object.assign(new Error('Round not found in this session.'), { status: 400 });
  }

  const existing = await prisma.interviewSlot.findFirst({
    where: { sessionId, applicationId, roundId: roundId || null },
  });

  const effectiveDelivery = resolveEffectiveDeliveryMode(
    session.job.interviewMode,
    slotDeliveryMode,
  );
  const isOnline = effectiveDelivery === 'ONLINE';

  const data = {
    sessionId,
    applicationId,
    roundId: roundId || null,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    room: isOnline ? (room?.trim() || null) : (room?.trim() || null),
    slotDeliveryMode: session.job.interviewMode === 'HYBRID'
      ? String(slotDeliveryMode || 'OFFLINE').toUpperCase()
      : null,
    meetingLink: isOnline ? (meetingLink?.trim() || null) : null,
    meetingProvider: isOnline
      ? (meetingProvider || detectMeetingProvider(meetingLink) || null)
      : null,
    joinInstructions: joinInstructions?.trim() || null,
    autoGenerateMeet: isOnline ? Boolean(autoGenerateMeet) : false,
    panelEmails: JSON.stringify(Array.isArray(panelEmails) ? panelEmails : []),
    notes: notes?.trim() || null,
    status: 'SCHEDULED',
  };

  let calendarWarning = null;
  if (isOnline && (data.autoGenerateMeet || data.meetingLink || scheduledAt)) {
    const calendarResult = await syncInterviewSlotCalendar({
      adminUserId: options.adminUserId,
      adminRole: options.adminRole,
      slot: { ...data, id: existing?.id, calendarEventId: existing?.calendarEventId },
      job: session.job,
      student: application.student,
      panelEmails,
      previousCalendarEventId: existing?.calendarEventId,
    });
    if (calendarResult.meetingLink) data.meetingLink = calendarResult.meetingLink;
    if (calendarResult.meetingProvider) data.meetingProvider = calendarResult.meetingProvider;
    if (calendarResult.calendarEventId) data.calendarEventId = calendarResult.calendarEventId;
    calendarWarning = calendarResult.calendarWarning;
  } else if (!isOnline) {
    data.meetingLink = null;
    data.meetingProvider = null;
    data.autoGenerateMeet = false;
  }

  const slot = existing
    ? await prisma.interviewSlot.update({ where: { id: existing.id }, data })
    : await prisma.interviewSlot.create({ data });

  await patchApplication(applicationId, { attendanceStatus: 'SCHEDULED' }, { notify: false });

  if (options.notifyStudent !== false) {
    await notifyStudentInterviewSlot({
      slot,
      job: session.job,
      student: application.student,
      meetingLink: slot.meetingLink,
      deliveryMode: effectiveDelivery,
    });
  }

  return { slot: formatSlotForApi(slot), calendarWarning };
}

export async function markSlotAttendance(slotId, status, notes) {
  const normalized = String(status || '').toUpperCase();
  if (!VALID_SLOT_STATUSES.has(normalized)) {
    throw Object.assign(new Error(`Invalid slot status: ${status}`), { status: 400 });
  }

  const slot = await prisma.interviewSlot.findUnique({
    where: { id: slotId },
    include: { session: { select: { resultsLocked: true, resultsDeclaredAt: true } } },
  });
  if (!slot) throw Object.assign(new Error('Slot not found'), { status: 404 });
  if (slot.session.resultsLocked || slot.session.resultsDeclaredAt) {
    throw Object.assign(new Error('Results declared — attendance edits are locked.'), { status: 409 });
  }

  const updated = await prisma.interviewSlot.update({
    where: { id: slotId },
    data: {
      status: normalized,
      notes: notes?.trim() || slot.notes,
    },
  });

  const attendanceStatus = normalized === 'NO_SHOW' ? 'NO_SHOW' : normalized;
  await patchApplication(slot.applicationId, { attendanceStatus }, { notify: true });

  return formatSlotForApi(updated);
}

export async function recordStudentSlotJoin(slotId, userId) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!student) {
    throw Object.assign(new Error('Student profile not found'), { status: 404 });
  }

  const slot = await prisma.interviewSlot.findUnique({
    where: { id: slotId },
    include: { application: { select: { studentId: true } } },
  });
  if (!slot) throw Object.assign(new Error('Slot not found'), { status: 404 });
  if (slot.application.studentId !== student.id) {
    throw Object.assign(new Error('Not authorized'), { status: 403 });
  }

  const updated = await prisma.interviewSlot.update({
    where: { id: slotId },
    data: { studentJoinedAt: new Date() },
  });
  return formatSlotForApi(updated);
}

export async function listStudentInterviewSlots(studentId) {
  const slots = await prisma.interviewSlot.findMany({
    where: {
      application: { studentId },
      status: { in: ['SCHEDULED', 'ATTENDED', 'RESCHEDULED'] },
    },
    include: {
      round: { select: { roundNumber: true, name: true } },
      session: {
        include: {
          job: {
            select: {
              id: true,
              jobTitle: true,
              companyName: true,
              interviewMode: true,
            },
          },
        },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return slots.map((slot) => {
    const deliveryMode = resolveEffectiveDeliveryMode(
      slot.session?.job?.interviewMode,
      slot.slotDeliveryMode,
    );
    return {
      id: slot.id,
      applicationId: slot.applicationId,
      scheduledAt: slot.scheduledAt,
      room: slot.room,
      meetingLink: deliveryMode === 'ONLINE' ? slot.meetingLink : null,
      meetingProvider: slot.meetingProvider,
      joinInstructions: slot.joinInstructions,
      deliveryMode,
      status: slot.status,
      round: slot.round,
      job: slot.session?.job,
      studentJoinedAt: slot.studentJoinedAt,
    };
  });
}
