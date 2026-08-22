import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getCalendarEvents } from '../controllers/placementCalendar.js';

const router = express.Router();

/**
 * @openapi
 * /api/admin/placement-calendar/events:
 *   get:
 *     tags: [Admin Placement Calendar]
 *     summary: Get placement calendar events
 *     description: Returns centralized drive timeline events for admins and recruiters within scope.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: Start of date range
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *         description: End of date range
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by drive status
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 200 }
 *     responses:
 *       200:
 *         description: Calendar events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/events',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']),
  getCalendarEvents,
);

export default router;
