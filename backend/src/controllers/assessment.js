import prisma from '../config/database.js';
import { syncJobApplicationsFromAssessment } from '../services/jobAssessmentBridge.js';
import { sendBulkAssessmentNotifications } from '../services/emailService.js';
import { mcqAnswersMatch } from '../utils/mcqGrading.js';
import {
  findStudentsForBatchIds,
  resolveStudentAssignmentScope,
} from '../utils/studentAssignmentScope.js';
import { gradeCodingAnswer } from '../coding-engine/index.js';
import {
  serializeTestCasesForStorage,
  serializeExamplesForStorage,
} from '../coding-engine/testCaseStorage.js';
import {
  serializeStarterCodesForStorage,
  mergeCodingIntoConfig,
  parseAllowedCodingLanguages,
  parseStarterCodesByLang,
} from '../coding-engine/starterCodeStorage.js';
import {
  normalizeStoredScore,
  pointsToPercent,
  totalQuestionPoints,
  withNormalizedScore,
} from '../utils/assessmentScoring.js';
import {
  getAssessmentEntryStatus,
  mergeJoinWindowIntoConfig,
  parseAssessmentDateInput,
} from '../utils/assessmentEntryWindow.js';
import {
  enrichSessionWithTimer,
  allowsPracticeTimerReset,
} from '../utils/assessmentTimer.js';
import {
  parseSecureModeMeta,
  serializeSecureModeMeta,
  parseProctoringConfig,
  buildPausedMeta,
  buildUnlockedMeta,
  pauseSnapshot,
  isSessionPaused,
  applyAdminFocusPause,
  applyAdminStrictPause,
  ADMIN_FOCUS_VIOLATIONS,
  ADMIN_STRICT_VIOLATIONS,
} from '../utils/assessmentPauseLock.js';
import {
  resolveActiveExamSession,
  getClientDeviceIdFromRequest,
  touchHeartbeatMeta,
  initialSecureMetaExtras,
  mergeDeviceBindingMeta,
  ALLOWED_VIOLATION_TYPES,
} from '../utils/assertActiveExamSession.js';
import {
  parseAssessmentSecurityPolicy,
  evaluateViolationPolicy,
  markTimerReady,
  applySecurityRecovery,
  CaptureEventType,
  SecurityState,
  normalizeSecurityEventType,
  isTimerStarted,
  sessionHasExamActivity,
  getSecurityState,
  shouldDedupeCaptureEvent,
  CAPTURE_VIOLATION_TYPES,
} from '../utils/assessmentSecurityPolicy.js';
import { buildShufflePlan } from '../utils/assessmentShuffle.js';
import {
  sanitizeAssessmentForStudent,
  studentIsAssignedToAssessment,
  redactHiddenEvaluationResults,
} from '../utils/assessmentStudentDto.js';
import {
  buildAssessmentListWhere,
  adminCanAccessSessionById,
  adminCanAccessAssessmentById,
  adminCanAccessStudentById,
  buildScopedStudentWhere,
  isAdminScopeBlocked,
} from '../utils/adminResourceScope.js';
import multer from 'multer';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { signedScreenshotUrl } from '../utils/proctoringScreenshots.js';

/**
 * ASSESSMENT ENGINE CONTROLLER
 * Handles Mock Tests, Mock Interviews, and Proctoring Sessions
 */

const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB (client should compress)
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Invalid screenshot mime type'), ok);
  },
});

function computeRiskLevel(count) {
  if (count >= 7) return 'HIGH';
  if (count >= 3) return 'MEDIUM';
  return 'LOW';
}

function validateCodingAssessmentForPublish(questions, configRaw) {
  const codingQs = (questions || []).filter((q) => q.type === 'CODING');
  if (!codingQs.length) return null;

  const allowed = parseAllowedCodingLanguages(configRaw);
  if (!allowed.length) {
    return 'Select at least one allowed coding language';
  }

  for (const q of codingQs) {
    const title = q.questionText || q.text || 'Coding question';
    const starters = parseStarterCodesByLang(q.starterCodes ?? q.starterCode);
    for (const lang of allowed) {
      if (!String(starters[lang] ?? '').trim()) {
        return `"${title}": starter code required for ${lang}`;
      }
    }
    const cases = q.testCases || [];
    const arr = Array.isArray(cases) ? cases : [];
    const valid = arr.filter(
      (tc) =>
        String(tc?.input ?? '').trim() &&
        String(tc?.expectedOutput ?? tc?.output ?? '').trim()
    );
    if (!valid.length) {
      return `"${title}": at least one judge test case is required`;
    }
  }
  return null;
}

function emitProctoringLiveUpdate(assessmentId, payload) {
  if (!assessmentId) return;
  import('../config/socket.js')
    .then(({ getIO }) => {
      getIO().to(`proctoring:assessment:${assessmentId}`).emit('proctoring:update', payload);
    })
    .catch(() => {});
}

function emitStudentSessionControl(userId, payload) {
  if (!userId) return;
  import('../config/socket.js')
    .then(({ getIO }) => {
      getIO().to(`user:${userId}`).emit('assessment:session-control', payload);
    })
    .catch(() => {});
}

// --- ADMIN MODULES ---

async function notifyAssessmentAssigned(assessment, { targetBatchIds = [], targetStudentIds = [] }) {
  try {
    const { getIO } = await import('../config/socket.js');
    const io = getIO();
    const { type, title } = assessment;

    const batchStudents = targetBatchIds?.length
      ? await findStudentsForBatchIds(targetBatchIds)
      : [];
    const individualStudents = targetStudentIds?.length
      ? await prisma.student.findMany({
          where: { userId: { in: targetStudentIds } },
          include: { user: { select: { email: true } } },
        })
      : [];
    const byUserId = new Map();
    [...batchStudents, ...individualStudents].forEach((s) => {
      byUserId.set(s.userId, s);
    });
    const students = [...byUserId.values()];
    if (!students.length) return;

    await prisma.notification.createMany({
      data: students.map((s) => ({
        userId: s.userId,
        title: 'New Assessment Assigned',
        body: `You have been assigned a new ${type.replace('_', ' ').toLowerCase()}: ${title}`,
        data: JSON.stringify({
          type: 'ASSESSMENT',
          link: '/student?tab=assessments',
        }),
      })),
    });

    students.forEach((s) => {
      io.to(`user:${s.userId}`).emit('notification', {
        title: 'New Assessment',
        message: `A new ${type.replace('_', ' ').toLowerCase()} has been assigned to you.`,
        type: 'ASSESSMENT',
      });
    });

    const studentEmailData = students.map((s) => ({
      ...s,
      email: s.user?.email,
      fullName: s.fullName || 'Student',
    }));

    sendBulkAssessmentNotifications(studentEmailData, assessment).catch((err) =>
      console.error('Email notification background error:', err)
    );
  } catch (notificationError) {
    console.error('Multi-channel notification failed:', notificationError);
  }
}

