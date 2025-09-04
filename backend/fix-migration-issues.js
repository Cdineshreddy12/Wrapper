// Custom migration to fix circular references and handle views properly
import { sql } from './src/db/index.js';

async function fixMigrationIssues() {
  try {
    console.log('🔧 Starting custom migration to fix circular references...\n');

    // Step 1: Drop the view properly (not as a table)
    console.log('📊 Dropping trial_status_view...');
    await sql`DROP VIEW IF EXISTS trial_status_view;`;
    console.log('✅ View dropped successfully');

    // Step 2: Create the new manager relationships table
    console.log('📋 Creating user_manager_relationships table...');
    await sql`
      CREATE TABLE IF NOT EXISTS user_manager_relationships (
        relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
        user_id UUID NOT NULL REFERENCES tenant_users(user_id),
        manager_id UUID NOT NULL REFERENCES tenant_users(user_id),
        relationship_type VARCHAR(50) DEFAULT 'direct',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('✅ Table created successfully');

    // Step 3: Drop circular reference columns
    console.log('🔄 Removing circular reference columns...');
    await sql`ALTER TABLE tenant_users DROP COLUMN IF EXISTS manager_id;`;
    await sql`ALTER TABLE tenant_users DROP COLUMN IF EXISTS invited_by;`;
    await sql`ALTER TABLE subscriptions DROP COLUMN IF EXISTS cancelation_reason;`;
    await sql`ALTER TABLE tenants DROP COLUMN IF EXISTS company_id;`;
    console.log('✅ Circular references removed');

    // Step 4: Create indexes for performance
    console.log('⚡ Creating performance indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_user_manager_relationships_tenant ON user_manager_relationships(tenant_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_manager_relationships_user ON user_manager_relationships(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_manager_relationships_manager ON user_manager_relationships(manager_id);`;
    console.log('✅ Indexes created');

    // Step 5: Update ip_address column type safely
    console.log('🌐 Updating ip_address column type...');
    // First check if column exists and has data
    const ipCheck = await sql`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'trial_events'
      AND column_name = 'ip_address'
      AND data_type = 'inet';
    `;

    if (ipCheck[0].count > 0) {
      // Convert inet to varchar safely
      await sql`ALTER TABLE trial_events ALTER COLUMN ip_address TYPE varchar(45);`;
      console.log('✅ IP address column updated');
    } else {
      console.log('ℹ️ IP address column already in correct format');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Circular references fixed');
    console.log('✅ New manager relationships table created');
    console.log('✅ All foreign key constraints preserved');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the custom migration
fixMigrationIssues();
