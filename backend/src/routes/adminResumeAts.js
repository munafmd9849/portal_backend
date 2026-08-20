import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { listResumeAts, scoreOne, scoreBatch } from '../controllers/adminResumeAts.js';

const router = express.Router();
const roles = ['ADMIN', 'SUPER_ADMIN'];

/**
 * @openapi
 * /api/admin/resume-ats:
 *   get:
 *     tags: [Admin Resume ATS]
 *     summary: List student resume ATS scores
 *     description: Returns paginated primary resume ATS scores for students within admin scope.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25, maximum: 100 }
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
 *         name: search
 *         schema: { type: string }
 *         description: Search by name, email, or enrollment ID
 *       - in: query
 *         name: scoreFilter
 *         schema: { type: string }
 *       - in: query
 *         name: hasResume
 *         schema: { type: boolean }
 *       - in: query
 *         name: minScore
 *         schema: { type: integer }
 *       - in: query
 *         name: maxScore
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated ATS score list
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
router.get('/', authenticate, requireRole(roles), listResumeAts);

/**
 * @openapi
 * /api/admin/resume-ats/score/{studentId}:
 *   post:
 *     tags: [Admin Resume ATS]
 *     summary: Score a student's primary resume
 *     description: Runs ATS scoring on the primary resume for the given student.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: ATS score result
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
router.post('/score/:studentId', authenticate, requireRole(roles), scoreOne);

/**
 * @openapi
 * /api/admin/resume-ats/score-batch:
 *   post:
 *     tags: [Admin Resume ATS]
 *     summary: Batch score primary resumes
 *     description: Runs ATS scoring on multiple students' primary resumes in one request.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items: { type: string }
 *               school:
 *                 type: string
 *               center:
 *                 type: string
 *               batch:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batch scoring results
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
router.post('/score-batch', authenticate, requireRole(roles), scoreBatch);

export default router;
