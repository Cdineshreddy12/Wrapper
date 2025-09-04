# 🛡️ Row Level Security (RLS) Tenant Isolation

This guide explains how to implement **automatic tenant data isolation** using PostgreSQL's Row Level Security (RLS) with session variables, eliminating the need for manual tenant filtering in your application code.

## 🎯 Why RLS?

### **Before RLS (Manual Filtering):**
```javascript
// ❌ Manual tenant filtering in every query
app.get('/api/users', async (req, res) => {
  const users = await db.select()
    .from(tenantUsers)
    .where(eq(tenantUsers.tenantId, req.tenantId)); // Manual filter
  res.json(users);
});
```

### **After RLS (Automatic Filtering):**
```javascript
// ✅ Automatic filtering via database policies
app.get('/api/users', async (req, res) => {
  const users = await db.select().from(tenantUsers); // No manual filter needed!
  res.json(users);
});
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Application    │    │   PostgreSQL    │
│                 │    │                  │    │                 │
│ X-Subdomain:    │───▶│ set_tenant_ctx() │───▶│ RLS Policies    │
│ tenant1         │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                               ┌────────▼────────┐
                                               │ Session Variable│
                                               │ app.tenant_id = │
                                               │ 'uuid-123...'   │
                                               └─────────────────┘
```

## 📋 Database Setup

### **1. Enable RLS on Tables**
```sql
-- Enable RLS on tenant-sensitive tables
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
-- ... enable on all tenant tables
```

### **2. Create Tenant Isolation Policies**
```sql
-- Basic tenant policy
CREATE POLICY tenant_users_tenant_isolation ON tenant_users
FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Cross-table policy for relationships
CREATE POLICY user_role_assignments_tenant_isolation ON user_role_assignments
FOR ALL USING (
  user_id IN (
    SELECT user_id FROM tenant_users
    WHERE tenant_id::text = current_setting('app.tenant_id', true)
  )
);
```

### **3. Helper Functions**
```sql
-- Get current tenant ID
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.tenant_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check tenant access
CREATE OR REPLACE FUNCTION check_tenant_access(resource_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN resource_tenant_id::text = current_setting('app.tenant_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔧 Application Integration

### **1. RLS Middleware**
```javascript
import { RLSTenantIsolationService } from './middleware/rls-tenant-isolation.js';

const rlsService = new RLSTenantIsolationService(db, connectionString);

// Apply RLS middleware
app.use('/api', rlsService.middleware());
```

### **2. How It Works**
```javascript
// 1. Nginx sends subdomain header
// X-Subdomain: tenant1

// 2. Middleware resolves tenant and sets context
await rlsService.setTenantContext(tenant1Id);
// Sets: app.tenant_id = 'uuid-of-tenant1'

// 3. All subsequent queries are automatically filtered
const users = await db.select().from(tenantUsers);
// Executes: SELECT * FROM tenant_users WHERE tenant_id = 'uuid-of-tenant1'
```

### **3. Route Examples**
```javascript
// Get users - automatically filtered by tenant
app.get('/api/users', async (req, res) => {
  const users = await db.select().from(tenantUsers); // No manual filtering!
  res.json({ users, tenant: req.tenant.subdomain });
});

// Create user - automatically assigned to tenant
app.post('/api/users', async (req, res) => {
  const newUser = await db.insert(tenantUsers).values({
    email: req.body.email,
    name: req.body.name
    // tenant_id is automatically set by RLS context
  });
  res.json({ user: newUser[0] });
});
```

## 🔒 Security Benefits

### **1. Database-Level Security**
- ✅ **Impossible to leak data** - enforced at database level
- ✅ **No application bugs** can bypass tenant isolation
- ✅ **Audit trail** of all data access

### **2. Automatic Protection**
- ✅ **All queries protected** - no manual filtering needed
- ✅ **Joins protected** - cross-table relationships secured
- ✅ **Aggregations protected** - SUM, COUNT, etc. tenant-scoped

### **3. Performance Benefits**
- ✅ **Index utilization** - tenant_id indexes work with RLS
- ✅ **Query optimization** - database can optimize tenant filtering
- ✅ **Connection pooling** - tenant context per connection

## 📊 Performance Considerations

### **Indexes**
```sql
-- Essential indexes for RLS performance
CREATE INDEX idx_tenant_users_tenant_rls ON tenant_users(tenant_id);
CREATE INDEX idx_organizations_tenant_rls ON organizations(tenant_id);
CREATE INDEX idx_custom_roles_tenant_rls ON custom_roles(tenant_id);

