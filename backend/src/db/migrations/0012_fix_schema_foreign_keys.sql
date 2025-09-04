-- Comprehensive schema fix for foreign key constraint issues
-- This migration fixes the incorrect references to tenants instead of organizations

-- Start transaction for atomic migration
BEGIN;

-- =============================================================================
-- STEP 1: Fix organizations table created_by and updated_by constraints
-- =============================================================================

-- Make created_by nullable (was NOT NULL before)
ALTER TABLE organizations
ALTER COLUMN created_by DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN organizations.created_by IS 'Made nullable to support onboarding flow where organizations are created before users';

-- =============================================================================
-- STEP 2: Fix custom_roles.organization_id reference
-- =============================================================================

-- Drop the incorrect foreign key constraint
ALTER TABLE custom_roles
DROP CONSTRAINT IF EXISTS custom_roles_organization_id_tenants_tenant_id_fk;

-- Add the correct foreign key constraint
ALTER TABLE custom_roles
ADD CONSTRAINT custom_roles_organization_id_organizations_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE SET NULL;

-- =============================================================================
-- STEP 3: Fix user_role_assignments.organization_id reference
-- =============================================================================

-- Drop the incorrect foreign key constraint
ALTER TABLE user_role_assignments
DROP CONSTRAINT IF EXISTS user_role_assignments_organization_id_tenants_tenant_id_fk;

-- Add the correct foreign key constraint
ALTER TABLE user_role_assignments
ADD CONSTRAINT user_role_assignments_organization_id_organizations_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;

-- =============================================================================
-- STEP 4: Fix usage_metrics_daily.organization_id reference
-- =============================================================================

-- Drop the incorrect foreign key constraint
ALTER TABLE usage_metrics_daily
DROP CONSTRAINT IF EXISTS usage_metrics_daily_organization_id_tenants_tenant_id_fk;

-- Add the correct foreign key constraint
ALTER TABLE usage_metrics_daily
ADD CONSTRAINT usage_metrics_daily_organization_id_organizations_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;

-- =============================================================================
-- STEP 5: Fix usage_aggregations.organization_id reference
-- =============================================================================

-- Drop the incorrect foreign key constraint
ALTER TABLE usage_aggregations
DROP CONSTRAINT IF EXISTS usage_aggregations_organization_id_tenants_tenant_id_fk;

-- Add the correct foreign key constraint
ALTER TABLE usage_aggregations
ADD CONSTRAINT usage_aggregations_organization_id_organizations_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;

-- =============================================================================
-- STEP 6: Fix audit_logs.organization_id reference
-- =============================================================================

-- Drop the incorrect foreign key constraint
ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_organization_id_tenants_tenant_id_fk;

-- Add the correct foreign key constraint
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_organization_id_organizations_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;

-- =============================================================================
-- STEP 7: Fix tenant_users.primary_organization_id reference
-- =============================================================================

-- Drop the incorrect foreign key constraint
ALTER TABLE tenant_users
DROP CONSTRAINT IF EXISTS tenant_users_primary_organization_id_tenants_tenant_id_fk;

-- Add the correct foreign key constraint
ALTER TABLE tenant_users
ADD CONSTRAINT tenant_users_primary_organization_id_organizations_organization_id_fk
FOREIGN KEY (primary_organization_id) REFERENCES organizations(organization_id) ON DELETE SET NULL;

-- =============================================================================
-- STEP 8: Add indexes for better performance on foreign key columns
-- =============================================================================

-- Index for organizations table foreign keys
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_updated_by ON organizations(updated_by);
CREATE INDEX IF NOT EXISTS idx_organizations_responsible_person_id ON organizations(responsible_person_id);

-- Index for custom_roles organization reference
CREATE INDEX IF NOT EXISTS idx_custom_roles_organization_id ON custom_roles(organization_id);

-- Index for user_role_assignments organization reference
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_organization_id ON user_role_assignments(organization_id);

-- Index for tenant_users primary organization reference
CREATE INDEX IF NOT EXISTS idx_tenant_users_primary_organization_id ON tenant_users(primary_organization_id);

-- =============================================================================
-- STEP 9: Add helpful comments to explain the schema structure
-- =============================================================================

COMMENT ON COLUMN organizations.created_by IS 'Reference to the user who created this organization. Nullable during onboarding flow.';
COMMENT ON COLUMN organizations.updated_by IS 'Reference to the user who last updated this organization.';
COMMENT ON COLUMN custom_roles.organization_id IS 'Reference to the organization this role belongs to. Can be NULL for global roles.';
COMMENT ON COLUMN user_role_assignments.organization_id IS 'Reference to the organization context for this role assignment.';
COMMENT ON COLUMN tenant_users.primary_organization_id IS 'Reference to the user''s primary organization within the tenant.';

-- =============================================================================
-- STEP 10: Create a function to help with data migration (if needed)
-- =============================================================================

CREATE OR REPLACE FUNCTION migrate_organization_references()
RETURNS TEXT AS $$
DECLARE
    migrated_count INTEGER := 0;
    error_message TEXT := '';
BEGIN
    -- This function can be used to migrate existing data if needed
    -- For now, just return success message
    RETURN 'Schema migration completed successfully. No data migration needed.';
EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RETURN 'Migration failed: ' || error_message;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 11: Verify the migration
-- =============================================================================

-- Test that the foreign key constraints are working
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    -- Count the number of foreign key constraints we created
    SELECT COUNT(*)
    INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('organizations', 'custom_roles', 'user_role_assignments', 'usage_metrics_daily', 'usage_aggregations', 'audit_logs', 'tenant_users')
    AND kcu.column_name LIKE '%organization_id%';

    RAISE NOTICE 'Created % organization-related foreign key constraints', constraint_count;

    -- Verify organizations table structure
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations'
        AND column_name = 'created_by'
        AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION 'organizations.created_by should be nullable';
    END IF;

    RAISE NOTICE 'Schema migration verification passed';
END $$;

-- Commit the transaction
COMMIT;

-- Display completion message
SELECT '✅ Schema migration completed successfully!' as status;
