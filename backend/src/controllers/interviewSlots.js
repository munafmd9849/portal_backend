/**
 * Interview slot booking + attendance endpoints.
 */

import {
  listSessionSlots,
  listEligibleApplicationsForSession,
  upsertInterviewSlot,
  markSlotAttendance,
  recordStudentSlotJoin,
} from '../services/interviewSlotService.js';
import { logAction } from '../utils/auditLogger.js';

function normalizeRole(role) {
  return String(role || 'ADMIN').toUpperCase();
}

export async function getSessionSlots(req, res) {
  try {
    const { sessionId } = req.params;
    const slots = await listSessionSlots(sessionId);
    res.json({ slots });
  } catch (error) {
    console.error('getSessionSlots error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to load slots' });
  }
}

export async function getEligibleApplications(req, res) {
  try {
    const { sessionId } = req.params;
    const { applications } = await listEligibleApplicationsForSession(sessionId);
    res.json({
      applications: applications.map((app) => ({
        id: app.id,
        studentId: app.studentId,
        status: app.status,
        student: app.student,
      })),
    });
  } catch (error) {
    console.error('getEligibleApplications error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to load candidates' });
  }
}

export async function assignSlot(req, res) {
  try {
    const { sessionId } = req.params;
    const { slot, calendarWarning } = await upsertInterviewSlot(sessionId, req.body, {
      adminUserId: req.userId || req.user?.id,
      adminRole: normalizeRole(req.user?.role),
      notifyStudent: true,
    });

    await logAction(req, {
      actionType: 'Assign Interview Slot',
      targetType: 'InterviewSlot',
      targetId: slot.id,
      details: JSON.stringify({
        applicationId: slot.applicationId,
        roundId: slot.roundId,
        scheduledAt: slot.scheduledAt,
        room: slot.room,
        meetingLink: slot.meetingLink,
        slotDeliveryMode: slot.slotDeliveryMode,
      }),
    });

    res.json({ slot, calendarWarning: calendarWarning || null });
  } catch (error) {
    console.error('assignSlot error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to assign slot' });
  }
}

export async function updateSlotAttendance(req, res) {
  try {
    const { slotId } = req.params;
    const { status, notes } = req.body;
    const slot = await markSlotAttendance(slotId, status, notes);

    await logAction(req, {
      actionType: 'Mark Interview Attendance',
      targetType: 'InterviewSlot',
      targetId: slot.id,
      details: JSON.stringify({ status: slot.status, applicationId: slot.applicationId, notes: slot.notes }),
    });

    res.json({ slot });
  } catch (error) {
    console.error('updateSlotAttendance error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update attendance' });
  }
}

export async function studentJoinSlot(req, res) {
  try {
    const { slotId } = req.params;
    const slot = await recordStudentSlotJoin(slotId, req.userId);
    res.json({ slot });
  } catch (error) {
    console.error('studentJoinSlot error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to record join' });
  }
}
