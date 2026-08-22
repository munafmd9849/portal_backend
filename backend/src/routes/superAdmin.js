/**
 * Super Admin Routes
 * Create/disable admins, stats by center/department/admin
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  listAdmins,
  createAdmin,
  disableAdmin,
  enableAdmin,
  updateAdmin,
  getSuperAdminStats,
  getStatsSummary,
  getAdminPerformance,
} from '../controllers/superAdmin.js';
import {
  getOverview,
  getFunnel,
  getBatchPerformance,
  getSchoolPerformance,
  getCenterPerformance,
  getUnplacedStudents,
  getCompanyPerformance,
  getAdminPerformanceAnalytics
} from '../controllers/analytics.js';
import {
  getGoogleSheetsSettings,
  updateGoogleSheetsSettings,
} from '../controllers/googleSheetsConfig.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireRole(['SUPER_ADMIN']));

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @openapi
 * /api/super-admin/admins:
 *   get:
 *     tags: [Super Admin]
 *     summary: List admin users
 *     description: Returns all admin users with scope and permission details. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin user list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 admins:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/admins', listAdmins);

/**
 * @openapi
 * /api/super-admin/admins:
 *   post:
 *     tags: [Super Admin]
 *     summary: Create admin user
 *     description: Creates a new admin user with optional scope restrictions. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               displayName:
 *                 type: string
 *               role:
 *                 type: string
 *                 default: ADMIN
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *               allowedSchools:
 *                 type: array
 *                 items: { type: string }
 *               allowedCenters:
 *                 type: array
 *                 items: { type: string }
 *               allowedBatches:
 *                 type: array
 *                 items: { type: string }
 *               allowedSchoolIds:
 *                 type: array
 *                 items: { type: string }
 *               allowedCenterIds:
 *                 type: array
 *                 items: { type: string }
 *               allowedBatchIds:
 *                 type: array
 *                 items: { type: string }
 *               fullAccess:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Admin created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 admin:
 *                   type: object
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
  '/admins',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('displayName').optional().trim(),
  handleValidation,
  createAdmin
);

/**
 * @openapi
 * /api/super-admin/admins/{userId}/disable:
 *   patch:
 *     tags: [Super Admin]
 *     summary: Disable admin user
 *     description: Sets an admin user's status to BLOCKED. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Admin disabled
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/admins/:userId/disable', disableAdmin);

/**
 * @openapi
 * /api/super-admin/admins/{userId}/enable:
 *   patch:
 *     tags: [Super Admin]
 *     summary: Enable admin user
 *     description: Re-activates a previously disabled admin user. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Admin enabled
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/admins/:userId/enable', enableAdmin);

/**
 * @openapi
 * /api/super-admin/admins/{userId}:
 *   patch:
 *     tags: [Super Admin]
 *     summary: Update admin user
 *     description: Updates admin profile, permissions, or scope. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *               allowedSchoolIds:
 *                 type: array
 *                 items: { type: string }
 *               allowedCenterIds:
 *                 type: array
 *                 items: { type: string }
 *               allowedBatchIds:
 *                 type: array
 *                 items: { type: string }
 *               fullAccess:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Admin updated
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/admins/:userId', updateAdmin);

/**
 * @openapi
 * /api/super-admin/admins/{userId}/performance:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get admin performance
 *     description: Returns performance metrics for a specific admin user. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Admin performance data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/admins/:userId/performance', getAdminPerformance);

/**
 * @openapi
 * /api/super-admin/stats:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get super admin statistics
 *     description: Returns detailed statistics by center, department, and admin. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics data
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
router.get('/stats', getSuperAdminStats);

/**
 * @openapi
 * /api/super-admin/stats/summary:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get statistics summary
 *     description: Returns a high-level summary of super admin statistics. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics summary
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
router.get('/stats/summary', getStatsSummary);

/**
 * @openapi
 * /api/super-admin/google-sheets/config:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get Google Sheets configuration
 *     description: Returns the configured Google Sheets spreadsheet and credentials status. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Google Sheets settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configured:
 *                   type: boolean
 *                 spreadsheetId:
 *                   type: string
 *                   nullable: true
 *                 spreadsheetUrl:
 *                   type: string
 *                   nullable: true
 *                 credentialsConfigured:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/google-sheets/config', getGoogleSheetsSettings);

/**
 * @openapi
 * /api/super-admin/google-sheets/config:
 *   put:
 *     tags: [Super Admin]
 *     summary: Update Google Sheets configuration
 *     description: Sets the master Google Sheets spreadsheet URL or ID. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               spreadsheetUrl:
 *                 type: string
 *               spreadsheetId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 spreadsheetId:
 *                   type: string
 *                 spreadsheetUrl:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/google-sheets/config', updateGoogleSheetsSettings);

/**
 * @openapi
 * /api/super-admin/analytics/overview:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get analytics overview
 *     description: Returns control tower analytics overview. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics overview
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
router.get('/analytics/overview', getOverview);

/**
 * @openapi
 * /api/super-admin/analytics/funnel:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get placement funnel analytics
 *     description: Returns placement funnel metrics. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Funnel analytics
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
router.get('/analytics/funnel', getFunnel);

/**
 * @openapi
 * /api/super-admin/analytics/batch-performance:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get batch performance analytics
 *     description: Returns placement performance broken down by batch. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batch performance analytics
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
router.get('/analytics/batch-performance', getBatchPerformance);

/**
 * @openapi
 * /api/super-admin/analytics/school-performance:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get school performance analytics
 *     description: Returns placement performance broken down by school. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: School performance analytics
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
router.get('/analytics/school-performance', getSchoolPerformance);

/**
 * @openapi
 * /api/super-admin/analytics/center-performance:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get center performance analytics
 *     description: Returns placement performance broken down by center. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Center performance analytics
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
router.get('/analytics/center-performance', getCenterPerformance);

/**
 * @openapi
 * /api/super-admin/analytics/unplaced-students:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get unplaced students analytics
 *     description: Returns analytics for students who have not yet been placed. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unplaced students analytics
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
router.get('/analytics/unplaced-students', getUnplacedStudents);

/**
 * @openapi
 * /api/super-admin/analytics/company-performance:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get company performance analytics
 *     description: Returns placement performance broken down by company. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company performance analytics
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
router.get('/analytics/company-performance', getCompanyPerformance);

/**
 * @openapi
 * /api/super-admin/analytics/admin-performance:
 *   get:
 *     tags: [Super Admin]
 *     summary: Get admin performance analytics
 *     description: Returns aggregate admin performance analytics across all admins. Super Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin performance analytics
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
router.get('/analytics/admin-performance', getAdminPerformanceAnalytics);

export default router;
