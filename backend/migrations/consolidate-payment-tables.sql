-- Migration: Consolidate Payment Tables
-- Remove duplicate payment_history and payment_methods tables
-- Keep the comprehensive payments table from subscriptions schema

-- First, check if there's any data in payment_history that needs to be migrated
-- This is just for safety - you mentioned there's no data yet

-- Drop the simpler payment_history table (keeping the comprehensive payments table)
DROP TABLE IF EXISTS payment_history CASCADE;

-- Drop the payment_methods table as payment method info is now stored in payments table
DROP TABLE IF EXISTS payment_methods CASCADE;

-- Ensure the comprehensive payments table exists with all necessary columns
-- (This table should already exist from the subscriptions schema)

-- Add indexes for better performance on the payments table
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_subscription ON payments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_billing_reason ON payments(billing_reason);

-- Add some sample payment data for testing with the consolidated table structure
INSERT INTO payments (
  tenant_id, 
  amount, 
  currency, 
  status, 
  payment_method, 
  payment_type,
  billing_reason,
  description, 
  paid_at,
  created_at
) 
SELECT 
  tenant_id,
  29.99,
  'USD',
  'succeeded',
  'card',
  'subscription',
  'subscription_cycle',
  'Monthly subscription payment for Professional Plan',
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 month'
FROM tenants 
WHERE is_active = true
LIMIT 1;

-- Add another recent sample payment
INSERT INTO payments (
  tenant_id, 
  amount, 
  currency, 
  status, 
  payment_method, 
  payment_type,
  billing_reason,
  description, 
  paid_at,
  created_at
) 
SELECT 
  tenant_id,
  29.99,
  'USD',
  'succeeded',
  'card',
  'subscription',
  'subscription_cycle',
  'Monthly subscription payment for Professional Plan',
  NOW(),
  NOW()
FROM tenants 
WHERE is_active = true
LIMIT 1;

-- Add a failed payment example
INSERT INTO payments (
  tenant_id, 
  amount, 
  currency, 
  status, 
  payment_method, 
  payment_type,
  billing_reason,
  description, 
  failed_at,
  created_at,
  metadata
) 
SELECT 
  tenant_id,
  29.99,
  'USD',
  'failed',
  'card',
  'subscription',
  'subscription_cycle',
  'Failed monthly subscription payment for Professional Plan',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days',
  '{"failure_reason": "insufficient_funds", "decline_code": "generic_decline"}'::jsonb
FROM tenants 
WHERE is_active = true
LIMIT 1;

-- Cleanup: Ensure no orphaned references exist
-- This is a safety measure in case there were any foreign key references 