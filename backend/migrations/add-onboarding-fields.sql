-- Migration: Add Comprehensive Onboarding Fields
-- Description: Add missing fields for comprehensive company onboarding
-- Created: 2025-08-28

-- Add missing fields to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS legal_company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS duns_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS ownership VARCHAR(100),
ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2),
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
ADD COLUMN IF NOT EXISTS first_day_of_week INTEGER DEFAULT 1;

-- Add missing fields to tenant_users table
ALTER TABLE tenant_users 
ADD COLUMN IF NOT EXISTS alias VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES tenant_users(user_id),
ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_industry ON tenants(industry);
CREATE INDEX IF NOT EXISTS idx_tenants_company_type ON tenants(company_type);
CREATE INDEX IF NOT EXISTS idx_tenants_company_size ON tenants(company_size);
CREATE INDEX IF NOT EXISTS idx_tenants_country ON tenants(country);
CREATE INDEX IF NOT EXISTS idx_tenants_billing_country ON tenants(billing_country);
CREATE INDEX IF NOT EXISTS idx_tenants_shipping_country ON tenants(shipping_country);

-- Update existing records to have default values
UPDATE tenants 
SET 
  default_language = 'en',
  default_locale = 'en-US', 
  default_currency = 'USD',
  default_timezone = 'UTC',
  first_day_of_week = 1
WHERE default_language IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN tenants.legal_company_name IS 'Legal/registered company name (may differ from display name)';
COMMENT ON COLUMN tenants.company_id IS 'Government-issued company registration ID';
COMMENT ON COLUMN tenants.duns_number IS 'DUNS number for business identification';
COMMENT ON COLUMN tenants.company_type IS 'Type of business entity (LLC, Corp, Partnership, etc.)';
COMMENT ON COLUMN tenants.ownership IS 'Ownership structure (Private, Public, Government, etc.)';
COMMENT ON COLUMN tenants.annual_revenue IS 'Annual revenue in default currency';
COMMENT ON COLUMN tenants.number_of_employees IS 'Total number of employees';
COMMENT ON COLUMN tenants.ticker_symbol IS 'Stock ticker symbol if publicly traded';
COMMENT ON COLUMN tenants.company_description IS 'Detailed company description';
COMMENT ON COLUMN tenants.founded_date IS 'Date when company was founded';
COMMENT ON COLUMN tenants.billing_street IS 'Billing address street';
COMMENT ON COLUMN tenants.billing_city IS 'Billing address city';
COMMENT ON COLUMN tenants.billing_state IS 'Billing address state/province';
COMMENT ON COLUMN tenants.billing_zip IS 'Billing address postal code';
COMMENT ON COLUMN tenants.billing_country IS 'Billing address country';
COMMENT ON COLUMN tenants.shipping_street IS 'Shipping address street';
COMMENT ON COLUMN tenants.shipping_city IS 'Shipping address city';
COMMENT ON COLUMN tenants.shipping_state IS 'Shipping address state/province';
COMMENT ON COLUMN tenants.shipping_zip IS 'Shipping address postal code';
COMMENT ON COLUMN tenants.shipping_country IS 'Shipping address country';
COMMENT ON COLUMN tenants.phone IS 'Primary business phone number';
COMMENT ON COLUMN tenants.fax IS 'Business fax number';
COMMENT ON COLUMN tenants.default_language IS 'Default language for the organization';
COMMENT ON COLUMN tenants.default_locale IS 'Default locale for formatting';
COMMENT ON COLUMN tenants.default_currency IS 'Default currency for the organization';
COMMENT ON COLUMN tenants.multi_currency_enabled IS 'Whether multi-currency is enabled';
COMMENT ON COLUMN tenants.advanced_currency_management IS 'Whether advanced currency features are enabled';
COMMENT ON COLUMN tenants.default_timezone IS 'Default timezone for the organization';
COMMENT ON COLUMN tenants.first_day_of_week IS 'First day of week (1=Monday, 7=Sunday)';

COMMENT ON COLUMN tenant_users.alias IS 'User alias or nickname';
COMMENT ON COLUMN tenant_users.phone IS 'User phone number';
COMMENT ON COLUMN tenant_users.mobile IS 'User mobile number';
COMMENT ON COLUMN tenant_users.manager_id IS 'Reference to user''s manager';
COMMENT ON COLUMN tenant_users.profile_data IS 'Additional profile information as JSON';

-- Verify the migration
SELECT 
  'tenants' as table_name,
  column_name,
  data_type,
  is_nullable
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
ORDER BY column_name;

SELECT 
  'tenant_users' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenant_users' 
  AND column_name IN (
    'alias', 'phone', 'mobile', 'manager_id', 'profile_data'
  )
ORDER BY column_name;
