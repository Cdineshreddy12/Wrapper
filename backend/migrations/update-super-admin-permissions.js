// 🔄 **DATABASE MIGRATION: Update Super Administrator Permissions**
// This script updates existing Super Administrator roles with comprehensive audit permissions
// Run this after updating the permission matrix to sync existing database records

import { db } from '../src/db/index.js';
import { customRoles } from '../src/db/schema/index.js';
import { eq, and, like } from 'drizzle-orm';
import { generateSuperAdminPermissions } from '../src/utils/super-admin-permissions.js';

/**
 * Update existing Super Administrator roles with comprehensive audit permissions
 */
async function updateSuperAdminPermissions() {
  console.log('🔄 Starting Super Administrator permissions update...');
  
  try {
    // Find all Super Administrator roles
    const superAdminRoles = await db
      .select()
      .from(customRoles)
      .where(
        and(
          like(customRoles.roleName, '%Super Administrator%'),
          eq(customRoles.isSystemRole, true)
        )
      );
    
    console.log(`📋 Found ${superAdminRoles.length} Super Administrator roles to update`);
    
    if (superAdminRoles.length === 0) {
      console.log('ℹ️ No Super Administrator roles found to update');
      return;
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const role of superAdminRoles) {
      try {
        console.log(`\n🔍 Processing role: ${role.roleName} (${role.roleId})`);
        console.log(`   Tenant: ${role.tenantId}`);
        console.log(`   Current permissions count: ${JSON.stringify(role.permissions).length} characters`);
        
        // Get the tenant's subscription plan (default to 'starter' if unknown)
        let plan = 'starter';
        try {
          const { subscriptions } = await import('../src/db/schema/subscriptions.js');
          const [subscription] = await db
            .select({ plan: subscriptions.plan })
            .from(subscriptions)
            .where(eq(subscriptions.tenantId, role.tenantId))
            .limit(1);
          
          if (subscription?.plan) {
            plan = subscription.plan;
            console.log(`   Detected plan: ${plan}`);
          }
        } catch (error) {
          console.log(`   Could not detect plan, using default: ${plan}`);
        }
        
        // Generate new comprehensive permissions for this plan
        const newPermissions = generateSuperAdminPermissions(plan);
        
        // Update the role with new permissions
        const [updatedRole] = await db
          .update(customRoles)
          .set({
            permissions: newPermissions,
            updatedAt: new Date()
          })
          .where(eq(customRoles.roleId, role.roleId))
          .returning();
        
        if (updatedRole) {
          console.log(`   ✅ Updated successfully`);
          console.log(`   New permissions count: ${JSON.stringify(newPermissions).length} characters`);
          
          // Log some sample permissions for verification
          const systemPermissions = newPermissions.system || {};
          Object.keys(systemPermissions).forEach(module => {
            const modulePermissions = systemPermissions[module];
            if (Array.isArray(modulePermissions)) {
              console.log(`   ${module}: ${modulePermissions.length} permissions`);
            }
          });
          
          updatedCount++;
        } else {
          console.log(`   ❌ Failed to update role`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error updating role ${role.roleName}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   Total roles processed: ${superAdminRoles.length}`);
    console.log(`   Successfully updated: ${updatedCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('✅ All Super Administrator roles updated successfully!');
    } else {
      console.log(`⚠️ ${errorCount} roles had errors during update`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Verify the migration by checking updated roles
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migration results...');
  
  try {
    const updatedRoles = await db
      .select()
      .from(customRoles)
      .where(
        and(
          like(customRoles.roleName, '%Super Administrator%'),
          eq(customRoles.isSystemRole, true)
        )
      );
    
    console.log(`📋 Found ${updatedRoles.length} Super Administrator roles after migration`);
    
    updatedRoles.forEach(role => {
      console.log(`\n🔍 Role: ${role.roleName}`);
      console.log(`   Tenant: ${role.tenantId}`);
      
      if (role.permissions && typeof role.permissions === 'object') {
        const systemPermissions = role.permissions.system || {};
        
        // Check audit permissions
        const auditPermissions = systemPermissions.audit || [];
        const activityLogPermissions = systemPermissions.activity_logs || [];
        const userActivityPermissions = systemPermissions.user_activity || [];
        const dataChangePermissions = systemPermissions.data_changes || [];
        
        console.log(`   Audit permissions: ${auditPermissions.length}`);
        console.log(`   Activity log permissions: ${activityLogPermissions.length}`);
        console.log(`   User activity permissions: ${userActivityPermissions.length}`);
        console.log(`   Data change permissions: ${dataChangePermissions.length}`);
        
        // Verify all required permissions are present
        const requiredAuditCount = 13;
        const requiredActivityLogCount = 13;
        const requiredUserActivityCount = 11;
        const requiredDataChangeCount = 13;
        
        const auditComplete = auditPermissions.length >= requiredAuditCount;
        const activityLogComplete = activityLogPermissions.length >= requiredActivityLogCount;
        const userActivityComplete = userActivityPermissions.length >= requiredUserActivityCount;
        const dataChangeComplete = dataChangePermissions.length >= requiredDataChangeCount;
        
        console.log(`   ✅ Audit: ${auditComplete ? 'Complete' : 'Incomplete'}`);
        console.log(`   ✅ Activity Logs: ${activityLogComplete ? 'Complete' : 'Incomplete'}`);
        console.log(`   ✅ User Activity: ${userActivityComplete ? 'Complete' : 'Incomplete'}`);
        console.log(`   ✅ Data Changes: ${dataChangeComplete ? 'Complete' : 'Incomplete'}`);
        
        if (auditComplete && activityLogComplete && userActivityComplete && dataChangeComplete) {
          console.log(`   🎯 All audit permissions are complete!`);
        } else {
          console.log(`   ⚠️ Some audit permissions are missing`);
        }
      } else {
        console.log(`   ❌ Permissions not in expected format`);
      }
    });
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Super Administrator permissions migration...\n');
  
  try {
    // Step 1: Update existing roles
    await updateSuperAdminPermissions();
    
    // Step 2: Verify the migration
    await verifyMigration();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Restart the wrapper API to pick up new permission matrix');
    console.log('   2. Test Super Administrator role permissions');
    console.log('   3. Verify CRM permissions work correctly');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('\n🎉 Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { runMigration, updateSuperAdminPermissions, verifyMigration };
