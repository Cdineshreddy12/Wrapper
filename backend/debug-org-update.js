import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const TENANT_ID = '893d8c75-68e6-4d42-92f8-45df62ef08b6';
const USER_ID = '50d4f694-202f-4f27-943d-7aafeffee29c';

async function debugOrgUpdate() {
  try {
    console.log('🔍 Debugging organization update 500 error...');

    // Use an existing organization ID from the test output
    const orgId = '2b4a4139-c99c-41cf-bf49-a1290209a943'; // From test scenario 3

    console.log('Testing update for organization:', orgId);

    // Try to update it with minimal data first
    console.log('\n1. Testing basic update...');
    const updateResult = await axios.put(`${BASE_URL}/api/organizations/${orgId}`, {
      organizationName: 'Updated ConsultPro LLC',
      description: 'Updated consulting firm'
    });

    console.log('✅ Update successful:', updateResult.data);

  } catch (error) {
    console.error('❌ Update failed with error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);

    if (error.response?.status === 500) {
      console.log('\n🔍 500 Error Details:');
      console.log('Response data:', JSON.stringify(error.response?.data, null, 2));
      console.log('Headers:', error.response?.headers);
    }

    // Try with just one field
    console.log('\n2. Testing update with single field...');
    try {
      const simpleUpdate = await axios.put(`${BASE_URL}/api/organizations/${orgId}`, {
        organizationName: 'Simple Update Test'
      });
      console.log('✅ Single field update successful');
    } catch (simpleError) {
      console.error('❌ Even single field update failed:', simpleError.response?.data);
    }
  }
}

debugOrgUpdate();
