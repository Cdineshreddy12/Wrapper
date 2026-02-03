import amqp from 'amqplib';

/**
 * Amazon MQ Job Queue Service
 * 
 * Implements job queue functionality using AWS MQ (RabbitMQ) to replace BullMQ.
 * Supports immediate, bulk, and scheduled job queues with worker pattern.
 */
class AmazonMQJobQueue {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.workerChannel = null;
    this.isConnected = false;
    this.exchange = 'job-queue';
    this.queues = {
      immediate: 'notifications-immediate',
      bulk: 'notifications-bulk',
      scheduled: 'notifications-scheduled'
    };
    this.workers = {};
    this.isProcessing = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.jobStatus = new Map(); // In-memory job status tracking
  }

  /**
   * Connect to Amazon MQ
   */
  async connect() {
    if (this.isConnected && this.connection && this.channel) {
      return;
    }

    try {
      const url = process.env.AMAZON_MQ_URL;
      let connectionOptions;
      
      if (url && url.startsWith('amqp')) {
        connectionOptions = url;
      } else {
        const hostname = process.env.AMAZON_MQ_HOSTNAME || process.env.AMAZON_MQ_HOST;
        const username = process.env.AMAZON_MQ_USERNAME;
        const password = process.env.AMAZON_MQ_PASSWORD;
        const port = parseInt(process.env.AMAZON_MQ_PORT) || 5671;
        const protocol = process.env.AMAZON_MQ_PROTOCOL || 'amqps';
        
        if (!hostname || !username || !password) {
          throw new Error('AMAZON_MQ_URL or AMAZON_MQ_HOSTNAME/USERNAME/PASSWORD environment variables must be set');
        }
        
        connectionOptions = {
          protocol,
          hostname,
          port,
          username,
          password
        };
      }

      console.log('🔌 [Job Queue] Connecting to Amazon MQ...');
      this.connection = await amqp.connect(connectionOptions);
      
      // Publisher channel (for adding jobs)
      this.channel = await this.connection.createConfirmChannel();
      
      // Worker channel (for consuming jobs)
      this.workerChannel = await this.connection.createChannel();
      this.workerChannel.prefetch(10); // Process 10 jobs at a time

      // Create exchange
      await this.channel.assertExchange(this.exchange, 'direct', { durable: true });

      // Create queues
      for (const [queueType, queueName] of Object.entries(this.queues)) {
        await this.channel.assertQueue(queueName, {
          durable: true,
          arguments: {
            'x-message-ttl': 86400000, // 24 hours TTL
            'x-max-priority': 10 // Support priority 0-10
          }
        });
        
        // Bind queue to exchange
        await this.channel.bindQueue(queueName, this.exchange, `job.${queueType}`);
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ [Job Queue] Connected to Amazon MQ');

      // Handle connection errors (handleReconnect is async - catch so no unhandled rejection)
      this.connection.on('error', (err) => {
        console.error('❌ [Job Queue] Connection error:', err);
        this.isConnected = false;
        this.handleReconnect().catch((e) => console.error('❌ [Job Queue] Reconnection error:', e.message));
      });

      this.connection.on('close', () => {
        console.warn('⚠️ [Job Queue] Connection closed');
        this.isConnected = false;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect().catch((e) => console.error('❌ [Job Queue] Reconnection error:', e.message));
        }
      });

    } catch (error) {
      console.error('❌ [Job Queue] Failed to connect:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [Job Queue] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 [Job Queue] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    try {
      await this.connect();
      // Restart workers after reconnection
      if (Object.keys(this.workers).length > 0) {
        await this.initializeWorkers();
      }
    } catch (error) {
      console.error('❌ [Job Queue] Reconnection failed:', error);
    }
  }

  /**
   * Initialize workers for each queue
   */
  async initializeWorkers(processors) {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!this.workerChannel) {
      throw new Error('Worker channel not initialized');
    }

    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '10');

    // Immediate queue worker
    if (processors.immediate) {
      await this.workerChannel.consume(this.queues.immediate, async (msg) => {
        if (!msg) return;
        
        try {
          const job = JSON.parse(msg.content.toString());
          this.jobStatus.set(job.jobId, { status: 'active', startedAt: new Date() });
          
          const result = await processors.immediate(job.data);
          
          this.jobStatus.set(job.jobId, { 
            status: 'completed', 
            result,
            completedAt: new Date() 
          });
          
          this.workerChannel.ack(msg);
          console.log(`✅ [Job Queue] Job ${job.jobId} completed`);
        } catch (error) {
          const job = JSON.parse(msg.content.toString());
          const attempts = (job.attempts || 0) + 1;
          const maxAttempts = job.maxAttempts || 3;
          
          if (attempts < maxAttempts) {
            // Retry with exponential backoff
            const delay = Math.min(2000 * Math.pow(2, attempts - 1), 30000);
            setTimeout(() => {
              this.addImmediate(job.data, job.tenantId, {
                priority: job.priority,
                attempts: maxAttempts,
                jobId: job.jobId
              });
            }, delay);
            this.workerChannel.ack(msg);
            console.log(`🔄 [Job Queue] Job ${job.jobId} will retry (attempt ${attempts}/${maxAttempts})`);
          } else {
            this.jobStatus.set(job.jobId, { 
              status: 'failed', 
              error: error.message,
              failedAt: new Date(),
              attemptsMade: attempts
            });
            this.workerChannel.ack(msg);
            console.error(`❌ [Job Queue] Job ${job.jobId} failed after ${attempts} attempts:`, error.message);
          }
        }
      }, { noAck: false });
      
      console.log(`✅ [Job Queue] Worker started for immediate queue`);
    }

    // Bulk queue worker
    if (processors.bulk) {
      await this.workerChannel.consume(this.queues.bulk, async (msg) => {
        if (!msg) return;
        
        try {
          const job = JSON.parse(msg.content.toString());
          this.jobStatus.set(job.jobId, { status: 'active', startedAt: new Date() });
          
          const result = await processors.bulk(job.data);
          
          this.jobStatus.set(job.jobId, { 
            status: 'completed', 
            result,
            completedAt: new Date() 
          });
          
          this.workerChannel.ack(msg);
          console.log(`✅ [Job Queue] Bulk job ${job.jobId} completed`);
        } catch (error) {
          const job = JSON.parse(msg.content.toString());
          const attempts = (job.attempts || 0) + 1;
          const maxAttempts = job.maxAttempts || 2;
          
          if (attempts < maxAttempts) {
            const delay = Math.min(5000 * Math.pow(2, attempts - 1), 60000);
            setTimeout(() => {
              this.addBulk(job.data.notifications, {
                batchSize: job.data.batchSize,
                priority: job.priority,
                attempts: maxAttempts,
                jobId: job.jobId
              });
            }, delay);
            this.workerChannel.ack(msg);
          } else {
            this.jobStatus.set(job.jobId, { 
              status: 'failed', 
              error: error.message,
              failedAt: new Date(),
              attemptsMade: attempts
            });
            this.workerChannel.ack(msg);
            console.error(`❌ [Job Queue] Bulk job ${job.jobId} failed:`, error.message);
          }
        }
      }, { noAck: false });
      
      console.log(`✅ [Job Queue] Worker started for bulk queue`);
    }

    // Scheduled queue worker
    if (processors.scheduled) {
      await this.workerChannel.consume(this.queues.scheduled, async (msg) => {
        if (!msg) return;
        
        try {
          const job = JSON.parse(msg.content.toString());
          const scheduledTime = new Date(job.scheduledAt);
          const now = new Date();
          
          // If job is scheduled for the future, requeue it
          if (scheduledTime > now) {
            const delay = scheduledTime.getTime() - now.getTime();
            setTimeout(() => {
              this.workerChannel.sendToQueue(this.queues.scheduled, msg.content, {
                persistent: true,
                priority: job.priority || 0
              });
            }, delay);
            this.workerChannel.ack(msg);
            return;
          }
          
          this.jobStatus.set(job.jobId, { status: 'active', startedAt: new Date() });
          
          const result = await processors.scheduled(job.data);
          
          this.jobStatus.set(job.jobId, { 
            status: 'completed', 
            result,
            completedAt: new Date() 
          });
          
          this.workerChannel.ack(msg);
          console.log(`✅ [Job Queue] Scheduled job ${job.jobId} completed`);
        } catch (error) {
          const job = JSON.parse(msg.content.toString());
          const attempts = (job.attempts || 0) + 1;
          const maxAttempts = job.maxAttempts || 3;
          
          if (attempts < maxAttempts) {
            const delay = Math.min(2000 * Math.pow(2, attempts - 1), 30000);
            setTimeout(() => {
              this.schedule(job.data.notificationData, job.data.tenantId, job.scheduledAt, {
                priority: job.priority,
                attempts: maxAttempts,
                jobId: job.jobId
              });
            }, delay);
            this.workerChannel.ack(msg);
          } else {
            this.jobStatus.set(job.jobId, { 
              status: 'failed', 
              error: error.message,
              failedAt: new Date(),
              attemptsMade: attempts
            });
            this.workerChannel.ack(msg);
            console.error(`❌ [Job Queue] Scheduled job ${job.jobId} failed:`, error.message);
          }
        }
      }, { noAck: false });
      
      console.log(`✅ [Job Queue] Worker started for scheduled queue`);
    }
  }

  /**
   * Add immediate job to queue
   */
  async addImmediate(data, tenantId, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const jobId = options.jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      jobId,
      type: 'send-notification',
      data,
      tenantId,
      priority: options.priority || 0,
      maxAttempts: options.attempts || 3,
      attempts: options.attempts || 0,
      createdAt: new Date().toISOString()
    };

    this.jobStatus.set(jobId, { status: 'waiting', createdAt: new Date() });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Job publish timeout for ${jobId}`));
      }, 5000);

      const published = this.channel.publish(
        this.exchange,
        'job.immediate',
        Buffer.from(JSON.stringify(job)),
        {
          persistent: true,
          priority: job.priority,
          messageId: jobId
        },
        (err) => {
          clearTimeout(timeout);
          if (err) {
            this.jobStatus.delete(jobId);
            reject(err);
          } else {
            resolve({ jobId, queue: 'immediate' });
          }
        }
      );

      if (!published) {
        this.channel.once('drain', () => {
          this.addImmediate(data, tenantId, options).then(resolve).catch(reject);
        });
      }
    });
  }

  /**
   * Add bulk job to queue
   */
  async addBulk(notifications, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const jobId = options.jobId || `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      jobId,
      type: 'bulk-send',
      data: {
        notifications,
        batchSize: options.batchSize || 100
      },
      priority: options.priority || 0,
      maxAttempts: options.attempts || 2,
      attempts: options.attempts || 0,
      createdAt: new Date().toISOString()
    };

    this.jobStatus.set(jobId, { status: 'waiting', createdAt: new Date() });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Bulk job publish timeout for ${jobId}`));
      }, 5000);

      const published = this.channel.publish(
        this.exchange,
        'job.bulk',
        Buffer.from(JSON.stringify(job)),
        {
          persistent: true,
          priority: job.priority,
          messageId: jobId
        },
        (err) => {
          clearTimeout(timeout);
          if (err) {
            this.jobStatus.delete(jobId);
            reject(err);
          } else {
            resolve({ 
              jobId, 
              queue: 'bulk',
              totalNotifications: notifications.length 
            });
          }
        }
      );

      if (!published) {
        this.channel.once('drain', () => {
          this.addBulk(notifications, options).then(resolve).catch(reject);
        });
      }
    });
  }

  /**
   * Schedule job for later
   */
  async schedule(notificationData, tenantId, scheduledAt, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const delay = new Date(scheduledAt).getTime() - Date.now();
    if (delay < 0) {
      throw new Error('Scheduled time must be in the future');
    }

    const jobId = options.jobId || `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      jobId,
      type: 'scheduled-notification',
      data: {
        notificationData,
        tenantId
      },
      scheduledAt: new Date(scheduledAt).toISOString(),
      priority: options.priority || 0,
      maxAttempts: options.attempts || 3,
      attempts: options.attempts || 0,
      createdAt: new Date().toISOString()
    };

    this.jobStatus.set(jobId, { status: 'scheduled', scheduledAt: new Date(scheduledAt), createdAt: new Date() });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Scheduled job publish timeout for ${jobId}`));
      }, 5000);

      const published = this.channel.publish(
        this.exchange,
        'job.scheduled',
        Buffer.from(JSON.stringify(job)),
        {
          persistent: true,
          priority: job.priority,
          messageId: jobId
        },
        (err) => {
          clearTimeout(timeout);
          if (err) {
            this.jobStatus.delete(jobId);
            reject(err);
          } else {
            resolve({ jobId, queue: 'scheduled', scheduledAt });
          }
        }
      );

      if (!published) {
        this.channel.once('drain', () => {
          this.schedule(notificationData, tenantId, scheduledAt, options).then(resolve).catch(reject);
        });
      }
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName, jobId) {
    const status = this.jobStatus.get(jobId);
    if (!status) {
      return { status: 'not_found' };
    }

    return {
      jobId,
      ...status
    };
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(queueName, jobId) {
    // Note: In RabbitMQ, we can't easily cancel a message that's already queued
    // We mark it as cancelled in our status tracking
    const status = this.jobStatus.get(jobId);
    if (status) {
      this.jobStatus.set(jobId, { ...status, status: 'cancelled', cancelledAt: new Date() });
      return { success: true, jobId };
    }
    return { success: false, message: 'Job not found' };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    if (!this.isConnected) {
      await this.connect();
    }

    const queueNameFull = this.queues[queueName];
    if (!queueNameFull) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const queueInfo = await this.channel.checkQueue(queueNameFull);
    
    // Count jobs by status from our tracking
    const allStatuses = Array.from(this.jobStatus.values());
    const waiting = allStatuses.filter(s => s.status === 'waiting' || s.status === 'scheduled').length;
    const active = allStatuses.filter(s => s.status === 'active').length;
    const completed = allStatuses.filter(s => s.status === 'completed').length;
    const failed = allStatuses.filter(s => s.status === 'failed').length;

    return {
      queue: queueName,
      waiting: queueInfo.messageCount || waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed
    };
  }

  /**
   * Close all connections
   */
  async close() {
    try {
      if (this.workerChannel) {
        await this.workerChannel.close();
        this.workerChannel = null;
      }
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isConnected = false;
      this.jobStatus.clear();
      console.log('✅ [Job Queue] Closed all connections');
    } catch (error) {
      console.error('❌ [Job Queue] Error closing connections:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const amazonMQJobQueue = new AmazonMQJobQueue();
export default amazonMQJobQueue;
