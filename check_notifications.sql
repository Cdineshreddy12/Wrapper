
-- Check notifications for the specific tenant
SELECT 
  notification_id,
  type,
  title,
  message,
  tenant_id,
  target_user_id,
  is_read,
  created_at
FROM notifications 
WHERE tenant_id = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4'
ORDER BY created_at DESC;

-- Check all notifications to see what's in the table
SELECT 
  COUNT(*) as total,
  tenant_id,
  type,
  title
FROM notifications 
GROUP BY tenant_id, type, title
ORDER BY tenant_id, type;

