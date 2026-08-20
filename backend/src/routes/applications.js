/**
 * Application Routes
 * Replaces Firebase Firestore application service calls
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from "../middleware/roles.js";
import * as applicationController from '../controllers/applications.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/applications:
 *   get:
 *     tags: [Applications]
 *     summary: Get all applications
 *     description: Admin only — list all job applications with filters.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All applications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', requireRole(['ADMIN']), applicationController.getAllApplications);

/**
 * @openapi
 * /api/applications/export:
 *   post:
 *     tags: [Applications]
 *     summary: Export applications to CSV
 *     description: Admin only — trigger a CSV export of applications for a job.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Export job queued or completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/export', requireRole(['ADMIN']), applicationController.exportApplications);

/**
 * @openapi
 * /api/applications/export/{jobId}:
 *   get:
 *     tags: [Applications]
 *     summary: Get CSV export status
 *     description: Admin only — check the status of an applications CSV export for a job.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Export status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/export/:jobId', requireRole(['ADMIN']), applicationController.getExportStatus);

/**
 * @openapi
 * /api/applications/job/{jobId}/screening-summary:
 *   get:
 *     tags: [Applications]
 *     summary: Get job screening summary
 *     description: Admin only — screening pipeline summary for a job's applicants.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Screening summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/job/:jobId/screening-summary', requireRole(['ADMIN']), applicationController.getJobScreeningSummary);

/**
 * @openapi
 * /api/applications/student:
 *   get:
 *     tags: [Applications]
 *     summary: Get student applications
 *     description: Student, Admin, or Super Admin — list applications for a student (own or by query).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student applications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/student', requireRole(['STUDENT', 'ADMIN', 'SUPER_ADMIN']), applicationController.getStudentApplications);

/**
 * @openapi
 * /api/applications/student/interview-history:
 *   get:
 *     tags: [Applications]
 *     summary: Get student interview history
 *     description: Student only — interview rounds and evaluation history across applications.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Interview history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/student/interview-history', requireRole(['STUDENT']), applicationController.getStudentInterviewHistory);

/**
 * @openapi
 * /api/applications/jobs/{jobId}:
 *   post:
 *     tags: [Applications]
 *     summary: Apply to a job
 *     description: Student only — submit an application to a job posting.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resumeId: { type: string, format: uuid }
 *               customAnswers: { type: object }
 *     responses:
 *       201:
 *         description: Application submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/jobs/:jobId', requireRole(['STUDENT']), applicationController.applyToJob);

/**
 * @openapi
 * /api/applications/{applicationId}/status:
 *   patch:
 *     tags: [Applications]
 *     summary: Update application status
 *     description: Admin or Recruiter — update screening or interview status for an application.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               screeningStatus: { type: string }
 *               interviewStatus: { type: string }
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Application status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/:applicationId/status', requireRole(['ADMIN', 'RECRUITER']), applicationController.updateApplicationStatus);

/**
 * @openapi
 * /api/applications/{applicationId}/offer-response:
 *   post:
 *     tags: [Applications]
 *     summary: Respond to job offer
 *     description: Student only — accept or decline a job offer.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [response]
 *             properties:
 *               response:
 *                 type: string
 *                 enum: [ACCEPT, DECLINE]
 *     responses:
 *       200:
 *         description: Offer response recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/:applicationId/offer-response', requireRole(['STUDENT']), applicationController.respondToOffer);

/**
 * @openapi
 * /api/applications/{applicationId}/withdraw:
 *   post:
 *     tags: [Applications]
 *     summary: Withdraw application
 *     description: Student only — withdraw an active job application.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Application withdrawn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/:applicationId/withdraw', requireRole(['STUDENT']), applicationController.withdrawApplication);

/**
 * @openapi
 * /api/applications/{applicationId}/revoke:
 *   post:
 *     tags: [Applications]
 *     summary: Revoke application
 *     description: Admin only — revoke a student's application.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Application revoked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/:applicationId/revoke', requireRole(['ADMIN']), applicationController.revokeApplication);

/**
 * @openapi
 * /api/applications/{applicationId}/restore:
 *   post:
 *     tags: [Applications]
 *     summary: Restore application
 *     description: Admin only — restore a previously revoked application.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Application restored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/:applicationId/restore', requireRole(['ADMIN']), applicationController.restoreApplication);

/**
 * @openapi
 * /api/applications/{applicationId}/resume-view-url:
 *   get:
 *     tags: [Applications]
 *     summary: Get resume view URL
 *     description: Admin or Recruiter — get a short-lived URL to view an applicant's resume inline.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Resume view URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:applicationId/resume-view-url', requireRole(['ADMIN', 'RECRUITER']), applicationController.getResumeViewUrl);

export default router;
