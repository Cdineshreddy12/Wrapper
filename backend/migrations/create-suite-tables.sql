-- Migration: Create Business Suite Tables
-- Created: 2025-01-04

-- Applications registry
CREATE TABLE IF NOT EXISTS applications (
  app_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code VARCHAR(50) NOT NULL UNIQUE,
  app_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  base_url VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  version VARCHAR(20),
  is_core BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application modules (features within each app)
CREATE TABLE IF NOT EXISTS application_modules (
  module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES applications(app_id),
  module_code VARCHAR(50) NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_core BOOLEAN DEFAULT false,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization application access
CREATE TABLE IF NOT EXISTS organization_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(tenant_id),
  app_id UUID REFERENCES applications(app_id),
  is_enabled BOOLEAN DEFAULT true,
  enabled_modules JSONB,
  custom_permissions JSONB,
  license_count INTEGER DEFAULT 0,
  max_users INTEGER,
  subscription_tier VARCHAR(50),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, app_id)
);

-- User application permissions
CREATE TABLE IF NOT EXISTS user_application_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES tenant_users(user_id),
  app_id UUID REFERENCES applications(app_id),
  module_id UUID REFERENCES application_modules(module_id),
  permissions JSONB,
  is_active BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES tenant_users(user_id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(50) NOT NULL UNIQUE,
  plan_name VARCHAR(100) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  billing_cycle VARCHAR(20),
  included_apps JSONB,
  features JSONB,
  max_users INTEGER,
  max_organizations INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(tenant_id),
  plan_id UUID REFERENCES subscription_plans(plan_id),
  status VARCHAR(20) NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMP,
  custom_pricing JSONB,
  payment_method_id VARCHAR(255),
  last_payment_at TIMESTAMP,
  next_payment_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SSO tokens for app authentication
CREATE TABLE IF NOT EXISTS sso_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES tenant_users(user_id),
  app_id UUID REFERENCES applications(app_id),
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs for audit
CREATE TABLE IF NOT EXISTS activity_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES tenant_users(user_id),
  tenant_id UUID REFERENCES tenants(tenant_id),
  app_id UUID REFERENCES applications(app_id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_app_code ON applications(app_code);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_application_modules_app_id ON application_modules(app_id);
CREATE INDEX IF NOT EXISTS idx_organization_applications_tenant_id ON organization_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organization_applications_app_id ON organization_applications(app_id);
CREATE INDEX IF NOT EXISTS idx_user_application_permissions_user_id ON user_application_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_application_permissions_app_id ON user_application_permissions(app_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_code ON subscription_plans(plan_code);
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_tenant_id ON organization_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_user_id ON sso_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_app_id ON sso_tokens(app_id);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_token ON sso_tokens(token);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_id ON activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_app_id ON activity_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at); 