/**
 * Applications Controller
 * Replaces Firebase Firestore application service calls
 * Handles job applications and status updates
 */

import prisma from '../config/database.js';
import jwt from 'jsonwebtoken';
import { createNotification } from './notifications.js';
import { getIO } from '../config/socket.js';
import { sendApplicationNotification, sendApplicationStatusUpdateNotification } from '../services/emailService.js';
import logger from '../config/logger.js';
import { sendSuccess } from '../utils/response.js';
import { logAction } from '../utils/auditLogger.js';
import { getAdminScopeFilter } from '../utils/adminScope.js';
import { validateApplicationStateTransition } from '../utils/applicationIntegrity.js';
import { isAdminViewer } from '../utils/adminAccess.js';
import { buildApplicationTrackerState, getInitialScreeningStatusForJob } from '../utils/applicationTrackerState.js';
import { validateStudentEligibilityForApply } from '../utils/jobEligibility.js';
import { validatePlacementPolicyForApply, validatePlacementPolicyForOffer } from '../services/placementPolicyService.js';
import { ensureAssessmentAssignmentForJob } from '../services/jobAssessmentBridge.js';
import { assertApplicationEditable, patchApplication } from '../services/applicationStateService.js';
import { canStudentWithdrawApplication } from '../utils/applicationWithdraw.js';


const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * ==============================
 * Application Stage/Progress Mapping (single source of truth)
 * ==============================
 *
 * This mapping is used by:
 * - Admin job applicants tracking page
 * - Student past applications view
 *
 * Rules:
 * - Pre-interview: use Application.screeningStatus
 * - Interview progress/final: use Application.interviewStatus + Application.lastRoundReached
 * - Interview "started" signal: RoundEvaluation existence OR lastRoundReached > 0
 *   (Needed to distinguish "Qualified for Interview" vs "Interview Round 1")
 */
function normalizeScreeningStatus(value) {
  return (value || 'APPLIED').toUpperCase();
}

function normalizeInterviewStatus(value) {
  // Handle null, undefined, and trim whitespace
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function getRejectedIn({ screeningStatus, interviewStatus }) {
  if (screeningStatus === 'RESUME_REJECTED' || screeningStatus === 'SCREENING_REJECTED') return 'Screening';
  if (screeningStatus === 'TEST_REJECTED') return 'Test';

  if (interviewStatus && interviewStatus.startsWith('REJECTED_IN_ROUND_')) {
    const roundNumRaw = interviewStatus.replace('REJECTED_IN_ROUND_', '');
    const roundNum = parseInt(roundNumRaw, 10);
    if (!Number.isNaN(roundNum)) return `Round ${roundNum}`;
    return 'Interview';
  }

  return null;
}

function getFinalStatus({ status, screeningStatus, interviewStatus }) {
  // Prefer explicit final interview status
  // Normalize interviewStatus for comparison (handle case sensitivity and whitespace)
  const normalizedInterview = interviewStatus ? String(interviewStatus).trim().toUpperCase() : null;
  if (normalizedInterview === 'SELECTED') return 'SELECTED';
  if (normalizedInterview && normalizedInterview.startsWith('REJECTED_IN_ROUND_')) return 'REJECTED';

  // Pre-interview rejection states
  if (screeningStatus === 'RESUME_REJECTED' || screeningStatus === 'SCREENING_REJECTED' || screeningStatus === 'TEST_REJECTED') return 'REJECTED';

  // Fallback to legacy Application.status
  const normalized = status ? String(status).toUpperCase() : null;
  if (normalized === 'SELECTED') return 'SELECTED';
  if (normalized === 'REJECTED') return 'REJECTED';

  return 'ONGOING';
}

function computeApplicationTrackingFields({
  status,
  screeningStatus,
  interviewStatus,
  lastRoundReached,
  hasInterviewSession,
  hasInterviewStarted,
  sessionStatus,
  sessionRounds,
}) {
  const screening = normalizeScreeningStatus(screeningStatus);
  const interview = normalizeInterviewStatus(interviewStatus);
  const dbLastRoundReached = typeof lastRoundReached === 'number' ? lastRoundReached : parseInt(lastRoundReached || 0, 10) || 0;

  const finalStatus = getFinalStatus({ status, screeningStatus: screening, interviewStatus: interview });
  const rejectedIn = finalStatus === 'REJECTED' ? getRejectedIn({ screeningStatus: screening, interviewStatus: interview }) : null;

  // Check if all rounds are completed
  const allRoundsCompleted = sessionRounds && sessionRounds.length > 0 &&
    sessionRounds.every(round => round.status === 'ENDED');
  const sessionCompleted = sessionStatus === 'COMPLETED';

  // Derive "current stage" text strictly from DB fields
  let currentStage = 'Applied';

  // CRITICAL: Check SELECTED status FIRST, before checking interview session status
  if (finalStatus === 'SELECTED') {
    currentStage = 'Selected (Final)';
  } else if (finalStatus === 'REJECTED') {
    if (rejectedIn === 'Screening') currentStage = 'Rejected in Screening';
    else if (rejectedIn === 'Test') currentStage = 'Rejected in Test';
    else if (rejectedIn && rejectedIn.startsWith('Round ')) {
      const roundNum = rejectedIn.replace('Round ', '');
      currentStage = `Rejected in Interview Round ${roundNum}`;
    } else {
      currentStage = 'Rejected';
    }
  } else {
    // ONGOING
    if (screening === 'RESUME_SELECTED' || screening === 'SCREENING_SELECTED') {
      currentStage = 'Screening Qualified';
    } else if (screening === 'TEST_SELECTED' || screening === 'INTERVIEW_ELIGIBLE') {
      // Candidate has cleared screening + test and is eligible for interview
      // INTERVIEW_ELIGIBLE is the final status after screening/test completion
      if (hasInterviewSession && hasInterviewStarted) {
        // Check if all rounds are completed
        if (allRoundsCompleted || sessionCompleted) {
          currentStage = 'Interview Completed';
        } else {
          // lastRoundReached is "last completed round" => current round is +1
          const currentRound = Math.max(1, dbLastRoundReached + 1);
          currentStage = `Interview Round ${currentRound}`;
        }
      } else {
        currentStage = 'Qualified for Interview';
      }
    } else if (screening === 'APPLIED') {
      currentStage = 'Applied';
    }
  }

  // Output "lastRoundReached" in the format expected by admin UI:
  // - If interview has started: show current interview round (1-based)
  // - If interview finished (selected/rejected in round): show round reached (db value)
  // - Otherwise: 0
  let lastRoundReachedOut = 0;
  if (finalStatus === 'SELECTED' || (finalStatus === 'REJECTED' && interview && interview.startsWith('REJECTED_IN_ROUND_'))) {
    lastRoundReachedOut = dbLastRoundReached || 0;
  } else if (hasInterviewSession && hasInterviewStarted && (screening === 'TEST_SELECTED' || screening === 'INTERVIEW_ELIGIBLE' || screening === 'SCREENING_SELECTED')) {
    lastRoundReachedOut = Math.max(1, dbLastRoundReached + 1);
  }

  return {
    currentStage,
    finalStatus,
    rejectedIn,
    lastRoundReached: lastRoundReachedOut,
  };
}

import { parseJobCustomQuestions } from '../utils/customQuestions.js';

function parseStoredCustomAnswers(raw) {
  if (!raw || raw === '{}') return {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeCustomAnswersForApply(questions, customAnswers) {
  if (!questions.length) return '{}';
  if (!customAnswers || typeof customAnswers !== 'object' || Array.isArray(customAnswers)) {
    return null;
  }
  const normalized = {};
  for (const question of questions) {
    const answer = customAnswers[question];
    if (answer == null || String(answer).trim() === '') {
      return null;
    }
    normalized[question] = String(answer).trim();
  }
  return JSON.stringify(normalized);
}

function buildTrackerForApplication(app, session, evaluations) {
  return buildApplicationTrackerState({
    status: app.status,
    screeningStatus: app.screeningStatus,
    interviewStatus: app.interviewStatus,
    lastRoundReached: app.lastRoundReached || 0,
    appliedDate: app.appliedDate,
    updatedAt: app.updatedAt,
    interviewDate: app.interviewDate,
    screeningRemarks: app.screeningRemarks,
    screeningCompletedAt: app.screeningCompletedAt,
    requiresScreening: Boolean(app.job?.requiresScreening),
    requiresTest: Boolean(app.job?.requiresTest),
    session,
    evaluations: evaluations || [],
  });
}

/**
 * Format a single application record for student-facing APIs and socket events.
 */
export async function formatStudentApplicationRecord(applicationId) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: { include: { company: true } },
      student: { include: { user: { select: { id: true } } } },
    },
  });
  if (!app) return null;

  const [session, evaluations] = await Promise.all([
    prisma.interviewSession.findFirst({
      where: { jobId: app.jobId },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    }),
    prisma.roundEvaluation.findMany({
      where: { applicationId: app.id },
      include: { round: { select: { roundNumber: true, name: true } } },
      orderBy: { round: { roundNumber: 'asc' } },
    }),
  ]);

  const screeningStatus = app.screeningStatus || 'APPLIED';
  const hasInterviewSession = !!session;
  const hasInterviewStarted = (app.lastRoundReached || 0) > 0 ||
    evaluations.length > 0 ||
    (session && (session.status === 'COMPLETED' || session.status === 'ONGOING') && session.rounds?.length > 0);

  const tracking = computeApplicationTrackingFields({
    status: app.status,
    screeningStatus,
    interviewStatus: app.interviewStatus,
    lastRoundReached: app.lastRoundReached || 0,
    hasInterviewSession,
    hasInterviewStarted,
    sessionStatus: session?.status || null,
    sessionRounds: session?.rounds || null,
  });

  const tracker = buildTrackerForApplication(app, session, evaluations);

  const screeningStatusText = tracker.primaryStatus.label;

  const interviewStatusText = tracker.primaryStatus.final
    ? null
    : (tracker.details.interviewEligible ? tracker.primaryStatus.label : null);

  return {
    userId: app.student?.user?.id || null,
    formatted: {
      id: app.id,
      studentId: app.studentId,
      jobId: app.jobId,
      companyId: app.companyId,
      status: app.status,
      appliedDate: app.appliedDate,
      updatedAt: app.updatedAt,
      interviewDate: app.interviewDate,
      company: app.job?.company || { name: 'Unknown Company' },
      job: {
        jobTitle: app.job?.jobTitle || 'Unknown Position',
        requiresScreening: app.job?.requiresScreening,
        requiresTest: app.job?.requiresTest,
        ...app.job,
      },
      screeningStatus,
      screeningRemarks: app.screeningRemarks || null,
      screeningStatusText,
      currentStage: tracker.currentStage,
      primaryStatus: tracker.primaryStatus,
      tracker,
      finalStatus: tracking.finalStatus,
      rejectedIn: tracking.rejectedIn,
      interviewStatus: {
        hasSession: !!session,
        statusText: interviewStatusText,
        lastRoundStatus: null,
        lastRoundReached: tracking.lastRoundReached,
      },
    },
  };
}

