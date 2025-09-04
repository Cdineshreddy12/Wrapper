import postgres from 'postgres';
import 'dotenv/config';

async function deleteAllDatabaseData() {
  // Create direct postgres connection
  const sql = postgres(process.env.DATABASE_URL);

  console.log('🆘 DANGER: DELETING ALL DATABASE DATA');
  console.log('⏳ This will permanently remove ALL data from the database');
  console.log('⚠️  This action cannot be undone!');
  console.log('');

  // Get confirmation from user
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise((resolve) => {
    rl.question('🔴 Type "YES, DELETE EVERYTHING" to confirm: ', resolve);
  });

  rl.close();

  if (answer !== 'YES, DELETE EVERYTHING') {
    console.log('❌ Deletion cancelled');
    await sql.end();
    process.exit(0);
  }

  try {
    console.log('🔄 Starting database cleanup...\n');

    // Get counts before deletion
    console.log('📊 Counting records before deletion...');

    const tables = [
      'activity_logs',
      'app_credit_configurations',
      'application_modules',
      'applications',
      'audit_logs',
      'configuration_change_history',
      'credit_alerts',
      'credit_configuration_templates',
      'credit_configurations',
      'credit_purchases',
      'credit_transactions',
      'credit_transfers',
      'credit_usage',
      'credits',
      'custom_roles',
      'discount_tiers',
      'location_assignments',
      'location_resources',
      'location_usage',
      'locations',
      'membership_bulk_operations',
      'membership_history',
      'membership_invitations',
      'module_credit_configurations',
      'organization_applications',
      'organization_locations',
      'organization_relationships',
      'organization_memberships',
      'organizations',
      'payments',
      'purchase_history',
      'purchase_templates',
      'responsible_persons',
      'sso_tokens',
      'subscription_actions',
      'subscriptions',
      'tenant_invitations',
      'tenant_users',
      'tenants',
      'transfer_approval_rules',
      'transfer_history',
      'transfer_limits',
      'transfer_notifications',
      'trial_events',
      'trial_restrictions',
      'usage_aggregation',
      'usage_alerts',
      'usage_logs',
      'usage_metrics_daily',
      'usage_patterns',
      'usage_quotas',
      'user_application_permissions',
      'user_role_assignments',
      'user_sessions',
      'webhook_logs'
    ];

    // Count records in each table
    const counts = {};
    for (const table of tables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        counts[table] = parseInt(result[0].count);
      } catch (error) {
        // Table might not exist, skip it
        console.log(`⚠️  Table ${table} not found, skipping...`);
      }
    }

    console.log('📈 Current database state:');
    let totalRecords = 0;
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
      totalRecords += count;
    });
    console.log(`\n📊 Total records to delete: ${totalRecords}\n`);

    // Delete in correct order to avoid foreign key constraint violations
    console.log('🗑️  Deleting data (order matters for foreign key constraints)...\n');

    // Delete in dependency order (children first, then parents)

    // 1. Delete webhook and activity logs first (no dependencies)
    console.log('1. Deleting webhook logs and activity logs...');
    await sql`DELETE FROM webhook_logs`;
    await sql`DELETE FROM activity_logs`;
    console.log('   ✅ Webhook logs and activity logs deleted');

    // 2. Delete SSO tokens
    console.log('2. Deleting SSO tokens...');
    await sql`DELETE FROM sso_tokens`;
    console.log('   ✅ SSO tokens deleted');

    // 3. Delete user sessions
    console.log('3. Deleting user sessions...');
    await sql`DELETE FROM user_sessions`;
    console.log('   ✅ User sessions deleted');

    // 4. Delete trial events and restrictions
    console.log('4. Deleting trial events and restrictions...');
    await sql`DELETE FROM trial_events`;
    await sql`DELETE FROM trial_restrictions`;
    console.log('   ✅ Trial events and restrictions deleted');

    // 5. Delete transfer related data
    console.log('5. Deleting transfer data...');
    await sql`DELETE FROM transfer_notifications`;
    await sql`DELETE FROM transfer_limits`;
    await sql`DELETE FROM transfer_history`;
    await sql`DELETE FROM transfer_approval_rules`;
    console.log('   ✅ Transfer data deleted');

    // 6. Delete credit related data
    console.log('6. Deleting credit data...');
    await sql`DELETE FROM credit_alerts`;
    await sql`DELETE FROM credit_usage`;
    await sql`DELETE FROM credit_transactions`;
    await sql`DELETE FROM credit_purchases`;
    await sql`DELETE FROM credit_transfers`;
    await sql`DELETE FROM credits`;
    console.log('   ✅ Credit data deleted');

    // 7. Delete usage and metrics data
    console.log('7. Deleting usage and metrics data...');
    await sql`DELETE FROM usage_alerts`;
    await sql`DELETE FROM usage_logs`;
    await sql`DELETE FROM usage_patterns`;
    await sql`DELETE FROM usage_quotas`;
    await sql`DELETE FROM usage_aggregation`;
    await sql`DELETE FROM usage_metrics_daily`;
    console.log('   ✅ Usage and metrics data deleted');

    // 8. Delete application and module data
    console.log('8. Deleting application and module data...');
    await sql`DELETE FROM user_application_permissions`;
    await sql`DELETE FROM organization_applications`;
    await sql`DELETE FROM module_credit_configurations`;
    await sql`DELETE FROM app_credit_configurations`;
    await sql`DELETE FROM application_modules`;
    await sql`DELETE FROM applications`;
    console.log('   ✅ Application and module data deleted');

    // 9. Delete location related data
    console.log('9. Deleting location data...');
    await sql`DELETE FROM location_usage`;
    await sql`DELETE FROM location_resources`;
    await sql`DELETE FROM location_assignments`;
    await sql`DELETE FROM organization_locations`;
    await sql`DELETE FROM locations`;
    console.log('   ✅ Location data deleted');

    // 10. Delete membership and invitation data
    console.log('10. Deleting membership and invitation data...');
    await sql`DELETE FROM membership_bulk_operations`;
    await sql`DELETE FROM membership_history`;
    await sql`DELETE FROM membership_invitations`;
    await sql`DELETE FROM organization_memberships`;
    console.log('   ✅ Membership and invitation data deleted');

    // 11. Delete organization relationships
    console.log('11. Deleting organization relationships...');
    await sql`DELETE FROM organization_relationships`;
    console.log('   ✅ Organization relationships deleted');

    // 12. Delete responsible persons
    console.log('12. Deleting responsible persons...');
    await sql`DELETE FROM responsible_persons`;
    console.log('   ✅ Responsible persons deleted');

    // 13. Delete user role assignments
    console.log('13. Deleting user role assignments...');
    await sql`DELETE FROM user_role_assignments`;
    console.log('   ✅ User role assignments deleted');

    // 14. Delete custom roles
    console.log('14. Deleting custom roles...');
    await sql`DELETE FROM custom_roles`;
    console.log('   ✅ Custom roles deleted');

    // 15. Delete discount tiers and purchase templates
    console.log('15. Deleting discount tiers and purchase templates...');
    await sql`DELETE FROM discount_tiers`;
    await sql`DELETE FROM purchase_templates`;
    await sql`DELETE FROM purchase_history`;
    console.log('   ✅ Discount tiers and purchase templates deleted');

    // 16. Delete subscription actions and payments
    console.log('16. Deleting subscription actions and payments...');
    await sql`DELETE FROM subscription_actions`;
    await sql`DELETE FROM payments`;
    console.log('   ✅ Subscription actions and payments deleted');

    // 17. Delete credit configurations
    console.log('17. Deleting credit configurations...');
    await sql`DELETE FROM credit_configuration_templates`;
    await sql`DELETE FROM credit_configurations`;
    console.log('   ✅ Credit configurations deleted');

    // 18. Delete configuration change history
    console.log('18. Deleting configuration change history...');
    await sql`DELETE FROM configuration_change_history`;
    console.log('   ✅ Configuration change history deleted');

    // 19. Delete tenant invitations
    console.log('19. Deleting tenant invitations...');
    await sql`DELETE FROM tenant_invitations`;
    console.log('   ✅ Tenant invitations deleted');

    // 20. Delete audit logs
    console.log('20. Deleting audit logs...');
    await sql`DELETE FROM audit_logs`;
    console.log('   ✅ Audit logs deleted');

    // 21. Delete subscriptions
    console.log('21. Deleting subscriptions...');
    await sql`DELETE FROM subscriptions`;
    console.log('   ✅ Subscriptions deleted');

    // 22. Delete organizations first (has foreign key to tenant_users)
    console.log('22. Deleting organizations...');
    await sql`DELETE FROM organizations`;
    console.log('   ✅ Organizations deleted');

    // 23. Delete tenant users (depends on tenants)
    console.log('23. Deleting tenant users...');
    await sql`DELETE FROM tenant_users`;
    console.log('   ✅ Tenant users deleted');

    // 24. Delete tenants (no dependencies)
    console.log('24. Deleting tenants...');
    await sql`DELETE FROM tenants`;
    console.log('   ✅ Tenants deleted');

    console.log('\n🎉 All database data has been successfully deleted!');
    console.log('📊 Verifying deletion...\n');

    // Verify all tables are empty
    console.log('📋 Verification results:');
    let allEmpty = true;
    let verifiedRecords = 0;

    for (const table of tables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        const count = parseInt(result[0].count);
        verifiedRecords += count;
        console.log(`   ${table}: ${count} records`);

        if (count > 0) {
          allEmpty = false;
          console.log(`   ⚠️  WARNING: ${table} still has ${count} records!`);
        }
      } catch (error) {
        // Table might not exist, that's fine
      }
    }

    console.log(`\n📊 Total records remaining: ${verifiedRecords}`);

    if (allEmpty) {
      console.log('\n✅ VERIFICATION COMPLETE: All tables are now empty');
      console.log('🗑️  Database cleanup successful');
    } else {
      console.log('\n⚠️  VERIFICATION FAILED: Some tables still contain data');
      console.log('🔧 You may need to manually delete remaining records');
    }

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close the connection
    await sql.end();
  }
}

// Run the cleanup
deleteAllDatabaseData().then(() => {
  console.log('\n🏁 Database cleanup script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});