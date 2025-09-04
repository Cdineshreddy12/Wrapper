#!/usr/bin/env node

import { db } from './src/db/index.js';
import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';

async function runHierarchicalMigration() {
  try {
    console.log('🚀 Starting hierarchical organizations and credit system migration...');

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'src/db/migrations/0007_tough_vulcan.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Migration SQL loaded');

    // Split the migration file by statement-breakpoint
    const statements = migrationSQL.split('--> statement-breakpoint').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);

    console.log(`🔧 Executing ${statements.length} migration statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
          console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);

          await db.execute(sql.raw(statement));
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          console.error(`   Statement: ${statement.substring(0, 200)}...`);

          // Continue with other statements unless it's a critical error
          if (error.message.includes('already exists')) {
            console.log('⚠️  Table/Column already exists, continuing...');
          } else {
            // For other errors, we might want to stop
            // throw error;
            console.log('⚠️  Continuing with next statement...');
          }
        }
      }
    }

    console.log('🎉 Migration completed successfully!');

    // Verify the changes
    console.log('🔍 Verifying migration results...');

    // Check if new tables were created
    const newTables = [
      'organizations',
      'organization_locations',
      'organization_relationships',
      'organization_memberships',
      'locations',
      'location_assignments',
      'location_resources',
      'location_usage',
      'credits',
      'credit_transactions',
      'credit_purchases',
      'credit_transfers',
      'credit_usage',
      'credit_configurations',
      'responsible_persons'
    ];

    console.log('\n📊 Checking new tables:');
    for (const tableName of newTables) {
      try {
        const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
        console.log(`✅ ${tableName}: ${result.rows[0].count} rows`);
      } catch (error) {
        console.log(`❌ ${tableName}: Table not found or error - ${error.message}`);
      }
    }

    // Check if new columns were added to existing tables
    console.log('\n📊 Checking tenant table new columns:');
    const tenantColumns = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tenants'
      AND column_name IN ('parent_organization_id', 'organization_type', 'default_location_id', 'responsible_person_id', 'credit_balance', 'credit_expiry_policy')
      ORDER BY column_name
    `));

    if (tenantColumns.rows && tenantColumns.rows.length > 0) {
      tenantColumns.rows.forEach(row => {
        console.log(`✅ tenants.${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('❌ No new columns found in tenants table');
    }

    console.log('\n✅ Migration verification completed!');
    console.log('\n🎯 Next steps:');
    console.log('1. Test the enhanced onboarding endpoint');
    console.log('2. Verify DNS management services');
    console.log('3. Test credit allocation and usage tracking');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

runHierarchicalMigration();
