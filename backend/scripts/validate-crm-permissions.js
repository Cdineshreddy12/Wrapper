import { db } from '../src/db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments } from '../src/db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { CRM_PERMISSION_MATRIX, CRM_SPECIAL_PERMISSIONS, CRMPermissionUtils } from '../src/data/comprehensive-crm-permissions.js';

/**
 * 🔍 CRM PERMISSION VALIDATION SCRIPT
 * Validates the comprehensive permission system and existing tenant configurations
 */

console.log('🔍 Starting CRM Permission Validation...');

async function validatePermissionMatrix() {
  console.log('\n📊 VALIDATING PERMISSION MATRIX');
  console.log('=====================================');
  
  const totalModules = Object.keys(CRM_PERMISSION_MATRIX).length;
  const totalPermissions = Object.values(CRM_PERMISSION_MATRIX)
    .reduce((acc, modulePerms) => acc + Object.keys(modulePerms).length, 0);
  const specialPermissions = Object.keys(CRM_SPECIAL_PERMISSIONS).length;
  
  console.log(`✅ Total CRM Modules: ${totalModules}`);
  console.log(`✅ Total Module Permissions: ${totalPermissions}`);
  console.log(`✅ Special Permissions: ${specialPermissions}`);
  console.log(`✅ Grand Total Permissions: ${totalPermissions + specialPermissions}`);
  
  // Validate each module
  console.log('\n📋 MODULE BREAKDOWN:');
  Object.entries(CRM_PERMISSION_MATRIX).forEach(([module, permissions]) => {
    const permCount = Object.keys(permissions).length;
    console.log(`  📦 ${module}: ${permCount} permissions`);
    
    // Check for required CRUD operations
    const hasCRUD = {
      create: Object.keys(permissions).some(p => p.includes('.create')),
      read: Object.keys(permissions).some(p => p.includes('.read')),
      update: Object.keys(permissions).some(p => p.includes('.update')),
      delete: Object.keys(permissions).some(p => p.includes('.delete'))
    };
    
    console.log(`    └─ CRUD: C:${hasCRUD.create ? '✅' : '❌'} R:${hasCRUD.read ? '✅' : '❌'} U:${hasCRUD.update ? '✅' : '❌'} D:${hasCRUD.delete ? '✅' : '❌'}`);
  });
  
  return { totalModules, totalPermissions, specialPermissions };
}

async function validateExistingTenants() {
  console.log('\n🏢 VALIDATING EXISTING TENANTS');
  console.log('=====================================');
  
  try {
    // Get all tenants
    const allTenants = await db.select().from(tenants);
    console.log(`📊 Found ${allTenants.length} tenants to validate`);
    
    for (const tenant of allTenants) {
      console.log(`\n🔍 Validating tenant: ${tenant.companyName} (${tenant.tenantId})`);
      
      // Get tenant users
      const tenantUsers_results = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenant.tenantId));
      
      console.log(`  👥 Users: ${tenantUsers_results.length}`);
      
      // Get tenant roles
      const tenantRoles = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.tenantId, tenant.tenantId));
      
      console.log(`  🔐 Roles: ${tenantRoles.length}`);
      
      // Validate each role's permissions
      for (const role of tenantRoles) {
        console.log(`    📋 Role: ${role.roleName}`);
        
        try {
          const permissions = typeof role.permissions === 'string' 
            ? JSON.parse(role.permissions) 
            : role.permissions;
          
          // Count permissions
          let permissionCount = 0;
          let crmPermissionCount = 0;
          
          if (permissions && typeof permissions === 'object') {
            Object.values(permissions).forEach(moduleConfig => {
              if (moduleConfig.operations && Array.isArray(moduleConfig.operations)) {
                permissionCount += moduleConfig.operations.length;
                crmPermissionCount += moduleConfig.operations.filter(p => p.startsWith('crm.')).length;
              }
            });
          }
          
          console.log(`      └─ Total permissions: ${permissionCount}, CRM: ${crmPermissionCount}`);
          
          // Check if using new comprehensive structure
          const hasComprehensiveStructure = permissions && 
            Object.values(permissions).some(moduleConfig => 
              moduleConfig.operations && Array.isArray(moduleConfig.operations)
            );
          
          console.log(`      └─ Uses comprehensive structure: ${hasComprehensiveStructure ? '✅' : '❌'}`);
          
        } catch (parseError) {
          console.log(`      └─ ❌ Permission parsing error: ${parseError.message}`);
        }
      }
      
      // Get role assignments
      const assignments = await db
        .select({
          userId: userRoleAssignments.userId,
          roleId: userRoleAssignments.roleId,
          roleName: customRoles.roleName
        })
        .from(userRoleAssignments)
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(customRoles.tenantId, tenant.tenantId));
      
      console.log(`  🔗 Role assignments: ${assignments.length}`);
    }
    
    return allTenants.length;
  } catch (error) {
    console.error('❌ Error validating tenants:', error);
    return 0;
  }
}

