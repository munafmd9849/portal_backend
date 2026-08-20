/**
 * Admin Jobs Routes
 * Admin-only endpoints for job management & reporting
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as applicationController from '../controllers/applications.js';
import * as jobController from '../controllers/jobs.js';

const router = express.Router({ mergeParams: true });

/**
 * @openapi
 * /api/admin/jobs/{jobId}/applications:
 *   get:
 *     tags: [Admin Jobs]
 *     summary: List job applications
 *     description: Returns paginated applications for a job. Accessible by admin, super admin, and the owning recruiter.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25, maximum: 100 }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name, email, phone, or application ID
 *       - in: query
 *         name: applicationStatus
 *         schema: { type: string }
 *       - in: query
 *         name: interviewStatus
 *         schema: { type: string }
 *       - in: query
 *         name: driveDateFilter
 *         schema: { type: string }
 *       - in: query
 *         name: applicationDateFilter
 *         schema: { type: string }
 *       - in: query
 *         name: applicationDateStart
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: applicationDateEnd
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated applications list
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/jobs/:jobId/applications',
  authenticate,
  requireRole(['ADMIN', 'RECRUITER', 'SUPER_ADMIN']),
  applicationController.getAdminJobApplications
);

/**
 * @openapi
 * /api/admin/jobs/{jobId}/applications/{applicationId}:
 *   get:
 *     tags: [Admin Jobs]
 *     summary: Get application detail
 *     description: Returns full detail for a single job application. Accessible by admin, super admin, and the owning recruiter.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Application detail
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/jobs/:jobId/applications/:applicationId',
  authenticate,
  requireRole(['ADMIN', 'RECRUITER', 'SUPER_ADMIN']),
  applicationController.getAdminJobApplicationDetail
);

/**
 * @openapi
 * /api/admin/jobs/{jobId}/note:
 *   patch:
 *     tags: [Admin Jobs]
 *     summary: Update admin post-drive note
 *     description: Saves an admin note on a job visible in the Applicants section. Admin only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Note saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
  '/jobs/:jobId/note',
  authenticate,
  requireRole(['ADMIN']),
  jobController.updateJobAdminNote
);

export default router;
