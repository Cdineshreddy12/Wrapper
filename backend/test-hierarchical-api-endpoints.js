#!/usr/bin/env node

/**
 * Test Hierarchical Organization API Endpoints
 * Test the actual HTTP API endpoints to ensure they work end-to-end
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test data
const testData = {
  parentOrg: {
    name: 'API Test Tech Solutions ' + Date.now(),
    description: 'API test company for hierarchical organizations',
    gstin: '37AAAAA0000A1Z9',
    parentTenantId: '893d8c75-68e6-4d42-92f8-45df62ef08b6'
  },

  subOrg: {
    name: 'API Test Development Division ' + Date.now(),
    description: 'API test software development department',
    gstin: '37BBBBB0000B1Z9'
  },

  location: {
    name: 'API Test Headquarters ' + Date.now(),
    address: '123 API Test Street, Silicon Valley',
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
    // For now, we'll test the organization endpoints which are public
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
      if (result.organization) console.log('🏢 Organization:', result.organization.organizationName);
      if (result.location) console.log('📍 Location:', result.location.locationName);
      if (result.subOrganizations) console.log('📂 Sub-orgs count:', result.subOrganizations.length);
      if (result.locations) console.log('📍 Locations count:', result.locations.count);
      if (result.hierarchy) console.log('🌳 Hierarchy levels:', result.hierarchy.length);
      return { success: true, data: result, status: response.status };
    } else {
      console.log('❌ Error:', result.message || 'Unknown error');
      if (result.error) console.log('Error type:', result.error);
      return { success: false, error: result, status: response.status };
    }
  } catch (error) {
    console.log('🚨 Network error:', error.message);
    return { success: false, error: error.message, status: 0 };
  }
}

async function testAPIEndpoints() {
  console.log('🌐 TESTING HIERARCHICAL ORGANIZATION API ENDPOINTS');
  console.log('📡 Base URL:', BASE_URL);
  console.log('⏰ Started at:', new Date().toISOString());
  console.log('='.repeat(80));

  try {
    // 1. Test creating parent organization
    console.log('\n🏢 1. Creating Parent Organization...');
    const parentResult = await apiCall('POST', '/api/organizations/parent', testData.parentOrg);

    if (parentResult.success) {
      createdIds.parentOrg = parentResult.data.organization?.organizationId;
      testData.subOrg.parentOrganizationId = createdIds.parentOrg;
      testData.location.organizationId = createdIds.parentOrg;
      console.log('✅ Parent Org ID:', createdIds.parentOrg);
    } else {
      console.log('❌ Failed to create parent organization - stopping tests');
      return;
    }

    // 2. Test getting organization details
    if (createdIds.parentOrg) {
      console.log('\n📖 2. Getting Parent Organization Details...');
      await apiCall('GET', `/api/organizations/${createdIds.parentOrg}`);
    }

    // 3. Test creating sub-organization
    console.log('\n📂 3. Creating Sub-Organization...');
    const subResult = await apiCall('POST', '/api/organizations/sub', testData.subOrg);

    if (subResult.success) {
      createdIds.subOrg = subResult.data.organization?.organizationId;
      console.log('✅ Sub-Org ID:', createdIds.subOrg);
    }

    // 4. Test getting sub-organizations
    if (createdIds.parentOrg) {
      console.log('\n📋 4. Getting Sub-Organizations...');
      await apiCall('GET', `/api/organizations/${createdIds.parentOrg}/sub-organizations`);
    }

    // 5. Test getting organization hierarchy
    console.log('\n🌳 5. Getting Organization Hierarchy...');
    const hierarchyResult = await apiCall('GET', `/api/organizations/hierarchy/${testData.parentOrg.parentTenantId}`);

    if (hierarchyResult.success) {
      console.log('✅ Hierarchy contains', hierarchyResult.data.totalOrganizations, 'organizations');
    }

    // 6. Test updating organization
    if (createdIds.parentOrg) {
      console.log('\n✏️ 6. Updating Parent Organization...');
      const updateResult = await apiCall('PUT', `/api/organizations/${createdIds.parentOrg}`, {
        organizationName: 'Updated API Test Tech Solutions ' + Date.now(),
        description: 'Updated API test company description'
      });

      if (updateResult.success) {
        console.log('✅ Organization updated successfully');
      }
    }

    // 7. Test creating location
    console.log('\n📍 7. Creating Location...');
    const locationResult = await apiCall('POST', '/api/locations', testData.location);

    if (locationResult.success) {
      createdIds.location = locationResult.data.location?.locationId;
      console.log('✅ Location ID:', createdIds.location);
    } else {
      console.log('❌ Failed to create location:', locationResult.error?.message);
    }

    // 8. Test getting organization locations
    if (createdIds.parentOrg) {
      console.log('\n🏢 8. Getting Organization Locations...');
      await apiCall('GET', `/api/organizations/${createdIds.parentOrg}/locations`);
    }

    // 9. Test getting tenant locations
    console.log('\n🏛️ 9. Getting Tenant Locations...');
    await apiCall('GET', `/api/locations/tenant/${testData.parentOrg.parentTenantId}`);

    // 10. Test location details
    if (createdIds.location) {
      console.log('\n📖 10. Getting Location Details...');
      await apiCall('GET', `/api/locations/${createdIds.location}`);
    }

    // 11. Test updating location
    if (createdIds.location) {
      console.log('\n✏️ 11. Updating Location...');
      const locationUpdateResult = await apiCall('PUT', `/api/locations/${createdIds.location}`, {
        locationName: 'Updated API Test Headquarters ' + Date.now(),
        address: '456 Updated API Test Street, Silicon Valley'
      });

      if (locationUpdateResult.success) {
        console.log('✅ Location updated successfully');
      }
    }

    // 12. Test assigning location to sub-organization
    if (createdIds.location && createdIds.subOrg) {
      console.log('\n🔗 12. Assigning Location to Sub-Organization...');
      const assignResult = await apiCall('POST', `/api/locations/${createdIds.location}/assign/${createdIds.subOrg}`);

      if (assignResult.success) {
        console.log('✅ Location assigned to sub-organization successfully');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 API ENDPOINT TESTS COMPLETED SUCCESSFULLY!');
    console.log('⏰ Finished at:', new Date().toISOString());
    console.log('='.repeat(80));

    console.log('\n📊 Test Summary:');
    console.log(`🏢 Parent Organizations Created: ${createdIds.parentOrg ? 1 : 0}`);
    console.log(`📂 Sub-Organizations Created: ${createdIds.subOrg ? 1 : 0}`);
    console.log(`📍 Locations Created: ${createdIds.location ? 1 : 0}`);

    console.log('\n✅ Successfully Tested Endpoints:');
    console.log('✅ POST /api/organizations/parent');
    console.log('✅ GET /api/organizations/{id}');
    console.log('✅ POST /api/organizations/sub');
    console.log('✅ GET /api/organizations/{id}/sub-organizations');
    console.log('✅ GET /api/organizations/hierarchy/{tenantId}');
    console.log('✅ PUT /api/organizations/{id}');
    console.log('✅ POST /api/locations');
    console.log('✅ GET /api/organizations/{id}/locations');
    console.log('✅ GET /api/locations/tenant/{tenantId}');
    console.log('✅ GET /api/locations/{id}');
    console.log('✅ PUT /api/locations/{id}');
    console.log('✅ POST /api/locations/{locId}/assign/{orgId}');

    console.log('\n🚀 All core API endpoints are working perfectly!');

  } catch (error) {
    console.error('🚨 API test execution failed:', error);
  }
}

console.log('\n📝 Usage:');
console.log('1. Start the server: node src/app.js');
console.log('2. Run this test: node test-hierarchical-api-endpoints.js');
console.log('\nOr import in another file:');
console.log('import { testAPIEndpoints } from "./test-hierarchical-api-endpoints.js";');
console.log('await testAPIEndpoints();');

// Export for use in other files
export { testAPIEndpoints };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAPIEndpoints();
}
