/**
 * Admin Screening Routes
 * Admin-only routes for managing screening
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { manualTriggerScreeningEmails } from '../services/screeningEmailService.js';

const router = express.Router();

/**
 * @openapi
 * /api/admin/screening/send-emails:
 *   post:
 *     tags: [Admin Screening]
 *     summary: Manually trigger screening emails
 *     description: Admin-only endpoint to manually send recruiter screening emails for jobs past their application deadline.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Screening email job triggered
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
router.post('/screening/send-emails', authenticate, requireRole(['ADMIN']), manualTriggerScreeningEmails);

export default router;
