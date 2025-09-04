import postgres from 'postgres';
import 'dotenv/config';

async function applySchemaMigration() {
  // Create direct postgres connection
  const sql = postgres(process.env.DATABASE_URL);

  try {
    console.log('🔧 Applying comprehensive schema migration...\n');

    console.log('📊 Applying schema changes...\n');

    // Execute the migration in a transaction
    await sql.begin(async (tx) => {
      console.log('1. Making organizations.created_by nullable...');
      await tx`ALTER TABLE organizations ALTER COLUMN created_by DROP NOT NULL`;

      console.log('2. Fixing audit_logs.organization_id foreign key...');
      await tx`ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_organization_id_tenants_tenant_id_fk`;
      await tx`ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_organization_id_organizations_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE`;

      console.log('3. Fixing custom_roles.organization_id foreign key...');
      await tx`ALTER TABLE custom_roles DROP CONSTRAINT IF EXISTS custom_roles_organization_id_tenants_tenant_id_fk`;
      await tx`ALTER TABLE custom_roles ADD CONSTRAINT custom_roles_organization_id_organizations_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE SET NULL`;

      console.log('4. Fixing usage_logs.organization_id foreign key...');
      await tx`ALTER TABLE usage_logs DROP CONSTRAINT IF EXISTS usage_logs_organization_id_tenants_tenant_id_fk`;
      await tx`ALTER TABLE usage_logs ADD CONSTRAINT usage_logs_organization_id_organizations_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE`;

      console.log('5. Fixing usage_metrics_daily.organization_id foreign key...');
      await tx`ALTER TABLE usage_metrics_daily DROP CONSTRAINT IF EXISTS usage_metrics_daily_organization_id_tenants_tenant_id_fk`;
      await tx`ALTER TABLE usage_metrics_daily ADD CONSTRAINT usage_metrics_daily_organization_id_organizations_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE`;

      console.log('6. Fixing user_role_assignments.organization_id foreign key...');
      await tx`ALTER TABLE user_role_assignments DROP CONSTRAINT IF EXISTS user_role_assignments_organization_id_tenants_tenant_id_fk`;
      await tx`ALTER TABLE user_role_assignments ADD CONSTRAINT user_role_assignments_organization_id_organizations_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE`;

      console.log('7. Adding performance indexes...');
      await tx`CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by)`;
      await tx`CREATE INDEX IF NOT EXISTS idx_organizations_updated_by ON organizations(updated_by)`;
      await tx`CREATE INDEX IF NOT EXISTS idx_custom_roles_organization_id ON custom_roles(organization_id)`;
      await tx`CREATE INDEX IF NOT EXISTS idx_user_role_assignments_organization_id ON user_role_assignments(organization_id)`;
      await tx`CREATE INDEX IF NOT EXISTS idx_tenant_users_primary_organization_id ON tenant_users(primary_organization_id)`;

      console.log('✅ Schema migration completed successfully!');
    });

  } catch (error) {
    console.error('❌ Schema migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close the connection
    await sql.end();
  }
}

// Run the migration
applySchemaMigration().then(() => {
  console.log('\n🏁 Schema migration script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
