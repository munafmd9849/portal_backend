/**
 * Interviewer Routes (Token-Based)
 * Public routes for interviewers (no login required)
 */

import express from 'express';
import {
  getSession,
  getActiveRound,
  getRoundCandidates,
  evaluateCandidate,
  startRound,
  endRound,
  endSession,
  exportSessionSpreadsheet,
} from '../controllers/interviewScheduling.js';

const router = express.Router();

/**
 * @openapi
 * /api/interview/session/{sessionId}:
 *   get:
 *     tags: [Interviewer]
 *     summary: Get interview session (interviewer token)
 *     description: Requires interviewer invite token via query `token` or Authorization Bearer header.
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Interviewer invite JWT token
 *     responses:
 *       200:
 *         description: Session details
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/:sessionId', getSession);

/**
 * @openapi
 * /api/interview/session/{sessionId}/export:
 *   get:
 *     tags: [Interviewer]
 *     summary: Export session spreadsheet
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Interviewer invite JWT token
 *     responses:
 *       200:
 *         description: Spreadsheet file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/:sessionId/export', exportSessionSpreadsheet);

/**
 * @openapi
 * /api/interview/session/{sessionId}/active-round:
 *   get:
 *     tags: [Interviewer]
 *     summary: Get active round for a session
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active round
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/session/:sessionId/active-round', getActiveRound);

/**
 * @openapi
 * /api/interview/round/{roundId}/candidates:
 *   get:
 *     tags: [Interviewer]
 *     summary: Get candidates for a round
 *     parameters:
 *       - in: path
 *         name: roundId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
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
router.get('/round/:roundId/candidates', getRoundCandidates);

/**
 * @openapi
 * /api/interview/round/{roundId}/evaluate:
 *   post:
 *     tags: [Interviewer]
 *     summary: Evaluate a candidate in a round
 *     parameters:
 *       - in: path
 *         name: roundId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
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
router.post('/round/:roundId/evaluate', evaluateCandidate);

/**
 * @openapi
 * /api/interview/round/{roundId}/start:
 *   post:
 *     tags: [Interviewer]
 *     summary: Start an interview round
 *     parameters:
 *       - in: path
 *         name: roundId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
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
router.post('/round/:roundId/start', startRound);

/**
 * @openapi
 * /api/interview/round/{roundId}/end:
 *   post:
 *     tags: [Interviewer]
 *     summary: End an interview round
 *     parameters:
 *       - in: path
 *         name: roundId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
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
router.post('/round/:roundId/end', endRound);

/**
 * @openapi
 * /api/interview/session/{sessionId}/end:
 *   post:
 *     tags: [Interviewer]
 *     summary: End an interview session
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session ended
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/session/:sessionId/end', endSession);

export default router;
