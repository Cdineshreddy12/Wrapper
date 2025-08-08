# CRM Permission API Documentation

## Overview

This document provides comprehensive API documentation for integrating your CRM application with the centralized permission system. The permission system provides role-based access control, tenant isolation, and subscription-based restrictions.

## Base Configuration

```javascript
const WRAPPER_BASE_URL = 'http://localhost:3000'; // Adjust to your wrapper URL
const APP_CODE = 'crm';
```

## API Endpoints

### 1. User Permissions Endpoint

**Endpoint:** `POST /api/internal/user-permissions`

**Description:** Fetch user permissions and context for CRM application

**Request:**
```javascript
{
  "kinde_user_id": "string",      // Required: Kinde user ID
  "kinde_org_code": "string",     // Required: Kinde organization code
  "requesting_app": "crm",        // Required: Application code
  "force_refresh": false          // Optional: Force cache refresh
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "kinde_user_id": "kinde_user_456"
    },
    "tenant": {
      "id": "tenant_789",
      "name": "Acme Corporation",
      "subdomain": "acme"
    },
    "roles": ["Sales Manager", "CRM User"],
    "permissions": {
      "leads": ["read", "create", "update", "assign"],
      "contacts": ["read", "read_all", "create", "update", "delete"],
      "accounts": ["read", "create", "update", "view_contacts"],
      "opportunities": ["read", "create", "update"],
      "quotations": ["read", "create", "generate_pdf"],
      "dashboard": ["view", "export"],
      "system": ["settings_read", "configurations_read"]
    },
    "restrictions": {
      "crm.max_contacts": 1000,
      "crm.max_leads": 500,
      "crm.max_opportunities": 200,
      "crm.max_quotations": 100
    },
    "context": {
      "requesting_app": "crm",
      "kinde_org_code": "org_123",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
```javascript
// 404 - User not found
{
  "error": "User not found in tenant",
  "kinde_user_id": "user_123",
  "tenant_id": "tenant_789"
}

// 403 - User inactive
{
  "error": "User account is inactive",
  "user_id": "user_123"
}

// 403 - No permissions
{
  "error": "No permissions for requested application",
  "requesting_app": "crm",
  "available_tools": ["hr", "accounting"]
}

// 500 - Server error
{
  "error": "Failed to fetch user permissions",
  "message": "Database connection failed"
}
```

### 2. Token Validation Endpoint

**Endpoint:** `POST /api/enhanced-crm-integration/validate-token`

**Description:** Validate authentication token and get user context

**Request:**
```javascript
{
  "token": "string",              // Required: Authentication token
  "appCode": "crm"               // Required: Application code
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "kindeUserId": "kinde_user_456"
    },
    "organization": {
      "id": "tenant_789",
      "name": "Acme Corporation",
      "subdomain": "acme"
    },
    "permissions": {
      "leads": ["read", "create", "update"],
      "contacts": ["read", "create", "update", "delete"],
      "accounts": ["read", "create", "update"]
    },
    "restrictions": {
      "crm.max_contacts": 1000,
      "crm.max_leads": 500
    },
    "subscription": {
      "plan": "professional",
      "status": "active",
      "features": ["crm", "hr", "affiliate"]
    }
  }
}
```

### 3. Permission Matrix Endpoint

**Endpoint:** `GET /api/permission-matrix/matrix`

**Description:** Get complete permission structure for CRM

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "applications": [
      {
        "appCode": "crm",
        "appName": "Customer Relationship Management",
        "description": "Complete CRM solution for managing customers, deals, and sales pipeline",
        "icon": "💼",
        "baseUrl": "http://localhost:3002",
        "version": "2.0.0",
        "isCore": true,
        "sortOrder": 1
      }
    ],
    "matrix": {
      "crm": {
        "appInfo": { /* app info */ },
        "modules": {
          "leads": {
            "moduleCode": "leads",
            "moduleName": "Lead Management",
            "description": "Manage sales leads and prospects",
            "isCore": true,
            "permissions": [
              { "code": "read", "name": "View Leads", "description": "View and browse lead information" },
              { "code": "create", "name": "Create Leads", "description": "Add new leads to the system" },
              { "code": "update", "name": "Edit Leads", "description": "Modify existing lead information" },
              { "code": "delete", "name": "Delete Leads", "description": "Remove leads from the system" },
              { "code": "export", "name": "Export Leads", "description": "Export lead data to various formats" },
              { "code": "import", "name": "Import Leads", "description": "Import leads from external files" },
              { "code": "assign", "name": "Assign Leads", "description": "Assign leads to other users" }
            ]
          },
          "contacts": { /* similar structure */ },
          "accounts": { /* similar structure */ },
          "opportunities": { /* similar structure */ },
          "quotations": { /* similar structure */ },
          "dashboard": { /* similar structure */ },
          "system": { /* similar structure */ }
        }
      }
    },
    "summary": {
      "totalApplications": 1,
      "totalModules": 7,
      "totalPermissions": 107
    }
  }
}
```

