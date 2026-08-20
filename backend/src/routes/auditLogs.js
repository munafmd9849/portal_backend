/**
 * Audit Log Routes
 * Restricted to SUPER_ADMIN.
 */

import express from 'express';
import { getAuditLogs } from '../controllers/auditLogs.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

// All audit log routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(requireRole(['SUPER_ADMIN']));

/**
 * @openapi
 * /api/admin/audit-logs:
 *   get:
 *     tags: [Audit Logs]
 *     summary: Fetch audit logs
 *     description: Returns paginated audit logs with optional filters. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by actor role
 *       - in: query
 *         name: actionType
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search actor name, details, target type, or target ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: timestamp
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                 filters:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', getAuditLogs);

export default router;
