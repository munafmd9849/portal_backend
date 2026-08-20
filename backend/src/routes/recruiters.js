/**
 * Recruiters Routes
 * Admin endpoints for managing recruiters; recruiter MOU upload/list
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { uploadMouDocument as uploadMouMiddleware } from '../middleware/upload.js';
import * as recruiterController from '../controllers/recruiters.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/recruiters/directory:
 *   get:
 *     tags: [Recruiters]
 *     summary: Get recruiter directory
 *     description: Admin and Super Admin only — list all recruiters with company details.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recruiter directory
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
router.get('/directory', requireRole(['ADMIN', 'SUPER_ADMIN']), recruiterController.getRecruiterDirectory);

/**
 * @openapi
 * /api/recruiters/dashboard-stats:
 *   get:
 *     tags: [Recruiters]
 *     summary: Get recruiter dashboard stats
 *     description: Recruiter only — overview statistics for the recruiter dashboard.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
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
router.get('/dashboard-stats', requireRole(['RECRUITER']), recruiterController.getRecruiterDashboardStats);

/**
 * @openapi
 * /api/recruiters/company-analytics:
 *   get:
 *     tags: [Recruiters]
 *     summary: Get company analytics
 *     description: Recruiter only — analytics for the recruiter's company hiring activity.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company analytics
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
router.get('/company-analytics', requireRole(['RECRUITER']), recruiterController.getRecruiterCompanyAnalytics);

/**
 * @openapi
 * /api/recruiters/mou:
 *   get:
 *     tags: [Recruiters]
 *     summary: List MOU documents
 *     description: Recruiter or Admin — list Memorandum of Understanding documents.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MOU documents
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
router.get('/mou', requireRole(['RECRUITER', 'ADMIN']), recruiterController.listMouDocuments);

/**
 * @openapi
 * /api/recruiters/mou:
 *   post:
 *     tags: [Recruiters]
 *     summary: Upload MOU document
 *     description: Recruiter or Admin — upload a Memorandum of Understanding document.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: MOU document uploaded
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
router.post('/mou', requireRole(['RECRUITER', 'ADMIN']), uploadMouMiddleware, recruiterController.uploadMouDocument);

/**
 * @openapi
 * /api/recruiters/{email}/jobs:
 *   get:
 *     tags: [Recruiters]
 *     summary: Get jobs by recruiter email
 *     description: Admin and Super Admin only — list jobs created by a recruiter.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Recruiter jobs
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
router.get('/:email/jobs', requireRole(['ADMIN', 'SUPER_ADMIN']), recruiterController.getRecruiterJobs);

/**
 * @openapi
 * /api/recruiters/{recruiterId}/block:
 *   patch:
 *     tags: [Recruiters]
 *     summary: Block or unblock a recruiter
 *     description: Super Admin only — toggle recruiter account block status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recruiterId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blocked: { type: boolean }
 *     responses:
 *       200:
 *         description: Recruiter block status updated
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
router.patch('/:recruiterId/block', requireRole(['SUPER_ADMIN']), recruiterController.blockUnblockRecruiter);

export default router;
