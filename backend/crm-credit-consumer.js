#!/usr/bin/env node

/**
 * CRM Credit Events Consumer
 *
 * Consumes credit allocation and consumption events from Redis Streams
 * and synchronizes credit balances between Wrapper and CRM systems.
 *
 * Usage: node crm-credit-consumer.js
 */

import Redis from 'redis';
import dotenv from 'dotenv';
import { crmSyncStreams } from './src/utils/redis.js';

// Load environment variables
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const consumerGroup = 'crm-consumers';
const consumerName = `crm-consumer-${Date.now()}`;
const streamKey = 'credit-events';

// Mock CRM database (replace with actual CRM database operations)
class CrmCreditDatabase {
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

    console.log(`💾 Updated CRM credits for ${tenantId}:${entityId}:`, this.credits.get(key));
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

    console.log(`💸 Recorded consumption for ${tenantId}:${entityId}: -${amount} credits`);
    return existing;
  }

  getCredits(tenantId, entityId) {
    return this.credits.get(`${tenantId}:${entityId}`);
  }
}

// Initialize CRM database mock
const crmDb = new CrmCreditDatabase();

class CrmCreditConsumer {
  constructor() {
    this.redis = Redis.createClient({ url: redisUrl });
    this.consumerGroup = consumerGroup;
    this.consumerName = consumerName;
    this.streamKey = streamKey;
    this.isRunning = false;
  }

  async connect() {
    try {
      await this.redis.connect();
      console.log('✅ CRM Credit Consumer connected to Redis');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async setupConsumerGroup() {
    try {
      // Try to create consumer group (will fail if it already exists)
      await this.redis.xGroupCreate(
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

    console.log(`\n📨 Processing ${eventData.eventType} event:`, event.id);

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

      // Acknowledge successful processing
      await this.redis.xAck(this.streamKey, this.consumerGroup, event.id);
      console.log(`✅ Acknowledged event: ${event.id}`);

    } catch (error) {
      console.error(`❌ Failed to process event ${event.id}:`, error);
      // Still acknowledge to prevent infinite retries
      await this.redis.xAck(this.streamKey, this.consumerGroup, event.id);
    }
  }

  async handleCreditAllocation(eventData) {
    const { tenantId, entityId, amount } = eventData;
    const metadata = JSON.parse(eventData.metadata || '{}');

    console.log(`💰 Processing credit allocation: ${amount} credits to ${tenantId}:${entityId}`);

    // Calculate new balance (in real CRM, this would be more complex)
    const currentCredits = crmDb.getCredits(tenantId, entityId);
    const currentBalance = currentCredits ? currentCredits.availableCredits : 0;
    const newBalance = currentBalance + parseFloat(amount);

    // Update CRM database
    const updatedRecord = await crmDb.updateEntityCredits(
      tenantId,
      entityId,
      parseFloat(amount),
      newBalance
    );

    console.log(`✅ Credit allocation processed:`, {
      tenantId,
      entityId,
      allocated: amount,
      newBalance,
      allocationId: metadata.allocationId,
      reason: metadata.reason
    });

    // Send acknowledgment back to wrapper
    try {
      await crmSyncStreams.publishAcknowledgment(eventData.eventId, 'processed', {
        tenantId,
        entityId,
        allocatedCredits: parseFloat(amount),
        availableCredits: newBalance,
        allocationId: metadata.allocationId,
        processedAt: new Date().toISOString(),
        crmBalance: newBalance
      });
    } catch (ackError) {
      console.error('❌ Failed to send acknowledgment:', ackError.message);
    }

    // In real CRM, you would:
    // 1. Update your entity credit records
    // 2. Send notifications if needed
    // 3. Update any dependent systems
  }

  async handleCreditConsumption(eventData) {
    const { tenantId, entityId, userId, amount, operationType, operationId } = eventData;
    const metadata = JSON.parse(eventData.metadata || '{}');

    console.log(`💸 Processing credit consumption: ${amount} credits by ${userId} for ${operationType}`);

    // Record consumption in CRM
    const updatedRecord = await crmDb.recordConsumption(
      tenantId,
      entityId,
      userId,
      parseFloat(amount),
      operationType,
      operationId
    );

    if (updatedRecord) {
      console.log(`✅ Credit consumption processed:`, {
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

      // Send acknowledgment back to wrapper
      try {
        await crmSyncStreams.publishAcknowledgment(eventData.eventId, 'processed', {
          tenantId,
          entityId,
          userId,
          consumedCredits: parseFloat(amount),
          remainingCredits: updatedRecord.availableCredits,
          operationType,
          operationId,
          processedAt: new Date().toISOString(),
          crmBalance: updatedRecord.availableCredits
        });
      } catch (ackError) {
        console.error('❌ Failed to send acknowledgment:', ackError.message);
      }
    } else {
      // Send failure acknowledgment
      try {
        await crmSyncStreams.publishAcknowledgment(eventData.eventId, 'failed', {
          error: 'Entity not found or no credit record',
          tenantId,
          entityId,
          processedAt: new Date().toISOString()
        });
      } catch (ackError) {
        console.error('❌ Failed to send failure acknowledgment:', ackError.message);
      }
    }

    // In real CRM, you would:
    // 1. Verify the user has permission to consume credits
    // 2. Update your consumption tracking
    // 3. Send alerts if credit balance is low
    // 4. Log the consumption for auditing
  }

  async consumeEvents() {
    console.log(`🚀 Starting credit events consumer: ${this.consumerName}`);
    console.log(`👥 Consumer Group: ${this.consumerGroup}`);
    console.log(`📡 Stream: ${this.streamKey}`);
    console.log('');

    this.isRunning = true;

    while (this.isRunning) {
      try {
        // Read pending messages first
        const pendingMessages = await this.redis.xReadGroup(
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
        const newMessages = await this.redis.xReadGroup(
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
        console.error('❌ Error consuming events:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }
    }
  }

  async stop() {
    console.log('🛑 Stopping CRM Credit Consumer...');
    this.isRunning = false;
    await this.redis.quit();
  }

  async getStreamInfo() {
    try {
      const info = await this.redis.xInfoStream(this.streamKey);
      const groups = await this.redis.xInfoGroups(this.streamKey);
      const pending = await this.redis.xPending(this.streamKey, this.consumerGroup);

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
  const consumer = new CrmCreditConsumer();
  global.consumer = consumer;

  try {
    console.log('🔄 Starting CRM Credit Events Consumer...');
    console.log('=======================================');

    await consumer.connect();
    await consumer.setupConsumerGroup();

    // Display stream info
    const streamInfo = await consumer.getStreamInfo();
    if (streamInfo) {
      console.log(`📊 Stream Info:`, streamInfo);
    }

    console.log('\n🎯 Ready to consume credit events!');
    console.log('==================================');
    console.log('• credit.allocated - When wrapper allocates credits');
    console.log('• credit.consumed - When CRM consumes credits');
    console.log('');

    await consumer.consumeEvents();

  } catch (error) {
    console.error('❌ Consumer failed:', error);
    process.exit(1);
  }
}

// Run the consumer
main().catch(console.error);
