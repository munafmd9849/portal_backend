import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getSummary, getStudents, getStudentDetail } from '../controllers/adminReadiness.js';

const router = express.Router();

/**
 * @openapi
 * /api/admin/readiness/summary:
 *   get:
 *     tags: [Admin Readiness]
 *     summary: Get placement readiness summary
 *     description: Returns aggregate placement readiness metrics derived from user activity.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: school
 *         schema: { type: string }
 *       - in: query
 *         name: center
 *         schema: { type: string }
 *       - in: query
 *         name: batch
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Placement readiness summary
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
router.get('/summary', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getSummary);

/**
 * @openapi
 * /api/admin/readiness/students:
 *   get:
 *     tags: [Admin Readiness]
 *     summary: List students with readiness scores
 *     description: Returns paginated students with placement readiness and probability scores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 100 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: readiness }
 *       - in: query
 *         name: sortDir
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: minReadiness
 *         schema: { type: number }
 *       - in: query
 *         name: minProbability
 *         schema: { type: number }
 *       - in: query
 *         name: tier
 *         schema: { type: string }
 *       - in: query
 *         name: school
 *         schema: { type: string }
 *       - in: query
 *         name: center
 *         schema: { type: string }
 *       - in: query
 *         name: batch
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated student readiness list
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
router.get('/students', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getStudents);

/**
 * @openapi
 * /api/admin/readiness/students/{studentId}:
 *   get:
 *     tags: [Admin Readiness]
 *     summary: Get student readiness detail
 *     description: Returns detailed placement readiness breakdown for a single student.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Student readiness detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/students/:studentId', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getStudentDetail);

export default router;
