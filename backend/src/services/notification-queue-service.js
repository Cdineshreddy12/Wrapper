import amazonMQJobQueue from './amazon-mq-job-queue.js';
import { NotificationService } from './notification-service.js';
import { broadcastToTenant } from '../utils/websocket-server.js';

/**
 * Notification Queue Service
 * Handles async processing of notifications using AWS MQ job queue
 */
const isAmazonMQConfigured = () => {
  const url = process.env.AMAZON_MQ_URL;
  if (url && url.startsWith('amqp')) return true;
  return !!(process.env.AMAZON_MQ_HOSTNAME || process.env.AMAZON_MQ_HOST) &&
    process.env.AMAZON_MQ_USERNAME &&
    process.env.AMAZON_MQ_PASSWORD;
};

class NotificationQueueService {
  constructor() {
    this.jobQueue = amazonMQJobQueue;
    this.notificationService = new NotificationService();
    this.workers = {};
    this.workersInitialized = false;

    if (isAmazonMQConfigured()) {
      this.initializeWorkers().catch((err) => {
        console.warn('⚠️ [Notification Queue] Could not connect to Amazon MQ (app running without job queue):', err.message);
      });
    }
  }

  /**
   * Initialize workers for each queue
   */
  async initializeWorkers() {
    // Connect to AWS MQ
    await this.jobQueue.connect();

    // Set up processors for each queue type
    const processors = {
      immediate: async (data) => {
        return await this.processNotification(data);
      },
      bulk: async (data) => {
        return await this.processBulkNotifications(data);
      },
      scheduled: async (data) => {
        return await this.processNotification(data);
      }
    };

    // Initialize workers with processors
    await this.jobQueue.initializeWorkers(processors);
    this.workersInitialized = true;
    console.log('✅ Notification queue workers initialized');
  }

  /**
   * Process a single notification
   */
  async processNotification(data) {
    try {
      const { notificationData, tenantId } = data;

      // Create notification
      const notification = await this.notificationService.createNotification({
        ...notificationData,
        tenantId
      });

      // Broadcast via WebSocket
      try {
        broadcastToTenant(tenantId, notification);
      } catch (wsError) {
        console.warn(`WebSocket broadcast failed for tenant ${tenantId}:`, wsError.message);
        // Don't fail the job if WebSocket fails
      }

      return {
        success: true,
        notificationId: notification.notificationId,
        tenantId
      };
    } catch (error) {
      console.error('Error processing notification:', error);
      throw error;
    }
  }

  /**
   * Process bulk notifications (batch of 100)
   */
  async processBulkNotifications(data) {
    try {
      const { notifications, batchSize = 100 } = data;
      const results = [];

      // Process in batches
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(notif => this.processNotification(notif))
        );

        results.push(...batchResults.map((result, idx) => ({
          index: i + idx,
          success: result.status === 'fulfilled',
          data: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason.message : null
        })));
      }

      return {
        success: true,
        processed: results.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error processing bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Add immediate notification to queue
   */
  async addImmediate(notificationData, tenantId, options = {}) {
    try {
      return await this.jobQueue.addImmediate(
        { notificationData, tenantId },
        tenantId,
        {
          priority: options.priority || 0,
          attempts: options.attempts || 3
        }
      );
    } catch (error) {
      console.error('Error adding immediate notification to queue:', error);
      throw error;
    }
  }

  /**
   * Add bulk notifications to queue
   */
  async addBulk(notifications, options = {}) {
    try {
      return await this.jobQueue.addBulk(notifications, {
        priority: options.priority || 0,
        attempts: options.attempts || 2,
        batchSize: options.batchSize || 100
      });
    } catch (error) {
      console.error('Error adding bulk notifications to queue:', error);
      throw error;
    }
  }

  /**
   * Schedule notification for later
   */
  async schedule(notificationData, tenantId, scheduledAt, options = {}) {
    try {
      return await this.jobQueue.schedule(
        notificationData,
        tenantId,
        scheduledAt,
        {
          attempts: options.attempts || 3,
          priority: options.priority || 0
        }
      );
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName, jobId) {
    try {
      return await this.jobQueue.getJobStatus(queueName, jobId);
    } catch (error) {
      console.error('Error getting job status:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(queueName, jobId) {
    try {
      return await this.jobQueue.cancelJob(queueName, jobId);
    } catch (error) {
      console.error('Error canceling job:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    try {
      return await this.jobQueue.getQueueStats(queueName);
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Close all queues and workers
   */
  async close() {
    try {
      await this.jobQueue.close();
      console.log('✅ All notification queues and workers closed');
    } catch (error) {
      console.error('Error closing queues:', error);
      throw error;
    }
  }
}

export const notificationQueueService = new NotificationQueueService();
export default notificationQueueService;

