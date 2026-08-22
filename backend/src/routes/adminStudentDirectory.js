import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getDirectory,
  exportDirectory,
  exportDirectoryToGoogleSheets,
  getStudentPanelData,
  getStudentResumeViewUrl,
} from '../controllers/adminStudentDirectory.js';

const router = express.Router();

/**
 * @openapi
 * /api/admin/student-directory:
 *   get:
 *     tags: [Admin Student Directory]
 *     summary: Get student directory
 *     description: Returns paginated student directory with computed metrics (never stored on Student).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: school
 *         schema: { type: string }
 *       - in: query
 *         name: center
 *         schema: { type: string }
 *       - in: query
 *         name: batch
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Student directory data
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
router.get('/', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getDirectory);

/**
 * @openapi
 * /api/admin/student-directory/export:
 *   get:
 *     tags: [Admin Student Directory]
 *     summary: Export student directory
 *     description: Returns full student directory export data matching current filters.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: school
 *         schema: { type: string }
 *       - in: query
 *         name: center
 *         schema: { type: string }
 *       - in: query
 *         name: batch
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Export data
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
router.get('/export', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), exportDirectory);

/**
 * @openapi
 * /api/admin/student-directory/export/google-sheets:
 *   post:
 *     tags: [Admin Student Directory]
 *     summary: Export directory to Google Sheets
 *     description: Appends a snapshot of the filtered student directory to a new tab in the configured Google Sheet.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: school
 *         schema: { type: string }
 *       - in: query
 *         name: center
 *         schema: { type: string }
 *       - in: query
 *         name: batch
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Export succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       503:
 *         description: Google Sheets not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/export/google-sheets',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  exportDirectoryToGoogleSheets,
);

/**
 * @openapi
 * /api/admin/student-directory/{studentId}/panel:
 *   get:
 *     tags: [Admin Student Directory]
 *     summary: Get student panel data
 *     description: Returns extended panel data for a single student in the directory.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Student panel data
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
router.get(
  '/:studentId/panel',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  getStudentPanelData,
);

/**
 * @openapi
 * /api/admin/student-directory/{studentId}/resumes/{resumeId}/view-url:
 *   get:
 *     tags: [Admin Student Directory]
 *     summary: Get resume view URL
 *     description: Returns a signed URL to view a student's resume inline.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Resume view URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
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
  '/:studentId/resumes/:resumeId/view-url',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  getStudentResumeViewUrl,
);

export default router;
