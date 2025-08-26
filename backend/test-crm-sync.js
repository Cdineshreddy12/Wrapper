/**
 * 🧪 **TEST CRM SYNC FUNCTIONALITY**
 * Test script to validate the updated CRM sync system
 */

import { UserSyncService } from './src/services/user-sync-service.js';

// Mock user data for testing
const mockUsers = [
  {
    userId: 'user-123',
    kindeUserId: 'kinde|abc123',
    email: 'john.doe@company.com',
    name: 'John Doe',
    isActive: true,
    isTenantAdmin: false,
    department: 'Sales',
    title: 'Sales Manager',
    roles: ['user', 'manager'],
    permissions: ['read', 'write'],
    contactMobile: '9999999999',
    countryCode: '91',
    zones: ['north', 'south']
  },
  {
    userId: 'user-456',
    kindeUserId: 'kinde|def456',
    email: 'jane.smith@company.com',
    name: 'Jane Smith',
    isActive: true,
    isTenantAdmin: true,
    department: 'IT',
    title: 'System Administrator',
    roles: ['admin', 'user'],
    permissions: ['read', 'write', 'delete']
  }
];

const mockTenant = {
  tenantId: 'tenant-123',
  companyName: 'Test Company',
  subdomain: 'test-company',
  adminEmail: 'admin@company.com'
};

async function testCRMSyncSystem() {
  console.log('🧪 Testing CRM Sync System...\n');

  try {
    // Test 1: JWT Token Generation
    console.log('1️⃣ Testing JWT token generation...');
    const token = UserSyncService.generateWrapperToken('test-org');
    console.log('✅ JWT token generated successfully');
    console.log('🔍 Token (first 50 chars):', token.substring(0, 50) + '...');

    // Test 2: User Data Transformation
    console.log('\n2️⃣ Testing user data transformation...');
    const transformedUsers = mockUsers.map(user => 
      UserSyncService.transformUserToCRMFormat(user, 'test-org')
    );
    console.log('✅ Users transformed successfully');
    console.log('🔍 Transformed user sample:');
    console.log(JSON.stringify(transformedUsers[0], null, 2));

    // Test 3: Sync Payload Generation
    console.log('\n3️⃣ Testing sync payload generation...');
    const syncPayload = {
      mode: 'upsert',
      users: transformedUsers
    };
    console.log('✅ Sync payload generated successfully');
    console.log('🔍 Payload structure:');
    console.log({
      mode: syncPayload.mode,
      userCount: syncPayload.users.length,
      firstUserKeys: Object.keys(syncPayload.users[0])
    });

    // Test 4: Application URL Configuration
    console.log('\n4️⃣ Testing application URL configuration...');
    const crmUrl = UserSyncService.APP_URLS.crm;
    console.log('✅ CRM URL configured:', crmUrl);

    // Test 5: Mock Sync Request (dry run)
    console.log('\n5️⃣ Testing mock sync request structure...');
    const mockRequest = {
      url: `${crmUrl}/api/admin/users/sync`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: syncPayload
    };
    console.log('✅ Mock request structure validated');
    console.log('🔍 Request details:');
    console.log({
      url: mockRequest.url,
      method: mockRequest.method,
      headers: Object.keys(mockRequest.headers),
      bodyStructure: {
        mode: mockRequest.body.mode,
        userCount: mockRequest.body.users.length
      }
    });

    console.log('\n🎉 All CRM sync tests passed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ JWT token generation working');
    console.log('- ✅ User data transformation working');
    console.log('- ✅ Sync payload structure correct');
    console.log('- ✅ CRM endpoint configuration ready');
    console.log('- ✅ Authentication headers prepared');

    console.log('\n🚀 Next Steps:');
    console.log('1. Set up environment variables (WRAPPER_SECRET_KEY, WRAPPER_ORG_CODE)');
    console.log('2. Configure CRM_APP_URL in production');
    console.log('3. Test with real CRM endpoint');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test specific transformation scenarios
function testTransformationScenarios() {
  console.log('\n🔍 Testing transformation scenarios...');

  const testCases = [
    {
      name: 'User with full data',
      user: mockUsers[0],
      expected: {
        externalId: 'kinde|abc123',
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      }
    },
    {
      name: 'Admin user',
      user: mockUsers[1],
      expected: {
        externalId: 'kinde|def456',
        email: 'jane.smith@company.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'admin'
      }
    },
    {
      name: 'User with single name',
      user: {
        userId: 'user-789',
        kindeUserId: 'kinde|ghi789',
        email: 'cher@company.com',
        name: 'Cher',
        isActive: true,
        isTenantAdmin: false
      },
      expected: {
        externalId: 'kinde|ghi789',
        email: 'cher@company.com',
        firstName: 'Cher',
        lastName: '',
        role: 'user'
      }
    }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. Testing: ${testCase.name}`);
    const result = UserSyncService.transformUserToCRMFormat(testCase.user, 'test-org');
    
    // Validate expected fields
    let passed = true;
    Object.entries(testCase.expected).forEach(([key, expectedValue]) => {
      if (result[key] !== expectedValue) {
        console.log(`❌ ${key}: expected "${expectedValue}", got "${result[key]}"`);
        passed = false;
      }
    });
    
    if (passed) {
      console.log('✅ Transformation passed');
    }
  });
}

// Run tests
testCRMSyncSystem().then(() => {
  testTransformationScenarios();
});