### 4. Permission Check Endpoint

**Endpoint:** `POST /api/permission-matrix/check-permission`

**Description:** Check if user has specific permission

**Request:**
```javascript
{
  "permission": "crm.leads.create",  // Required: Permission to check
  "userId": "user_123"              // Optional: User ID (uses current user if not provided)
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "permission": "crm.leads.create",
    "hasPermission": true,
    "userId": "user_123"
  }
}
```

### 5. Multiple Permissions Check Endpoint

**Endpoint:** `POST /api/permission-matrix/check-permissions`

**Description:** Check multiple permissions at once

**Request:**
```javascript
{
  "permissions": ["crm.leads.create", "crm.contacts.read"],  // Required: Array of permissions
  "userId": "user_123",                                      // Optional: User ID
  "checkType": "any"                                         // Optional: "any" or "all" (default: "any")
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "permissions": ["crm.leads.create", "crm.contacts.read"],
    "checkType": "any",
    "hasPermission": true,
    "userId": "user_123"
  }
}
```

## CRM Permission Structure

### Available Modules and Permissions

```javascript
const CRM_PERMISSIONS = {
  // 📊 LEADS MODULE
  leads: {
    permissions: [
      'read',           // View leads
      'read_all',       // View all leads in organization
      'create',         // Create new leads
      'update',         // Edit lead information
      'delete',         // Delete leads
      'export',         // Export lead data
      'import',         // Import leads from files
      'assign'          // Assign leads to users
    ]
  },

  // 🏢 ACCOUNTS MODULE
  accounts: {
    permissions: [
      'read',           // View accounts
      'read_all',       // View all accounts in organization
      'create',         // Create new accounts
      'update',         // Edit account information
      'delete',         // Delete accounts
      'view_contacts',  // View contacts associated with accounts
      'export',         // Export account data
      'import'          // Import accounts from files
    ]
  },

  // 👥 CONTACTS MODULE
  contacts: {
    permissions: [
      'read',           // View contacts
      'read_all',       // View all contacts in organization
      'create',         // Create new contacts
      'update',         // Edit contact information
      'delete',         // Delete contacts
      'export',         // Export contact data
      'import'          // Import contacts from files
    ]
  },

  // 💰 OPPORTUNITIES MODULE
  opportunities: {
    permissions: [
      'read',           // View opportunities
      'read_all',       // View all opportunities in organization
      'create',         // Create new opportunities
      'update',         // Edit opportunity information
      'delete',         // Delete opportunities
      'export',         // Export opportunity data
      'import',         // Import opportunities from files
      'close'           // Mark opportunities as won/lost
    ]
  },

  // 📄 QUOTATIONS MODULE
  quotations: {
    permissions: [
      'read',           // View quotations
      'read_all',       // View all quotations in organization
      'create',         // Create new quotations
      'update',         // Edit quotation information
      'delete',         // Delete quotations
      'generate_pdf',   // Generate PDF versions of quotations
      'send',           // Send quotations to customers
      'approve'         // Approve quotations for sending
    ]
  },

  // 📊 DASHBOARD MODULE
  dashboard: {
    permissions: [
      'view',           // Access CRM dashboard
      'customize',      // Customize dashboard layout and widgets
      'export'          // Export dashboard reports
    ]
  },

  // ⚙️ SYSTEM MODULE
  system: {
    permissions: [
      // Settings
      'settings_read',      // View system settings
      'settings_update',    // Update system settings
      'settings_manage',    // Full control over system settings
      
      // Configurations
      'configurations_read',    // View system configurations
      'configurations_create',  // Create new configurations
      'configurations_update',  // Update configurations
      'configurations_delete',  // Delete configurations
      'configurations_manage',  // Full control over configurations
      
      // Tenant Configuration
      'tenant_config_read',     // View tenant configurations
      'tenant_config_update',   // Update tenant configurations
      'tenant_config_manage',   // Full control over tenant configurations
      
      // System Configuration
      'system_config_read',     // View system-level configurations
      'system_config_update',   // Update system-level configurations
      'system_config_manage',   // Full control over system-level configurations
      
      // Dropdowns
      'dropdowns_read',         // View dropdown values
      'dropdowns_create',       // Create dropdown values
      'dropdowns_update',       // Update dropdown values
      'dropdowns_delete',       // Delete dropdown values
      'dropdowns_manage',       // Full control over dropdowns
      
      // Integrations
      'integrations_read',      // View integrations
      'integrations_create',    // Create integrations
      'integrations_update',    // Update integrations
      'integrations_delete',    // Delete integrations
      'integrations_manage',    // Full control over integrations
      
      // Backup
      'backup_read',            // View backup information
      'backup_create',          // Create backups
      'backup_restore',         // Restore from backups
      'backup_manage',          // Full control over backups
      
      // Maintenance
      'maintenance_read',       // View maintenance schedules
      'maintenance_perform',    // Perform maintenance
      'maintenance_schedule'    // Schedule maintenance
    ]
  }
};
```