-- Composite indexes for common queries
CREATE INDEX idx_tenant_users_tenant_active ON tenant_users(tenant_id, is_active);
CREATE INDEX idx_tenant_users_tenant_email ON tenant_users(tenant_id, email);
```

### **Query Optimization**
```sql
-- RLS works best with selective indexes
EXPLAIN ANALYZE
SELECT * FROM tenant_users
WHERE email = 'user@example.com';
-- Should use: idx_tenant_users_tenant_email
```

### **Connection Management**
```javascript
// Reuse connections with tenant context
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Set tenant context per request
app.use(async (req, res, next) => {
  const client = await pool.connect();
  await client.query(`SELECT set_config('app.tenant_id', $1, false)`, [req.tenantId]);

  req.dbClient = client;
  res.on('finish', () => client.release());
  next();
});
```

## 🔄 Migration Strategy

### **Phase 1: Database Setup**
1. ✅ Add `tenant_id` columns to all tables
2. ✅ Enable RLS on all tenant tables
3. ✅ Create tenant isolation policies
4. ✅ Test policies with sample data

### **Phase 2: Application Migration**
1. 🔄 Replace manual tenant filtering with RLS middleware
2. 🔄 Update route handlers to remove manual `where` clauses
3. 🔄 Test all endpoints with tenant isolation
4. 🔄 Monitor performance and query plans

### **Phase 3: Advanced Features**
1. 📋 Add organization/location/user level isolation
2. 📋 Implement cross-tenant audit logging
3. 📋 Add tenant-specific performance monitoring
4. 📋 Create tenant data backup/restore procedures

## 🧪 Testing RLS

### **Unit Tests**
```javascript
describe('RLS Tenant Isolation', () => {
  it('should automatically filter users by tenant', async () => {
    // Set tenant context
    await rlsService.setTenantContext(tenant1Id);

    const users = await db.select().from(tenantUsers);
    expect(users.every(u => u.tenantId === tenant1Id)).toBe(true);
  });

  it('should prevent cross-tenant data access', async () => {
    // Set tenant1 context
    await rlsService.setTenantContext(tenant1Id);

    // Try to access tenant2 data
    const tenant2Users = await db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenant2Id));

    expect(tenant2Users).toHaveLength(0);
  });
});
```

### **Integration Tests**
```javascript
describe('RLS API Endpoints', () => {
  it('should return only tenant users', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('X-Subdomain', 'tenant1');

    const users = response.body.users;
    expect(users.every(u => u.tenantId === tenant1Id)).toBe(true);
  });
});
```

### **Manual Testing**
```bash
# Test with different tenants
curl -H "X-Subdomain: tenant1" http://localhost:3000/api/users
curl -H "X-Subdomain: tenant2" http://localhost:3000/api/users

# Check tenant context
curl -H "X-Subdomain: tenant1" http://localhost:3000/api/rls/health

# Test cross-tenant access (should return empty)
curl -H "X-Subdomain: tenant1" \
     "http://localhost:3000/api/users?tenant_id=tenant2-id"
```

## 🚨 Common Issues & Solutions

### **1. Performance Issues**
```sql
-- Check if queries are using indexes
EXPLAIN ANALYZE SELECT * FROM tenant_users WHERE email = 'test@example.com';

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_tenant_users_email ON tenant_users(email);
```

### **2. Policy Not Working**
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'tenant_users';

-- Check policy definition
SELECT * FROM pg_policies WHERE tablename = 'tenant_users';
```

### **3. Context Not Set**
```sql
-- Check current session variables
SHOW app.tenant_id;

-- Check context function
SELECT get_tenant_context();
```

### **4. Permission Issues**
```sql
-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_users TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
```

## 📈 Monitoring & Maintenance

