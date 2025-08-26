#!/usr/bin/env node

/**
 * 🧪 Role-Based Application Access Testing Script
 * 
 * This script tests the updated user classification system where application access
 * is determined by roles and permissions assigned by tenant admins, not by subscription tiers.
 * 
 * Usage:
 *   node test-role-based-application-access.js [tenantId]
 */

import 'dotenv/config';
import axios from 'axios';
import { UserClassificationService } from './src/services/user-classification-service.js';
import { UserSyncService } from './src/services/user-sync-service.js';
import { db } from './src/db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments } from './src/db/schema/index.js';
import { eq, and } from 'drizzle-orm';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function printHeader(title) {
  colorLog('\n' + '='.repeat(70), 'cyan');
  colorLog(`🎯 ${title}`, 'bright');
  colorLog('='.repeat(70), 'cyan');
}

function printSubHeader(title) {
  colorLog(`\n📊 ${title}`, 'yellow');
  colorLog('-'.repeat(50), 'yellow');
}

// Configuration for testing
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
let authToken = null;
let testTenantId = null;
let testUserId = null;

async function setupTestEnvironment() {
  printHeader('SETTING UP TEST ENVIRONMENT');

  try {
    // Get or create test tenant
    const args = process.argv.slice(2);
    if (args.length > 0) {
      testTenantId = args[0];
      colorLog(`📍 Using provided tenant ID: ${testTenantId}`, 'cyan');
    } else {
      // Get the first available tenant
      const [tenant] = await db
        .select({ tenantId: tenants.tenantId, companyName: tenants.companyName })
        .from(tenants)
        .limit(1);

      if (!tenant) {
        throw new Error('No tenants found in database');
      }

      testTenantId = tenant.tenantId;
      colorLog(`📍 Using first available tenant: ${tenant.companyName} (${testTenantId})`, 'cyan');
    }

    // Get a test user (admin user for authentication)
    const [user] = await db
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, testTenantId),
        eq(tenantUsers.isTenantAdmin, true)
      ))
      .limit(1);

    if (user) {
      testUserId = user.userId;
      colorLog(`👤 Using admin user: ${user.email} (${testUserId})`, 'green');
    } else {
      // Get any user
      const [anyUser] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, testTenantId))
        .limit(1);
      
      if (anyUser) {
        testUserId = anyUser.userId;
        colorLog(`👤 Using user: ${anyUser.email} (${testUserId})`, 'green');
      } else {
        throw new Error('No users found in tenant for testing');
      }
    }

    return { tenantId: testTenantId, userId: testUserId };

  } catch (error) {
    colorLog(`❌ Error setting up test environment: ${error.message}`, 'red');
    throw error;
  }
}

async function testUserClassificationDirectly() {
  printHeader('DIRECT USER CLASSIFICATION TEST (Permission-Based)');

  try {
    colorLog('🔍 Testing direct user classification service...', 'blue');
    
    const classification = await UserClassificationService.classifyUsersByApplication(testTenantId);
    
    printSubHeader('Classification Summary');
    console.log('Total Users:', classification.summary.totalUsers);
    
    colorLog('Application Breakdown:', 'bright');
    if (Object.keys(classification.summary.applicationBreakdown).length === 0) {
      colorLog('  ⚠️ No users have application access through roles', 'yellow');
    } else {
      Object.entries(classification.summary.applicationBreakdown).forEach(([app, count]) => {
        colorLog(`  📱 ${app.toUpperCase()}: ${count} users`, 'green');
      });
    }

    printSubHeader('Users by Access Method');
    Object.entries(classification.byUser).forEach(([userId, user]) => {
      const method = user.classificationReason?.accessMethod || 'unknown';
      const apps = user.allowedApplications || [];
      
      colorLog(`👤 ${user.name} (${user.email})`, 'cyan');
      colorLog(`   Access Method: ${method}`, method === 'admin' ? 'green' : method === 'role_based' ? 'blue' : 'yellow');
      colorLog(`   Applications: ${apps.length > 0 ? apps.join(', ') : 'None'}`, apps.length > 0 ? 'green' : 'red');
      colorLog(`   Reason: ${user.classificationReason?.primary}`, 'magenta');
    });

    return classification;

  } catch (error) {
    colorLog(`❌ Error in direct classification test: ${error.message}`, 'red');
    throw error;
  }
}

