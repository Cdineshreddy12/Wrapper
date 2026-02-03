#!/usr/bin/env node
/**
 * Publish a test event to AWS MQ for verification
 * Run: node scripts/publish-test-event.js
 */
import 'dotenv/config';
import { amazonMQPublisher } from '../src/utils/amazon-mq-publisher.js';

async function main() {
  try {
    console.log('📤 Publishing test event to AWS MQ (crm-events)...');
    await amazonMQPublisher.publishRoleEvent(
      'crm',
      'role_updated',
      '62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8', // test tenant from .env
      'test-role-id',
      { test: true, publishedAt: new Date().toISOString() }
    );
    console.log('✅ Test event published successfully. Check RabbitMQ queues.');
  } catch (err) {
    console.error('❌ Failed to publish:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
