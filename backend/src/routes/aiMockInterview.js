import express from 'express';
import {
  createAiMockInterview,
  updateAiMockInterview,
  deleteAiMockInterview,
  listAiMockInterviews,
  getAiMockInterview,
  getAiInterviewReviewDashboard,
  getEnrollmentReviewDetail,
  saveEnrollmentReview,
  getStudentAiInterviews,
  getStudentAiInterviewSession,
  startAiInterviewSession,
  updateAiInterviewProgress,
  submitAiInterviewAnswer,
  completeAiInterview,
  logAiInterviewViolation,
  uploadAiInterviewScreenshot,
  regenerateAiInsights,
  getStudentAiInterviewResults,
} from '../controllers/aiMockInterview.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Student (before /:id)

/**
 * @openapi
 * /api/ai-mock-interviews/student/my-interviews:
 *   get:
 *     tags: [AI Mock Interviews]
 *     summary: List student's AI mock interviews
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student AI interviews
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/student/my-interviews', authenticate, authorize(['STUDENT']), getStudentAiInterviews);

/**
 * @openapi
 * /api/ai-mock-interviews/student/session/{id}:
 *   get:
 *     tags: [AI Mock Interviews]
 *     summary: Get student AI interview session
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
 *         description: Session details
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/student/session/:id', authenticate, authorize(['STUDENT']), getStudentAiInterviewSession);

/**
 * @openapi
 * /api/ai-mock-interviews/student/results/{enrollmentId}:
 *   get:
 *     tags: [AI Mock Interviews]
 *     summary: Get student AI interview results
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interview results
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/student/results/:enrollmentId', authenticate, authorize(['STUDENT']), getStudentAiInterviewResults);

// Enrollment actions

/**
 * @openapi
 * /api/ai-mock-interviews/enrollment/{enrollmentId}/detail:
 *   get:
 *     tags: [AI Mock Interviews]
 *     summary: Get enrollment review detail
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enrollment detail
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/enrollment/:enrollmentId/detail', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']), getEnrollmentReviewDetail);

/**
 * @openapi
 * /api/ai-mock-interviews/enrollment/{enrollmentId}/review:
 *   post:
 *     tags: [AI Mock Interviews]
 *     summary: Save enrollment review (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
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
 *         description: Review saved
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
router.post('/enrollment/:enrollmentId/review', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), saveEnrollmentReview);

/**
 * @openapi
 * /api/ai-mock-interviews/enrollment/{enrollmentId}/regenerate-ai:
 *   post:
 *     tags: [AI Mock Interviews]
 *     summary: Regenerate AI insights for enrollment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI insights regenerated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/enrollment/:enrollmentId/regenerate-ai', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), regenerateAiInsights);

/**
 * @openapi
 * /api/ai-mock-interviews/enrollment/{enrollmentId}/start:
 *   post:
 *     tags: [AI Mock Interviews]
 *     summary: Start AI interview session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
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
router.post('/enrollment/:enrollmentId/start', authenticate, authorize(['STUDENT']), startAiInterviewSession);

/**
 * @openapi
 * /api/ai-mock-interviews/enrollment/{enrollmentId}/progress:
 *   patch:
 *     tags: [AI Mock Interviews]
 *     summary: Update AI interview progress
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
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
 *         description: Progress updated
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
router.patch('/enrollment/:enrollmentId/progress', authenticate, authorize(['STUDENT']), updateAiInterviewProgress);

/**
 * @openapi
 * /api/ai-mock-interviews/enrollment/{enrollmentId}/answer:
 *   post:
 *     tags: [AI Mock Interviews]
 *     summary: Submit AI interview answer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
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
 *         description: Answer submitted
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
router.post('/enrollment/:enrollmentId/answer', authenticate, authorize(['STUDENT']), submitAiInterviewAnswer);

/**
 * @openapi
 * /api/ai-mock-interviews/enrollment/{enrollmentId}/complete:
 *   post:
 *     tags: [AI Mock Interviews]
 *     summary: Complete AI interview
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interview completed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/enrollment/:enrollmentId/complete', authenticate, authorize(['STUDENT']), completeAiInterview);

/**
 * @openapi
 * /api/ai-mock-interviews/enrollment/{enrollmentId}/violation:
 *   post:
 *     tags: [AI Mock Interviews]
 *     summary: Log AI interview proctoring violation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
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
router.post('/enrollment/:enrollmentId/violation', authenticate, authorize(['STUDENT']), logAiInterviewViolation);

/**
 * @openapi
 * /api/ai-mock-interviews/enrollment/{enrollmentId}/screenshot:
 *   post:
 *     tags: [AI Mock Interviews]
 *     summary: Upload AI interview proctoring screenshot
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
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
router.post('/enrollment/:enrollmentId/screenshot', authenticate, authorize(['STUDENT']), uploadAiInterviewScreenshot);

// Admin CRUD

/**
 * @openapi
 * /api/ai-mock-interviews:
 *   post:
 *     tags: [AI Mock Interviews]
 *     summary: Create an AI mock interview
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
 *         description: AI mock interview created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   get:
 *     tags: [AI Mock Interviews]
 *     summary: List AI mock interviews (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of AI mock interviews
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), createAiMockInterview);
router.get('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), listAiMockInterviews);

/**
 * @openapi
 * /api/ai-mock-interviews/{id}/review:
 *   get:
 *     tags: [AI Mock Interviews]
 *     summary: Get AI interview review dashboard
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
 *         description: Review dashboard
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id/review', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getAiInterviewReviewDashboard);

/**
 * @openapi
 * /api/ai-mock-interviews/{id}:
 *   get:
 *     tags: [AI Mock Interviews]
 *     summary: Get AI mock interview by ID
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
 *         description: AI mock interview details
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   put:
 *     tags: [AI Mock Interviews]
 *     summary: Update an AI mock interview
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: AI mock interview updated
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
 *     tags: [AI Mock Interviews]
 *     summary: Delete an AI mock interview
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
 *         description: AI mock interview deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']), getAiMockInterview);
router.put('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateAiMockInterview);
router.delete('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), deleteAiMockInterview);

export default router;
