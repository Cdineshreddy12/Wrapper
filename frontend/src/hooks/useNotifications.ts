import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/components/notifications/types';
import { NotificationService } from '@/services/notificationService';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load notifications
  const loadNotifications = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await NotificationService.getNotifications(options);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications');
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const updatedNotification = await NotificationService.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.notificationId === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      return updatedNotification;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      toast.error('Failed to mark notification as read');
      throw err;
    }
  }, []);

  // Mark notification as dismissed
  const markAsDismissed = useCallback(async (notificationId: string) => {
    try {
      const updatedNotification = await NotificationService.markAsDismissed(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.filter(notification => notification.notificationId !== notificationId)
      );

      // Update unread count if it was unread
      const notification = notifications.find(n => n.notificationId === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      return updatedNotification;
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
      toast.error('Failed to dismiss notification');
      throw err;
    }
  }, [notifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const result = await NotificationService.markAllAsRead();

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );

      // Reset unread count
      setUnreadCount(0);

      toast.success(`Marked ${result.markedAsRead} notifications as read`);
      return result;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      toast.error('Failed to mark all notifications as read');
      throw err;
    }
  }, []);

  // Create test notification (development only)
  const createTestNotification = useCallback(async (data = {}) => {
    try {
      const notification = await NotificationService.createTestNotification(data);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      toast.success('Test notification created');
      return notification;
    } catch (err) {
      console.error('Failed to create test notification:', err);
      toast.error('Failed to create test notification');
      throw err;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // Auto-refresh unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAsDismissed,
    markAllAsRead,
    createTestNotification
  };
};
