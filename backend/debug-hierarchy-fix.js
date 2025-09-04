import { db } from './src/db/index.js';
import { organizations } from './src/db/schema/organizations.js';
import { eq } from 'drizzle-orm';

async function debugHierarchy() {
  try {
    console.log('🔍 Debugging hierarchy display issue...');

    const TENANT_ID = '893d8c75-68e6-4d42-92f8-45df62ef08b6';

    // Get all organizations for this tenant
    const allOrgs = await db
      .select({
        organizationId: organizations.organizationId,
        organizationName: organizations.organizationName,
        organizationType: organizations.organizationType,
        parentOrganizationId: organizations.parentOrganizationId
      })
      .from(organizations)
      .where(eq(organizations.tenantId, TENANT_ID));

    console.log(`Found ${allOrgs.length} organizations in database`);

    // Check for any organizations with null/undefined names
    const nullNames = allOrgs.filter(org => org.organizationName === null || org.organizationName === undefined);
    const emptyNames = allOrgs.filter(org => org.organizationName === '');
    const whitespaceNames = allOrgs.filter(org => org.organizationName && org.organizationName.trim() !== org.organizationName);

    console.log(`Organizations with null names: ${nullNames.length}`);
    console.log(`Organizations with empty names: ${emptyNames.length}`);
    console.log(`Organizations with whitespace names: ${whitespaceNames.length}`);

    if (nullNames.length > 0) {
      console.log('\nOrganizations with null names:');
      nullNames.forEach(org => {
        console.log(`  ID: ${org.organizationId}, Type: ${org.organizationType}`);
      });
    }

    // Test the fallback logic
    console.log('\nTesting fallback logic:');
    allOrgs.slice(0, 5).forEach(org => {
      const displayName = (org.organizationName && org.organizationName.trim()) || 'Unknown Organization';
      const displayType = (org.organizationType && org.organizationType.trim()) || 'unknown';
      console.log(`  "${org.organizationName}" -> "${displayName}" (${displayType})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugHierarchy();
