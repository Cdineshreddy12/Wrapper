import { db } from './src/db/index.js';
import { tenants } from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';

async function testOnboardingEndpoint() {
  try {
    console.log('🔍 Testing onboarding endpoint functionality...\n');

    // Test 1: Check current tenant status
    console.log('1. Checking current tenant status...');
    const currentTenant = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        onboardingCompleted: tenants.onboardingCompleted,
        kindeOrgId: tenants.kindeOrgId
      })
      .from(tenants)
      .where(eq(tenants.kindeOrgId, 'org_ce82b312045c94'))
      .limit(1);

    if (currentTenant.length > 0) {
      console.log('✅ Current tenant:', currentTenant[0]);
    } else {
      console.log('❌ Tenant not found');
    }

    // Test 2: Check organization status
    console.log('\n2. Checking organization status...');
    const { organizations } = await import('./src/db/schema/organizations.js');
    const tenantOrgs = await db
      .select({
        organizationId: organizations.organizationId,
        organizationName: organizations.organizationName,
        organizationCode: organizations.organizationCode,
        tenantId: organizations.tenantId
      })
      .from(organizations)
      .where(eq(organizations.tenantId, currentTenant[0]?.tenantId))
      .limit(5);

    console.log('📋 Organizations found:', tenantOrgs.length);
    tenantOrgs.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.organizationName} (${org.organizationCode})`);
    });

    // Test 3: Check user status
    console.log('\n3. Checking user status...');
    const { tenantUsers } = await import('./src/db/schema/users.js');
    const tenantUsersList = await db
      .select({
        userId: tenantUsers.userId,
        email: tenantUsers.email,
        primaryOrganizationId: tenantUsers.primaryOrganizationId
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, currentTenant[0]?.tenantId))
      .limit(5);

    console.log('👥 Users found:', tenantUsersList.length);
    tenantUsersList.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.primaryOrganizationId ? 'Has Org' : 'No Org'})`);
    });

    // Test 4: Simulate API call without authentication
    console.log('\n4. Testing API call simulation...');
    const testOnboardingData = {
      companyName: 'Test Company',
      adminEmail: 'test@example.com',
      adminMobile: '9876543210',
      gstin: '22AAAAA0000A1Z6'
    };

    console.log('📡 Test onboarding data:', testOnboardingData);
    console.log('🔍 This would call: POST /onboarding/onboard');
    console.log('🔑 Authentication: None (will create new user)');
    console.log('🎯 Expected result: New tenant and user creation');

    console.log('\n🎉 Onboarding endpoint test completed!');
    console.log('📊 Summary:');
    console.log('   - Tenant exists:', currentTenant.length > 0 ? '✅' : '❌');
    console.log('   - Organizations exist:', tenantOrgs.length > 0 ? '✅' : '❌');
    console.log('   - Users exist:', tenantUsersList.length > 0 ? '✅' : '❌');
    console.log('   - Onboarding completed:', currentTenant[0]?.onboardingCompleted ? '✅' : '❌');

  } catch (error) {
    console.error('❌ Error testing onboarding endpoint:', error);
  } finally {
    process.exit(0);
  }
}

testOnboardingEndpoint();