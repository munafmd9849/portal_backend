/**
 * AI Interview Prep routes — Gemini-powered practice sessions
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getInterviewPrepMeta,
  analyzeInterviewTarget,
  createInterviewPrepSession,
  getInterviewPrepSession,
  listInterviewPrepSessions,
  submitInterviewPrepAnswer,
  evaluateInterviewPrepAnswer,
  completeInterviewPrepSession,
  getInterviewPrepAnalytics,
} from '../services/interviewPrepService.js';

const router = express.Router();

router.use(authenticate, requireRole(['STUDENT']));

const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: { error: 'Too many interview sessions started. Please wait before starting another.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const evaluateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  message: { error: 'Too many evaluation requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /api/placement/interview-prep/meta:
 *   get:
 *     tags: [Interview Prep]
 *     summary: Get interview prep metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metadata (difficulties, interview types, etc.)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/meta', (_req, res) => {
  res.json({ success: true, ...getInterviewPrepMeta() });
});

/**
 * @openapi
 * /api/placement/interview-prep/analyze:
 *   post:
 *     tags: [Interview Prep]
 *     summary: Analyze resume and target role for interview prep
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resumeId: { type: string }
 *               resumeText: { type: string }
 *               jobId: { type: string }
 *               jobTitle: { type: string }
 *               targetRole: { type: string }
 *               company: { type: string }
 *               companyName: { type: string }
 *               jobDescription: { type: string }
 *     responses:
 *       200:
 *         description: Analysis result
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/analyze',
  sessionLimiter,
  [
    body('resumeId').optional().isString(),
    body('resumeText').optional().isString(),
    body('jobId').optional().isString(),
    body('jobTitle').optional().isString(),
    body('targetRole').optional().isString(),
    body('company').optional().isString(),
    body('companyName').optional().isString(),
    body('jobDescription').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const result = await analyzeInterviewTarget(req.userId, req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Failed to analyze resume and target role' });
    }
  },
);

/**
 * @openapi
 * /api/placement/interview-prep/analytics:
 *   get:
 *     tags: [Interview Prep]
 *     summary: Get interview prep analytics for the student
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/analytics', async (req, res) => {
  try {
    const data = await getInterviewPrepAnalytics(req.userId);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to load analytics' });
  }
});

/**
 * @openapi
 * /api/placement/interview-prep/sessions:
 *   get:
 *     tags: [Interview Prep]
 *     summary: List interview prep sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of sessions
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   post:
 *     tags: [Interview Prep]
 *     summary: Create a new interview prep session
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resumeId: { type: string }
 *               resumeText: { type: string }
 *               jobId: { type: string }
 *               jobTitle: { type: string }
 *               targetRole: { type: string }
 *               difficulty: { type: string, enum: [easy, medium, hard] }
 *               interviewType: { type: string, enum: [CONCEPTUAL, SITUATIONAL, CODING, MIXED, ORAL] }
 *               company: { type: string }
 *               companyName: { type: string }
 *               jobDescription: { type: string }
 *               analysis: { type: object }
 *     responses:
 *       201:
 *         description: Session created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await listInterviewPrepSessions(req.userId, {
      limit: req.query.limit,
    });
    res.json({ success: true, sessions });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to list sessions' });
  }
});

/**
 * @openapi
 * /api/placement/interview-prep/sessions/{sessionId}:
 *   get:
 *     tags: [Interview Prep]
 *     summary: Get interview prep session by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session details
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
router.get(
  '/sessions/:sessionId',
  [param('sessionId').isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const session = await getInterviewPrepSession(req.userId, req.params.sessionId);
      res.json({ success: true, session });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Failed to load session' });
    }
  },
);

router.post(
  '/sessions',
  sessionLimiter,
  [
    body('resumeId').optional().isString(),
    body('resumeText').optional().isString(),
    body('jobId').optional().isString(),
    body('jobTitle').optional().isString(),
    body('targetRole').optional().isString(),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
    body('interviewType').optional().isIn(['CONCEPTUAL', 'SITUATIONAL', 'CODING', 'MIXED', 'ORAL']),
    body('company').optional().isString(),
    body('companyName').optional().isString(),
    body('jobDescription').optional().isString(),
    body('analysis').optional().isObject(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const result = await createInterviewPrepSession(req.userId, req.body);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Failed to create session' });
    }
  },
);

/**
 * @openapi
 * /api/placement/interview-prep/sessions/{sessionId}/questions/{questionId}/answer:
 *   post:
 *     tags: [Interview Prep]
 *     summary: Submit an answer for an interview prep question
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transcript: { type: string }
 *               studentText: { type: string }
 *               studentCode: { type: string }
 *               audioBase64: { type: string }
 *               audioMimeType: { type: string }
 *     responses:
 *       200:
 *         description: Answer submitted
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
router.post(
  '/sessions/:sessionId/questions/:questionId/answer',
  [
    param('sessionId').isString(),
    param('questionId').isString(),
    body('transcript').optional().isString(),
    body('studentText').optional().isString(),
    body('studentCode').optional().isString(),
    body('audioBase64').optional().isString(),
    body('audioMimeType').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const question = await submitInterviewPrepAnswer(
        req.userId,
        req.params.sessionId,
        req.params.questionId,
        req.body,
      );
      res.json({ success: true, question });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Failed to submit answer' });
    }
  },
);

/**
 * @openapi
 * /api/placement/interview-prep/sessions/{sessionId}/questions/{questionId}/evaluate:
 *   post:
 *     tags: [Interview Prep]
 *     summary: Evaluate an interview prep answer with AI
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Answer evaluated
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/sessions/:sessionId/questions/:questionId/evaluate',
  evaluateLimiter,
  [param('sessionId').isString(), param('questionId').isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const question = await evaluateInterviewPrepAnswer(
        req.userId,
        req.params.sessionId,
        req.params.questionId,
      );
      res.json({ success: true, question });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Failed to evaluate answer' });
    }
  },
);

/**
 * @openapi
 * /api/placement/interview-prep/sessions/{sessionId}/complete:
 *   post:
 *     tags: [Interview Prep]
 *     summary: Complete an interview prep session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session completed
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
router.post(
  '/sessions/:sessionId/complete',
  [param('sessionId').isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const session = await completeInterviewPrepSession(req.userId, req.params.sessionId);
      res.json({ success: true, session });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Failed to complete session' });
    }
  },
);

export default router;
