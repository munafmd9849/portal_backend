/**
 * Admin Requests Routes
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  createAdminRequest,
  getPendingAdminRequests,
  getAllAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
} from '../controllers/adminRequests.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Validation middleware
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @openapi
 * /api/admin-requests:
 *   post:
 *     tags: [Admin Requests]
 *     summary: Create an admin access request
 *     description: Any authenticated user can request admin privileges.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Admin request created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/',
  body('reason').optional().isString().trim(),
  handleValidation,
  createAdminRequest
);

/**
 * @openapi
 * /api/admin-requests/pending:
 *   get:
 *     tags: [Admin Requests]
 *     summary: List pending admin requests
 *     description: Admin and Super Admin only — returns pending admin admission requests.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending admin requests
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
router.get('/pending', requireRole(['ADMIN', 'SUPER_ADMIN']), getPendingAdminRequests);

/**
 * @openapi
 * /api/admin-requests:
 *   get:
 *     tags: [Admin Requests]
 *     summary: List all admin requests
 *     description: Admin and Super Admin only — returns all admin admission requests.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All admin requests
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
router.get('/', requireRole(['ADMIN', 'SUPER_ADMIN']), getAllAdminRequests);

/**
 * @openapi
 * /api/admin-requests/{requestId}/approve:
 *   patch:
 *     tags: [Admin Requests]
 *     summary: Approve an admin request
 *     description: Super Admin only — approve a pending admin access request.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Admin request approved
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
router.patch(
  '/:requestId/approve',
  requireRole(['SUPER_ADMIN']),
  approveAdminRequest
);

/**
 * @openapi
 * /api/admin-requests/{requestId}/reject:
 *   patch:
 *     tags: [Admin Requests]
 *     summary: Reject an admin request
 *     description: Super Admin only — reject a pending admin access request.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Admin request rejected
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
  '/:requestId/reject',
  requireRole(['SUPER_ADMIN']),
  body('reason').optional().isString().trim(),
  handleValidation,
  rejectAdminRequest
);

export default router;
