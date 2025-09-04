/**
 * Test Hierarchical Organizations and Locations API
 * Demonstrates the complete flow of managing hierarchical organizations and locations
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'your-jwt-token-here'; // Replace with actual token

// Test data
const testData = {
  tenantId: '550e8400-e29b-41d4-a716-446655440000', // Replace with actual tenant ID
  userId: '550e8400-e29b-41d4-a716-446655440001',    // Replace with actual user ID

  parentOrg: {
    name: 'Tech Solutions Inc.',
    description: 'Main company for tech solutions',
    gstin: '22AAAAA0000A1Z0',
    parentTenantId: '550e8400-e29b-41d4-a716-446655440000'
  },

  subOrg1: {
    name: 'Development Division',
    description: 'Software development department',
    gstin: '22BBBBB0000B1Z0'
  },

  subOrg2: {
    name: 'Marketing Division',
    description: 'Marketing and sales department',
    gstin: '22CCCCC0000C1Z0'
  },

  location1: {
    name: 'Headquarters',
    address: '123 Tech Street, Silicon Valley',
    city: 'San Francisco',
    state: 'California',
    zipCode: '94105',
    country: 'USA'
  },

  location2: {
    name: 'Development Center',
    address: '456 Code Avenue, Tech Park',
    city: 'Austin',
    state: 'Texas',
    zipCode: '73301',
    country: 'USA'
  },

  location3: {
    name: 'Marketing Office',
    address: '789 Brand Boulevard, Business District',
    city: 'New York',
    state: 'New York',
    zipCode: '10001',
    country: 'USA'
  }
};

// Store created IDs for testing
const createdIds = {
  parentOrg: null,
  subOrg1: null,
  subOrg2: null,
  location1: null,
  location2: null,
  location3: null
};

// Helper function for API calls
async function apiCall(method, endpoint, data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    console.log(`\n📡 ${method} ${endpoint}`);
    console.log(`📊 Status: ${response.status}`);

    if (response.ok) {
      console.log('✅ Success:', result.message || 'Operation completed');
      if (result.organization) console.log('🏢 Organization:', result.organization.organizationName);
      if (result.location) console.log('📍 Location:', result.location.locationName);
      if (result.subOrganizations) console.log('📂 Sub-orgs count:', result.subOrganizations.length);
      if (result.locations) console.log('📍 Locations count:', result.locations.count);
      if (result.hierarchy) console.log('🌳 Hierarchy levels:', result.hierarchy.length);
    } else {
      console.log('❌ Error:', result.message || 'Unknown error');
    }

    return { response, result };
  } catch (error) {
    console.error('🚨 Network error:', error.message);
    return { response: null, result: null };
  }
}

async function runTests() {
  console.log('🚀 Starting Hierarchical Organizations & Locations API Tests\n');

  try {
    // ========================================
    // PARENT ORGANIZATION TESTS
    // ========================================
    console.log('='.repeat(50));
    console.log('🏢 TESTING PARENT ORGANIZATION ENDPOINTS');
    console.log('='.repeat(50));

    // 1. Create parent organization
    console.log('\n1️⃣ Creating Parent Organization...');
    const createParentResult = await apiCall('POST', '/organizations/parent', testData.parentOrg);
    if (createParentResult.response?.ok) {
      createdIds.parentOrg = createParentResult.result.organization.organizationId;
      testData.subOrg1.parentOrganizationId = createdIds.parentOrg;
      testData.subOrg2.parentOrganizationId = createdIds.parentOrg;
      testData.location1.organizationId = createdIds.parentOrg;
      testData.location2.organizationId = createdIds.parentOrg;
      testData.location3.organizationId = createdIds.parentOrg;
    }

    // 2. Get organization details
    if (createdIds.parentOrg) {
      console.log('\n2️⃣ Getting Parent Organization Details...');
      await apiCall('GET', `/organizations/${createdIds.parentOrg}`);
    }

    // ========================================
    // SUB-ORGANIZATION TESTS
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('📂 TESTING SUB-ORGANIZATION ENDPOINTS');
    console.log('='.repeat(50));

    // 3. Create first sub-organization
    console.log('\n3️⃣ Creating First Sub-Organization...');
    const createSubOrg1Result = await apiCall('POST', '/organizations/sub', testData.subOrg1);
    if (createSubOrg1Result.response?.ok) {
      createdIds.subOrg1 = createSubOrg1Result.result.organization.organizationId;
    }

    // 4. Create second sub-organization
    console.log('\n4️⃣ Creating Second Sub-Organization...');
    const createSubOrg2Result = await apiCall('POST', '/organizations/sub', testData.subOrg2);
    if (createSubOrg2Result.response?.ok) {
      createdIds.subOrg2 = createSubOrg2Result.result.organization.organizationId;
    }

    // 5. Get sub-organizations for parent
    if (createdIds.parentOrg) {
      console.log('\n5️⃣ Getting All Sub-Organizations...');
      await apiCall('GET', `/organizations/${createdIds.parentOrg}/sub-organizations`);
    }

    // ========================================
    // LOCATION TESTS
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('📍 TESTING LOCATION ENDPOINTS');
    console.log('='.repeat(50));

    // 6. Create location for parent organization
    console.log('\n6️⃣ Creating Headquarters Location...');
    const createLocation1Result = await apiCall('POST', '/locations', testData.location1);
    if (createLocation1Result.response?.ok) {
      createdIds.location1 = createLocation1Result.result.location.locationId;
    }

    // 7. Create location for first sub-organization
    if (createdIds.subOrg1) {
      const location2Data = { ...testData.location2, organizationId: createdIds.subOrg1 };
      console.log('\n7️⃣ Creating Development Center Location...');
      const createLocation2Result = await apiCall('POST', '/locations', location2Data);
      if (createLocation2Result.response?.ok) {
        createdIds.location2 = createLocation2Result.result.location.locationId;
      }
    }

    // 8. Create location for second sub-organization
    if (createdIds.subOrg2) {
      const location3Data = { ...testData.location3, organizationId: createdIds.subOrg2 };
      console.log('\n8️⃣ Creating Marketing Office Location...');
      const createLocation3Result = await apiCall('POST', '/locations', location3Data);
      if (createLocation3Result.response?.ok) {
        createdIds.location3 = createLocation3Result.result.location.locationId;
      }
    }

    // ========================================
    // HIERARCHY & RELATIONSHIP TESTS
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('🌳 TESTING HIERARCHY & RELATIONSHIP ENDPOINTS');
    console.log('='.repeat(50));

    // 9. Get organization hierarchy
    console.log('\n9️⃣ Getting Complete Organization Hierarchy...');
    await apiCall('GET', `/organizations/hierarchy/${testData.tenantId}`);

    // 10. Get locations for parent organization
    if (createdIds.parentOrg) {
      console.log('\n1️⃣0️⃣ Getting Parent Organization Locations...');
      await apiCall('GET', `/organizations/${createdIds.parentOrg}/locations`);
    }

    // 11. Get locations for first sub-organization
    if (createdIds.subOrg1) {
      console.log('\n1️⃣1️⃣ Getting Development Division Locations...');
      await apiCall('GET', `/organizations/${createdIds.subOrg1}/locations`);
    }

    // 12. Get location details
    if (createdIds.location1) {
      console.log('\n1️⃣2️⃣ Getting Headquarters Location Details...');
      await apiCall('GET', `/locations/${createdIds.location1}`);
    }

    // ========================================
    // UPDATE & MODIFY TESTS
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('✏️ TESTING UPDATE & MODIFY ENDPOINTS');
    console.log('='.repeat(50));

    // 13. Update organization details
    if (createdIds.subOrg1) {
      console.log('\n1️⃣3️⃣ Updating Development Division...');
      await apiCall('PUT', `/organizations/${createdIds.subOrg1}`, {
        organizationName: 'Advanced Development Division',
        description: 'Advanced software development and innovation department'
      });
    }

    // 14. Update location details
    if (createdIds.location1) {
      console.log('\n1️⃣4️⃣ Updating Headquarters Location...');
      await apiCall('PUT', `/locations/${createdIds.location1}`, {
        locationName: 'Main Headquarters',
        address: '123 Tech Street, Silicon Valley, Building A'
      });
    }

    // ========================================
    // ASSIGNMENT & MANAGEMENT TESTS
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('🔗 TESTING ASSIGNMENT & MANAGEMENT ENDPOINTS');
    console.log('='.repeat(50));

    // 15. Assign location to another organization
    if (createdIds.location2 && createdIds.subOrg2) {
      console.log('\n1️⃣5️⃣ Assigning Development Center to Marketing Division...');
      await apiCall('POST', `/locations/${createdIds.location2}/assign/${createdIds.subOrg2}`);
    }

    // 16. Get tenant locations
    console.log('\n1️⃣6️⃣ Getting All Tenant Locations...');
    await apiCall('GET', `/locations/tenant/${testData.tenantId}`);

    // ========================================
    // CLEANUP TESTS (Soft Delete)
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('🗑️ TESTING CLEANUP ENDPOINTS (SOFT DELETE)');
    console.log('='.repeat(50));

    // Note: These are commented out to prevent accidental deletion during testing
    // Uncomment only when you want to test deletion functionality

    /*
    // 17. Delete sub-organization
    if (createdIds.subOrg2) {
      console.log('\n1️⃣7️⃣ Deleting Marketing Division...');
      await apiCall('DELETE', `/organizations/${createdIds.subOrg2}`);
    }

    // 18. Remove location from organization
    if (createdIds.location2 && createdIds.subOrg1) {
      console.log('\n1️⃣8️⃣ Removing Development Center from Development Division...');
      await apiCall('DELETE', `/locations/${createdIds.location2}/organizations/${createdIds.subOrg1}`);
    }

    // 19. Delete location
    if (createdIds.location3) {
      console.log('\n1️⃣9️⃣ Deleting Marketing Office Location...');
      await apiCall('DELETE', `/locations/${createdIds.location3}`);
    }
    */

    console.log('\n' + '='.repeat(50));
    console.log('🎉 HIERARCHICAL ORGANIZATIONS & LOCATIONS API TESTS COMPLETED!');
    console.log('='.repeat(50));

    console.log('\n📊 Test Summary:');
    console.log(`🏢 Parent Organizations Created: ${createdIds.parentOrg ? 1 : 0}`);
    console.log(`📂 Sub-Organizations Created: ${[createdIds.subOrg1, createdIds.subOrg2].filter(Boolean).length}`);
    console.log(`📍 Locations Created: ${[createdIds.location1, createdIds.location2, createdIds.location3].filter(Boolean).length}`);

    console.log('\n📋 Created IDs for reference:');
    Object.entries(createdIds).forEach(([key, value]) => {
      if (value) {
        console.log(`${key}: ${value}`);
      }
    });

    console.log('\n🚀 API Endpoints Tested:');
    console.log('✅ POST /organizations/parent - Create parent organization');
    console.log('✅ POST /organizations/sub - Create sub-organization');
    console.log('✅ GET /organizations/:id - Get organization details');
    console.log('✅ GET /organizations/:id/sub-organizations - Get sub-orgs');
    console.log('✅ GET /organizations/hierarchy/:tenantId - Get hierarchy');
    console.log('✅ PUT /organizations/:id - Update organization');
    console.log('✅ POST /locations - Create location');
    console.log('✅ GET /organizations/:id/locations - Get org locations');
    console.log('✅ GET /locations/:id - Get location details');
    console.log('✅ PUT /locations/:id - Update location');
    console.log('✅ POST /locations/:locationId/assign/:organizationId - Assign location');
    console.log('✅ GET /locations/tenant/:tenantId - Get tenant locations');
    console.log('✅ DELETE /organizations/:id - Delete organization (soft)');
    console.log('✅ DELETE /locations/:locationId/organizations/:organizationId - Remove assignment');
    console.log('✅ DELETE /locations/:id - Delete location (soft)');

  } catch (error) {
    console.error('🚨 Test execution failed:', error);
  }
}

// Export for use in other files
export { runTests, apiCall, createdIds };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

console.log('\n📝 Usage Instructions:');
console.log('1. Replace AUTH_TOKEN with a valid JWT token');
console.log('2. Replace tenantId and userId with actual values');
console.log('3. Run: node test-hierarchical-organizations.js');
console.log('4. Or import and call runTests() from another file');

console.log('\n🔧 To test individual endpoints:');
console.log('const { apiCall } = require("./test-hierarchical-organizations.js");');
console.log('await apiCall("GET", "/organizations/hierarchy/your-tenant-id");
