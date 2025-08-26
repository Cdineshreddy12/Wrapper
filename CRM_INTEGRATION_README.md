# 🔗 **CRM Integration with Wrapper User Sync System**

## 📋 **Overview**

This document explains how to integrate your CRM application (`https://crm.zopkit.com`) with the Wrapper's user synchronization system. The integration allows automatic user creation, updates, and management across both systems.

## 🏗️ **Architecture**

```
┌─────────────────┐    HTTP POST    ┌─────────────────┐
│   Wrapper       │ ──────────────► │   CRM App       │
│   Backend       │                 │   (zopkit.com)  │
│                 │                 │                 │
│ • User Mgmt     │                 │ • User Sync     │
│ • Permissions   │                 │ • Data Storage  │
│ • Sync Engine   │                 │ • Business      │
└─────────────────┘                 │   Logic         │
                                     └─────────────────┘
```

## 🚀 **Quick Start**

### **1. Environment Setup**

#### **In Wrapper Backend (.env)**
```bash
# CRM Application URL
CRM_APP_URL=https://crm.zopkit.com

# Internal API Key (must match CRM)
INTERNAL_API_KEY=your-super-secure-api-key-2024
```

#### **In CRM Application (.env)**
```bash
# Must match wrapper's INTERNAL_API_KEY
INTERNAL_API_KEY=your-super-secure-api-key-2024

# Your CRM configuration
DATABASE_URL=your-database-url
PORT=3000
NODE_ENV=production
```

### **2. Create Sync Endpoint in CRM**

Add this endpoint to your CRM application:

```javascript
// Express.js example - add to your CRM app
app.post('/api/internal/sync/users', async (req, res) => {
  try {
    // 1. Security verification
    const apiKey = req.headers['x-internal-api-key'];
    const tenantId = req.headers['x-tenant-id'];
    
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized - Invalid API key' 
      });
    }
    
    // 2. Process sync request
    const { operation, tenant, users, metadata } = req.body;
    
    console.log(`🔄 Syncing ${users.length} users for tenant: ${tenant.name}`);
    
    // 3. Sync each user
    const results = [];
    for (const user of users) {
      try {
        let crmUser = await findUserByEmail(user.email);
        
        if (!crmUser) {
          // Create new user
          crmUser = await createUser({
            email: user.email,
            name: user.name,
            kindeUserId: user.kindeUserId,
            tenantId: tenant.id,
            isActive: user.isActive,
            isAdmin: user.isAdmin,
            department: user.department,
            title: user.title,
            roles: user.roles,
            permissions: user.permissions,
            syncedFrom: 'wrapper',
            lastSyncedAt: new Date()
          });
          
          results.push({ 
            userId: user.id, 
            status: 'created', 
            crmUserId: crmUser.id 
          });
        } else {
          // Update existing user
          await updateUser(crmUser.id, {
            name: user.name,
            isActive: user.isActive,
            roles: user.roles,
            permissions: user.permissions,
            lastSyncedAt: new Date()
          });
          
          results.push({ 
            userId: user.id, 
            status: 'updated', 
            crmUserId: crmUser.id 
          });
        }
      } catch (error) {
        results.push({ 
          userId: user.id, 
          status: 'failed', 
          error: error.message 
        });
      }
    }
    
    // 4. Return results
    res.json({
      success: true,
      message: `Synced ${users.length} users`,
      results,
      tenant: tenant.id,
      syncedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

## 📡 **API Specification**

### **Endpoint**
```
POST https://crm.zopkit.com/api/internal/sync/users
```

### **Headers**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Internal-API-Key` | ✅ | Authentication key (must match both systems) |
| `X-Tenant-ID` | ✅ | Tenant identifier |
| `X-Sync-Source` | ✅ | Source system identifier |
| `Content-Type` | ✅ | Must be `application/json` |

### **Request Body**
```json
{
  "operation": "user_sync",
  "tenant": {
    "id": "tenant-uuid",
    "name": "Company Name",
    "subdomain": "company-subdomain",
    "kindeOrgId": "kinde-organization-id"
  },
  "users": [
    {
      "id": "user-uuid",
      "kindeUserId": "kinde-user-id",
      "email": "user@company.com",
      "name": "User Full Name",
      "avatar": "https://avatar-url.com/image.jpg",
      "isActive": true,
      "isAdmin": false,
      "department": "Sales",
      "title": "Sales Manager",
      "lastActiveAt": "2025-08-19T10:00:00.000Z",
      "roles": ["user", "manager"],
      "permissions": ["read", "write", "delete"],
      "allowedApplications": ["crm", "hr", "analytics"],
      "subscriptionTier": "premium"
    }
  ],
  "metadata": {
    "syncTime": "2025-08-19T10:00:00.000Z",
    "syncedBy": "wrapper-user-sync-service",
    "syncType": "single_user|full|incremental",
    "applicationCode": "crm"
  }
}
```

### **Response Format**
```json
{
  "success": true,
  "message": "Successfully synced 5 users",
  "results": [
    {
      "userId": "user-uuid",
      "status": "created|updated|failed",
      "crmUserId": "crm-user-id",
      "message": "User created successfully",
      "error": "Error message (if failed)"
    }
  ],
  "tenant": {
    "id": "tenant-uuid",
    "name": "Company Name"
  },
  "metadata": {
    "operation": "user_sync",
    "syncedAt": "2025-08-19T10:00:00.000Z",
    "totalUsers": 5,
    "successful": 4,
    "failed": 1
  }
}
```

## 🔐 **Security Implementation**

