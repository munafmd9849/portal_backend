/**
 * Notifications Controller
 * Replaces Firebase Firestore notification service calls
 */

import prisma from '../config/database.js';
import { getIO } from '../config/socket.js';
import { sendGenericNotification } from '../services/emailService.js';
import logger from '../config/logger.js';

/**
 * Create notification
 * Replaces: createNotification()
 * Optionally sends email notification for admin/system notifications
 */
export async function createNotification({ userId, title, body, data = {}, sendEmail = false }) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      data,
      isRead: false,
    },
  });

  // Get user email if email notification is requested
  if (sendEmail) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        await sendGenericNotification(user.email, title, body);
        logger.info(`Email notification sent to ${user.email} for notification ${notification.id}`);
      }
    } catch (emailError) {
      // Don't fail notification creation if email fails - log and continue
      logger.error(`Failed to send email notification for notification ${notification.id}:`, emailError);
    }
  }

  // Emit real-time update via Socket.IO
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }

  return notification;
}

/**
 * Get user notifications
 */
export async function getUserNotifications(req, res) {
  try {
    const userId = req.userId;
    const { isRead, limit = 50 } = req.query;

    const where = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(req, res) {
  try {
    const { notificationId } = req.params;

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json(notification);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}
