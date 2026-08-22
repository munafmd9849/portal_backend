/**
 * Public Routes
 * NO authentication required - public access endpoints
 */

import express from 'express';
import * as publicProfileController from '../controllers/publicProfile.js';
import rateLimit from 'express-rate-limit';

const router = express.Router({ mergeParams: true });

// Rate limiting for public profile endpoint (prevent abuse)
const publicProfileRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /api/public/profile/{publicProfileId}:
 *   get:
 *     tags: [Public]
 *     summary: Get public student profile
 *     description: Returns a read-only student profile by shareable public profile ID. No authentication required.
 *     parameters:
 *       - in: path
 *         name: publicProfileId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shareable public profile identifier
 *     responses:
 *       200:
 *         description: Public profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 profile:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Public profile access (NO AUTH)
router.get('/profile/:publicProfileId', 
  publicProfileRateLimit,
  publicProfileController.getPublicProfile
);

export default router;
