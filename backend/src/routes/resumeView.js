/**
 * Resume view routes (public by token - for opening in new tab)
 */

import express from 'express';
import * as resumeViewController from '../controllers/resumeView.js';

const router = express.Router();

/**
 * @openapi
 * /api/resume/view:
 *   get:
 *     tags: [Resume]
 *     summary: Stream resume PDF by token
 *     description: Streams a resume PDF with Content-Disposition inline using a short-lived JWT in the query string. No Bearer auth required — token is passed as query parameter for new-tab viewing.
 *     parameters:
 *       - in: query
 *         name: t
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT token (payload type application or student_resume)
 *     responses:
 *       200:
 *         description: Resume PDF stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/view', resumeViewController.streamByToken);

export default router;
