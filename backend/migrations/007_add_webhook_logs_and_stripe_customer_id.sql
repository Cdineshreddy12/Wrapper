-- Migration: Add webhook logs table and stripe customer ID to tenants
-- Date: 2025-08-13
-- Description: Add webhook idempotency table and fix missing stripe customer ID column

-- Create webhook logs table for idempotency
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS webhook_logs_event_id_idx ON webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS webhook_logs_event_type_idx ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS webhook_logs_status_idx ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS webhook_logs_created_at_idx ON webhook_logs(created_at);

-- Add stripe customer ID column to tenants table if it doesn't exist
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add index for stripe customer ID lookups
CREATE INDEX IF NOT EXISTS tenants_stripe_customer_id_idx ON tenants(stripe_customer_id);

-- Add comments for documentation
COMMENT ON TABLE webhook_logs IS 'Webhook processing logs for idempotency and debugging';
COMMENT ON COLUMN webhook_logs.event_id IS 'Unique Stripe event ID';
COMMENT ON COLUMN webhook_logs.status IS 'Processing status: processing, completed, failed';
COMMENT ON COLUMN tenants.stripe_customer_id IS 'Stripe customer ID for billing integration';
