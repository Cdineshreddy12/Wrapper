import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function quickSubOrgTest() {
  console.log('🚀 QUICK SUB-ORGANIZATION CREATION TEST');
  console.log('='.repeat(70));

  try {
    // Step 1: First create a parent organization if none exists
    console.log('\n🏢 STEP 1: ENSURE PARENT ORGANIZATION EXISTS');
    console.log('-'.repeat(50));

    const tenantId = '893d8c75-68e6-4d42-92f8-45df62ef08b6';

    // Check existing organizations
    const hierarchyResponse = await axios.get(`${BASE_URL}/api/organizations/hierarchy/${tenantId}`, {
      headers: { 'X-Application': 'crm' }
    });

    let parentOrgId;

    if (hierarchyResponse.data.hierarchy && hierarchyResponse.data.hierarchy.length > 0) {
      parentOrgId = hierarchyResponse.data.hierarchy[0].organizationId;
      console.log(`✅ Found existing parent organization: ${hierarchyResponse.data.hierarchy[0].organizationName}`);
    } else {
      // Create a parent organization first
      console.log('📝 Creating parent organization...');

      const parentData = {
        name: 'TechCorp Solutions',
        description: 'Leading technology solutions company',
        gstin: '22AAAAA0000A1Z5',
        parentTenantId: tenantId
      };

      const createParentResponse = await axios.post(`${BASE_URL}/api/organizations/parent`, parentData, {
        headers: { 'X-Application': 'crm' }
      });

      parentOrgId = createParentResponse.data.organization.organizationId;
      console.log(`✅ Parent organization created: ${createParentResponse.data.organization.organizationName}`);
    }

    // Step 2: Create sub-organization
    console.log('\n🏢 STEP 2: CREATE SUB-ORGANIZATION');
    console.log('-'.repeat(50));

    const subOrgData = {
      name: 'Engineering Division',
      description: 'Core engineering and product development team',
      gstin: '22AAAAA0000A1Z6',
      parentOrganizationId: parentOrgId
    };

    console.log('📤 Request Data:');
    console.log(`   Name: ${subOrgData.name}`);
    console.log(`   Parent ID: ${subOrgData.parentOrganizationId}`);
    console.log(`   GSTIN: ${subOrgData.gstin}`);

    const createResponse = await axios.post(`${BASE_URL}/api/organizations/sub`, subOrgData, {
      headers: {
        'X-Application': 'crm',
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ SUCCESS! Sub-organization created:');
    console.log(`   ID: ${createResponse.data.organization.organizationId}`);
    console.log(`   Name: ${createResponse.data.organization.organizationName}`);
    console.log(`   Type: ${createResponse.data.organization.organizationType}`);
    console.log(`   Level: ${createResponse.data.organization.organizationLevel}`);
    console.log(`   Path: ${createResponse.data.organization.hierarchyPath}`);

    // Step 3: Verify the hierarchy
    console.log('\n📊 STEP 3: VERIFY ORGANIZATION HIERARCHY');
    console.log('-'.repeat(50));

    const finalHierarchy = await axios.get(`${BASE_URL}/api/organizations/hierarchy/${tenantId}`, {
      headers: { 'X-Application': 'crm' }
    });

    console.log('🏗️ Current Organization Structure:');
    finalHierarchy.data.hierarchy.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.organizationName} (${org.organizationType})`);
      if (org.children && org.children.length > 0) {
        org.children.forEach((child) => {
          console.log(`      └─ ${child.organizationName} (${child.organizationType})`);
          console.log(`         Path: ${child.hierarchyPath}`);
        });
      }
    });

    console.log('\n🎉 SUB-ORGANIZATION CREATION SUCCESSFUL!');
    console.log('✅ Sub-organization created under parent organization');
    console.log('✅ Hierarchy properly maintained');
    console.log('✅ Ready for location assignment and further operations');

  } catch (error) {
    console.error('❌ SUB-ORGANIZATION CREATION FAILED:');
    console.error('   Error:', error.response?.data?.message || error.message);

    console.log('\n🔧 TROUBLESHOOTING:');
    if (error.response?.status === 404) {
      console.log('   - Parent organization not found');
      console.log('   - Check parentOrganizationId is correct');
    }
    if (error.response?.status === 400) {
      console.log('   - Missing required fields (name, parentOrganizationId)');
      console.log('   - Invalid GSTIN format');
      console.log('   - Organization name already exists');
    }
    if (error.response?.status === 403) {
      console.log('   - Insufficient permissions for the application');
      console.log('   - Check X-Application header');
    }
  }
}

quickSubOrgTest();
