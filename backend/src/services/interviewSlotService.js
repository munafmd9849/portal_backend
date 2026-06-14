/**
 * Placement interview slot booking and attendance (P2 #12 MVP).
 */

import prisma from '../config/database.js';
import { patchApplication } from './applicationStateService.js';

const VALID_SLOT_STATUSES = new Set(['SCHEDULED', 'ATTENDED', 'NO_SHOW', 'RESCHEDULED', 'CANCELLED']);

export async function listSessionSlots(sessionId) {
  return prisma.interviewSlot.findMany({
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
}

export async function upsertInterviewSlot(sessionId, payload) {
  const { applicationId, roundId, scheduledAt, room, panelEmails, notes } = payload;

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { id: true, jobId: true, resultsLocked: true, resultsDeclaredAt: true },
  });
  if (!session) throw Object.assign(new Error('Interview session not found'), { status: 404 });
  if (session.resultsLocked || session.resultsDeclaredAt) {
    throw Object.assign(new Error('Results declared — slot edits are locked.'), { status: 409 });
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, jobId: true },
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

  const data = {
    sessionId,
    applicationId,
    roundId: roundId || null,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    room: room?.trim() || null,
    panelEmails: JSON.stringify(Array.isArray(panelEmails) ? panelEmails : []),
    notes: notes?.trim() || null,
    status: 'SCHEDULED',
  };

  const slot = existing
    ? await prisma.interviewSlot.update({ where: { id: existing.id }, data })
    : await prisma.interviewSlot.create({ data });

  await patchApplication(applicationId, { attendanceStatus: 'SCHEDULED' }, { notify: false });

  return slot;
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

  return updated;
}
