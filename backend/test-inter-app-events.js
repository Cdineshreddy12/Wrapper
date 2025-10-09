#!/usr/bin/env node

/**
 * Test Inter-Application Events
 * Demonstrates how applications communicate with each other
 */

import { InterAppEventService } from './src/services/inter-app-event-service.js';

async function testInterAppCommunication() {
  console.log('🧪 Testing Inter-Application Event Communication\n');

  const testTenantId = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';
  const testEntityId = '4b9fe8ea-6b18-40e8-b90a-044ab1db132a';

  console.log('📤 Publishing inter-application events...\n');

  // Test various inter-app communication scenarios
  const testEvents = [
    // CRM → HR: New employee created
    {
      sourceApplication: 'crm',
      targetApplication: 'hr',
      eventType: 'user.created',
      eventData: {
        userId: testEntityId,
        email: 'john.doe@company.com',
        role: 'employee',
        department: 'engineering'
      }
    },

    // HR → CRM: Employee benefits updated
    {
      sourceApplication: 'hr',
      targetApplication: 'crm',
      eventType: 'benefits.updated',
      eventData: {
        employeeId: testEntityId,
        benefits: ['health_insurance', 'dental', 'pto'],
        effectiveDate: '2024-01-01'
      }
    },

    // CRM → Affiliate: New partner registered
    {
      sourceApplication: 'crm',
      targetApplication: 'affiliate',
      eventType: 'partner.registered',
      eventData: {
        partnerId: testEntityId,
        partnerType: 'reseller',
        commissionRate: 0.15
      }
    },

    // Affiliate → System: Commission payout processed
    {
      sourceApplication: 'affiliate',
      targetApplication: 'system',
      eventType: 'commission.processed',
      eventData: {
        partnerId: testEntityId,
        amount: 1500.00,
        period: '2024-Q1'
      }
    },

    // System → HR: Security alert for employee
    {
      sourceApplication: 'system',
      targetApplication: 'hr',
      eventType: 'security.alert',
      eventData: {
        employeeId: testEntityId,
        alertType: 'suspicious_login',
        severity: 'medium',
        timestamp: new Date().toISOString()
      }
    }
  ];

  // Publish all test events
  for (const event of testEvents) {
    try {
      console.log(`📡 Publishing: ${event.sourceApplication} → ${event.targetApplication} (${event.eventType})`);

      await InterAppEventService.publishEvent({
        ...event,
        tenantId: testTenantId,
        entityId: testEntityId,
        publishedBy: 'test-system'
      });

      console.log(`✅ Event published successfully\n`);

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Failed to publish event:`, error.message);
    }
  }

  // Wait for all events to be processed
  console.log('⏳ Waiting for events to be processed...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check communication matrix
  console.log('\n📊 Communication Matrix:');
  console.log('========================');

  try {
    const matrix = await InterAppEventService.getCommunicationMatrix(testTenantId);

    console.log(`\nTotal Inter-App Events: ${matrix.totalInterAppEvents}`);
    console.log(`Overall Success Rate: ${matrix.overallSuccessRate}%\n`);

    console.log('Communication Flows:');
    Object.entries(matrix.communicationFlows).forEach(([flow, stats]) => {
      if (stats.events > 0) {
        console.log(`  ${flow}: ${stats.events} events (${stats.successRate}% acknowledged)`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to get communication matrix:', error.message);
  }

  console.log('\n🎯 Test completed!');
  console.log('\n💡 To see the full communication matrix:');
  console.log('GET /api/wrapper-crm-sync/tenants/{tenantId}/communication-matrix');
  console.log('\n💡 To publish custom inter-app events:');
  console.log('POST /api/wrapper-crm-sync/tenants/{tenantId}/inter-app-events');
}

// Run the test
testInterAppCommunication().catch(console.error);