/**
 * Push formatted application state to the student's socket room.
 */
export async function notifyStudentApplicationUpdate(applicationId) {
  try {
    const payload = await formatStudentApplicationRecord(applicationId);
    if (!payload?.userId) return;

    const io = getIO();
    if (io) {
      io.to(`student:${payload.userId}`).emit('application:updated', payload.formatted);
    }
  } catch (error) {
    logger.error(`Failed to notify student for application ${applicationId}:`, error);
  }
}

/**
 * Returns all applications in the system
 */
export async function getAllApplications(req, res) {
  try {
    const {
      status, jobId, studentId, companyId,
      center, school, batch,
      page = 1, limit = 100
    } = req.query;

    const where = {};
    
    // BUILD BASE SCOPE FILTER
    const adminScope = getAdminScopeFilter(req.user.admin, req.user.role);

    if (status) where.status = status;
    if (jobId) where.jobId = jobId;
    if (studentId) where.studentId = studentId;
    if (companyId) where.companyId = companyId;

    // Student attribute filters (nested)
    where.student = {};
    if (center) where.student.center = { in: center.split(',').map(c => c.trim()) };
    if (school) where.student.school = { in: school.split(',').map(s => s.trim()) };
    if (batch) where.student.batch = { in: batch.split(',').map(b => b.trim()) };

    // Apply scoping constraints (AND)
    if (adminScope.school) {
      if (where.student.school) {
        where.student.school.in = where.student.school.in.filter(s => adminScope.school.in.includes(s));
      } else {
        where.student.school = adminScope.school;
      }
    }
    if (adminScope.center) {
      if (where.student.center) {
        where.student.center.in = where.student.center.in.filter(c => adminScope.center.in.includes(c));
      } else {
        where.student.center = adminScope.center;
      }
    }
    
    // If student object is empty after scoping, remove it to avoid empty where
    if (Object.keys(where.student).length === 0) {
      delete where.student;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        include: {
          job: {
            include: {
              company: true,
            },
          },
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              enrollmentId: true,
            },
          },
        },
        orderBy: { appliedDate: 'desc' },
      }),
      prisma.application.count({ where }),
    ]);

    // Format for frontend compatibility
    const formatted = applications.map(app => ({
      id: app.id,
      studentId: app.studentId,
      jobId: app.jobId,
      companyId: app.companyId,
      status: app.status,
      screeningStatus: app.screeningStatus || 'APPLIED',
      screeningRemarks: app.screeningRemarks || null,
      screeningCompletedAt: app.screeningCompletedAt || null,
      appliedDate: app.appliedDate,
      interviewDate: app.interviewDate,
      company: app.job?.company || { name: 'Unknown Company' },
      job: {
        jobTitle: app.job?.jobTitle || 'Unknown Position',
        ...app.job,
      },
      student: app.student || null,
    }));

    res.json({
      applications: formatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
}

/**
 * Dispatch a background job to export applications as a CSV
 */
export async function exportApplications(req, res) {
  try {
    const filters = req.body.filters || {};

    // Dynamic import to avoid circular queue dependencies at startup
    const { addCsvExportJob } = await import('../workers/queues.js');

    const jobId = await addCsvExportJob({
      filters,
      entityType: 'applications'
    });

    res.json({
      success: true,
      jobId,
      message: 'Export background job started'
    });
  } catch (error) {
    console.error('Export applications error:', error);
    res.status(500).json({ error: 'Failed to start export job' });
  }
}

/**
 * Check the status of a CSV export job
 */
export async function getExportStatus(req, res) {
  try {
    const { jobId } = req.params;

    // Dynamically retrieve the BullMQ queue instance
    const { getCsvExportsQueue } = await import('../workers/queues.js');
    const queue = getCsvExportsQueue();
    if (!queue) {
      return res.status(503).json({ error: 'Redis Export Queue unavailable' });
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Export job not found or expired' });
    }

    const state = await job.getState();
    const result = job.returnvalue; // The return response from the worker
    const failedReason = job.failedReason;

    res.json({
      success: true,
      jobId,
      status: state, // 'completed', 'failed', 'active', 'waiting', etc.
      result, // e.g. { url: "cloudinary_url", rowsCount: 5000 }
      error: failedReason
    });
  } catch (error) {
    console.error('Check export status error:', error);
    res.status(500).json({ error: 'Failed to check export status' });
  }
}

/**
 * Get screening summary for a job (admin only)
 * GET /api/applications/job/:jobId/screening-summary
 */
export async function getJobScreeningSummary(req, res) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Get all applications for this job
    const applications = await prisma.application.findMany({
      where: { jobId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            enrollmentId: true,
            batch: true,
            center: true,
            school: true,
            resumeUrl: true,
            resumeFileName: true
          }
        }
      },
      orderBy: { appliedDate: 'desc' }
    });

    // Calculate screening funnel
    const summary = {
      total: applications.length,
      applied: applications.filter(a => !a.screeningStatus || a.screeningStatus === 'APPLIED').length,
      resumeSelected: applications.filter(a => a.screeningStatus === 'RESUME_SELECTED' || a.screeningStatus === 'SCREENING_SELECTED').length,
      resumeRejected: applications.filter(a => a.screeningStatus === 'RESUME_REJECTED' || a.screeningStatus === 'SCREENING_REJECTED').length,
      testSelected: applications.filter(a => a.screeningStatus === 'TEST_SELECTED' || a.screeningStatus === 'INTERVIEW_ELIGIBLE').length,
      testRejected: applications.filter(a => a.screeningStatus === 'TEST_REJECTED').length
    };

    // Group applications by screening status
    const byStatus = {
      APPLIED: applications.filter(a => !a.screeningStatus || a.screeningStatus === 'APPLIED'),
      RESUME_SELECTED: applications.filter(a => a.screeningStatus === 'RESUME_SELECTED' || a.screeningStatus === 'SCREENING_SELECTED'),
      RESUME_REJECTED: applications.filter(a => a.screeningStatus === 'RESUME_REJECTED' || a.screeningStatus === 'SCREENING_REJECTED'),
      TEST_SELECTED: applications.filter(a => a.screeningStatus === 'TEST_SELECTED' || a.screeningStatus === 'INTERVIEW_ELIGIBLE'),
      TEST_REJECTED: applications.filter(a => a.screeningStatus === 'TEST_REJECTED')
    };

    res.json({
      summary,
      applications: applications.map(app => ({
        id: app.id,
        studentId: app.studentId,
        student: app.student,
        screeningStatus: app.screeningStatus || 'APPLIED',
        screeningRemarks: app.screeningRemarks || null,
        screeningCompletedAt: app.screeningCompletedAt || null,
        appliedDate: app.appliedDate
      })),
      byStatus
    });
  } catch (error) {
    console.error('Get job screening summary error:', error);
    res.status(500).json({ error: 'Failed to get screening summary', details: error.message });
  }
}

/**
 * Get student applications
 * Replaces: getStudentApplications(), subscribeStudentApplications()
 */
