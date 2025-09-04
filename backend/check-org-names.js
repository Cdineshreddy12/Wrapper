import { db } from './src/db/index.js';
import { organizations } from './src/db/schema/organizations.js';
import { eq } from 'drizzle-orm';

async function checkOrgNames() {
  try {
    console.log('🔍 Checking organization names in database...');

    const TENANT_ID = '893d8c75-68e6-4d42-92f8-45df62ef08b6';

    const allOrgs = await db
      .select({
        organizationId: organizations.organizationId,
        organizationName: organizations.organizationName,
        organizationType: organizations.organizationType,
        parentOrganizationId: organizations.parentOrganizationId
      })
      .from(organizations)
      .where(eq(organizations.tenantId, TENANT_ID));

    console.log(`Total organizations found: ${allOrgs.length}`);

    // Check for null/undefined names
    const nullNames = allOrgs.filter(org => !org.organizationName);
    const nullTypes = allOrgs.filter(org => !org.organizationType);
    const emptyNames = allOrgs.filter(org => org.organizationName && org.organizationName.trim() === '');
    const whitespaceNames = allOrgs.filter(org => org.organizationName && org.organizationName.trim() !== org.organizationName);

    console.log(`Organizations with null names: ${nullNames.length}`);
    console.log(`Organizations with null types: ${nullTypes.length}`);
    console.log(`Organizations with empty names: ${emptyNames.length}`);
    console.log(`Organizations with whitespace names: ${whitespaceNames.length}`);

    if (whitespaceNames.length > 0) {
      console.log('\nOrganizations with whitespace in names:');
      whitespaceNames.slice(0, 5).forEach(org => {
        console.log(`  "${org.organizationName}" -> "${org.organizationName.trim()}"`);
      });
    }

    // Show first 10
    console.log('\nFirst 10 organizations:');

    console.log('Sample organizations:');
    allOrgs.forEach(org => {
      console.log(`  ID: ${org.organizationId}`);
      console.log(`  Name: "${org.organizationName}" (length: ${org.organizationName?.length || 0})`);
      console.log(`  Type: "${org.organizationType}" (length: ${org.organizationType?.length || 0})`);
      console.log(`  Parent: ${org.parentOrganizationId || 'null'}`);
      console.log('  ---');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkOrgNames();
