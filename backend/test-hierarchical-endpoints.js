/**
 * Test Hierarchical Organization and Location Endpoints
 * Simple test script to verify all endpoints work correctly
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test data
const testData = {
  tenantId: '550e8400-e29b-41d4-a716-446655440000',
  userId: '550e8400-e29b-41d4-a716-446655440001',

  parentOrg: {
    name: 'Test Tech Solutions Inc.',
    description: 'Test company for hierarchical organizations',
    gstin: '37AAAAA0000A1Z0', // Valid GSTIN for testing
    parentTenantId: '550e8400-e29b-41d4-a716-446655440000'
  },

  subOrg: {
    name: 'Test Development Division',
    description: 'Test software development department',
    gstin: '37BBBBB0000B1Z0'
  },

  location: {
    name: 'Test Headquarters',
    address: '123 Test Street, Silicon Valley',
    city: 'San Francisco',
    state: 'California',
    zipCode: '94105',
    country: 'USA'
  }
};

// Store created IDs
const createdIds = {
  parentOrg: null,
  subOrg: null,
  location: null
};

// Helper function for API calls
async function apiCall(method, endpoint, data = null, useAuth = false) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (useAuth) {
    // For now, we'll skip auth since the org endpoints are public
    // In production, you'd add: options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  console.log(`\n🔄 ${method} ${url}`);
  if (data) {
    console.log(`📤 Data: ${JSON.stringify(data, null, 2)}`);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    console.log(`📊 Status: ${response.status}`);

    if (response.ok) {
      console.log('✅ Success:', result.message || 'Operation completed');
      return { success: true, data: result, status: response.status };
    } else {
      console.log('❌ Error:', result.message || 'Unknown error');
      return { success: false, error: result, status: response.status };
    }
  } catch (error) {
    console.log('🚨 Network error:', error.message);
    return { success: false, error: error.message, status: 0 };
  }
}

async function testOrganizationEndpoints() {
  console.log('\n' + '='.repeat(60));
  console.log('🏢 TESTING ORGANIZATION ENDPOINTS');
  console.log('='.repeat(60));

  try {
    // 1. Create parent organization
    console.log('\n1️⃣ Creating Parent Organization...');
    const createParentResult = await apiCall('POST', '/api/organizations/parent', testData.parentOrg);

    if (createParentResult.success) {
      createdIds.parentOrg = createParentResult.data.organization?.organizationId;
      testData.subOrg.parentOrganizationId = createdIds.parentOrg;
      testData.location.organizationId = createdIds.parentOrg;
      console.log('🏢 Parent Org ID:', createdIds.parentOrg);
    } else {
      console.log('❌ Failed to create parent organization');
      return;
    }

    // 2. Get organization details
    if (createdIds.parentOrg) {
      console.log('\n2️⃣ Getting Parent Organization Details...');
      await apiCall('GET', `/api/organizations/${createdIds.parentOrg}`);
    }

    // 3. Create sub-organization
    console.log('\n3️⃣ Creating Sub-Organization...');
    const createSubResult = await apiCall('POST', '/api/organizations/sub', testData.subOrg);

    if (createSubResult.success) {
      createdIds.subOrg = createSubResult.data.organization?.organizationId;
      console.log('📂 Sub-Org ID:', createdIds.subOrg);
    }

    // 4. Get sub-organizations
    if (createdIds.parentOrg) {
      console.log('\n4️⃣ Getting Sub-Organizations...');
      await apiCall('GET', `/api/organizations/${createdIds.parentOrg}/sub-organizations`);
    }

    // 5. Get organization hierarchy
    console.log('\n5️⃣ Getting Organization Hierarchy...');
    await apiCall('GET', `/api/organizations/hierarchy/${testData.tenantId}`);

    // 6. Update organization
    if (createdIds.parentOrg) {
      console.log('\n6️⃣ Updating Parent Organization...');
      await apiCall('PUT', `/api/organizations/${createdIds.parentOrg}`, {
        organizationName: 'Updated Test Tech Solutions Inc.',
        description: 'Updated test company description'
      });
    }

  } catch (error) {
    console.error('🚨 Organization endpoint test failed:', error);
  }
}

async function testLocationEndpoints() {
  console.log('\n' + '='.repeat(60));
  console.log('📍 TESTING LOCATION ENDPOINTS');
  console.log('='.repeat(60));

  try {
    // 7. Create location
    console.log('\n7️⃣ Creating Location...');
    const createLocationResult = await apiCall('POST', '/api/locations', testData.location);

    if (createLocationResult.success) {
      createdIds.location = createLocationResult.data.location?.locationId;
      console.log('📍 Location ID:', createdIds.location);
    } else {
      console.log('❌ Failed to create location');
      return;
    }

    // 8. Get location details
    if (createdIds.location) {
      console.log('\n8️⃣ Getting Location Details...');
      await apiCall('GET', `/api/locations/${createdIds.location}`);
    }

    // 9. Get organization locations
    if (createdIds.parentOrg) {
      console.log('\n9️⃣ Getting Organization Locations...');
      await apiCall('GET', `/api/organizations/${createdIds.parentOrg}/locations`);
    }

    // 10. Get tenant locations
    console.log('\n1️⃣0️⃣ Getting Tenant Locations...');
    await apiCall('GET', `/api/locations/tenant/${testData.tenantId}`);

    // 11. Update location
    if (createdIds.location) {
      console.log('\n1️⃣1️⃣ Updating Location...');
      await apiCall('PUT', `/api/locations/${createdIds.location}`, {
        locationName: 'Updated Test Headquarters',
        address: '456 Updated Test Street, Silicon Valley'
      });
    }

    // 12. Assign location to sub-organization (if exists)
    if (createdIds.location && createdIds.subOrg) {
      console.log('\n1️⃣2️⃣ Assigning Location to Sub-Organization...');
      await apiCall('POST', `/api/locations/${createdIds.location}/assign/${createdIds.subOrg}`);
    }

  } catch (error) {
    console.error('🚨 Location endpoint test failed:', error);
  }
}

async function cleanupTestData() {
  console.log('\n' + '='.repeat(60));
  console.log('🧹 CLEANING UP TEST DATA');
  console.log('='.repeat(60));

  try {
    // Soft delete created entities
    if (createdIds.subOrg) {
      console.log('\n🗑️ Deleting Sub-Organization...');
      await apiCall('DELETE', `/api/organizations/${createdIds.subOrg}`);
    }

    if (createdIds.location) {
      console.log('\n🗑️ Deleting Location...');
      await apiCall('DELETE', `/api/locations/${createdIds.location}`);
    }

    if (createdIds.parentOrg) {
      console.log('\n🗑️ Deleting Parent Organization...');
      await apiCall('DELETE', `/api/organizations/${createdIds.parentOrg}`);
    }

  } catch (error) {
    console.error('🚨 Cleanup failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 STARTING HIERARCHICAL ORGANIZATION ENDPOINT TESTS');
  console.log('📊 Base URL:', BASE_URL);
  console.log('⏰ Started at:', new Date().toISOString());

  try {
    // Test organization endpoints
    await testOrganizationEndpoints();

    // Test location endpoints
    await testLocationEndpoints();

    // Optional cleanup
    // await cleanupTestData();

  } catch (error) {
    console.error('🚨 Test execution failed:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 HIERARCHICAL ORGANIZATION ENDPOINT TESTS COMPLETED');
  console.log('⏰ Finished at:', new Date().toISOString());
  console.log('='.repeat(60));

  console.log('\n📊 Test Summary:');
  console.log(`🏢 Parent Organizations Created: ${createdIds.parentOrg ? 1 : 0}`);
  console.log(`📂 Sub-Organizations Created: ${createdIds.subOrg ? 1 : 0}`);
  console.log(`📍 Locations Created: ${createdIds.location ? 1 : 0}`);

  console.log('\n💡 Next Steps:');
  console.log('1. Check server logs for any errors');
  console.log('2. Verify database records were created');
  console.log('3. Test with authentication tokens for location endpoints');
  console.log('4. Run frontend integration tests');
}

// Export for use in other files
export { runAllTests, apiCall, createdIds };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

console.log('\n📝 Usage:');
console.log('node test-hierarchical-endpoints.js');
console.log('\nOr import in another file:');
console.log('import { runAllTests } from "./test-hierarchical-endpoints.js";');
console.log('await runAllTests();
