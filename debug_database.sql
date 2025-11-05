
-- Check tenants and their status
SELECT 
  tenant_id, 
  company_name, 
  is_active, 
  created_at,
  admin_email
FROM tenants 
ORDER BY created_at DESC;

-- Check if there are any credit allocations at all
SELECT 
  COUNT(*) as total_allocations,
  COUNT(CASE WHEN campaign_id IS NOT NULL THEN 1 END) as campaign_allocations,
  COUNT(DISTINCT tenant_id) as tenants_with_allocations
FROM credit_allocations;

-- Check recent credit allocations (last 24 hours)
SELECT 
  tenant_id,
  credit_type,
  allocated_credits,
  available_credits,
  campaign_id,
  campaign_name,
  created_at
FROM credit_allocations 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check notification table structure and any existing data
SELECT 
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN type = 'seasonal_credits' THEN 1 END) as seasonal_notifications,
  COUNT(DISTINCT tenant_id) as tenants_with_notifications
FROM notifications;

