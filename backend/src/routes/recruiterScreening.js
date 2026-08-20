/**
 * Recruiter Screening Routes
 * Token-based routes (no login required)
 */

import express from 'express';
import * as recruiterScreeningController from '../controllers/recruiterScreening.js';

const router = express.Router();

/**
 * @openapi
 * /api/recruiter/screening/session:
 *   post:
 *     tags: [Recruiter Screening]
 *     summary: Get or create screening session
 *     description: Token-based endpoint to initialize or retrieve a recruiter screening session. No JWT required.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               jobId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Screening session data
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
router.post('/screening/session', recruiterScreeningController.getOrCreateScreeningSession);

/**
 * @openapi
 * /api/recruiter/screening/session:
 *   get:
 *     tags: [Recruiter Screening]
 *     summary: Get screening session (query params)
 *     description: Token-based GET variant to retrieve a recruiter screening session via query parameters.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Screening session data
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
router.get('/screening/session', recruiterScreeningController.getOrCreateScreeningSession);

/**
 * @openapi
 * /api/recruiter/screening/application/{applicationId}:
 *   patch:
 *     tags: [Recruiter Screening]
 *     summary: Update application screening status
 *     description: Updates screening status for an application within an active recruiter session. Requires valid token query parameter.
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               screeningStatus:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application updated
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
 *       409:
 *         description: Screening session already finalized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/screening/application/:applicationId', recruiterScreeningController.verifyRecruiterToken, recruiterScreeningController.updateScreeningStatus);

/**
 * @openapi
 * /api/recruiter/screening/finalize:
 *   post:
 *     tags: [Recruiter Screening]
 *     summary: Finalize screening session
 *     description: Marks the recruiter screening session as complete. Requires valid token query parameter.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Screening finalized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/screening/finalize', recruiterScreeningController.verifyRecruiterToken, recruiterScreeningController.finalizeScreening);

/**
 * @openapi
 * /api/recruiter/screening/resume/{applicationId}:
 *   get:
 *     tags: [Recruiter Screening]
 *     summary: Stream applicant resume
 *     description: Streams the applicant resume inline for viewing in the browser. Requires token and jobId query parameters.
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: jobId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Resume file stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       502:
 *         description: Failed to load resume from storage
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/screening/resume/:applicationId', recruiterScreeningController.streamResume);

export default router;
