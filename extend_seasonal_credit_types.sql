-- Extend credit_type column to support seasonal and promotional credit types
-- This migration expands beyond 'free' and 'paid' to include seasonal variants

-- Step 1: Create a backup of current credit allocations
CREATE TABLE IF NOT EXISTS credit_allocations_backup AS
SELECT * FROM credit_allocations;

-- Step 2: Drop existing check constraint
ALTER TABLE credit_allocations
DROP CONSTRAINT IF EXISTS credit_allocations_credit_type_check;

-- Step 3: Update the credit_type column to support new types
ALTER TABLE credit_allocations
ALTER COLUMN credit_type TYPE VARCHAR(50);

-- Step 4: Add new check constraint with expanded credit types
ALTER TABLE credit_allocations
ADD CONSTRAINT credit_allocations_credit_type_check
CHECK (credit_type IN (
    'free',           -- Plan-based free credits
    'paid',           -- Purchased credits
    'seasonal',       -- Holiday/seasonal promotional credits
    'bonus',          -- Loyalty or referral bonus credits
    'promotional',    -- Marketing campaign credits
    'event',          -- Special event credits (product launches, anniversaries)
    'partnership',    -- Partner program credits
    'trial_extension' -- Extended trial credits
));

-- Step 5: Add metadata columns for seasonal credits
ALTER TABLE credit_allocations
ADD COLUMN IF NOT EXISTS credit_metadata JSONB,
ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS expiry_rule VARCHAR(50) DEFAULT 'fixed_date',
ADD COLUMN IF NOT EXISTS expiry_warning_days INTEGER DEFAULT 7;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN credit_allocations.credit_type IS 'Type of credits: free (plan), paid (purchased), seasonal (holiday), bonus (loyalty), promotional (campaign), event (special), partnership (partner), trial_extension (extended trial)';
COMMENT ON COLUMN credit_allocations.credit_metadata IS 'Additional metadata for credit type (e.g., campaign details, expiry rules)';
COMMENT ON COLUMN credit_allocations.campaign_id IS 'Identifier for the credit campaign or promotion';
COMMENT ON COLUMN credit_allocations.campaign_name IS 'Human-readable name for the credit campaign';
COMMENT ON COLUMN credit_allocations.expiry_rule IS 'Rule for credit expiry: fixed_date, rolling_window, never_expire';
COMMENT ON COLUMN credit_allocations.expiry_warning_days IS 'Days before expiry to show warning notifications';

-- Step 7: Create index for better query performance on campaign credits
CREATE INDEX IF NOT EXISTS idx_credit_allocations_campaign
ON credit_allocations(campaign_id, credit_type)
WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_allocations_seasonal_expiry
ON credit_allocations(expires_at, credit_type)
WHERE credit_type IN ('seasonal', 'promotional', 'event', 'bonus');
