#!/usr/bin/env node

/**
 * DATABASE CLEANUP SCRIPT - Node.js Version
 * ========================================
 * This script deletes all data from all tables while respecting foreign key constraints.
 * Uses Drizzle ORM to safely delete data in the correct order.
 *
 * WARNING: This script will PERMANENTLY DELETE ALL DATA in your database!
 * Make sure to backup your data before running this script.
 *
 * Usage:
 *   node delete-all-data.js
 *
 * Or make it executable:
 *   chmod +x delete-all-data.js
 *   ./delete-all-data.js
 */

import { config } from 'dotenv';
config({ path: './.env' });
import { sql, isNull, isNotNull } from 'drizzle-orm';
import { db, systemDbConnection } from './src/db/index.js';
import * as schema from './src/db/schema/index.js';

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================
// Using the project's database configuration from db/index.js
// The db connection is already configured and initialized

// =============================================================================
// CONFIRMATION PROMPT
// =============================================================================
function askForConfirmation() {
  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will DELETE ALL DATA from your database!');
    console.log('This action cannot be undone.');

    // Extract database info from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        const url = new URL(dbUrl);
        console.log('\nDatabase:', url.pathname.substring(1) || 'postgres');
        console.log('Host:', url.hostname);
        console.log('Port:', url.port);
      } catch (error) {
        console.log('\nDatabase URL configured');
      }
    }

    process.stdout.write('\nAre you sure you want to continue? Type "YES" to confirm: ');

    process.stdin.once('data', (data) => {
      const input = data.toString().trim();
      resolve(input === 'YES');
    });
  });
}

// =============================================================================
// DELETE FUNCTIONS
// =============================================================================
async function deleteAllData(db) {
  console.log('\n🗑️  Starting database cleanup...\n');

  try {
    // STEP 1: DELETE CHILD/DEPENDENT RECORDS FIRST
    console.log('📝 Step 1: Deleting child/dependent records...');

    // Delete webhook logs (no dependencies)
    console.log('  Deleting webhook_logs...');
    await db.delete(schema.webhookLogs);

    // Delete responsibility notifications (depends on responsible_persons)
    console.log('  Deleting responsibility_notifications...');
    await db.delete(schema.responsibilityNotifications);

    // Delete responsibility history (depends on responsible_persons)
    console.log('  Deleting responsibility_history...');
    await db.delete(schema.responsibilityHistory);

    // Delete membership history (depends on organization_memberships)
    console.log('  Deleting membership_history...');
    await db.delete(schema.membershipHistory);

    // Delete membership invitations (depends on organization_memberships)
    console.log('  Deleting membership_invitations...');
    await db.delete(schema.membershipInvitations);

    // Delete detailed usage logs (depends on tenants, tenant_users, entities)
    console.log('  Deleting usage_logs...');
    await db.delete(schema.usageLogs);

    // Delete daily usage metrics (depends on tenants, entities)
    console.log('  Deleting usage_metrics_daily...');
    await db.delete(schema.usageMetricsDaily);

    // Delete credit usage tracking (depends on tenants, tenant_users, entities)
    console.log('  Deleting credit_usage...');
    await db.delete(schema.creditUsage);

    // Delete credit configurations
    console.log('  Deleting credit_configurations...');
    await db.delete(schema.creditConfigurations);

    // Delete credit transaction ledger (depends on tenants, tenant_users, entities)
    console.log('  Deleting credit_transactions...');
    await db.delete(schema.creditTransactions);

    // Delete credit purchases (depends on tenants, tenant_users, entities)
    console.log('  Deleting credit_purchases...');
    await db.delete(schema.creditPurchases);

    // Delete tenant invitations (depends on tenants, custom_roles, tenant_users)
    console.log('  Deleting tenant_invitations...');
    await db.delete(schema.tenantInvitations);

    // Delete payment history (depends on tenants, subscriptions)
    console.log('  Deleting payments...');
    await db.delete(schema.payments);

    // Delete user role assignments (depends on tenant_users, custom_roles)
    console.log('  Deleting user_role_assignments...');
    await db.delete(schema.userRoleAssignments);

    // Delete user application permissions (depends on applications, tenant_users)
    console.log('  Deleting user_application_permissions...');
    await db.delete(schema.userApplicationPermissions);

    // Delete user sessions (depends on tenant_users, tenants)
    console.log('  Deleting user_sessions...');
    await db.delete(schema.userSessions);

    // Delete manager relationships (depends on tenant_users, tenants)
    console.log('  Deleting user_manager_relationships...');
    await db.delete(schema.userManagerRelationships);

    // Delete audit logs (depends on tenant_users, tenants)
    console.log('  Deleting audit_logs...');
    await db.delete(schema.auditLogs);

    // Delete onboarding events (depends on tenants)
    console.log('  Deleting onboarding_events...');
    await db.delete(schema.onboardingEvents);

    // STEP 2: DELETE INTERMEDIATE RECORDS
    console.log('\n📋 Step 2: Deleting intermediate records...');

    // Delete organization memberships (depends on tenant_users, tenants, custom_roles, entities)
    console.log('  Deleting organization_memberships...');
    await db.delete(schema.organizationMemberships);

    // Delete responsible persons (depends on tenant_users, tenants)
    console.log('  Deleting responsible_persons...');
    await db.delete(schema.responsiblePersons);

    // Delete custom roles (depends on tenant_users, tenants, entities)
    console.log('  Deleting custom_roles...');
    await db.delete(schema.customRoles);

    // Delete credit balances (depends on tenants, entities)
    console.log('  Deleting credits...');
    await db.delete(schema.credits);

    // Delete entities (depends on tenant_users, tenants, entities - self-referencing)
    // Delete child entities first (those with parent_entity_id)
    console.log('  Deleting child entities...');
    await db.delete(schema.entities).where(isNotNull(schema.entities.parentEntityId));

    // Then delete root entities
    console.log('  Deleting root entities...');
    await db.delete(schema.entities).where(isNull(schema.entities.parentEntityId));

    // Delete subscriptions (depends on tenants, entities)
    console.log('  Deleting subscriptions...');
    await db.delete(schema.subscriptions);

    // Delete organization applications (depends on entities, applications)
    console.log('  Deleting organization_applications...');
    await db.delete(schema.organizationApplications);

    // Delete application modules (depends on applications)
    console.log('  Deleting application_modules...');
    await db.delete(schema.applicationModules);

    // Delete applications (top-level)
    console.log('  Deleting applications...');
    await db.delete(schema.applications);

    // STEP 3: DELETE PARENT RECORDS
    console.log('\n🏢 Step 3: Deleting parent records...');

    // Delete tenant users (depends on tenants)
    console.log('  Deleting tenant_users...');
    await db.delete(schema.tenantUsers);

    // Delete tenants (top-level table)
    console.log('  Deleting tenants...');
    await db.delete(schema.tenants);

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('All data has been deleted while preserving table structure and constraints.');

  } catch (error) {
    console.error('\n❌ Error during database cleanup:', error);
    throw error;
  }
}

