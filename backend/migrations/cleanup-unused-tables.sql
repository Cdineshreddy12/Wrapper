-- Database Cleanup: Remove Unused Tables
-- Run this script to clean up unused tables from the database

-- Drop unused tables (in correct order to handle foreign key constraints)
DROP TABLE IF EXISTS permission_audit_log CASCADE;
DROP TABLE IF EXISTS rate_limit_logs CASCADE;
DROP TABLE IF EXISTS usage_billing CASCADE;
DROP TABLE IF EXISTS organization_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Verify cleanup
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Show remaining table count
SELECT COUNT(*) as remaining_tables 
FROM pg_tables 
WHERE schemaname = 'public'; 