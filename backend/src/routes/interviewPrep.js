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

router.get('/meta', (_req, res) => {
  res.json({ success: true, ...getInterviewPrepMeta() });
});

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

router.get('/analytics', async (req, res) => {
  try {
    const data = await getInterviewPrepAnalytics(req.userId);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to load analytics' });
  }
});

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
