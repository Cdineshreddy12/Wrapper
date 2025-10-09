#!/usr/bin/env node

/**
 * Test Acknowledgment System
 * Tests the complete event acknowledgment flow between Wrapper and CRM
 */

import { EventTrackingService } from './src/services/event-tracking-service.js';
import { crmSyncStreams } from './src/utils/redis.js';

async function testAcknowledgmentFlow() {
  console.log('🧪 Testing Event Acknowledgment System\n');

  const testEventId = `test_evt_${Date.now()}`;
  const testTenantId = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';
  const testEntityId = '4b9fe8ea-6b18-40e8-b90a-044ab1db132a';

  console.log('📤 Step 1: Publishing test event...');

  try {
    // Publish a test event
    const publishResult = await crmSyncStreams.publishCreditAllocation(
      testTenantId,
      testEntityId,
      100,
      {
        allocationId: `test_alloc_${Date.now()}`,
        reason: 'test_acknowledgment',
        entityType: 'organization',
        targetApplication: 'crm',
        allocatedBy: 'system',
        availableCredits: 500
      }
    );

    if (publishResult) {
      console.log('✅ Event published successfully:', publishResult.eventId);
      console.log('⏳ Waiting for acknowledgment... (CRM consumer should process this)');

      // Wait a bit for the CRM consumer to process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if event was tracked and acknowledged
      const eventStatus = await EventTrackingService.getEventStatus(publishResult.eventId);

      if (eventStatus) {
        console.log('📊 Event Status:', {
          eventId: eventStatus.eventId,
          acknowledged: eventStatus.acknowledged,
          status: eventStatus.status,
          acknowledgedAt: eventStatus.acknowledgedAt
        });

        if (eventStatus.acknowledged) {
          console.log('✅ Event was acknowledged by CRM!');
        } else {
          console.log('⏳ Event not yet acknowledged. Run the CRM consumer:');
          console.log('   node crm-credit-consumer.js');
        }
      } else {
        console.log('❌ Event tracking not found');
      }
    } else {
      console.log('❌ Event publishing failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  // Test health metrics
  console.log('\n📊 Step 2: Testing sync health metrics...');
  try {
    const healthMetrics = await EventTrackingService.getSyncHealthMetrics(testTenantId);
    console.log('📈 Sync Health Metrics:', JSON.stringify(healthMetrics, null, 2));
  } catch (error) {
    console.error('❌ Failed to get health metrics:', error.message);
  }

  console.log('\n🎯 Test completed!');
  console.log('\n💡 To test the full flow:');
  console.log('1. Run this test: node test-acknowledgments.js');
  console.log('2. In another terminal, run the CRM consumer: node crm-credit-consumer.js');
  console.log('3. In another terminal, run the acknowledgment consumer: node src/services/acknowledgment-consumer.js');
  console.log('4. Run this test again to see acknowledgments');
}

// Run the test
testAcknowledgmentFlow().catch(console.error);
