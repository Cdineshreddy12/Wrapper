import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE = 'http://localhost:3000/api';

// Generate a mock Kinde JWT token for testing
function generateMockKindeToken() {
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
    preferred_email: 'testuser@zopkit.com',
    email: 'testuser@zopkit.com',
    given_name: 'Test',
    family_name: 'User',
    name: 'Test User',
    sub: 'user_123456789',
    scp: ['openid', 'profile', 'email', 'offline']
  };

  // Base64 encode header and payload (simplified for testing)
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Create a mock signature (in real JWT this would be properly signed)
  const signature = 'mock-signature-' + Date.now();

  return `${headerB64}.${payloadB64}.${signature}`;
}

async function testAuthMiddleware() {
  console.log('🛡️ Testing Authentication Middleware...\n');

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

  // Test 2: Test a protected endpoint (onboarding)
  console.log('\n2️⃣ Testing Protected Endpoint (Onboarding)');

  const testData = {
    companyName: `AuthTest_${Date.now()}`,
    adminEmail: 'testuser@zopkit.com',
    adminMobile: '+91 9876543210',
    gstin: '22AAAAA0000A1Z6'
  };

  // Test 2a: No authentication
  console.log('\n🔍 Test 2a: No Authentication');
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
      const errorData = await noAuthResponse.json();
      console.log('✅ Authentication properly enforced');
      console.log('📋 Error Message:', errorData.message);
    } else {
      console.log('❌ Authentication NOT properly enforced');
      console.log('📋 Unexpected Status:', noAuthResponse.status);
    }
  } catch (error) {
    console.log('❌ No-auth request failed:', error.message);
  }

  // Test 2b: With mock token
  console.log('\n🔍 Test 2b: With Mock Kinde Token');
  const mockToken = generateMockKindeToken();
  console.log('🔑 Mock Token Preview:', mockToken.substring(0, 50) + '...');

  try {
    const mockAuthResponse = await fetch(`${API_BASE}/onboarding/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 Mock Token Response Status:', mockAuthResponse.status);

    if (mockAuthResponse.status === 401) {
      const errorData = await mockAuthResponse.json();
      console.log('✅ Mock token properly rejected (invalid token)');
      console.log('📋 Error Message:', errorData.message);
    } else if (mockAuthResponse.status === 200) {
      console.log('✅ Mock token accepted (may be valid or middleware bypassed)');
      const data = await mockAuthResponse.json();
      console.log('📋 Success Response:', data.success);
    } else {
      console.log('⚠️ Unexpected response with mock token');
      console.log('📋 Status:', mockAuthResponse.status);
      try {
        const errorData = await mockAuthResponse.json();
        console.log('📋 Error Data:', errorData);
      } catch (e) {
        console.log('📋 Could not parse error response');
      }
    }
  } catch (error) {
    console.log('❌ Mock token request failed:', error.message);
  }

  // Test 3: Test a public endpoint
  console.log('\n3️⃣ Testing Public Endpoint (Health Check)');

  try {
    const publicResponse = await fetch('http://localhost:3000/health');
    console.log('📡 Public Endpoint Response Status:', publicResponse.status);

    if (publicResponse.ok) {
      console.log('✅ Public endpoint accessible without authentication');
    } else {
      console.log('❌ Public endpoint not accessible');
    }
  } catch (error) {
    console.log('❌ Public endpoint test failed:', error.message);
  }

  // Test 4: Test auth endpoint
  console.log('\n4️⃣ Testing Auth Endpoint');

  try {
    const authResponse = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockToken}`
      }
    });

    console.log('📡 Auth Endpoint Response Status:', authResponse.status);

    if (authResponse.status === 401) {
      console.log('✅ Auth endpoint properly rejects invalid token');
    } else if (authResponse.ok) {
      const userData = await authResponse.json();
      console.log('✅ Auth endpoint accepts token');
      console.log('📋 User Data:', userData);
    } else {
      console.log('⚠️ Auth endpoint returns unexpected status');
    }
  } catch (error) {
    console.log('❌ Auth endpoint test failed:', error.message);
  }

  console.log('\n🎯 Authentication Middleware Test Summary:');
  console.log('🔍 Key Findings:');
  console.log('1. Public routes should work without authentication');
  console.log('2. Protected routes should return 401 without valid token');
  console.log('3. Invalid tokens should be rejected with 401');
  console.log('4. Valid tokens should allow access to protected routes');
  console.log('5. Check server logs for middleware execution details');
}

// Run the test
testAuthMiddleware().catch(console.error);
