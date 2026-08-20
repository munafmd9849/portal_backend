import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getFilters,
  getJobOpportunities,
  getStudents,
  getCareerServices,
  getAll,
} from '../controllers/controlTower.js';

const router = express.Router();
const roles = ['ADMIN', 'SUPER_ADMIN'];

/**
 * @openapi
 * /api/admin/control-tower/filters:
 *   get:
 *     tags: [Control Tower]
 *     summary: Get control tower filter options
 *     description: Returns available filter values for control tower analytics views.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Filter options
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
router.get('/filters', authenticate, requireRole(roles), getFilters);

/**
 * @openapi
 * /api/admin/control-tower/job-opportunities:
 *   get:
 *     tags: [Control Tower]
 *     summary: Get job opportunities analytics
 *     description: Returns control tower job opportunities pipeline analytics.
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
 *         description: Job opportunities analytics
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
router.get('/job-opportunities', authenticate, requireRole(roles), getJobOpportunities);

/**
 * @openapi
 * /api/admin/control-tower/students:
 *   get:
 *     tags: [Control Tower]
 *     summary: Get students analytics
 *     description: Returns control tower student placement analytics.
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
 *         description: Students analytics
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
router.get('/students', authenticate, requireRole(roles), getStudents);

/**
 * @openapi
 * /api/admin/control-tower/career-services:
 *   get:
 *     tags: [Control Tower]
 *     summary: Get career services analytics
 *     description: Returns control tower career services metrics.
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
 *         description: Career services analytics
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
router.get('/career-services', authenticate, requireRole(roles), getCareerServices);

/**
 * @openapi
 * /api/admin/control-tower/all:
 *   get:
 *     tags: [Control Tower]
 *     summary: Get all control tower data
 *     description: Returns combined control tower analytics in a single response.
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
 *         description: Combined control tower data
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
router.get('/all', authenticate, requireRole(roles), getAll);

export default router;
