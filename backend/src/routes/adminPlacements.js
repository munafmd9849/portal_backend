import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getPlacements, patchPlacementCompensation } from '../controllers/placements.js';

const router = express.Router();

/**
 * @openapi
 * /api/admin/placements:
 *   get:
 *     tags: [Admin Placements]
 *     summary: List joined placements
 *     description: Returns placement records for students who have joined, with optional filters.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
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
 *         description: Placement list
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
router.get('/', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getPlacements);

/**
 * @openapi
 * /api/admin/placements/{applicationId}:
 *   patch:
 *     tags: [Admin Placements]
 *     summary: Update placement compensation
 *     description: Updates compensation details for a joined placement record.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ctc:
 *                 type: number
 *               compensationNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated placement record
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
router.patch(
  '/:applicationId',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  patchPlacementCompensation,
);

export default router;