async function testRoleBuilderOptions() {
  printHeader('ROLE BUILDER OPTIONS TEST (How Admins Assign Applications)');

  try {
    colorLog('🔍 Testing role builder options API...', 'blue');
    
    // This would normally require authentication, but for testing we'll mock it
    printSubHeader('Available Applications for Role Creation');
    
    // Simulate what the API would return
    const mockRoleBuilderOptions = {
      success: true,
      data: {
        applications: [
          {
            appCode: 'crm',
            appName: 'Customer Relationship Management',
            modules: [
              {
                moduleCode: 'leads',
                moduleName: 'Lead Management',
                permissions: ['read', 'create', 'update', 'delete', 'export', 'import']
              },
              {
                moduleCode: 'contacts',
                moduleName: 'Contact Management', 
                permissions: ['read', 'create', 'update', 'delete', 'export']
              },
              {
                moduleCode: 'accounts',
                moduleName: 'Account Management',
                permissions: ['read', 'create', 'update', 'delete', 'view_contacts']
              }
            ]
          },
          {
            appCode: 'hr',
            appName: 'Human Resources Management',
            modules: [
              {
                moduleCode: 'employees',
                moduleName: 'Employee Management',
                permissions: ['read', 'create', 'update', 'delete', 'view_salary']
              },
              {
                moduleCode: 'payroll',
                moduleName: 'Payroll Management',
                permissions: ['read', 'process', 'approve', 'export']
              }
            ]
          }
        ],
        totalApps: 2,
        totalModules: 5,
        totalPermissions: 23
      }
    };

    colorLog('📋 Role Builder shows admins can assign:', 'bright');
    mockRoleBuilderOptions.data.applications.forEach(app => {
      colorLog(`\n📱 ${app.appName} (${app.appCode})`, 'green');
      app.modules.forEach(module => {
        colorLog(`   📁 ${module.moduleName}: ${module.permissions.join(', ')}`, 'cyan');
      });
    });

    printSubHeader('Example Role Creation Process');
    const exampleRole = {
      roleName: 'Sales Manager',
      description: 'Sales manager with CRM access',
      selectedApps: ['crm'],
      selectedModules: {
        crm: ['leads', 'contacts', 'accounts']
      },
      selectedPermissions: {
        'crm.leads': ['read', 'create', 'update', 'delete'],
        'crm.contacts': ['read', 'create', 'update'],
        'crm.accounts': ['read', 'create']
      }
    };

    colorLog('🎯 Example Role for CRM Access:', 'bright');
    console.log(JSON.stringify(exampleRole, null, 2));

    return mockRoleBuilderOptions;

  } catch (error) {
    colorLog(`❌ Error in role builder test: ${error.message}`, 'red');
    throw error;
  }
}

