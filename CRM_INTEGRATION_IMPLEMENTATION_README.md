# 🔄 CRM User Sync Integration Implementation Guide

## 🚨 **URGENT: Missing Endpoint Implementation**

Your CRM application at `https://crm.zopkit.com` is **missing the required sync endpoint** that our Wrapper system needs to sync users. This is causing all user sync operations to fail with a **404 error**.

## 📋 **Current Status**

- ✅ **CRM Server**: Running and accessible at `https://crm.zopkit.com`
- ✅ **Network**: HTTPS connection working properly
- ✅ **Authentication**: JWT token format accepted
- ❌ **CRITICAL ISSUE**: `/api/admin/users/sync` endpoint does not exist
- ❌ **Result**: All user sync operations fail with 404 "Cannot POST /api/admin/users/sync"

## 🎯 **Required Implementation**

### **1. Create the Sync Endpoint**

Add this endpoint to your CRM Express application:

```javascript
// File: routes/admin.js or app.js
app.post('/api/admin/users/sync', async (req, res) => {
  try {
    // 1. Verify JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authorization token provided' 
      });
    }

    // 2. Verify the wrapper token (implement this)
    // const decoded = jwt.verify(token, process.env.WRAPPER_SECRET_KEY);
    // if (!decoded || decoded.orgCode !== req.body.users[0]?.orgCode) {
    //   return res.status(403).json({ 
    //     success: false, 
    //     error: 'Invalid or expired token' 
    //   });
    // }

    // 3. Extract sync parameters
    const { mode, users } = req.body;
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid users array provided' 
      });
    }

    console.log(`🔄 Processing ${mode} sync for ${users.length} users`);

    // 4. Process each user
    const results = [];
    const summary = {
      total: users.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (const user of users) {
      try {
        // Validate required fields
        if (!user.email || !user.externalId) {
          throw new Error('Missing required fields: email or externalId');
        }

        // Check if user exists in CRM
        let crmUser = await findUserByEmail(user.email); // Implement this function
        
        if (!crmUser) {
          // Create new user
          crmUser = await createUser({
            externalId: user.externalId,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: user.role || 'user',
            isActive: user.isActive !== false,
            orgCode: user.orgCode,
            metadata: user.metadata || {}
          });
          
          results.push({ 
            userId: user.externalId, 
            email: user.email,
            status: 'created',
            crmUserId: crmUser.id 
          });
          summary.created++;
          
        } else {
          // Update existing user
          await updateUser(crmUser.id, {
            firstName: user.firstName || crmUser.firstName,
            lastName: user.lastName || crmUser.lastName,
            role: user.role || crmUser.role,
            isActive: user.isActive !== undefined ? user.isActive : crmUser.isActive,
            metadata: { ...crmUser.metadata, ...user.metadata }
          });
          
          results.push({ 
            userId: user.externalId, 
            email: user.email,
            status: 'updated',
            crmUserId: crmUser.id 
          });
          summary.updated++;
        }
        
      } catch (error) {
        console.error(`❌ Failed to process user ${user.email}:`, error);
        results.push({ 
          userId: user.externalId, 
          email: user.email,
          status: 'failed', 
          error: error.message 
        });
        summary.failed++;
        summary.errors.push(`${user.email}: ${error.message}`);
      }
    }

    // 5. Handle full-reconcile mode (deactivate users not in sync)
    if (mode === 'full-reconcile') {
      const syncedEmails = users.map(u => u.email);
      const allCrmUsers = await getAllUsers(); // Implement this function
      
      for (const crmUser of allCrmUsers) {
        if (!syncedEmails.includes(crmUser.email)) {
          await updateUser(crmUser.id, { isActive: false });
          console.log(`🔒 Deactivated user: ${crmUser.email}`);
        }
      }
    }

    // 6. Return success response
    res.json({
      success: true,
      message: `Sync completed successfully`,
      data: {
        mode,
        summary,
        results,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🚨 Sync endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during sync',
      details: error.message 
    });
  }
});
```

### **2. Required Helper Functions**

Implement these functions in your CRM application:

