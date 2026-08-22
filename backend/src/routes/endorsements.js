/**
 * Endorsement Routes
 * Magic Link Based Endorsement System
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import rateLimit from 'express-rate-limit';
import {
  requestEndorsement,
  getEndorsementByToken,
  submitEndorsement,
  getStudentEndorsements,
  getEndorsementTeachers,
  deleteEndorsementRequest,
} from '../controllers/endorsements.js';

const router = express.Router({ mergeParams: true });

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors for better frontend handling
    const errorMessages = errors.array().map(err => err.msg);
    return res.status(400).json({ 
      error: errorMessages[0] || 'Validation failed',
      errors: errors.array() // Keep full errors for debugging
    });
  }
  return next();
};

// Rate limiting for public endpoints (prevent abuse)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// AUTHENTICATED ROUTES (Student only) - Must come before :token route
// ============================================================================

/**
 * @openapi
 * /api/endorsements/student:
 *   get:
 *     tags: [Endorsements]
 *     summary: Get student endorsements
 *     description: Student only — list received, pending, and expired endorsements.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student endorsements
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
router.get(
  '/student',
  authenticate,
  requireRole(['STUDENT']),
  getStudentEndorsements
);

/**
 * @openapi
 * /api/endorsements/teachers:
 *   get:
 *     tags: [Endorsements]
 *     summary: Get endorsement teachers
 *     description: Student only — list teachers associated with endorsement requests.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Endorsement teachers
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
router.get(
  '/teachers',
  authenticate,
  requireRole(['STUDENT']),
  getEndorsementTeachers
);

// ============================================================================
// PUBLIC ROUTES (No authentication required for teachers)
// ============================================================================

/**
 * @openapi
 * /api/endorsements/{token}:
 *   get:
 *     tags: [Endorsements]
 *     summary: Get endorsement request by token
 *     description: Public — teachers view endorsement form details via magic link token.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Endorsement request details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:token', publicLimiter, getEndorsementByToken);

/**
 * @openapi
 * /api/endorsements/submit/{token}:
 *   post:
 *     tags: [Endorsements]
 *     summary: Submit an endorsement
 *     description: Public — teachers submit endorsement via magic link token (no auth required).
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endorsementMessage, relationship, consent]
 *             properties:
 *               endorsementMessage: { type: string, minLength: 10, maxLength: 2000 }
 *               endorserName: { type: string }
 *               endorserRole: { type: string }
 *               organization: { type: string }
 *               relationship:
 *                 type: string
 *                 enum: [Professor, Manager, Mentor, Guide, Supervisor, Colleague]
 *               context: { type: string }
 *               consent: { type: boolean }
 *               relatedSkills:
 *                 type: array
 *                 items: { type: string }
 *               strengthRating: { type: integer, minimum: 1, maximum: 5 }
 *     responses:
 *       200:
 *         description: Endorsement submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/submit/:token',
  publicLimiter,
  [
    body('endorsementMessage')
      .trim()
      .notEmpty()
      .withMessage('Endorsement message is required')
      .isLength({ min: 10, max: 2000 })
      .withMessage('Endorsement message must be between 10 and 2000 characters'),
    body('endorserName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Endorser name must be between 2 and 100 characters'),
    body('endorserRole')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Endorser role must be between 2 and 50 characters'),
    body('organization')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Organization must be between 2 and 100 characters'),
    body('relationship')
      .trim()
      .notEmpty()
      .withMessage('Relationship is required')
      .isIn(['Professor', 'Manager', 'Mentor', 'Guide', 'Supervisor', 'Colleague'])
      .withMessage('Relationship must be one of: Professor, Manager, Mentor, Guide, Supervisor, Colleague'),
    body('context')
      .optional({ values: 'falsy' }) // Treat empty strings, null, undefined as optional
      .trim()
      .custom((value) => {
        // If value exists after trim, validate length
        if (value && value.length > 0) {
          if (value.length < 2 || value.length > 200) {
            throw new Error('Context must be between 2 and 200 characters if provided');
          }
        }
        return true;
      }),
    body('consent')
      .custom((value) => {
        // Accept boolean true, string "true", or number 1
        const isValid = value === true || value === 'true' || value === 1 || value === '1';
        if (!isValid) {
          throw new Error('Consent is required. You must agree to submit this endorsement.');
        }
        return true;
      }),
    body('relatedSkills')
      .optional()
      .isArray()
      .withMessage('Related skills must be an array'),
    body('strengthRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Strength rating must be between 1 and 5'),
  ],
  handleValidation,
  submitEndorsement
);

// ============================================================================
// AUTHENTICATED ROUTES (Student only)
// ============================================================================

/**
 * @openapi
 * /api/endorsements/request:
 *   post:
 *     tags: [Endorsements]
 *     summary: Request an endorsement
 *     description: Student only — generate a magic link endorsement request for a teacher.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teacherName, teacherEmail]
 *             properties:
 *               teacherName: { type: string }
 *               teacherEmail: { type: string, format: email }
 *               role: { type: string }
 *               organization: { type: string }
 *     responses:
 *       201:
 *         description: Endorsement request created
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
  '/request',
  authenticate,
  requireRole(['STUDENT']),
  [
    body('teacherName')
      .trim()
      .notEmpty()
      .withMessage('Teacher name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Teacher name must be between 2 and 100 characters'),
    body('teacherEmail')
      .trim()
      .notEmpty()
      .withMessage('Teacher email is required')
      .isEmail()
      .withMessage('Invalid email format'),
    body('role')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Role must not exceed 50 characters'),
    body('organization')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Organization must not exceed 100 characters'),
  ],
  handleValidation,
  requestEndorsement
);

/**
 * @openapi
 * /api/endorsements/request/{tokenId}:
 *   delete:
 *     tags: [Endorsements]
 *     summary: Cancel endorsement request
 *     description: Student only — delete/cancel a pending endorsement request before it is used.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Endorsement request cancelled
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
router.delete(
  '/request/:tokenId',
  authenticate,
  requireRole(['STUDENT']),
  deleteEndorsementRequest
);

export default router;
