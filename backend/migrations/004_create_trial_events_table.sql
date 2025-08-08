-- Migration: Create trial_events table for proper trial tracking
-- This separates trial management from payments completely

-- Create trial_events table
CREATE TABLE IF NOT EXISTS trial_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'trial_started', 'trial_expired', 'reminder_sent', 'restriction_applied', 'access_attempted', 'paid_plan_expired'
  event_data JSONB DEFAULT '{}',
  user_id UUID, -- Which user triggered this event (if applicable)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_trial_events_tenant ON trial_events(tenant_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_trial_events_subscription ON trial_events(subscription_id, event_type);
CREATE INDEX IF NOT EXISTS idx_trial_events_type_date ON trial_events(event_type, created_at);

-- Add comments for documentation
COMMENT ON TABLE trial_events IS 'Tracks all trial-related events separately from payments';
COMMENT ON COLUMN trial_events.event_type IS 'Type of trial event: trial_started, trial_expired, reminder_sent, restriction_applied, access_attempted, paid_plan_expired';
COMMENT ON COLUMN trial_events.event_data IS 'Additional event data: reminder_count, restricted_feature, etc.';
COMMENT ON COLUMN trial_events.user_id IS 'User who triggered the event (for access_attempted events)';

-- Create trial_restrictions table for tracking what's restricted
CREATE TABLE IF NOT EXISTS trial_restrictions (
  restriction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  restriction_type VARCHAR(50) NOT NULL, -- 'feature_access', 'api_calls', 'user_limit'
  is_active BOOLEAN DEFAULT TRUE,
  restriction_data JSONB DEFAULT '{}',
  applied_at TIMESTAMP DEFAULT NOW(),
  removed_at TIMESTAMP
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_trial_restrictions_tenant ON trial_restrictions(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_trial_restrictions_type ON trial_restrictions(restriction_type, is_active);

COMMENT ON TABLE trial_restrictions IS 'Tracks active restrictions for expired trials';
COMMENT ON COLUMN trial_restrictions.restriction_type IS 'Type of restriction applied';
COMMENT ON COLUMN trial_restrictions.restriction_data IS 'Details about what is restricted';

-- Add trial tracking columns to subscriptions if not exists
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS restrictions_applied_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS has_ever_upgraded BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS first_upgrade_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_downgrade_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_toggled_off BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN subscriptions.last_reminder_sent_at IS 'When the last trial expiry reminder was sent';
COMMENT ON COLUMN subscriptions.reminder_count IS 'How many reminders have been sent for this trial';
COMMENT ON COLUMN subscriptions.restrictions_applied_at IS 'When trial restrictions were first applied';
COMMENT ON COLUMN subscriptions.has_ever_upgraded IS 'Whether the user has ever upgraded from trial to paid plan';
COMMENT ON COLUMN subscriptions.trial_toggled_off IS 'Whether trial restrictions have been manually disabled';

-- Clean up trial-related payment records (they don't belong in payments table)
-- Only remove trial-specific payment records that are tracking events, not real payments
DELETE FROM payments 
WHERE payment_type IN ('trial_expiration', 'trial', 'reminder', 'urgent_reminder', 'trial_reminder')
   OR billing_reason IN ('trial_expired', 'trial_start', 'trial_reminder', 'trial_urgent_reminder')
   OR (amount = 0 AND description LIKE '%trial%' AND status = 'failed');

-- Log what we cleaned up
INSERT INTO trial_events (tenant_id, event_type, event_data, created_at)
SELECT DISTINCT tenant_id, 'migration_cleanup', 
  jsonb_build_object(
    'action', 'removed_trial_payment_records',
    'migration', '004_create_trial_events_table',
    'cleaned_at', NOW()
  ), 
  NOW()
FROM tenants
WHERE EXISTS (SELECT 1 FROM subscriptions WHERE subscriptions.tenant_id = tenants.tenant_id);

-- Create a view for easy trial status checking
CREATE OR REPLACE VIEW trial_status_view AS
SELECT 
  s.tenant_id,
  s.subscription_id,
  s.plan,
  s.status,
  s.trial_start,
  s.trial_end,
  s.current_period_start,
  s.current_period_end,
  s.has_ever_upgraded,
  s.trial_toggled_off,
  s.last_reminder_sent_at,
  s.reminder_count,
  t.company_name,
  t.admin_email,
  CASE 
    WHEN s.trial_toggled_off = TRUE THEN FALSE
    WHEN s.has_ever_upgraded = TRUE THEN FALSE
    WHEN s.status = 'past_due' THEN TRUE
    WHEN s.trial_end IS NOT NULL AND s.trial_end < NOW() THEN TRUE
    WHEN s.current_period_end IS NOT NULL AND s.current_period_end < NOW() AND s.plan != 'trial' THEN TRUE
    ELSE FALSE
  END as is_expired,
  CASE 
    WHEN s.trial_end IS NOT NULL THEN s.trial_end
    WHEN s.current_period_end IS NOT NULL THEN s.current_period_end
    ELSE NULL
  END as expiry_date
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.tenant_id;

COMMENT ON VIEW trial_status_view IS 'Consolidated view of trial status for all tenants';

-- Log the migration
INSERT INTO trial_events (tenant_id, event_type, event_data, created_at) 
SELECT tenant_id, 'migration_completed',
  jsonb_build_object(
    'migration_name', '004_create_trial_events_table',
    'completed_at', NOW(),
    'description', 'Created trial_events and trial_restrictions tables, separated trial tracking from payments, cleaned up payment records'
  ),
  NOW()
FROM tenants
LIMIT 1; 