// Create Assessment
export async function createAssessment(req, res) {
  try {
    const {
      title,
      description,
      type,
      difficulty,
      duration,
      startTime,
      endTime,
      instructions,
      config,
      questions,
      targetBatchIds,
      targetStudentIds,
      scheduledAtMap,
      joinOpensMinutesBeforeStart,
      joinClosesMinutesAfterStart,
      allowedCodingLanguages,
      publish,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Assessment title is required' });
    }

    const isDraft = publish === false;
    let mergedConfig = mergeJoinWindowIntoConfig(config, {
      opensMinutesBeforeStart: joinOpensMinutesBeforeStart,
      closesMinutesAfterStart: joinClosesMinutesAfterStart,
    });
    if (allowedCodingLanguages?.length) {
      mergedConfig = mergeCodingIntoConfig(mergedConfig, allowedCodingLanguages);
    }

    if (!isDraft) {
      const codingErr = validateCodingAssessmentForPublish(questions, mergedConfig);
      if (codingErr) return res.status(400).json({ error: codingErr });
    }

    // Prepare assignments data
    const batchAssignments = (targetBatchIds || []).map((batchId) => ({ batchId }));

    // Resolve studentIds from studentUserIds (passed from frontend)
    let studentAssignments = [];
    if (targetStudentIds && targetStudentIds.length > 0) {
      const targetStudents = await prisma.student.findMany({
        where: { userId: { in: targetStudentIds } },
        select: { id: true, userId: true },
      });

      studentAssignments = targetStudents.map((s) => ({
        studentId: s.id,
        scheduledAt: scheduledAtMap?.[s.userId]
          ? new Date(scheduledAtMap[s.userId])
          : null,
      }));
    }

    // Also assign each student in targeted batches (covers profiles with batch string only)
    if (targetBatchIds?.length) {
      const batchStudents = await findStudentsForBatchIds(targetBatchIds);
      const seen = new Set(studentAssignments.map((a) => a.studentId));
      for (const s of batchStudents) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        studentAssignments.push({
          studentId: s.id,
          scheduledAt: scheduledAtMap?.[s.userId]
            ? new Date(scheduledAtMap[s.userId])
            : null,
        });
      }
    }

    const assessment = await prisma.assessment.create({
      data: {
        title: title.trim(),
        description,
        type,
        difficulty: difficulty || 'MEDIUM',
        duration: parseInt(duration, 10) || 60,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        instructions,
        status: isDraft ? 'DRAFT' : 'PUBLISHED',
        config: JSON.stringify(mergedConfig),
        questions: {
          create: (questions || []).map((q, index) => ({
            questionText: q.text,
            description: q.description,
            type: q.type,
            options: JSON.stringify(q.options || []),
            correctAnswer: q.correctAnswer,
            points: parseInt(q.points) || 1,
            difficulty: q.difficulty || 'MEDIUM',
            starterCode:
              q.type === 'CODING'
                ? serializeStarterCodesForStorage(q.starterCodes ?? q.starterCode)
                : null,
            constraints: q.constraints || null,
            examples: serializeExamplesForStorage(q.examples || []),
            testCases: serializeTestCasesForStorage(q.testCases || []),
            order: index
          }))
        },
        assignments: {
          create: [...batchAssignments, ...studentAssignments]
        }
      }
    });

    if (!isDraft) {
      await notifyAssessmentAssigned(assessment, { targetBatchIds, targetStudentIds });
    }

    res.status(201).json(assessment);
  } catch (error) {
    console.error('Create Assessment Error:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
}

// Get All Assessments (Admin)
export async function getAssessments(req, res) {
  try {
    const role = req.user?.role;
    const scopeWhere =
      role === 'ADMIN'
        ? await buildAssessmentListWhere(req.user.admin, role)
        : {};

    const assessments = await prisma.assessment.findMany({
      where: scopeWhere,
      include: {
        sessions: { select: { id: true, studentId: true, status: true, score: true } },
        questions: { select: { id: true } },
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                profileImageUrl: true,
                user: { select: { displayName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(assessments);
  } catch (error) {
    console.error('[ERROR] getAssessments failed:', error);
    res.status(500).json({ error: 'Failed to fetch assessments', details: error.message });
  }
}

// Get Assessment Details
export async function getAssessmentDetails(req, res) {
  try {
    const { id } = req.params;
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const role = req.user?.role;
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    if (!isAdmin) {
      if (assessment.status === 'DRAFT') {
        return res.status(403).json({ error: 'Assessment not available' });
      }
      const student = await prisma.student.findUnique({
        where: { userId: req.userId || req.user.id },
      });
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }
      const assigned = await studentIsAssignedToAssessment(student, id);
      if (!assigned) {
        return res.status(403).json({ error: 'Assessment not assigned to you' });
      }
      return res.json(sanitizeAssessmentForStudent(assessment));
    }

    if (role === 'ADMIN') {
      const scopeWhere = await buildAssessmentListWhere(req.user.admin, role);
      const allowed = await prisma.assessment.findFirst({
        where: { id, ...scopeWhere },
        select: { id: true },
      });
      if (!allowed) {
        return res.status(403).json({ error: 'Assessment not in your scope' });
      }
    }

    res.json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessment details' });
  }
}

export async function publishAssessment(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.assessment.findUnique({
      where: { id },
      include: {
        assignments: {
          select: { batchId: true, student: { select: { userId: true } } },
        },
      },
    });
    if (!existing) return res.status(404).json({ error: 'Assessment not found' });

    if (existing.status === 'PUBLISHED') {
      return res.json({ message: 'Assessment is already published', assessment: existing });
    }

    const full = await prisma.assessment.findUnique({
      where: { id },
      include: { questions: true },
    });
    const codingErr = validateCodingAssessmentForPublish(full.questions, full.config);
    if (codingErr) return res.status(400).json({ error: codingErr });

    const assessment = await prisma.assessment.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    const targetBatchIds = [
      ...new Set(existing.assignments.map((a) => a.batchId).filter(Boolean)),
    ];
    const targetStudentIds = [
      ...new Set(
        existing.assignments.map((a) => a.student?.userId).filter(Boolean)
      ),
    ];

    await notifyAssessmentAssigned(assessment, { targetBatchIds, targetStudentIds });

    res.json({ message: 'Assessment published', assessment });
  } catch (error) {
    console.error(`[ERROR] Failed to publish assessment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to publish assessment' });
  }
}

export async function updateAssessment(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      duration,
      startTime,
      endTime,
      joinOpensMinutesBeforeStart,
      joinClosesMinutesAfterStart,
      publish,
    } = req.body;
    const existing = await prisma.assessment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Assessment not found' });

    const parsedStart = parseAssessmentDateInput(startTime);
    const parsedEnd = parseAssessmentDateInput(endTime);
    if (parsedStart && parsedEnd && parsedEnd <= parsedStart) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const joinTouched =
      joinOpensMinutesBeforeStart !== undefined || joinClosesMinutesAfterStart !== undefined;
    const nextConfig = joinTouched
      ? mergeJoinWindowIntoConfig(existing.config, {
          opensMinutesBeforeStart: joinOpensMinutesBeforeStart,
          closesMinutesAfterStart: joinClosesMinutesAfterStart,
        })
      : undefined;

    const wasDraft = existing.status === 'DRAFT';
    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        ...(title !== undefined && title !== '' && { title }),
        ...(duration !== undefined && duration !== '' && { duration: parseInt(duration, 10) }),
        ...(startTime !== undefined && { startTime: parsedStart }),
        ...(endTime !== undefined && { endTime: parsedEnd }),
        ...(nextConfig && { config: JSON.stringify(nextConfig) }),
        ...(publish === true && { status: 'PUBLISHED' }),
      },
      include: {
        assignments: {
          select: { batchId: true, student: { select: { userId: true } } },
        },
      },
    });

    if (wasDraft && assessment.status === 'PUBLISHED') {
      const targetBatchIds = [
        ...new Set(assessment.assignments.map((a) => a.batchId).filter(Boolean)),
      ];
      const targetStudentIds = [
        ...new Set(
          assessment.assignments.map((a) => a.student?.userId).filter(Boolean)
        ),
      ];
      await notifyAssessmentAssigned(assessment, { targetBatchIds, targetStudentIds });
    }

    res.json({ message: 'Assessment updated successfully', assessment });
  } catch (error) {
    console.error(`[ERROR] Failed to update assessment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
}

export async function deleteAssessment(req, res) {
  try {
    const { id } = req.params;
    const { deleteAssessmentWithAssets } = await import('../utils/assessmentCleanup.js');
    await deleteAssessmentWithAssets(id);

    res.json({ message: 'Assessment deleted successfully (including proctoring screenshots from Cloudinary)' });
  } catch (error) {
    console.error(`[ERROR] Failed to delete assessment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
}

// --- STUDENT MODULES ---

// Get Assigned Assessments for Student
export async function getStudentAssessments(req, res) {
  try {
    const userId = req.userId || req.user?.id;
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found. Please complete your onboarding.',
      });
    }

    const { assignmentMatch } = await resolveStudentAssignmentScope(student);

    const assessments = await prisma.assessment.findMany({
      where: {
        status: 'PUBLISHED',
        assignments: {
          some: { OR: assignmentMatch },
        },
      },
      include: {
        sessions: {
          where: { studentId: student.id },
        },
        assignments: {
          where: { OR: assignmentMatch },
          select: { scheduledAt: true, studentId: true, batchId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(assessments);
  } catch (error) {
    console.error('getStudentAssessments error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned assessments' });
  }
}

async function markSessionAutoSubmitted(sessionId) {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: { assessment: { include: { questions: true } } },
  });
  if (!session || session.status !== 'IN_PROGRESS') return;

  const stored = parseStoredResponses(session.responses);
  const answers = coerceAnswersPayload(stored.rawAnswers ?? stored);
  const questions = session.assessment?.questions || [];
  const { calculatedScore, hasDescriptive, executionLogs } = await evaluateSubmittedAnswers(
    questions,
    answers,
    { skipCoding: true }
  );
  const maxPoints = totalQuestionPoints(questions);
  const scorePercent = pointsToPercent(calculatedScore, questions);

  await prisma.assessmentSession.updateMany({
    where: { id: sessionId, status: 'IN_PROGRESS' },
    data: {
      status: hasDescriptive ? 'PENDING_REVIEW' : 'COMPLETED',
      endTime: new Date(),
      score: scorePercent,
      responses: JSON.stringify({
        rawAnswers: answers,
        executionLogs,
        pointsEarned: calculatedScore,
        maxPoints,
        autoSubmitted: true,
      }),
    },
  });
}

async function respondWithExistingSession(session, assessment, res, { clientDeviceId, forceDeviceTakeover } = {}) {
  if (session.status !== 'IN_PROGRESS') {
    return res.status(403).json({
      error: 'Assessment already completed',
      status: session.status,
      sessionId: session.id,
    });
  }

  const meta = parseSecureModeMeta(session.secureModeMeta);
  if (
    clientDeviceId &&
    meta.clientDeviceId &&
    meta.clientDeviceId !== clientDeviceId &&
    !forceDeviceTakeover
  ) {
    return res.status(409).json({
      error: 'This attempt is active on another device/browser',
      code: 'DEVICE_CONFLICT',
      sessionId: session.id,
    });
  }

  let working = session;
  if (clientDeviceId && (forceDeviceTakeover || !meta.clientDeviceId || meta.clientDeviceId !== clientDeviceId)) {
    working = await prisma.assessmentSession.update({
      where: { id: session.id },
      data: {
        secureModeMeta: serializeSecureModeMeta(mergeDeviceBindingMeta(meta, clientDeviceId)),
      },
    });
  }

  const payload = enrichSessionWithTimer(working, assessment.duration);
  if (!payload.timeExpired) {
    return res.json(payload);
  }

  if (allowsPracticeTimerReset(assessment)) {
    const reset = await prisma.assessmentSession.update({
      where: { id: working.id },
      data: { startTime: new Date() },
    });
    return res.json(enrichSessionWithTimer(reset, assessment.duration));
  }

  await markSessionAutoSubmitted(working.id);
  return res.status(403).json({
    error: 'Assessment time has expired',
    code: 'TIME_EXPIRED',
    autoSubmitted: true,
    session: payload,
  });
}

// Start Assessment Session
export async function startSession(req, res) {
  try {
    const { assessmentId } = req.params;
    const clientDeviceId = req.body?.clientDeviceId ? String(req.body.clientDeviceId).slice(0, 128) : null;
    const forceDeviceTakeover = req.body?.forceDeviceTakeover === true;

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        title: true,
        config: true,
        status: true,
        duration: true,
        type: true,
        questions: { select: { id: true, type: true, options: true } },
      },
    });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    if (assessment.status === 'DRAFT') {
      return res.status(403).json({ error: 'This assessment is not published yet', code: 'DRAFT' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.userId || req.user.id },
    });

    if (!student) {
      console.error(`❌ startSession failed: Student profile not found for userId ${req.userId || req.user.id}`);
      return res.status(404).json({ error: 'Student profile not found. Please complete your onboarding.' });
    }

    const assigned = await studentIsAssignedToAssessment(student, assessmentId);
    if (!assigned) {
      return res.status(403).json({ error: 'Assessment not assigned to you' });
    }

    let session = await prisma.assessmentSession.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId: student.id } },
    });

    if (session) {
      return respondWithExistingSession(session, assessment, res, { clientDeviceId, forceDeviceTakeover });
    }

    const entry = getAssessmentEntryStatus(assessment);
    if (entry.status === 'TOO_EARLY') {
      return res.status(403).json({
        error: 'Assessment entry has not opened yet',
        entryOpensAt: entry.entryOpensAt,
        entryClosesAt: entry.entryClosesAt,
        joinWindow: entry.joinWindow,
      });
    }
    if (entry.status === 'TOO_LATE') {
      return res.status(403).json({
        error: 'Assessment entry window has closed',
        entryClosesAt: entry.entryClosesAt,
        joinWindow: entry.joinWindow,
      });
    }

    const otherActive = await prisma.assessmentSession.findFirst({
      where: {
        studentId: student.id,
        status: 'IN_PROGRESS',
        assessmentId: { not: assessmentId },
      },
      select: { id: true, assessmentId: true, startTime: true },
    });
    if (otherActive) {
      return res.status(409).json({
        error: 'Another assessment attempt is already active. Finish or submit it before starting a new one.',
        code: 'OTHER_ASSESSMENT_ACTIVE',
        activeSessionId: otherActive.id,
        activeAssessmentId: otherActive.assessmentId,
      });
    }

    try {
      const shufflePlan = buildShufflePlan({
        assessmentConfig: assessment.config,
        questions: assessment.questions,
        sessionId: `${assessmentId}:${student.id}`,
        studentId: student.id,
      });
      const secureMeta = {
        ...(shufflePlan || {}),
        ...initialSecureMetaExtras(clientDeviceId),
      };

      session = await prisma.assessmentSession.create({
        data: {
          assessmentId,
          studentId: student.id,
          status: 'IN_PROGRESS',
          ...(Object.keys(secureMeta).length
            ? { secureModeMeta: serializeSecureModeMeta(secureMeta) }
            : {}),
        }
      });
    } catch (createError) {
      // Handle React 18 Strict Mode double-mounting race condition
      if (createError.code === 'P2002') {
        session = await prisma.assessmentSession.findUnique({
          where: { assessmentId_studentId: { assessmentId, studentId: student.id } }
        });
        if (session) {
          return respondWithExistingSession(session, assessment, res, { clientDeviceId, forceDeviceTakeover });
        }
      } else {
        throw createError;
      }
    }

    res.status(201).json(enrichSessionWithTimer(session, assessment.duration));
  } catch (error) {
    console.error('startSession error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
}

// Submit Violation
const violationRateBuckets = new Map();
function violationRateOk(sessionId) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 80;
  let bucket = violationRateBuckets.get(sessionId);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    violationRateBuckets.set(sessionId, bucket);
  }
  bucket.count += 1;
  return bucket.count <= max;
}

export async function logViolation(req, res) {
  try {
    const { sessionId } = req.params;
    const { type, details, meta } = req.body || {};

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'Violation type is required' });
    }
    const violationType = String(type).slice(0, 64);
    if (!ALLOWED_VIOLATION_TYPES.has(violationType)) {
      return res.status(400).json({ error: 'Invalid violation type' });
    }
    if (!violationRateOk(sessionId)) {
      return res.status(429).json({ error: 'Too many violation reports' });
    }

    const resolved = await resolveActiveExamSession(prisma, {
      sessionId,
      userId: req.userId || req.user?.id,
      clientDeviceId: getClientDeviceIdFromRequest(req),
      requireUnpaused: false,
      requireNotExpired: false,
      checkHeartbeat: true,
      bindDevice: true,
    });
    if (!resolved.ok) {
      return res.status(resolved.status).json(resolved.body);
    }

    const session = resolved.session;
    const secureBefore = parseSecureModeMeta(session.secureModeMeta);
    const normalizedType = normalizeSecurityEventType(violationType);

    if (
      (CAPTURE_VIOLATION_TYPES.has(violationType) ||
        normalizedType === CaptureEventType.DETECTED) &&
      shouldDedupeCaptureEvent(secureBefore)
    ) {
      const snap = pauseSnapshot(session.secureModeMeta);
      const enriched = enrichSessionWithTimer(session, session.assessment?.duration);
      return res.json({
        success: true,
        deduped: true,
        violationsCount: session.violationsCount,
        paused: snap.paused,
        pauseReason: snap.pauseReason,
        securityState: snap.securityState,
        remainingSeconds: enriched.remainingSeconds,
      });
    }

    const metaObj = meta
      ? (typeof meta === 'string' ? (() => { try { return JSON.parse(meta); } catch { return {}; } })() : meta)
      : {};
    const severity = metaObj.severity || 'MEDIUM';

    await prisma.assessmentViolation.create({
      data: {
        sessionId,
        type: normalizedType === CaptureEventType.DETECTED ? CaptureEventType.DETECTED : violationType,
        severity: String(severity).slice(0, 16),
        details: details ? String(details).slice(0, 2000) : null,
        meta: JSON.stringify({ ...metaObj, originalType: violationType }),
      }
    });

    // Increment violation count in session
    let updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        violationsCount: { increment: 1 },
        warningCount: { increment: 1 },
        lastWarningAt: new Date(),
      }
    });

    // Pause lock: tab-switch grace, fullscreen exit, window blur, capture policy
    let pauseInfo = pauseSnapshot(updated.secureModeMeta);
    const policy = parseAssessmentSecurityPolicy(session.assessment?.config);
    const proctorCfg = parseProctoringConfig(session.assessment?.config);
    if (session.status === 'IN_PROGRESS') {
      const secure = parseSecureModeMeta(updated.secureModeMeta);

      if (!pauseInfo.paused) {
        if (proctorCfg.pauseOnTabSwitch && violationType === 'TAB_SWITCH') {
          const tabSwitchCount = (Number(secure.tabSwitchCount) || 0) + 1;
          let nextMeta = { ...secure, tabSwitchCount };
          if (tabSwitchCount > proctorCfg.tabSwitchGraceCount) {
            nextMeta = buildPausedMeta(nextMeta, { reason: 'TAB_SWITCH', tabSwitchCount });
          }
          updated = await prisma.assessmentSession.update({
            where: { id: sessionId },
            data: { secureModeMeta: serializeSecureModeMeta(nextMeta) },
          });
          pauseInfo = pauseSnapshot(updated.secureModeMeta);
        } else if (
          ADMIN_FOCUS_VIOLATIONS.has(violationType) &&
          (violationType !== 'FULLSCREEN_EXIT' || proctorCfg.fullscreenRequired)
        ) {
          const focus = applyAdminFocusPause(secure, { violationType });
          if (!focus.deduped && focus.paused) {
            updated = await prisma.assessmentSession.update({
              where: { id: sessionId },
              data: { secureModeMeta: serializeSecureModeMeta(focus.nextMeta) },
            });
            pauseInfo = pauseSnapshot(updated.secureModeMeta);
          }
        } else if (ADMIN_STRICT_VIOLATIONS.has(violationType)) {
          const strict = applyAdminStrictPause(secure, { violationType });
          if (!strict.deduped && strict.paused) {
            updated = await prisma.assessmentSession.update({
              where: { id: sessionId },
              data: { secureModeMeta: serializeSecureModeMeta(strict.nextMeta) },
            });
            pauseInfo = pauseSnapshot(updated.secureModeMeta);
          }
        }
      }

      const policyResult = evaluateViolationPolicy({
        policy,
        violationType,
        secureMeta: updated.secureModeMeta,
        violationsCount: updated.violationsCount,
      });
      if (policyResult.securityPaused || policyResult.terminate) {
        updated = await prisma.assessmentSession.update({
          where: { id: sessionId },
          data: {
            secureModeMeta: serializeSecureModeMeta(policyResult.nextMeta),
            ...(policyResult.terminate
              ? { status: 'TERMINATED', endTime: new Date() }
              : {}),
          },
        });
        pauseInfo = pauseSnapshot(updated.secureModeMeta);
      }
    }

    // Risk engine (server-side single source of truth)
    await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { riskLevel: computeRiskLevel(updated.violationsCount) },
    });

    const latest = await prisma.assessmentViolation.findFirst({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      select: { id: true, type: true, severity: true, details: true, timestamp: true },
    });

    emitProctoringLiveUpdate(session.assessmentId, {
      assessmentId: session.assessmentId,
      kind: 'violation',
      sessionId,
      violation: latest,
      violationsCount: updated.violationsCount,
      paused: pauseInfo.paused,
      pauseReason: pauseInfo.pauseReason,
      tabSwitchCount: pauseInfo.tabSwitchCount,
      focusStrikeCount: pauseInfo.focusStrikeCount,
    });

    if (pauseInfo.paused) {
      const pausePayload = {
        assessmentId: session.assessmentId,
        kind: 'paused',
        sessionId,
        paused: true,
        pauseReason: pauseInfo.pauseReason,
        remainingSeconds: enrichSessionWithTimer(updated, session.assessment?.duration).remainingSeconds,
        studentName: session.student?.fullName,
        tabSwitchCount: pauseInfo.tabSwitchCount,
        focusStrikeCount: pauseInfo.focusStrikeCount,
      };
      emitProctoringLiveUpdate(session.assessmentId, pausePayload);
      emitStudentSessionControl(session.student?.userId, pausePayload);
    }

    res.json({
      success: true,
      violation: latest,
      violationsCount: updated.violationsCount,
      riskLevel: computeRiskLevel(updated.violationsCount),
      paused: pauseInfo.paused,
      pauseReason: pauseInfo.pauseReason,
      tabSwitchCount: pauseInfo.tabSwitchCount,
      focusStrikeCount: pauseInfo.focusStrikeCount,
      remainingSeconds: enrichSessionWithTimer(updated, session.assessment?.duration).remainingSeconds,
    });
  } catch (error) {
    console.error('logViolation error:', error);
    res.status(500).json({ error: 'Failed to log violation' });
  }
}

/** Student autosave — keeps answers so unlock can resume mid-exam. */
export async function saveSessionProgress(req, res) {
  try {
    const { sessionId } = req.params;
    const { answers, markedForReview } = req.body || {};

    const resolved = await resolveActiveExamSession(prisma, {
      sessionId,
      userId: req.userId || req.user?.id,
      clientDeviceId: getClientDeviceIdFromRequest(req),
      requireUnpaused: true,
      requireNotExpired: true,
      checkHeartbeat: true,
      bindDevice: true,
    });
    if (!resolved.ok) {
      return res.status(resolved.status).json(resolved.body);
    }

    const session = resolved.session;
    const rawAnswers = coerceAnswersPayload(answers);
    if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
      return res.status(400).json({ error: 'Answers object required' });
    }

    const existing = parseStoredResponses(session.responses);
    const updateResult = await prisma.assessmentSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: {
        responses: JSON.stringify({
          ...existing,
          rawAnswers,
          ...(Array.isArray(markedForReview) ? { markedForReview } : {}),
          draft: true,
          savedAt: new Date().toISOString(),
        }),
      },
    });

    if (updateResult.count === 0) {
      const current = await prisma.assessmentSession.findUnique({
        where: { id: sessionId },
        select: { status: true },
      });
      return res.status(409).json({
        error: 'Assessment already submitted',
        status: current?.status,
        sessionId,
      });
    }

    const updated = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
    });

    const pause = pauseSnapshot(updated?.secureModeMeta);
    res.json({
      success: true,
      paused: pause.paused,
      remainingSeconds: enrichSessionWithTimer(updated || session, session.assessment?.duration).remainingSeconds,
    });
  } catch (error) {
    console.error('saveSessionProgress error:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
}

/** Student: fetch in-progress attempt for resume after reload (does not create a session). */
export async function getActiveAssessmentSession(req, res) {
  try {
    const { assessmentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { userId: req.userId || req.user.id },
    });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const assigned = await studentIsAssignedToAssessment(student, assessmentId);
    if (!assigned) return res.status(403).json({ error: 'Assessment not assigned to you' });

    const session = await prisma.assessmentSession.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId: student.id } },
      include: {
        assessment: { select: { duration: true, type: true } },
        violations: {
          orderBy: { timestamp: 'asc' },
          select: { id: true, type: true, severity: true, details: true, timestamp: true },
        },
      },
    });

    if (!session || session.status !== 'IN_PROGRESS') {
      return res.json({ active: false });
    }

    const enriched = enrichSessionWithTimer(session, session.assessment?.duration);
    if (enriched.timeExpired && !allowsPracticeTimerReset(session.assessment)) {
      return res.json({ active: false, expired: true });
    }

    res.json({
      active: true,
      session: {
        ...enriched,
        responses: session.responses,
        violationsCount: session.violationsCount,
      },
      violations: session.violations || [],
    });
  } catch (error) {
    console.error('getActiveAssessmentSession error:', error);
    res.status(500).json({ error: 'Failed to fetch active session' });
  }
}

/** Student poll — pause / timer state without mutating the session. */
export async function getStudentSessionStatus(req, res) {
  try {
    const { sessionId } = req.params;
    const resolved = await resolveActiveExamSession(prisma, {
      sessionId,
      userId: req.userId || req.user?.id,
      clientDeviceId: getClientDeviceIdFromRequest(req),
      requireUnpaused: false,
      requireNotExpired: false,
      checkHeartbeat: true,
      bindDevice: false,
    });
    if (!resolved.ok) {
      if (resolved.status === 409) {
        return res.status(409).json(resolved.body);
      }
      if (resolved.status === 404) {
        return res.status(404).json(resolved.body);
      }
      if (resolved.status === 403) {
        return res.status(403).json(resolved.body);
      }
    }

    const session = resolved.ok ? resolved.session : await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { userId: true } },
        assessment: { select: { duration: true } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.student?.userId !== (req.userId || req.user?.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const enriched = enrichSessionWithTimer(session, session.assessment?.duration);
    const meta = parseSecureModeMeta(session.secureModeMeta);
    res.json({
      id: session.id,
      status: session.status,
      paused: enriched.paused,
      pauseReason: enriched.pauseReason,
      tabSwitchCount: enriched.tabSwitchCount,
      focusStrikeCount: enriched.focusStrikeCount,
      remainingSeconds: enriched.remainingSeconds,
      extraSeconds: Number(meta.extraSeconds) || 0,
      timeExpired: enriched.timeExpired,
      violationsCount: session.violationsCount,
      riskLevel: session.riskLevel,
      securityState: getSecurityState(session.secureModeMeta),
      timerStarted: isTimerStarted(session),
    });
  } catch (error) {
    console.error('getStudentSessionStatus error:', error);
    res.status(500).json({ error: 'Failed to fetch session status' });
  }
}

/** Student heartbeat — keeps server aware the exam tab is alive. */
export async function postSessionHeartbeat(req, res) {
  try {
    const { sessionId } = req.params;
    const resolved = await resolveActiveExamSession(prisma, {
      sessionId,
      userId: req.userId || req.user?.id,
      clientDeviceId: getClientDeviceIdFromRequest(req),
      requireUnpaused: true,
      requireNotExpired: true,
      checkHeartbeat: false,
      bindDevice: true,
    });
    if (!resolved.ok) {
      return res.status(resolved.status).json(resolved.body);
    }

    const meta = touchHeartbeatMeta(resolved.meta);
    const updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { secureModeMeta: serializeSecureModeMeta(meta) },
    });

    const enriched = enrichSessionWithTimer(updated, resolved.assessment?.duration);
    res.json({
      ok: true,
      remainingSeconds: enriched.remainingSeconds,
      paused: enriched.paused,
      pauseReason: enriched.pauseReason,
      securityState: getSecurityState(updated.secureModeMeta),
      timerStarted: isTimerStarted(updated),
    });
  } catch (error) {
    console.error('postSessionHeartbeat error:', error);
    res.status(500).json({ error: 'Failed to record heartbeat' });
  }
}

/** Start authoritative timer after pre-assessment security gate passes. */
export async function postSecurityReady(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { userId: true } },
        assessment: { select: { duration: true, config: true } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.student?.userId !== (req.userId || req.user?.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (session.status !== 'IN_PROGRESS') {
      return res.status(409).json({ error: 'Session not in progress', status: session.status });
    }

    const meta = parseSecureModeMeta(session.secureModeMeta);
    if (isTimerStarted(session)) {
      const enriched = enrichSessionWithTimer(session, session.assessment?.duration);
      return res.json({
        success: true,
        alreadyReady: true,
        securityState: getSecurityState(meta),
        timerStarted: true,
        remainingSeconds: enriched.remainingSeconds,
      });
    }

    let nextMeta;
    if (sessionHasExamActivity(session)) {
      const anchor =
        meta.timerStartedAt ||
        meta.readyAt ||
        (session.startTime ? new Date(session.startTime).toISOString() : null);
      nextMeta = markTimerReady(anchor ? { ...meta, timerStartedAt: anchor, readyAt: meta.readyAt || anchor } : meta);
    } else {
      nextMeta = markTimerReady(meta);
    }
    const updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { secureModeMeta: serializeSecureModeMeta(nextMeta) },
    });
    const enriched = enrichSessionWithTimer(updated, session.assessment?.duration);
    res.json({
      success: true,
      securityState: SecurityState.IN_PROGRESS,
      timerStarted: true,
      remainingSeconds: enriched.remainingSeconds,
    });
  } catch (error) {
    console.error('postSecurityReady error:', error);
    res.status(500).json({ error: 'Failed to start assessment timer' });
  }
}

/** Server-authorized recovery after capture stops and client re-check passes. */
export async function postSecurityRecovery(req, res) {
  try {
    const { sessionId } = req.params;
    const resolved = await resolveActiveExamSession(prisma, {
      sessionId,
      userId: req.userId || req.user?.id,
      clientDeviceId: getClientDeviceIdFromRequest(req),
      requireUnpaused: false,
      requireNotExpired: false,
      checkHeartbeat: false,
      bindDevice: true,
    });
    if (!resolved.ok) {
      return res.status(resolved.status).json(resolved.body);
    }

    const session = resolved.session;
    const policy = parseAssessmentSecurityPolicy(session.assessment?.config);
    const meta = parseSecureModeMeta(session.secureModeMeta);

    if (!meta.paused || meta.pauseReason !== 'SCREEN_CAPTURE') {
      const enriched = enrichSessionWithTimer(session, session.assessment?.duration);
      return res.json({
        success: true,
        alreadyActive: true,
        paused: enriched.paused,
        securityState: getSecurityState(meta),
        remainingSeconds: enriched.remainingSeconds,
      });
    }

    if (!policy.recovery.enabled) {
      return res.status(403).json({
        error: 'Security recovery is disabled for this assessment. Contact an admin.',
      });
    }

    if (policy.recovery.requireSecurityCheck && req.body?.checksPassed !== true) {
      return res.status(400).json({
        error: 'Security re-check must pass before recovery',
        code: 'SECURITY_CHECK_REQUIRED',
      });
    }

    const nextMeta = applySecurityRecovery(meta);
    const updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { secureModeMeta: serializeSecureModeMeta(nextMeta) },
    });

    const enriched = enrichSessionWithTimer(updated, session.assessment?.duration);
    const payload = {
      assessmentId: session.assessmentId,
      kind: 'unlocked',
      sessionId,
      paused: false,
      pauseReason: null,
      remainingSeconds: enriched.remainingSeconds,
      securityState: SecurityState.IN_PROGRESS,
    };
    emitStudentSessionControl(session.student?.userId, payload);

    res.json({
      success: true,
      paused: false,
      securityState: SecurityState.IN_PROGRESS,
      remainingSeconds: enriched.remainingSeconds,
    });
  } catch (error) {
    console.error('postSecurityRecovery error:', error);
    res.status(500).json({ error: 'Failed to recover session' });
  }
}

/** Student self-resume disabled — all server pauses require admin unlock. */
export async function resumeAssessmentAfterFullscreen(req, res) {
  try {
    const { sessionId } = req.params;

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { userId: true } },
        assessment: { select: { duration: true } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.student?.userId !== (req.userId || req.user?.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const snap = pauseSnapshot(session.secureModeMeta);
    const enriched = enrichSessionWithTimer(session, session.assessment?.duration);
    return res.status(403).json({
      error: 'This exam can only be resumed by an admin from the live monitor.',
      paused: snap.paused,
      pauseReason: snap.pauseReason,
      remainingSeconds: enriched.remainingSeconds,
    });
  } catch (error) {
    console.error('resumeAssessmentAfterFullscreen error:', error);
    res.status(500).json({ error: 'Failed to resume exam' });
  }
}

/** Admin unlock — student can continue same attempt with saved answers; timer stays frozen during pause. */
export async function unlockAssessmentSession(req, res) {
  try {
    const { sessionId } = req.params;
    const role = req.user?.role;

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { id: true, fullName: true, userId: true } },
        assessment: { select: { id: true, duration: true } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (role === 'ADMIN') {
      const allowed = await adminCanAccessSessionById(sessionId, req.user.admin, role);
      if (!allowed) {
        return res.status(403).json({ error: 'Session not in your scope' });
      }
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Only in-progress sessions can be unlocked' });
    }

    if (!isSessionPaused(session)) {
      const enriched = enrichSessionWithTimer(session, session.assessment?.duration);
      return res.json({
        success: true,
        alreadyUnlocked: true,
        paused: false,
        remainingSeconds: enriched.remainingSeconds,
      });
    }

    const nextMeta = {
      ...buildUnlockedMeta(session.secureModeMeta),
      unlockedBy: req.userId || req.user?.id || null,
    };

    const updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { secureModeMeta: serializeSecureModeMeta(nextMeta) },
    });

    const enriched = enrichSessionWithTimer(updated, session.assessment?.duration);

    const unlockPayload = {
      assessmentId: session.assessmentId,
      kind: 'unlocked',
      sessionId,
      paused: false,
      remainingSeconds: enriched.remainingSeconds,
      studentName: session.student?.fullName,
      unlockedBy: nextMeta.unlockedBy,
    };
    emitProctoringLiveUpdate(session.assessmentId, unlockPayload);
    emitStudentSessionControl(session.student?.userId, unlockPayload);

    res.json({
      success: true,
      paused: false,
      remainingSeconds: enriched.remainingSeconds,
      sessionId,
    });
  } catch (error) {
    console.error('unlockAssessmentSession error:', error);
    res.status(500).json({ error: 'Failed to unlock session' });
  }
}

/** Admin: add extra minutes to an in-progress attempt (timer extension). */
export async function extendAssessmentSession(req, res) {
  try {
    const { sessionId } = req.params;
    const role = req.user?.role;
    const minutes = Number(req.body?.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 180) {
      return res.status(400).json({ error: 'minutes must be between 1 and 180' });
    }

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { fullName: true, userId: true } },
        assessment: { select: { id: true, duration: true } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (role === 'ADMIN') {
      const allowed = await adminCanAccessSessionById(sessionId, req.user.admin, role);
      if (!allowed) return res.status(403).json({ error: 'Session not in your scope' });
    }
    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Only in-progress sessions can be extended' });
    }

    const meta = parseSecureModeMeta(session.secureModeMeta);
    const extraSeconds = (Number(meta.extraSeconds) || 0) + Math.round(minutes * 60);
    const updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        secureModeMeta: serializeSecureModeMeta({
          ...meta,
          extraSeconds,
          lastExtendedAt: new Date().toISOString(),
          lastExtendedBy: req.userId || req.user?.id || null,
        }),
      },
    });

    const enriched = enrichSessionWithTimer(updated, session.assessment?.duration);
    const extendPayload = {
      assessmentId: session.assessmentId,
      kind: 'extended',
      sessionId,
      studentName: session.student?.fullName,
      extraSeconds,
      remainingSeconds: enriched.remainingSeconds,
    };
    emitProctoringLiveUpdate(session.assessmentId, extendPayload);
    emitStudentSessionControl(session.student?.userId, extendPayload);

    res.json({
      success: true,
      extraSeconds,
      remainingSeconds: enriched.remainingSeconds,
    });
  } catch (error) {
    console.error('extendAssessmentSession error:', error);
    res.status(500).json({ error: 'Failed to extend session' });
  }
}

/** Admin: freeze a live attempt until unlocked (timer pauses). */
export async function pauseAssessmentSession(req, res) {
  try {
    const { sessionId } = req.params;
    const role = req.user?.role;
    const reason = String(req.body?.reason || 'ADMIN_PAUSE').slice(0, 32) || 'ADMIN_PAUSE';

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { userId: true, fullName: true } },
        assessment: { select: { id: true, duration: true } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (role === 'ADMIN') {
      const allowed = await adminCanAccessSessionById(sessionId, req.user.admin, role);
      if (!allowed) return res.status(403).json({ error: 'Session not in your scope' });
    }
    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Only in-progress sessions can be paused' });
    }

    if (isSessionPaused(session)) {
      const enriched = enrichSessionWithTimer(session, session.assessment?.duration);
      const snap = pauseSnapshot(session.secureModeMeta);
      return res.json({
        success: true,
        alreadyPaused: true,
        paused: true,
        pauseReason: snap.pauseReason,
        remainingSeconds: enriched.remainingSeconds,
      });
    }

    const nextMeta = {
      ...buildPausedMeta(session.secureModeMeta, { reason }),
      pausedBy: req.userId || req.user?.id || null,
    };
    const updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { secureModeMeta: serializeSecureModeMeta(nextMeta) },
    });
    const enriched = enrichSessionWithTimer(updated, session.assessment?.duration);
    const payload = {
      assessmentId: session.assessmentId,
      kind: 'paused',
      sessionId,
      paused: true,
      pauseReason: reason,
      remainingSeconds: enriched.remainingSeconds,
      studentName: session.student?.fullName,
    };
    emitProctoringLiveUpdate(session.assessmentId, payload);
    emitStudentSessionControl(session.student?.userId, payload);

    res.json({
      success: true,
      paused: true,
      pauseReason: reason,
      remainingSeconds: enriched.remainingSeconds,
      sessionId,
    });
  } catch (error) {
    console.error('pauseAssessmentSession error:', error);
    res.status(500).json({ error: 'Failed to pause session' });
  }
}

/** Admin: force-submit using latest drafted answers (or empty). */
export async function forceSubmitAssessmentSession(req, res) {
  try {
    const { sessionId } = req.params;
    const role = req.user?.role;

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { fullName: true, email: true, userId: true } },
        assessment: {
          include: { questions: true },
        },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (role === 'ADMIN') {
      const allowed = await adminCanAccessSessionById(sessionId, req.user.admin, role);
      if (!allowed) return res.status(403).json({ error: 'Session not in your scope' });
    }
    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Session is not in progress' });
    }

    const stored = parseStoredResponses(session.responses);
    let answers = coerceAnswersPayload(stored.rawAnswers ?? stored);
    if (req.body?.answers) {
      answers = { ...answers, ...coerceAnswersPayload(req.body.answers) };
    }

    const questions = session.assessment.questions || [];
    const { calculatedScore, hasDescriptive, executionLogs } = await evaluateSubmittedAnswers(
      questions,
      answers
    );
    const maxPoints = totalQuestionPoints(questions);
    const scorePercent = pointsToPercent(calculatedScore, questions);
    const updateResult = await prisma.assessmentSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: {
        status: hasDescriptive ? 'PENDING_REVIEW' : 'COMPLETED',
        endTime: new Date(),
        score: scorePercent,
        responses: JSON.stringify({
          rawAnswers: answers,
          executionLogs,
          pointsEarned: calculatedScore,
          maxPoints,
          forceSubmitted: true,
          forceSubmittedBy: req.userId || req.user?.id || null,
          forceSubmittedAt: new Date().toISOString(),
        }),
      },
    });

    if (!updateResult.count) {
      return res.status(409).json({ error: 'Session already completed' });
    }

    emitProctoringLiveUpdate(session.assessmentId, {
      assessmentId: session.assessmentId,
      kind: 'force_submitted',
      sessionId,
      studentName: session.student?.fullName,
    });
    emitStudentSessionControl(session.student?.userId, {
      assessmentId: session.assessmentId,
      kind: 'force_submitted',
      sessionId,
    });

    if (session.student?.email || session.studentId) {
      const email = session.student?.email
        ? String(session.student.email).trim().toLowerCase()
        : null;
      if (email) {
        try {
          await prisma.assessmentInviteEmail.updateMany({
            where: { assessmentId: session.assessmentId, email },
            data: { status: 'COMPLETED', studentId: session.studentId },
          });
        } catch (inviteErr) {
          console.error('Invite email status update failed:', inviteErr);
        }
      }
    }

    res.json({
      success: true,
      status: hasDescriptive ? 'PENDING_REVIEW' : 'COMPLETED',
      score: scorePercent,
    });
  } catch (error) {
    console.error('forceSubmitAssessmentSession error:', error);
    res.status(500).json({ error: 'Failed to force-submit session' });
  }
}

export async function uploadScreenshot(req, res) {
  try {
    const { sessionId } = req.params;

    const resolved = await resolveActiveExamSession(prisma, {
      sessionId,
      userId: req.userId || req.user?.id,
      clientDeviceId: getClientDeviceIdFromRequest(req),
      requireUnpaused: false,
      requireNotExpired: false,
      checkHeartbeat: false,
      bindDevice: true,
    });
    if (!resolved.ok) {
      return res.status(resolved.status).json(resolved.body);
    }
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { userId: true, fullName: true } },
        assessment: { select: { id: true } },
      },
    });

    screenshotUpload.single('screenshot')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
      if (!req.file?.buffer) return res.status(400).json({ error: 'No screenshot provided' });

      const flags = (() => {
        try {
          return req.body?.flags ? JSON.parse(req.body.flags) : null;
        } catch {
          return null;
        }
      })();
      const faceCount = req.body?.faceCount ? Number(req.body.faceCount) : null;
      const captureType = ['PERIODIC', 'EVENT'].includes(req.body?.captureType)
        ? req.body.captureType
        : 'PERIODIC';
      const event = req.body?.event ? String(req.body.event).slice(0, 255) : null;
      const riskFlag =
        req.body?.riskFlag === 'true' ||
        req.body?.riskFlag === true ||
        req.body?.riskFlag === '1';
      const violationId = req.body?.violationId ? String(req.body.violationId) : null;

      const folder = `proctoring/assessments/${session.assessmentId}/sessions/${sessionId}/screenshots`;
      const uploaded = await uploadToCloudinary(req.file.buffer, {
        folder,
        resource_type: 'image',
      });

      const row = await prisma.assessmentScreenshot.create({
        data: {
          sessionId,
          imageUrl: uploaded.url,
          publicId: uploaded.public_id,
          captureType,
          event,
          riskFlag,
          violationId: violationId || null,
          flags: flags ? JSON.stringify(flags) : null,
          faceCount: Number.isFinite(faceCount) ? faceCount : null,
          bytes: uploaded.bytes ?? null,
          width: uploaded.width ?? null,
          height: uploaded.height ?? null,
          format: uploaded.format ?? null,
        },
      });

      const signedUrl = signedScreenshotUrl(row);
      emitProctoringLiveUpdate(session.assessment.id, {
        assessmentId: session.assessment.id,
        kind: 'screenshot',
        sessionId,
        studentName: session.student?.fullName,
        screenshot: {
          id: row.id,
          url: signedUrl,
          timestamp: row.timestamp,
          captureType: row.captureType,
          event: row.event,
          riskFlag: row.riskFlag,
          faceCount: row.faceCount,
        },
      });

      res.status(201).json(row);
    });
  } catch (error) {
    console.error('uploadScreenshot error:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
}

export async function getProctoringSessionDetails(req, res) {
  try {
    const { sessionId } = req.params;
    const role = req.user?.role;

    if (role === 'ADMIN') {
      const allowed = await adminCanAccessSessionById(sessionId, req.user.admin, role);
      if (!allowed) {
        return res.status(403).json({ error: 'Session not in your scope' });
      }
    }

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { id: true, fullName: true, enrollmentId: true, batch: true, center: true, school: true } },
        violations: { orderBy: { timestamp: 'asc' } },
        screenshots: { orderBy: { timestamp: 'asc' } },
        assessment: { select: { id: true, title: true, type: true } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const pause = pauseSnapshot(session.secureModeMeta);
    res.json({
      ...session,
      paused: pause.paused,
      pauseReason: pause.pauseReason,
      tabSwitchCount: pause.tabSwitchCount,
      screenshots: (session.screenshots || []).map((s) => {
        const url = signedScreenshotUrl(s);
        return { ...s, signedUrl: url, imageUrl: url || s.imageUrl };
      }),
    });
  } catch (error) {
    console.error('getProctoringSessionDetails error:', error);
    res.status(500).json({ error: 'Failed to fetch proctoring details' });
  }
}

export async function getSignedScreenshotUrl(req, res) {
  try {
    const { screenshotId } = req.params;
    const role = req.user?.role;
    const row = await prisma.assessmentScreenshot.findUnique({
      where: { id: screenshotId },
      select: { id: true, publicId: true, imageUrl: true, sessionId: true },
    });
    if (!row) return res.status(404).json({ error: 'Screenshot not found' });

    if (role === 'ADMIN') {
      const allowed = await adminCanAccessSessionById(row.sessionId, req.user.admin, role);
      if (!allowed) {
        return res.status(403).json({ error: 'Screenshot not in your scope' });
      }
    }

    const url = signedScreenshotUrl(row);
    res.json({ url, expiresAt: Math.floor(Date.now() / 1000) + 60 * 5 });
  } catch (error) {
    console.error('getSignedScreenshotUrl error:', error);
    res.status(500).json({ error: 'Failed to generate screenshot URL' });
  }
}

// Upload Proctoring Media
export async function uploadMedia(req, res) {
  try {
    const { sessionId } = req.params;
    const { type, url } = req.body || {};

    const resolved = await resolveActiveExamSession(prisma, {
      sessionId,
      userId: req.userId || req.user?.id,
      clientDeviceId: getClientDeviceIdFromRequest(req),
      requireUnpaused: false,
      requireNotExpired: false,
      checkHeartbeat: false,
      bindDevice: true,
    });
    if (!resolved.ok) {
      return res.status(resolved.status).json(resolved.body);
    }

    const media = await prisma.assessmentMedia.create({
      data: {
        sessionId,
        type: type ? String(type).slice(0, 64) : 'UNKNOWN',
        url: url ? String(url).slice(0, 2000) : '',
      }
    });

    res.status(201).json(media);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload media' });
  }
}

const REVIEW_QUESTION_TYPES = new Set(['DESCRIPTIVE', 'SQL', 'CASE_STUDY', 'PROGRAMMING_CHALLENGE']);
const GRADE_FAIL = { pointsEarned: 0, passed: 0, total: 0, results: [], language: null };

function coerceAnswersPayload(raw) {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.rawAnswers && typeof raw.rawAnswers === 'object' && !Array.isArray(raw.rawAnswers)) {
      return raw.rawAnswers;
    }
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      return coerceAnswersPayload(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return {};
}

function parseStoredResponses(raw) {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return parseStoredResponses(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return {};
}

function hasAnswerValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

function answerForQuestion(answers, question) {
  if (!answers || !question) return undefined;
  if (Object.prototype.hasOwnProperty.call(answers, question.id)) return answers[question.id];
  const asString = String(question.id);
  if (Object.prototype.hasOwnProperty.call(answers, asString)) return answers[asString];
  return undefined;
}

async function withTimeout(promise, ms, fallback) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function evaluateSubmittedAnswers(questions, answers, { skipCoding = false } = {}) {
  let calculatedScore = 0;
  let hasDescriptive = false;
  const executionLogs = {};

  for (const q of questions || []) {
    const studentAnswer = answerForQuestion(answers, q);
    if (!hasAnswerValue(studentAnswer)) continue;

    if (q.type === 'MCQ') {
      if (mcqAnswersMatch(studentAnswer, q.correctAnswer, q.options)) {
        calculatedScore += q.points;
      }
    } else if (q.type === 'CODING') {
      if (skipCoding) {
        executionLogs[q.id] = { skipped: true, reason: 'auto_submit' };
        continue;
      }
      try {
        const graded = await withTimeout(gradeCodingAnswer(q, studentAnswer), 12000, GRADE_FAIL);
        calculatedScore += Number(graded?.pointsEarned) || 0;
        const redacted = redactHiddenEvaluationResults(graded?.results || []);
        executionLogs[q.id] = {
          passed: graded?.passed,
          total: graded?.total,
          logs: redacted.results,
          hiddenTestsPassed: redacted.hiddenTestsPassed,
          hiddenTestsTotal: redacted.hiddenTestsTotal,
          language: graded?.language,
        };
      } catch (e) {
        console.error(`Coding evaluation failed for Q${q.id}:`, e);
        executionLogs[q.id] = { error: 'Evaluation skipped' };
      }
    } else if (REVIEW_QUESTION_TYPES.has(q.type)) {
      hasDescriptive = true;
    }
  }

  return { calculatedScore, hasDescriptive, executionLogs };
}

export async function completeAssessment(req, res) {
  try {
    const { sessionId } = req.params;

    const resolved = await resolveActiveExamSession(prisma, {
      sessionId,
      userId: req.userId || req.user?.id,
      clientDeviceId: getClientDeviceIdFromRequest(req),
      requireUnpaused: true,
      requireNotExpired: true,
      checkHeartbeat: true,
      bindDevice: true,
    });
    if (!resolved.ok) {
      return res.status(resolved.status).json(resolved.body);
    }

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: { assessment: { include: { questions: true } } },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const student = await prisma.student.findUnique({
      where: { userId: req.userId || req.user.id },
      select: { id: true, email: true },
    });
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    if (session.studentId !== student.id) {
      return res.status(403).json({ error: 'Access denied: This session belongs to another student' });
    }

    const stored = parseStoredResponses(session.responses);
    const storedAnswers = coerceAnswersPayload(stored.rawAnswers ?? stored);
    const incoming = coerceAnswersPayload(req.body?.answers ?? req.body?.rawAnswers);
    const answers = { ...storedAnswers, ...incoming };

    const questions = session.assessment?.questions || [];
    const { calculatedScore, hasDescriptive, executionLogs } = await evaluateSubmittedAnswers(
      questions,
      answers
    );
    const maxPoints = totalQuestionPoints(questions);
    const scorePercent = pointsToPercent(calculatedScore, questions);

    const updateResult = await prisma.assessmentSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: {
        status: hasDescriptive ? 'PENDING_REVIEW' : 'COMPLETED',
        endTime: new Date(),
        score: scorePercent,
        responses: JSON.stringify({
          rawAnswers: answers,
          executionLogs,
          pointsEarned: calculatedScore,
          maxPoints,
        }),
      },
    });

    if (updateResult.count === 0) {
      const current = await prisma.assessmentSession.findUnique({
        where: { id: sessionId },
        select: { status: true },
      });
      return res.status(409).json({
        error: 'Assessment already submitted',
        status: current?.status,
        sessionId,
      });
    }

    const updatedSession = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
    });

    if (student.email) {
      try {
        await prisma.assessmentInviteEmail.updateMany({
          where: {
            assessmentId: session.assessmentId,
            email: String(student.email).trim().toLowerCase(),
          },
          data: { status: 'COMPLETED', studentId: student.id },
        });
      } catch (inviteErr) {
        console.error('Invite email status update failed:', inviteErr);
      }
    }

    if (!hasDescriptive && student.id) {
      try {
        await syncJobApplicationsFromAssessment(student.id, session.assessmentId, scorePercent);
      } catch (bridgeError) {
        console.error('Job assessment bridge sync failed:', bridgeError);
      }
    }

    res.json(
      withNormalizedScore({
        ...(updatedSession || {}),
        assessment: sanitizeAssessmentForStudent(session.assessment),
      }),
    );
  } catch (error) {
    console.error('Complete Assessment Error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete assessment' });
  }
}

// --- REVIEW MODULE ---

// Get Session Results (Admin)
export async function getSessionResults(req, res) {
  try {
    const { sessionId } = req.params;
    const role = req.user?.role;

    if (role === 'ADMIN') {
      const allowed = await adminCanAccessSessionById(sessionId, req.user.admin, role);
      if (!allowed) {
        return res.status(403).json({ error: 'Session not in your scope' });
      }
    }

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
        assessment: { include: { questions: true } },
        violations: true,
        media: true
      }
    });
    res.json(withNormalizedScore(session));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session results' });
  }
}

// Get All Assessment Results (Leaderboard)
export async function getAssessmentResults(req, res) {
  try {
    const { id } = req.params;
    const role = req.user?.role;

    if (role === 'ADMIN') {
      const allowed = await adminCanAccessAssessmentById(id, req.user.admin, role);
      if (!allowed) {
        return res.status(403).json({ error: 'Assessment not in your scope' });
      }
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        questions: true,
        sessions: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                enrollmentId: true,
                batch: true
              }
            },
            violations: true
          },
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!assessment) {
      console.log(`[DEBUG] getAssessmentResults: Assessment not found for id ${id}`);
      return res.status(404).json({ error: 'Assessment not found' });
    }

    let sessions = assessment.sessions || [];
    if (role === 'ADMIN') {
      const studentWhere = buildScopedStudentWhere(req.user.admin, role);
      if (studentWhere.id === '__BLOCKED__') {
        sessions = [];
      } else {
        const scopedStudents = await prisma.student.findMany({
          where: studentWhere,
          select: { id: true },
          take: 5000,
        });
        const scopedIds = new Set(scopedStudents.map((s) => s.id));
        sessions = sessions.filter((s) => scopedIds.has(s.studentId));
      }
    }

    const questions = assessment.questions || [];
    const normalizedSessions = sessions.map((s) => ({
      ...s,
      score: normalizeStoredScore(s.score, questions, s.responses),
    }));
    console.log(`[DEBUG] getAssessmentResults: Successfully fetched leaderboard for ${id}`);
    res.json({ ...assessment, sessions: normalizedSessions });
  } catch (error) {
    console.error(`[ERROR] Failed to fetch assessment leaderboard for ${req.params.id}:`, error);
    console.error('Failed to fetch assessment leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch assessment leaderboard' });
  }
}

// Get Live Sessions for Monitor
export async function getLiveAssessmentSessions(req, res) {
  try {
    const { id } = req.params;
    const role = req.user?.role;

    if (role === 'ADMIN') {
      const allowed = await adminCanAccessAssessmentById(id, req.user.admin, role);
      if (!allowed) {
        return res.status(403).json({ error: 'Assessment not in your scope' });
      }
    }

    const sessionWhere = {
      assessmentId: id,
      status: 'IN_PROGRESS',
    };

    if (role === 'ADMIN') {
      if (isAdminScopeBlocked(req.user.admin, role)) {
        return res.json([]);
      }
      const studentWhere = buildScopedStudentWhere(req.user.admin, role);
      if (studentWhere?.id === '__BLOCKED__') {
        return res.json([]);
      }
      sessionWhere.student = studentWhere;
    }

    const activeSessions = await prisma.assessmentSession.findMany({
      where: sessionWhere,
      include: {
        student: { select: { fullName: true } },
        violations: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        screenshots: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            id: true,
            imageUrl: true,
            publicId: true,
            timestamp: true,
            captureType: true,
            event: true,
            riskFlag: true,
          },
        },
        _count: {
          select: { screenshots: true }
        }
      }
    });

    const formatted = activeSessions.map(session => {
      // Calculate last ping based on last violation or startTime
      const lastActivity = session.violations.length > 0 
        ? session.violations[0].timestamp 
        : session.startTime;
      
      const secondsAgo = Math.floor((new Date() - new Date(lastActivity)) / 1000);
      let lastPing = 'Just now';
      if (secondsAgo > 60) lastPing = `${Math.floor(secondsAgo / 60)}m ago`;

      const latest = session.screenshots?.[0] || null;
      const pause = pauseSnapshot(session.secureModeMeta);
      return {
        id: session.id,
        studentName: session.student.fullName,
        status: pause.paused
          ? 'PAUSED'
          : session.riskLevel || (session.violationsCount > 3 ? 'CRITICAL' : session.violationsCount > 0 ? 'WARNING' : 'ACTIVE'),
        paused: pause.paused,
        pauseReason: pause.pauseReason,
        violations: session.violationsCount,
        screenshots: session._count?.screenshots || 0,
        lastPing,
        lastViolation: session.violations.length > 0 ? session.violations[0].type.replace(/_/g, ' ') : null,
        latestScreenshot: latest
          ? {
              id: latest.id,
              url: signedScreenshotUrl(latest),
              timestamp: latest.timestamp,
              captureType: latest.captureType,
              event: latest.event,
              riskFlag: latest.riskFlag,
            }
          : null,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Failed to fetch live sessions:', error);
    res.status(500).json({ error: 'Failed to fetch live sessions' });
  }
}

// Evaluate Candidate (Admin)
export async function evaluateAssessmentCandidate(req, res) {
  try {
    const { assessmentId, studentId } = req.params;
    const { marks, remarks, status } = req.body;

    // Find or Create session for this student-assessment pair
    let session = await prisma.assessmentSession.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId } }
    });

    if (!session) {
      session = await prisma.assessmentSession.create({
        data: {
          assessmentId,
          studentId,
          status: status || 'COMPLETED',
          score: marks ? parseFloat(marks) : null,
          endTime: new Date()
        }
      });
    } else {
      session = await prisma.assessmentSession.update({
        where: { id: session.id },
        data: {
          score: marks ? parseFloat(marks) : null,
          status: status || 'COMPLETED',
          endTime: new Date()
        }
      });
    }

    // Save remarks/feedback - we can store this in a new model or as JSON in config
    // For now, let's just update the session score and status.
    
    res.json(session);
  } catch (error) {
    console.error('Evaluation Error:', error);
    res.status(500).json({ error: 'Failed to save evaluation' });
  }
}

// Get All Candidates for an Assessment (Admin)
export async function getAssessmentCandidates(req, res) {
  try {
    const { assessmentId } = req.params;

    // Get all assignments for this assessment
    const assignments = await prisma.assessmentAssignment.findMany({
      where: { assessmentId },
      include: {
        student: {
          include: { user: { select: { email: true, displayName: true } } }
        }
      }
    });

    // Get all sessions to see who has started/completed
    const sessions = await prisma.assessmentSession.findMany({
      where: { assessmentId },
      include: {
        violations: true
      }
    });

    // Merge data
    const candidates = assignments.map(asn => {
      const session = sessions.find(s => s.studentId === asn.studentId);
      return {
        student: {
          id: asn.studentId,
          fullName: asn.student.fullName || asn.student.user?.displayName,
          email: asn.student.email || asn.student.user?.email,
          enrollmentId: asn.student.enrollmentId,
          batch: asn.student.batch,
          profilePhoto: asn.student.profileImageUrl
        },
        evaluation: session ? {
          marks: session.score,
          status: session.status,
          remarks: null // We don't have a remarks field in session yet, could add later
        } : null,
        session: session || null,
        scheduledAt: asn.scheduledAt
      };
    });

    res.json({ candidates });
  } catch (error) {
    console.error('getAssessmentCandidates Error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
}

// Get Student Session Results
export async function getStudentSessionResults(req, res) {
  try {
    const { sessionId } = req.params;
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assessment: { 
          include: { 
            questions: {
              orderBy: { order: 'asc' }
            } 
          } 
        },
        violations: true
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // SECURITY: Ensure the session belongs to the requesting student
    if (session.studentId !== student.id) {
      return res.status(403).json({ error: 'Access denied: This result belongs to another student' });
    }

    // Calculate time spent if completed
    let duration = null;
    if (session.startTime && session.endTime) {
      duration = Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000); // seconds
    }

    res.json({
      ...withNormalizedScore({
        ...session,
        assessment: sanitizeAssessmentForStudent(session.assessment, {
          revealAnswers: ['COMPLETED', 'PENDING_REVIEW', 'AUTO_SUBMITTED', 'TERMINATED'].includes(
            session.status
          ),
        }),
      }),
      duration,
    });
  } catch (error) {
    console.error('getStudentSessionResults Error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
}
