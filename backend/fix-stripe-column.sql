-- Fix missing stripe_customer_id column in tenants table
-- Run this in your PostgreSQL database

-- Add the missing column
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name = 'stripe_customer_id';

-- Update existing records to have a default value (optional)
UPDATE tenants 
SET stripe_customer_id = NULL 
WHERE stripe_customer_id IS NULL;

-- Show the result
SELECT tenant_id, company_name, stripe_customer_id 
FROM tenants 
LIMIT 5;
