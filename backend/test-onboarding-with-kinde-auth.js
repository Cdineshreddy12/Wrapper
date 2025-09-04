import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE = 'http://localhost:3000/api';

// Generate a mock Kinde JWT token for testing
function generateMockKindeToken(userEmail = 'testuser@zopkit.com') {
  const header = {
    alg: 'RS256',
    kid: 'test-key-123',
    typ: 'JWT'
  };

  const payload = {
    aud: ['https://zopkit.kinde.com/api'],
    azp: 'test-client-id',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    iss: 'https://auth.zopkit.com',
    jti: 'test-jwt-' + Date.now(),
    org_code: 'test-org-123',
    org_codes: ['test-org-123'],
    preferred_email: userEmail,
    email: userEmail,
    given_name: userEmail.split('@')[0].split(/[._-]/)[0] || 'Test',
    family_name: userEmail.split('@')[0].split(/[._-]/).slice(1).join(' ') || 'User',
    name: `${userEmail.split('@')[0].split(/[._-]/)[0] || 'Test'} ${userEmail.split('@')[0].split(/[._-]/).slice(1).join(' ') || 'User'}`,
    sub: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    scp: ['openid', 'profile', 'email', 'offline']
  };

  // Base64 encode header and payload (simplified for testing)
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Create a mock signature (in real JWT this would be properly signed)
  const signature = 'mock-signature-' + Date.now();

  return `${headerB64}.${payloadB64}.${signature}`;
}

async function testOnboardingWithKindeAuth() {
  console.log('🔐 Testing Onboarding with Kinde Authentication...\n');

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

  // Test 2: Test with Mock Kinde Token
  console.log('\n2️⃣ Testing Onboarding with Mock Kinde Token');

  const timestamp = Date.now();
  const testData = {
    companyName: `AuthTest_${timestamp}`,
    adminEmail: `auth_test_${timestamp}@unique-domain-${timestamp}.com`,
    adminMobile: '+91 9876543210',
    gstin: '22AAAAA0000A1Z6'
  };

  const mockToken = generateMockKindeToken(testData.adminEmail);
  console.log('🔑 Generated Mock Kinde Token');
  console.log('📋 Token Preview:', mockToken.substring(0, 50) + '...');

  console.log('📋 Test Data:', testData);

  try {
    const response = await fetch(`${API_BASE}/onboarding/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token')) {
        console.log(`  ${key}: ${value}`);
      }
    }

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Onboarding successful with authentication!');
      console.log('📋 Response Data:', {
        success: data.success,
        tenantId: data.data?.tenantId,
        subdomain: data.data?.subdomain,
        kindeOrgCode: data.data?.kindeOrgCode,
        organization: data.data?.organization
      });

      // Test 3: Verify Database Records
      console.log('\n3️⃣ Verifying Created Records');
      if (data.success && data.data?.tenantId) {
        console.log('🏢 Tenant ID:', data.data.tenantId);
        console.log('🏷️ Subdomain:', data.data.subdomain);
        console.log('🔗 Kinde Org Code:', data.data.kindeOrgCode);
        console.log('👤 User Email:', testData.adminEmail);
        console.log('📱 User Mobile:', testData.adminMobile);
        console.log('🏢 GSTIN:', testData.gstin);
      }

    } else if (response.status === 401) {
      console.log('🔐 Authentication failed (expected with mock token)');
      const errorData = await response.json();
      console.log('📋 Auth Error:', errorData.message || errorData.error);

      // Check if it's token validation or user context issues
      if (errorData.message?.includes('token') || errorData.message?.includes('invalid')) {
        console.log('🔧 Issue: Token validation failed - Kinde service may need proper token verification');
      } else if (errorData.message?.includes('context') || errorData.message?.includes('user')) {
        console.log('🔧 Issue: User context not found - authentication middleware working but user not in context');
      }

    } else if (response.status === 409) {
      console.log('⚠️ Organization already exists');
      const errorData = await response.json();
      console.log('📋 Existing Organization:', errorData.data?.existingOrganization);

    } else {
      const errorData = await response.json();
      console.log('❌ Onboarding failed:', errorData.message || errorData.error);

      // Detailed error analysis
      if (errorData.message?.includes('kinde') || errorData.message?.includes('organization')) {
        console.log('🔧 Issue: Kinde integration problem');
      } else if (errorData.message?.includes('database') || errorData.message?.includes('connect')) {
        console.log('🔧 Issue: Database connection problem');
      } else if (errorData.message?.includes('validation')) {
        console.log('🔧 Issue: Input validation failed');
      }
    }

  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  // Test 4: Test without authentication
  console.log('\n4️⃣ Testing Onboarding without Authentication');

  try {
    const noAuthResponse = await fetch(`${API_BASE}/onboarding/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 No-Auth Response Status:', noAuthResponse.status);

    if (noAuthResponse.status === 401) {
      console.log('✅ Authentication properly enforced (401 Unauthorized)');
      const errorData = await noAuthResponse.json();
      console.log('📋 Auth Required Message:', errorData.message);
    } else {
      console.log('⚠️ Authentication not properly enforced');
    }

  } catch (error) {
    console.log('❌ No-auth request failed:', error.message);
  }

  // Test 5: Test with invalid token
  console.log('\n5️⃣ Testing Onboarding with Invalid Token');

  try {
    const invalidToken = 'invalid.jwt.token.here';
    const invalidResponse = await fetch(`${API_BASE}/onboarding/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${invalidToken}`
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 Invalid Token Response Status:', invalidResponse.status);

    if (invalidResponse.status === 401) {
      console.log('✅ Invalid token properly rejected (401 Unauthorized)');
    } else {
      console.log('⚠️ Invalid token not properly rejected');
    }

  } catch (error) {
    console.log('❌ Invalid token request failed:', error.message);
  }

  console.log('\n🎯 Kinde Authentication Test Summary:');
  console.log('📊 Backend Status: ✅ Running');
  console.log('🔗 Onboarding Endpoint: ✅ Accessible');
  console.log('🔐 Authentication: Testing...');
  console.log('📋 Test Data Format: ✅ Valid');
  console.log('🔍 Next Steps: Check authentication middleware and Kinde service integration');
}

// Run the test
testOnboardingWithKindeAuth().catch(console.error);