### Common Restrictions

```javascript
const CRM_RESTRICTIONS = {
  'crm.max_contacts': 1000,        // Maximum contacts per tenant
  'crm.max_leads': 500,            // Maximum leads per tenant
  'crm.max_opportunities': 200,    // Maximum opportunities per tenant
  'crm.max_quotations': 100,       // Maximum quotations per tenant
  'crm.max_accounts': 300,         // Maximum accounts per tenant
  'crm.max_users': 50,             // Maximum users per tenant
  'crm.storage_limit': '10GB',     // Storage limit
  'crm.api_calls_per_day': 10000   // API calls per day
};
```

## Implementation Examples

### 1. Permission Service Class

```javascript
// services/permissionService.js
import axios from 'axios';

class CRMPermissionService {
  constructor() {
    this.wrapperUrl = process.env.WRAPPER_URL || 'http://localhost:3000';
    this.appCode = 'crm';
  }

  // Fetch user permissions
  async fetchUserPermissions(kindeUserId, kindeOrgCode, forceRefresh = false) {
    try {
      const response = await axios.post(`${this.wrapperUrl}/api/internal/user-permissions`, {
        kinde_user_id: kindeUserId,
        kinde_org_code: kindeOrgCode,
        requesting_app: this.appCode,
        force_refresh: forceRefresh
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch permissions');
      }
    } catch (error) {
      console.error('❌ Permission fetch failed:', error.message);
      throw error;
    }
  }

  // Validate token
  async validateToken(token) {
    try {
      const response = await axios.post(`${this.wrapperUrl}/api/enhanced-crm-integration/validate-token`, {
        token,
        appCode: this.appCode
      });

      return response.data;
    } catch (error) {
      console.error('❌ Token validation failed:', error.message);
      throw error;
    }
  }

  // Check specific permission
  hasPermission(userContext, module, action) {
    const modulePermissions = userContext.permissions[module];
    return modulePermissions?.includes(action) || modulePermissions?.includes('*');
  }

  // Check multiple permissions (any)
  hasAnyPermission(userContext, module, actions) {
    const modulePermissions = userContext.permissions[module];
    return actions.some(action => 
      modulePermissions?.includes(action) || modulePermissions?.includes('*')
    );
  }

  // Check multiple permissions (all)
  hasAllPermissions(userContext, module, actions) {
    const modulePermissions = userContext.permissions[module];
    return actions.every(action => 
      modulePermissions?.includes(action) || modulePermissions?.includes('*')
    );
  }

  // Check restriction
  checkRestriction(userContext, restrictionKey, currentValue) {
    const limit = userContext.restrictions[restrictionKey];
    return limit === undefined || currentValue < limit;
  }

  // Get restriction value
  getRestriction(userContext, restrictionKey) {
    return userContext.restrictions[restrictionKey];
  }

  // Check if user can view all records
  canViewAll(userContext, module) {
    return this.hasPermission(userContext, module, 'read_all');
  }

  // Get user's accessible modules
  getAccessibleModules(userContext) {
    return Object.keys(userContext.permissions).filter(module => 
      userContext.permissions[module] && userContext.permissions[module].length > 0
    );
  }
}

export default new CRMPermissionService();
```

### 2. Authentication Middleware

```javascript
// middleware/auth.js
import permissionService from '../services/permissionService.js';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.query.token || 
                req.session?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  permissionService.validateToken(token)
    .then(response => {
      if (response.success) {
        req.userContext = response.data;
        next();
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    })
    .catch(error => {
      res.status(401).json({ error: 'Authentication failed' });
    });
}

export function requirePermission(module, action) {
  return (req, res, next) => {
    const { userContext } = req;
    
    if (!userContext) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!permissionService.hasPermission(userContext, module, action)) {
      return res.status(403).json({ 
        error: `Permission denied: ${module}.${action}`,
        required: `${module}.${action}`,
        available: userContext.permissions[module] || []
      });
    }

    next();
  };
}

export function requireAnyPermission(module, actions) {
  return (req, res, next) => {
    const { userContext } = req;
    
    if (!userContext) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!permissionService.hasAnyPermission(userContext, module, actions)) {
      return res.status(403).json({ 
        error: `Permission denied: ${module}.${actions.join(' OR ')}`,
        required: actions,
        available: userContext.permissions[module] || []
      });
    }

    next();
  };
}
```

