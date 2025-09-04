# 🛡️ Tenant Data Isolation Setup Guide

This guide shows how to implement comprehensive tenant data isolation using the subdomain information from Nginx and Drizzle ORM with Supabase.

## 📋 Prerequisites

- ✅ Nginx configured with subdomain headers (`X-Subdomain`, `X-Tenant`)
- ✅ Supabase database with Drizzle ORM
- ✅ Database schema with `tenant_id` columns
- ✅ Existing tenant table with subdomain mapping

## 🏗️ Implementation Steps

### Step 1: Database Schema Updates

Ensure all tenant-sensitive tables have the required columns:

```sql
-- Example: Add tenant_id to existing tables
ALTER TABLE tenant_users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE organizations ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE custom_roles ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE credits ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE credit_transactions ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Add indexes for performance
CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_organizations_tenant ON organizations(tenant_id);
CREATE INDEX idx_custom_roles_tenant ON custom_roles(tenant_id);
CREATE INDEX idx_credits_tenant ON credits(tenant_id);
CREATE INDEX idx_credit_transactions_tenant ON credit_transactions(tenant_id);
```

### Step 2: Update Drizzle Schema Files

Add `tenantId` columns to your schema definitions:

```javascript
// src/db/schema/tenant-users.js
export const tenantUsers = pgTable('tenant_users', {
  userId: uuid('user_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.tenantId),

  // ... other fields
});

// src/db/schema/organizations.js
export const organizations = pgTable('organizations', {
  organizationId: uuid('organization_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.tenantId),

  // ... other fields
});
```

### Step 3: Integrate Tenant Isolation Middleware

```javascript
// src/app.js or src/server.js
import { tenantIsolationMiddleware, multiLevelIsolationMiddleware } from './middleware/tenant-isolation.js';
import { createTenantIsolatedRoutes } from './routes/examples/tenant-isolated-routes.js';

// Initialize database connection
const db = drizzle(connection);

// Apply tenant isolation to all API routes
app.use('/api', tenantIsolationMiddleware(db));

// Or use multi-level isolation for more granular control
app.use('/api/admin', multiLevelIsolationMiddleware(db));

// Add example routes (remove in production)
createTenantIsolatedRoutes(app, db);
```

### Step 4: Update Existing Routes

Modify your existing route handlers to use tenant isolation:

```javascript
// BEFORE (without isolation)
app.get('/api/users', async (req, res) => {
  const users = await db.select().from(tenantUsers);
  res.json(users);
});

// AFTER (with tenant isolation)
app.get('/api/users', async (req, res) => {
  // Using tenant-aware query builder
  const tenantUsersQuery = req.tenantQuery(tenantUsers);
  const users = await tenantUsersQuery.findAll();

  res.json({
    success: true,
    tenant: req.tenant.subdomain,
    users: users
  });
});
```

### Step 5: Implement Cross-Tenant Protection

```javascript
// Middleware to prevent cross-tenant access
function requireResourceOwnership(resourceTable, level = 'tenant') {
  return async (req, res, next) => {
    const resourceId = req.params.id || req.body.resourceId;

    const ownership = await req.tenantService.validateResourceOwnership(
      resourceTable,
      resourceId,
      req.isolationContext || { tenantId: req.tenantId },
      level
    );

    if (!ownership.valid) {
      return res.status(403).json({
        error: 'Access denied',
        reason: ownership.reason
      });
    }

    req.resource = ownership.resource;
    next();
  };
}

// Usage in routes
app.get('/api/users/:id',
  requireResourceOwnership(tenantUsers, 'tenant'),
  async (req, res) => {
    res.json({ user: req.resource });
  }
);
```

## 🔧 Usage Examples

### Basic Tenant Isolation

```javascript
// Get all users for current tenant
app.get('/api/users', async (req, res) => {
  const tenantUsersQuery = req.tenantQuery(tenantUsers);
  const users = await tenantUsersQuery.findAll();

  res.json({ users });
});

// Create user for current tenant
app.post('/api/users', async (req, res) => {
  const tenantUsersQuery = req.tenantQuery(tenantUsers);
  const newUser = await tenantUsersQuery.create({
    email: req.body.email,
    name: req.body.name
  });

  res.json({ user: newUser[0] });
});
```

### Organization-Level Isolation

```javascript
// Get users for specific organization within tenant
app.get('/api/organizations/:orgId/users', async (req, res) => {
  const { orgId } = req.params;

  // Validate organization ownership
  const orgOwnership = await req.tenantService.validateResourceOwnership(
    organizations,
    orgId,
    req.isolationContext,
    'organization'
  );

  if (!orgOwnership.valid) {
    return res.status(403).json({ error: orgOwnership.reason });
  }

  // Get users for this organization
  const orgUsersQuery = req.isolatedQuery(tenantUsers, 'organization');
  const users = await orgUsersQuery.findAll({
    organizationId: orgId
  });

  res.json({ users });
});
```

### Multi-Level Isolation (Tenant → Organization → Location → User)

