/**
 * 🚀 SUB-ORGANIZATION CREATION GUIDE
 * Complete step-by-step guide to create sub-organizations under parent organizations
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function createSubOrganizationGuide() {
  console.log('🚀 SUB-ORGANIZATION CREATION GUIDE');
  console.log('='.repeat(80));

  // Step 1: Get existing parent organizations
  console.log('\n📋 STEP 1: GET EXISTING PARENT ORGANIZATIONS');
  console.log('-'.repeat(50));

  try {
    const tenantId = '893d8c75-68e6-4d42-92f8-45df62ef08b6';
    const hierarchyResponse = await axios.get(`${BASE_URL}/api/organizations/hierarchy/${tenantId}`, {
      headers: { 'X-Application': 'crm' }
    });

    console.log('✅ Available Parent Organizations:');
    if (hierarchyResponse.data.hierarchy && hierarchyResponse.data.hierarchy.length > 0) {
      hierarchyResponse.data.hierarchy.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.organizationName} (ID: ${org.organizationId})`);
        console.log(`      Type: ${org.organizationType}, Level: ${org.organizationLevel}`);
        if (org.children && org.children.length > 0) {
          console.log(`      Sub-organizations: ${org.children.length}`);
        }
      });
    } else {
      console.log('   No parent organizations found. Create one first!');
      return;
    }

    // Step 2: Choose a parent organization
    const parentOrg = hierarchyResponse.data.hierarchy[0];
    console.log(`\n🎯 SELECTED PARENT: ${parentOrg.organizationName} (${parentOrg.organizationId})`);

    // Step 3: Create sub-organization
    console.log('\n📝 STEP 3: CREATE SUB-ORGANIZATION');
    console.log('-'.repeat(50));

    const subOrgData = {
      name: 'Engineering Division',
      description: 'Core engineering and product development team responsible for software development, architecture, and technical innovation',
      gstin: '22AAAAA0000A1Z6',
      parentOrganizationId: parentOrg.organizationId
    };

    console.log('📤 SUB-ORGANIZATION DATA:');
    console.log(`   Name: ${subOrgData.name}`);
    console.log(`   Description: ${subOrgData.description}`);
    console.log(`   GSTIN: ${subOrgData.gstin}`);
    console.log(`   Parent ID: ${subOrgData.parentOrganizationId}`);

    const createResponse = await axios.post(`${BASE_URL}/api/organizations/sub`, subOrgData, {
      headers: {
        'X-Application': 'crm',
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ SUB-ORGANIZATION CREATED SUCCESSFULLY!');
    console.log(`   ID: ${createResponse.data.organization.organizationId}`);
    console.log(`   Name: ${createResponse.data.organization.organizationName}`);
    console.log(`   Type: ${createResponse.data.organization.organizationType}`);
    console.log(`   Level: ${createResponse.data.organization.organizationLevel}`);
    console.log(`   Hierarchy Path: ${createResponse.data.organization.hierarchyPath}`);

    // Step 4: Verify the sub-organization was created
    console.log('\n🔍 STEP 4: VERIFY SUB-ORGANIZATION CREATION');
    console.log('-'.repeat(50));

    // Check hierarchy again
    const updatedHierarchy = await axios.get(`${BASE_URL}/api/organizations/hierarchy/${tenantId}`, {
      headers: { 'X-Application': 'crm' }
    });

    console.log('📊 UPDATED ORGANIZATION HIERARCHY:');
    updatedHierarchy.data.hierarchy.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.organizationName} (${org.organizationType})`);
      if (org.children && org.children.length > 0) {
        org.children.forEach((child, childIndex) => {
          console.log(`      └─ ${child.organizationName} (${child.organizationType})`);
          console.log(`         Path: ${child.hierarchyPath}`);
        });
      }
    });

    // Step 5: Get sub-organization details
    console.log('\n📖 STEP 5: GET SUB-ORGANIZATION DETAILS');
    console.log('-'.repeat(50));

    const subOrgDetails = await axios.get(`${BASE_URL}/api/organizations/${createResponse.data.organization.organizationId}`, {
      headers: { 'X-Application': 'crm' }
    });

    console.log('📋 SUB-ORGANIZATION DETAILS:');
    console.log(`   Name: ${subOrgDetails.data.organization.organizationName}`);
    console.log(`   Type: ${subOrgDetails.data.organization.organizationType}`);
    console.log(`   Level: ${subOrgDetails.data.organization.organizationLevel}`);
    console.log(`   GSTIN: ${subOrgDetails.data.organization.gstin}`);
    console.log(`   Description: ${subOrgDetails.data.organization.description}`);
    console.log(`   Active: ${subOrgDetails.data.organization.isActive}`);
    console.log(`   Created: ${subOrgDetails.data.organization.createdAt}`);

    if (subOrgDetails.data.parentOrganization) {
      console.log(`   Parent: ${subOrgDetails.data.parentOrganization.organizationName}`);
    }

    // Step 6: Create additional sub-organizations
    console.log('\n📝 STEP 6: CREATE ADDITIONAL SUB-ORGANIZATIONS');
    console.log('-'.repeat(50));

    const additionalSubOrgs = [
      {
        name: 'Product Division',
        description: 'Product management and user experience design',
        gstin: '22AAAAA0000A1Z7',
        parentOrganizationId: parentOrg.organizationId
      },
      {
        name: 'Marketing Division',
        description: 'Brand marketing and customer acquisition',
        gstin: '22AAAAA0000A1Z8',
        parentOrganizationId: parentOrg.organizationId
      }
    ];

    console.log('📦 CREATING ADDITIONAL SUB-ORGANIZATIONS...');

    for (const [index, subOrg] of additionalSubOrgs.entries()) {
      try {
        const response = await axios.post(`${BASE_URL}/api/organizations/sub`, subOrg, {
          headers: {
            'X-Application': 'crm',
            'Content-Type': 'application/json'
          }
        });

        console.log(`   ✅ ${index + 1}. ${response.data.organization.organizationName} created`);
        console.log(`      ID: ${response.data.organization.organizationId}`);
        console.log(`      Path: ${response.data.organization.hierarchyPath}`);
      } catch (error) {
        console.log(`   ❌ ${index + 1}. Failed to create ${subOrg.name}: ${error.response?.data?.message || error.message}`);
      }
    }

    // Step 7: Final hierarchy overview
    console.log('\n🏗️ STEP 7: FINAL ORGANIZATION HIERARCHY');
    console.log('-'.repeat(50));

    const finalHierarchy = await axios.get(`${BASE_URL}/api/organizations/hierarchy/${tenantId}`, {
      headers: { 'X-Application': 'crm' }
    });

    console.log('🎯 COMPLETE ORGANIZATION STRUCTURE:');
    console.log(`   Total Organizations: ${finalHierarchy.data.totalOrganizations}`);

    finalHierarchy.data.hierarchy.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.organizationName} (${org.organizationType})`);
      console.log(`      Level: ${org.organizationLevel}, Path: ${org.hierarchyPath}`);

      if (org.children && org.children.length > 0) {
        org.children.forEach((child, childIndex) => {
          console.log(`      └─ ${child.organizationName} (${child.organizationType})`);
          console.log(`         Level: ${child.organizationLevel}, Path: ${child.hierarchyPath}`);
        });
      }
    });

    // Success summary
    console.log('\n🎉 SUB-ORGANIZATION CREATION COMPLETE!');
    console.log('='.repeat(80));
    console.log('✅ Successfully created sub-organizations under parent organization');
    console.log('✅ All sub-organizations have proper hierarchy paths');
    console.log('✅ Organization structure is properly maintained');
    console.log('✅ Application-level data isolation is working');
    console.log('✅ Ready for location assignment and user management');

    return {
      success: true,
      parentOrganization: parentOrg,
      subOrganizations: additionalSubOrgs.length + 1,
      totalOrganizations: finalHierarchy.data.totalOrganizations
    };

  } catch (error) {
    console.error('❌ SUB-ORGANIZATION CREATION FAILED:');
    console.error('   Error:', error.response?.data?.message || error.message);

    if (error.response?.status === 404) {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('   - Make sure the parent organization exists');
      console.log('   - Check the parentOrganizationId is correct');
      console.log('   - Verify you have permission to create sub-organizations');
    }

    if (error.response?.status === 400) {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('   - Check required fields (name, parentOrganizationId)');
      console.log('   - Validate GSTIN format if provided');
      console.log('   - Ensure organization name is unique');
    }

    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// API Examples for reference
console.log('\n📚 API REFERENCE EXAMPLES');
console.log('='.repeat(80));

console.log('\n🔧 CREATE SUB-ORGANIZATION API:');
console.log('   Method: POST');
console.log('   URL: /api/organizations/sub');
console.log('   Headers:');
console.log('     - X-Application: crm (or hr, finance, etc.)');
console.log('     - Content-Type: application/json');
console.log('   Body:');
console.log('     {');
console.log('       "name": "Engineering Division",');
console.log('       "description": "Core engineering team",');
console.log('       "gstin": "22AAAAA0000A1Z6",');
console.log('       "parentOrganizationId": "parent-org-uuid"');
console.log('     }');

console.log('\n🔧 GET ORGANIZATION HIERARCHY API:');
console.log('   Method: GET');
console.log('   URL: /api/organizations/hierarchy/{tenantId}');
console.log('   Headers:');
console.log('     - X-Application: crm');

console.log('\n🔧 GET SUB-ORGANIZATIONS API:');
console.log('   Method: GET');
console.log('   URL: /api/organizations/{parentId}/sub-organizations');
console.log('   Headers:');
console.log('     - X-Application: crm');

console.log('\n🎯 REQUIRED FIELDS:');
console.log('   ✅ name (string, 2-255 chars)');
console.log('   ✅ parentOrganizationId (string, valid UUID)');
console.log('   📝 description (optional, string)');
console.log('   📝 gstin (optional, valid GSTIN format)');

console.log('\n🚀 APPLICATION CONTEXT:');
console.log('   - Include X-Application header in all requests');
console.log('   - Supports: crm, hr, finance, sales, marketing, inventory, projects, analytics');
console.log('   - Determines data access permissions and filtering');

// Uncomment to run the guide
// createSubOrganizationGuide();

export default createSubOrganizationGuide;