### **1. API Key Verification**
```javascript
// Always verify the API key first
const apiKey = req.headers['x-internal-api-key'];
if (apiKey !== process.env.INTERNAL_API_KEY) {
  return res.status(401).json({ 
    success: false, 
    error: 'Unauthorized' 
  });
}
```

### **2. Rate Limiting (Recommended)**
```javascript
import rateLimit from 'express-rate-limit';

const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many sync requests, please try again later'
});

app.use('/api/internal/sync/users', syncLimiter);
```

### **3. Request Validation**
```javascript
import Joi from 'joi';

const syncSchema = Joi.object({
  operation: Joi.string().required(),
  tenant: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required()
  }).required(),
  users: Joi.array().items(Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().required()
  })).required()
});

// Validate request body
const { error } = syncSchema.validate(req.body);
if (error) {
  return res.status(400).json({
    success: false,
    error: 'Invalid request format',
    details: error.details
  });
}
```

## 🗄️ **Database Schema**

### **Users Table**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  kinde_user_id VARCHAR(255),
  tenant_id VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  department VARCHAR(100),
  title VARCHAR(100),
  roles JSONB DEFAULT '[]',
  permissions JSONB DEFAULT '[]',
  synced_from VARCHAR(50) DEFAULT 'wrapper',
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_kinde_user_id ON users(kinde_user_id);
```

### **Sync Logs Table (Optional)**
```sql
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  operation VARCHAR(50) NOT NULL,
  total_users INTEGER NOT NULL,
  successful INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  details JSONB,
  synced_at TIMESTAMP DEFAULT NOW()
);
```

## 🧪 **Testing**

### **1. Test Endpoint Accessibility**
```bash
curl -X POST https://crm.zopkit.com/api/internal/sync/users \
  -H "Content-Type: application/json" \
  -H "X-Internal-API-Key: your-api-key" \
  -d '{"test": "connection"}'
```

### **2. Test Full Sync Request**
```bash
curl -X POST https://crm.zopkit.com/api/internal/sync/users \
  -H "Content-Type: application/json" \
  -H "X-Internal-API-Key: your-api-key" \
  -H "X-Tenant-ID: test-tenant" \
  -d '{
    "operation": "user_sync",
    "tenant": {
      "id": "test-tenant",
      "name": "Test Company"
    },
    "users": [
      {
        "id": "test-user",
        "email": "test@company.com",
        "name": "Test User",
        "isActive": true
      }
    ]
  }'
```

## 📊 **Monitoring & Logging**

### **1. Sync Operation Logging**
```javascript
// Log all sync operations
console.log(`🔄 Sync Request:`, {
  timestamp: new Date().toISOString(),
  tenant: tenant.name,
  userCount: users.length,
  operation: operation,
  source: req.headers['x-sync-source']
});
```

### **2. Error Tracking**
```javascript
// Track sync failures
if (results.some(r => r.status === 'failed')) {
  console.error(`❌ Sync failures detected:`, {
    tenant: tenant.name,
    failedUsers: results.filter(r => r.status === 'failed'),
    timestamp: new Date().toISOString()
  });
}
```

### **3. Performance Metrics**
```javascript
const startTime = Date.now();
// ... sync operations ...
const duration = Date.now() - startTime;

console.log(`⏱️ Sync completed in ${duration}ms for ${users.length} users`);
```

## 🚨 **Error Handling**

### **Common Error Scenarios**
1. **Invalid API Key**: Return 401 Unauthorized
2. **Missing Required Fields**: Return 400 Bad Request
3. **Database Errors**: Return 500 Internal Server Error
4. **User Not Found**: Continue with other users, log error
5. **Validation Failures**: Return 400 with specific error details

### **Error Response Format**
```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2025-08-19T10:00:00.000Z",
  "details": "Additional error information"
}
```

## 🔄 **Sync Workflow**

### **1. User Creation Flow**
```
Wrapper → CRM API → Check if user exists → Create user → Return success
```

### **2. User Update Flow**
```
Wrapper → CRM API → Check if user exists → Update user → Return success
```

### **3. Bulk Sync Flow**
```
Wrapper → CRM API → Process multiple users → Batch operations → Return summary
```

## 📈 **Performance Considerations**

### **1. Batch Processing**
- Process users in batches of 50-100
- Use database transactions for consistency
- Implement retry logic for failed operations

### **2. Caching**
- Cache user lookups by email
- Cache tenant information
- Implement connection pooling

### **3. Async Processing**
- Consider async processing for large syncs
- Implement webhook callbacks for completion
- Use message queues for high-volume scenarios

## 🚀 **Deployment Checklist**

- [ ] Environment variables configured
- [ ] Sync endpoint implemented and tested
- [ ] Database schema updated
- [ ] Security measures implemented
- [ ] Logging and monitoring configured
- [ ] Error handling implemented
- [ ] Performance optimizations applied
- [ ] Production testing completed

## 📞 **Support & Troubleshooting**

### **Common Issues**
1. **API Key Mismatch**: Verify both systems use the same key
2. **CORS Issues**: Ensure proper CORS configuration
3. **Timeout Errors**: Check network connectivity and response times
4. **Database Errors**: Verify database schema and connections

### **Debug Mode**
Enable debug logging in your CRM app:
```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Debug: Full request details:', {
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
}
```

## 📚 **Additional Resources**

- [Wrapper User Sync Documentation](./USER_SYNC_IMPLEMENTATION_SUMMARY.md)
- [API Endpoint Reference](./CRM_API_DOCUMENTATION.md)
- [Security Best Practices](./SECURITY_GUIDELINES.md)

---

**Last Updated**: August 19, 2025  
**Version**: 1.0.0  
**Maintainer**: Development Team