### 3. Route Implementation Example

```javascript
// routes/contacts.js
import express from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import permissionService from '../services/permissionService.js';

const router = express.Router();

// Get contacts with permission check
router.get('/', requireAuth, requirePermission('contacts', 'read'), async (req, res) => {
  try {
    const { userContext } = req;
    const { tenant } = userContext;

    // Check if user can view all contacts or just their own
    const canViewAll = permissionService.canViewAll(userContext, 'contacts');
    
    // Get contacts based on permissions
    const contacts = canViewAll 
      ? await getContactsByTenant(tenant.id)
      : await getContactsByUser(tenant.id, userContext.user.id);

    res.json({
      success: true,
      contacts,
      total: contacts.length,
      permissions: userContext.permissions.contacts,
      canViewAll
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Create contact with restriction check
router.post('/', requireAuth, requirePermission('contacts', 'create'), async (req, res) => {
  try {
    const { userContext } = req;
    const { tenant } = userContext;

    // Check contact limit restriction
    const currentCount = await getContactCount(tenant.id);
    const maxContacts = permissionService.getRestriction(userContext, 'crm.max_contacts') || 1000;
    
    if (!permissionService.checkRestriction(userContext, 'crm.max_contacts', currentCount)) {
      return res.status(403).json({
        error: 'Contact limit reached',
        current: currentCount,
        limit: maxContacts,
        restriction: 'crm.max_contacts'
      });
    }

    const contactData = {
      ...req.body,
      tenantId: tenant.id,
      createdBy: userContext.user.id,
      createdAt: new Date()
    };

    const newContact = await createContact(contactData);
    
    res.status(201).json({
      success: true,
      contact: newContact
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

export default router;
```

### 4. Error Handling

```javascript
// middleware/errorHandler.js
export function permissionErrorHandler(error, req, res, next) {
  if (error.response?.status === 403) {
    return res.status(403).json({
      error: 'Permission denied',
      message: error.response.data.error,
      required: error.response.data.required,
      available: error.response.data.available
    });
  }

  if (error.response?.status === 401) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
  }

  next(error);
}
```

## Environment Variables

```bash
# .env
WRAPPER_URL=http://localhost:3000
SESSION_SECRET=your-secret-key
NODE_ENV=development
CRM_APP_URL=http://localhost:3002
```

## Testing the Integration

### 1. Test Permission Fetching

```javascript
// test-permissions.js
import permissionService from './services/permissionService.js';

async function testPermissions() {
  try {
    const userContext = await permissionService.fetchUserPermissions(
      'kinde_user_123',
      'kinde_org_456'
    );

    console.log('✅ User Context:', {
      user: userContext.user.name,
      tenant: userContext.tenant.name,
      roles: userContext.roles,
      permissions: userContext.permissions,
      restrictions: userContext.restrictions
    });

    // Test permission checks
    console.log('🔍 Permission Tests:');
    console.log('Can create leads:', permissionService.hasPermission(userContext, 'leads', 'create'));
    console.log('Can view all contacts:', permissionService.canViewAll(userContext, 'contacts'));
    console.log('Can manage system:', permissionService.hasPermission(userContext, 'system', 'settings_manage'));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPermissions();
```

### 2. Test API Endpoints

```bash
# Test user permissions endpoint
curl -X POST http://localhost:3000/api/internal/user-permissions \
  -H "Content-Type: application/json" \
  -d '{
    "kinde_user_id": "user_123",
    "kinde_org_code": "org_456",
    "requesting_app": "crm"
  }'

# Test token validation
curl -X POST http://localhost:3000/api/enhanced-crm-integration/validate-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-token-here",
    "appCode": "crm"
  }'
```

## Best Practices

1. **Always check permissions** before performing any operation
2. **Use tenant isolation** - always filter data by tenant ID
3. **Cache user context** in session to avoid repeated API calls
4. **Handle permission errors** gracefully with proper error messages
5. **Log permission checks** for audit purposes
6. **Use restriction checks** before creating new records
7. **Implement proper error handling** for network failures

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check if token is valid and not expired
2. **403 Forbidden**: User doesn't have required permissions
3. **404 Not Found**: User or tenant not found in system
4. **500 Server Error**: Check wrapper service logs

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=permissions:*
```

This will provide detailed logs of permission checks and API calls. 