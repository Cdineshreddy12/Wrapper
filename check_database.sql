
-- Check for active tenants
SELECT 
  COUNT(*) as total_tenants,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_tenants,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_tenants
FROM tenants;

-- Check a few tenant details
SELECT tenant_id, company_name, is_active, created_at 
FROM tenants 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if there are any existing credit allocations
SELECT COUNT(*) as total_allocations FROM credit_allocations;

-- Check notification table
SELECT COUNT(*) as total_notifications FROM notifications;

