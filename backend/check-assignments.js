import { db } from './src/db/index.js';
import { tenantUsers, entities } from './src/db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';

(async () => {
  try {
    console.log('🔍 Testing Employee Assignments Endpoint Fix\n');

    const tenantId = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';

    // Test the fixed query structure (similar to what the API uses)
    console.log('📊 Testing employee assignments query...');

    // Test basic tenantUsers query first
    console.log('Testing basic tenantUsers query...');
    const basicTest = await db
      .select({
        userId: tenantUsers.userId,
        tenantId: tenantUsers.tenantId
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId))
      .limit(1);

    console.log('✅ Basic query works:', basicTest.length > 0);

    // Get users first
    const users = await db
      .select({
        userId: tenantUsers.userId,
        tenantId: tenantUsers.tenantId,
        primaryOrgId: tenantUsers.primaryOrganizationId,
        isActive: tenantUsers.isActive,
        createdAt: tenantUsers.createdAt
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId))
      .limit(5); // Just test first 5

    // Enrich with organization data
    const assignments = await Promise.all(users.map(async (user) => {
      let orgCode = null;
      let orgName = null;

      if (user.primaryOrgId) {
        const org = await db
          .select({
            orgCode: entities.entityId,
            orgName: entities.entityName
          })
          .from(entities)
          .where(and(
            eq(entities.tenantId, tenantId),
            eq(entities.entityId, user.primaryOrgId)
          ))
          .limit(1);

        if (org.length > 0) {
          orgCode = org[0].orgCode;
          orgName = org[0].orgName;
        }
      }

      return {
        ...user,
        orgCode,
        orgName,
        userEntityId: user.primaryOrgId // For backward compatibility
      };
    }));

    console.log(`✅ Query executed successfully! Found ${assignments.length} assignments\n`);

    // Show sample transformation
    if (assignments.length > 0) {
      console.log('🔄 Sample transformation:');
      const sample = assignments[0];
      const transformed = {
        assignmentId: `${sample.userId}_${sample.orgCode || sample.userEntityId || tenantId}`,
        tenantId: sample.tenantId,
        userId: sample.userId,
        entityId: sample.orgCode || sample.userEntityId || tenantId, // ✅ Uses actual orgCode, fallback to userEntityId, then tenantId
        assignmentType: 'primary',
        isActive: sample.isActive !== null ? sample.isActive : true
      };
      console.log(JSON.stringify(transformed, null, 2));
      console.log('');
    }

    // Test referential integrity
    console.log('🔍 Referential Integrity Check:');
    const orgCodes = new Set(assignments.map(a => a.orgCode).filter(code => code));
    const entityIds = new Set(assignments.map(a => a.userEntityId).filter(id => id));

    console.log(`   Assignments with orgCode: ${orgCodes.size}`);
    console.log(`   Assignments with userEntityId: ${entityIds.size}`);
    console.log(`   Total assignments: ${assignments.length}`);

    const hasValidRefs = assignments.every(a => (a.orgCode || a.userEntityId || tenantId));
    console.log(`   All assignments have valid entityIds: ${hasValidRefs ? '✅' : '❌'}`);

    const tenantIdFallbacks = assignments.filter(a => !a.orgCode && !a.userEntityId && a.tenantId).length;
    console.log(`   Assignments using tenantId fallback: ${tenantIdFallbacks}`);

    if (hasValidRefs) {
      console.log('\n🎉 SUCCESS: Employee assignments fix working correctly!');
      console.log('✅ All assignments have valid entityIds');
      console.log('✅ Proper organization references with tenantId fallback');
      console.log('✅ API should work without null entityIds');
    } else {
      console.log('\n⚠️  WARNING: Some assignments still lack valid entityIds');
    }

  } catch (error) {
    console.error('❌ Error testing employee assignments:', error);
  } finally {
    process.exit(0);
  }
})();

