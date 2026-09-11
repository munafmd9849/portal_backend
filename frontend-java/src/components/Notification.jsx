import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { listNotificationsForUser, markNotificationRead } from '../services/notifications';
import { SkeletonMediaRowList } from './ui/loading';

const DASHBOARD_ROUTE_PATTERN = /^\/(student|admin|super-admin|recruiter)(\/|$)/;
const ADMIN_DASHBOARD_PATTERN = /^\/(admin|super-admin)(\/|$)/;

const NotificationModal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isDashboard = DASHBOARD_ROUTE_PATTERN.test(location.pathname);
  const isAdminDashboard = ADMIN_DASHBOARD_PATTERN.test(location.pathname);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const notificationsData = await listNotificationsForUser(user.id, 20);
        if (isMounted) {
          setNotifications(notificationsData || []);
          setUnreadCount((notificationsData || []).filter((n) => !n.isRead).length);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
        if (isMounted) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadNotifications();

    if (isOpen) {
      loadNotifications();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, isOpen]);

  const toggleModal = () => {
    setIsOpen(!isOpen);
  };

  const markAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'job':
        return '💼';
      case 'update':
        return '📋';
      case 'interview':
        return '📅';
      default:
        return '🔔';
    }
  };

  if (!user?.id) return null;

  // Admin dashboards use the sidebar Notifications page — no floating bell
  if (isAdminDashboard) return null;

  const bellPositionClass = isDashboard
    ? 'fixed top-3 right-16 md:top-5 md:right-8 z-[60]'
    : 'fixed top-4 right-4 z-[60]';

  const panelPositionClass = isDashboard
    ? 'fixed top-14 right-4 md:top-16 md:right-8'
    : 'fixed top-16 right-4';

  return (
    <>
      <div className={bellPositionClass}>
        <button
          type="button"
          className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${
            isDashboard
              ? 'size-10 bg-white border border-gray-300 text-gray-700 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
              : 'size-[3.2rem] bg-yellow-400 hover:bg-yellow-500 text-white shadow-lg'
          }`}
          onClick={toggleModal}
          aria-label="Open notifications"
        >
          <Bell className={isDashboard ? 'h-5 w-5' : 'h-6 w-6'} />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className={`${panelPositionClass} w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-lg z-[60] border`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Announcements</h3>
              <button type="button" onClick={toggleModal} className="text-gray-400 hover:text-gray-600">
                ✖
              </button>
            </div>

            {loading ? (
              <SkeletonMediaRowList rows={4} className="py-2" />
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No notifications yet</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg cursor-pointer mb-2 border transition-colors ${
                    notification.isRead ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                  }`}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-900' : 'text-blue-900'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{notification.message || notification.body}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {notification.timestamp
                          || (notification.createdAt ? new Date(notification.createdAt).toLocaleString() : '')}
                      </p>
                    </div>
                    {!notification.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationModal;
