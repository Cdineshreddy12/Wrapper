-- Migration: Add Kinde integration fields and invitation management
-- Created: 2024-01-20

-- Add Kinde integration fields to custom_roles table
ALTER TABLE custom_roles 
ADD COLUMN IF NOT EXISTS kinde_role_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS kinde_role_key VARCHAR(255);

-- Add invitation management fields to tenant_users table
ALTER TABLE tenant_users 
ALTER COLUMN kinde_user_id DROP NOT NULL,
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES tenant_users(user_id),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP;

-- Update user_role_assignments table to use 'id' instead of 'assignment_id'
-- First, check if the old column exists and rename it
DO $$
BEGIN
    -- Check if assignment_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'user_role_assignments' 
               AND column_name = 'assignment_id') THEN
        -- Rename assignment_id to id
        ALTER TABLE user_role_assignments RENAME COLUMN assignment_id TO id;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_roles_kinde_role_id ON custom_roles(kinde_role_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_kinde_role_key ON custom_roles(kinde_role_key);
CREATE INDEX IF NOT EXISTS idx_tenant_users_invited_by ON tenant_users(invited_by);
CREATE INDEX IF NOT EXISTS idx_tenant_users_invitation_token ON tenant_users(invitation_token);

-- Add comments for documentation
COMMENT ON COLUMN custom_roles.kinde_role_id IS 'Kinde role ID for API integration';
COMMENT ON COLUMN custom_roles.kinde_role_key IS 'Kinde role key for API integration';
COMMENT ON COLUMN tenant_users.invited_by IS 'User ID who sent the invitation';
COMMENT ON COLUMN tenant_users.invited_at IS 'Timestamp when invitation was sent';
COMMENT ON COLUMN tenant_users.invitation_token IS 'Unique token for invitation acceptance';
COMMENT ON COLUMN tenant_users.invitation_expires_at IS 'Expiration timestamp for invitation';
COMMENT ON COLUMN tenant_users.invitation_accepted_at IS 'Timestamp when invitation was accepted'; 