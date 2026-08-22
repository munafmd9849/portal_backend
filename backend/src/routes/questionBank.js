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

/**
 * @openapi
 * /api/placement/question-bank/meta:
 *   get:
 *     tags: [Question Bank]
 *     summary: Get question bank metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metadata (categories, companies, difficulties)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/meta', (_req, res) => {
  res.json(getQuestionBankMeta());
});

/**
 * @openapi
 * /api/placement/question-bank:
 *   get:
 *     tags: [Question Bank]
 *     summary: List question bank questions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, attempted, unattempted]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: attemptedIds
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Filtered question list
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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

/**
 * @openapi
 * /api/placement/question-bank/generate:
 *   post:
 *     tags: [Question Bank]
 *     summary: Generate personalized questions from resume and job description
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId: { type: string }
 *               jobTitle: { type: string }
 *               company: { type: string }
 *               companyName: { type: string }
 *               jobDescription: { type: string }
 *     responses:
 *       200:
 *         description: Generated questions
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
