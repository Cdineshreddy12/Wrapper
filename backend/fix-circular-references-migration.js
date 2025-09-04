// Migration script to fix circular reference issues
import { sql } from './src/db/index.js';

async function fixCircularReferences() {
  try {
    console.log('Starting migration to fix circular references...');

    // Step 1: Create new manager relationships table
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

    // Step 2: Migrate existing manager data (if any exists)
    await sql`
      INSERT INTO user_manager_relationships (tenant_id, user_id, manager_id)
      SELECT tenant_id, user_id, manager_id
      FROM tenant_users
      WHERE manager_id IS NOT NULL;
    `;

    // Step 3: Remove circular reference columns from tenant_users
    await sql`
      ALTER TABLE tenant_users DROP COLUMN IF EXISTS manager_id;
    `;
    await sql`
      ALTER TABLE tenant_users DROP COLUMN IF EXISTS invited_by;
    `;

    // Step 4: Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_manager_relationships_tenant ON user_manager_relationships(tenant_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_manager_relationships_user ON user_manager_relationships(user_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_manager_relationships_manager ON user_manager_relationships(manager_id);
    `;

    console.log('Migration completed successfully!');
    console.log('You can now use proper Drizzle queries without circular reference issues.');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixCircularReferences();