### **Health Checks**
```javascript
// RLS health check endpoint
app.get('/api/health/rls', async (req, res) => {
  const health = await rlsService.healthCheck();
  const context = await rlsService.getTenantContext();

  res.json({
    rls_enabled: health.status === 'healthy',
    tenant_context: context,
    policies_count: await countRLSPolicies()
  });
});
```

### **Performance Monitoring**
```javascript
// Monitor RLS query performance
app.use('/api/*', async (req, res, next) => {
  const start = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - start;

    if (duration > 1000) { // Log slow queries
      console.log(`Slow RLS query: ${req.method} ${req.path} (${duration}ms)`);
    }
  });

  next();
});
```

### **Backup Strategy**
```sql
-- Tenant-specific backup
CREATE OR REPLACE FUNCTION backup_tenant_data(tenant_uuid uuid)
RETURNS void AS $$
DECLARE
  backup_file text;
BEGIN
  backup_file := 'tenant_' || tenant_uuid || '_' || to_char(now(), 'YYYYMMDD_HH24MI');

  -- Set tenant context
  PERFORM set_config('app.tenant_id', tenant_uuid::text, false);

  -- Export tenant data
  EXECUTE format('COPY (
    SELECT * FROM tenant_users
    UNION ALL SELECT * FROM organizations
    UNION ALL SELECT * FROM custom_roles
  ) TO %L WITH CSV HEADER', '/backups/' || backup_file || '.csv');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🎯 Best Practices

### **1. Always Use RLS Context**
```javascript
// ✅ Good: Use middleware
app.use('/api', rlsService.middleware());

// ❌ Bad: Manual context setting
await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId})`);
```

### **2. Test Thoroughly**
```javascript
// ✅ Test with multiple tenants
const tenants = ['tenant1', 'tenant2', 'tenant3'];
for (const tenant of tenants) {
  await testTenantIsolation(tenant);
}
```

### **3. Monitor Performance**
```javascript
// ✅ Monitor query performance
EXPLAIN ANALYZE SELECT * FROM tenant_users LIMIT 10;
```

### **4. Handle Errors Gracefully**
```javascript
// ✅ Handle RLS errors
try {
  const users = await db.select().from(tenantUsers);
} catch (error) {
  if (error.message.includes('RLS')) {
    res.status(403).json({ error: 'Access denied' });
  }
}
```

## 🚀 Advanced Features

### **Multi-Level Isolation**
```sql
-- Organization-level policy
CREATE POLICY org_users_policy ON tenant_users
FOR ALL USING (
  tenant_id::text = current_setting('app.tenant_id', true)
  AND organization_id IN (
    SELECT organization_id FROM organizations
    WHERE tenant_id::text = current_setting('app.tenant_id', true)
  )
);

-- Location-level policy
CREATE POLICY location_users_policy ON tenant_users
FOR ALL USING (
  tenant_id::text = current_setting('app.tenant_id', true)
  AND location_id IN (
    SELECT location_id FROM locations
    WHERE tenant_id::text = current_setting('app.tenant_id', true)
  )
);
```

### **Audit Logging**
```sql
-- Automatic audit logging
CREATE OR REPLACE FUNCTION audit_tenant_access()
RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    table_name,
    operation,
    user_id,
    record_id,
    old_values,
    new_values
  ) VALUES (
    current_setting('app.tenant_id', true)::uuid,
    TG_TABLE_NAME,
    TG_OP,
    current_setting('app.user_id', true)::uuid,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit trigger
CREATE TRIGGER audit_tenant_users
  AFTER INSERT OR UPDATE OR DELETE ON tenant_users
  FOR EACH ROW EXECUTE FUNCTION audit_tenant_access();
```

## 📚 Implementation Checklist

- [ ] Add `tenant_id` columns to all tables
- [ ] Enable RLS on all tenant tables
- [ ] Create tenant isolation policies
- [ ] Set up helper functions
- [ ] Implement RLS middleware
- [ ] Update application routes
- [ ] Add performance indexes
- [ ] Test with multiple tenants
- [ ] Monitor performance
- [ ] Set up audit logging
- [ ] Create backup procedures
- [ ] Document security policies

**RLS provides enterprise-grade tenant isolation with minimal application code changes and maximum security!** 🎉