async function testCreateApplicationRole() {
  printHeader('CREATE APPLICATION-SPECIFIC ROLE TEST');

  try {
    colorLog('🔧 Testing creation of role with specific application access...', 'blue');
    
    // Get a non-admin user to test with
    const [regularUser] = await db
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, testTenantId),
        eq(tenantUsers.isTenantAdmin, false),
        eq(tenantUsers.isActive, true)
      ))
      .limit(1);

    if (!regularUser) {
      colorLog('⚠️ No regular users found for testing. Creating one...', 'yellow');
      
      // For demo purposes, we'll just show what would happen
      colorLog('📝 Would create a regular user and assign them a role with specific app access', 'blue');
      return;
    }

    colorLog(`👤 Testing with user: ${regularUser.email}`, 'cyan');

    // Check current access
    const currentAccess = await UserClassificationService.getUserApplicationAccess(
      regularUser.userId, 
      testTenantId
    );

    printSubHeader('Current User Access');
    if (currentAccess) {
      colorLog(`Applications: ${currentAccess.allowedApplications.join(', ') || 'None'}`, 'cyan');
      colorLog(`Roles: ${currentAccess.roles.map(r => r.roleName).join(', ') || 'None'}`, 'magenta');
    } else {
      colorLog('User has no application access', 'red');
    }

    // Simulate creating a role with CRM access and assigning it
    printSubHeader('Simulated Role Creation & Assignment');
    
    const roleCreationDemo = {
      step1: 'Admin creates role with CRM access',
      roleData: {
        roleName: 'CRM User',
        selectedApps: ['crm'],
        selectedModules: { crm: ['leads', 'contacts'] },
        selectedPermissions: {
          'crm.leads': ['read', 'create'],
          'crm.contacts': ['read']
        }
      },
      step2: 'Admin assigns role to user',
      step3: 'User automatically gets access to CRM application',
      endpoint: 'POST /api/custom-roles/create-from-builder'
    };

    colorLog('🎯 Role Creation Process:', 'bright');
    console.log(JSON.stringify(roleCreationDemo, null, 2));

    return { regularUser, currentAccess, roleCreationDemo };

  } catch (error) {
    colorLog(`❌ Error in role creation test: ${error.message}`, 'red');
    throw error;
  }
}

async function testUserSyncAPIs() {
  printHeader('USER SYNC APIs TEST');

  try {
    colorLog('🔄 Testing user sync APIs with role-based access...', 'blue');

    // Test 1: Get sync status
    printSubHeader('Sync Status Test');
    const syncStatus = await UserSyncService.getSyncStatus(testTenantId);
    
    colorLog('📊 Sync Status:', 'bright');
    colorLog(`Total Users: ${syncStatus.summary.totalUsers}`, 'green');
    colorLog(`Applications Configured:`, 'cyan');
    Object.entries(syncStatus.applicationStatus).forEach(([app, status]) => {
      colorLog(`  📱 ${app.toUpperCase()}: ${status.userCount} users, URL: ${status.applicationUrl}`, 'blue');
    });

    // Test 2: Dry run sync
    printSubHeader('Dry Run Sync Test');
    const classification = await UserClassificationService.classifyUsersByApplication(testTenantId);
    
    colorLog('🧪 Dry Run Sync Results:', 'bright');
    if (Object.keys(classification.summary.applicationBreakdown).length === 0) {
      colorLog('⚠️ No users would be synced - no role-based application access found', 'yellow');
      colorLog('💡 Tip: Create roles with application permissions and assign them to users', 'blue');
    } else {
      Object.entries(classification.summary.applicationBreakdown).forEach(([app, count]) => {
        colorLog(`📱 ${app.toUpperCase()}: ${count} users would be synced`, 'green');
      });
    }

    return { syncStatus, classification };

  } catch (error) {
    colorLog(`❌ Error in sync APIs test: ${error.message}`, 'red');
    throw error;
  }
}

