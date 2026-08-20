import express from 'express';
import { body, validationResult } from 'express-validator';

import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { uploadProofDocument } from '../middleware/upload.js';
import {
  createStudentQuery,
  getStudentQueries,
  getAllQueries,
  respondToStudentQuery,
} from '../controllers/queries.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

/**
 * @openapi
 * /api/queries:
 *   post:
 *     tags: [Queries]
 *     summary: Submit a support query
 *     description: Student or Recruiter — create a question, CGPA, calendar, endorsement, or backlog query. Optional proof document upload.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [subject]
 *             properties:
 *               subject: { type: string }
 *               message: { type: string }
 *               type:
 *                 type: string
 *                 enum: [question, cgpa, calendar, endorsement, backlog]
 *                 default: question
 *               teacherEmail: { type: string, format: email }
 *               proofDocument:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Query created
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
router.post(
  '/',
  requireRole(['STUDENT', 'RECRUITER']),
  uploadProofDocument, // Handle optional proof document upload (multer middleware)
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').custom((value, { req }) => {
    const type = (req.body.type || 'question').toLowerCase();
    if (type !== 'question') {
      return true;
    }
    if (!value || !value.trim()) {
      throw new Error('Message is required for questions');
    }
    if (value.trim().length < 10) {
      throw new Error('Message must be at least 10 characters');
    }
    return true;
  }),
  body('type')
    .optional()
    .isIn(['question', 'cgpa', 'calendar', 'endorsement', 'backlog'])
    .withMessage('Invalid query type'),
  body('teacherEmail')
    .optional()
    .custom((value, { req }) => {
      const type = (req.body.type || 'question').toLowerCase();
      if (type === 'endorsement') {
        if (!value || !value.trim()) {
          throw new Error('Teacher email is required for endorsement requests');
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          throw new Error('Please provide a valid teacher email address');
        }
      }
      return true;
    }),
  handleValidation,
  createStudentQuery
);

/**
 * @openapi
 * /api/queries:
 *   get:
 *     tags: [Queries]
 *     summary: Get own queries
 *     description: Student or Recruiter — list queries submitted by the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User queries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', requireRole(['STUDENT', 'RECRUITER']), getStudentQueries);

/**
 * @openapi
 * /api/queries/admin:
 *   get:
 *     tags: [Queries]
 *     summary: Get all queries (admin)
 *     description: Admin and Super Admin only — list all student/recruiter support queries.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All queries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/admin', requireRole(['ADMIN', 'SUPER_ADMIN']), getAllQueries);

/**
 * @openapi
 * /api/queries/{queryId}/respond:
 *   patch:
 *     tags: [Queries]
 *     summary: Respond to a query
 *     description: Admin and Super Admin only — reply to a support query and optionally update status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [response]
 *             properties:
 *               response: { type: string }
 *               status:
 *                 type: string
 *                 enum: [OPEN, RESOLVED, CLOSED]
 *     responses:
 *       200:
 *         description: Query responded
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
router.patch(
  '/:queryId/respond',
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  body('response')
    .trim()
    .notEmpty()
    .withMessage('Response text is required'),
  body('status')
    .optional()
    .isIn(['OPEN', 'RESOLVED', 'CLOSED'])
    .withMessage('Invalid status'),
  handleValidation,
  respondToStudentQuery
);

export default router;
