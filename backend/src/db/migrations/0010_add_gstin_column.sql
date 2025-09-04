-- Add GSTIN column to tenants table
-- This column will store the 15-digit GST identification number

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);

-- Add comment to the column
COMMENT ON COLUMN tenants.gstin IS '15-digit GST identification number for Indian companies';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name = 'gstin';
