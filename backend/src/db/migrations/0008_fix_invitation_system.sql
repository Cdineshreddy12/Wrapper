-- Migration: Fix invitation system and remove duplication
-- Date: 2025-01-27
-- Description: Consolidate invitation system, add invitation URL column, remove duplicate fields

-- Step 1: Add new columns to tenant_invitations table
ALTER TABLE tenant_invitations 
ADD COLUMN IF NOT EXISTS invitation_url VARCHAR(1000),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Step 2: Make invitation_token unique
ALTER TABLE tenant_invitations 
ADD CONSTRAINT IF NOT EXISTS tenant_invitations_invitation_token_unique 
UNIQUE (invitation_token);

-- Step 3: Remove duplicate invitation fields from tenant_users table
ALTER TABLE tenant_users 
DROP COLUMN IF EXISTS invitation_token,
DROP COLUMN IF EXISTS invitation_expires_at,
DROP COLUMN IF EXISTS invitation_accepted_at;

-- Step 4: Update existing invitations to generate invitation URLs
UPDATE tenant_invitations 
SET invitation_url = CONCAT('http://localhost:3001/invite/accept?token=', invitation_token)
WHERE invitation_url IS NULL AND status = 'pending';

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_status ON tenant_invitations(status);

-- Step 6: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 7: Create trigger for tenant_invitations table
DROP TRIGGER IF EXISTS update_tenant_invitations_updated_at ON tenant_invitations;
CREATE TRIGGER update_tenant_invitations_updated_at
    BEFORE UPDATE ON tenant_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
