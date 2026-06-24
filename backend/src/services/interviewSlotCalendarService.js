/**
 * Google Calendar + Meet sync for placement interview slots.
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { createEvent, updateEvent } from './calendarServiceEnhanced.js';
import { createNotification } from '../controllers/notifications.js';
import { sendInterviewSlotScheduledEmail } from './emailService.js';

const SLOT_DURATION_MS = 45 * 60 * 1000;

export function resolveEffectiveDeliveryMode(jobInterviewMode, slotDeliveryMode) {
  const jobMode = String(jobInterviewMode || 'OFFLINE').toUpperCase();
  if (jobMode === 'HYBRID') {
    return String(slotDeliveryMode || 'OFFLINE').toUpperCase();
  }
  return jobMode;
}

export function detectMeetingProvider(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.toLowerCase();
  if (u.includes('meet.google')) return 'GOOGLE_MEET';
  if (u.includes('zoom.us') || u.includes('zoom.com')) return 'ZOOM';
  if (u.includes('teams.microsoft') || u.includes('teams.live')) return 'TEAMS';
  return 'CUSTOM';
}

export function extractMeetLink(event) {
  if (!event) return null;
  if (event.hangoutLink) return event.hangoutLink;
  const entry = event.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === 'video' && e.uri,
  );
  return entry?.uri || null;
}

function parsePanelEmails(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function buildSlotEventTimes(scheduledAt) {
  const start = scheduledAt ? new Date(scheduledAt) : new Date();
  const end = new Date(start.getTime() + SLOT_DURATION_MS);
  return { start, end };
}

/**
 * Create or update calendar event + Meet link for an online slot.
 */
export async function syncInterviewSlotCalendar({
  adminUserId,
  adminRole,
  slot,
  job,
  student,
  panelEmails = [],
  previousCalendarEventId = null,
}) {
  const deliveryMode = resolveEffectiveDeliveryMode(job.interviewMode, slot.slotDeliveryMode);
  if (deliveryMode !== 'ONLINE') {
    return { meetingLink: null, calendarEventId: null, calendarWarning: null };
  }

  let meetingLink = slot.meetingLink?.trim() || null;
  let meetingProvider = slot.meetingProvider || detectMeetingProvider(meetingLink);
  let calendarEventId = slot.calendarEventId || null;
  let calendarWarning = null;

  const shouldAutoMeet = Boolean(slot.autoGenerateMeet)
    || (!meetingLink && String(job.defaultMeetingProvider || 'GOOGLE_MEET').toUpperCase() === 'GOOGLE_MEET');

  const attendees = [
    student?.email,
    ...parsePanelEmails(panelEmails),
  ].filter(Boolean);

  const { start, end } = buildSlotEventTimes(slot.scheduledAt);
  const summary = `Interview: ${job.jobTitle}${job.companyName ? ` @ ${job.companyName}` : ''}`;
  const location = slot.room?.trim() || 'Online';
  const descriptionParts = [
    `Candidate: ${student?.fullName || 'Student'}`,
    student?.enrollmentId ? `ID: ${student.enrollmentId}` : null,
    slot.joinInstructions ? `Instructions: ${slot.joinInstructions}` : null,
  ].filter(Boolean);
  const description = descriptionParts.join('\n');

  if (shouldAutoMeet && adminUserId) {
    try {
      const role = String(adminRole || 'ADMIN').toUpperCase();
      if (previousCalendarEventId || calendarEventId) {
        const eventId = previousCalendarEventId || calendarEventId;
        const updated = await updateEvent(adminUserId, role, eventId, {
          summary,
          description,
          location,
          start: start.toISOString(),
          end: end.toISOString(),
          attendees,
        });
        calendarEventId = updated.id;
        meetingLink = extractMeetLink(updated) || meetingLink;
      } else {
        const created = await createEvent(adminUserId, role, {
          summary,
          description,
          start: start.toISOString(),
          end: end.toISOString(),
          location,
          attendees,
          meetLink: true,
        });
        calendarEventId = created.id;
        meetingLink = extractMeetLink(created) || created.hangoutLink || meetingLink;
      }
      if (meetingLink && !meetingProvider) {
        meetingProvider = 'GOOGLE_MEET';
      }
    } catch (error) {
      calendarWarning = error.message || 'Could not sync Google Calendar / Meet link.';
      logger.warn('Interview slot calendar sync failed', {
        slotId: slot.id,
        error: calendarWarning,
      });
      if (!meetingLink) {
        calendarWarning += ' Connect Google Calendar or paste a meeting link manually.';
      }
    }
  }

  if (meetingLink && !meetingProvider) {
    meetingProvider = detectMeetingProvider(meetingLink) || 'CUSTOM';
  }

  return { meetingLink, meetingProvider, calendarEventId, calendarWarning };
}

export async function notifyStudentInterviewSlot({
  slot,
  job,
  student,
  meetingLink,
  deliveryMode,
}) {
  if (!student?.userId) return;

  const when = slot.scheduledAt
    ? new Date(slot.scheduledAt).toLocaleString()
    : 'See portal for schedule';
  const isOnline = deliveryMode === 'ONLINE';
  const title = isOnline ? 'Online interview scheduled' : 'Interview slot scheduled';
  const body = isOnline && meetingLink
    ? `${job.jobTitle}: ${when}. Join via Google Meet from your application tracker.`
    : `${job.jobTitle}: ${when}${slot.room ? ` · ${slot.room}` : ''}. Check your application tracker for details.`;

  await createNotification({
    userId: student.userId,
    title,
    body,
    data: {
      type: 'interview',
      jobId: job.id,
      applicationId: slot.applicationId,
      slotId: slot.id,
      meetingLink: meetingLink || null,
      scheduledAt: slot.scheduledAt,
      room: slot.room,
      deliveryMode,
    },
    sendEmail: false,
  });

  if (student.email) {
    try {
      await sendInterviewSlotScheduledEmail({
        studentEmail: student.email,
        studentName: student.fullName,
        jobTitle: job.jobTitle,
        companyName: job.companyName,
        scheduledAt: slot.scheduledAt,
        room: slot.room,
        meetingLink,
        joinInstructions: slot.joinInstructions,
        deliveryMode,
      });
    } catch (error) {
      logger.error('Failed to send interview slot email', { slotId: slot.id, error: error.message });
    }
  }

  if (slot.scheduledAt) {
    await prisma.application.update({
      where: { id: slot.applicationId },
      data: { interviewDate: new Date(slot.scheduledAt) },
    });
  }
}
