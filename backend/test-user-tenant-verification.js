#!/usr/bin/env node

/**
 * Test User Tenant Verification Endpoint
 * Tests the /api/user/tenant/{email} endpoint for CRM integration
 */

async function testUserTenantVerification() {
  console.log('🧪 Testing User Tenant Verification Endpoint\n');

  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const testCases = [
    {
      name: 'User with active tenant',
      email: 'john.doe@acme.com',
      expected: 'success with tenant data'
    },
    {
      name: 'User without tenant',
      email: 'freelancer@independent.com',
      expected: 'success with null data'
    },
    {
      name: 'Non-existent user',
      email: 'nonexistent@user.com',
      expected: '404 User not found'
    },
    {
      name: 'Invalid email format',
      email: 'invalid-email',
      expected: '400 Bad Request'
    },
    {
      name: 'Missing request source header',
      email: 'test@user.com',
      skipSourceHeader: true,
      expected: '401 Unauthorized'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`📧 Email: ${testCase.email}`);
    console.log(`🎯 Expected: ${testCase.expected}`);

    try {
      // URL encode the email
      const encodedEmail = encodeURIComponent(testCase.email);
      const url = `${baseUrl}/api/user/tenant/${encodedEmail}`;

      const headers = {
        'Content-Type': 'application/json'
      };

      // Add request source header unless explicitly skipped
      if (!testCase.skipSourceHeader) {
        headers['X-Request-Source'] = 'crm-backend';
      }

      console.log(`🌐 URL: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      console.log(`📊 Status: ${response.status}`);

      const data = await response.json();
      console.log(`📄 Response:`, JSON.stringify(data, null, 2));

      // Validate response structure
      if (data.success !== undefined) {
        console.log(`✅ Valid response structure`);
      } else {
        console.log(`❌ Invalid response structure`);
      }

    } catch (error) {
      console.error(`❌ Request failed:`, error.message);
    }

    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 User tenant verification testing completed!');
  console.log('\n💡 API Endpoint: GET /api/user/tenant/{email}');
  console.log('🔒 Requires: X-Request-Source: crm-backend header');
  console.log('📧 Email parameter must be URL-encoded');
}

// Run the test
testUserTenantVerification().catch(console.error);
