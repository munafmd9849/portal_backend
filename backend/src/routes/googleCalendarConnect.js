/**
 * Google Calendar Connect Routes
 * Dedicated routes for the "Connect Google Calendar" page
 * Endpoints:
 * - GET /api/google/calendar/oauth-url
 * - GET /auth/google/callback (popup callback)
 * - GET /api/google/calendar/status
 * - GET /api/google/calendar/events
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getOAuthUrl,
  handleOAuthCallback,
  getCalendarStatus,
  getCalendarEvents,
} from '../controllers/googleCalendarConnect.js';

const router = express.Router();

/**
 * @openapi
 * /api/google/calendar/oauth-url:
 *   get:
 *     tags: [Google Calendar]
 *     summary: Get Google Calendar OAuth URL
 *     description: Returns the Google OAuth URL for the calendar connection popup flow.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OAuth URL
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
router.get('/oauth-url', authenticate, getOAuthUrl);

/**
 * @openapi
 * /api/google/calendar/status:
 *   get:
 *     tags: [Google Calendar]
 *     summary: Get calendar connection status
 *     description: Checks whether the authenticated user's Google Calendar is connected.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/status', authenticate, getCalendarStatus);

/**
 * @openapi
 * /api/google/calendar/events:
 *   get:
 *     tags: [Google Calendar]
 *     summary: Get upcoming calendar events
 *     description: Fetches up to 10 upcoming Google Calendar events for the connected account.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
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
router.get('/events', authenticate, getCalendarEvents);

export default router;

// Note: /auth/google/callback is handled separately in server.js
// because it doesn't require authentication and needs to be at root level
