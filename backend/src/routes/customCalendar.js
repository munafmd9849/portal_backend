/**
 * Custom Calendar Routes
 * Routes for custom calendar events stored in database
 *
 * Note: Not currently mounted in server.js. Intended mount path is /api/calendar/custom
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getCustomEvents,
  getCustomEvent,
  createCustomEvent,
  updateCustomEvent,
  deleteCustomEvent,
  respondToCustomEvent,
} from '../controllers/customCalendar.js';

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /api/calendar/custom/events:
 *   get:
 *     tags: [Custom Calendar]
 *     summary: List custom calendar events
 *     description: Returns database-stored calendar events with optional filters. Intended mount at /api/calendar/custom.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeMin
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: timeMax
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Custom calendar events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/events', getCustomEvents);

/**
 * @openapi
 * /api/calendar/custom/events/{eventId}:
 *   get:
 *     tags: [Custom Calendar]
 *     summary: Get custom calendar event
 *     description: Returns a single database-stored calendar event by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Custom calendar event
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/events/:eventId', getCustomEvent);

/**
 * @openapi
 * /api/calendar/custom/events:
 *   post:
 *     tags: [Custom Calendar]
 *     summary: Create custom calendar event
 *     description: Creates a new calendar event stored in the database.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
router.post('/events', createCustomEvent);

/**
 * @openapi
 * /api/calendar/custom/events/{eventId}:
 *   put:
 *     tags: [Custom Calendar]
 *     summary: Update custom calendar event
 *     description: Updates an existing database-stored calendar event.
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
 *               start:
 *                 type: string
 *                 format: date-time
 *               end:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
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
router.put('/events/:eventId', updateCustomEvent);

/**
 * @openapi
 * /api/calendar/custom/events/{eventId}:
 *   delete:
 *     tags: [Custom Calendar]
 *     summary: Delete custom calendar event
 *     description: Deletes a database-stored calendar event.
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
router.delete('/events/:eventId', deleteCustomEvent);

/**
 * @openapi
 * /api/calendar/custom/events/{eventId}/respond:
 *   post:
 *     tags: [Custom Calendar]
 *     summary: Respond to custom calendar event
 *     description: Accept, decline, or mark tentative for a custom calendar event invitation. Student only.
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
router.post('/events/:eventId/respond', respondToCustomEvent);

export default router;
