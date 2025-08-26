-- =====================================================
-- Organization Data Cleanup Script
-- =====================================================
-- This script deletes all organization-related data except for 'org_0e3615925db1d'
-- 
-- IMPORTANT: 
-- 1. BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT
-- 2. This script will permanently delete data
-- 3. Run in a test environment first
-- 4. Ensure you have proper permissions
-- =====================================================

-- Start transaction for safety
BEGIN;

-- =====================================================
-- Step 1: Identify the organization to preserve
-- =====================================================
DO $$
DECLARE
    preserve_org_id UUID;
    preserve_kinde_org_id VARCHAR(255);
    preserve_subdomain VARCHAR(100);
BEGIN
    -- Find the organization to preserve by kinde_org_id
    SELECT tenant_id, kinde_org_id, subdomain 
    INTO preserve_org_id, preserve_kinde_org_id, preserve_subdomain
    FROM tenants 
    WHERE kinde_org_id = 'org_0e3615925db1d';
    
    IF preserve_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization with kinde_org_id "org_0e3615925db1d" not found!';
    END IF;
    
    RAISE NOTICE 'Preserving organization: ID=%, KindeID=%, Subdomain=%', 
                 preserve_org_id, preserve_kinde_org_id, preserve_subdomain;
END $$;

-- =====================================================
-- Step 2: Delete data in reverse dependency order
-- =====================================================

-- 2.1 Delete webhook logs (if table exists)
DELETE FROM webhook_logs 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.2 Delete usage alerts
DELETE FROM usage_alerts 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.3 Delete usage logs
DELETE FROM usage_logs 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.4 Delete daily usage metrics
DELETE FROM usage_metrics_daily 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.5 Delete activity logs
DELETE FROM activity_logs 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.6 Delete audit logs
DELETE FROM audit_logs 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.7 Delete user sessions
DELETE FROM user_sessions 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.8 Delete SSO tokens
DELETE FROM sso_tokens 
WHERE user_id IN (
    SELECT user_id FROM tenant_users 
    WHERE tenant_id IN (
        SELECT tenant_id FROM tenants 
        WHERE kinde_org_id != 'org_0e3615925db1d'
    )
);

-- 2.9 Delete user application permissions
DELETE FROM user_application_permissions 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.10 Delete organization applications
DELETE FROM organization_applications 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.11 Delete user role assignments
DELETE FROM user_role_assignments 
WHERE user_id IN (
    SELECT user_id FROM tenant_users 
    WHERE tenant_id IN (
        SELECT tenant_id FROM tenants 
        WHERE kinde_org_id != 'org_0e3615925db1d'
    )
);

-- 2.12 Delete custom roles
DELETE FROM custom_roles 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.13 Delete trial restrictions
DELETE FROM trial_restrictions 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.14 Delete trial events
DELETE FROM trial_events 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.15 Delete subscription actions
DELETE FROM subscription_actions 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.16 Delete payments
DELETE FROM payments 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.17 Delete subscriptions
DELETE FROM subscriptions 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.18 Delete tenant invitations
DELETE FROM tenant_invitations 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.19 Delete tenant users
DELETE FROM tenant_users 
WHERE tenant_id IN (
    SELECT tenant_id FROM tenants 
    WHERE kinde_org_id != 'org_0e3615925db1d'
);

-- 2.20 Finally, delete the tenants
DELETE FROM tenants 
WHERE kinde_org_id != 'org_0e3615925db1d';

-- =====================================================
-- Step 3: Verify cleanup results
-- =====================================================
DO $$
DECLARE
    remaining_tenants INTEGER;
    remaining_users INTEGER;
    remaining_subscriptions INTEGER;
    remaining_payments INTEGER;
    remaining_roles INTEGER;
    remaining_usage_logs INTEGER;
BEGIN
    -- Count remaining records
    SELECT COUNT(*) INTO remaining_tenants FROM tenants;
    SELECT COUNT(*) INTO remaining_users FROM tenant_users;
    SELECT COUNT(*) INTO remaining_subscriptions FROM subscriptions;
    SELECT COUNT(*) INTO remaining_payments FROM payments;
    SELECT COUNT(*) INTO remaining_roles FROM custom_roles;
    SELECT COUNT(*) INTO remaining_usage_logs FROM usage_logs;
    
    RAISE NOTICE 'Cleanup completed successfully!';
    RAISE NOTICE 'Remaining records:';
    RAISE NOTICE '  - Tenants: %', remaining_tenants;
    RAISE NOTICE '  - Users: %', remaining_users;
    RAISE NOTICE '  - Subscriptions: %', remaining_subscriptions;
    RAISE NOTICE '  - Payments: %', remaining_payments;
    RAISE NOTICE '  - Roles: %', remaining_roles;
    RAISE NOTICE '  - Usage Logs: %', remaining_usage_logs;
    
    -- Verify the preserved organization still exists
    IF remaining_tenants != 1 THEN
        RAISE EXCEPTION 'Expected exactly 1 tenant to remain, but found %', remaining_tenants;
    END IF;
    
    RAISE NOTICE 'Organization "org_0e3615925db1d" preserved successfully!';
END $$;

-- =====================================================
-- Step 4: Optional - Reset sequences if needed
-- =====================================================
-- Uncomment the following lines if you want to reset auto-increment sequences
-- This is optional and only needed if you want to start fresh with IDs

/*
-- Reset sequences for tables that use auto-increment
-- Note: This will affect future insertions
SELECT setval(pg_get_serial_sequence('tenants', 'tenant_id'), 1, false);
SELECT setval(pg_get_serial_sequence('tenant_users', 'user_id'), 1, false);
SELECT setval(pg_get_serial_sequence('subscriptions', 'subscription_id'), 1, false);
SELECT setval(pg_get_serial_sequence('payments', 'payment_id'), 1, false);
SELECT setval(pg_get_serial_sequence('custom_roles', 'role_id'), 1, false);
*/

-- =====================================================
-- Step 5: Commit the transaction
-- =====================================================
COMMIT;

-- =====================================================
-- Final verification query
-- =====================================================
-- Run this to verify the cleanup
SELECT 
    'tenants' as table_name,
    COUNT(*) as record_count
FROM tenants
UNION ALL
SELECT 
    'tenant_users' as table_name,
    COUNT(*) as record_count
FROM tenant_users
UNION ALL
SELECT 
    'subscriptions' as table_name,
    COUNT(*) as record_count
FROM subscriptions
UNION ALL
SELECT 
    'payments' as table_name,
    COUNT(*) as record_count
FROM payments
UNION ALL
SELECT 
    'custom_roles' as table_name,
    COUNT(*) as record_count
FROM custom_roles
UNION ALL
SELECT 
    'usage_logs' as table_name,
    COUNT(*) as record_count
FROM usage_logs
UNION ALL
SELECT 
    'usage_metrics_daily' as table_name,
    COUNT(*) as record_count
FROM usage_metrics_daily
ORDER BY table_name;

-- =====================================================
-- Script completed successfully!
-- =====================================================
