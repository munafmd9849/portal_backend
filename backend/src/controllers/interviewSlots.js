/**
 * Interview slot booking + attendance endpoints.
 */

import {
  listSessionSlots,
  upsertInterviewSlot,
  markSlotAttendance,
} from '../services/interviewSlotService.js';
import { logAction } from '../utils/auditLogger.js';

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

export async function assignSlot(req, res) {
  try {
    const { sessionId } = req.params;
    const slot = await upsertInterviewSlot(sessionId, req.body);

    await logAction(req, {
      actionType: 'Assign Interview Slot',
      targetType: 'InterviewSlot',
      targetId: slot.id,
      details: JSON.stringify({
        applicationId: slot.applicationId,
        roundId: slot.roundId,
        scheduledAt: slot.scheduledAt,
        room: slot.room,
      }),
    });

    res.json({ slot });
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
