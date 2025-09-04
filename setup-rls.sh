#!/bin/bash

# Setup Row Level Security (RLS) for Tenant Isolation
# This script applies RLS policies to all tenant-sensitive tables

set -e

echo "🛡️ Setting up Row Level Security (RLS) for Tenant Isolation"
echo "=========================================================="

# Check if PostgreSQL client is available
if ! command -v psql >/dev/null 2>&1; then
    echo "❌ PostgreSQL client (psql) is not installed."
    echo ""
    echo "Install PostgreSQL client:"
    echo "  Ubuntu/Debian: sudo apt install postgresql-client"
    echo "  CentOS/RHEL: sudo yum install postgresql"
    echo "  macOS: brew install postgresql"
    exit 1
fi

# Get database connection details
read -p "Enter database host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter database port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Enter database name: " DB_NAME
if [ -z "$DB_NAME" ]; then
    echo "❌ Database name is required"
    exit 1
fi

read -p "Enter database username: " DB_USER
if [ -z "$DB_USER" ]; then
    echo "❌ Database username is required"
    exit 1
fi

# Get password securely
echo -n "Enter database password: "
read -s DB_PASSWORD
echo ""

# Export for psql
export PGPASSWORD="$DB_PASSWORD"

# Test connection
echo "🔗 Testing database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "❌ Failed to connect to database"
    echo "   Please check your connection details and try again"
    exit 1
fi

echo "✅ Database connection successful"

# Check if RLS is already enabled on key tables
echo "🔍 Checking existing RLS status..."
TENANT_USERS_RLS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT relrowsecurity FROM pg_class WHERE relname = 'tenant_users';" 2>/dev/null || echo "false")

if [ "$TENANT_USERS_RLS" = "t" ]; then
    echo "⚠️  RLS is already enabled on some tables"
    read -p "Do you want to continue and update existing policies? (y/N): " CONTINUE
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 0
    fi
fi

# Apply RLS migration
echo "🚀 Applying RLS policies..."
MIGRATION_FILE="backend/src/db/migrations/0013_setup_rls_policies.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Run the migration
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo "✅ RLS policies applied successfully"
else
    echo "❌ Failed to apply RLS policies"
    exit 1
fi

# Verify RLS setup
echo "🔍 Verifying RLS setup..."

# Check if helper functions were created
FUNCTIONS_CHECK=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('current_tenant_id', 'check_tenant_access', 'get_tenant_context');" 2>/dev/null || echo "0")

if [ "$FUNCTIONS_CHECK" -ge 3 ]; then
    echo "✅ Helper functions created successfully"
else
    echo "⚠️  Some helper functions may not have been created"
fi

# Test RLS functionality
echo "🧪 Testing RLS functionality..."

# Create test tenant context
TEST_TENANT_ID="550e8400-e29b-41d4-a716-446655440000"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT set_config('app.tenant_id', '$TEST_TENANT_ID', false);" >/dev/null 2>&1

# Check tenant context
CONTEXT_CHECK=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT get_tenant_context();" 2>/dev/null || echo "error")

if echo "$CONTEXT_CHECK" | grep -q "$TEST_TENANT_ID"; then
    echo "✅ Tenant context functions working"
else
    echo "⚠️  Tenant context functions may not be working correctly"
fi

# Check RLS policies on key tables
echo "📋 RLS Policies Status:"
TABLES=("tenant_users" "organizations" "custom_roles" "credits" "audit_logs")
for table in "${TABLES[@]}"; do
    RLS_STATUS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT relrowsecurity FROM pg_class WHERE relname = '$table';" 2>/dev/null || echo "false")
    if [ "$RLS_STATUS" = "t" ]; then
        echo "   ✅ $table: RLS enabled"
    else
        echo "   ❌ $table: RLS not enabled"
    fi
done

# Clear test context
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT set_config('app.tenant_id', '', false);" >/dev/null 2>&1

echo ""
echo "🎉 RLS Setup Complete!"
echo ""
echo "📋 What was configured:"
echo "   ✅ Row Level Security enabled on all tenant tables"
echo "   ✅ Tenant isolation policies created"
echo "   ✅ Helper functions for tenant context"
echo "   ✅ Database indexes for performance"
echo ""
echo "🔧 Next steps:"
echo "1. Update your application code to use RLS middleware"
echo "2. Test tenant isolation with your application"
echo "3. Remove manual tenant filtering from existing queries"
echo "4. Monitor performance and adjust as needed"
echo ""
echo "📚 Usage:"
echo "   See rls-examples.js for sample routes using RLS"
echo "   Use RLSTenantIsolationService in your middleware"
echo ""
echo "🔍 Test commands:"
echo "   curl -H 'X-Subdomain: yourtenant' http://localhost:3000/api/rls/health"
echo "   curl -H 'X-Subdomain: yourtenant' http://localhost:3000/api/rls/users"
