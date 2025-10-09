#!/usr/bin/env node

/**
 * Test Credit Allocation to Applications
 * This script tests allocating credits from entities to applications
 * and verifies Redis stream publishing
 */

import { CreditAllocationService } from './src/services/credit-allocation-service.js';

async function testCreditAllocation() {
  console.log('🧪 Testing Credit Allocation to Applications\n');

  const testData = {
    tenantId: 'b0a6e370-c1e5-43d1-94e0-55ed792274c4',
    sourceEntityId: '4b9fe8ea-6b18-40e8-b90a-044ab1db132a', // An organization
    targetApplication: 'crm',
    creditAmount: 500,
    allocationPurpose: 'test_allocation',
    allocatedBy: 'system'
  };

  console.log('📤 Allocating credits:', testData);

  try {
    const result = await CreditAllocationService.allocateCreditsToApplication(testData);

    if (result.success) {
      console.log('✅ Allocation successful:', {
        allocationId: result.allocationId,
        allocatedCredits: result.allocatedCredits,
        availableCredits: result.availableCredits
      });

      console.log('\n🔍 Check Redis streams now to see if the event was published!');
      console.log('Run: node test-redis-streams.js');
      console.log('Look for: credit-events stream with credit.allocated events');

    } else {
      console.log('❌ Allocation failed:', result.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCreditAllocation().catch(console.error);
