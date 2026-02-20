import amqp from 'amqplib';
import { InterAppEventService } from './inter-app-event-service.js';
import { amazonMQPublisher } from '../utils/amazon-mq-publisher.js';

interface InterAppEventPayload {
  eventId?: string;
  eventType: string;
  sourceApplication?: string;
  targetApplication?: string;
  tenantId?: string;
  entityId?: string;
  eventData?: Record<string, unknown>;
}

/**
 * Amazon MQ Consumer for Wrapper Application
 * 
 * Consumes inter-application events from wrapper-events queue.
 * Routing is already handled by RabbitMQ, so no switch statement needed.
 */
type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

class AmazonMQInterAppConsumer {
  connection: AmqpConnection | null = null;
  channel: AmqpChannel | null = null;
  isRunning = false;
  queueName = 'wrapper-events';
  consumerTag: string | null = null;
  maxRetries = 3;

  constructor() {
    // properties initialized above
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
        const port = parseInt(process.env.AMAZON_MQ_PORT ?? '5671', 10) || 5671;
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

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to connect to Amazon MQ:', error);
      throw error;
    }
  }

  /**
   * Process event based on eventType only
   * No switch on targetApplication needed - RabbitMQ already routed the message
   */
  async handleEventByType(eventData: InterAppEventPayload): Promise<void> {
    const parsedEventData = (eventData.eventData || {}) as Record<string, unknown>;
    
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
  async handleUserEvent(eventData: InterAppEventPayload, _parsedEventData: Record<string, unknown>): Promise<void> {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;
    console.log(`👤 Wrapper processing user event from ${sourceApplication}: ${eventType}`);
    
    // Your wrapper-specific user event handling logic here
    // This is a placeholder - replace with actual implementation
    
    // Send acknowledgment
    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId ?? '', {
      processedBy: 'wrapper',
      eventType,
      tenantId,
      entityId
    });
  }

  /**
   * Handle credit-related events
   */
  async handleCreditEvent(eventData: InterAppEventPayload, _parsedEventData: Record<string, unknown>): Promise<void> {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;
    console.log(`💰 Wrapper processing credit event from ${sourceApplication}: ${eventType}`);
    
    // Your wrapper-specific credit event handling logic here
    
    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId ?? '', {
      processedBy: 'wrapper',
      eventType,
      tenantId,
      entityId
    });
  }

  /**
   * Handle organization-related events
   */
  async handleOrgEvent(eventData: InterAppEventPayload, _parsedEventData: Record<string, unknown>): Promise<void> {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;
    console.log(`🏢 Wrapper processing org event from ${sourceApplication}: ${eventType}`);
    
    // Your wrapper-specific org event handling logic here
    
    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId ?? '', {
      processedBy: 'wrapper',
      eventType,
      tenantId,
      entityId
    });
  }

  /**
   * Handle role-related events
   */
  async handleRoleEvent(eventData: InterAppEventPayload, _parsedEventData: Record<string, unknown>): Promise<void> {
    const { sourceApplication, tenantId, entityId, eventType } = eventData;
    console.log(`🔐 Wrapper processing role event from ${sourceApplication}: ${eventType}`);
    
    // Your wrapper-specific role event handling logic here
    
    await InterAppEventService.acknowledgeInterAppEvent(eventData.eventId ?? '', {
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

    interface ConsumeMsg {
      content: Buffer;
      properties?: { messageId?: string; headers?: Record<string, unknown> };
      fields: { deliveryTag: number };
    }
    const reply = await this.channel!.consume(
      this.queueName,
      async (msg: ConsumeMsg | null) => {
        if (!msg) {
          console.log('⚠️ Received null message (queue closed?)');
          return;
        }

        const messageId = msg.properties?.messageId ?? msg.fields.deliveryTag.toString();
        
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

          // Acknowledge successful processing (cast for amqplib Message shape)
          this.channel!.ack(msg as Parameters<AmqpChannel['ack']>[0]);
          console.log(`✅ Message acknowledged: ${messageId}`);

        } catch (err: unknown) {
          const error = err as Error;
          console.error(`❌ Error processing message ${messageId}:`, error);
          
          let eventForAck: InterAppEventPayload | null = null;
          try {
            eventForAck = JSON.parse(msg.content.toString()) as InterAppEventPayload;
          } catch {
            // Event couldn't be parsed
          }
          
          const headers = msg.properties?.headers as Record<string, number> | undefined;
          const retryCount = (headers?.['x-retry-count'] ?? 0) + 1;
          
          if (retryCount < this.maxRetries) {
            console.log(`🔄 Requeuing message (retry ${retryCount}/${this.maxRetries})`);
            this.channel!.nack(msg as Parameters<AmqpChannel['nack']>[0], false, true);
          } else {
            console.error(`❌ Max retries exceeded for message ${messageId}, sending to DLQ`);
            
            if (eventForAck) {
              try {
                await amazonMQPublisher.publishInterAppEvent({
                  eventType: 'event.processing.failed',
                  sourceApplication: 'wrapper',
                  targetApplication: eventForAck.sourceApplication ?? 'system',
                  tenantId: eventForAck.tenantId ?? '',
                  entityId: eventForAck.entityId ?? '',
                  eventData: {
                    originalEvent: eventForAck,
                    error: error.message,
                    retryCount
                  },
                  publishedBy: 'wrapper-consumer'
                });
              } catch (ackErr: unknown) {
                const ackError = ackErr as Error;
                console.error('❌ Failed to publish failure acknowledgment:', ackError);
              }
            }
            
            this.channel!.nack(msg as Parameters<AmqpChannel['nack']>[0], false, false);
          }
        }
      },
      {
        noAck: false // Manual acknowledgment
      }
    );
    this.consumerTag = reply.consumerTag;

    console.log('✅ Wrapper Amazon MQ consumer started');
    console.log(`📋 Consumer tag: ${this.consumerTag}`);
  }

  /**
   * Stop consuming messages
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping Amazon MQ consumer...');
    this.isRunning = false;

    try {
      if (this.consumerTag && this.channel) {
        await this.channel.cancel(this.consumerTag);
        console.log('✅ Consumer cancelled');
      }
    } catch (err: unknown) {
      const error = err as Error;
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
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error disconnecting:', error);
    }
  }

  /**
   * Get consumer status
   */
  getStatus(): { isRunning: boolean; queueName: string; isConnected: boolean } {
    return {
      isRunning: this.isRunning,
      queueName: this.queueName,
      isConnected: !!(this.connection && (this.connection as { readyState?: string }).readyState === 'open')
    };
  }
}

export default AmazonMQInterAppConsumer;

