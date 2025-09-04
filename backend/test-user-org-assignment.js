import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE = 'http://localhost:3000/api';

// Test Kinde user-to-organization assignment
async function testUserOrgAssignment() {
  console.log('🧪 Testing User-to-Organization Assignment...\n');

  // Test 1: Check Kinde service methods
  console.log('1️⃣ Testing Kinde service methods...');

  try {
    // Import Kinde service dynamically
    const { default: KindeService } = await import('./src/services/kinde-service.js');
    const kindeService = new KindeService();

    console.log('✅ Kinde service loaded successfully');

    // Check if M2M credentials are available
    const hasM2M = !!(process.env.KINDE_M2M_CLIENT_ID && process.env.KINDE_M2M_CLIENT_SECRET);
    console.log('📋 M2M Credentials available:', hasM2M ? '✅ Yes' : '❌ No');

    // Test M2M token if available
    if (hasM2M) {
      try {
        console.log('🔑 Testing M2M token generation...');
        const token = await kindeService.getM2MToken();
        console.log('✅ M2M token generated successfully');
      } catch (tokenError) {
        console.log('❌ M2M token generation failed:', tokenError.message);
      }
    }

  } catch (error) {
    console.log('❌ Kinde service test failed:', error.message);
  }

  // Test 2: Check backend health
  console.log('\n2️⃣ Testing backend health...');

  try {
    const healthResponse = await fetch(`${API_BASE.replace('/api', '')}/health`);
    if (healthResponse.ok) {
      console.log('✅ Backend is healthy');
    } else {
      console.log('⚠️ Backend health check failed');
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
  }

  // Test 3: Test onboarding endpoint availability
  console.log('\n3️⃣ Testing onboarding endpoint...');

  try {
    const testData = {
      companyName: 'Test Company Inc',
      adminEmail: 'test@example.com',
      adminMobile: '+91 9876543210',
      gstin: '22AAAAA0000A1Z6'
    };

    console.log('📋 Test payload:', testData);

    const response = await fetch(`${API_BASE}/onboarding/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
      console.log('🔐 Authentication required (expected for production)');
    } else if (response.status === 409) {
      console.log('⚠️ Organization already exists (database needs clearing)');
    } else if (response.status === 500) {
      const errorData = await response.json();
      console.log('❌ Server error:', errorData.message);

      if (errorData.message && errorData.message.includes('adminUserName')) {
        console.log('🔧 Issue: adminUserName variable not defined - needs fixing');
      }
    } else {
      const data = await response.json();
      console.log('✅ Response data:', data);
    }

  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n🎯 Diagnosis Summary:');
  console.log('1. Check M2M credentials in environment variables');
  console.log('2. Ensure Kinde service methods are working');
  console.log('3. Verify database is properly cleared for testing');
  console.log('4. Check backend server logs for detailed error messages');
}

// Run the test
testUserOrgAssignment().catch(console.error);
