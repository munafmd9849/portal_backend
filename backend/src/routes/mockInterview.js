import express from 'express';
import { 
  createMockInterviewDrive, 
  getMockInterviewDrives, 
  assignStudentToSlot, 
  getStudentMockInterviews,
  getStudentMockInterviewStats,
  submitMockFeedback,
  updateSlotStatus,
  getMockInterviewSlot,
  getMockInterviewLiveCode,
  patchMockInterviewLiveCode,
  getMockInterviewSlotResults,
  getMockInterviewDriveResults,
  updateMockInterviewSlot,
  updateMockInterviewDrive,
  publishMockInterviewDrive,
  deleteMockInterviewDrive
} from '../controllers/mockInterview.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Results (assessment-style read APIs)

/**
 * @openapi
 * /api/mock-interviews/results/slot/{slotId}:
 *   get:
 *     tags: [Mock Interviews]
 *     summary: Get mock interview slot results
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
 *         description: Slot results
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/results/slot/:slotId',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']),
  getMockInterviewSlotResults,
);

/**
 * @openapi
 * /api/mock-interviews/results/drive/{driveId}:
 *   get:
 *     tags: [Mock Interviews]
 *     summary: Get mock interview drive results
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driveId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Drive results
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/results/drive/:driveId',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  getMockInterviewDriveResults,
);

// Common Routes

/**
 * @openapi
 * /api/mock-interviews/slot/{slotId}:
 *   get:
 *     tags: [Mock Interviews]
 *     summary: Get mock interview slot details
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
 *         description: Slot details
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/slot/:slotId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']), getMockInterviewSlot);

/**
 * @openapi
 * /api/mock-interviews/slot/{slotId}/live-code:
 *   get:
 *     tags: [Mock Interviews]
 *     summary: Get live code for a mock interview slot
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
 *         description: Live code session
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   patch:
 *     tags: [Mock Interviews]
 *     summary: Update live code for a mock interview slot
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
 *         description: Live code updated
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
router.get('/slot/:slotId/live-code', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']), getMockInterviewLiveCode);
router.patch('/slot/:slotId/live-code', authenticate, authorize(['STUDENT']), patchMockInterviewLiveCode);

/**
 * @openapi
 * /api/mock-interviews/slot/{slotId}:
 *   put:
 *     tags: [Mock Interviews]
 *     summary: Update a mock interview slot
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
 *         description: Slot updated
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
router.put('/slot/:slotId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateMockInterviewSlot);

// Admin Routes

/**
 * @openapi
 * /api/mock-interviews/create:
 *   post:
 *     tags: [Mock Interviews]
 *     summary: Create a mock interview drive
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
 *         description: Drive created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/create', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), createMockInterviewDrive);

/**
 * @openapi
 * /api/mock-interviews/all:
 *   get:
 *     tags: [Mock Interviews]
 *     summary: List all mock interview drives
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of drives
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/all', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getMockInterviewDrives);

/**
 * @openapi
 * /api/mock-interviews/assign:
 *   post:
 *     tags: [Mock Interviews]
 *     summary: Assign a student to a mock interview slot
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Student assigned
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/assign', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), assignStudentToSlot);

/**
 * @openapi
 * /api/mock-interviews/update-status:
 *   post:
 *     tags: [Mock Interviews]
 *     summary: Update mock interview slot status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/update-status', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateSlotStatus);

/**
 * @openapi
 * /api/mock-interviews/feedback:
 *   post:
 *     tags: [Mock Interviews]
 *     summary: Submit mock interview feedback
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Feedback submitted
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/feedback', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), submitMockFeedback);

/**
 * @openapi
 * /api/mock-interviews/drives/{id}:
 *   put:
 *     tags: [Mock Interviews]
 *     summary: Update a mock interview drive
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
 *         description: Drive updated
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
 *     tags: [Mock Interviews]
 *     summary: Delete a mock interview drive
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
 *         description: Drive deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/drives/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateMockInterviewDrive);

/**
 * @openapi
 * /api/mock-interviews/drives/{id}/publish:
 *   post:
 *     tags: [Mock Interviews]
 *     summary: Publish a mock interview drive
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
 *         description: Drive published
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/drives/:id/publish', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), publishMockInterviewDrive);
router.delete('/drives/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), deleteMockInterviewDrive);

// Student Routes

/**
 * @openapi
 * /api/mock-interviews/student/stats:
 *   get:
 *     tags: [Mock Interviews]
 *     summary: Get student mock interview statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student stats
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/student/stats', authenticate, authorize(['STUDENT']), getStudentMockInterviewStats);

/**
 * @openapi
 * /api/mock-interviews/my-sessions:
 *   get:
 *     tags: [Mock Interviews]
 *     summary: Get student's mock interview sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student sessions
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/my-sessions', authenticate, authorize(['STUDENT']), getStudentMockInterviews);

export default router;
