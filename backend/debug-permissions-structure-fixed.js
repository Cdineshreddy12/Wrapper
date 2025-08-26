#!/usr/bin/env node

/**
 * 🔍 **DEBUG PERMISSIONS STRUCTURE SCRIPT - FIXED VERSION**
 * 
 * This script examines the database to understand:
 * 1. How user permissions are stored
 * 2. How permissions are linked to applications
 * 3. The actual data structure for classification
 * 
 * Run with: node debug-permissions-structure-fixed.js
 */

import { db } from './src/db/index.js';
import { 
  tenantUsers, 
  customRoles, 
  userRoleAssignments,
  subscriptions,
  tenants
} from './src/db/schema/index.js';
import { eq, and, inArray } from 'drizzle-orm';

async function debugPermissionsStructure() {
  try {
    console.log('🔍 Starting permissions structure debug...\n');
    
    // Test tenant ID from your logs
    const testTenantId = '893d8c75-68e6-4d42-92f8-45df62ef08b6';
    
    console.log('📊 === DATABASE SCHEMA EXAMINATION ===');
    
    // 1. Check tenant_users table structure
    console.log('\n1️⃣ TENANT_USERS TABLE:');
    const users = await db
      .select({
        userId: tenantUsers.userId,
        email: tenantUsers.email,
        name: tenantUsers.name,
        isActive: tenantUsers.isActive,
        isTenantAdmin: tenantUsers.isTenantAdmin,
        department: tenantUsers.department,
        title: tenantUsers.title
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, testTenantId));
    
    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - Admin: ${user.isTenantAdmin} - Active: ${user.isActive}`);
    });
    
    // 2. Check custom_roles table structure
    console.log('\n2️⃣ CUSTOM_ROLES TABLE:');
    const roles = await db
      .select({
        roleId: customRoles.roleId,
        roleName: customRoles.roleName,
        permissions: customRoles.permissions,
        restrictions: customRoles.restrictions,
        priority: customRoles.priority
      })
      .from(customRoles)
      .where(eq(customRoles.tenantId, testTenantId));
    
    console.log(`Found ${roles.length} custom roles:`);
    roles.forEach((role, index) => {
      console.log(`  ${index + 1}. ${role.roleName} (Priority: ${role.priority})`);
      console.log(`     Permissions:`, role.permissions);
      console.log(`     Restrictions:`, role.restrictions);
    });
    
    // 3. Check user_role_assignments table structure
    console.log('\n3️⃣ USER_ROLE_ASSIGNMENTS TABLE:');
    const userRoleAssignmentsData = await db
      .select({
        userId: userRoleAssignments.userId,
        roleId: userRoleAssignments.roleId,
        isActive: userRoleAssignments.isActive,
        assignedAt: userRoleAssignments.assignedAt
      })
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.tenantId, testTenantId));
    
    console.log(`Found ${userRoleAssignmentsData.length} user-role assignments:`);
    userRoleAssignmentsData.forEach((assignment, index) => {
      const user = users.find(u => u.userId === assignment.userId);
      const role = roles.find(r => r.roleId === assignment.roleId);
      console.log(`  ${index + 1}. User: ${user?.name || assignment.userId} → Role: ${role?.roleName || assignment.roleId} (Active: ${assignment.isActive})`);
    });
    
    // 4. Check subscriptions table structure
    console.log('\n4️⃣ SUBSCRIPTIONS TABLE:');
    const subscriptions_data = await db
      .select({
        subscriptionId: subscriptions.subscriptionId,
        plan: subscriptions.plan,
        status: subscriptions.status,
        subscribedTools: subscriptions.subscribedTools
      })
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, testTenantId));
    
    console.log(`Found ${subscriptions_data.length} subscriptions:`);
    subscriptions_data.forEach((sub, index) => {
      console.log(`  ${index + 1}. Plan: ${sub.plan} - Status: ${sub.status} - Tools: ${sub.subscribedTools}`);
    });
    
    // 5. Analyze permission structure
    console.log('\n5️⃣ PERMISSION STRUCTURE ANALYSIS:');
    console.log('Examining how permissions are formatted...');
    
    const allPermissions = new Set();
    const appPermissions = new Map();
    
    roles.forEach(role => {
      if (role.permissions) {
        if (Array.isArray(role.permissions)) {
          // Handle array format: ["crm.leads.read", "hr.employees.read"]
          role.permissions.forEach(permission => {
            allPermissions.add(permission);
            
            if (typeof permission === 'string' && permission.includes('.')) {
              const parts = permission.split('.');
              const appCode = parts[0];
              
              if (!appPermissions.has(appCode)) {
                appPermissions.set(appCode, new Set());
              }
              appPermissions.get(appCode).add(permission);
            }
          });
        } else if (typeof role.permissions === 'object') {
          // Handle object format: {"crm": {"leads": ["read", "create"]}}
          Object.keys(role.permissions).forEach(appCode => {
            if (!appPermissions.has(appCode)) {
              appPermissions.set(appCode, new Set());
            }
            
            const appData = role.permissions[appCode];
            if (typeof appData === 'object') {
              Object.keys(appData).forEach(moduleCode => {
                const modulePermissions = appData[moduleCode];
                if (Array.isArray(modulePermissions)) {
                  modulePermissions.forEach(permission => {
                    const fullPermission = `${appCode}.${moduleCode}.${permission}`;
                    allPermissions.add(fullPermission);
                    appPermissions.get(appCode).add(fullPermission);
                  });
                }
              });
            }
          });
        }
      }
    });
    
    console.log(`\n📋 Total unique permissions found: ${allPermissions.size}`);
    console.log('Sample permissions:', Array.from(allPermissions).slice(0, 10));
    
    console.log('\n🏗️ Applications detected from permissions:');
    appPermissions.forEach((permissions, appCode) => {
      console.log(`  ${appCode}: ${permissions.size} permissions`);
      console.log(`    Sample:`, Array.from(permissions).slice(0, 3));
    });
    
    // 6. Test user classification logic
    console.log('\n6️⃣ USER CLASSIFICATION TEST:');
    console.log('Testing how users would be classified...');
    
    const userClassifications = {};
    
    users.forEach(user => {
      const userRoles = userRoleAssignmentsData.filter(ur => ur.userId === user.userId && ur.isActive);
      const userPermissions = new Set();
      
      userRoles.forEach(ur => {
        const role = roles.find(r => r.roleId === ur.roleId);
        if (role && role.permissions) {
          if (Array.isArray(role.permissions)) {
            // Handle array format
            role.permissions.forEach(permission => userPermissions.add(permission));
          } else if (typeof role.permissions === 'object') {
            // Handle object format
            Object.keys(role.permissions).forEach(appCode => {
              const appData = role.permissions[appCode];
              if (typeof appData === 'object') {
                Object.keys(appData).forEach(moduleCode => {
                  const modulePermissions = appData[moduleCode];
                  if (Array.isArray(modulePermissions)) {
                    modulePermissions.forEach(permission => {
                      const fullPermission = `${appCode}.${moduleCode}.${permission}`;
                      userPermissions.add(fullPermission);
                    });
                  }
                });
              }
            });
          }
        }
      });
      
      // Extract applications from permissions
      const userApps = new Set();
      userPermissions.forEach(permission => {
        if (typeof permission === 'string' && permission.includes('.')) {
          const parts = permission.split('.');
          const appCode = parts[0];
          userApps.add(appCode);
        }
      });
      
      userClassifications[user.userId] = {
        name: user.name,
        email: user.email,
        isTenantAdmin: user.isTenantAdmin,
        permissions: Array.from(userPermissions),
        applications: Array.from(userApps)
      };
      
      console.log(`\n👤 ${user.name} (${user.email}):`);
      console.log(`  Tenant Admin: ${user.isTenantAdmin}`);
      console.log(`  Permissions: ${userPermissions.size} total`);
      console.log(`  Applications: ${Array.from(userApps).join(', ') || 'None'}`);
      console.log(`  Sample permissions:`, Array.from(userPermissions).slice(0, 5));
    });
    
    // 7. Summary
    console.log('\n7️⃣ CLASSIFICATION SUMMARY:');
    const allApps = new Set();
    Object.values(userClassifications).forEach(user => {
      user.applications.forEach(app => allApps.add(app));
    });
    
    console.log(`\n📊 Classification Results:`);
    console.log(`  Total Users: ${users.length}`);
    console.log(`  Total Applications: ${allApps.size}`);
    console.log(`  Applications: ${Array.from(allApps).join(', ')}`);
    
    const appBreakdown = {};
    Array.from(allApps).forEach(app => {
      appBreakdown[app] = Object.values(userClassifications).filter(user => 
        user.applications.includes(app)
      ).length;
    });
    
    console.log(`  Application Breakdown:`, appBreakdown);
    
    console.log('\n✅ Debug script completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in debug script:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the debug script
debugPermissionsStructure();
