# 🔄 **Updated CRM Sync Implementation**

## 📋 **Overview**

The existing user sync system has been updated to work with your CRM's specific API requirements. The system now supports JWT authentication and the CRM's expected payload format while maintaining compatibility with other applications.

## 🔧 **What Was Changed**

### **1. JWT Authentication Support**
- Added JWT token generation for wrapper authentication
- Implemented the exact JWT structure required by your CRM
- Maintained backward compatibility with API key authentication for other apps

### **2. CRM-Specific Payload Format**
- Updated user data transformation to match CRM's expected format
- Added support for `externalId`, `firstName`, `lastName` fields
- Implemented `mode` parameter for sync types (`upsert` vs `full-reconcile`)

### **3. Dynamic Endpoint Selection**
- CRM uses `/api/admin/users/sync` with JWT authentication
- Other applications still use `/api/internal/sync/users` with API key authentication

### **4. Enhanced User Data Transformation**
- Splits full names into `firstName` and `lastName`
- Maps wrapper roles to CRM roles (`isTenantAdmin` → `admin` or `user`)
- Includes all required CRM fields with proper defaults

## 🚀 **Updated Architecture**

```
┌─────────────────┐    JWT Auth     ┌─────────────────┐
│   Wrapper       │ ──────────────► │   CRM App       │
│   User Sync     │                 │   /api/admin/   │
│   Service       │                 │   users/sync    │
└─────────────────┘                 └─────────────────┘
        │
        │ API Key Auth
        ▼
┌─────────────────┐
│   Other Apps    │
│   /api/internal/│
│   sync/users    │
└─────────────────┘
```

## 📡 **Updated Payload Structure**

### **For CRM (https://crm.zopkit.com)**
```json
{
  "mode": "upsert",
  "users": [
    {
      "externalId": "kinde|abc123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "contactMobile": "9999999999",
      "countryCode": "91",
      "role": "admin",
      "roles": ["admin", "manager"],
      "zone": ["north", "south"],
      "designation": "zonal_head",
      "isActive": true,
      "orgCode": "your-org-code"
    }
  ]
}
```

### **For Other Applications (Legacy Format)**
```json
{
  "operation": "user_sync",
  "tenant": {
    "id": "tenant-id",
    "name": "Company Name"
  },
  "users": [...],
  "metadata": {...}
}
```

## 🔐 **Authentication Methods**

### **CRM Authentication (JWT)**
```javascript
// Headers for CRM
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <jwt-token>"
}

// JWT Payload
{
  "sub": "wrapper-service",
  "iss": "wrapper.zopkit.com",
  "role": "admin",
  "org_code": "your-org-code",
  "iat": 1703000000,
  "exp": 1703003600
}
```

### **Other Apps Authentication (API Key)**
```javascript
// Headers for other applications
{
  "Content-Type": "application/json",
  "X-Internal-API-Key": "your-api-key",
  "X-Tenant-ID": "tenant-id",
  "X-Sync-Source": "wrapper-user-sync-service"
}
```

## ⚙️ **Environment Configuration**

### **Required Environment Variables**
```bash
# CRM Configuration
CRM_APP_URL=https://crm.zopkit.com
WRAPPER_SECRET_KEY=your-super-secure-wrapper-secret-key-2024
WRAPPER_ORG_CODE=your-organization-code

# Other Applications
HR_APP_URL=http://localhost:3003
AFFILIATE_APP_URL=http://localhost:3004
SYSTEM_APP_URL=http://localhost:3007
INTERNAL_API_KEY=your-internal-api-key-for-other-apps
```

## 🔄 **Sync Modes**

### **1. Upsert Mode (Default)**
- **Trigger**: Single user sync, incremental updates
- **Behavior**: Creates new users or updates existing ones
- **CRM Mode**: `"upsert"`
- **Use Case**: Real-time user updates

### **2. Full Reconciliation Mode**
- **Trigger**: Full tenant sync
- **Behavior**: Creates/updates users + deactivates missing users
- **CRM Mode**: `"full-reconcile"`
- **Use Case**: Complete synchronization

## 🧪 **Testing the Implementation**

### **1. Run the Test Script**
```bash
cd backend
node test-crm-sync.js
```

### **2. Test Sync via API**
```bash
# Test single user sync
curl -X POST http://localhost:3001/api/user-sync/sync/user/USER_ID \
  -H "Content-Type: application/json"

# Test full sync
curl -X POST http://localhost:3001/api/user-sync/sync/full \
  -H "Content-Type: application/json"
```

### **3. Check Frontend**
Navigate to `/dashboard/user-application-management` and test sync operations.

## 📊 **Expected Results**

### **Successful CRM Sync Response**
```json
{
  "success": true,
  "userCount": 1,
  "response": {
    "message": "Sync completed",
    "results": {
      "upserted": 1,
      "updated": 0,
      "created": 1,
      "deactivated": 0,
      "failed": []
    }
  },
  "statusCode": 200,
  "syncedAt": "2025-08-19T10:00:00.000Z",
  "applicationUrl": "https://crm.zopkit.com",
  "endpoint": "https://crm.zopkit.com/api/admin/users/sync",
  "syncMode": "upsert"
}
```

### **Error Response with Warning**
```json
{
  "success": false,
  "userCount": 1,
  "error": "Request failed with status code 401",
  "statusCode": 401,
  "syncedAt": "2025-08-19T10:00:00.000Z",
  "applicationUrl": "https://crm.zopkit.com"
}
```

## 🚀 **Next Steps**

### **1. Environment Setup**
1. Set `WRAPPER_SECRET_KEY` in your `.env` file
2. Set `WRAPPER_ORG_CODE` to match your organization
3. Ensure `CRM_APP_URL` points to `https://crm.zopkit.com`

### **2. Test with Real CRM**
1. Restart your wrapper backend to pick up new environment variables
2. Test sync operations from the frontend
3. Monitor sync results and CRM logs

### **3. Production Deployment**
1. Configure production environment variables
2. Deploy the updated wrapper backend
3. Verify sync operations in production

## 🔍 **Debugging**

### **Common Issues**
1. **JWT Token Issues**: Check `WRAPPER_SECRET_KEY` matches CRM expectations
2. **Payload Format**: Ensure user data includes required fields
3. **Endpoint Access**: Verify CRM endpoint is accessible and authentication works

### **Debug Logging**
The sync service includes comprehensive logging:
- JWT token generation
- User data transformation
- Sync requests and responses
- Error details with status codes

### **Test Individual Components**
```javascript
// Test JWT generation
const token = UserSyncService.generateWrapperToken('test-org');
console.log('Generated token:', token);

// Test user transformation
const transformed = UserSyncService.transformUserToCRMFormat(user, 'org-code');
console.log('Transformed user:', transformed);
```

## ✅ **Implementation Status**

- ✅ JWT authentication implemented
- ✅ CRM payload format updated
- ✅ Dynamic endpoint selection
- ✅ User data transformation
- ✅ Environment configuration
- ✅ Test script created
- ✅ Backward compatibility maintained
- ✅ Error handling enhanced

## 📞 **Support**

The updated sync system is ready for testing with your CRM. If you encounter any issues:

1. Check environment variables are set correctly
2. Verify the JWT secret key matches CRM expectations
3. Review sync logs for detailed error information
4. Test with the provided test script first

---

**Last Updated**: August 19, 2025
**Version**: 2.0.0
**Status**: Ready for Testing
