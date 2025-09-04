const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TENANT_ID = '893d8c75-68e6-4d42-92f8-45df62ef08b6';

async function testFixes() {
  console.log('🧪 TESTING FIXES\n');

  try {
    // Step 1: Create a parent organization
    console.log('1. Creating parent organization...');
    const parentResponse = await axios.post(`${BASE_URL}/api/organizations/parent`, {
      name: 'Test Parent Corp',
      parentTenantId: TENANT_ID,
      description: 'Parent for testing fixes'
    });
    console.log('✅ Parent created:', parentResponse.data.organization.organizationId);
    const parentId = parentResponse.data.organization.organizationId;

    // Step 2: Test sub-organization creation (should work now)
    console.log('\n2. Testing sub-organization creation...');
    const subResponse = await axios.post(`${BASE_URL}/api/organizations/sub`, {
      name: 'Engineering Division',
      parentOrganizationId: parentId,
      description: 'Test sub-organization',
      gstin: '37AAAAA0000A1Z0' // Valid GSTIN format
    });
    console.log('✅ Sub-organization created:', subResponse.data.organization.organizationId);
    const subId = subResponse.data.organization.organizationId;

    // Step 3: Test organization locations (should work now)
    console.log('\n3. Testing organization locations...');
    const locationsResponse = await axios.get(`${BASE_URL}/api/organizations/${parentId}/locations`);
    console.log('✅ Organization locations retrieved:', locationsResponse.data.count, 'locations');

    // Step 4: Create a location for the organization
    console.log('\n4. Creating location...');
    const locationResponse = await axios.post(`${BASE_URL}/api/locations`, {
      name: 'Headquarters',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      organizationId: parentId
    });
    console.log('✅ Location created:', locationResponse.data.location.locationId);

    // Step 5: Test organization locations again (should show the new location)
    console.log('\n5. Testing organization locations after creation...');
    const updatedLocationsResponse = await axios.get(`${BASE_URL}/api/organizations/${parentId}/locations`);
    console.log('✅ Updated locations:', updatedLocationsResponse.data.count, 'locations');

    // Step 6: Test tenant locations
    console.log('\n6. Testing tenant locations...');
    const tenantLocationsResponse = await axios.get(`${BASE_URL}/api/locations/tenant/${TENANT_ID}`);
    console.log('✅ Tenant locations retrieved:', tenantLocationsResponse.data.count, 'locations');

    // Step 7: Test organization details
    console.log('\n7. Testing organization details...');
    const detailsResponse = await axios.get(`${BASE_URL}/api/organizations/${parentId}`);
    console.log('✅ Organization details retrieved:', detailsResponse.data.organization.organizationName);

    console.log('\n🎉 ALL FIXES WORKING!');

  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFixes().catch(console.error);
