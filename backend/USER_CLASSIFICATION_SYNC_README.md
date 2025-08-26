# 🎯 User Classification & Sync System

This system automatically classifies users based on their application access and provides APIs to synchronize users to their respective applications (CRM, HR, Affiliate, etc.).

## 📋 Overview

Users are classified based on:
- **Subscription Tier**: free, starter, professional, enterprise
- **Role Permissions**: Custom roles with specific module permissions
- **Application Access**: Determined by subscription and permissions

## 🏗️ Architecture

### Core Components

1. **UserClassificationService** - Classifies users by application access
2. **UserSyncService** - Synchronizes users to external applications
3. **User Sync API Routes** - REST endpoints for classification and sync operations

### Application Matrix

| Tier | CRM | HR | Affiliate | Accounting | Inventory |
|------|-----|----|-----------|-----------|-----------| 
| Free | ✅ | ❌ | ❌ | ❌ | ❌ |
| Starter | ✅ | ✅ | ❌ | ❌ | ❌ |
| Professional | ✅ | ✅ | ✅ | ✅ | ❌ |
| Enterprise | ✅ | ✅ | ✅ | ✅ | ✅ |

## 🔧 Configuration

### Environment Variables

```bash
# Application URLs for sync operations
CRM_APP_URL=http://localhost:3002
HR_APP_URL=http://localhost:3003
AFFILIATE_APP_URL=http://localhost:3004
ACCOUNTING_APP_URL=http://localhost:3005
INVENTORY_APP_URL=http://localhost:3006

# Internal API key for secure sync operations
INTERNAL_API_KEY=your-secure-internal-api-key
```

### Required Application Endpoints

Each external application must implement these sync endpoints:

```bash
# User sync endpoint
POST /api/internal/sync/users
Headers: X-Internal-API-Key, X-Tenant-ID

# User removal endpoint  
POST /api/internal/sync/remove-user
Headers: X-Internal-API-Key, X-Tenant-ID

# Health check endpoint
GET /api/internal/health
Headers: X-Internal-API-Key
```

## 🚀 API Endpoints

### User Classification

#### Get User Classification
```bash
GET /api/user-sync/classification
```
Returns all users classified by application access.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalUsers": 25,
      "applicationBreakdown": {
        "crm": 25,
        "hr": 15,
        "affiliate": 5
      },
      "subscriptionBreakdown": {
        "free": 5,
        "starter": 10,
        "professional": 8,
        "enterprise": 2
      }
    },
    "byApplication": {
      "crm": {
        "appInfo": { "appName": "Customer Relationship Management", ... },
        "users": [...],
        "totalUsers": 25
      }
    },
    "byUser": { ... }
  }
}
```

#### Get Users for Specific Application
```bash
GET /api/user-sync/classification/:appCode
```
Returns users who have access to the specified application.

#### Get User Application Access
```bash
GET /api/user-sync/user/:userId/access
```
Returns applications a specific user has access to.

### User Synchronization

#### Sync All Users
```bash
POST /api/user-sync/sync/all
Content-Type: application/json

{
  "syncType": "full",
  "dryRun": false
}
```
Synchronizes all users to their respective applications.

#### Sync Users for Specific Application
```bash
POST /api/user-sync/sync/application/:appCode
Content-Type: application/json

{
  "syncType": "full"
}
```
Synchronizes users who have access to the specified application.

#### Sync Specific User
```bash
POST /api/user-sync/sync/user/:userId
Content-Type: application/json

{
  "syncType": "update"
}
```
Synchronizes a specific user to all their allowed applications.

#### Refresh User Classification
```bash
POST /api/user-sync/refresh/:userId
Content-Type: application/json

{
  "autoSync": true,
  "previousApps": ["crm", "hr"]
}
```
Refreshes user classification after role changes and optionally syncs.

### System Status

#### Get Sync Status
```bash
GET /api/user-sync/status
```
Returns current sync status and configuration.

#### Test Application Connectivity
```bash
POST /api/user-sync/test-connectivity
Content-Type: application/json

