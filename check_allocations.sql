
-- Check if any allocations were created
SELECT 
  COUNT(*) as total_allocations,
  COUNT(CASE WHEN campaign_id IS NOT NULL THEN 1 END) as campaign_allocations,
  COUNT(DISTINCT tenant_id) as tenants_with_allocations
FROM credit_allocations;

-- Check recent allocations
SELECT 
  tenant_id,
  credit_type,
  campaign_id,
  campaign_name,
  allocated_credits,
  available_credits,
  created_at
FROM credit_allocations 
WHERE created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 10;

-- Check notifications table
SELECT 
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN type = 'seasonal_credits' THEN 1 END) as seasonal_notifications
FROM notifications;

