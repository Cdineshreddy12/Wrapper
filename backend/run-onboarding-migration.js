#!/usr/bin/env node

import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function runOnboardingMigration() {
  try {
    console.log('🚀 Starting onboarding fields migration...');
    
    // Define the migration statements for onboarding fields
    const statements = [
      // Add missing fields to tenants table
      `ALTER TABLE tenants 
       ADD COLUMN IF NOT EXISTS legal_company_name VARCHAR(255),
       ADD COLUMN IF NOT EXISTS company_id VARCHAR(100),
       ADD COLUMN IF NOT EXISTS duns_number VARCHAR(50),
       ADD COLUMN IF NOT EXISTS company_type VARCHAR(100),
       ADD COLUMN IF NOT EXISTS ownership VARCHAR(100),
       ADD COLUMN IF NOT EXISTS annual_revenue NUMERIC(15,2),
       ADD COLUMN IF NOT EXISTS number_of_employees INTEGER,
       ADD COLUMN IF NOT EXISTS ticker_symbol VARCHAR(20),
       ADD COLUMN IF NOT EXISTS website VARCHAR(500),
       ADD COLUMN IF NOT EXISTS company_description TEXT,
       ADD COLUMN IF NOT EXISTS founded_date DATE,
       ADD COLUMN IF NOT EXISTS billing_street VARCHAR(255),
       ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100),
       ADD COLUMN IF NOT EXISTS billing_state VARCHAR(100),
       ADD COLUMN IF NOT EXISTS billing_zip VARCHAR(20),
       ADD COLUMN IF NOT EXISTS billing_country VARCHAR(100),
       ADD COLUMN IF NOT EXISTS shipping_street VARCHAR(255),
       ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100),
       ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100),
       ADD COLUMN IF NOT EXISTS shipping_zip VARCHAR(20),
       ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(100),
       ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
       ADD COLUMN IF NOT EXISTS fax VARCHAR(50),
       ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en',
       ADD COLUMN IF NOT EXISTS default_locale VARCHAR(20) DEFAULT 'en-US',
       ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'USD',
       ADD COLUMN IF NOT EXISTS multi_currency_enabled BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS advanced_currency_management BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS default_timezone VARCHAR(50) DEFAULT 'UTC',
       ADD COLUMN IF NOT EXISTS first_day_of_week INTEGER DEFAULT 1`,
      
      // Add missing fields to tenant_users table
      `ALTER TABLE tenant_users 
       ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
       ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
       ADD COLUMN IF NOT EXISTS username VARCHAR(100),
       ADD COLUMN IF NOT EXISTS alias VARCHAR(100),
       ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
       ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),
       ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES tenant_users(user_id),
       ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'`,
      
      // Add performance indexes
      `CREATE INDEX IF NOT EXISTS idx_tenants_industry ON tenants(industry)`,
      `CREATE INDEX IF NOT EXISTS idx_tenants_company_type ON tenants(company_type)`,
      `CREATE INDEX IF NOT EXISTS idx_tenants_company_size ON tenants(company_size)`,
      `CREATE INDEX IF NOT EXISTS idx_tenants_country ON tenants(country)`,
      `CREATE INDEX IF NOT EXISTS idx_tenants_billing_country ON tenants(billing_country)`,
      `CREATE INDEX IF NOT EXISTS idx_tenants_shipping_country ON tenants(shipping_country)`,
      
      // Update existing records with default values
      `UPDATE tenants 
       SET 
         default_language = 'en',
         default_locale = 'en-US', 
         default_currency = 'USD',
         default_timezone = 'UTC',
         first_day_of_week = 1
       WHERE default_language IS NULL`
    ];
    
    console.log(`🔧 Executing ${statements.length} migration statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
          await db.execute(sql.raw(statement));
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('🎉 Onboarding fields migration completed successfully!');
    
    // Verify the changes
    console.log('🔍 Verifying migration results...');
    
    // Check if new columns were added to tenants table
    const tenantsTableInfo = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
        AND column_name IN (
          'legal_company_name', 'company_id', 'duns_number', 'company_type',
          'ownership', 'annual_revenue', 'number_of_employees', 'ticker_symbol',
          'website', 'company_description', 'founded_date', 'billing_street',
          'billing_city', 'billing_state', 'billing_zip', 'billing_country',
          'shipping_street', 'shipping_city', 'shipping_state', 'shipping_zip',
          'shipping_country', 'phone', 'fax', 'default_language', 'default_locale',
          'default_currency', 'multi_currency_enabled', 'advanced_currency_management',
          'default_timezone', 'first_day_of_week'
        )
      ORDER BY column_name
    `));
    
    console.log('📊 New fields added to tenants table:');
    if (tenantsTableInfo.rows) {
      tenantsTableInfo.rows.forEach(row => {
        console.log(`  ✅ ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      console.log(`  📈 Total new fields: ${tenantsTableInfo.rows.length}`);
    } else {
      console.log('  ❌ No new fields found in tenants table');
    }
    
    // Check if new columns were added to tenant_users table
    const usersTableInfo = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenant_users' 
        AND column_name IN (
          'first_name', 'last_name', 'username', 'alias', 'phone', 
          'mobile', 'manager_id', 'profile_data'
        )
      ORDER BY column_name
    `));
    
    console.log('📊 New fields added to tenant_users table:');
    if (usersTableInfo.rows) {
      usersTableInfo.rows.forEach(row => {
        console.log(`  ✅ ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      console.log(`  📈 Total new fields: ${usersTableInfo.rows.length}`);
    } else {
      console.log('  ❌ No new fields found in tenant_users table');
    }
    
    // Check total column count
    const totalColumns = await db.execute(sql.raw(`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tenants') as tenants_columns,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tenant_users') as users_columns
    `));
    
    if (totalColumns.rows && totalColumns.rows[0]) {
      const { tenants_columns, users_columns } = totalColumns.rows[0];
      console.log(`\n📊 Final table structure:`);
      console.log(`  🏢 tenants table: ${tenants_columns} columns`);
      console.log(`  👥 tenant_users table: ${users_columns} columns`);
    }
    
    console.log('\n✅ Onboarding fields migration verification completed!');
    console.log('\n🎯 Next steps:');
    console.log('  1. Restart your API to pick up the new schema');
    console.log('  2. Test the onboarding form submission');
    console.log('  3. Verify all fields are working correctly');
    
  } catch (error) {
    console.error('❌ Onboarding fields migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runOnboardingMigration()
    .then(() => {
      console.log('\n🎉 Onboarding fields migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Onboarding fields migration failed:', error);
      process.exit(1);
    });
}

export { runOnboardingMigration };
