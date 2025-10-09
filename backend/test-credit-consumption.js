#!/usr/bin/env node

/**
 * Test Credit Consumption from Applications
 * This script tests consuming credits from application allocations
 * and verifies Redis stream publishing
 */

import { CreditAllocationService } from './src/services/credit-allocation-service.js';

async function testCreditConsumption() {
  console.log('🧪 Testing Credit Consumption from Applications\n');

  const testData = {
    tenantId: 'b0a6e370-c1e5-43d1-94e0-55ed792274c4',
    sourceEntityId: '4b9fe8ea-6b18-40e8-b90a-044ab1db132a', // An organization
    application: 'crm',
    creditAmount: 50,
    operationCode: 'crm.accounts.create',
    operationId: 'test-op-123',
    description: 'Test account creation',
    initiatedBy: 'user-456'
  };

  console.log('📤 Consuming credits:', testData);

  try {
    const result = await CreditAllocationService.consumeApplicationCredits(testData);

    if (result.success) {
      console.log('✅ Consumption successful:', {
        allocationId: result.allocationId,
        consumedCredits: result.consumedCredits,
        remainingCredits: result.remainingCredits
      });

      console.log('\n🔍 Check Redis streams now to see if the event was published!');
      console.log('Run: node test-redis-streams.js');
      console.log('Look for: credit-events stream with credit.consumed events');

    } else {
      console.log('❌ Consumption failed:', result.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCreditConsumption().catch(console.error);
