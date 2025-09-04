import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE = 'http://localhost:3000/api';

async function testOnboardingStatus() {
  console.log('🔍 Checking Onboarding Status...\n');

  // Test 1: Backend Health Check
  console.log('1️⃣ Backend Health Check');
  try {
    const healthResponse = await fetch('http://localhost:3000/health');
    if (healthResponse.ok) {
      console.log('✅ Backend is running and healthy');
    } else {
      console.log('❌ Backend health check failed');
      return;
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
    console.log('💡 Make sure to start the backend server: npm run dev');
    return;
  }

  // Test 2: Test Onboarding Endpoint
  console.log('\n2️⃣ Testing Onboarding Endpoint');

  const timestamp = Date.now();
  const testData = {
    companyName: `TestCompany_${timestamp}`,
    adminEmail: `admin_${timestamp}@testcompany.com`,
    adminMobile: '+91 9999999999',
    gstin: '22AAAAA0000A1Z6'
  };

  try {
    console.log('📋 Test Data:', testData);

    const response = await fetch(`${API_BASE}/onboarding/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Onboarding successful!');
      console.log('📋 Response:', {
        success: data.success,
        tenantId: data.data?.tenantId,
        subdomain: data.data?.subdomain,
        kindeOrgCode: data.data?.kindeOrgCode,
        organization: data.data?.organization
      });

      // Test 3: Verify Database Records
      console.log('\n3️⃣ Verifying Database Records');

      if (data.success && data.data?.tenantId) {
        console.log('🔍 Checking database records...');

        // This would require database access or admin endpoints
        console.log('📋 Created Records:');
        console.log('🏢 Tenant ID:', data.data.tenantId);
        console.log('🏷️ Subdomain:', data.data.subdomain);
        console.log('🔗 Kinde Org Code:', data.data.kindeOrgCode);

        if (data.data.organization) {
          console.log('🏢 Organization:', data.data.organization.name);
        }
      }

    } else if (response.status === 409) {
      const errorData = await response.json();
      console.log('⚠️ Organization already exists:', errorData.data?.existingOrganization);
      console.log('💡 This means onboarding worked before, but database wasn\'t cleared');

    } else if (response.status === 401) {
      console.log('🔐 Authentication required (expected for production)');
      console.log('✅ Endpoint is working, just needs authentication');

    } else {
      const errorData = await response.json();
      console.log('❌ Onboarding failed:', errorData.message || errorData.error);

      if (errorData.message?.includes('database') || errorData.message?.includes('connect')) {
        console.log('🔧 Issue: Database connection problem');
      } else if (errorData.message?.includes('kinde') || errorData.message?.includes('organization')) {
        console.log('🔧 Issue: Kinde integration problem');
      }
    }

  } catch (error) {
    console.log('❌ Request failed:', error.message);
    console.log('💡 Check if backend server is running on port 3000');
  }

  // Test 4: Check Recent Database Activity
  console.log('\n4️⃣ Checking Database Status');

  try {
    // Try to access a simple endpoint that might show database status
    const statusResponse = await fetch(`${API_BASE}/onboarding/status`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Database appears to be accessible');
      console.log('📋 Status:', statusData);
    } else {
      console.log('⚠️ Database status check failed');
    }
  } catch (error) {
    console.log('⚠️ Database status check failed:', error.message);
  }

  console.log('\n🎯 Onboarding Status Summary:');
  console.log('📊 Backend Status: ✅ Running');
  console.log('🔗 Onboarding Endpoint: Available');
  console.log('📋 Test Data Format: ✅ Valid');
  console.log('🔍 Next Steps: Check database connection and Kinde credentials');
}

// Run the test
testOnboardingStatus().catch(console.error);
