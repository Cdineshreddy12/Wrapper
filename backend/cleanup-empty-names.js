import { db } from './src/db/index.js';
import { organizations } from './src/db/schema/organizations.js';
import { eq, or, isNull } from 'drizzle-orm';

async function cleanupEmptyNames() {
  try {
    console.log('🧹 Cleaning up organizations with empty names...');

    // Find organizations with empty or null names
    const emptyNameOrgs = await db
      .select({
        organizationId: organizations.organizationId,
        organizationName: organizations.organizationName,
        organizationType: organizations.organizationType,
        createdAt: organizations.createdAt
      })
      .from(organizations)
      .where(or(
        isNull(organizations.organizationName),
        eq(organizations.organizationName, ''),
        eq(organizations.organizationName, ' ')
      ));

    console.log(`Found ${emptyNameOrgs.length} organizations with empty names`);

    // Update each organization with a default name
    for (const org of emptyNameOrgs) {
      const defaultName = `Unnamed Organization ${org.createdAt.getTime()}`;
      const defaultType = org.organizationType || 'sub';

      await db
        .update(organizations)
        .set({
          organizationName: defaultName,
          organizationType: defaultType,
          updatedAt: new Date()
        })
        .where(eq(organizations.organizationId, org.organizationId));

      console.log(`✅ Updated: ${org.organizationId} -> ${defaultName}`);
    }

    console.log('🎉 Cleanup completed!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    process.exit(0);
  }
}

cleanupEmptyNames();
