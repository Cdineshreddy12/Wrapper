// Debug script to test plan upgrade
async function testPlanUpgrade() {
  try {
    console.log('🧪 Testing Plan Upgrade...\n');

    // Test 1: Check if backend is running
    console.log('1️⃣ Checking backend connectivity...');
    try {
      const healthResponse = await fetch('http://localhost:3000/health');
      if (healthResponse.ok) {
        console.log('✅ Backend is running');
      } else {
        console.log('❌ Backend responded with status:', healthResponse.status);
      }
    } catch (error) {
      console.log('❌ Backend not running:', error.message);
      return;
    }

    // Test 2: Check available plans
    console.log('\n2️⃣ Checking available plans...');
    try {
      const plansResponse = await fetch('http://localhost:3000/api/subscriptions/plans');
      const plansData = await plansResponse.json();
      console.log('Available plans:', plansData.data?.map(p => p.id));
    } catch (error) {
      console.log('❌ Cannot fetch plans:', error.message);
    }

    // Test 3: Test changePlan API (will fail without auth, but shows if endpoint exists)
    console.log('\n3️⃣ Testing changePlan API endpoint...');
    try {
      const changeResponse = await fetch('http://localhost:3000/api/subscriptions/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: 'premium',
          billingCycle: 'yearly'
        })
      });

      if (changeResponse.status === 401) {
        console.log('✅ changePlan API exists (auth required as expected)');
      } else if (changeResponse.ok) {
        console.log('✅ changePlan API accessible');
      } else {
        const errorData = await changeResponse.json();
        console.log('❌ changePlan API error:', errorData);
      }
    } catch (error) {
      console.log('❌ changePlan API network error:', error.message);
    }

    console.log('\n📋 Debug complete. Check browser console for frontend errors.');

  } catch (error) {
    console.log('❌ Debug script failed:', error.message);
  }
}

testPlanUpgrade();
