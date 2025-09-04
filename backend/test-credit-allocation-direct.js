import creditAllocationService from './src/services/credit-allocation-service.js';

async function testCreditAllocationDirectly() {
  console.log('🧪 Testing Credit Allocation Service Directly...\n');

  const tenantId = 'ef8986cf-ee4f-4974-9849-c71dbf02534d'; // Use the latest tenant ID from our test

  try {
    console.log('🎁 Allocating 1000 credits for tenant:', tenantId);
    const result = await creditAllocationService.allocateTrialCredits(tenantId, {
      creditAmount: 1000,
      trialDays: 5 // 5 minutes for testing
    });

    console.log('✅ Credit allocation successful!');
    console.log('📋 Result:', result);
    console.log('\n🎯 Credit allocation service is working correctly!');

  } catch (error) {
    console.error('❌ Credit allocation failed:', error.message);
    console.error('📋 Error details:', error);
  }
}

testCreditAllocationDirectly().catch(console.error);
