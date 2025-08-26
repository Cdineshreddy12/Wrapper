#!/usr/bin/env node

/**
 * Organization Data Cleanup Script (Node.js Version)
 * 
 * This script deletes all organization-related data except for 'org_0e3615925db1d'
 * 
 * IMPORTANT: 
 * 1. BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT
 * 2. This script will permanently delete data
 * 3. Run in a test environment first
 * 4. Ensure you have proper database permissions
 * 
 * Usage:
 * node cleanup-organizations.js [--dry-run] [--confirm]
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import readline from 'readline';

// Load environment variables
config();

// Configuration
const PRESERVE_ORG_ID = 'org_0e3615925db1d';
const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--confirm');

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// Create readline interface for user confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Helper function to ask for confirmation
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.toLowerCase());
        });
    });
}

// Helper function to log with timestamp
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Helper function to count records
async function countRecords(tableName, whereClause = '') {
    try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)} ${sql.unsafe(whereClause)}`;
        return parseInt(result[0]?.count || 0);
    } catch (error) {
        log(`Failed to count records in ${tableName}: ${error.message}`, 'warning');
        return 0;
    }
}

// Helper function to delete records
async function deleteRecords(tableName, whereClause, description) {
    try {
        if (DRY_RUN) {
            const count = await countRecords(tableName, whereClause);
            log(`[DRY RUN] Would delete ${count} records from ${tableName} - ${description}`, 'info');
            return count;
        } else {
            const result = await sql`DELETE FROM ${sql(tableName)} ${sql.unsafe(whereClause)}`;
            log(`Deleted ${result.count} records from ${tableName} - ${description}`, 'success');
            return result.count;
        }
    } catch (error) {
        log(`Failed to delete records from ${tableName}: ${error.message}`, 'error');
        return 0;
    }
}

// Main cleanup function
async function cleanupOrganizations() {
    log('🚀 Starting organization data cleanup...', 'info');
    
    if (DRY_RUN) {
        log('🔍 DRY RUN MODE - No data will be deleted', 'warning');
    }
    
    // Step 1: Verify the organization to preserve exists
    log('Step 1: Verifying organization to preserve...', 'info');
    const preserveOrg = await sql`
        SELECT tenant_id, kinde_org_id, subdomain, company_name 
        FROM tenants 
        WHERE kinde_org_id = ${PRESERVE_ORG_ID}
    `;
    
    if (preserveOrg.length === 0) {
        log(`❌ Organization with kinde_org_id "${PRESERVE_ORG_ID}" not found!`, 'error');
        process.exit(1);
    }
    
    const org = preserveOrg[0];
    log(`✅ Preserving organization: ${org.company_name} (${org.subdomain})`, 'success');
    
    // Step 2: Get counts before cleanup
    log('Step 2: Counting records before cleanup...', 'info');
    const beforeCounts = {
        tenants: await countRecords('tenants'),
        tenantUsers: await countRecords('tenant_users'),
        subscriptions: await countRecords('subscriptions'),
        payments: await countRecords('payments'),
        customRoles: await countRecords('custom_roles'),
        usageLogs: await countRecords('usage_logs'),
        usageMetricsDaily: await countRecords('usage_metrics_daily'),
        auditLogs: await countRecords('audit_logs'),
        activityLogs: await countRecords('activity_logs'),
        userSessions: await countRecords('user_sessions'),
        ssoTokens: await countRecords('sso_tokens'),
        userApplicationPermissions: await countRecords('user_application_permissions'),
        organizationApplications: await countRecords('organization_applications'),
        userRoleAssignments: await countRecords('user_role_assignments'),
        trialRestrictions: await countRecords('trial_restrictions'),
        trialEvents: await countRecords('trial_events'),
        subscriptionActions: await countRecords('subscription_actions'),
        tenantInvitations: await countRecords('tenant_invitations'),
        usageAlerts: await countRecords('usage_alerts')
    };
    
    log('Records before cleanup:', 'info');
    Object.entries(beforeCounts).forEach(([table, count]) => {
        log(`  ${table}: ${count}`, 'info');
    });
    
    // Step 3: User confirmation (unless --confirm flag is used)
    if (!CONFIRM && !DRY_RUN) {
        const answer = await askQuestion('\n⚠️  This will permanently delete data. Type "YES" to continue: ');
        if (answer !== 'yes') {
            log('Operation cancelled by user', 'warning');
            process.exit(0);
        }
    }
    
    // Step 4: Perform cleanup in reverse dependency order
    log('Step 3: Starting data cleanup...', 'info');
    
    const deleteOperations = [
        // Delete in reverse dependency order
        { table: 'webhook_logs', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'webhook logs' },
        { table: 'usage_alerts', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'usage alerts' },
        { table: 'usage_logs', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'usage logs' },
        { table: 'usage_metrics_daily', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'daily usage metrics' },
        { table: 'activity_logs', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'activity logs' },
        { table: 'audit_logs', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'audit logs' },
        { table: 'user_sessions', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'user sessions' },
        { table: 'sso_tokens', where: `WHERE user_id IN (SELECT user_id FROM tenant_users WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}'))`, desc: 'SSO tokens' },
        { table: 'user_application_permissions', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'user application permissions' },
        { table: 'organization_applications', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'organization applications' },
        { table: 'user_role_assignments', where: `WHERE user_id IN (SELECT user_id FROM tenant_users WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}'))`, desc: 'user role assignments' },
        { table: 'custom_roles', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'custom roles' },
        { table: 'trial_restrictions', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'trial restrictions' },
        { table: 'trial_events', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'trial events' },
        { table: 'subscription_actions', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'subscription actions' },
        { table: 'payments', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'payments' },
        { table: 'subscriptions', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'subscriptions' },
        { table: 'tenant_invitations', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'tenant invitations' },
        { table: 'tenant_users', where: `WHERE tenant_id IN (SELECT tenant_id FROM tenants WHERE kinde_org_id != '${PRESERVE_ORG_ID}')`, desc: 'tenant users' },
        { table: 'tenants', where: `WHERE kinde_org_id != '${PRESERVE_ORG_ID}'`, desc: 'tenants' }
    ];
    
    let totalDeleted = 0;
    for (const operation of deleteOperations) {
        const deleted = await deleteRecords(operation.table, operation.where, operation.desc);
        totalDeleted += deleted;
    }
    
    // Step 5: Verify cleanup results
    log('Step 4: Verifying cleanup results...', 'info');
    const afterCounts = {
        tenants: await countRecords('tenants'),
        tenantUsers: await countRecords('tenant_users'),
        subscriptions: await countRecords('subscriptions'),
        payments: await countRecords('payments'),
        customRoles: await countRecords('custom_roles'),
        usageLogs: await countRecords('usage_logs'),
        usageMetricsDaily: await countRecords('usage_metrics_daily'),
        auditLogs: await countRecords('audit_logs'),
        activityLogs: await countRecords('activity_logs'),
        userSessions: await countRecords('user_sessions'),
        ssoTokens: await countRecords('sso_tokens'),
        userApplicationPermissions: await countRecords('user_application_permissions'),
        organizationApplications: await countRecords('organization_applications'),
        userRoleAssignments: await countRecords('user_role_assignments'),
        trialRestrictions: await countRecords('trial_restrictions'),
        trialEvents: await countRecords('trial_events'),
        subscriptionActions: await countRecords('subscription_actions'),
        tenantInvitations: await countRecords('tenant_invitations'),
        usageAlerts: await countRecords('usage_alerts')
    };
    
    log('Records after cleanup:', 'info');
    Object.entries(afterCounts).forEach(([table, count]) => {
        log(`  ${table}: ${count}`, 'info');
    });
    
    // Verify the preserved organization still exists
    if (afterCounts.tenants !== 1) {
        log(`❌ Expected exactly 1 tenant to remain, but found ${afterCounts.tenants}`, 'error');
        process.exit(1);
    }
    
    // Summary
    log('🎉 Cleanup completed successfully!', 'success');
    if (DRY_RUN) {
        log(`📊 Would have deleted approximately ${totalDeleted} records`, 'info');
    } else {
        log(`📊 Deleted ${totalDeleted} records total`, 'success');
    }
    log(`✅ Organization "${PRESERVE_ORG_ID}" preserved successfully!`, 'success');
    
    // Show what was deleted
    log('\n📋 Cleanup Summary:', 'info');
    Object.entries(beforeCounts).forEach(([table, beforeCount]) => {
        const afterCount = afterCounts[table];
        const deleted = beforeCount - afterCount;
        if (deleted > 0) {
            log(`  ${table}: ${beforeCount} → ${afterCount} (deleted ${deleted})`, 'info');
        }
    });
}

// Error handling and cleanup
process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    log(`Uncaught Exception: ${error.message}`, 'error');
    process.exit(1);
});

// Main execution
async function main() {
    try {
        await cleanupOrganizations();
    } catch (error) {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    } finally {
        await sql.end();
        rl.close();
    }
}

// Run the script
if (require.main === module) {
    main();
}

export { cleanupOrganizations };
