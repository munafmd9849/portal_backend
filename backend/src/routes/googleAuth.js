/**
 * Google OAuth Routes
 * Separate file for OAuth endpoints (intended mount: /api/auth)
 * NOTE: Not currently imported in server.js — routes documented for reference.
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  initGoogleOAuth,
  getGoogleOAuthUrl,
  handleGoogleCallback,
  checkCalendarStatus,
  disconnectCalendar,
} from '../controllers/googleOAuth.js';

const router = express.Router();

/**
 * @openapi
 * /api/auth/google/init:
 *   get:
 *     tags: [Auth]
 *     summary: Initialize Google OAuth (redirect)
 *     description: Redirects authenticated user to Google consent screen for calendar access.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/google/init', authenticate, initGoogleOAuth);

/**
 * @openapi
 * /api/auth/google/url:
 *   get:
 *     tags: [Auth]
 *     summary: Get Google OAuth URL (popup flow)
 *     description: Returns OAuth URL without redirecting — used for popup-based calendar connection.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OAuth authorization URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/google/url', authenticate, getGoogleOAuthUrl);

/**
 * @openapi
 * /api/auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth callback
 *     description: Handles OAuth redirect from Google, exchanges code for tokens. No JWT required.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OAuth callback processed
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/google/callback', handleGoogleCallback);

/**
 * @openapi
 * /api/auth/google/status:
 *   get:
 *     tags: [Auth]
 *     summary: Check Google Calendar connection status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/google/status', authenticate, checkCalendarStatus);

/**
 * @openapi
 * /api/auth/google/disconnect:
 *   delete:
 *     tags: [Auth]
 *     summary: Disconnect Google Calendar
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar disconnected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/google/disconnect', authenticate, disconnectCalendar);

export default router;
