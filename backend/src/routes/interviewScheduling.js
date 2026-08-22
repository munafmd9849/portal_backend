/**
 * Interview Scheduling Routes
 * Production-grade interview session management
 *
 * Mounted at:
 *   - /api/admin/interview-scheduling (primary)
 *   - /api/interview-sessions (alias — same routes)
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getOrCreateSession,
  configureRounds,
  inviteInterviewers,
  getSession,
  getActiveRound,
  getRoundCandidates,
  evaluateCandidate,
  startRound,
  endRound,
  endSession,
  declareResults,
  freezeInterviewSession,
  unfreezeInterviewSession,
} from '../controllers/interviewScheduling.js';
import { getSessionSlots, assignSlot, updateSlotAttendance, getEligibleApplications, studentJoinSlot } from '../controllers/interviewSlots.js';

const router = express.Router();

// Admin + Super Admin + Recruiter routes (require authentication and ADMIN, SUPER_ADMIN, or RECRUITER role)
const adminOrSuperAdminOrRecruiter = ['ADMIN', 'SUPER_ADMIN', 'RECRUITER'];

/**
 * @openapi
 * /api/admin/interview-scheduling/session/{jobId}:
 *   get:
 *     tags: [Interview Scheduling]
 *     summary: Get or create interview session for a job
 *     description: |
 *       Also available at alias `/api/interview-sessions/session/{jobId}`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interview session
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/:jobId', authenticate, requireRole(adminOrSuperAdminOrRecruiter), getOrCreateSession);

/**
 * @openapi
 * /api/admin/interview-scheduling/session:
 *   post:
 *     tags: [Interview Scheduling]
 *     summary: Create or get interview session
 *     description: Also available at alias `/api/interview-sessions/session`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Interview session
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session', authenticate, requireRole(adminOrSuperAdminOrRecruiter), getOrCreateSession);

/**
 * @openapi
 * /api/admin/interview-scheduling/session/{sessionId}/rounds:
 *   post:
 *     tags: [Interview Scheduling]
 *     summary: Configure interview rounds
 *     description: Also available at alias `/api/interview-sessions/session/{sessionId}/rounds`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Rounds configured
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/:sessionId/rounds', authenticate, requireRole(adminOrSuperAdminOrRecruiter), configureRounds);

/**
 * @openapi
 * /api/admin/interview-scheduling/session/{sessionId}/invite-interviewers:
 *   post:
 *     tags: [Interview Scheduling]
 *     summary: Invite interviewers to a session
 *     description: Also available at alias `/api/interview-sessions/session/{sessionId}/invite-interviewers`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Invitations sent
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/:sessionId/invite-interviewers', authenticate, requireRole(adminOrSuperAdminOrRecruiter), inviteInterviewers);

/**
 * @openapi
 * /api/admin/interview-scheduling/session/{sessionId}/declare-results:
 *   post:
 *     tags: [Interview Scheduling]
 *     summary: Declare interview session results
 *     description: Also available at alias `/api/interview-sessions/session/{sessionId}/declare-results`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Results declared
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/:sessionId/declare-results', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), declareResults);

/**
 * @openapi
 * /api/admin/interview-scheduling/session/{sessionId}/slots:
 *   get:
 *     tags: [Interview Scheduling]
 *     summary: Get session interview slots
 *     description: Also available at alias `/api/interview-sessions/session/{sessionId}/slots`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session slots
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   post:
 *     tags: [Interview Scheduling]
 *     summary: Assign a slot in a session
 *     description: Also available at alias `/api/interview-sessions/session/{sessionId}/slots`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Slot assigned
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/:sessionId/slots', authenticate, requireRole(adminOrSuperAdminOrRecruiter), getSessionSlots);

/**
 * @openapi
 * /api/admin/interview-scheduling/session/{sessionId}/eligible-applications:
 *   get:
 *     tags: [Interview Scheduling]
 *     summary: Get eligible applications for slot assignment
 *     description: Also available at alias `/api/interview-sessions/session/{sessionId}/eligible-applications`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Eligible applications
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/:sessionId/eligible-applications', authenticate, requireRole(adminOrSuperAdminOrRecruiter), getEligibleApplications);
router.post('/session/:sessionId/slots', authenticate, requireRole(adminOrSuperAdminOrRecruiter), assignSlot);

/**
 * @openapi
 * /api/admin/interview-scheduling/slots/{slotId}/attendance:
 *   patch:
 *     tags: [Interview Scheduling]
 *     summary: Update slot attendance
 *     description: Also available at alias `/api/interview-sessions/slots/{slotId}/attendance`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Attendance updated
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/slots/:slotId/attendance', authenticate, requireRole(adminOrSuperAdminOrRecruiter), updateSlotAttendance);

/**
 * @openapi
 * /api/admin/interview-scheduling/slots/{slotId}/join:
 *   post:
 *     tags: [Interview Scheduling]
 *     summary: Student joins an interview slot
 *     description: Also available at alias `/api/interview-sessions/slots/{slotId}/join`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student joined slot
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/slots/:slotId/join', authenticate, requireRole(['STUDENT']), studentJoinSlot);

// Super Admin only: freeze/unfreeze interview session

/**
 * @openapi
 * /api/admin/interview-scheduling/session/{sessionId}/freeze:
 *   patch:
 *     tags: [Interview Scheduling]
 *     summary: Freeze an interview session (super admin)
 *     description: Also available at alias `/api/interview-sessions/session/{sessionId}/freeze`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session frozen
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/session/:sessionId/freeze', authenticate, requireRole('SUPER_ADMIN'), freezeInterviewSession);

/**
 * @openapi
 * /api/admin/interview-scheduling/session/{sessionId}/unfreeze:
 *   patch:
 *     tags: [Interview Scheduling]
 *     summary: Unfreeze an interview session (super admin)
 *     description: Also available at alias `/api/interview-sessions/session/{sessionId}/unfreeze`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session unfrozen
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/session/:sessionId/unfreeze', authenticate, requireRole('SUPER_ADMIN'), unfreezeInterviewSession);

/**
 * @openapi
 * /api/interview-sessions/{jobId}:
 *   get:
 *     tags: [Interview Scheduling]
 *     summary: Get or create session by job ID (alias route)
 *     description: |
 *       Frontend compatibility alias for `GET /api/admin/interview-scheduling/session/{jobId}`.
 *       Same handler; also reachable via the admin path above.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interview session
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Direct route for frontend compatibility (GET /api/interview-sessions/:jobId)
router.get('/:jobId', authenticate, requireRole(adminOrSuperAdminOrRecruiter), getOrCreateSession);

export default router;
