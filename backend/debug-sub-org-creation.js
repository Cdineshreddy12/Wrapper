const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TENANT_ID = '893d8c75-68e6-4d42-92f8-45df62ef08b6';
const USER_ID = '50d4f694-202f-4f27-943d-7aafeffee29c';

async function debugSubOrgCreation() {
  console.log('🔍 DEBUGGING SUB-ORGANIZATION CREATION\n');

  try {
    // First, create a parent organization
    console.log('1. Creating parent organization...');
    const parentResponse = await axios.post(`${BASE_URL}/api/organizations/parent`, {
      name: 'Debug Parent Corp',
      parentTenantId: TENANT_ID,
      description: 'Debug parent for sub-org testing'
    });
    console.log('✅ Parent org created:', parentResponse.data.organization.organizationId);
    const parentOrgId = parentResponse.data.organization.organizationId;

    // Now try to create sub-organization
    console.log('\n2. Creating sub-organization...');
    const subOrgResponse = await axios.post(`${BASE_URL}/api/organizations/sub`, {
      name: 'Debug Sub Division',
      parentOrganizationId: parentOrgId,
      description: 'Debug sub-organization'
    });
    console.log('✅ Sub-org created:', subOrgResponse.data);

  } catch (error) {
    console.log('❌ Error details:');
    console.log('Status:', error.response?.status);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Message:', error.response?.data?.message);
    if (error.response?.data?.error) {
      console.log('Error field:', error.response.data.error);
    }
  }
}

debugSubOrgCreation().catch(console.error);
