const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TENANT_ID = '893d8c75-68e6-4d42-92f8-45df62ef08b6';

async function debugSubOrgRequest() {
  console.log('🔍 DEBUGGING SUB-ORGANIZATION REQUEST\n');

  try {
    // First create a parent organization
    console.log('1. Creating parent organization...');
    const parentResponse = await axios.post(`${BASE_URL}/api/organizations/parent`, {
      name: 'Debug Parent',
      parentTenantId: TENANT_ID,
      description: 'For debugging sub-org creation'
    });
    console.log('✅ Parent created:', parentResponse.data.organization.organizationId);
    const parentId = parentResponse.data.organization.organizationId;

    // Try to create sub-organization with valid GSTIN
    console.log('\n2. Creating sub-organization with valid GSTIN...');
    const subOrgResponse = await axios.post(`${BASE_URL}/api/organizations/sub`, {
      name: 'Engineering Division',
      parentOrganizationId: parentId,
      description: 'Test sub-organization',
      gstin: '37AAAAA0000A1Z0' // Valid GSTIN
    });
    console.log('✅ Sub-organization created successfully!');

  } catch (error) {
    console.log('❌ Error details:');
    console.log('Status:', error.response?.status);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));
    if (error.response?.data?.message) {
      console.log('Message:', error.response.data.message);
    }
  }
}

debugSubOrgRequest().catch(console.error);
