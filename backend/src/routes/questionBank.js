/**
 * Question bank routes — curated + AI-personalized from resume + JD
 */

import express from 'express';
import { body, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getQuestionBankMeta,
  listQuestions,
  generatePersonalizedQuestions,
} from '../services/questionBankService.js';

const router = express.Router();

router.use(authenticate, requireRole(['STUDENT']));

const generateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: { error: 'Too many generation requests. Please wait a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/meta', (_req, res) => {
  res.json(getQuestionBankMeta());
});

router.get(
  '/',
  [
    query('category').optional().isString(),
    query('company').optional().isString(),
    query('difficulty').optional().isString(),
    query('status').optional().isIn(['all', 'attempted', 'unattempted']),
    query('search').optional().isString(),
    query('attemptedIds').optional().isString(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const data = listQuestions(req.query);
    res.json({ success: true, ...data });
  },
);

router.post(
  '/generate',
  generateLimiter,
  [
    body('jobId').optional().isString(),
    body('jobTitle').optional().isString(),
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
      const result = await generatePersonalizedQuestions(req.userId, req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ error: error.message || 'Failed to generate questions' });
    }
  },
);

export default router;
