// 🔄 **DATABASE MIGRATION: Update CRM Module Permissions**
// This script adds missing CRM module permissions to Super Administrator role
// Run this after the audit permissions migration to complete the CRM access

import { db } from '../src/db/index.js';
import { customRoles } from '../src/db/schema/index.js';
import { eq, and, like } from 'drizzle-orm';

/**
 * Complete CRM module permissions for Super Administrator role
 */
const COMPLETE_CRM_PERMISSIONS = {
  // Core CRM modules
  leads: [
    "read", "read_all", "create", "update", "delete", 
    "export", "import", "assign", "convert"
  ],
  contacts: [
    "read", "read_all", "create", "update", "delete", 
    "export", "import"
  ],
  accounts: [
    "read", "read_all", "create", "update", "delete", 
    "view_contacts", "export", "import", "assign"
  ],
  opportunities: [
    "read", "read_all", "create", "update", "delete", 
    "export", "import", "close", "assign"
  ],
  quotations: [
    "read", "read_all", "create", "update", "delete", 
    "generate_pdf", "send", "approve", "assign"
  ],
  
  // Missing CRM modules that need to be added
  tickets: [
    "read", "read_all", "create", "update", "delete", 
    "export", "import", "assign", "close", "resolve", "escalate"
  ],
  invoices: [
    "read", "read_all", "create", "update", "delete", 
    "export", "import", "send", "approve", "mark_paid", "generate_pdf"
  ],
  inventory: [
    "read", "read_all", "create", "update", "delete", 
    "export", "import", "adjust", "movement", "low_stock_alerts", "manage_stock"
  ],
  product_orders: [
    "read", "read_all", "create", "update", "delete", 
    "export", "import", "approve", "fulfill", "process"
  ],
  sales_orders: [
    "read", "read_all", "create", "update", "delete", 
    "export", "import", "approve", "fulfill", "process"
  ],
  communications: [
    "read", "read_all", "create", "update", "delete", 
    "send", "schedule", "export", "import"
  ],
  calendar: [
    "read", "read_all", "create", "update", "delete", 
    "schedule", "manage", "share", "export", "import"
  ],
  ai_insights: [
    "read", "read_all", "create", "update", "delete", 
    "export", "schedule", "generate", "analyze"
  ],
  form_builder: [
    "read", "read_all", "create", "update", "delete", 
    "publish", "manage", "design", "deploy"
  ],
  documents: [
    "read", "read_all", "create", "update", "delete", 
    "upload", "download", "share", "version_control"
  ],
  payments: [
    "read", "read_all", "create", "update", "delete", 
    "export", "process", "refund", "reconcile", "manage"
  ],
  
  // Existing modules (keep as is)
  dashboard: [
    "view", "customize", "export"
  ],
  system: [
    "settings_read", "settings_update", "settings_manage",
    "configurations_read", "configurations_create", 
    "configurations_update", "configurations_delete", 
    "configurations_manage",
    "tenant_config_read", "tenant_config_update", 
    "tenant_config_manage",
    "system_config_read", "system_config_update", 
    "system_config_manage",
    "dropdowns_read", "dropdowns_create", "dropdowns_update", 
    "dropdowns_delete", "dropdowns_manage",
    "integrations_read", "integrations_create", 
    "integrations_update", "integrations_delete", 
    "integrations_manage",
    "backup_read", "backup_create", "backup_restore", 
    "backup_manage",
    "maintenance_read", "maintenance_perform", 
    "maintenance_schedule",
    "users_read", "users_read_all", "users_create", 
    "users_update", "users_delete", "users_activate", 
    "users_reset_password", "users_export", "users_import",
    "roles_read", "roles_read_all", "roles_create", 
    "roles_update", "roles_delete", "roles_assign", 
    "roles_export",
    "activity_logs_read", "activity_logs_read_all", 
    "activity_logs_export", "activity_logs_purge",
    "reports_read", "reports_read_all", "reports_create", 
    "reports_update", "reports_delete", "reports_export", 
    "reports_schedule",
    "audit_read", "audit_read_all", "audit_export", 
    "audit_view_details", "audit_filter_by_user", 
    "audit_filter_by_action", "audit_filter_by_date_range",
    "audit_filter_by_module", "audit_filter_by_status", 
    "audit_generate_reports", "audit_archive_logs", 
    "audit_purge_old_logs", "audit_trail_export"
  ]
};

