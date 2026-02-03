#!/usr/bin/env node
/**
 * Deletes all tenant data (tenants + tenant_users and all tables with tenant_id FK).
 * Run from backend: node scripts/delete-all-tenant-data.js
 */
import 'dotenv/config';
import postgres from 'postgres';

const DELETE_ORDER = [
  'notifications',
  'usage_metrics_daily',
  'usage_logs',
  'credit_usage',
  'credit_transactions',
  'credit_purchases',
  'credits',
  'credit_configurations',
  'subscriptions',
  'payments',
  'user_role_assignments',
  'organization_memberships',
  'custom_roles',
  'tenant_invitations',
  'entities',
  'onboarding_events',
  'admin_notification_history',
  'tenant_template_customizations',
  'seasonal_credit_allocations',
  'seasonal_credit_campaigns',
  'responsible_persons',
  'organization_applications',
  'user_application_permissions',
  'audit_logs',
  'user_manager_relationships',
  'user_sessions',
  'notification_templates',
  'tenant_users',
  'tenants',
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    console.log('Deleting all tenant data...');
    await sql.unsafe('UPDATE tenant_users SET primary_organization_id = NULL WHERE primary_organization_id IS NOT NULL');
    for (const table of DELETE_ORDER) {
      try {
        const result = await sql.unsafe(`DELETE FROM ${table}`);
        const count = result?.count ?? result?.length ?? 0;
        if (count > 0) console.log(`  ${table}: ${count} rows`);
      } catch (e) {
        if (e.code === '42P01') continue; // skip missing table
        throw e;
      }
    }
    console.log('✅ All tenant data deleted.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
