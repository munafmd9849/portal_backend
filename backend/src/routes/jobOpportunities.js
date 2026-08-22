import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getOverview,
  getBreakdown,
  getCrManagers,
  getMom,
  getFilters,
} from '../controllers/jobOpportunities.js';

const router = express.Router();

/**
 * @openapi
 * /api/admin/job-opportunities/overview:
 *   get:
 *     tags: [Job Opportunities]
 *     summary: Get job opportunities overview
 *     description: Returns pipeline overview cards for the Job Opportunities dashboard.
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
 *       - in: query
 *         name: quarter
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Overview data
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
router.get('/overview', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getOverview);

/**
 * @openapi
 * /api/admin/job-opportunities/breakdown/{cardKey}:
 *   get:
 *     tags: [Job Opportunities]
 *     summary: Get card breakdown
 *     description: Returns drill-down breakdown for a specific overview card.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardKey
 *         required: true
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
 *         description: Card breakdown data
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
router.get('/breakdown/:cardKey', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getBreakdown);

/**
 * @openapi
 * /api/admin/job-opportunities/cr-managers:
 *   get:
 *     tags: [Job Opportunities]
 *     summary: Get CR manager overview
 *     description: Returns CR manager performance overview for job opportunities.
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
 *         description: CR manager overview
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
router.get('/cr-managers', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getCrManagers);

/**
 * @openapi
 * /api/admin/job-opportunities/mom-table:
 *   get:
 *     tags: [Job Opportunities]
 *     summary: Get minutes-of-meeting table
 *     description: Returns the MoM table for job opportunity drives with optional search.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
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
 *         description: MoM table data
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
router.get('/mom-table', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getMom);

/**
 * @openapi
 * /api/admin/job-opportunities/filter-options:
 *   get:
 *     tags: [Job Opportunities]
 *     summary: Get filter options
 *     description: Returns available filter options for the Job Opportunities dashboard.
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
router.get('/filter-options', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getFilters);

export default router;