export async function getStudentApplications(req, res) {
  try {
    let studentId;
    if (req.query.studentId && isAdminViewer(req.user)) {
      studentId = req.query.studentId;
    } else {
      const student = await prisma.student.findUnique({
        where: { userId: req.userId },
        select: { id: true },
      });
      studentId = student?.id;
    }

    console.log('📋 [getStudentApplications] Request received for studentId:', studentId);

    // If student doesn't exist yet, return empty array (for new users)
    if (!studentId) {
      console.warn('⚠️ [getStudentApplications] Student not found, returning empty array');
      return res.json([]);
    }

    console.log('📋 [getStudentApplications] Querying applications for studentId:', studentId);
    const applications = await prisma.application.findMany({
      where: { studentId },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { appliedDate: 'desc' },
    });

    console.log('📋 [getStudentApplications] Found applications:', applications.length);
    if (applications.length > 0) {
      console.log('📋 [getStudentApplications] Application IDs:', applications.map(app => ({
        id: app.id,
        jobId: app.jobId,
        status: app.status,
        jobTitle: app.job?.jobTitle
      })));
    }

    // OPTIMIZED: Run these queries in parallel for better performance
    const jobIds = applications.map(app => app.jobId);
    const applicationIds = applications.map(app => app.id);

    // Run both queries in parallel instead of sequentially
    const [interviewSessions, allEvaluations, allInterviewSlots] = await Promise.all([
      jobIds.length > 0 ? prisma.interviewSession.findMany({
        where: { jobId: { in: jobIds } },
        include: {
          rounds: {
            orderBy: { roundNumber: 'asc' },
          },
        },
      }) : Promise.resolve([]),
      applicationIds.length > 0 ? prisma.roundEvaluation.findMany({
        where: { applicationId: { in: applicationIds } },
        include: {
          round: {
            select: { roundNumber: true, name: true },
          },
        },
        orderBy: { round: { roundNumber: 'asc' } },
      }) : Promise.resolve([]),
      applicationIds.length > 0 ? prisma.interviewSlot.findMany({
        where: { applicationId: { in: applicationIds } },
        include: {
          round: { select: { roundNumber: true, name: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }) : Promise.resolve([]),
    ]);

    const sessionMap = new Map(interviewSessions.map(s => [s.jobId, s]));

    const evaluationsByApp = new Map();
    allEvaluations.forEach(evaluation => {
      if (!evaluationsByApp.has(evaluation.applicationId)) {
        evaluationsByApp.set(evaluation.applicationId, []);
      }
      evaluationsByApp.get(evaluation.applicationId).push(evaluation);
    });

    const slotsByApp = new Map();
    allInterviewSlots.forEach((slot) => {
      if (!slotsByApp.has(slot.applicationId)) {
        slotsByApp.set(slot.applicationId, []);
      }
      const jobMode = applications.find((a) => a.id === slot.applicationId)?.job?.interviewMode || 'OFFLINE';
      const deliveryMode = jobMode === 'HYBRID'
        ? String(slot.slotDeliveryMode || 'OFFLINE').toUpperCase()
        : String(jobMode).toUpperCase();
      slotsByApp.get(slot.applicationId).push({
        id: slot.id,
        scheduledAt: slot.scheduledAt,
        room: slot.room,
        meetingLink: deliveryMode === 'ONLINE' ? slot.meetingLink : null,
        meetingProvider: slot.meetingProvider,
        joinInstructions: slot.joinInstructions,
        deliveryMode,
        status: slot.status,
        round: slot.round,
        studentJoinedAt: slot.studentJoinedAt,
      });
    });

    // Format for frontend compatibility
    const formatted = applications.map(app => {
      const session = sessionMap.get(app.jobId);
      const evaluations = evaluationsByApp.get(app.id) || [];

      const screeningStatus = app.screeningStatus || 'APPLIED';
      const hasInterviewSession = !!session;
      // Interview has started if: lastRoundReached > 0, OR has evaluations, OR session is completed/ongoing with rounds
      const hasInterviewStarted = (app.lastRoundReached || 0) > 0 ||
        evaluations.length > 0 ||
        (session && (session.status === 'COMPLETED' || session.status === 'ONGOING') && session.rounds && session.rounds.length > 0);

      const tracking = computeApplicationTrackingFields({
        status: app.status,
        screeningStatus,
        interviewStatus: app.interviewStatus,
        lastRoundReached: app.lastRoundReached || 0,
        hasInterviewSession,
        hasInterviewStarted,
        sessionStatus: session?.status || null,
        sessionRounds: session?.rounds || null,
      });

      const tracker = buildTrackerForApplication(app, session, evaluations);

      const screeningStatusText = tracker.primaryStatus.label;

      return {
        id: app.id,
        studentId: app.studentId,
        jobId: app.jobId,
        companyId: app.companyId,
        status: app.status,
        appliedDate: app.appliedDate,
        updatedAt: app.updatedAt,
        interviewDate: app.interviewDate,
        company: app.job?.company || { name: 'Unknown Company' },
        job: {
          jobTitle: app.job?.jobTitle || 'Unknown Position',
          requiresScreening: app.job?.requiresScreening,
          requiresTest: app.job?.requiresTest,
          ...app.job,
        },
        screeningStatus,
        screeningRemarks: app.screeningRemarks || null,
        screeningStatusText,
        currentStage: tracker.currentStage,
        primaryStatus: tracker.primaryStatus,
        tracker,
        finalStatus: tracking.finalStatus,
        rejectedIn: tracking.rejectedIn,
        interviewStatus: {
          hasSession: !!session,
          statusText: tracker.primaryStatus.final ? null : (tracker.details.interviewEligible ? tracker.primaryStatus.label : null),
          lastRoundStatus: null,
          lastRoundReached: tracking.lastRoundReached,
        },
        interviewSlots: slotsByApp.get(app.id) || [],
      };
    });

    console.log('📋 [getStudentApplications] Returning formatted applications:', formatted.length);
    if (formatted.length === 0) {
      console.warn('⚠️ [getStudentApplications] No applications found for studentId:', studentId);
      console.warn('⚠️ [getStudentApplications] This could mean:');
      console.warn('   1. Student has not applied to any jobs yet');
      console.warn('   2. Applications exist but studentId mismatch');
      console.warn('   3. Database query returned empty result');
    }
    res.json(formatted);
  } catch (error) {
    console.error('❌ [getStudentApplications] Error:', error);
    console.error('❌ [getStudentApplications] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to get applications' });
  }
}

/**
 * Get student interview history with rounds and evaluation details
 * GET /api/applications/student/interview-history
 */
export async function getStudentInterviewHistory(req, res) {
  try {
    const userId = req.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.json([]);
    }

    // Get all applications
    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { appliedDate: 'desc' },
    });

    // Get all interview sessions for the jobs this student applied to (NEW SYSTEM)
    const jobIds = applications.map(app => app.jobId);
    const interviewSessions = await prisma.interviewSession.findMany({
      where: { jobId: { in: jobIds } },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
        },
      },
    });

    // Get all round evaluations for this student's applications (NEW SYSTEM)
    const applicationIds = applications.map(app => app.id);
    const roundEvaluations = await prisma.roundEvaluation.findMany({
      where: { applicationId: { in: applicationIds } },
      include: {
        round: {
          select: {
            id: true,
            roundNumber: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create a map of jobId -> interviewSession
    const sessionMap = new Map(interviewSessions.map(session => [session.jobId, session]));

    // Create a map of applicationId -> evaluations
    const evaluationMap = new Map();
    roundEvaluations.forEach(evaluation => {
      if (!evaluationMap.has(evaluation.applicationId)) {
        evaluationMap.set(evaluation.applicationId, []);
      }
      evaluationMap.get(evaluation.applicationId).push(evaluation);
    });

    // Format applications with interview history (NEW SYSTEM)
    const formatted = applications.map(app => {
      const session = sessionMap.get(app.jobId);
      const appEvaluations = evaluationMap.get(app.id) || [];

      // Determine screening status text (PRIORITY: Screening status shown before interview status)
      let screeningStatusText = null;
      const screeningStatus = app.screeningStatus || 'APPLIED';

      if (screeningStatus === 'RESUME_REJECTED' || screeningStatus === 'SCREENING_REJECTED') {
        screeningStatusText = 'Rejected in Resume Screening';
      } else if (screeningStatus === 'TEST_REJECTED') {
        screeningStatusText = 'Rejected in Screening Test';
      } else if (screeningStatus === 'TEST_SELECTED' || screeningStatus === 'INTERVIEW_ELIGIBLE') {
        screeningStatusText = 'Qualified for Interview';
      } else if (screeningStatus === 'RESUME_SELECTED' || screeningStatus === 'SCREENING_SELECTED') {
        screeningStatusText = 'Resume Selected';
      } else {
        screeningStatusText = 'Applied (Screening Pending)';
      }

      // Get rounds from session
      const rounds = session?.rounds || [];

      // Determine which round the student reached
      let lastRoundReached = null;
      let lastEvaluationStatus = null;
      let highestRoundNumber = -1;
      const roundsReached = [];

      if (appEvaluations.length > 0 && rounds.length > 0) {
        // Find the highest round they were evaluated in
        appEvaluations.forEach(evaluation => {
          const round = evaluation.round;
          if (round && round.roundNumber > highestRoundNumber) {
            highestRoundNumber = round.roundNumber;
            lastRoundReached = round.name;
            lastEvaluationStatus = evaluation.status;
          }
          if (round && !roundsReached.includes(round.name)) {
            roundsReached.push(round.name);
          }
        });
      }

      // Also check application.lastRoundReached for fallback
      if (!lastRoundReached && app.lastRoundReached && app.lastRoundReached > 0) {
        const round = rounds.find(r => r.roundNumber === app.lastRoundReached);
        if (round) {
          lastRoundReached = round.name;
        }
      }

      // Determine final status
      let finalStatus = app.status;
      let isCracked = false;
      let isRejected = false;

      if (app.interviewStatus === 'SELECTED') {
        isCracked = true;
        finalStatus = 'SELECTED';
      } else if (app.interviewStatus && app.interviewStatus.startsWith('REJECTED_IN_ROUND_')) {
        isRejected = true;
        finalStatus = 'REJECTED';
      } else if (lastEvaluationStatus === 'SELECTED') {
        // Check if this was the final round
        if (session && rounds.length > 0) {
          const maxRound = Math.max(...rounds.map(r => r.roundNumber));
          if (highestRoundNumber === maxRound) {
            isCracked = true;
            finalStatus = 'SELECTED';
          }
        }
      } else if (lastEvaluationStatus === 'REJECTED') {
        isRejected = true;
        finalStatus = 'REJECTED';
      } else if (app.status === 'SELECTED' || app.status === 'OFFERED') {
        isCracked = true;
      } else if (app.status === 'REJECTED') {
        isRejected = true;
      }

      return {
        id: app.id,
        studentId: app.studentId,
        jobId: app.jobId,
        companyId: app.companyId,
        status: finalStatus,
        appliedDate: app.appliedDate,
        interviewDate: app.interviewDate,
        screeningStatus: screeningStatus, // Include raw screening status
        screeningStatusText: screeningStatusText, // Human-readable screening status
        company: app.job?.company || null,
        job: {
          jobTitle: app.job?.jobTitle || '',
          ...app.job,
        },
        // Interview history fields (NEW SYSTEM)
        interviewHistory: session ? {
          interviewId: session.id,
          hasInterview: true,
          rounds: rounds.map(r => ({
            name: r.name,
            roundNumber: r.roundNumber,
            status: r.status,
            criteria: null, // Not stored in new system
          })),
          lastRoundReached: lastRoundReached,
          roundsReached: roundsReached,
          evaluations: appEvaluations.map(e => ({
            roundName: e.round?.name || `Round ${e.round?.roundNumber}`,
            roundNumber: e.round?.roundNumber,
            marks: null, // Not stored in new system
            remarks: e.remarks,
            status: e.status,
            evaluatedAt: e.createdAt,
          })),
          isCracked,
          isRejected,
        } : {
          hasInterview: false,
        },
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get student interview history error:', error);
    res.status(500).json({ error: 'Failed to get interview history', details: error.message });
  }
}

/**
 * Admin: Get applications for a specific job with pipeline stage
 * GET /api/admin/jobs/:jobId/applications
 *
 * Query params:
 * - page, limit
 * - q (search: name/email/enrollmentId)
 * - stage (Applied | Screening Qualified | Qualified for Interview | Interview Round 1 | Interview Round 2 | Selected | Rejected)
 * - finalStatus (ONGOING | SELECTED | REJECTED)
 * - lastRoundReached (number, current round display for ongoing interviews)
 * - sortBy (appliedAt | name | stage)
 * - order (asc | desc)
 */
export async function getAdminJobApplications(req, res) {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ error: 'Job ID is required' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limitRaw = parseInt(req.query.limit || '25', 10) || 25;
    const limit = Math.min(100, Math.max(1, limitRaw));

    // Search query (name, email, phone, application ID)
    const q = (req.query.q || '').trim();

    // Application Status filter
    const applicationStatus = (req.query.applicationStatus || '').trim();

    // Interview Status filter
    const interviewStatus = (req.query.interviewStatus || '').trim();

    // Drive Date filter
    const driveDateFilter = (req.query.driveDateFilter || '').trim();

    // Application Date filter
    const applicationDateFilter = (req.query.applicationDateFilter || '').trim();
    const applicationDateStart = req.query.applicationDateStart ? new Date(req.query.applicationDateStart) : null;
    const applicationDateEnd = req.query.applicationDateEnd ? new Date(req.query.applicationDateEnd) : null;

    // Education filters
    const degree = (req.query.degree || '').trim();
    const branch = (req.query.branch || '').trim(); // specialization in Education table
    const graduationYear = req.query.graduationYear ? parseInt(req.query.graduationYear, 10) : null;

    // Location filter
    const city = (req.query.city || '').trim();
    const state = (req.query.state || '').trim();

    // Legacy filters (keep for backward compatibility)
    const stage = (req.query.stage || '').trim();
    const finalStatusFilter = (req.query.finalStatus || '').trim().toUpperCase();
    const lastRoundFilter = req.query.lastRoundReached !== undefined && req.query.lastRoundReached !== ''
      ? parseInt(String(req.query.lastRoundReached), 10)
      : null;
    const schoolFilter = (req.query.school || '').trim();
    const batchFilter = (req.query.batch || '').trim();

    const sortBy = (req.query.sortBy || 'appliedAt').trim();
    const order = ((req.query.order || 'desc').trim().toLowerCase() === 'asc') ? 'asc' : 'desc';

    const userId = req.userId;
    const userRole = req.user?.role || req.userRole;

    // Get job and check permissions
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        recruiter: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Permission check: 
    // 1. Recruiters can only see applications for their own jobs
    if (userRole === 'RECRUITER' || userRole === 'recruiter') {
      if (!job.recruiter || job.recruiter.user.id !== userId) {
        return res.status(403).json({ error: 'Not authorized to view applications for this job' });
      }
    }
    
    // 2. Admins can only see applications for jobs within their scope
    if (userRole === 'ADMIN') {
      const adminScope = getAdminScopeFilter(req.user.admin, req.user.role);
      const targetSchools = job.targetSchools ? JSON.parse(job.targetSchools) : [];
      const targetCenters = job.targetCenters ? JSON.parse(job.targetCenters) : [];
      
      const hasSchoolAccess = !adminScope.school || targetSchools.some(s => adminScope.school.in.includes(s)) || targetSchools.includes('ALL');
      const hasCenterAccess = !adminScope.center || targetCenters.some(c => adminScope.center.in.includes(c)) || targetCenters.includes('ALL');
      
      // Also allow if admin created it
      const isOwner = job.createdBy === userId;

      if (!isOwner && (!hasSchoolAccess || !hasCenterAccess)) {
        return res.status(403).json({ error: 'Not authorized to view applications for this job (out of scope)' });
      }
    }

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { jobId },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
        },
      },
    });
    const hasInterviewSession = !!interviewSession;

    // Build WHERE clause with AND logic for all filters
    const where = {
      jobId,
    };

    // Array to collect all filter conditions (AND logic)
    const filterConditions = [];

    // Build student filter conditions
    const studentWhere = {};
    let hasStudentFilters = false;

    if (schoolFilter) {
      studentWhere.school = { in: schoolFilter.split(',').map(s => s.trim()) };
      hasStudentFilters = true;
    }
    if (batchFilter) {
      studentWhere.batch = { in: batchFilter.split(',').map(b => b.trim()) };
      hasStudentFilters = true;
    }

    // Last Round reached filter
    if (typeof lastRoundFilter === 'number' && !Number.isNaN(lastRoundFilter)) {
      filterConditions.push({ lastRoundReached: lastRoundFilter });
    }

    // Free-text search (name, email, phone, application ID)
    if (q) {
      filterConditions.push({
        OR: [
          { id: { contains: q } }, // Application ID
          {
            student: {
              OR: [
                { fullName: { contains: q } },
                { email: { contains: q } },
                { phone: { contains: q } },
                { enrollmentId: { contains: q } },
              ],
            },
          },
        ],
      });
    }

    // Application Status filter
    if (applicationStatus) {
      const statusUpper = applicationStatus.toUpperCase();
      if (statusUpper === 'APPLIED') {
        filterConditions.push({ screeningStatus: 'APPLIED' });
      } else if (statusUpper === 'SHORTLISTED') {
        filterConditions.push({ screeningStatus: { in: ['RESUME_SELECTED', 'SCREENING_SELECTED'] } });
      } else if (statusUpper === 'INTERVIEW_SCHEDULED') {
        filterConditions.push({
          AND: [
            { screeningStatus: { in: ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'] } },
            { interviewDate: { not: null } },
          ],
        });
      } else if (statusUpper === 'INTERVIEWED') {
        filterConditions.push({
          AND: [
            { screeningStatus: { in: ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'] } },
            { roundEvaluations: { some: {} } },
          ],
        });
      } else if (statusUpper === 'SELECTED') {
        filterConditions.push({
          OR: [
            { interviewStatus: 'SELECTED' },
            { status: 'SELECTED' },
          ],
        });
      } else if (statusUpper === 'REJECTED') {
        filterConditions.push({
          OR: [
            { status: 'REJECTED' },
            { screeningStatus: { in: ['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'] } },
            { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
          ],
        });
      }
    }

    // Interview Status filter
    if (interviewStatus) {
      const interviewStatusUpper = interviewStatus.toUpperCase();
      if (interviewStatusUpper === 'NOT_SCHEDULED') {
        filterConditions.push({
          AND: [
            { interviewDate: null },
            { screeningStatus: { in: ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'] } },
          ],
        });
      } else if (interviewStatusUpper === 'SCHEDULED') {
        filterConditions.push({
          AND: [
            { interviewDate: { not: null } },
            { roundEvaluations: { none: {} } },
          ],
        });
      } else if (interviewStatusUpper === 'IN_PROGRESS') {
        filterConditions.push({
          AND: [
            { screeningStatus: { in: ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'] } },
            { roundEvaluations: { some: {} } },
            {
              NOT: {
                OR: [
                  { interviewStatus: 'SELECTED' },
                  { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
                ],
              },
            },
          ],
        });
      } else if (interviewStatusUpper === 'COMPLETED') {
        filterConditions.push({
          OR: [
            { interviewStatus: 'SELECTED' },
            { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
          ],
        });
      }
    }

    // Drive Date filter
    if (driveDateFilter && job.driveDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const driveDate = new Date(job.driveDate);
      driveDate.setHours(0, 0, 0, 0);

      if (driveDateFilter === 'upcoming') {
        // Only show if drive date is in future
        if (driveDate <= today) {
          // No results for this filter
          where.id = '00000000-0000-0000-0000-000000000000'; // Non-existent ID
        }
      } else if (driveDateFilter === 'today') {
        // Only show if drive date is today
        if (driveDate.getTime() !== today.getTime()) {
          where.id = '00000000-0000-0000-0000-000000000000'; // Non-existent ID
        }
      } else if (driveDateFilter === 'past') {
        // Only show if drive date is in past
        if (driveDate >= today) {
          where.id = '00000000-0000-0000-0000-000000000000'; // Non-existent ID
        }
      }
    }

    // Application Date filter
    if (applicationDateFilter || applicationDateStart || applicationDateEnd) {
      const dateWhere = {};

      if (applicationDateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateWhere.gte = today;
        dateWhere.lt = tomorrow;
      } else if (applicationDateFilter === 'last_7_days') {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        date.setHours(0, 0, 0, 0);
        dateWhere.gte = date;
      } else if (applicationDateFilter === 'last_30_days') {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        date.setHours(0, 0, 0, 0);
        dateWhere.gte = date;
      } else if (applicationDateStart || applicationDateEnd) {
        if (applicationDateStart) {
          applicationDateStart.setHours(0, 0, 0, 0);
          dateWhere.gte = applicationDateStart;
        }
        if (applicationDateEnd) {
          applicationDateEnd.setHours(23, 59, 59, 999);
          dateWhere.lte = applicationDateEnd;
        }
      }

      if (Object.keys(dateWhere).length > 0) {
        filterConditions.push({ appliedDate: dateWhere });
      }
    }

    // Education filters
    if (degree || branch || graduationYear) {
      const educationConditions = {};
      if (degree) {
        educationConditions.degree = { contains: degree };
      }
      if (branch) {
        // Branch/specialization is stored in Education.description field
        // We search in the description field which typically contains specialization/branch info
        educationConditions.description = { contains: branch };
      }
      if (graduationYear) {
        educationConditions.endYear = graduationYear;
      }

      if (Object.keys(educationConditions).length > 0) {
        studentWhere.education = { some: educationConditions };
        hasStudentFilters = true;
      }
    }

    // Location filter
    if (city || state) {
      if (city) {
        studentWhere.city = { contains: city };
        hasStudentFilters = true;
      }
      if (state) {
        studentWhere.stateRegion = { contains: state };
        hasStudentFilters = true;
      }
    }

    // Combine student filters into filter conditions
    if (hasStudentFilters) {
      filterConditions.push({ student: studentWhere });
    }

    // Legacy final status filter (only use if applicationStatus not provided)
    if (!applicationStatus && finalStatusFilter) {
      if (finalStatusFilter === 'SELECTED') {
        filterConditions.push({
          OR: [
            { interviewStatus: 'SELECTED' },
            { status: 'SELECTED' },
          ],
        });
      } else if (finalStatusFilter === 'REJECTED') {
        filterConditions.push({
          OR: [
            { status: 'REJECTED' },
            { screeningStatus: { in: ['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'] } },
            { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
          ],
        });
      } else if (finalStatusFilter === 'ONGOING') {
        filterConditions.push({
          NOT: {
            OR: [
              { interviewStatus: 'SELECTED' },
              { status: 'SELECTED' },
              { status: 'REJECTED' },
              { screeningStatus: { in: ['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'] } },
              { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
            ],
          },
        });
      }
    }

    // Legacy stage filter (only use if applicationStatus not provided)
    // NOTE: InterviewStarted is candidate-specific and inferred from RoundEvaluations/lastRoundReached.
    if (!applicationStatus && stage) {
      const normalizedStage = stage.toLowerCase();

      if (normalizedStage === 'applied') {
        filterConditions.push({ screeningStatus: 'APPLIED' });
      } else if (normalizedStage === 'screening qualified') {
        filterConditions.push({ screeningStatus: { in: ['RESUME_SELECTED', 'SCREENING_SELECTED'] } });
      } else if (normalizedStage === 'qualified for interview' || normalizedStage === 'test qualified') {
        const stageCondition = { screeningStatus: { in: ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'] } };
        if (hasInterviewSession) {
          stageCondition.AND = [
            {
              OR: [
                { lastRoundReached: 0 },
                { lastRoundReached: null },
              ],
            },
            { roundEvaluations: { none: {} } },
          ];
        }
        filterConditions.push(stageCondition);
      } else if (normalizedStage.startsWith('interview round')) {
        const roundNum = parseInt(normalizedStage.replace('interview round', '').trim(), 10);
        if (!Number.isNaN(roundNum)) {
          const stageCondition = { screeningStatus: { in: ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'] } };
          if (hasInterviewSession) {
            stageCondition.AND = [
              { roundEvaluations: { some: {} } },
              { lastRoundReached: Math.max(0, roundNum - 1) },
              {
                NOT: {
                  OR: [
                    { interviewStatus: 'SELECTED' },
                    { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
                  ],
                },
              },
            ];
          }
          filterConditions.push(stageCondition);
        }
      } else if (normalizedStage === 'selected') {
        filterConditions.push({
          OR: [{ interviewStatus: 'SELECTED' }, { status: 'SELECTED' }],
        });
      } else if (normalizedStage === 'rejected') {
        filterConditions.push({
          OR: [
            { status: 'REJECTED' },
            { screeningStatus: { in: ['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'] } },
            { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
          ],
        });
      }
    }

    // Combine all filter conditions with AND logic
    if (filterConditions.length > 0) {
      where.AND = [...(where.AND || []), ...filterConditions];
    }

    // Base orderBy
    let orderByClause = { appliedDate: order };
    if (sortBy === 'name') {
      orderByClause = { student: { fullName: order } };
    } else if (sortBy === 'stage') {
      // Sorting by stage in DB is tricky because it's computed. 
      // We'll fallback to appliedDate for now, or use a specific field if we decide to store stage.
      orderByClause = { appliedDate: order };
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              enrollmentId: true,
              publicProfileId: true,
              city: true,
              stateRegion: true,
              school: true,
              batch: true,
              center: true,
              education: {
                select: {
                  degree: true,
                  endYear: true,
                  description: true,
                },
                orderBy: { endYear: 'desc' },
                take: 1,
              },
            },
          },
          roundEvaluations: {
            select: {
              id: true,
              status: true,
              remarks: true,
              createdAt: true,
              round: {
                select: { roundNumber: true, name: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: orderByClause,
      }),
      prisma.application.count({ where }),
    ]);

    // Compute per-application stage fields
    const frontendUrl = process.env.FRONTEND_URL || '';

    const mapped = applications.map(app => {
      const hasInterviewStarted = (app.lastRoundReached || 0) > 0 || (app.roundEvaluations && app.roundEvaluations.length > 0);
      const tracking = computeApplicationTrackingFields({
        status: app.status,
        screeningStatus: app.screeningStatus,
        interviewStatus: app.interviewStatus,
        lastRoundReached: app.lastRoundReached || 0,
        hasInterviewSession,
        hasInterviewStarted,
        sessionStatus: interviewSession?.status || null,
        sessionRounds: interviewSession?.rounds || null,
      });

      const publicProfileId = app.student?.publicProfileId || null;
      const profileLink = publicProfileId && frontendUrl ? `${frontendUrl}/profile/${publicProfileId}` : (publicProfileId ? `/profile/${publicProfileId}` : null);

      return {
        id: app.id,
        applicationId: app.id,
        studentId: app.studentId,
        student: {
          id: app.student?.id,
          name: app.student?.fullName || 'Unknown',
          email: app.student?.email || '',
          enrollmentId: app.student?.enrollmentId || null,
          school: app.student?.school || null,
          batch: app.student?.batch || null,
          center: app.student?.center || null,
          profileLink,
          city: app.student?.city || null,
          state: app.student?.stateRegion || null,
          degree: app.student?.education?.[0]?.degree || null,
          branch: app.student?.education?.[0]?.description || null,
          graduationYear: app.student?.education?.[0]?.endYear || null,
        },
        currentStage: tracking.currentStage,
        lastRoundReached: tracking.lastRoundReached,
        finalStatus: tracking.finalStatus,
        rejectedIn: tracking.rejectedIn,
        appliedAt: app.appliedDate,
        screeningStatus: app.screeningStatus,
        interviewStatus: app.interviewStatus,
        evaluations: Array.isArray(app.roundEvaluations)
          ? app.roundEvaluations.map((evaluation) => ({
            roundName: evaluation.round?.name || `Round ${evaluation.round?.roundNumber ?? ''}`.trim(),
            roundNumber: evaluation.round?.roundNumber ?? null,
            status: evaluation.status || null,
            remarks: evaluation.remarks || null,
            evaluatedAt: evaluation.createdAt || null,
          }))
          : [],
      };
    });

    // Job-level stats summary (for header counters)
    // Keep counts based on DB fields (fast) + relationship for interviewStarted.
    const [totalApplications, selectedCount, rejectedCount, shortlistedCount, interviewingCount] = await Promise.all([
      prisma.application.count({ where: { jobId } }),
      prisma.application.count({
        where: { jobId, OR: [{ interviewStatus: 'SELECTED' }, { status: 'SELECTED' }] },
      }),
      prisma.application.count({
        where: {
          jobId,
          OR: [
            { status: 'REJECTED' },
            { screeningStatus: { in: ['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'] } },
            { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
          ],
        },
      }),
      prisma.application.count({
        where: {
          jobId,
          screeningStatus: { in: ['RESUME_SELECTED', 'SCREENING_SELECTED'] },
          NOT: {
            OR: [
              { status: 'REJECTED' },
              { status: 'SELECTED' },
              { interviewStatus: 'SELECTED' },
              { screeningStatus: { in: ['RESUME_REJECTED', 'SCREENING_REJECTED', 'TEST_REJECTED'] } },
              { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
            ],
          },
        },
      }),
      hasInterviewSession
        ? prisma.application.count({
          where: {
            jobId,
            screeningStatus: { in: ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'] },
            roundEvaluations: { some: {} },
            NOT: {
              OR: [
                { interviewStatus: 'SELECTED' },
                { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
              ],
            },
          },
        })
        : Promise.resolve(0),
    ]);

    res.json({
      success: true,
      job: {
        id: job.id,
        title: job.jobTitle,
        companyName: job.company?.name || job.companyName || 'Unknown Company',
      },
      stats: {
        totalApplications,
        shortlisted: shortlistedCount,
        interviewing: interviewingCount,
        selected: selectedCount,
        rejected: rejectedCount,
      },
      applications: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [getAdminJobApplications] Error:', error);
    res.status(500).json({ error: 'Failed to get job applications' });
  }
}

/**
 * Admin: Full application + interview history for one candidate on a job
 * GET /api/admin/jobs/:jobId/applications/:applicationId
 */
export async function getAdminJobApplicationDetail(req, res) {
  try {
    const { jobId, applicationId } = req.params;
    if (!jobId || !applicationId) {
      return res.status(400).json({ error: 'Job ID and application ID are required' });
    }

    const userId = req.userId;
    const userRole = req.user?.role || req.userRole;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        recruiter: { include: { user: { select: { id: true } } } },
        screeningSession: { select: { finalizedAt: true, createdAt: true } },
      },
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (userRole !== 'SUPER_ADMIN') {
    if (userRole === 'RECRUITER' || userRole === 'recruiter') {
      if (!job.recruiter || job.recruiter.user.id !== userId) {
        return res.status(403).json({ error: 'Not authorized to view applications for this job' });
      }
    }

    if (userRole === 'ADMIN') {
      const adminScope = getAdminScopeFilter(req.user.admin, req.user.role);
      const targetSchools = job.targetSchools ? JSON.parse(job.targetSchools) : [];
      const targetCenters = job.targetCenters ? JSON.parse(job.targetCenters) : [];
      const hasSchoolAccess = !adminScope.school || targetSchools.some(s => adminScope.school.in.includes(s)) || targetSchools.includes('ALL');
      const hasCenterAccess = !adminScope.center || targetCenters.some(c => adminScope.center.in.includes(c)) || targetCenters.includes('ALL');
      const isOwner = job.createdBy === userId;
      if (!isOwner && (!hasSchoolAccess || !hasCenterAccess)) {
        return res.status(403).json({ error: 'Not authorized to view applications for this job (out of scope)' });
      }
    }
    }

    const application = await prisma.application.findFirst({
      where: { id: applicationId, jobId },
      include: {
        student: {
          include: {
            education: { orderBy: { endYear: 'desc' }, take: 3 },
            user: { select: { id: true, displayName: true, email: true } },
          },
        },
        roundEvaluations: {
          include: {
            round: {
              select: {
                id: true,
                roundNumber: true,
                name: true,
                status: true,
                startedAt: true,
                endedAt: true,
              },
            },
          },
          orderBy: { round: { roundNumber: 'asc' } },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found for this job' });
    }

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { jobId },
      include: {
        rounds: { orderBy: { roundNumber: 'asc' } },
      },
    });

    const hasInterviewSession = !!interviewSession;
    const hasInterviewStarted = (application.lastRoundReached || 0) > 0 ||
      (application.roundEvaluations && application.roundEvaluations.length > 0);

    const tracking = computeApplicationTrackingFields({
      status: application.status,
      screeningStatus: application.screeningStatus,
      interviewStatus: application.interviewStatus,
      lastRoundReached: application.lastRoundReached || 0,
      hasInterviewSession,
      hasInterviewStarted,
      sessionStatus: interviewSession?.status || null,
      sessionRounds: interviewSession?.rounds || null,
    });

    const screeningStatus = normalizeScreeningStatus(application.screeningStatus);
    const screeningStatusText = (() => {
      if (screeningStatus === 'RESUME_REJECTED') return 'Rejected in Resume Screening';
      if (screeningStatus === 'SCREENING_REJECTED') return 'Rejected in Recruiter Screening';
      if (screeningStatus === 'TEST_REJECTED') return 'Rejected in QA Test';
      if (screeningStatus === 'RESUME_SELECTED') return 'Resume Selected';
      if (screeningStatus === 'SCREENING_SELECTED') return 'Recruiter Screening Passed';
      if (screeningStatus === 'TEST_SELECTED') return 'QA Test Passed';
      if (screeningStatus === 'INTERVIEW_ELIGIBLE') return 'Interview Eligible';
      return 'Applied';
    })();

    const screeningPipeline = (() => {
      const passedStatuses = new Set([
        'RESUME_SELECTED', 'SCREENING_SELECTED', 'SCREENING_REJECTED',
        'TEST_SELECTED', 'TEST_REJECTED', 'INTERVIEW_ELIGIBLE',
      ]);
      const recruiterPassed = new Set([
        'SCREENING_SELECTED', 'TEST_SELECTED', 'TEST_REJECTED', 'INTERVIEW_ELIGIBLE',
      ]);
      const testPassed = new Set(['TEST_SELECTED', 'INTERVIEW_ELIGIBLE']);

      const stage = (enabled, passed, rejected, pendingLabel) => {
        if (!enabled) return { enabled: false, status: 'NOT_REQUIRED', label: 'Not required' };
        if (rejected) return { enabled: true, status: 'REJECTED', label: 'Rejected' };
        if (passed) return { enabled: true, status: 'PASSED', label: 'Passed' };
        return { enabled: true, status: 'PENDING', label: pendingLabel };
      };

      return {
        resume: stage(
          true,
          passedStatuses.has(screeningStatus),
          screeningStatus === 'RESUME_REJECTED',
          'Awaiting review'
        ),
        recruiter: stage(
          job.requiresScreening,
          recruiterPassed.has(screeningStatus),
          screeningStatus === 'SCREENING_REJECTED',
          'Awaiting recruiter decision'
        ),
        qaTest: stage(
          job.requiresTest,
          testPassed.has(screeningStatus),
          screeningStatus === 'TEST_REJECTED',
          'Awaiting QA test'
        ),
        finalizedAt: job.screeningSession?.finalizedAt || null,
      };
    })();

    const evaluationByRoundId = new Map(
      (application.roundEvaluations || []).map((e) => [e.roundId, e])
    );

    const interviewRounds = (interviewSession?.rounds || []).map((round) => {
      const evaluation = evaluationByRoundId.get(round.id);
      return {
        roundId: round.id,
        roundNumber: round.roundNumber,
        name: round.name,
        roundStatus: round.status,
        startedAt: round.startedAt,
        endedAt: round.endedAt,
        evaluation: evaluation
          ? {
              status: evaluation.status,
              remarks: evaluation.remarks,
              interviewerEmail: evaluation.interviewerEmail,
              evaluatedAt: evaluation.createdAt,
              updatedAt: evaluation.updatedAt,
            }
          : null,
      };
    });

    const frontendUrl = process.env.FRONTEND_URL || '';
    const publicProfileId = application.student?.publicProfileId || null;
    const profileLink = publicProfileId && frontendUrl
      ? `${frontendUrl}/profile/${publicProfileId}`
      : (publicProfileId ? `/profile/${publicProfileId}` : null);

    res.json({
      success: true,
      job: {
        id: job.id,
        title: job.jobTitle,
        companyName: job.company?.name || job.companyName || 'Unknown Company',
        requiresScreening: job.requiresScreening,
        requiresTest: job.requiresTest,
        driveDate: job.driveDate,
      },
      session: interviewSession
        ? {
            id: interviewSession.id,
            status: interviewSession.status,
            startedAt: interviewSession.startedAt,
            completedAt: interviewSession.completedAt,
          }
        : null,
      application: {
        id: application.id,
        applicationId: application.id,
        studentId: application.studentId,
        status: application.status,
        appliedAt: application.appliedDate,
        interviewDate: application.interviewDate,
        screeningStatus: application.screeningStatus,
        screeningStatusText,
        screeningRemarks: application.screeningRemarks,
        screeningCompletedAt: application.screeningCompletedAt,
        screeningPipeline,
        interviewStatus: application.interviewStatus,
        interviewEligible: screeningStatus === 'INTERVIEW_ELIGIBLE' || screeningStatus === 'TEST_SELECTED',
        currentStage: tracking.currentStage,
        finalStatus: tracking.finalStatus,
        rejectedIn: tracking.rejectedIn,
        lastRoundReached: tracking.lastRoundReached,
        notes: application.notes,
        customAnswers: parseStoredCustomAnswers(application.customAnswers),
      },
      student: {
        id: application.student?.id,
        name: application.student?.fullName || application.student?.user?.displayName || 'Unknown',
        email: application.student?.email || application.student?.user?.email || '',
        enrollmentId: application.student?.enrollmentId || null,
        phone: application.student?.phone || null,
        school: application.student?.school || null,
        batch: application.student?.batch || null,
        center: application.student?.center || null,
        profileLink,
        education: application.student?.education || [],
      },
      interviewRounds,
      evaluations: (application.roundEvaluations || []).map((e) => ({
        roundNumber: e.round?.roundNumber,
        roundName: e.round?.name,
        status: e.status,
        remarks: e.remarks,
        interviewerEmail: e.interviewerEmail,
        evaluatedAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error('❌ [getAdminJobApplicationDetail] Error:', error);
    res.status(500).json({ error: 'Failed to get application details' });
  }
}

/**
 * Apply to job
 * Replaces: applyToJob()
 */
export async function applyToJob(req, res) {
  try {
    const { jobId } = req.params;
    const userId = req.userId;
    const { resumeId, customAnswers } = req.body; // Get resumeId and custom answers from request body

    console.log('📝 [applyToJob] Application request:', {
      jobId,
      userId,
      resumeId,
    });

    // Get student
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Check if already applied
    const existing = await prisma.application.findUnique({
      where: {
        studentId_jobId: {
          studentId: student.id,
          jobId,
        },
      },
    });

    if (existing && existing.status !== 'WITHDRAWN') {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    // Validate resumeId if provided
    if (resumeId) {
      const resume = await prisma.studentResumeFile.findUnique({
        where: { id: resumeId },
        select: { studentId: true },
      });

      if (!resume) {
        return res.status(404).json({ error: 'Resume not found' });
      }

      if (resume.studentId !== student.id) {
        return res.status(403).json({ error: 'Resume does not belong to this student' });
      }

      console.log('✅ [applyToJob] Resume validated:', {
        resumeId,
        studentId: resume.studentId,
      });
    }

    // Get job with full details for email
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        recruiter: {
          include: {
            user: {
              select: {
                email: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'POSTED' || !job.isPosted) {
      return res.status(403).json({
        error: 'Job not available',
        message: 'This job is not open for applications.',
      });
    }

    // CRITICAL: Hard block after application deadline (backend enforcement)
    // No exceptions, no race conditions, no bypass
    if (!job.applicationDeadline) {
      return res.status(500).json({
        error: 'Job configuration error',
        message: 'Application deadline is not set for this job. Please contact admin.'
      });
    }

    const deadline = new Date(job.applicationDeadline);
    const now = new Date();

    if (now > deadline) {
      return res.status(403).json({
        error: 'Applications closed',
        message: 'Applications for this job are closed',
        deadline: job.applicationDeadline,
      });
    }

    // Get student with full details including CGPA, backlogs and batch (for YOP and CGPA/backlogs validation)
    const studentProfile = await prisma.student.findUnique({
      where: { id: student.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        cgpa: true,
        backlogs: true,
        batch: true,
        school: true,
        center: true,
      },
    });

    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const eligibilityError = validateStudentEligibilityForApply(studentProfile, job);
    if (eligibilityError) {
      return res.status(eligibilityError.status).json(eligibilityError.body);
    }

    const policyError = await validatePlacementPolicyForApply(student.id, userId, job);
    if (policyError) {
      return res.status(policyError.status).json(policyError.body);
    }

    // Create application with resumeId (store in notes field for now, or extend schema later)
    // Note: To properly store resumeId, we'd need to add a resumeId field to Application model
    // For now, we'll store it in the notes field as JSON
    const jobQuestions = parseJobCustomQuestions(job);
    const serializedCustomAnswers = normalizeCustomAnswersForApply(jobQuestions, customAnswers);
    if (jobQuestions.length > 0 && serializedCustomAnswers == null) {
      return res.status(400).json({
        error: 'Custom answers required',
        message: 'Please answer all job-specific questions before applying.',
      });
    }

    const initialScreeningStatus = getInitialScreeningStatusForJob(job);
    const applicationData = {
      studentId: student.id,
      jobId,
      companyId: job.companyId || null, // Ensure it's null if undefined
      status: 'APPLIED',
      screeningStatus: initialScreeningStatus,
      screeningCompletedAt: initialScreeningStatus === 'INTERVIEW_ELIGIBLE' ? new Date() : null,
      appliedDate: new Date(),
      notes: resumeId ? JSON.stringify({ resumeId }) : null, // Store resumeId in notes for now
      customAnswers: serializedCustomAnswers || '{}',
    };

    console.log('📝 [applyToJob] Creating application with data:', {
      studentId: applicationData.studentId,
      jobId: applicationData.jobId,
      companyId: applicationData.companyId,
      hasResumeId: !!resumeId,
    });

    const isReapply = Boolean(existing?.status === 'WITHDRAWN');
    const application = isReapply
      ? await prisma.application.update({
        where: { id: existing.id },
        data: {
          ...applicationData,
          interviewStatus: null,
          interviewDate: null,
          lastRoundReached: 0,
          screeningRemarks: null,
          screeningCompletedAt: null,
          customAnswers: serializedCustomAnswers || '{}',
          pipelineStatus: null,
          pipelineSubStatus: null,
        },
        include: {
          job: {
            include: {
              company: true,
            },
          },
        },
      })
      : await prisma.application.create({
        data: applicationData,
        include: {
          job: {
            include: {
              company: true,
            },
          },
        },
      });

    console.log(`✅ [applyToJob] Application ${isReapply ? 're-opened' : 'created'}:`, {
      applicationId: application.id,
      resumeId,
    });

    try {
      await ensureAssessmentAssignmentForJob(student.id, job);
    } catch (assignmentError) {
      console.warn('⚠️ [applyToJob] Assessment assignment skipped:', assignmentError.message);
    }

    // Audit log
    await logAction(req, {
      actionType: 'Apply Job',
      targetType: 'Application',
      targetId: application.id,
      details: `Applied to job: ${job.jobTitle} at ${job.companyName}`,
    });

    // Update student stats
    await prisma.student.update({
      where: { id: student.id },
      data: {
        statsApplied: { increment: 1 },
      },
    });

    // Mark job as viewed/applied in tracking
    try {
      await prisma.jobTracking.upsert({
        where: {
          studentId_jobId: {
            studentId: student.id,
            jobId,
          },
        },
        update: {
          applied: true,
          appliedAt: new Date(),
        },
        create: {
          studentId: student.id,
          jobId,
          applied: true,
          appliedAt: new Date(),
        },
      });
      console.log('✅ [applyToJob] Job tracking updated');
    } catch (trackingError) {
      // Don't fail application creation if tracking fails
      console.warn('⚠️ [applyToJob] Failed to update job tracking:', trackingError);
      logger.warn(`Failed to update job tracking for application ${application.id}:`, trackingError);
    }

    // Send email notifications (to recruiter and applicant)
    try {
      if (studentProfile && job.recruiter) {
        await sendApplicationNotification(studentProfile, job, job.recruiter);
        logger.info(`Application notification sent for application ${application.id}`);
      }
    } catch (emailError) {
      // Don't fail the request if email fails - log and continue
      logger.error(`Failed to send application notification for application ${application.id}:`, emailError);
    }

    // Notify all admins about the new application
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        const studentName = studentProfile?.fullName || 'A student';
        const companyName = job.company?.name || 'Unknown Company';

        await Promise.all(
          admins.map((admin) =>
            createNotification({
              userId: admin.id,
              title: `New Application: ${studentName} applied for ${job.jobTitle}`,
              body: `${studentName} applied for ${job.jobTitle} at ${companyName}.`,
              data: {
                type: 'application',
                applicationId: application.id,
                jobId: job.id,
                jobTitle: job.jobTitle,
                companyName: companyName,
                studentId: student.id,
                studentName: studentName,
                appliedAt: application.appliedDate || new Date(),
              },
            })
          )
        );
        logger.info(`Application notifications sent to ${admins.length} admins for application ${application.id}`);
      }
    } catch (notificationError) {
      // Don't fail application creation if notification fails
      logger.error(`Failed to send application notifications for application ${application.id}:`, notificationError);
    }

    // Format response to match frontend expectations (same format as getStudentApplications)
    const formattedApplication = {
      id: application.id,
      studentId: application.studentId,
      jobId: application.jobId,
      companyId: application.companyId,
      status: application.status,
      screeningStatus: application.screeningStatus || 'APPLIED',
      appliedDate: application.appliedDate,
      interviewDate: application.interviewDate,
      company: application.job?.company || job.company || { name: job.companyName || 'Unknown Company' },
      job: {
        jobTitle: application.job?.jobTitle || job.jobTitle || 'Unknown Position',
        ...application.job,
        ...job, // Include all job fields
      },
      screeningStatusText: 'Applied (Screening Pending)',
      interviewStatus: {
        hasSession: false,
        statusText: null,
        lastRoundStatus: null,
        lastRoundReached: 0,
      },
    };

    // Emit real-time update via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`student:${userId}`).emit('application:created', formattedApplication);
    }

    try {
      const { syncApplicationPipeline } = await import('../services/jobOpportunitiesPipeline.js');
      await syncApplicationPipeline(application.id);
    } catch (pipelineError) {
      logger.warn(`Failed to sync pipeline after apply for application ${application.id}:`, pipelineError);
    }

    // Return formatted application (matching getStudentApplications format)
    res.status(isReapply ? 200 : 201).json(formattedApplication);
  } catch (error) {
    console.error('❌ [applyToJob] Error:', error);
    console.error('❌ [applyToJob] Error message:', error.message);
    console.error('❌ [applyToJob] Error stack:', error.stack);
    console.error('❌ [applyToJob] Error code:', error.code);
    console.error('❌ [applyToJob] Error meta:', error.meta);

    // Provide more detailed error information
    let errorMessage = 'Failed to apply to job';
    let statusCode = 500;

    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      // Unique constraint violation (likely already applied)
      errorMessage = 'Already applied to this job';
      statusCode = 400;
    } else if (error.code === 'P2003') {
      // Foreign key constraint violation
      errorMessage = 'Invalid job or student reference';
      statusCode = 400;
    } else if (error.code === 'P2025') {
      // Record not found
      errorMessage = 'Job or student not found';
      statusCode = 404;
    } else if (error.message) {
      // Use the actual error message if available
      errorMessage = error.message;
    }

    logger.error(`[applyToJob] Failed to apply to job:`, {
      error: errorMessage,
      code: error.code,
      jobId: req.params?.jobId,
      userId: req.userId,
      stack: error.stack,
    });

    res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Update application status
 * Replaces: updateApplicationStatus()
 */
export async function updateApplicationStatus(req, res) {
  try {
    const { applicationId } = req.params;
    const { status, interviewDate, offerCtc, offerStipend, offerLetterUrl, offerDeadlineAt, placementType } = req.body;

    // Get application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const oldStatus = application.status;

    // HARDENING: Prevent updating revoked applications
    try {
      validateApplicationStateTransition(oldStatus, status);
      await assertApplicationEditable(applicationId);
    } catch (err) {
      return res.status(400).json({ error: 'Integrity Violation', message: err.message });
    }

    const normalizedStatus = String(status || '').toUpperCase();
    const syncInterviewStatus = ['SELECTED', 'OFFERED', 'ACCEPTED', 'OFFER_DECLINED', 'JOINED'].includes(normalizedStatus);

    if (normalizedStatus === 'OFFERED') {
      const offerPolicyError = await validatePlacementPolicyForOffer(
        application.studentId,
        application.jobId,
        applicationId,
      );
      if (offerPolicyError) {
        return res.status(offerPolicyError.status).json(offerPolicyError.body);
      }
    }

    const patchData = {
      status: normalizedStatus,
      ...(interviewDate ? { interviewDate: new Date(interviewDate) } : {}),
      ...(syncInterviewStatus ? { interviewStatus: normalizedStatus } : {}),
      ...(offerCtc != null ? { offerCtc: String(offerCtc).trim() || null } : {}),
      ...(offerStipend != null ? { offerStipend: String(offerStipend).trim() || null } : {}),
      ...(offerLetterUrl != null ? { offerLetterUrl: String(offerLetterUrl).trim() || null } : {}),
      ...(offerDeadlineAt != null ? { offerDeadlineAt: offerDeadlineAt ? new Date(offerDeadlineAt) : null } : {}),
      ...(placementType != null ? { placementType: String(placementType).trim().toUpperCase() || null } : {}),
      ...(normalizedStatus === 'JOINED' && oldStatus !== 'JOINED' ? { joinedAt: new Date() } : {}),
    };

    const updated = await patchApplication(applicationId, patchData, {
      include: {
        job: true,
        student: { select: { school: true } },
      },
    });

    // Update student stats
    if (oldStatus !== status) {
      const statsUpdates = {};

      // Decrement old status
      if (oldStatus === 'SHORTLISTED') statsUpdates.statsShortlisted = { decrement: 1 };
      else if (oldStatus === 'INTERVIEWED') statsUpdates.statsInterviewed = { decrement: 1 };
      else if (oldStatus === 'OFFERED') statsUpdates.statsOffers = { decrement: 1 };

      // Increment new status
      if (status === 'SHORTLISTED') statsUpdates.statsShortlisted = { increment: 1 };
      else if (status === 'INTERVIEWED') statsUpdates.statsInterviewed = { increment: 1 };
      else if (normalizedStatus === 'OFFERED') statsUpdates.statsOffers = { increment: 1 };

      if (Object.keys(statsUpdates).length > 0) {
        await prisma.student.update({
          where: { id: application.studentId },
          data: statsUpdates,
        });
      }
    }

    // Create in-app notification for student
    await createNotification({
      userId: application.student.user.id,
      title: 'Application Status Updated',
      body: `Your application for ${updated.job.jobTitle} has been updated to ${status}.`,
      data: {
        type: 'application_status_update',
        applicationId: updated.id,
        jobId: updated.jobId,
        status,
      },
    });

    // Send email notification to student (don't fail if email fails)
    try {
      if (application.student && updated.job) {
        await sendApplicationStatusUpdateNotification(application.student, updated.job, updated);
        logger.info(`Application status update email sent for application ${updated.id}`);
      }
    } catch (emailError) {
      // Don't fail the request if email fails - log and continue
      logger.error(`Failed to send application status update email for application ${updated.id}:`, emailError);
    }

    // Emit real-time update with unified tracker payload
    await notifyStudentApplicationUpdate(applicationId);

    res.json(updated);

    // Audit log
    await logAction(req, {
      actionType: 'Update Application Status',
      targetType: 'Application',
      targetId: applicationId,
      details: `Updated status to ${status || 'N/A'}`,
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
}

/**
 * Student accepts or declines an offer.
 * POST /api/applications/:applicationId/offer-response
 */
export async function respondToOffer(req, res) {
  try {
    const { applicationId } = req.params;
    const { action } = req.body;
    const userId = req.userId;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'action must be accept or decline' });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        student: { include: { user: { select: { id: true } } } },
      },
    });

    if (!application || application.studentId !== student.id) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const current = String(application.status || '').toUpperCase();
    const interviewCurrent = String(application.interviewStatus || '').toUpperCase();
    if (current !== 'OFFERED' && interviewCurrent !== 'OFFERED') {
      return res.status(400).json({
        error: 'No pending offer',
        message: 'This application does not have an active offer to respond to.',
      });
    }

    try {
      await assertApplicationEditable(applicationId);
    } catch (lockErr) {
      return res.status(409).json({ error: lockErr.message });
    }

    const nextStatus = action === 'accept' ? 'ACCEPTED' : 'OFFER_DECLINED';
    const updated = await patchApplication(applicationId, {
      status: nextStatus,
      interviewStatus: nextStatus,
    }, { include: { job: true } });

    await createNotification({
      userId: application.student.user.id,
      title: action === 'accept' ? 'Offer accepted' : 'Offer declined',
      body: action === 'accept'
        ? `You accepted the offer for ${updated.job.jobTitle}.`
        : `You declined the offer for ${updated.job.jobTitle}.`,
      data: {
        type: 'offer_response',
        applicationId,
        jobId: updated.jobId,
        status: nextStatus,
      },
    });

    await notifyStudentApplicationUpdate(applicationId);

    await logAction(req, {
      actionType: action === 'accept' ? 'Accept Offer' : 'Decline Offer',
      targetType: 'Application',
      targetId: applicationId,
      details: `${nextStatus} for ${updated.job.jobTitle}`,
    });

    res.json(updated);
  } catch (error) {
    console.error('respondToOffer error:', error);
    res.status(500).json({ error: 'Failed to record offer response' });
  }
}

/**
 * Withdraw an application (Student action)
 */
export async function withdrawApplication(req, res) {
  try {
    const { applicationId } = req.params;
    const userId = req.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true, statsApplied: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { company: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.studentId !== student.id) {
      return res.status(403).json({ error: 'Not authorized to withdraw this application' });
    }

    const check = canStudentWithdrawApplication(application);
    if (!check.allowed) {
      return res.status(400).json({ error: check.reason });
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'WITHDRAWN',
        interviewStatus: null,
        interviewDate: null,
        lastRoundReached: 0,
        pipelineStatus: null,
        pipelineSubStatus: null,
      },
      include: {
        job: { include: { company: true } },
      },
    });

    if ((student.statsApplied || 0) > 0) {
      await prisma.student.update({
        where: { id: student.id },
        data: { statsApplied: { decrement: 1 } },
      });
    }

    try {
      await prisma.jobTracking.updateMany({
        where: {
          studentId: student.id,
          jobId: application.jobId,
        },
        data: {
          applied: false,
          appliedAt: null,
        },
      });
    } catch (trackingError) {
      logger.warn(`Failed to update job tracking after withdraw for application ${applicationId}:`, trackingError);
    }

    try {
      const { syncApplicationPipeline } = await import('../services/jobOpportunitiesPipeline.js');
      await syncApplicationPipeline(applicationId);
    } catch (pipelineError) {
      logger.warn(`Failed to sync pipeline after withdraw for application ${applicationId}:`, pipelineError);
    }

    await logAction(req, {
      actionType: 'APPLICATION_WITHDRAWN',
      targetType: 'Application',
      targetId: applicationId,
      details: `Student withdrew application for ${application.job?.jobTitle || 'job'}`,
    });

    const io = getIO();
    if (io) {
      io.to(`student:${userId}`).emit('application:withdrawn', {
        applicationId,
        jobId: application.jobId,
      });
    }

    res.json({
      message: 'Application withdrawn successfully',
      application: updated,
    });
  } catch (error) {
    logger.error('Withdraw application error:', error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
}

/**
 * Revoke an application (Admin action)
 */
export async function revokeApplication(req, res) {
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // Get application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: { include: { user: true } },
        job: true,
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.status === 'REVOKED_BY_ADMIN') {
      return res.status(400).json({ error: 'Application is already revoked' });
    }

    const previousStatus = application.status;

    // Update application
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'REVOKED_BY_ADMIN',
        previousStatus: previousStatus,
        revokedBy: adminId,
        revokedAt: new Date(),
        revokedReason: reason || 'No reason provided',
      },
    });

    // Notify student
    await createNotification({
      userId: application.student.user.id,
      title: 'Application Revoked by Admin',
      body: `Your application for ${application.job.jobTitle} has been revoked by an administrator.`,
      data: {
        type: 'application_revoked',
        applicationId: application.id,
        jobId: application.jobId,
        reason: reason,
      },
    });

    // Audit log
    await logAction(req, {
      actionType: 'APPLICATION_REVOKED',
      targetType: 'Application',
      targetId: applicationId,
      details: `Revoked by Admin. Reason: ${reason || 'N/A'}. Previous status: ${previousStatus}`,
    });

    res.json({ message: 'Application revoked successfully', application: updated });
  } catch (error) {
    logger.error('Revoke application error:', error);
    res.status(500).json({ error: 'Failed to revoke application' });
  }
}

/**
 * Restore a revoked application (Admin action)
 */
export async function restoreApplication(req, res) {
  try {
    const { applicationId } = req.params;
    const adminId = req.user.id;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: { include: { user: true } },
        job: true,
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.status !== 'REVOKED_BY_ADMIN') {
      return res.status(400).json({ error: 'Application is not in revoked state' });
    }

    const statusToRestore = application.previousStatus || 'APPLIED';

    // Update application
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: statusToRestore,
        revokedBy: null,
        revokedAt: null,
        revokedReason: null,
        previousStatus: null,
      },
    });

    // Notify student
    await createNotification({
      userId: application.student.user.id,
      title: 'Application Restored',
      body: `Your application for ${application.job.jobTitle} has been restored by an administrator.`,
      data: {
        type: 'application_restored',
        applicationId: application.id,
        jobId: application.jobId,
      },
    });

    // Audit log
    await logAction(req, {
      actionType: 'APPLICATION_RESTORED',
      targetType: 'Application',
      targetId: applicationId,
      details: `Restored from REVOKED_BY_ADMIN to ${statusToRestore}`,
    });

    res.json({ message: 'Application restored successfully', application: updated });
  } catch (error) {
    logger.error('Restore application error:', error);
    res.status(500).json({ error: 'Failed to restore application' });
  }
}

/**
 * Get a short-lived URL to view resume inline (opens in new tab without Bearer)
 * GET /api/applications/:applicationId/resume-view-url
 * Auth: ADMIN or RECRUITER
 */
export async function getResumeViewUrl(req, res) {
  try {
    const { applicationId } = req.params;
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true }
    });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const token = jwt.sign(
      { type: 'application', applicationId: application.id },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    res.json({ url: `/api/resume/view?t=${token}` });
  } catch (error) {
    console.error('Get resume view URL error:', error);
    res.status(500).json({ error: 'Failed to get resume view URL' });
  }
}
