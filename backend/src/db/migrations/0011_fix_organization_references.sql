-- Fix organization reference foreign key constraints
-- The parentOrganizationId and primaryOrganizationId fields are incorrectly referencing tenants instead of organizations

-- First, drop the incorrect foreign key constraints
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_parent_organization_id_tenants_tenant_id_fk;
ALTER TABLE tenant_users DROP CONSTRAINT IF EXISTS tenant_users_primary_organization_id_tenants_tenant_id_fk;

-- Then, add the correct foreign key constraints
ALTER TABLE tenants ADD CONSTRAINT tenants_parent_organization_id_organizations_organization_id_fk
  FOREIGN KEY (parent_organization_id) REFERENCES organizations(organization_id) ON DELETE SET NULL;

ALTER TABLE tenant_users ADD CONSTRAINT tenant_users_primary_organization_id_organizations_organization_id_fk
  FOREIGN KEY (primary_organization_id) REFERENCES organizations(organization_id) ON DELETE SET NULL;

-- Update the organization code to match the Kinde organization code for proper API lookups
UPDATE organizations
SET organization_code = 'org_ce82b312045c94',
    description = 'Updated to match Kinde organization code',
    updated_at = NOW()
WHERE tenant_id = '2c5d0b38-c480-44dd-b2f5-59bb1e724be1'
  AND organization_type = 'parent'
  AND is_default = true
  AND is_active = true
  AND organization_code LIKE 'org_%'
ORDER BY created_at DESC
LIMIT 1;

-- Link the tenant to its parent organization
UPDATE tenants
SET parent_organization_id = (
  SELECT organization_id
  FROM organizations
  WHERE tenant_id = '2c5d0b38-c480-44dd-b2f5-59bb1e724be1'
    AND organization_type = 'parent'
    AND is_default = true
    AND is_active = true
    AND organization_code = 'org_ce82b312045c94'
  ORDER BY created_at DESC
  LIMIT 1
),
updated_at = NOW()
WHERE tenant_id = '2c5d0b38-c480-44dd-b2f5-59bb1e724be1';

-- Link the admin user to the organization
UPDATE tenant_users
SET primary_organization_id = (
  SELECT organization_id
  FROM organizations
  WHERE tenant_id = '2c5d0b38-c480-44dd-b2f5-59bb1e724be1'
    AND organization_type = 'parent'
    AND is_default = true
    AND is_active = true
    AND organization_code = 'org_ce82b312045c94'
  ORDER BY created_at DESC
  LIMIT 1
),
updated_at = NOW()
WHERE tenant_id = '2c5d0b38-c480-44dd-b2f5-59bb1e724be1'
  AND email = 'reddycdinesh41@gmail.com';

-- Clean up duplicate organizations (keep only the one with the correct Kinde code)
DELETE FROM organizations
WHERE tenant_id = '2c5d0b38-c480-44dd-b2f5-59bb1e724be1'
  AND organization_type = 'parent'
  AND organization_code != 'org_ce82b312045c94'
  AND organization_code LIKE 'org_%';
