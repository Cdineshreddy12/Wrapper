
-- Add credit_type column if it doesn't exist
ALTER TABLE credit_allocations 
ADD COLUMN IF NOT EXISTS credit_type VARCHAR(20) DEFAULT 'free';

-- Add check constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'credit_allocations_credit_type_check'
    ) THEN
        ALTER TABLE credit_allocations 
        ADD CONSTRAINT credit_allocations_credit_type_check 
        CHECK (credit_type IN ('free', 'paid'));
    END IF;
END
$$; 

-- Update existing rows to have credit_type = 'free' if null
UPDATE credit_allocations SET credit_type = 'free' WHERE credit_type IS NULL;

-- Add comment
COMMENT ON COLUMN credit_allocations.credit_type IS 'Type of credits: free (from plan) or paid (purchased separately)';

