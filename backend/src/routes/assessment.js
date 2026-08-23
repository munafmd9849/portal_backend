import express from 'express';
import { 
  createAssessment, 
  getAssessments, 
  getAssessmentDetails, 
  getStudentAssessments, 
  startSession, 
  logViolation, 
  saveSessionProgress,
  getStudentSessionStatus,
  getActiveAssessmentSession,
  postSessionHeartbeat,
  postSecurityReady,
  postSecurityRecovery,
  resumeAssessmentAfterFullscreen,
  unlockAssessmentSession,
  extendAssessmentSession,
  pauseAssessmentSession,
  forceSubmitAssessmentSession,
  uploadMedia, 
  uploadScreenshot,
  completeAssessment,
  getSessionResults,
  getAssessmentResults,
  getLiveAssessmentSessions,
  getProctoringSessionDetails,
  getSignedScreenshotUrl,
  evaluateAssessmentCandidate,
  getAssessmentCandidates,
  updateAssessment,
  publishAssessment,
  deleteAssessment,
  getStudentSessionResults
} from '../controllers/assessment.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getInviteAssessment,
  claimInviteAccess,
  getAssessmentInvite,
  updateAssessmentInvite,
} from '../controllers/assessmentInvite.js';

const router = express.Router();

// --- Public invite link (no auth) ---
router.get('/invite/:token', getInviteAssessment);
router.post('/invite/:token/claim', claimInviteAccess);

// --- Admin Routes (static paths before /:id params) ---

/**
 * @openapi
 * /api/assessments/all:
 *   get:
 *     tags: [Assessments]
 *     summary: List all assessments (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assessments
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/all', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getAssessments);

/**
 * @openapi
 * /api/assessments/create:
 *   post:
 *     tags: [Assessments]
 *     summary: Create a new assessment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Assessment created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/create', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), createAssessment);

/**
 * @openapi
 * /api/assessments/details/{id}:
 *   get:
 *     tags: [Assessments]
 *     summary: Get assessment details by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment details
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/details/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']), getAssessmentDetails);

/**
 * @openapi
 * /api/assessments/session/proctoring/{sessionId}:
 *   get:
 *     tags: [Assessments]
 *     summary: Get proctoring session details
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
 *         description: Proctoring session details
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/proctoring/:sessionId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getProctoringSessionDetails);

/**
 * @openapi
 * /api/assessments/session/screenshot/{screenshotId}/url:
 *   get:
 *     tags: [Assessments]
 *     summary: Get signed URL for a proctoring screenshot
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: screenshotId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Signed screenshot URL
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/screenshot/:screenshotId/url', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getSignedScreenshotUrl);
router.post('/session/unlock/:sessionId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), unlockAssessmentSession);
router.post('/session/pause/:sessionId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), pauseAssessmentSession);
router.post('/session/extend/:sessionId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), extendAssessmentSession);
router.post('/session/force-submit/:sessionId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), forceSubmitAssessmentSession);
router.get('/:id/invite', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getAssessmentInvite);
router.put('/:id/invite', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateAssessmentInvite);

/**
 * @openapi
 * /api/assessments/{id}/live-sessions:
 *   get:
 *     tags: [Assessments]
 *     summary: Get live assessment sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Live sessions for the assessment
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id/live-sessions', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getLiveAssessmentSessions);

/**
 * @openapi
 * /api/assessments/results/{sessionId}:
 *   get:
 *     tags: [Assessments]
 *     summary: Get session results (admin)
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
 *         description: Session results
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/results/:sessionId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getSessionResults);

/**
 * @openapi
 * /api/assessments/dashboard/{id}:
 *   get:
 *     tags: [Assessments]
 *     summary: Get assessment results dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment results dashboard
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/dashboard/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getAssessmentResults);

/**
 * @openapi
 * /api/assessments/{assessmentId}/candidates:
 *   get:
 *     tags: [Assessments]
 *     summary: List assessment candidates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of candidates
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:assessmentId/candidates', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']), getAssessmentCandidates);

/**
 * @openapi
 * /api/assessments/evaluate/{assessmentId}/{studentId}:
 *   post:
 *     tags: [Assessments]
 *     summary: Evaluate an assessment candidate
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
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
 *         description: Evaluation submitted
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
router.post('/evaluate/:assessmentId/:studentId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), evaluateAssessmentCandidate);

/**
 * @openapi
 * /api/assessments/{id}/publish:
 *   post:
 *     tags: [Assessments]
 *     summary: Publish an assessment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment published
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/:id/publish', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), publishAssessment);

/**
 * @openapi
 * /api/assessments/{id}:
 *   put:
 *     tags: [Assessments]
 *     summary: Update an assessment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Assessment updated
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
 *   delete:
 *     tags: [Assessments]
 *     summary: Delete an assessment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateAssessment);
router.delete('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), deleteAssessment);

// --- Student Routes ---

/**
 * @openapi
 * /api/assessments/my-assignments:
 *   get:
 *     tags: [Assessments]
 *     summary: Get student's assigned assessments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student assessment assignments
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/my-assignments', authenticate, authorize(['STUDENT']), getStudentAssessments);

/**
 * @openapi
 * /api/assessments/session/start/{assessmentId}:
 *   post:
 *     tags: [Assessments]
 *     summary: Start an assessment session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Session started
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/start/:assessmentId', authenticate, authorize(['STUDENT']), startSession);

/**
 * @openapi
 * /api/assessments/session/violation/{sessionId}:
 *   post:
 *     tags: [Assessments]
 *     summary: Log a proctoring violation
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
 *         description: Violation logged
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/violation/:sessionId', authenticate, authorize(['STUDENT']), logViolation);
router.post('/session/resume-fullscreen/:sessionId', authenticate, authorize(['STUDENT']), resumeAssessmentAfterFullscreen);
router.post('/session/progress/:sessionId', authenticate, authorize(['STUDENT']), saveSessionProgress);
router.get('/session/active/:assessmentId', authenticate, authorize(['STUDENT']), getActiveAssessmentSession);
router.get('/session/status/:sessionId', authenticate, authorize(['STUDENT']), getStudentSessionStatus);
router.post('/session/heartbeat/:sessionId', authenticate, authorize(['STUDENT']), postSessionHeartbeat);
router.post('/session/security-ready/:sessionId', authenticate, authorize(['STUDENT']), postSecurityReady);
router.post('/session/security-recovery/:sessionId', authenticate, authorize(['STUDENT']), postSecurityRecovery);

/**
 * @openapi
 * /api/assessments/session/media/{sessionId}:
 *   post:
 *     tags: [Assessments]
 *     summary: Upload proctoring media
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Media uploaded
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/media/:sessionId', authenticate, authorize(['STUDENT']), uploadMedia);

/**
 * @openapi
 * /api/assessments/session/screenshot/{sessionId}:
 *   post:
 *     tags: [Assessments]
 *     summary: Upload a proctoring screenshot
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Screenshot uploaded
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/screenshot/:sessionId', authenticate, authorize(['STUDENT']), uploadScreenshot);

/**
 * @openapi
 * /api/assessments/session/complete/{sessionId}:
 *   post:
 *     tags: [Assessments]
 *     summary: Complete an assessment session
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
 *         description: Session completed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/complete/:sessionId', authenticate, authorize(['STUDENT']), completeAssessment);

/**
 * @openapi
 * /api/assessments/session/results/{sessionId}:
 *   get:
 *     tags: [Assessments]
 *     summary: Get session results (student)
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
 *         description: Student session results
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/results/:sessionId', authenticate, authorize(['STUDENT']), getStudentSessionResults);

export default router;
