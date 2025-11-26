/**
 * Notifications Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

/**
 * List notifications for user
 */
export async function listNotificationsForUser(userId, limitTo = 50) {
  try {
    const notifications = await api.getNotifications({ limit: limitTo });
    return notifications || [];
  } catch (error) {
    console.error('listNotificationsForUser error:', error);
    throw error;
  }
}

/**
 * Create notification (admin/recruiter only)
 */
export async function createNotification({ userId, title, body, data = {}, sendEmail = false }) {
  try {
    // Backend endpoint: POST /api/notifications
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({ userId, title, body, data, sendEmail }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || 'Failed to create notification');
    }
    
    return await response.json();
  } catch (error) {
    console.error('createNotification error:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId) {
  try {
    await api.markNotificationRead(notificationId);
    return { success: true };
  } catch (error) {
    console.error('markNotificationRead error:', error);
    throw error;
  }
}

/**
 * Mark notification as read (alias for compatibility)
 */
export const markNotificationAsRead = markNotificationRead;

/**
 * Subscribe to notifications (replaced with load-once pattern)
 * For real-time updates, use Socket.IO instead
 * This function now returns an empty unsubscribe for backward compatibility
 */
export function subscribeToNotifications(callback, options = {}) {
  // Load notifications once instead of real-time subscription
  (async () => {
    try {
      const { limit = 50 } = options;
      const notifications = await listNotificationsForUser(null, limit);
      callback(notifications);
    } catch (error) {
      console.error('subscribeToNotifications error:', error);
      callback([]);
    }
  })();
  
  // Return empty unsubscribe function for backward compatibility
  return () => {};
}

/**
 * Delete notification (if backend supports it)
 * Note: Backend may not have delete endpoint, so this might be a no-op
 */
export async function deleteNotification(notificationId) {
  try {
    // TODO: Backend needs DELETE /api/notifications/:id endpoint
    console.warn('deleteNotification: Backend endpoint may not exist');
    return { success: true };
  } catch (error) {
    console.error('deleteNotification error:', error);
    throw error;
  }
}