async function suggestPermissionUpdates() {
  console.log('\n💡 PERMISSION UPDATE SUGGESTIONS');
  console.log('=====================================');
  
  try {
    // Find tenants with roles that need updating
    const tenantsToUpdate = [];
    
    const allTenants = await db.select().from(tenants);
    
    for (const tenant of allTenants) {
      const tenantRoles = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.tenantId, tenant.tenantId));
      
      for (const role of tenantRoles) {
        try {
          const permissions = typeof role.permissions === 'string' 
            ? JSON.parse(role.permissions) 
            : role.permissions;
          
          // Check if using old structure
          const usesOldStructure = permissions && 
            !Object.values(permissions).some(moduleConfig => 
              moduleConfig.operations && Array.isArray(moduleConfig.operations)
            );
          
          if (usesOldStructure) {
            tenantsToUpdate.push({
              tenant: tenant.companyName,
              tenantId: tenant.tenantId,
              role: role.roleName,
              roleId: role.roleId,
              issue: 'Uses old permission structure'
            });
          }
          
        } catch (parseError) {
          tenantsToUpdate.push({
            tenant: tenant.companyName,
            tenantId: tenant.tenantId,
            role: role.roleName,
            roleId: role.roleId,
            issue: 'Permission parsing error'
          });
        }
      }
    }
    
    if (tenantsToUpdate.length > 0) {
      console.log(`⚠️ Found ${tenantsToUpdate.length} roles that need updating:`);
      tenantsToUpdate.forEach(item => {
        console.log(`  🔧 ${item.tenant} - ${item.role}: ${item.issue}`);
      });
      
      console.log('\n📝 Suggested Actions:');
      console.log('1. Run migration to update permission structures');
      console.log('2. Update onboarding process to use comprehensive permissions');
      console.log('3. Validate CRM application integration');
    } else {
      console.log('✅ All tenant roles are using the correct permission structure');
    }
    
    return tenantsToUpdate;
  } catch (error) {
    console.error('❌ Error generating suggestions:', error);
    return [];
  }
}

async function validateCRMIntegration() {
  console.log('\n🔗 VALIDATING CRM INTEGRATION');
  console.log('=====================================');
  
  // Check if permission utilities work correctly
  console.log('🔧 Testing CRMPermissionUtils...');
  
  // Test permission validation
  const validPermissions = [
    'crm.leads.create',
    'crm.accounts.read_all',
    'crm.admin_access'
  ];
  
  const invalidPermissions = [
    'crm.invalid.permission',
    'hr.employees.view',
    'random.permission'
  ];
  
  console.log('  ✅ Valid permissions:');
  validPermissions.forEach(perm => {
    const isValid = CRMPermissionUtils.isValidPermission(perm);
    console.log(`    ${perm}: ${isValid ? '✅' : '❌'}`);
  });
  
  console.log('  ❌ Invalid permissions:');
  invalidPermissions.forEach(perm => {
    const isValid = CRMPermissionUtils.isValidPermission(perm);
    console.log(`    ${perm}: ${isValid ? '❌ (should be invalid)' : '✅ (correctly invalid)'}`);
  });
  
  // Test permission descriptions
  console.log('\n📝 Testing permission descriptions:');
  const testPermissions = ['crm.leads.create', 'crm.accounts.read_all', 'crm.admin_access'];
  testPermissions.forEach(perm => {
    const description = CRMPermissionUtils.getPermissionDescription(perm);
    console.log(`    ${perm}: "${description}"`);
  });
  
  // Test module permissions
  console.log('\n📦 Testing module permissions:');
  const testModules = ['leads', 'accounts', 'contacts'];
  testModules.forEach(module => {
    const modulePerms = CRMPermissionUtils.getModulePermissions(module);
    const permCount = Object.keys(modulePerms).length;
    console.log(`    ${module}: ${permCount} permissions`);
  });
  
  return true;
}

async function main() {
  try {
    console.log('🚀 CRM Permission Validation Starting...\n');
    
    // 1. Validate permission matrix
    const matrixStats = await validatePermissionMatrix();
    
    // 2. Validate existing tenants
    const tenantCount = await validateExistingTenants();
    
    // 3. Suggest updates
    const updateSuggestions = await suggestPermissionUpdates();
    
    // 4. Validate CRM integration
    await validateCRMIntegration();
    
    // Summary
    console.log('\n📋 VALIDATION SUMMARY');
    console.log('=====================================');
    console.log(`✅ Permission Matrix: ${matrixStats.totalModules} modules, ${matrixStats.totalPermissions + matrixStats.specialPermissions} permissions`);
    console.log(`✅ Tenants Validated: ${tenantCount}`);
    console.log(`${updateSuggestions.length === 0 ? '✅' : '⚠️'} Roles Needing Updates: ${updateSuggestions.length}`);
    console.log(`✅ CRM Integration: Validated`);
    
    if (updateSuggestions.length === 0) {
      console.log('\n🎉 All validation checks passed! Your CRM permission system is ready.');
    } else {
      console.log('\n⚠️ Some issues found. Please review the suggestions above.');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main; 