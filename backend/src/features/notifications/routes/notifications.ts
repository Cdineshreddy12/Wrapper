import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NotificationService } from '../services/notification-service.js';

const notificationService = new NotificationService();

/**
 * Notification routes for tenant dashboard
 * Handles CRUD operations for notifications
 */
export default async function notificationRoutes(fastify: FastifyInstance, _options?: Record<string, unknown>): Promise<void> {
  /**
   * GET /api/notifications
   * Get notifications for the current tenant/user
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, internalUserId: userId } = request.userContext || {};
      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      // For dashboard notifications, always load all tenant notifications (both user-specific and general)
      // This ensures seasonal credit notifications (which have targetUserId=null) are visible to all users
      const effectiveUserId = null; // Always pass null to get all tenant notifications

      const q = request.query as Record<string, unknown>;
      const limit = q.limit ?? 50;
      const offset = q.offset ?? 0;
      const includeRead = q.includeRead ?? true;
      const includeDismissed = q.includeDismissed ?? false;
      const type = q.type;
      const priority = q.priority;

      const notifications = await notificationService.getNotifications(
        tenantId,
        effectiveUserId,
        {
          limit: Number(limit),
          offset: Number(offset),
          includeRead: includeRead === 'true' || includeRead === true,
          includeDismissed: includeDismissed === 'true' || includeDismissed === true,
          type: type as string | undefined,
          priority: priority as string | undefined
        }
      );

      reply.send({
        success: true,
        data: notifications
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error getting notifications:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to retrieve notifications'
      });
    }
  });

  /**
   * GET /api/notifications/unread-count
   * Get unread notification count for the current tenant/user
   */
  fastify.get('/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, internalUserId: userId } = request.userContext || {};
      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      // For dashboard notifications, if no specific userId, load all tenant notifications
      const effectiveUserId = userId || null;
      const count = await notificationService.getUnreadCount(tenantId, effectiveUserId);

      reply.send({
        success: true,
        data: { count }
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error getting unread notification count:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to get unread notification count'
      });
    }
  });

  /**
   * PUT /api/notifications/:notificationId/read
   * Mark a notification as read
   */
  fastify.put('/:notificationId/read', async (request: FastifyRequest<{ Params: { notificationId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.userContext || {};
      const { notificationId } = request.params;

      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const notification = await notificationService.markAsRead(notificationId, tenantId);

      if (!notification) {
        return reply.code(404).send({
          success: false,
          error: 'Notification not found'
        });
      }

      reply.send({
        success: true,
        data: notification
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error marking notification as read:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to mark notification as read'
      });
    }
  });

  /**
   * PUT /api/notifications/:notificationId/dismiss
   * Mark a notification as dismissed
   */
  fastify.put('/:notificationId/dismiss', async (request: FastifyRequest<{ Params: { notificationId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.userContext || {};
      const { notificationId } = request.params as { notificationId: string };

      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const notification = await notificationService.markAsDismissed(notificationId, tenantId);

      if (!notification) {
        return reply.code(404).send({
          success: false,
          error: 'Notification not found'
        });
      }

      reply.send({
        success: true,
        data: notification
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error dismissing notification:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to dismiss notification'
      });
    }
  });

  /**
   * PUT /api/notifications/mark-all-read
   * Mark all notifications as read for the current tenant/user
   */
  fastify.put('/mark-all-read', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, internalUserId: userId } = request.userContext || {};

      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      // For dashboard notifications, if no specific userId, mark all tenant notifications as read
      const effectiveUserId = userId || null;
      const count = await notificationService.markAllAsRead(tenantId, effectiveUserId);

      reply.send({
        success: true,
        data: { markedAsRead: count }
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error marking all notifications as read:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to mark notifications as read'
      });
    }
  });

  /**
   * GET /api/notifications/debug-notifications
   * Debug endpoint to see actual notification data
   */
  fastify.get('/debug-notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.userContext || {};
      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const { db } = await import('../../../db/index.js');
      const { notifications } = await import('../../../db/schema/notifications/notifications.js');
      const { eq } = await import('drizzle-orm');

      const tenantNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.tenantId, tenantId));

      reply.send({
        success: true,
        data: {
          tenantId,
          notifications: tenantNotifications.map(n => ({
            id: n.notificationId,
            type: n.type,
            title: n.title,
            message: n.message.substring(0, 50) + '...',
            isRead: n.isRead,
            isDismissed: n.isDismissed,
            isActive: n.isActive,
            createdAt: n.createdAt,
            metadata: n.metadata
          }))
        }
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error in debug-notifications endpoint:', error);
      reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/notifications/test-seasonal
   * Create a test seasonal credit notification (for debugging)
   */
  fastify.post('/test-seasonal', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.userContext || {};
      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const testNotification = await notificationService.createSeasonalCreditNotification(tenantId, {
        campaignId: `test-campaign-${Date.now()}`,
        campaignName: 'Test Holiday Campaign',
        allocatedCredits: 1000,
        creditType: 'seasonal',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        applications: ['crm', 'hr', 'finance']
      });

      reply.send({
        success: true,
        data: testNotification,
        message: 'Test seasonal credit notification created'
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error creating test seasonal notification:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to create test seasonal notification'
      });
    }
  });

  /**
   * POST /api/notifications/test
   * Create a test notification (for development/testing only)
   */
  fastify.post('/test', async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply: FastifyReply) => {
    try {
      const { tenantId, internalUserId } = request.userContext || {};
      const { type, title, message, priority } = request.body as Record<string, unknown>;

      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const notification = await notificationService.createNotification({
        tenantId,
        targetUserId: internalUserId as string | undefined,
        type: (type as string) || 'system_update',
        priority: (priority as string) || 'medium',
        title: (title as string) || 'Test Notification',
        message: (message as string) || 'This is a test notification for development purposes.',
        actionUrl: '/dashboard',
        actionLabel: 'View Dashboard'
      });

      reply.send({
        success: true,
        data: notification
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error creating test notification:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to create test notification'
      });
    }
  });

  /**
   * DELETE /api/notifications/cleanup
   * Clean up expired notifications (admin only)
   */
  fastify.delete('/cleanup', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.userContext || {};

      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      // In a real app, you'd check for admin permissions here
      const deletedCount = await notificationService.cleanupExpiredNotifications();

      reply.send({
        success: true,
        data: { deletedCount }
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error cleaning up notifications:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to cleanup notifications'
      });
    }
  });
}
