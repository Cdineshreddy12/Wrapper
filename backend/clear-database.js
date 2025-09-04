import postgres from 'postgres';
import 'dotenv/config';

async function clearDatabase() {
  console.log('🧹 Starting database cleanup with TRUNCATE CASCADE...');

  // Create direct postgres connection
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // Use TRUNCATE with CASCADE to clear all tables regardless of foreign key constraints
    const tablesToClear = [
      'audit_logs',
      'usage_metrics_daily',
      'payments',
      'credit_alerts',
      'credit_transactions',
      'credit_transfers',
      'credit_usage',
      'credit_purchases',
      'credits',
      'membership_bulk_operations',
      'membership_history',
      'membership_invitations',
      'organization_memberships',
      'organization_applications',
      'location_usage',
      'location_resources',
      'location_assignments',
      'locations',
      'responsible_persons',
      'tenant_invitations',
      'organization_locations',
      'organization_relationships',
      'organizations',
      'user_role_assignments',
      'custom_roles',
      'subscriptions',
      'trial_events',
      'tenant_users',
      'tenants',
      'discount_tiers',
      'purchase_templates',
      'credit_configurations'
    ];

    for (const table of tablesToClear) {
      console.log(`🗑️ Clearing table: ${table}`);
      try {
        await sql`TRUNCATE TABLE ${sql(table)} CASCADE`;
        console.log(`✅ Cleared: ${table}`);
      } catch (tableError) {
        console.warn(`⚠️ Could not clear ${table}: ${tableError.message}`);
        // Continue with other tables
      }
    }

    console.log('✅ Database cleanup completed successfully!');
    console.log('📊 All tables have been truncated with CASCADE.');

    // Verify cleanup by checking a few key tables
    const tenantCount = await sql`SELECT COUNT(*) as count FROM tenants`;
    const userCount = await sql`SELECT COUNT(*) as count FROM tenant_users`;
    const orgCount = await sql`SELECT COUNT(*) as count FROM organizations`;

    console.log('🔍 Verification:');
    console.log(`🏢 Tenants: ${tenantCount[0].count}`);
    console.log(`👥 Users: ${userCount[0].count}`);
    console.log(`🏢 Organizations: ${orgCount[0].count}`);

    if (tenantCount[0].count == 0 && userCount[0].count == 0 && orgCount[0].count == 0) {
      console.log('✅ All data successfully cleared!');
    } else {
      console.log('⚠️ Some data may still exist. Please check manually.');
    }

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

// Run the cleanup
clearDatabase().catch(console.error);
