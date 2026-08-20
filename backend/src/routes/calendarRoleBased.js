/**
 * Role-Based Calendar Routes
 * Separate routes for admin, recruiter, and student calendars
 *
 * Note: Not currently mounted in server.js. Intended mount path is /api/calendar/role-based
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getEvents,
  createEventController,
  updateEventController,
  deleteEventController,
  respondToEventController,
  getEventDetails,
} from '../controllers/calendarRoleBased.js';

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /api/calendar/role-based/events:
 *   get:
 *     tags: [Calendar Role Based]
 *     summary: List role-based calendar events
 *     description: Returns calendar events for the current user based on their role. Intended mount at /api/calendar/role-based.
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
 *         description: Calendar events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/events', getEvents);

/**
 * @openapi
 * /api/calendar/role-based/events/{eventId}:
 *   get:
 *     tags: [Calendar Role Based]
 *     summary: Get calendar event details
 *     description: Returns details for a specific calendar event. Accessible by all authenticated roles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event details
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
router.get('/events/:eventId', getEventDetails);

/**
 * @openapi
 * /api/calendar/role-based/events:
 *   post:
 *     tags: [Calendar Role Based]
 *     summary: Create role-based calendar event
 *     description: Creates a calendar event. Accessible by admin and recruiter roles only.
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
router.post('/events', requireRole(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']), createEventController);

/**
 * @openapi
 * /api/calendar/role-based/events/{eventId}:
 *   put:
 *     tags: [Calendar Role Based]
 *     summary: Update role-based calendar event
 *     description: Updates a calendar event. Admin can update any; recruiter can update own events only.
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
router.put('/events/:eventId', requireRole(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']), updateEventController);

/**
 * @openapi
 * /api/calendar/role-based/events/{eventId}:
 *   delete:
 *     tags: [Calendar Role Based]
 *     summary: Delete role-based calendar event
 *     description: Deletes a calendar event. Admin can delete any; recruiter can delete own events only.
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
router.delete('/events/:eventId', requireRole(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']), deleteEventController);

/**
 * @openapi
 * /api/calendar/role-based/events/{eventId}/respond:
 *   post:
 *     tags: [Calendar Role Based]
 *     summary: Respond to role-based calendar event
 *     description: Accept or decline a calendar event invitation. Student role only.
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
router.post('/events/:eventId/respond', requireRole(['STUDENT']), respondToEventController);

export default router;
