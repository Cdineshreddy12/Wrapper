import { PaymentService } from './backend/src/services/payment-service.js';

// Test script to verify payment creation for subscription upgrades
async function testPaymentCreation() {
  console.log('🧪 Testing payment creation for subscription upgrades...');

  const testTenantId = 'c78f758e-afa5-4d73-abc0-767a5d236981'; // From user's example
  const testPaymentIntentId = 'pi_test_upgrade_' + Date.now();

  try {
    // First, check if a payment record exists for this intent
    console.log('1. Checking for existing payment record...');
    const existingPayment = await PaymentService.getPaymentByIntentId(testPaymentIntentId);
    console.log('   Existing payment:', existingPayment ? 'FOUND' : 'NOT FOUND');

    if (!existingPayment) {
      // Create a test payment record
      console.log('2. Creating test payment record...');
      const payment = await PaymentService.recordPayment({
        tenantId: testTenantId,
        stripePaymentIntentId: testPaymentIntentId,
        stripeCustomerId: 'cus_test_customer',
        amount: '99.00',
        currency: 'USD',
        status: 'succeeded',
        paymentMethod: 'card',
        paymentType: 'subscription',
        description: 'Plan upgrade from trial to starter',
        metadata: {
          planId: 'starter',
          upgrade: true
        },
        paidAt: new Date()
      });
      console.log('   ✅ Payment record created:', payment.paymentId);
    } else {
      console.log('   Payment already exists, skipping creation');
    }

    // Verify the payment was created
    console.log('3. Verifying payment record...');
    const verifiedPayment = await PaymentService.getPaymentByIntentId(testPaymentIntentId);
    if (verifiedPayment) {
      console.log('   ✅ Payment record verified:', {
        paymentId: verifiedPayment.paymentId,
        tenantId: verifiedPayment.tenantId,
        amount: verifiedPayment.amount,
        status: verifiedPayment.status,
        paymentType: verifiedPayment.paymentType
      });
    } else {
      console.log('   ❌ Payment record not found after creation!');
    }

    // Test payment history retrieval
    console.log('4. Testing payment history retrieval...');
    const paymentHistory = await PaymentService.getPaymentHistory(testTenantId, 10);
    console.log(`   Found ${paymentHistory.length} payment records for tenant`);

    const upgradePayments = paymentHistory.filter(p =>
      p.metadata?.upgrade === true ||
      p.description?.includes('upgrade') ||
      p.description?.includes('starter')
    );
    console.log(`   Found ${upgradePayments.length} upgrade-related payments`);

    console.log('✅ Payment creation test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPaymentCreation().catch(console.error);
