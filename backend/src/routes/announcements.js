/**
 * Announcements Routes
 * Admin creates announcements; students get email (GenZ / Retro styled)
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { uploadAnnouncementImage } from '../middleware/upload.js';
import * as announcementsController from '../controllers/announcements.js';

const router = express.Router();

/**
 * @openapi
 * /api/announcements:
 *   get:
 *     tags: [Announcements]
 *     summary: List announcements
 *     description: Returns announcements ordered by newest first. Admin only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Maximum number of announcements to return
 *     responses:
 *       200:
 *         description: List of announcements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 announcements:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', authenticate, requireRole(['ADMIN']), announcementsController.listAnnouncements);

/**
 * @openapi
 * /api/announcements:
 *   post:
 *     tags: [Announcements]
 *     summary: Create announcement
 *     description: Creates an announcement and sends email to targeted students. Admin only. Supports multipart form data with optional image upload.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               link:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               targetSchools:
 *                 type: string
 *                 description: JSON array or comma-separated school names, or ALL
 *               targetBatches:
 *                 type: string
 *                 description: JSON array or comma-separated batch names, or ALL
 *               targetCenters:
 *                 type: string
 *                 description: JSON array or comma-separated center names, or ALL
 *     responses:
 *       200:
 *         description: Announcement created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 announcement:
 *                   type: object
 *                 emailsSent:
 *                   type: integer
 *                 emailsFailed:
 *                   type: integer
 *                 totalRecipients:
 *                   type: integer
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
  authenticate,
  requireRole(['ADMIN']),
  uploadAnnouncementImage,
  announcementsController.createAnnouncement
);

export default router;
