import { db } from './src/db/index.js';
import { tenants, organizations, tenantUsers } from './src/db/schema/index.js';

async function testOnboardingFix() {
  try {
    console.log('🔍 Testing onboarding fix...\n');

    // Check recent tenants created
    const recentTenants = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        kindeOrgId: tenants.kindeOrgId,
        createdAt: tenants.createdAt
      })
      .from(tenants)
      .orderBy(tenants.createdAt)
      .limit(5);

    console.log('📋 Recent tenants:');
    for (const tenant of recentTenants) {
      console.log(`  - ${tenant.companyName} (${tenant.subdomain}) - ${tenant.createdAt}`);

      // Check if organization exists for this tenant
      const orgs = await db
        .select()
        .from(organizations)
        .where(organizations.tenantId.equals(tenant.tenantId));

      console.log(`    Organizations: ${orgs.length}`);

      // Check if users exist for this tenant
      const users = await db
        .select()
        .from(tenantUsers)
        .where(tenantUsers.tenantId.equals(tenant.tenantId));

      console.log(`    Users: ${users.length}\n`);
    }

    console.log('✅ Onboarding fix test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testOnboardingFix().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
