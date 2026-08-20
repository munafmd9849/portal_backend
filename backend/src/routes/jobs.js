/**
 * Job Routes
 * Replaces Firebase Firestore job service calls
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requirePermission, requireActiveRecruiter } from '../middleware/roles.js';
import * as jobController from '../controllers/jobs.js';
import { validateJob } from '../middleware/validation.js';

const router = express.Router({ mergeParams: true });

/**
 * @openapi
 * /api/jobs/targeted:
 *   get:
 *     tags: [Jobs]
 *     summary: Get targeted jobs
 *     description: Student, Admin, or Super Admin — jobs targeted to a student (or studentId query for admins).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema: { type: string, format: uuid }
 *         description: Student ID (admin use)
 *     responses:
 *       200:
 *         description: Targeted jobs
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
router.get('/targeted', authenticate, requireRole(['STUDENT', 'ADMIN', 'SUPER_ADMIN']), jobController.getTargetedJobs);

/**
 * @openapi
 * /api/jobs:
 *   get:
 *     tags: [Jobs]
 *     summary: List jobs
 *     description: Authenticated users — list jobs with optional filters (status, company, etc.).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: companyId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Job list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', authenticate, jobController.getJobs);

/**
 * @openapi
 * /api/jobs/{jobId}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get a job
 *     description: Authenticated users — retrieve a single job by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:jobId', authenticate, jobController.getJob);

/**
 * @openapi
 * /api/jobs:
 *   post:
 *     tags: [Jobs]
 *     summary: Create a job
 *     description: Recruiter or Admin — create a new job posting (draft).
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
 *         description: Job created
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
router.post('/', authenticate, requireRole(['RECRUITER', 'ADMIN']), requireActiveRecruiter, validateJob, jobController.createJob);

/**
 * @openapi
 * /api/jobs/{jobId}:
 *   put:
 *     tags: [Jobs]
 *     summary: Update a job
 *     description: Recruiter (owner) or Admin — update job details.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Job updated
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
router.put('/:jobId', authenticate, requireRole(['RECRUITER', 'ADMIN']), requireActiveRecruiter, jobController.updateJob);

/**
 * @openapi
 * /api/jobs/{jobId}/recruiter-note:
 *   patch:
 *     tags: [Jobs]
 *     summary: Update recruiter post-drive note
 *     description: Recruiter only — update post-drive note visible in Company History.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recruiterNote: { type: string }
 *     responses:
 *       200:
 *         description: Recruiter note updated
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
router.patch('/:jobId/recruiter-note', authenticate, requireRole(['RECRUITER']), requireActiveRecruiter, jobController.updateJobRecruiterNote);

/**
 * @openapi
 * /api/jobs/{jobId}/post:
 *   post:
 *     tags: [Jobs]
 *     summary: Post a job
 *     description: Admin only — publish a job and trigger student distribution.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job posted
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
router.post('/:jobId/post', authenticate, requireRole(['ADMIN']), requirePermission('jobs:post'), jobController.postJob);

/**
 * @openapi
 * /api/jobs/{jobId}/approve:
 *   post:
 *     tags: [Jobs]
 *     summary: Approve a job
 *     description: Admin only — approve a pending job posting.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job approved
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
router.post('/:jobId/approve', authenticate, requireRole(['ADMIN']), requirePermission('jobs:approve'), jobController.approveJob);

/**
 * @openapi
 * /api/jobs/{jobId}/analyze:
 *   get:
 *     tags: [Jobs]
 *     summary: Analyze job candidates
 *     description: Admin only — AI-powered candidate ranking and analysis for a job.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Candidate analysis
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
router.get('/:jobId/analyze', authenticate, requireRole(['ADMIN']), jobController.analyzeCandidates);

/**
 * @openapi
 * /api/jobs/{jobId}/reject:
 *   post:
 *     tags: [Jobs]
 *     summary: Reject a job
 *     description: Admin only — reject a pending job posting.
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
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Job rejected
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
router.post('/:jobId/reject', authenticate, requireRole(['ADMIN']), requirePermission('jobs:reject'), jobController.rejectJob);

/**
 * @openapi
 * /api/jobs/auto-archive-expired:
 *   post:
 *     tags: [Jobs]
 *     summary: Auto-archive expired jobs
 *     description: Admin only — archive jobs past their application deadline.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired jobs archived
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
router.post('/auto-archive-expired', authenticate, requireRole(['ADMIN']), requirePermission('jobs:manage'), jobController.autoArchiveExpiredJobs);

/**
 * @openapi
 * /api/jobs/{jobId}:
 *   delete:
 *     tags: [Jobs]
 *     summary: Delete a job
 *     description: Recruiter or Admin — delete a job posting.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job deleted
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
router.delete('/:jobId', authenticate, requireRole(['RECRUITER', 'ADMIN']), requireActiveRecruiter, requirePermission('jobs:delete'), jobController.deleteJob);

export default router;
