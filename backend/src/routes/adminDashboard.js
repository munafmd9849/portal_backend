import express from 'express';
import { getDashboardStats } from '../controllers/adminDashboard.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

/**
 * @openapi
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin Dashboard]
 *     summary: Get aggregated dashboard statistics
 *     description: Returns server-side aggregated dashboard stats for admins. Supports optional academic scope filters.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: center
 *         schema: { type: string }
 *         description: Filter by center name
 *       - in: query
 *         name: school
 *         schema: { type: string }
 *         description: Filter by school name
 *       - in: query
 *         name: quarter
 *         schema: { type: string }
 *         description: Filter by quarter
 *       - in: query
 *         name: batch
 *         schema: { type: string }
 *         description: Filter by batch
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
router.get('/', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getDashboardStats);

export default router;