```javascript
// User management functions
async function findUserByEmail(email) {
  // Find user by email in your CRM database
  // Return user object or null if not found
}

async function createUser(userData) {
  // Create new user in your CRM database
  // Return the created user object
}

async function updateUser(userId, updateData) {
  // Update existing user in your CRM database
  // Return success status
}

async function getAllUsers() {
  // Get all users from your CRM database
  // Return array of user objects
}
```

### **3. Environment Variables**

Add these to your CRM application's `.env` file:

```bash
# Wrapper Integration
WRAPPER_SECRET_KEY=your-secret-key-here
WRAPPER_ORG_CODE=your-org-code-here

# JWT Configuration (if using jsonwebtoken)
JWT_SECRET=your-jwt-secret
```

## 🔐 **Security Implementation**

### **JWT Token Verification**

```javascript
const jwt = require('jsonwebtoken');

function verifyWrapperToken(token, orgCode) {
  try {
    const decoded = jwt.verify(token, process.env.WRAPPER_SECRET_KEY);
    
    // Verify token hasn't expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      throw new Error('Token expired');
    }
    
    // Verify organization code if provided
    if (orgCode && decoded.orgCode !== orgCode) {
      throw new Error('Organization code mismatch');
    }
    
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}
```

## 📊 **Expected Request Format**

The Wrapper system will send requests in this format:

```json
{
  "mode": "upsert" | "full-reconcile",
  "users": [
    {
      "externalId": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "isActive": true,
      "orgCode": "acme",
      "metadata": {
        "department": "Engineering",
        "permissions": ["read", "write"]
      }
    }
  ]
}
```

## 📤 **Expected Response Format**

Your endpoint should return:

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "data": {
    "mode": "upsert",
    "summary": {
      "total": 1,
      "created": 1,
      "updated": 0,
      "failed": 0,
      "errors": []
    },
    "results": [
      {
        "userId": "user-123",
        "email": "user@example.com",
        "status": "created",
        "crmUserId": "crm-user-456"
      }
    ],
    "timestamp": "2025-08-19T14:08:30.000Z"
  }
}
```

## 🧪 **Testing the Endpoint**

### **1. Test with curl**

```bash
curl -X POST 'https://crm.zopkit.com/api/admin/users/sync' \
  -H 'Authorization: Bearer YOUR_TEST_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "mode": "upsert",
    "users": [
      {
        "externalId": "test-123",
        "email": "test@example.com",
        "firstName": "Test",
        "lastName": "User",
        "role": "user",
        "isActive": true,
        "orgCode": "test-org"
      }
    ]
  }'
```

### **2. Expected Response**

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "data": {
    "mode": "upsert",
    "summary": {
      "total": 1,
      "created": 1,
      "updated": 0,
      "failed": 0,
      "errors": []
    },
    "results": [
      {
        "userId": "test-123",
        "email": "test@example.com",
        "status": "created",
        "crmUserId": "crm-test-456"
      }
    ],
    "timestamp": "2025-08-19T14:08:30.000Z"
  }
}
```

## 🚀 **Implementation Checklist**

- [ ] Create `/api/admin/users/sync` endpoint
- [ ] Implement JWT token verification
- [ ] Add user creation logic
- [ ] Add user update logic
- [ ] Handle `full-reconcile` mode
- [ ] Add proper error handling
- [ ] Add logging for debugging
- [ ] Test with sample data
- [ ] Deploy to production
- [ ] Test with Wrapper system

## 📞 **Support & Questions**

If you need help implementing this endpoint:

1. **Check the error logs** in your CRM application
2. **Verify the endpoint URL** is exactly `/api/admin/users/sync`
3. **Test with Postman** or curl before testing with Wrapper
4. **Check CORS settings** if you get cross-origin errors

## ⚡ **Quick Fix**

The fastest way to get this working:

1. Copy the endpoint code above
2. Add it to your CRM app
3. Deploy immediately
4. Test with the curl command above
5. The Wrapper sync will start working automatically

---

**⚠️ IMPORTANT**: This endpoint is **critical** for the user sync functionality. Without it, users cannot be synchronized between the Wrapper system and your CRM application.
