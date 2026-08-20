/**
 * Calendar Routes
 * Unified calendar API endpoints
 *
 * Routes:
 * - GET /api/calendar/status - Check connection status
 * - GET /api/calendar/oauth-url - Get OAuth URL
 * - GET /api/calendar/events - Fetch events
 * - POST /api/calendar/events - Create event (role-based)
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getCalendarStatus,
  getOAuthUrl,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  respondToCalendarEvent,
  disconnectCalendar,
} from '../controllers/calendar.js';

const router = express.Router();

/**
 * @openapi
 * /api/calendar/status:
 *   get:
 *     tags: [Calendar]
 *     summary: Get calendar connection status
 *     description: Checks whether the authenticated user's Google Calendar is connected with their registered email.
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
 *                 hasFullScope:
 *                   type: boolean
 *                 connectedGoogleEmail:
 *                   type: string
 *                   nullable: true
 *                 registeredEmail:
 *                   type: string
 *                 emailMismatch:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/status', authenticate, getCalendarStatus);

/**
 * @openapi
 * /api/calendar/oauth-url:
 *   get:
 *     tags: [Calendar]
 *     summary: Get Google Calendar OAuth URL
 *     description: Returns the Google OAuth authorization URL for calendar connection.
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
 * /api/calendar/events:
 *   get:
 *     tags: [Calendar]
 *     summary: List calendar events
 *     description: Fetches Google Calendar events for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeMin
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: timeMax
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: maxResults
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Calendar events
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
router.get('/events', authenticate, getCalendarEvents);

/**
 * @openapi
 * /api/calendar/events:
 *   post:
 *     tags: [Calendar]
 *     summary: Create calendar event
 *     description: Creates a Google Calendar event. Students cannot create events; recruiters and admins can.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, start, end]
 *             properties:
 *               title:
 *                 type: string
 *               start:
 *                 type: string
 *                 format: date-time
 *               end:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
 *               visibility:
 *                 type: string
 *               attendeesEmails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *     responses:
 *       201:
 *         description: Event created
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
router.post('/events', authenticate, createCalendarEvent);

/**
 * @openapi
 * /api/calendar/events/{eventId}:
 *   put:
 *     tags: [Calendar]
 *     summary: Update calendar event
 *     description: Updates a Google Calendar event. Students cannot update; recruiters can update own events; admins can update any.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               start:
 *                 type: string
 *                 format: date-time
 *               end:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               attendeesEmails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *     responses:
 *       200:
 *         description: Event updated
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
router.put('/events/:eventId', authenticate, updateCalendarEvent);

/**
 * @openapi
 * /api/calendar/events/{eventId}:
 *   delete:
 *     tags: [Calendar]
 *     summary: Delete calendar event
 *     description: Deletes a Google Calendar event. Students cannot delete; recruiters can delete own events; admins can delete any.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event deleted
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
router.delete('/events/:eventId', authenticate, deleteCalendarEvent);

/**
 * @openapi
 * /api/calendar/events/{eventId}/respond:
 *   post:
 *     tags: [Calendar]
 *     summary: Respond to calendar event
 *     description: Accept, decline, or mark tentative for a calendar event invitation. Students only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [responseStatus]
 *             properties:
 *               responseStatus:
 *                 type: string
 *                 enum: [accepted, declined, tentative]
 *     responses:
 *       200:
 *         description: Response recorded
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
router.post('/events/:eventId/respond', authenticate, respondToCalendarEvent);

/**
 * @openapi
 * /api/calendar/disconnect:
 *   delete:
 *     tags: [Calendar]
 *     summary: Disconnect Google Calendar
 *     description: Removes stored Google Calendar OAuth tokens for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar disconnected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/disconnect', authenticate, disconnectCalendar);

export default router;