// =============================================================================
// VERIFICATION FUNCTION
// =============================================================================
async function verifyCleanup(db) {
  console.log('\n🔍 Verifying cleanup...');

  const tableSchemas = [
    { name: 'tenants', schema: schema.tenants },
    { name: 'tenant_users', schema: schema.tenantUsers },
    { name: 'entities', schema: schema.entities },
    { name: 'custom_roles', schema: schema.customRoles },
    { name: 'subscriptions', schema: schema.subscriptions },
    { name: 'payments', schema: schema.payments },
    { name: 'credits', schema: schema.credits },
    { name: 'credit_transactions', schema: schema.creditTransactions },
    { name: 'credit_purchases', schema: schema.creditPurchases },
    { name: 'credit_usage', schema: schema.creditUsage },
    { name: 'credit_configurations', schema: schema.creditConfigurations },
    { name: 'usage_logs', schema: schema.usageLogs },
    { name: 'usage_metrics_daily', schema: schema.usageMetricsDaily },
    { name: 'audit_logs', schema: schema.auditLogs },
    { name: 'user_sessions', schema: schema.userSessions },
    { name: 'user_manager_relationships', schema: schema.userManagerRelationships },
    { name: 'organization_memberships', schema: schema.organizationMemberships },
    { name: 'membership_invitations', schema: schema.membershipInvitations },
    { name: 'membership_history', schema: schema.membershipHistory },
    { name: 'responsible_persons', schema: schema.responsiblePersons },
    { name: 'responsibility_history', schema: schema.responsibilityHistory },
    { name: 'responsibility_notifications', schema: schema.responsibilityNotifications },
    { name: 'tenant_invitations', schema: schema.tenantInvitations },
    { name: 'user_role_assignments', schema: schema.userRoleAssignments },
    { name: 'onboarding_events', schema: schema.onboardingEvents },
    { name: 'webhook_logs', schema: schema.webhookLogs },
    { name: 'applications', schema: schema.applications },
    { name: 'application_modules', schema: schema.applicationModules },
    { name: 'organization_applications', schema: schema.organizationApplications },
    { name: 'user_application_permissions', schema: schema.userApplicationPermissions }
  ];

  let totalRecords = 0;

  for (const { name, schema: tableSchema } of tableSchemas) {
    try {
      // Query actual record count
      const result = await db.select({ count: sql`count(*)` }).from(tableSchema);
      const count = result[0]?.count || 0;
      totalRecords += count;

      if (count === 0) {
        console.log(`  ✓ ${name}: 0 records`);
      } else {
        console.log(`  ⚠️  ${name}: ${count} records remaining`);
      }
    } catch (error) {
      console.log(`  ⚠️  ${name}: could not verify (${error.message})`);
    }
  }

  console.log(`\n📊 Verification complete. Total records remaining: ${totalRecords}`);

  if (totalRecords === 0) {
    console.log('✅ All tables are empty!');
  } else {
    console.log('⚠️  Some tables still contain data. You may want to investigate.');
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================
async function main() {
  console.log('🗑️  Database Cleanup Script');
  console.log('========================');

  try {
    // Test connection using existing db instance
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful');

    // Ask for confirmation
    const confirmed = await askForConfirmation();

    if (!confirmed) {
      console.log('\n❌ Operation cancelled by user.');
      process.exit(0);
    }

    // Execute cleanup using the project's db instance
    await deleteAllData(db);

    // Optional verification
    await verifyCleanup(db);

    console.log('\n🎉 Script completed successfully!');

  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Script interrupted by user. Changes may have been partially applied.');
  process.exit(1);
});

// Run the script
main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
