/**
 * Token-Based Interview Routes
 * Public routes for interviewers to access sessions via token (no login required)
 */

import express from 'express';
import { validateSessionToken } from '../middleware/sessionToken.js';
import {
  getSessionByToken,
  startRoundByToken,
  endRoundByToken,
  getCandidatesByToken,
  evaluateCandidateByToken,
  getActivitiesByToken,
} from '../controllers/interviewToken.js';

const router = express.Router();

// All routes require valid session token (no authentication/role check)
router.use('/session/:token', validateSessionToken);

/**
 * @openapi
 * /api/interview/session/{token}:
 *   get:
 *     tags: [Interview Token]
 *     summary: Get session info by legacy session token
 *     description: Legacy token-based interview access. Token is the path parameter (no JWT login).
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Legacy interview session token
 *     responses:
 *       200:
 *         description: Session information
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/:token', getSessionByToken);

/**
 * @openapi
 * /api/interview/session/{token}/round/{roundName}/start:
 *   post:
 *     tags: [Interview Token]
 *     summary: Start a round by legacy session token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roundName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Round started
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/:token/round/:roundName/start', startRoundByToken);

/**
 * @openapi
 * /api/interview/session/{token}/round/{roundName}/end:
 *   post:
 *     tags: [Interview Token]
 *     summary: End a round by legacy session token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roundName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Round ended
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/:token/round/:roundName/end', endRoundByToken);

/**
 * @openapi
 * /api/interview/session/{token}/round/{roundName}/candidates:
 *   get:
 *     tags: [Interview Token]
 *     summary: Get candidates for a round by legacy session token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roundName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Round candidates
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/:token/round/:roundName/candidates', getCandidatesByToken);

/**
 * @openapi
 * /api/interview/session/{token}/candidate/{studentId}:
 *   patch:
 *     tags: [Interview Token]
 *     summary: Evaluate a candidate by legacy session token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Evaluation saved
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/session/:token/candidate/:studentId', evaluateCandidateByToken);

/**
 * @openapi
 * /api/interview/session/{token}/activities:
 *   get:
 *     tags: [Interview Token]
 *     summary: Get activity feed by legacy session token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity feed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/:token/activities', getActivitiesByToken);

export default router;
