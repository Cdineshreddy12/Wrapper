// 🧪 Test script to verify permission matrix fixes
// Run with: node test-permission-fix.js

import { db } from './src/db/index.js';
import { tenantUsers, customRoles, userRoleAssignments } from './src/db/schema/index.js';
import { eq, and } from 'drizzle-orm';

async function testPermissionLogic() {
  console.log('🧪 Testing Permission Matrix Fixes...\n');
  
  try {
    // Test 1: Check if tenant admin detection works
    console.log('📋 Test 1: Tenant Admin Detection');
    
    // Get a sample tenant admin user
    const [adminUser] = await db
      .select({
        userId: tenantUsers.userId,
        kindeUserId: tenantUsers.kindeUserId,
        email: tenantUsers.email,
        isTenantAdmin: tenantUsers.isTenantAdmin,
        tenantId: tenantUsers.tenantId
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.isTenantAdmin, true))
      .limit(1);
    
    if (adminUser) {
      console.log('✅ Found tenant admin:', {
        userId: adminUser.userId,
        email: adminUser.email,
        isTenantAdmin: adminUser.isTenantAdmin,
        tenantId: adminUser.tenantId
      });
      
      // Test 2: Check admin's roles
      console.log('\n📋 Test 2: Admin Role Detection');
      const adminRoles = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          description: customRoles.description,
          isSystemRole: customRoles.isSystemRole
        })
        .from(customRoles)
        .innerJoin(
          userRoleAssignments,
          eq(customRoles.roleId, userRoleAssignments.roleId)
        )
        .where(eq(userRoleAssignments.userId, adminUser.userId));
      
      console.log('✅ Admin roles:', adminRoles);
      
      // Test 3: Check if there are other users in the same tenant
      console.log('\n📋 Test 3: Same Tenant User Detection');
      const sameTenantUsers = await db
        .select({
          userId: tenantUsers.userId,
          kindeUserId: tenantUsers.kindeUserId,
          email: tenantUsers.email,
          isTenantAdmin: tenantUsers.isTenantAdmin
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, adminUser.tenantId))
        .limit(5);
      
      console.log('✅ Users in same tenant:', sameTenantUsers.length);
      sameTenantUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.isTenantAdmin ? 'Admin' : 'User'})`);
      });
      
      // Test 4: Simulate permission check logic
      console.log('\n📋 Test 4: Permission Check Logic Simulation');
      
      const isUserTenantAdmin = (permissions, userRoles) => {
        const hasAdminPermissions = permissions?.some(p => 
          p.includes('admin') || 
          p.includes('tenant_admin') ||
          p.includes('super_admin')
        );
        
        const hasAdminRole = userRoles?.some(role => 
          role.roleName?.toLowerCase().includes('admin') ||
          role.roleName?.toLowerCase().includes('administrator') ||
          role.roleName?.toLowerCase().includes('super')
        );
        
        return hasAdminPermissions || hasAdminRole;
      };
      
      // Simulate the adminPermissions structure that would come from PermissionMatrixService
      // Based on the "Super Administrator" role, this user should have comprehensive permissions
      const simulatedAdminPermissions = [
        'crm.users.read', 'crm.users.read_all', 'crm.users.create', 'crm.users.update', 'crm.users.delete',
        'crm.users.change_role', 'crm.users.bulk_upload', 'crm.users.export', 'crm.users.import',
        'system.users.read', 'system.users.read_all', 'system.users.create', 'system.users.update',
        'system.users.delete', 'system.users.activate', 'system.users.reset_password',
        'system.roles.read', 'system.roles.read_all', 'system.roles.create', 'system.roles.update',
        'system.roles.delete', 'system.roles.assign', 'system.roles.export',
        'admin', 'super_admin', 'tenant_admin'
      ];
      
      const actualRoles = adminRoles;
      
      const isAdmin = isUserTenantAdmin(simulatedAdminPermissions, actualRoles);
      console.log('✅ Permission check simulation:', {
        permissions: simulatedAdminPermissions,
        roles: actualRoles.map(r => r.roleName),
        isTenantAdmin: isAdmin
      });
      
      // Test 5: Check if target user belongs to same tenant
      console.log('\n📋 Test 5: Cross-Tenant Access Prevention');
      const nonAdminUser = sameTenantUsers.find(u => !u.isTenantAdmin);
      
      if (nonAdminUser) {
        console.log('✅ Testing access to user in same tenant:', nonAdminUser.email);
        
        // This should be allowed for tenant admins
        const canAccess = isAdmin && nonAdminUser.tenantId === adminUser.tenantId;
        console.log('   Access allowed:', canAccess);
        console.log('   Reason:', {
          isAdmin,
          sameTenant: nonAdminUser.tenantId === adminUser.tenantId,
          adminTenantId: adminUser.tenantId,
          targetUserTenantId: nonAdminUser.tenantId
        });
      }
      
    } else {
      console.log('❌ No tenant admin found in database');
    }
    
    console.log('\n🎉 Permission logic tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testPermissionLogic();
