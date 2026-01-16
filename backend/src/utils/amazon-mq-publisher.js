import amqp from 'amqplib';

/**
 * Amazon MQ Publisher
 * 
 * Handles publishing events to Amazon MQ (RabbitMQ) for inter-application messaging.
 * Replaces Redis Streams publishing with AMQP-based messaging.
 */
class AmazonMQPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.exchange = 'inter-app-events';
    this.broadcastExchange = 'inter-app-broadcast';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
  }

  /**
   * Connect to Amazon MQ
   * Supports both URL string format and object format
   */
  async connect() {
    if (this.isConnected && this.connection && this.channel) {
      return;
    }

    try {
      // Try URL format first
      const url = process.env.AMAZON_MQ_URL;
      
      // If URL format, use it directly
      // Otherwise, try object format from environment variables
      let connectionOptions;
      
      if (url && url.startsWith('amqp')) {
        // URL format: amqps://user:pass@host:port
        connectionOptions = url;
      } else {
        // Object format: use individual environment variables
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

      console.log('🔌 Connecting to Amazon MQ...');
      this.connection = await amqp.connect(connectionOptions);
      
      // Use confirm channel for guaranteed publishing
      this.channel = await this.connection.createConfirmChannel();

      // Assert exchanges exist (idempotent - won't recreate if they exist)
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      await this.channel.assertExchange(this.broadcastExchange, 'fanout', { durable: true });

      // Set up return callback to detect unrouted messages
      // This fires when mandatory=true and message can't be routed to any queue
      this.channel.on('return', (msg) => {
        const routingKey = msg.fields.routingKey;
        const exchange = msg.fields.exchange;
        const replyCode = msg.fields.replyCode;
        const replyText = msg.fields.replyText;
        const messageContent = msg.content ? msg.content.toString() : 'N/A';
        
        console.error(`❌ MESSAGE NOT ROUTED: Message returned by broker (unroutable)`);
        console.error(`   Exchange: ${exchange}`);
        console.error(`   Routing Key: ${routingKey}`);
        console.error(`   Reply Code: ${replyCode}`);
        console.error(`   Reply Text: ${replyText}`);
        console.error(`   Message Content: ${messageContent.substring(0, 200)}...`);
        console.error(`   ⚠️ This means no queue is bound to match routing key "${routingKey}"`);
        console.error(`   💡 Check queue bindings in RabbitMQ UI or run: node scripts/verify-and-fix-bindings.js`);
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ Connected to Amazon MQ');

      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('❌ Amazon MQ connection error:', err);
        this.isConnected = false;
        this.handleReconnect();
      });

      this.connection.on('close', () => {
        console.warn('⚠️ Amazon MQ connection closed');
        this.isConnected = false;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        }
      });

    } catch (error) {
      console.error('❌ Failed to connect to Amazon MQ:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Handle reconnection
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect to Amazon MQ (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    try {
      await this.connect();
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
    }
  }

  /**
   * Generate routing key from event data
   * Converts: { targetApplication: 'crm', eventType: 'user.created' }
   * To: 'crm.user.created'
   * 
   * Also handles: 'user_created' -> 'user.created'
   */
  generateRoutingKey(targetApplication, eventType) {
    // Normalize eventType: replace underscores with dots
    const normalizedEventType = eventType.replace(/_/g, '.');
    
    // Format: <targetApplication>.<normalizedEventType>
    return `${targetApplication}.${normalizedEventType}`;
  }

  /**
   * Publish inter-application event
   * Replaces Redis Streams publishInterAppEvent
   */
  async publishInterAppEvent({
    eventType,
    sourceApplication,
    targetApplication,
    tenantId,
    entityId,
    eventData = {},
    publishedBy = 'system'
  }) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const routingKey = this.generateRoutingKey(targetApplication, eventType);
      
      const message = {
        eventId: `inter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType,
        sourceApplication,
        targetApplication,
        tenantId,
        entityId,
        timestamp: new Date().toISOString(),
        eventData,
        publishedBy
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));

      // Helper function to perform the actual publish with confirmation
      const doPublish = () => {
        return new Promise((resolve, reject) => {
          let callbackFired = false;
          const timeout = setTimeout(() => {
            if (!callbackFired) {
              console.error(`⏱️ Publish confirmation timeout for ${message.eventId} (routingKey: ${routingKey})`);
              reject(new Error(`Publish confirmation timeout for ${message.eventId}`));
            }
          }, 10000); // Increased timeout to 10 seconds

          console.log(`📝 Attempting to publish message ${message.eventId} with routingKey: ${routingKey} to exchange: ${this.exchange}`);

          const published = this.channel.publish(
            this.exchange,
            routingKey,
            messageBuffer,
            {
              persistent: true, // Message survives broker restart
              mandatory: true, // Return message if it can't be routed to any queue
              messageId: message.eventId,
              timestamp: Date.now(),
              headers: {
                sourceApp: sourceApplication,
                targetApp: targetApplication,
                tenantId,
                entityId,
                eventType
              }
            },
            (err) => {
              callbackFired = true;
              clearTimeout(timeout);
              // This callback is called when publish is confirmed (no err) or fails (err set)
              // Note: This confirms broker ACCEPTED the message, not that it was ROUTED to a queue
              // Use the 'return' event handler to detect unrouted messages
              if (err) {
                console.error(`❌ Broker rejected message ${message.eventId}:`, err);
                reject(err);
              } else {
                console.log(`✅ Broker confirmed receipt of message ${message.eventId} (routingKey: ${routingKey})`);
                // Note: If message can't be routed, it will trigger the 'return' event
                // We resolve here because broker accepted it, routing is checked separately
                resolve();
              }
            }
          );

          if (!published) {
            console.warn(`⚠️ Buffer full for message ${message.eventId}, waiting for drain...`);
            clearTimeout(timeout);
            // Buffer full, wait for drain event then retry
            this.channel.once('drain', () => {
              console.log(`💧 Drain event received, retrying publish for ${message.eventId}`);
              doPublish().then(resolve).catch(reject);
            });
          } else {
            console.log(`📤 Message ${message.eventId} queued in buffer, waiting for broker confirmation...`);
          }
        });
      };

      await doPublish();

      console.log(`📤 Published to Amazon MQ: ${sourceApplication} → ${targetApplication} (${routingKey})`);
      
      return {
        success: true,
        eventId: message.eventId,
        routingKey,
        messageId: message.eventId
      };

    } catch (error) {
      console.error('❌ Failed to publish to Amazon MQ:', error);
      
      // Try to reconnect if connection lost
      if (!this.isConnected) {
        await this.handleReconnect();
      }
      
      throw error;
    }
  }

  /**
   * Publish role event to target application
   */
  async publishRoleEvent(targetApplication, eventType, tenantId, roleId, roleData, publishedBy = 'system') {
    return await this.publishInterAppEvent({
      eventType,
      sourceApplication: 'wrapper',
      targetApplication,
      tenantId,
      entityId: roleId,
      eventData: {
        roleId,
        roleName: roleData.roleName || roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
        restrictions: roleData.restrictions,
        metadata: roleData.metadata,
        ...(eventType.includes('created') && {
          createdBy: roleData.createdBy,
          createdAt: roleData.createdAt
        }),
        ...(eventType.includes('updated') && {
          updatedBy: roleData.updatedBy,
          updatedAt: roleData.updatedAt
        }),
        ...(eventType.includes('deleted') && {
          deletedBy: roleData.deletedBy,
          deletedAt: roleData.deletedAt,
          transferredToRoleId: roleData.transferredToRoleId,
          affectedUsersCount: roleData.affectedUsersCount
        })
      },
      publishedBy
    });
  }

  /**
   * Publish user event to target application
   */
  async publishUserEvent(targetApplication, eventType, tenantId, userId, userData, publishedBy = 'system') {
    const eventData = {
      userId,
      email: userData.email,
      ...(userData.firstName && { firstName: userData.firstName }),
      ...(userData.lastName && { lastName: userData.lastName }),
      ...(userData.name && { name: userData.name }),
      ...(userData.isActive !== undefined && { isActive: userData.isActive }),
      ...(userData.createdAt && { createdAt: typeof userData.createdAt === 'string' ? userData.createdAt : userData.createdAt.toISOString() }),
      ...(userData.deactivatedAt && { deactivatedAt: typeof userData.deactivatedAt === 'string' ? userData.deactivatedAt : userData.deactivatedAt.toISOString() }),
      ...(userData.deactivatedBy && { deactivatedBy: userData.deactivatedBy }),
      ...(userData.deletedAt && { deletedAt: typeof userData.deletedAt === 'string' ? userData.deletedAt : userData.deletedAt.toISOString() }),
      ...(userData.deletedBy && { deletedBy: userData.deletedBy }),
      ...(userData.reason && { reason: userData.reason })
    };

    return await this.publishInterAppEvent({
      eventType,
      sourceApplication: 'wrapper',
      targetApplication,
      tenantId,
      entityId: userId,
      eventData,
      publishedBy
    });
  }

  /**
   * Publish organization event to target application
   */
  async publishOrgEvent(targetApplication, eventType, tenantId, orgId, orgData, publishedBy = 'system') {
    return await this.publishInterAppEvent({
      eventType,
      sourceApplication: 'wrapper',
      targetApplication,
      tenantId,
      entityId: orgId || orgData.orgCode || orgData.organizationId,
      eventData: orgData,
      publishedBy
    });
  }

  /**
   * Publish credit event to target application
   */
  async publishCreditEvent(targetApplication, eventType, tenantId, creditData, publishedBy = 'system') {
    return await this.publishInterAppEvent({
      eventType,
      sourceApplication: 'wrapper',
      targetApplication,
      tenantId,
      entityId: creditData.entityId || creditData.allocationId || creditData.configId || `credit_${Date.now()}`,
      eventData: creditData,
      publishedBy
    });
  }

  /**
   * Publish organization assignment event to target application
   */
  async publishOrgAssignmentEvent(targetApplication, eventType, tenantId, assignmentData, publishedBy = 'system') {
    return await this.publishInterAppEvent({
      eventType,
      sourceApplication: 'wrapper',
      targetApplication,
      tenantId,
      entityId: assignmentData.assignmentId || assignmentData.userId,
      eventData: assignmentData,
      publishedBy
    });
  }

  /**
   * Publish credit allocation event
   */
  async publishCreditAllocation(targetApplication, tenantId, entityId, amount, metadata = {}, publishedBy = 'system') {
    return await this.publishCreditEvent(
      targetApplication,
      'credit.allocated',
      tenantId,
      {
        entityId,
        amount,
        allocationId: metadata.allocationId,
        reason: metadata.reason || 'credit_allocation',
        ...metadata
      },
      publishedBy
    );
  }

  /**
   * Publish credit consumption event
   */
  async publishCreditConsumption(targetApplication, tenantId, entityId, userId, amount, operationType, operationId, metadata = {}, publishedBy = 'system') {
    return await this.publishCreditEvent(
      targetApplication,
      'credit.consumed',
      tenantId,
      {
        entityId,
        userId,
        amount,
        operationType,
        operationId,
        ...metadata
      },
      publishedBy
    );
  }

  /**
   * Publish broadcast event (all applications)
   * Uses fanout exchange which ignores routing key
   */
  async publishBroadcast(eventType, eventData, publishedBy = 'system') {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const message = {
        eventType,
        timestamp: new Date().toISOString(),
        eventData,
        publishedBy
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));

      // Wrap in Promise to wait for confirmation
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Broadcast publish confirmation timeout for ${eventType}`));
        }, 5000);

        const published = this.channel.publish(
          this.broadcastExchange,
          '', // Fanout exchange ignores routing key
          messageBuffer,
          {
            persistent: true,
            timestamp: Date.now(),
            headers: {
              eventType,
              broadcast: true
            }
          },
          (err) => {
            clearTimeout(timeout);
            if (err) {
              console.error(`❌ Failed to publish broadcast ${eventType}:`, err);
              reject(err);
            } else {
              resolve();
            }
          }
        );

        if (!published) {
          clearTimeout(timeout);
          // Buffer full, wait for drain event
          this.channel.once('drain', () => {
            // Retry publish after drain
            this.publishBroadcast(eventType, eventData, publishedBy).then(resolve).catch(reject);
          });
        }
      });

      console.log(`📢 Published broadcast to Amazon MQ: ${eventType}`);
      
      return {
        success: true,
        eventType
      };

    } catch (error) {
      console.error('❌ Failed to publish broadcast:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Amazon MQ
   */
  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isConnected = false;
      console.log('🔌 Disconnected from Amazon MQ');
    } catch (error) {
      console.error('❌ Error disconnecting from Amazon MQ:', error);
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
export const amazonMQPublisher = new AmazonMQPublisher();

// Also export class for testing
export { AmazonMQPublisher };