```javascript
// Apply multi-level isolation middleware
app.use('/api/admin', multiLevelIsolationMiddleware(db));

// Routes automatically get isolation context
app.get('/api/admin/users', async (req, res) => {
  const { tenantId, organizationId, locationId, userId } = req.isolationContext;

  // Query automatically filtered by all applicable levels
  const usersQuery = req.isolatedQuery(tenantUsers, 'organization');
  const users = await usersQuery.findAll();

  res.json({
    isolation: {
      tenant: tenantId,
      organization: organizationId,
      location: locationId,
      user: userId
    },
    users
  });
});
```

## 🧪 Testing Isolation

### Test Scripts

```javascript
// Test tenant isolation
const testTenantIsolation = async () => {
  // Simulate different tenant requests
  const tenant1Request = { headers: { 'x-subdomain': 'tenant1' } };
  const tenant2Request = { headers: { 'x-subdomain': 'tenant2' } };

  // Both should only see their own data
  const tenant1Users = await getUsersForTenant(tenant1Request);
  const tenant2Users = await getUsersForTenant(tenant2Request);

  console.log('Tenant 1 users:', tenant1Users.length);
  console.log('Tenant 2 users:', tenant2Users.length);
  console.log('Isolation working:', tenant1Users.length !== tenant2Users.length);
};
```

### Manual Testing with cURL

```bash
# Test tenant1 data
curl -H "X-Subdomain: tenant1" http://localhost:3000/api/users

# Test tenant2 data
curl -H "X-Subdomain: tenant2" http://localhost:3000/api/users

# Test cross-tenant access (should fail)
curl -H "X-Subdomain: tenant1" \
     http://localhost:3000/api/organizations/tenant2-org-id
```

## 📊 Monitoring & Audit

### Audit Logging

```javascript
// Middleware for audit logging
app.use('/api/*', async (req, res, next) => {
  const auditEntry = {
    tenantId: req.tenantId,
    userId: req.user?.id,
    action: `${req.method} ${req.path}`,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date(),
    metadata: {
      query: req.query,
      body: req.body
    }
  };

  // Log to audit table
  await db.insert(auditLogs).values(auditEntry);

  next();
});
```

### Performance Monitoring

```javascript
// Monitor tenant-specific performance
app.use('/api/*', async (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    await db.insert(performanceLogs).values({
      tenantId: req.tenantId,
      endpoint: req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      timestamp: new Date()
    });
  });

  next();
});
```

## 🔧 Troubleshooting

### Common Issues

#### 1. "Tenant not found" errors
```javascript
// Check if subdomain exists in database
const tenant = await db
  .select()
  .from(tenants)
  .where(eq(tenants.subdomain, subdomain))
  .limit(1);

console.log('Tenant found:', tenant[0]);
```

#### 2. Cross-tenant data access
```javascript
// Verify tenant filter is applied
const query = db.select().from(tenantUsers);
console.log('Query without tenant filter:', await query);

// With tenant filter
const tenantQuery = req.tenantQuery(tenantUsers);
console.log('Query with tenant filter:', await tenantQuery.findAll());
```

#### 3. Performance issues
```javascript
// Check if indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'tenant_users';

// Add missing indexes
CREATE INDEX CONCURRENTLY idx_tenant_users_tenant_id ON tenant_users(tenant_id);
```

## 🚀 Production Considerations

### Database Optimization

```sql
-- Partition large tables by tenant
CREATE TABLE tenant_users_y2024 PARTITION OF tenant_users
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Use tenant-specific connection pools
-- Configure separate connection pools per tenant for large tenants
```

### Caching Strategy

```javascript
// Tenant-specific cache keys
const cacheKey = `tenant:${req.tenantId}:users:${userId}`;

// Cache tenant metadata
const tenantData = await cache.get(`tenant:${req.tenantId}:metadata`);
if (!tenantData) {
  tenantData = await db.select().from(tenants).where(eq(tenants.id, req.tenantId));
  await cache.set(`tenant:${req.tenantId}:metadata`, tenantData, 3600);
}
```

### Security Hardening

```javascript
// Rate limiting per tenant
const tenantRateLimit = new RateLimit({
  keyGenerator: (req) => `tenant:${req.tenantId}`,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each tenant to 1000 requests per windowMs
});

// Input validation with tenant context
const validateTenantInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        tenant: req.tenant.subdomain,
        details: error.details
      });
    }

    req.validatedData = value;
    next();
  };
};
```

## 📚 API Reference

### Available Methods

#### `req.tenantQuery(table)`
Returns a query builder scoped to the current tenant.

#### `req.isolatedQuery(table, level)`
Returns a query builder with multi-level isolation.

#### `req.tenantService.validateResourceOwnership(table, id, context, level)`
Validates if a resource belongs to the current tenant/context.

### Isolation Levels

- **tenant**: Only resources belonging to the current tenant
- **organization**: Resources within a specific organization
- **location**: Resources within a specific location
- **user**: Resources owned by a specific user

## 🎯 Next Steps

1. ✅ Update database schema with `tenant_id` columns
2. 🔄 Integrate tenant isolation middleware
3. 🔄 Update existing routes to use tenant-aware queries
4. 🔄 Add comprehensive testing
5. 🔄 Implement audit logging
6. 🔄 Set up monitoring and alerts

This implementation provides robust tenant data isolation while maintaining performance and developer experience.
