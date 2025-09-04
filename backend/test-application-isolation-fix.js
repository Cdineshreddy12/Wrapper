import { sql } from './src/db/index.js';

// Test the application isolation service fixes
async function testApplicationIsolationFixes() {
  try {
    console.log('🔍 Testing application isolation service fixes...');

    // Simulate user context like what the middleware would provide
    const userContext = {
      userId: 'kp_5644fd635bf946a292069e3572639e2b', // Kinde user ID
      internalUserId: '50d4f694-202f-4f27-943d-7aafeffee29c', // Internal UUID
      tenantId: '893d8c75-68e6-4d42-92f8-45df62ef08b6',
      roles: ['TENANT_ADMIN'],
      email: 'reddycdinesh41@gmail.com'
    };

    // Test 1: Check user permissions query
    console.log('📋 Test 1: User permissions query');
    const userInfo = await sql`
      SELECT user_id, is_tenant_admin, email
      FROM tenant_users
      WHERE user_id = ${userContext.internalUserId}
    `;
    console.log('✅ User permissions query successful:', userInfo);

    // Test 2: Check organization memberships query
    console.log('📋 Test 2: Organization memberships query');
    const memberships = await sql`
      SELECT entity_id as organization_id, membership_status
      FROM organization_memberships
      WHERE user_id = ${userContext.internalUserId}
      AND entity_type = 'organization'
      AND membership_status = 'active'
    `;
    console.log('✅ Organization memberships query successful:', memberships);

    // Test 3: Check tenant organizations query
    console.log('📋 Test 3: Tenant organizations query');
    const tenantOrgs = await sql`
      SELECT organization_id, organization_name, organization_type
      FROM organizations
      WHERE tenant_id = ${userContext.tenantId}
    `;
    console.log('✅ Tenant organizations query successful:', tenantOrgs);

    console.log('🎉 All database queries working correctly!');
    console.log('📊 Summary:');
    console.log(`   - User is tenant admin: ${userInfo[0]?.is_tenant_admin}`);
    console.log(`   - Organization memberships: ${memberships.length}`);
    console.log(`   - Tenant organizations: ${tenantOrgs.length}`);

  } catch (error) {
    console.error('❌ Application isolation test failed:', error);
  } finally {
    await sql.end();
  }
}

testApplicationIsolationFixes();
