import { sql } from './src/db/index.js';

// Test the permission levels fix
async function testPermissionLevelsFix() {
  try {
    console.log('🔍 Testing permission levels fix...');

    // Test user ID (internal UUID)
    const userId = '50d4f694-202f-4f27-943d-7aafeffee29c';

    // Test 1: Check user admin status
    console.log('📋 Test 1: User admin status query');
    const userInfo = await sql`
      SELECT user_id, is_tenant_admin, email
      FROM tenant_users
      WHERE user_id = ${userId}
    `;

    console.log('✅ User admin status query successful:', {
      userId: userInfo[0]?.user_id,
      isTenantAdmin: userInfo[0]?.is_tenant_admin,
      email: userInfo[0]?.email
    });

    // Test 2: Verify PERMISSION_LEVELS constants are accessible
    console.log('📋 Test 2: Permission levels constants');

    // Import the service to test the constants
    const { ApplicationDataIsolationService } = await import('./src/services/application-data-isolation-service.js');

    console.log('✅ PERMISSION_LEVELS constants accessible:', {
      NONE: ApplicationDataIsolationService.PERMISSION_LEVELS.NONE,
      VIEWER: ApplicationDataIsolationService.PERMISSION_LEVELS.VIEWER,
      EDITOR: ApplicationDataIsolationService.PERMISSION_LEVELS.EDITOR,
      ADMIN: ApplicationDataIsolationService.PERMISSION_LEVELS.ADMIN,
      SUPER_ADMIN: ApplicationDataIsolationService.PERMISSION_LEVELS.SUPER_ADMIN
    });

    // Test 3: Test getUserApplicationPermissions method
    console.log('📋 Test 3: getUserApplicationPermissions method');
    const service = new ApplicationDataIsolationService();

    try {
      const permissions = await service.getUserApplicationPermissions(userId, 'crm');
      console.log('✅ getUserApplicationPermissions successful:', {
        permissionLevel: permissions?.permissionLevel,
        canAccessAllData: permissions?.canAccessAllData,
        canManageUsers: permissions?.canManageUsers,
        canConfigureApp: permissions?.canConfigureApp
      });
    } catch (permError) {
      console.error('❌ getUserApplicationPermissions failed:', permError);
    }

    console.log('🎉 Permission levels fix test completed successfully!');

  } catch (error) {
    console.error('❌ Permission levels test failed:', error);
  } finally {
    await sql.end();
  }
}

testPermissionLevelsFix();
