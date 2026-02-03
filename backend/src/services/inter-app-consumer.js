#!/usr/bin/env node

/**
 * Inter-Application Event Consumer
 *
 * Generic consumer that handles events between all business suite applications.
 * Now uses Amazon MQ instead of Redis Streams - routing handled by RabbitMQ.
 *
 * Usage: node src/services/inter-app-consumer.js
 */

import dotenv from 'dotenv';
import { InterAppEventService } from './inter-app-event-service.js';
import AmazonMQInterAppConsumer from './amazon-mq-consumer.js';

// Load environment variables
dotenv.config();

/**
 * Inter-App Event Consumer (Legacy - now uses Amazon MQ Consumer)
 * 
 * This file is kept for backward compatibility but now delegates to AmazonMQInterAppConsumer.
 * The Amazon MQ consumer handles all the actual message consumption.
 * 
 * This wrapper maintains the same interface for any code that imports InterAppEventConsumer.
 */
class InterAppEventConsumer {
  constructor() {
    // Delegate to Amazon MQ consumer
    this.amazonMQConsumer = new AmazonMQInterAppConsumer();
  }

  async connect() {
    // Amazon MQ consumer handles connection internally
    return true;
  }

  async setupConsumerGroup() {
    // Not needed for Amazon MQ - queues are pre-configured
    return true;
  }

  async consumeEvents() {
    // Delegate to Amazon MQ consumer
    await this.amazonMQConsumer.start();
  }

  async stop() {
    await this.amazonMQConsumer.stop();
  }

  async getStreamInfo() {
    // Return status from Amazon MQ consumer
    return this.amazonMQConsumer.getStatus();
  }
}

// Graceful shutdown handlers are now in main() function

// Main execution
async function main() {
  // Use Amazon MQ consumer directly
  const consumer = new AmazonMQInterAppConsumer();
  global.consumer = consumer;

  try {
    console.log('🔄 Starting Inter-Application Event Consumer (Amazon MQ)...');
    console.log('================================================');

    // Display status
    const status = consumer.getStatus();
    console.log(`📊 Consumer Status:`, status);

    console.log('\n🎯 Ready to consume inter-application events!');
    console.log('============================================');
    console.log('Supported event flows:');
    console.log('• CRM ↔ HR ↔ Affiliate ↔ System');
    console.log('• Any app can publish to any other app');
    console.log('• Events are automatically routed by RabbitMQ');
    console.log('• No manual routing needed - handled by exchange bindings');
    console.log('');

    await consumer.start();

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await consumer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await consumer.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Inter-App Consumer failed:', error);
    process.exit(1);
  }
}

// Run the consumer if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { InterAppEventConsumer };
export { default as AmazonMQInterAppConsumer } from './amazon-mq-consumer.js';


