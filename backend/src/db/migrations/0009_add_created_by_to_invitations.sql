-- Migration: Add created_by column to tenant_invitations table
-- Date: 2025-01-27
-- Description: Add created_by column to track who created each invitation

-- Step 1: Add created_by column to tenant_invitations table
ALTER TABLE tenant_invitations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES tenant_users(user_id);

-- Step 2: Update existing invitations to set created_by to invited_by (as a fallback)
UPDATE tenant_invitations 
SET created_by = invited_by 
WHERE created_by IS NULL;

-- Step 3: Make created_by NOT NULL after setting default values
ALTER TABLE tenant_invitations 
ALTER COLUMN created_by SET NOT NULL;

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_created_by ON tenant_invitations(created_by);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN tenant_invitations.created_by IS 'User who created this invitation';
