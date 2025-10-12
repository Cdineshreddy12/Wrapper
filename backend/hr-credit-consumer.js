#!/usr/bin/env node

/**
 * HR Credit Events Consumer
 *
 * Consumes credit allocation and consumption events from Redis Streams
 * and synchronizes credit balances between Wrapper and HR systems.
 *
 * Usage: node hr-credit-consumer.js
 */

import Redis from 'redis';
import dotenv from 'dotenv';
import { getRedis } from './src/utils/redis.js';
import { crmSyncStreams } from './src/utils/redis.js';

// Load environment variables
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const consumerGroup = 'hr-consumers';
const consumerName = `hr-consumer-${Date.now()}`;
const streamKey = 'credit-events';

// Mock HR database (replace with actual HR database operations)
class HrCreditDatabase {
  constructor() {
    this.credits = new Map(); // tenantId:entityId -> credit data
  }

  async updateEntityCredits(tenantId, entityId, allocatedCredits, availableCredits) {
    const key = `${tenantId}:${entityId}`;
    const existing = this.credits.get(key) || {};

    this.credits.set(key, {
      ...existing,
      tenantId,
      entityId,
      allocatedCredits: (existing.allocatedCredits || 0) + allocatedCredits,
      availableCredits: availableCredits,
      lastSyncAt: new Date(),
      isActive: true
    });

    console.log(`💾 Updated HR credits for ${tenantId}:${entityId}:`, this.credits.get(key));
    return this.credits.get(key);
  }

  async recordConsumption(tenantId, entityId, userId, amount, operationType, operationId) {
    const key = `${tenantId}:${entityId}`;
    const existing = this.credits.get(key);

    if (!existing) {
      console.warn(`⚠️ No credit record found for ${tenantId}:${entityId}`);
      return null;
    }

    // Deduct from available credits
    existing.availableCredits = Math.max(0, existing.availableCredits - amount);
    existing.lastConsumption = {
      userId,
      amount,
      operationType,
      operationId,
      timestamp: new Date()
    };

    console.log(`💸 Recorded HR consumption for ${tenantId}:${entityId}: -${amount} credits`);
    return existing;
  }

  getCredits(tenantId, entityId) {
    return this.credits.get(`${tenantId}:${entityId}`);
  }
}

// Initialize HR database mock
const hrDb = new HrCreditDatabase();

class HrCreditConsumer {
  constructor() {
    this.redisManager = getRedis();
    this.consumerGroup = consumerGroup;
    this.consumerName = consumerName;
    this.streamKey = streamKey;
    this.isRunning = false;
  }

