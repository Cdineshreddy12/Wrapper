const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TENANT_ID = '893d8c75-68e6-4d42-92f8-45df62ef08b6';
const USER_ID = '50d4f694-202f-4f27-943d-7aafeffee29c';

async function testRoutes() {
  console.log('🧪 TESTING ROUTE FIXES\n');

  try {
    // Test 1: Organization locations route (should now work)
    console.log('📍 Test 1: Organization Locations Route');
    const response1 = await axios.get(`${BASE_URL}/api/organizations/${TENANT_ID}/locations`);
    console.log('✅ Organization locations route works:', response1.status);
  } catch (error) {
    console.log('❌ Organization locations route failed:', error.response?.status, error.response?.statusText);
  }

  try {
    // Test 2: Create sub-organization (should now work without validation)
    console.log('\n🏢 Test 2: Sub-Organization Creation');
    const response2 = await axios.post(`${BASE_URL}/api/organizations/sub`, {
      name: 'Test Division',
      parentOrganizationId: TENANT_ID,
      description: 'Test sub-organization'
    });
    console.log('✅ Sub-organization created:', response2.data?.organization?.organizationId);
  } catch (error) {
    console.log('❌ Sub-organization creation failed:', error.response?.status, error.response?.data?.message);
  }

  try {
    // Test 3: Create parent organization
    console.log('\n🏛️ Test 3: Parent Organization Creation');
    const response3 = await axios.post(`${BASE_URL}/api/organizations/parent`, {
      name: 'New Parent Corp',
      parentTenantId: TENANT_ID,
      description: 'Test parent organization'
    });
    console.log('✅ Parent organization created:', response3.data?.organization?.organizationId);
  } catch (error) {
    console.log('❌ Parent organization creation failed:', error.response?.status, error.response?.data?.message);
  }

  console.log('\n🎯 Route fixes testing completed!');
}

testRoutes().catch(console.error);