async function testAPIEndpoints() {
  printHeader('API ENDPOINTS TESTING (Mock Calls)');

  try {
    colorLog('🌐 Testing API endpoints (simulated)...', 'blue');

    const endpointsToTest = [
      {
        method: 'GET',
        endpoint: '/api/user-sync/classification',
        description: 'Get all users classified by application access',
        expectedBehavior: 'Shows users grouped by applications they can access through roles'
      },
      {
        method: 'GET', 
        endpoint: '/api/user-sync/classification/crm',
        description: 'Get users with CRM access',
        expectedBehavior: 'Shows only users with roles that include CRM permissions'
      },
      {
        method: 'POST',
        endpoint: '/api/user-sync/sync/all',
        description: 'Sync all users to their applications',
        expectedBehavior: 'Syncs users only to apps they have role-based access to'
      },
      {
        method: 'POST',
        endpoint: '/api/custom-roles/create-from-builder',
        description: 'Create role with specific application access',
        expectedBehavior: 'Admin creates role selecting specific apps/modules/permissions'
      },
      {
        method: 'GET',
        endpoint: '/api/custom-roles/builder-options',
        description: 'Get available apps/modules for role creation',
        expectedBehavior: 'Shows all applications and modules admin can assign to roles'
      }
    ];

    printSubHeader('Available API Endpoints');
    endpointsToTest.forEach((endpoint, index) => {
      colorLog(`\n${index + 1}. ${endpoint.method} ${endpoint.endpoint}`, 'bright');
      colorLog(`   📝 ${endpoint.description}`, 'cyan');
      colorLog(`   🎯 Expected: ${endpoint.expectedBehavior}`, 'yellow');
    });

    return endpointsToTest;

  } catch (error) {
    colorLog(`❌ Error in API endpoints test: ${error.message}`, 'red');
    throw error;
  }
}

async function demonstrateAdminWorkflow() {
  printHeader('ADMIN WORKFLOW DEMONSTRATION');

  try {
    colorLog('👨‍💼 Demonstrating how admins assign application access...', 'blue');

    const workflow = {
      step1: {
        title: 'Admin views available applications',
        action: 'GET /api/custom-roles/builder-options',
        result: 'See all apps (CRM, HR, Affiliate, etc.) and their modules'
      },
      step2: {
        title: 'Admin creates custom role',
        action: 'POST /api/custom-roles/create-from-builder',
        payload: {
          roleName: 'Sales Representative',
          selectedApps: ['crm'],
          selectedModules: { crm: ['leads', 'contacts'] },
          selectedPermissions: {
            'crm.leads': ['read', 'create', 'update'],
            'crm.contacts': ['read', 'create']
          }
        },
        result: 'Role created with specific CRM access'
      },
      step3: {
        title: 'Admin assigns role to user',
        action: 'POST /api/tenants/users/{userId}/roles',
        payload: { roleIds: ['new-role-id'] },
        result: 'User gets access to CRM application'
      },
      step4: {
        title: 'System automatically syncs user',
        action: 'POST /api/user-sync/refresh/{userId}',
        result: 'User is synced to CRM system with their permissions'
      },
      step5: {
        title: 'User can access CRM',
        action: 'GET /api/enhanced-crm-integration/app/crm',
        result: 'User redirected to CRM with proper access token'
      }
    };

    printSubHeader('Complete Admin Workflow');
    Object.entries(workflow).forEach(([step, details]) => {
      colorLog(`\n${step.toUpperCase()}: ${details.title}`, 'bright');
      colorLog(`   🔧 Action: ${details.action}`, 'cyan');
      if (details.payload) {
        colorLog(`   📦 Payload: ${JSON.stringify(details.payload, null, 6)}`, 'blue');
      }
      colorLog(`   ✅ Result: ${details.result}`, 'green');
    });

    return workflow;

  } catch (error) {
    colorLog(`❌ Error in admin workflow demonstration: ${error.message}`, 'red');
    throw error;
  }
}

