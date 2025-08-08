-- Remove unused pending_tenants table
-- This table was defined but never actually used in the application

DROP TABLE IF EXISTS pending_tenants CASCADE;

-- Verify removal
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'pending_tenants';

-- Should return no rows if successfully removed
SELECT 'pending_tenants table successfully removed' as status; 