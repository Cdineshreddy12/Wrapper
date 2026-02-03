import amqp from 'amqplib';
import { InterAppEventService } from './inter-app-event-service.js';
import { amazonMQPublisher } from '../utils/amazon-mq-publisher.js';

/**
 * Amazon MQ Consumer for Wrapper Application
 * 
 * Consumes inter-application events from wrapper-events queue.
 * Routing is already handled by RabbitMQ, so no switch statement needed.
 */
class AmazonMQInterAppConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isRunning = false;
    this.queueName = 'wrapper-events';
    this.consumerTag = null;
    this.maxRetries = 3;
  }

  /**
   * Connect to Amazon MQ
   * Supports both URL string format and object format
   */
  async connect() {
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
      this.channel = await this.connection.createChannel();

      // Assert queue exists with same arguments as topology setup
      // Must match the arguments used in setup-amazon-mq-topology.js
      await this.channel.assertQueue(this.queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': 'inter-app-events-dlq'
        }
      });

      // Set QoS (prefetch) - process 10 messages at a time
      await this.channel.prefetch(10);

      console.log('✅ Connected to Amazon MQ');
      console.log(`📥 Consuming from queue: ${this.queueName}`);

      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('❌ Amazon MQ connection error:', err);
        this.isRunning = false;
      });

      this.connection.on('close', () => {
        console.warn('⚠️ Amazon MQ connection closed');
        this.isRunning = false;
      });

    } catch (error) {
      console.error('❌ Failed to connect to Amazon MQ:', error);
      throw error;
    }
  }

  /**
   * Process event based on eventType only
   * No switch on targetApplication needed - RabbitMQ already routed the message
   */
  async handleEventByType(eventData) {
    const parsedEventData = eventData.eventData || {};
    
    // Route based on eventType only (messages are pre-filtered by queue)
    switch (eventData.eventType) {
      case 'user.created':
        await this.handleUserEvent(eventData, parsedEventData);
        break;
      case 'user.deactivated':
        await this.handleUserEvent(eventData, parsedEventData);
        break;
      case 'credit.allocated':
        await this.handleCreditEvent(eventData, parsedEventData);
        break;
      case 'org.created':
        await this.handleOrgEvent(eventData, parsedEventData);
        break;
      case 'role.created':
      case 'role.updated':
      case 'role.deleted':
        await this.handleRoleEvent(eventData, parsedEventData);
        break;
      default:
        console.log(`ℹ️ Wrapper: Unhandled event type: ${eventData.eventType}`);
    }
  }

  /**
   * Handle user-related events
   */
  async handleUserEvent(eventData, parsedEventData) {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;
    console.log(`👤 Wrapper processing user event from ${sourceApplication}: ${eventType}`);
    
    // Your wrapper-specific user event handling logic here
    // This is a placeholder - replace with actual implementation
    
    // Send acknowledgment
    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId, {
      processedBy: 'wrapper',
      eventType,
      tenantId,
      entityId
    });
  }

  /**
   * Handle credit-related events
   */
  async handleCreditEvent(eventData, parsedEventData) {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;
    console.log(`💰 Wrapper processing credit event from ${sourceApplication}: ${eventType}`);
    
    // Your wrapper-specific credit event handling logic here
    
    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId, {
      processedBy: 'wrapper',
      eventType,
      tenantId,
      entityId
    });
  }

  /**
   * Handle organization-related events
   */
  async handleOrgEvent(eventData, parsedEventData) {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;
    console.log(`🏢 Wrapper processing org event from ${sourceApplication}: ${eventType}`);
    
    // Your wrapper-specific org event handling logic here
    
    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId, {
      processedBy: 'wrapper',
      eventType,
      tenantId,
      entityId
    });
  }

  /**
   * Handle role-related events
   */
  async handleRoleEvent(eventData, parsedEventData) {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;
    console.log(`🔐 Wrapper processing role event from ${sourceApplication}: ${eventType}`);
    
    // Your wrapper-specific role event handling logic here
    
    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId, {
      processedBy: 'wrapper',
      eventType,
      tenantId,
      entityId
    });
  }

  /**
   * Start consuming messages
   */
  async start() {
    if (this.isRunning) {
      console.warn('⚠️ Consumer already running');
      return;
    }

    await this.connect();
    this.isRunning = true;

    console.log(`🚀 Starting Amazon MQ consumer for wrapper-events queue...`);

    this.consumerTag = await this.channel.consume(
      this.queueName,
      async (msg) => {
        if (!msg) {
          console.log('⚠️ Received null message (queue closed?)');
          return;
        }

        const messageId = msg.properties.messageId || msg.fields.deliveryTag.toString();
        
        try {
          const event = JSON.parse(msg.content.toString());

          console.log(`\n📨 Processing message:`, {
            messageId,
            eventId: event.eventId,
            eventType: event.eventType,
            sourceApplication: event.sourceApplication,
            targetApplication: event.targetApplication,
            tenantId: event.tenantId
          });

          // Process event (no switch on targetApplication - already routed by RabbitMQ)
          await this.handleEventByType(event);

          // Acknowledge successful processing
          this.channel.ack(msg);
          console.log(`✅ Message acknowledged: ${messageId}`);

        } catch (error) {
          console.error(`❌ Error processing message ${messageId}:`, error);
          
          // Try to parse event for failure acknowledgment (may fail if parsing was the issue)
          let eventForAck = null;
          try {
            eventForAck = JSON.parse(msg.content.toString());
          } catch (parseError) {
            // Event couldn't be parsed, use message ID only
          }
          
          // Get retry count from message headers
          const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
          
          if (retryCount < this.maxRetries) {
            // Requeue with retry count
            console.log(`🔄 Requeuing message (retry ${retryCount}/${this.maxRetries})`);
            this.channel.nack(msg, false, true); // Requeue
          } else {
            // Max retries exceeded - send to DLQ
            console.error(`❌ Max retries exceeded for message ${messageId}, sending to DLQ`);
            
            // Publish failure acknowledgment if we have event data
            if (eventForAck) {
              try {
                await amazonMQPublisher.publishInterAppEvent({
                  eventType: 'event.processing.failed',
                  sourceApplication: 'wrapper',
                  targetApplication: eventForAck.sourceApplication || 'system',
                  tenantId: eventForAck.tenantId,
                  entityId: eventForAck.entityId,
                  eventData: {
                    originalEvent: eventForAck,
                    error: error.message,
                    retryCount
                  },
                  publishedBy: 'wrapper-consumer'
                });
              } catch (ackError) {
                console.error('❌ Failed to publish failure acknowledgment:', ackError);
              }
            }
            
            // Reject without requeue (goes to DLQ)
            this.channel.nack(msg, false, false);
          }
        }
      },
      {
        noAck: false // Manual acknowledgment
      }
    );

    console.log('✅ Wrapper Amazon MQ consumer started');
    console.log(`📋 Consumer tag: ${this.consumerTag}`);
  }

  /**
   * Stop consuming messages
   */
  async stop() {
    console.log('🛑 Stopping Amazon MQ consumer...');
    this.isRunning = false;

    try {
      if (this.consumerTag && this.channel) {
        await this.channel.cancel(this.consumerTag);
        console.log('✅ Consumer cancelled');
      }
    } catch (error) {
      console.error('❌ Error cancelling consumer:', error);
    }

    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      console.log('✅ Disconnected from Amazon MQ');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }

  /**
   * Get consumer status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueName: this.queueName,
      isConnected: this.connection && this.connection.readyState === 'open'
    };
  }
}

export default AmazonMQInterAppConsumer;