  async connect() {
    try {
      await this.redisManager.connect();
      console.log('✅ HR Credit Consumer connected to Redis');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async setupConsumerGroup() {
    try {
      await this.redisManager.client.xGroupCreate(
        this.streamKey,
        this.consumerGroup,
        '0', // Start from beginning
        { MKSTREAM: true }
      );
      console.log(`✅ Created consumer group: ${this.consumerGroup}`);
    } catch (error) {
      if (error.message.includes('BUSYGROUP')) {
        console.log(`ℹ️ Consumer group ${this.consumerGroup} already exists`);
      } else {
        console.error('❌ Failed to create consumer group:', error);
        throw error;
      }
    }
  }

  async processCreditEvent(event) {
    const eventData = event.message;

    // Only process events targeted at HR
    if (eventData.targetApplication !== 'hr') {
      // Acknowledge but don't process events not meant for HR
      await this.redisManager.client.xAck(this.streamKey, this.consumerGroup, event.id);
      return;
    }

    console.log(`\n📨 Processing HR ${eventData.eventType} event:`, event.id);

    try {
      switch (eventData.eventType) {
        case 'credit.allocated':
          await this.handleCreditAllocation(eventData);
          break;

        case 'credit.consumed':
          await this.handleCreditConsumption(eventData);
          break;

        default:
          console.log(`⚠️ Unknown event type: ${eventData.eventType}`);
      }

      // Send acknowledgment back to wrapper
      try {
        await crmSyncStreams.publishAcknowledgment(eventData.eventId, 'processed', {
          tenantId: eventData.tenantId,
          entityId: eventData.entityId,
          processedAt: new Date().toISOString(),
          hrBalance: hrDb.getCredits(eventData.tenantId, eventData.entityId)?.availableCredits || 0,
          application: 'hr'
        });
      } catch (ackError) {
        console.error('❌ Failed to send acknowledgment:', ackError.message);
      }

      // Acknowledge successful processing
      await this.redisManager.client.xAck(this.streamKey, this.consumerGroup, event.id);
      console.log(`✅ Acknowledged HR event: ${event.id}`);

    } catch (error) {
      console.error(`❌ Failed to process HR event ${event.id}:`, error);

      // Send failure acknowledgment
      try {
        await crmSyncStreams.publishAcknowledgment(eventData.eventId, 'failed', {
          error: error.message,
          tenantId: eventData.tenantId,
          entityId: eventData.entityId,
          application: 'hr',
          processedAt: new Date().toISOString()
        });
      } catch (ackError) {
        console.error('❌ Failed to send failure acknowledgment:', ackError.message);
      }

      // Still acknowledge to prevent infinite retries
      await this.redisManager.client.xAck(this.streamKey, this.consumerGroup, event.id);
    }
  }

  async handleCreditAllocation(eventData) {
    const { tenantId, entityId, amount } = eventData;
    const metadata = JSON.parse(eventData.metadata || '{}');

    console.log(`💰 Processing HR credit allocation: ${amount} credits to ${tenantId}:${entityId}`);

    // Calculate new balance (in real HR, this would be more complex)
    const currentCredits = hrDb.getCredits(tenantId, entityId);
    const currentBalance = currentCredits ? currentCredits.availableCredits : 0;
    const newBalance = currentBalance + parseFloat(amount);

    // Update HR database
    const updatedRecord = await hrDb.updateEntityCredits(
      tenantId,
      entityId,
      parseFloat(amount),
      newBalance
    );

    console.log(`✅ HR Credit allocation processed:`, {
      tenantId,
      entityId,
      allocated: amount,
      newBalance,
      allocationId: metadata.allocationId,
      reason: metadata.reason
    });

    // In real HR, you would:
    // 1. Update employee credit records
    // 2. Send notifications to HR team
    // 3. Update payroll/benefits systems
    // 4. Log for compliance
  }

  async handleCreditConsumption(eventData) {
    const { tenantId, entityId, userId, amount, operationType, operationId } = eventData;
    const metadata = JSON.parse(eventData.metadata || '{}');

    console.log(`💸 Processing HR credit consumption: ${amount} credits by ${userId} for ${operationType}`);

    // Record consumption in HR
    const updatedRecord = await hrDb.recordConsumption(
      tenantId,
      entityId,
      userId,
      parseFloat(amount),
      operationType,
      operationId
    );

    if (updatedRecord) {
      console.log(`✅ HR Credit consumption processed:`, {
        tenantId,
        entityId,
        userId,
        consumed: amount,
        operationType,
        operationId,
        remainingBalance: updatedRecord.availableCredits,
        resourceType: metadata.resourceType,
        resourceId: metadata.resourceId
      });
    }

    // In real HR, you would:
    // 1. Verify employee permissions
    // 2. Update benefits tracking
    // 3. Send notifications for low balance
    // 4. Update compliance logs
  }

  async consumeEvents() {
    console.log(`🚀 Starting HR credit events consumer: ${this.consumerName}`);
    console.log(`👥 Consumer Group: ${this.consumerGroup}`);
    console.log(`📡 Stream: ${this.streamKey}`);
    console.log('');

    this.isRunning = true;

    while (this.isRunning) {
      try {
        // Read pending messages first
        const pendingMessages = await this.redisManager.client.xReadGroup(
          this.streamKey,
          this.consumerGroup,
          this.consumerName,
          { COUNT: 10, BLOCK: 1000 },
          '0' // Read pending messages
        );

        if (pendingMessages && pendingMessages.length > 0) {
          for (const stream of pendingMessages) {
            for (const event of stream.messages) {
              await this.processCreditEvent(event);
            }
          }
        }

        // Then read new messages
        const newMessages = await this.redisManager.client.xReadGroup(
          this.streamKey,
          this.consumerGroup,
          this.consumerName,
          { COUNT: 10, BLOCK: 2000 },
          '>' // Read new messages
        );

        if (newMessages && newMessages.length > 0) {
          for (const stream of newMessages) {
            for (const event of stream.messages) {
              await this.processCreditEvent(event);
            }
          }
        }

      } catch (error) {
        console.error('❌ Error consuming HR events:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }
    }
  }

  async stop() {
    console.log('🛑 Stopping HR Credit Consumer...');
    this.isRunning = false;
    await this.redisManager.disconnect();
  }

  async getStreamInfo() {
    try {
      const info = await this.redisManager.client.xInfoStream(this.streamKey);
      const groups = await this.redisManager.client.xInfoGroups(this.streamKey);
      const pending = await this.redisManager.client.xPending(this.streamKey, this.consumerGroup);

      return {
        streamLength: info.length,
        consumerGroups: groups.length,
        pendingMessages: pending.length,
        lastDeliveredId: groups.find(g => g.name === this.consumerGroup)?.['last-delivered-id']
      };
    } catch (error) {
      console.error('❌ Failed to get stream info:', error);
      return null;
    }
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  if (global.consumer) {
    global.consumer.stop().then(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  if (global.consumer) {
    global.consumer.stop().then(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

// Main execution
async function main() {
  const consumer = new HrCreditConsumer();
  global.consumer = consumer;

  try {
    console.log('🔄 Starting HR Credit Events Consumer...');
    console.log('=======================================');

    await consumer.connect();
    await consumer.setupConsumerGroup();

    // Display stream info
    const streamInfo = await consumer.getStreamInfo();
    if (streamInfo) {
      console.log(`📊 Stream Info:`, streamInfo);
    }

    console.log('\n🎯 Ready to consume HR credit events!');
    console.log('====================================');
    console.log('• Processes only events where targetApplication = "hr"');
    console.log('• credit.allocated - When wrapper allocates credits to HR');
    console.log('• credit.consumed - When HR consumes credits');
    console.log('• Sends acknowledgments back to wrapper');
    console.log('');

    await consumer.consumeEvents();

  } catch (error) {
    console.error('❌ HR Consumer failed:', error);
    process.exit(1);
  }
}

// Run the consumer
main().catch(console.error);
