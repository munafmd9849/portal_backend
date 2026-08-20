/**
 * Notification Routes
 * Replaces Firebase Firestore notification service calls
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as notificationController from '../controllers/notifications.js';
import { body, validationResult } from 'express-validator';
import { createNotification } from '../controllers/notifications.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get user notifications
 *     description: Returns notifications for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', notificationController.getUserNotifications);

/**
 * @openapi
 * /api/notifications/mark-all-read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     description: Marks every notification for the authenticated user as read.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/mark-all-read', notificationController.markAllNotificationsRead);

/**
 * @openapi
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     description: Marks a single notification as read for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/:notificationId/read', notificationController.markNotificationRead);

/**
 * @openapi
 * /api/notifications/{notificationId}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     description: Deletes a notification for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:notificationId', notificationController.deleteNotification);

/**
 * @openapi
 * /api/notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Create a notification
 *     description: Admin or Recruiter only — send a notification to a user, optionally with email.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, title, body]
 *             properties:
 *               userId: { type: string, format: uuid }
 *               title: { type: string }
 *               body: { type: string }
 *               data: { type: object }
 *               sendEmail: { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Notification created
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
router.post('/', [
  requireRole(['ADMIN', 'RECRUITER']),
  body('userId').notEmpty(),
  body('title').notEmpty(),
  body('body').notEmpty(),
  body('sendEmail').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, title, body: bodyText, data, sendEmail = false } = req.body;

    const notification = await createNotification({
      userId,
      title,
      body: bodyText,
      data,
      sendEmail,
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

export default router;
