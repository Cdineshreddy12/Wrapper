import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const TENANT_ID = '893d8c75-68e6-4d42-92f8-45df62ef08b6';

async function debugHierarchyAPI() {
  try {
    console.log('🔍 Debugging hierarchy API response...');

    const response = await axios.get(`${BASE_URL}/api/organizations/hierarchy/${TENANT_ID}`);
    const hierarchy = response.data.data.hierarchy;

    console.log(`Total organizations in hierarchy: ${hierarchy.length}`);

    // Check each organization for display issues
    hierarchy.forEach((parent, index) => {
      console.log(`\nParent ${index + 1}:`);
      console.log(`  ID: ${parent.organizationId}`);
      console.log(`  Raw Name: "${parent.organizationName}"`);
      console.log(`  Raw Type: "${parent.organizationType}"`);

      // Test the fallback logic
      const displayName = (parent.organizationName && parent.organizationName.trim()) || 'Unknown Organization';
      const displayType = (parent.organizationType && parent.organizationType.trim()) || 'unknown';

      console.log(`  Display Name: "${displayName}"`);
      console.log(`  Display Type: "${displayType}"`);

      if (displayName === 'Unknown Organization') {
        console.log('  ⚠️ FALLBACK TRIGGERED!');
      }

      if (parent.children && parent.children.length > 0) {
        console.log(`  Children: ${parent.children.length}`);
        parent.children.slice(0, 2).forEach((child, childIndex) => {
          const childDisplayName = (child.organizationName && child.organizationName.trim()) || 'Unknown Organization';
          const childDisplayType = (child.organizationType && child.organizationType.trim()) || 'unknown';

          console.log(`    Child ${childIndex + 1}: "${childDisplayName}" (${childDisplayType})`);

          if (childDisplayName === 'Unknown Organization') {
            console.log('      ⚠️ CHILD FALLBACK TRIGGERED!');
          }
        });
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    process.exit(0);
  }
}

debugHierarchyAPI();
