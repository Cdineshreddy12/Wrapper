# Organization Data Cleanup Scripts

This directory contains scripts to clean up all organization-related data from the database, preserving only the organization with `kinde_org_id = 'org_0e3615925db1d'`.

## ⚠️ **IMPORTANT WARNING**

**These scripts will permanently delete data from your database. Please ensure you have:**

1. ✅ **Backed up your database** before running any cleanup
2. ✅ **Tested in a non-production environment** first
3. ✅ **Proper database permissions** to perform deletions
4. ✅ **Verified the organization ID** you want to preserve

## 📁 Available Scripts

### 1. SQL Script (`cleanup-organizations.sql`)
- **Purpose**: Direct SQL execution for database administrators
- **Usage**: Run directly in your PostgreSQL client
- **Features**: Transaction safety, comprehensive cleanup, verification

### 2. Node.js Script (`cleanup-organizations.js`)
- **Purpose**: Programmatic execution with additional safety features
- **Usage**: Run from command line with Node.js
- **Features**: Dry-run mode, user confirmation, detailed logging

## 🚀 Quick Start

### Option A: SQL Script (Recommended for DBAs)

```bash
# 1. Connect to your database
psql -h your-host -U your-user -d your-database

# 2. Run the cleanup script
\i cleanup-organizations.sql

# 3. Verify results
SELECT COUNT(*) FROM tenants; -- Should return 1
```

### Option B: Node.js Script (Recommended for developers)

```bash
# 1. Install dependencies (if not already installed)
npm install postgres drizzle-orm dotenv

# 2. Set environment variables
export DATABASE_URL="postgresql://user:password@host:port/database"

# 3. Run with dry-run first (recommended)
node cleanup-organizations.js --dry-run

# 4. Run the actual cleanup
node cleanup-organizations.js --confirm
```

## 🔧 Configuration

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://username:password@host:port/database_name

# Optional
NODE_ENV=production
```

### Command Line Options

```bash
# Dry run mode (no data deleted)
node cleanup-organizations.js --dry-run

# Skip confirmation prompt
node cleanup-organizations.js --confirm

# Both options
node cleanup-organizations.js --dry-run --confirm
```

## 📊 What Gets Cleaned Up

The scripts will delete data from the following tables (in dependency order):

### Core Tables
- `tenants` - Organization records
- `tenant_users` - User accounts
- `subscriptions` - Subscription data
- `payments` - Payment history

### Permission & Role Tables
- `custom_roles` - Custom role definitions
- `user_role_assignments` - User-role mappings
- `user_application_permissions` - App-specific permissions
- `organization_applications` - App access settings

### Usage & Analytics Tables
- `usage_logs` - API usage logs
- `usage_metrics_daily` - Daily usage metrics
- `usage_alerts` - Usage alerts and notifications
- `activity_logs` - User activity tracking
- `audit_logs` - System audit logs

### Session & Authentication Tables
- `user_sessions` - User session data
- `sso_tokens` - SSO authentication tokens
- `tenant_invitations` - Pending invitations

### Trial & Subscription Tables
- `trial_events` - Trial-related events
- `trial_restrictions` - Trial restrictions
- `subscription_actions` - Subscription changes

### Other Tables
- `webhook_logs` - Webhook delivery logs

## 🛡️ Safety Features

### SQL Script Safety
- **Transaction Wrapper**: All operations wrapped in a transaction
- **Dependency Order**: Deletes in correct order to avoid foreign key violations
- **Verification**: Confirms the preserved organization exists before cleanup
- **Rollback**: Transaction can be rolled back if errors occur

### Node.js Script Safety
- **Dry-Run Mode**: Preview what would be deleted without making changes
- **User Confirmation**: Interactive confirmation before deletion
- **Detailed Logging**: Comprehensive logging of all operations
- **Error Handling**: Graceful error handling and cleanup
- **Progress Tracking**: Shows before/after counts for verification

## 📋 Pre-Cleanup Checklist

Before running the cleanup scripts:

- [ ] **Database Backup**: Full backup completed
- [ ] **Environment**: Running in appropriate environment (dev/staging first)
- [ ] **Organization ID**: Verified `org_0e3615925db1d` exists and should be preserved
- [ ] **Dependencies**: Required packages installed (for Node.js script)
- [ ] **Permissions**: Database user has DELETE permissions on all tables
- [ ] **Maintenance Window**: Scheduled during low-traffic period

## 🔍 Verification

### After Cleanup, Verify:

1. **Single Organization**: Only one tenant should remain
2. **Data Consistency**: All related data should be cleaned up
3. **No Orphaned Records**: Check for any remaining orphaned data

### Verification Queries:

```sql
-- Should return exactly 1
SELECT COUNT(*) FROM tenants;

-- Should return 0 for all other organizations
SELECT COUNT(*) FROM tenants WHERE kinde_org_id != 'org_0e3615925db1d';

-- Check for orphaned records
SELECT 'tenant_users' as table_name, COUNT(*) as count 
FROM tenant_users tu 
LEFT JOIN tenants t ON tu.tenant_id = t.tenant_id 
WHERE t.tenant_id IS NULL
UNION ALL
SELECT 'subscriptions' as table_name, COUNT(*) as count 
FROM subscriptions s 
LEFT JOIN tenants t ON s.tenant_id = t.tenant_id 
WHERE t.tenant_id IS NULL;
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Ensure your database user has DELETE permissions
   GRANT DELETE ON ALL TABLES IN SCHEMA public TO your_user;
   ```

2. **Foreign Key Violations**
   ```bash
   # The scripts handle this automatically, but if issues occur:
   # Check the deletion order in the scripts
   ```

3. **Organization Not Found**
   ```bash
   # Verify the organization ID exists
   SELECT * FROM tenants WHERE kinde_org_id = 'org_0e3615925db1d';
   ```

4. **Transaction Rollback**
   ```bash
   # If the SQL script fails, check the error and rollback
   ROLLBACK;
   ```

### Recovery Options

1. **From Backup**: Restore from your pre-cleanup backup
2. **Partial Recovery**: Use database logs to identify what was deleted
3. **Manual Cleanup**: Run cleanup operations manually in smaller batches

## 📞 Support

If you encounter issues:

1. **Check Logs**: Review the script output for error messages
2. **Verify Permissions**: Ensure database user has proper permissions
3. **Test Environment**: Try in a test environment first
4. **Database Support**: Contact your database administrator if needed

## 📝 Changelog

- **v1.0.0**: Initial release with SQL and Node.js scripts
- **Features**: Comprehensive cleanup, safety features, verification
- **Compatibility**: PostgreSQL 12+, Node.js 16+

## 📄 License

These scripts are provided as-is for database maintenance purposes. Use at your own risk and ensure proper testing before production use.

---

**Remember**: Always backup your database before running cleanup scripts!
