-- Migration: Setup Row Level Security (RLS) for tenant isolation
-- This migration enables RLS on all tenant-sensitive tables and creates policies

-- Enable RLS on tenant_users table
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_users_tenant_isolation ON tenant_users;
CREATE POLICY tenant_users_tenant_isolation ON tenant_users
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organizations_tenant_isolation ON organizations;
CREATE POLICY organizations_tenant_isolation ON organizations
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on custom_roles table
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custom_roles_tenant_isolation ON custom_roles;
CREATE POLICY custom_roles_tenant_isolation ON custom_roles
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on user_role_assignments table
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_role_assignments_tenant_isolation ON user_role_assignments;
CREATE POLICY user_role_assignments_tenant_isolation ON user_role_assignments
FOR ALL USING (
  user_id IN (
    SELECT user_id FROM tenant_users
    WHERE tenant_id::text = current_setting('app.tenant_id', true)
  )
);

-- Enable RLS on credits table
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credits_tenant_isolation ON credits;
CREATE POLICY credits_tenant_isolation ON credits
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on credit_transactions table
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_transactions_tenant_isolation ON credit_transactions;
CREATE POLICY credit_transactions_tenant_isolation ON credit_transactions
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on user_sessions table
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_sessions_tenant_isolation ON user_sessions;
CREATE POLICY user_sessions_tenant_isolation ON user_sessions
FOR ALL USING (
  user_id IN (
    SELECT user_id FROM tenant_users
    WHERE tenant_id::text = current_setting('app.tenant_id', true)
  )
);

-- Enable RLS on trial_events table
ALTER TABLE trial_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trial_events_tenant_isolation ON trial_events;
CREATE POLICY trial_events_tenant_isolation ON trial_events
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on usage_logs table
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usage_logs_tenant_isolation ON usage_logs;
CREATE POLICY usage_logs_tenant_isolation ON usage_logs
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on usage_metrics_daily table
ALTER TABLE usage_metrics_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usage_metrics_daily_tenant_isolation ON usage_metrics_daily;
CREATE POLICY usage_metrics_daily_tenant_isolation ON usage_metrics_daily
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS applications_tenant_isolation ON applications;
CREATE POLICY applications_tenant_isolation ON applications
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on user_application_permissions table
ALTER TABLE user_application_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_application_permissions_tenant_isolation ON user_application_permissions;
CREATE POLICY user_application_permissions_tenant_isolation ON user_application_permissions
FOR ALL USING (
  user_id IN (
    SELECT user_id FROM tenant_users
    WHERE tenant_id::text = current_setting('app.tenant_id', true)
  )
);

-- Enable RLS on locations table
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS locations_tenant_isolation ON locations;
CREATE POLICY locations_tenant_isolation ON locations
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on organization_locations table
ALTER TABLE organization_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_locations_tenant_isolation ON organization_locations;
CREATE POLICY organization_locations_tenant_isolation ON organization_locations
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organizations
    WHERE tenant_id::text = current_setting('app.tenant_id', true)
  )
);

-- Enable RLS on membership_invitations table
ALTER TABLE membership_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_invitations_tenant_isolation ON membership_invitations;
CREATE POLICY membership_invitations_tenant_isolation ON membership_invitations
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organizations
    WHERE tenant_id::text = current_setting('app.tenant_id', true)
  )
);

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_tenant_isolation ON payments;
CREATE POLICY payments_tenant_isolation ON payments
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_tenant_isolation ON subscriptions;
CREATE POLICY subscriptions_tenant_isolation ON subscriptions
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Create helper function to get current tenant
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.tenant_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check tenant access
CREATE OR REPLACE FUNCTION check_tenant_access(resource_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN resource_tenant_id::text = current_setting('app.tenant_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get tenant context
CREATE OR REPLACE FUNCTION get_tenant_context()
RETURNS json AS $$
DECLARE
  tenant_id text;
  result json;
BEGIN
  BEGIN
    tenant_id := current_setting('app.tenant_id', true);
    result := json_build_object('tenant_id', tenant_id, 'valid', true);
  EXCEPTION
    WHEN OTHERS THEN
      result := json_build_object('tenant_id', null, 'valid', false, 'error', SQLERRM);
  END;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for tenant-aware queries
CREATE OR REPLACE FUNCTION tenant_users_for_current_tenant()
RETURNS SETOF tenant_users AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM tenant_users
  WHERE tenant_id::text = current_setting('app.tenant_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions (adjust role name as needed)
-- GRANT USAGE ON SCHEMA public TO tenant_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tenant_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tenant_user;

-- Create index for better RLS performance
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_rls ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organizations_tenant_rls ON organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_tenant_rls ON custom_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credits_tenant_rls ON credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_rls ON audit_logs(tenant_id);