{
  "applications": ["crm", "hr"]
}
```
Tests connectivity to external applications.

## 📊 User Classification Logic

### Classification Process

1. **Subscription Check**: Determine applications available based on subscription tier
2. **Permission Check**: Verify user has specific permissions for each application
3. **Admin Override**: Tenant admins get access to all subscription-tier applications
4. **Role Aggregation**: Combine permissions from all assigned roles

### Classification Reasons

Users are classified with detailed reasons:
- `"Tenant Administrator - Full access based on subscription"`
- `"Super Administrator - Full system access"`
- `"Subscription: professional tier"`
- `"Roles: Sales Manager, CRM User"`

## 🔄 Sync Operations

### Sync Payload Structure

When syncing users to applications, the following data is sent:

```json
{
  "operation": "user_sync",
  "tenant": {
    "id": "tenant-uuid",
    "name": "Company Name",
    "subdomain": "company",
    "kindeOrgId": "org_123"
  },
  "users": [
    {
      "id": "user-uuid",
      "kindeUserId": "kinde_user_123",
      "email": "user@company.com",
      "name": "John Doe",
      "avatar": "https://...",
      "isActive": true,
      "isAdmin": false,
      "department": "Sales",
      "title": "Sales Manager",
      "roles": [...],
      "permissions": {...},
      "allowedApplications": ["crm", "hr"],
      "subscriptionTier": "professional"
    }
  ],
  "metadata": {
    "syncTime": "2024-01-01T12:00:00Z",
    "syncedBy": "user-sync-service",
    "syncType": "full",
    "applicationCode": "crm"
  }
}
```

### Error Handling

- **Application Unavailable**: Marked as warning, not error
- **Invalid Configuration**: Returns configuration error
- **Partial Sync Failures**: Individual application failures don't stop other syncs
- **Retry Logic**: Applications can implement retry mechanisms

## 🧪 Testing

### Running Tests

```bash
# Test user classification and sync functionality
node test-user-classification-sync.js [tenantId]

# Example output
🎯 USER CLASSIFICATION TEST
📊 Classification Summary
Total Users: 25
📱 CRM: 25 users
📱 HR: 15 users
📱 AFFILIATE: 5 users
```

### Manual Testing with curl

```bash
# Get user classification
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/user-sync/classification

# Perform dry run sync
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  http://localhost:3001/api/user-sync/sync/all

# Test connectivity
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"applications": ["crm", "hr"]}' \
  http://localhost:3001/api/user-sync/test-connectivity
```

## 🔐 Security

### Authentication Requirements

- All endpoints require valid JWT authentication
- Specific permission requirements:
  - `crm.system.users_read` - For viewing user classification
  - `crm.system.users_update` - For sync operations
  - `crm.system.settings_read` - For connectivity testing

### Internal API Security

- Sync operations use `X-Internal-API-Key` header
- Tenant isolation through `X-Tenant-ID` header
- Secure token generation for external applications

## 🚀 Usage Examples

### Complete User Onboarding Flow

```javascript
// 1. User gets new role assignment
await assignRoleToUser(userId, newRoleId);

// 2. Refresh user classification
const refreshResult = await fetch('/api/user-sync/refresh/' + userId, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({ autoSync: true })
});

// 3. User automatically synced to new applications
console.log('User synced to applications:', refreshResult.data.userClassification.allowedApplications);
```

### Bulk Tenant Sync

```javascript
// Sync all users in organization to their applications
const syncResult = await fetch('/api/user-sync/sync/all', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({ syncType: 'full' })
});

console.log('Sync completed:', syncResult.data.summary);
```

### Application-Specific Operations

```javascript
// Get all CRM users for reporting
const crmUsers = await fetch('/api/user-sync/classification/crm', {
  headers: { 'Authorization': 'Bearer ' + token }
});

// Sync only HR users after HR system maintenance
const hrSync = await fetch('/api/user-sync/sync/application/hr', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
});
```

## 🔧 Troubleshooting

### Common Issues

1. **"Application URL not configured"**
   - Set environment variable for the application
   - Ensure URL is accessible from the wrapper service

2. **"User not found or has no application access"**
   - Check user's subscription tier
   - Verify user has roles with appropriate permissions
   - Ensure user is active in the system

3. **"Permission check failed"**
   - Verify user has required permissions for the operation
   - Check if user is tenant admin or super admin

4. **"Failed to sync users"**
   - Check application availability
   - Verify INTERNAL_API_KEY configuration
   - Review application logs for sync endpoint errors

### Debug Mode

Set environment variable for detailed logging:
```bash
DEBUG=user-sync,user-classification
```

## 📈 Performance Considerations

- User classification is cached per request
- Bulk operations are optimized for large user sets
- Sync operations include timeout configurations
- Failed syncs don't block other applications

## 🔮 Future Enhancements

- **Real-time Sync**: WebSocket-based real-time user updates
- **Sync History**: Database tracking of sync operations
- **Sync Scheduling**: Automated periodic sync operations
- **Advanced Filtering**: Sync only users with specific criteria
- **Metrics Dashboard**: UI for monitoring sync operations
- **Multi-tenant Sync**: Cross-tenant user synchronization
