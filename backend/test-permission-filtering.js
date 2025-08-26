// 🧪 Test script to verify permission filtering fixes
// Run with: node test-permission-filtering.js

import { db } from './src/db/index.js';
import { tenantUsers, customRoles, userRoleAssignments } from './src/db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import PermissionMatrixService from './src/services/permission-matrix-service.js';

async function testPermissionFiltering() {
  console.log('🧪 Testing Permission Filtering Fixes...\n');
  
  try {
    // Test 1: Check different user roles and their permissions
    console.log('📋 Test 1: Check User Roles and Permissions');
    
    const usersWithRoles = await db
      .select({
        userId: tenantUsers.userId,
        kindeUserId: tenantUsers.kindeUserId,
        email: tenantUsers.email,
        isActive: tenantUsers.isActive,
        tenantId: tenantUsers.tenantId
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.isActive, true))
      .limit(5);
    
    if (usersWithRoles.length > 0) {
      console.log('✅ Found active users:', usersWithRoles.length);
      
      for (const user of usersWithRoles) {
        console.log(`\n🔍 Testing user: ${user.email}`);
        
        // Get user's roles
        const userRoles = await db
          .select({
            roleId: customRoles.roleId,
            roleName: customRoles.roleName,
            permissions: customRoles.permissions,
            restrictions: customRoles.restrictions
          })
          .from(userRoleAssignments)
          .innerJoin(customRoles, eq(customRoles.roleId, userRoleAssignments.roleId))
          .where(eq(userRoleAssignments.userId, user.userId));
        
        if (userRoles.length > 0) {
          console.log(`   Role: ${userRoles[0].roleName}`);
          console.log(`   Raw permissions: ${userRoles[0].permissions?.substring(0, 100)}...`);
          
          // Test permission parsing
          const parsedPermissions = PermissionMatrixService.parseRolePermissions(userRoles[0].permissions);
          console.log(`   Parsed permissions: ${parsedPermissions.length} permissions`);
          
          // Test permission compilation
          const compiledPermissions = PermissionMatrixService.compileUserPermissions({
            plan: 'professional',
            planAccess: {},
            orgApps: [],
            userPermissions: [],
            userRoles: userRoles
          });
          
          console.log(`   Compiled permissions: ${compiledPermissions.length} permissions`);
          
          // Check if permissions are properly filtered
          const crmPermissions = compiledPermissions.filter(p => p.startsWith('crm.'));
          console.log(`   CRM permissions: ${crmPermissions.length} permissions`);
          
          // Show first few permissions for verification
          if (crmPermissions.length > 0) {
            console.log(`   Sample permissions: ${crmPermissions.slice(0, 5).join(', ')}`);
          }
          
          // Security check: ensure we're not returning all CRM permissions
          if (crmPermissions.length > 50) {
            console.log(`   ⚠️ WARNING: Too many CRM permissions (${crmPermissions.length}) - possible security issue`);
          } else {
            console.log(`   ✅ Security check passed: reasonable number of permissions`);
          }
          
        } else {
          console.log(`   No roles assigned to user`);
        }
      }
    }
    
    // Test 2: Test specific role permission parsing
    console.log('\n📋 Test 2: Test Role Permission Parsing');
    
    const testRoles = [
      {
        roleName: 'contacts manager',
        permissions: '["crm.contacts.read","crm.contacts.create","crm.contacts.update","crm.contacts.delete","crm.system.settings_read"]'
      },
      {
        roleName: 'sales manager',
        permissions: '["crm.leads.read","crm.leads.create","crm.opportunities.read","crm.contacts.read"]'
      },
      {
        roleName: 'admin',
        permissions: '["crm.users.read","crm.users.create","crm.system.settings_read","crm.system.settings_update"]'
      }
    ];
    
    testRoles.forEach(role => {
      const parsed = PermissionMatrixService.parseRolePermissions(role.permissions);
      console.log(`   ${role.roleName}: ${parsed.length} permissions`);
      
      // Test permission compilation for this role
      const compiled = PermissionMatrixService.compileUserPermissions({
        plan: 'professional',
        planAccess: {},
        orgApps: [],
        userPermissions: [],
        userRoles: [{ ...role, roleId: 'test', restrictions: {} }]
      });
      
      console.log(`     Compiled: ${compiled.length} permissions`);
      console.log(`     CRM permissions: ${compiled.filter(p => p.startsWith('crm.')).length}`);
    });
    
    // Test 3: Test permission validation
    console.log('\n📋 Test 3: Test Permission Validation');
    
    const testUserPermissions = [
      'crm.contacts.read',
      'crm.contacts.create',
      'crm.leads.read',  // This should be filtered out if user doesn't have leads role
      'crm.system.settings_read'
    ];
    
    const testUserRoles = [{
      roleName: 'contacts manager',
      permissions: '["crm.contacts.read","crm.contacts.create","crm.system.settings_read"]'
    }];
    
    const validated = PermissionMatrixService.validateUserPermissions(testUserPermissions, testUserRoles);
    console.log(`   Input permissions: ${testUserPermissions.length}`);
    console.log(`   Validated permissions: ${validated.length}`);
    console.log(`   Filtered out: ${testUserPermissions.length - validated.length}`);
    console.log(`   Result: ${validated.join(', ')}`);
    
    console.log('\n🎉 Permission filtering tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testPermissionFiltering();