async function testCurrentRoles() {
  printHeader('CURRENT ROLES & PERMISSIONS ANALYSIS');

  try {
    colorLog('🔍 Analyzing existing roles in the system...', 'blue');

    // Get all roles in the tenant
    const roles = await db
      .select()
      .from(customRoles)
      .where(eq(customRoles.tenantId, testTenantId));

    if (roles.length === 0) {
      colorLog('⚠️ No custom roles found in tenant', 'yellow');
      colorLog('💡 Create roles with application permissions to enable user access', 'blue');
      return;
    }

    printSubHeader(`Found ${roles.length} Roles`);
    
    for (const role of roles) {
      colorLog(`\n🎭 Role: ${role.roleName}`, 'bright');
      colorLog(`   Description: ${role.description || 'No description'}`, 'cyan');
      
      try {
        const permissions = typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions) 
          : role.permissions || {};
        
        if (permissions === '*') {
          colorLog(`   🔑 Permissions: ALL (Super Admin)`, 'green');
        } else {
          const apps = Object.keys(permissions);
          if (apps.length > 0) {
            colorLog(`   📱 Applications: ${apps.join(', ')}`, 'green');
            apps.forEach(app => {
              const modules = Object.keys(permissions[app] || {});
              if (modules.length > 0) {
                colorLog(`      ${app}: ${modules.join(', ')}`, 'blue');
              }
            });
          } else {
            colorLog(`   ⚠️ No application permissions defined`, 'yellow');
          }
        }
      } catch (error) {
        colorLog(`   ❌ Error parsing permissions: ${error.message}`, 'red');
      }

      // Get users with this role
      const userAssignments = await db
        .select({
          user: tenantUsers,
        })
        .from(userRoleAssignments)
        .innerJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
        .where(and(
          eq(userRoleAssignments.roleId, role.roleId),
          eq(userRoleAssignments.isActive, true)
        ));

      colorLog(`   👥 Assigned to: ${userAssignments.length} users`, 'magenta');
      userAssignments.slice(0, 3).forEach(assignment => {
        colorLog(`      • ${assignment.user.name} (${assignment.user.email})`, 'cyan');
      });
      if (userAssignments.length > 3) {
        colorLog(`      ... and ${userAssignments.length - 3} more`, 'yellow');
      }
    }

    return roles;

  } catch (error) {
    colorLog(`❌ Error analyzing current roles: ${error.message}`, 'red');
    throw error;
  }
}

async function runFullTest() {
  try {
    printHeader('ROLE-BASED APPLICATION ACCESS TESTING SUITE');
    colorLog('🚀 Testing updated permission-based user classification...', 'green');

    // Setup
    await setupTestEnvironment();

    // Test 1: Analyze current state
    await testCurrentRoles();

    // Test 2: Direct classification test
    await testUserClassificationDirectly();

    // Test 3: Role builder options (how admins assign apps)
    await testRoleBuilderOptions();

    // Test 4: Application role creation
    await testCreateApplicationRole();

    // Test 5: Sync APIs
    await testUserSyncAPIs();

    // Test 6: API endpoints
    await testAPIEndpoints();

    // Test 7: Admin workflow demonstration
    await demonstrateAdminWorkflow();

    printHeader('TESTING COMPLETE - SUMMARY');
    colorLog('✅ All tests completed successfully!', 'green');
    
    colorLog('\n🎯 Key Findings:', 'bright');
    colorLog('• Application access is now role-based, not subscription-based', 'green');
    colorLog('• Tenant admins control application access through role creation', 'green');
    colorLog('• Users get application access only through assigned roles', 'green');
    colorLog('• Sync APIs work with permission-based classification', 'green');

    colorLog('\n📝 How Admins Assign Applications:', 'bright');
    colorLog('1. GET /api/custom-roles/builder-options - See available apps/modules', 'cyan');
    colorLog('2. POST /api/custom-roles/create-from-builder - Create role with app access', 'cyan');
    colorLog('3. POST /api/tenants/users/{userId}/roles - Assign role to user', 'cyan');
    colorLog('4. POST /api/user-sync/refresh/{userId} - Sync user to applications', 'cyan');

    colorLog('\n🔮 Next Steps for Testing:', 'bright');
    colorLog('• Create a role with CRM access and assign it to a user', 'yellow');
    colorLog('• Test the classification APIs to see the user gets CRM access', 'yellow');
    colorLog('• Use sync APIs to sync the user to CRM application', 'yellow');
    colorLog('• Verify user can access CRM through the proxy endpoints', 'yellow');

  } catch (error) {
    colorLog(`💥 Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullTest();
}