/**
 * Update Super Administrator role with complete CRM module permissions
 */
async function updateCRMModulePermissions() {
  console.log('🔄 Starting CRM module permissions update...');
  
  try {
    // Find Super Administrator role
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
        
        // Get current permissions
        const currentPermissions = role.permissions || {};
        console.log(`   Current CRM modules: ${Object.keys(currentPermissions.crm || {}).length}`);
        
        // Update CRM permissions while preserving other modules (HR, affiliate, system)
        const updatedPermissions = {
          ...currentPermissions,
          crm: COMPLETE_CRM_PERMISSIONS
        };
        
        // Update the role
        const [updatedRole] = await db
          .update(customRoles)
          .set({
            permissions: updatedPermissions,
            updatedAt: new Date()
          })
          .where(eq(customRoles.roleId, role.roleId))
          .returning();
        
        if (updatedRole) {
          console.log(`   ✅ Updated successfully`);
          
          // Log CRM module permissions summary
          const crmModules = Object.keys(COMPLETE_CRM_PERMISSIONS);
          console.log(`   📊 CRM Modules: ${crmModules.length} total`);
          
          crmModules.forEach(module => {
            const permissions = COMPLETE_CRM_PERMISSIONS[module];
            console.log(`     ${module}: ${permissions.length} permissions`);
          });
          
          // Count total CRM permissions
          const totalCRMPermissions = Object.values(COMPLETE_CRM_PERMISSIONS)
            .flat()
            .length;
          console.log(`   🎯 Total CRM Permissions: ${totalCRMPermissions}`);
          
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
 * Verify the CRM module permissions update
 */
async function verifyCRMModulePermissions() {
  console.log('\n🔍 Verifying CRM module permissions update...');
  
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
    
    console.log(`📋 Found ${updatedRoles.length} Super Administrator roles after update`);
    
    updatedRoles.forEach(role => {
      console.log(`\n🔍 Role: ${role.roleName}`);
      console.log(`   Tenant: ${role.tenantId}`);
      
      if (role.permissions && typeof role.permissions === 'object') {
        const crmPermissions = role.permissions.crm || {};
        const crmModules = Object.keys(crmPermissions);
        
        console.log(`   CRM Modules: ${crmModules.length}`);
        
        // Check if all required CRM modules are present
        const requiredModules = [
          'leads', 'contacts', 'accounts', 'opportunities', 'quotations',
          'tickets', 'invoices', 'inventory', 'product_orders', 'sales_orders',
          'communications', 'calendar', 'ai_insights', 'form_builder', 
          'documents', 'payments', 'dashboard', 'system'
        ];
        
        const missingModules = requiredModules.filter(module => !crmModules.includes(module));
        const presentModules = requiredModules.filter(module => crmModules.includes(module));
        
        console.log(`   ✅ Present modules: ${presentModules.length}/${requiredModules.length}`);
        if (missingModules.length > 0) {
          console.log(`   ❌ Missing modules: ${missingModules.join(', ')}`);
        } else {
          console.log(`   🎯 All required CRM modules are present!`);
        }
        
        // Show some sample permissions
        const sampleModules = ['tickets', 'invoices', 'inventory', 'product_orders'];
        sampleModules.forEach(module => {
          if (crmPermissions[module]) {
            const permissions = crmPermissions[module];
            console.log(`   ${module}: ${permissions.length} permissions (${permissions.slice(0, 3).join(', ')}...)`);
          }
        });
        
        // Count total CRM permissions
        const totalCRMPermissions = Object.values(crmPermissions)
          .flat()
          .length;
        console.log(`   📊 Total CRM Permissions: ${totalCRMPermissions}`);
        
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
  console.log('🚀 Starting CRM module permissions migration...\n');
  
  try {
    // Step 1: Update CRM module permissions
    await updateCRMModulePermissions();
    
    // Step 2: Verify the update
    await verifyCRMModulePermissions();
    
    console.log('\n✅ CRM module permissions migration completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Restart the wrapper API to pick up new permissions');
    console.log('   2. Test access to all CRM modules (tickets, invoices, inventory, etc.)');
    console.log('   3. Verify admin functionality works (no more 403 errors)');
    console.log('   4. Check that sidebar shows all 15 menu items');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('\n🎉 CRM module permissions migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 CRM module permissions migration failed:', error);
      process.exit(1);
    });
}

export { runMigration, updateCRMModulePermissions, verifyCRMModulePermissions };
