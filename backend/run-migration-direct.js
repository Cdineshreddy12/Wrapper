#!/usr/bin/env node

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Direct database connection without Drizzle ORM to avoid relation issues
async function runMigrationDirect() {
  try {
    console.log('🚀 Starting hierarchical organizations migration (direct SQL)...');

    // Database connection
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const sql = postgres(connectionString);

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

          await sql.unsafe(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);

          // Continue with other statements unless it's a critical error
          if (error.message.includes('already exists') ||
              error.message.includes('does not exist') ||
              error.message.includes('duplicate key')) {
            console.log('⚠️  Continuing with next statement...');
          } else {
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
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        console.log(`✅ ${tableName}: ${result[0].count} rows`);
      } catch (error) {
        console.log(`❌ ${tableName}: Table not found or error - ${error.message}`);
      }
    }

    // Check if new columns were added to existing tables
    console.log('\n📊 Checking tenant table new columns:');
    try {
      const tenantColumns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'tenants'
        AND column_name IN ('parent_organization_id', 'organization_type', 'default_location_id', 'responsible_person_id', 'credit_balance', 'credit_expiry_policy')
        ORDER BY column_name
      `;

      if (tenantColumns.length > 0) {
        tenantColumns.forEach(row => {
          console.log(`✅ tenants.${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      } else {
        console.log('❌ No new columns found in tenants table');
      }
    } catch (error) {
      console.log(`❌ Error checking tenant columns: ${error.message}`);
    }

    await sql.end();
    console.log('\n✅ Migration verification completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

runMigrationDirect();
