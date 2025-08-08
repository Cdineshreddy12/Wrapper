# CRM Permission API Documentation

## Quick Start

```javascript
// IMPORTANT: Use the BACKEND URL (port 3000), NOT the frontend URL (port 3001)
const WRAPPER_URL = 'http://localhost:3000';  // Backend API server
const APP_CODE = 'crm';

// ❌ WRONG: http://localhost:3001/auth (this goes to React frontend)
// ✅ CORRECT: http://localhost:3000/auth (this goes to backend API)
```

## Core API Endpoints

### 1. Authentication Flow (Wrapper Endpoints)

#### **GET /api/auth/auth** (or **GET /auth** for compatibility)
**Description:** Main authentication endpoint for CRM application

**Parameters:**
```javascript
?app_code=crm&redirect_url=http://localhost:3002/auth
```

**Note:** Both `/api/auth/auth` and `/auth` work - the root `/auth` automatically redirects to `/api/auth/auth`

**Flow:**
1. If user not authenticated → Redirects to Kinde OAuth
2. If user already authenticated → Generates token and redirects to CRM
3. After OAuth → Redirects back to CRM with token

**Example:**
```javascript
// CRM redirects unauthenticated users to:
const authUrl = `${WRAPPER_URL}/auth?app_code=crm&redirect_url=${encodeURIComponent('http://localhost:3002/auth')}`;
window.location.href = authUrl;

// Full URL will be: http://localhost:3000/auth?app_code=crm&redirect_url=http://localhost:3002/auth

// Wrapper will redirect back to CRM with:
// http://localhost:3002/auth?token=xxx&expires_at=xxx&app_code=crm
```

#### **POST /api/auth/validate**
**Description:** Validate authentication token and get user context

**Request:**
```javascript
{
  "token": "your-auth-token",
  "app_code": "crm"
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
      "name": "Acme Corp",
      "subdomain": "acme",
      "kindeOrgId": "kinde_org_123"
    },
    "permissions": {
      "leads": ["read", "create", "update", "assign"],
      "contacts": ["read", "read_all", "create", "update", "delete"],
      "accounts": ["read", "create", "update", "view_contacts"]
    },
    "restrictions": {
      "crm.max_contacts": 1000,
      "crm.max_leads": 500
    },
    "roles": ["Sales Manager", "CRM User"],
    "subscription": {
      "plan": "professional",
      "status": "active"
    },
    "tokenInfo": {
      "issuedAt": "2024-01-15T10:30:00.000Z",
      "expiresAt": "2024-01-15T18:30:00.000Z",
      "app_code": "crm"
    }
  }
}
```

#### **GET /api/auth/logout** (or **GET /logout** for compatibility)
**Description:** Logout user and redirect

**Parameters:**
```javascript
?app_code=crm&redirect_url=http://localhost:3002/login
```

**Note:** Both `/api/auth/logout` and `/logout` work - the root `/logout` automatically redirects to `/api/auth/logout`

**Flow:**
1. Clears authentication cookies
2. Redirects to Kinde logout
3. Eventually redirects back to specified URL

### 2. Internal API (for advanced usage)

#### **POST /api/internal/user-permissions**

```javascript
// Request
{
  "kinde_user_id": "user_123",
  "kinde_org_code": "org_456", 
  "requesting_app": "crm",
  "force_refresh": false
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "tenant": {
      "id": "tenant_789",
      "name": "Acme Corp",
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
      "crm.max_opportunities": 200
    }
  }
}
```

### 2. Validate Token
**POST** `/api/enhanced-crm-integration/validate-token`

```javascript
// Request
{
  "token": "your-auth-token",
  "appCode": "crm"
}

// Response
{
  "success": true,
  "data": {
    "user": { "id": "user_123", "email": "user@example.com" },
    "organization": { "id": "tenant_789", "name": "Acme Corp" },
    "permissions": { "leads": ["read", "create"], "contacts": ["read"] },
    "restrictions": { "crm.max_contacts": 1000 },
    "subscription": { "plan": "professional", "status": "active" }
  }
}
```

### 3. Check Specific Permission
**POST** `/api/permission-matrix/check-permission`

```javascript
// Request
{
  "permission": "crm.leads.create",
  "userId": "user_123"
}

// Response
{
  "success": true,
  "data": {
    "permission": "crm.leads.create",
    "hasPermission": true,
    "userId": "user_123"
  }
}
```

## CRM Permission Structure

### Available Modules & Permissions

```javascript
const CRM_PERMISSIONS = {
  leads: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'assign'],
  accounts: ['read', 'read_all', 'create', 'update', 'delete', 'view_contacts', 'export', 'import'],
  contacts: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import'],
  opportunities: ['read', 'read_all', 'create', 'update', 'delete', 'export', 'import', 'close'],
  quotations: ['read', 'read_all', 'create', 'update', 'delete', 'generate_pdf', 'send', 'approve'],
  dashboard: ['view', 'customize', 'export'],
  system: [
    'settings_read', 'settings_update', 'settings_manage',
    'configurations_read', 'configurations_create', 'configurations_update', 'configurations_delete',
    'dropdowns_read', 'dropdowns_create', 'dropdowns_update', 'dropdowns_delete',
    'integrations_read', 'integrations_create', 'integrations_update', 'integrations_delete',
    'backup_read', 'backup_create', 'backup_restore', 'backup_manage',
    'maintenance_read', 'maintenance_perform', 'maintenance_schedule'
  ]
};
```

### Common Restrictions

```javascript
const CRM_RESTRICTIONS = {
  'crm.max_contacts': 1000,
  'crm.max_leads': 500,
  'crm.max_opportunities': 200,
  'crm.max_quotations': 100,
  'crm.max_accounts': 300,
  'crm.max_users': 50,
  'crm.storage_limit': '10GB',
  'crm.api_calls_per_day': 10000
};
```

## Implementation Examples

### Permission Service

```javascript
// services/permissionService.js
import axios from 'axios';

class CRMPermissionService {
  constructor() {
    this.wrapperUrl = process.env.WRAPPER_URL || 'http://localhost:3000';
    this.appCode = 'crm';
  }

  // NEW: Primary method using wrapper auth endpoints
  async validateToken(token) {
    const response = await axios.post(`${this.wrapperUrl}/api/auth/validate`, {
      token,
      app_code: this.appCode
    });
    return response.data;
  }

  // Legacy method for internal API (optional)
  async fetchUserPermissions(kindeUserId, kindeOrgCode, forceRefresh = false) {
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
  }

  hasPermission(userContext, module, action) {
    const modulePermissions = userContext.permissions[module];
    return modulePermissions?.includes(action) || modulePermissions?.includes('*');
  }

  canViewAll(userContext, module) {
    return this.hasPermission(userContext, module, 'read_all');
  }

  checkRestriction(userContext, restrictionKey, currentValue) {
    const limit = userContext.restrictions[restrictionKey];
    return limit === undefined || currentValue < limit;
  }

  getRestriction(userContext, restrictionKey) {
    return userContext.restrictions[restrictionKey];
  }
}

export default new CRMPermissionService();
```

### Authentication Middleware

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
```

### Route Implementation

```javascript
// routes/contacts.js
import express from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import permissionService from '../services/permissionService.js';

const router = express.Router();

// Get contacts
router.get('/', requireAuth, requirePermission('contacts', 'read'), async (req, res) => {
  try {
    const { userContext } = req;
    const { tenant } = userContext;

    const canViewAll = permissionService.canViewAll(userContext, 'contacts');
    const contacts = canViewAll 
      ? await getContactsByTenant(tenant.id)
      : await getContactsByUser(tenant.id, userContext.user.id);

    res.json({
      success: true,
      contacts,
      total: contacts.length,
      permissions: userContext.permissions.contacts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Create contact
router.post('/', requireAuth, requirePermission('contacts', 'create'), async (req, res) => {
  try {
    const { userContext } = req;
    const { tenant } = userContext;

    // Check restriction
    const currentCount = await getContactCount(tenant.id);
    const maxContacts = permissionService.getRestriction(userContext, 'crm.max_contacts') || 1000;
    
    if (!permissionService.checkRestriction(userContext, 'crm.max_contacts', currentCount)) {
      return res.status(403).json({
        error: 'Contact limit reached',
        current: currentCount,
        limit: maxContacts
      });
    }

    const contactData = {
      ...req.body,
      tenantId: tenant.id,
      createdBy: userContext.user.id,
      createdAt: new Date()
    };

    const newContact = await createContact(contactData);
    res.status(201).json({ success: true, contact: newContact });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

export default router;
```

### Main App Setup

```javascript
// app.js
import express from 'express';
import session from 'express-session';
import permissionService from './services/permissionService.js';

const app = express();
const WRAPPER_URL = process.env.WRAPPER_URL || 'http://localhost:3000';
const CRM_URL = process.env.CRM_URL || 'http://localhost:3002';

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(express.json());

// Middleware to check authentication
function requireAuth(req, res, next) {
  const { userContext } = req.session;
  
      if (!userContext) {
      // Redirect to wrapper for authentication
      const authUrl = `${WRAPPER_URL}/auth?app_code=crm&redirect_url=${encodeURIComponent(`${CRM_URL}/auth`)}`;
      return res.redirect(authUrl);
    }
  
  req.userContext = userContext;
  next();
}

// Authentication callback from wrapper
app.get('/auth', async (req, res) => {
  try {
    const { token, app_code, expires_at } = req.query;

    // Check if this is a redirect from wrapper
    if (!token || app_code !== 'crm') {
      // No token provided, redirect to wrapper for authentication
      const authUrl = `${WRAPPER_URL}/auth?app_code=crm&redirect_url=${encodeURIComponent(`${CRM_URL}/auth`)}`;
      return res.redirect(authUrl);
    }

    // Validate token with wrapper
    const response = await permissionService.validateToken(token);
    
    if (!response.success) {
      throw new Error(response.error || 'Token validation failed');
    }

    // Store user context in session
    req.session.userContext = response.data;
    req.session.token = token;
    req.session.expiresAt = expires_at;

    console.log('✅ User authenticated:', response.data.user.email);

    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    
    // Redirect back to wrapper for fresh authentication
    const authUrl = `${WRAPPER_URL}/auth?app_code=crm&redirect_url=${encodeURIComponent(`${CRM_URL}/auth`)}`;
    res.redirect(authUrl);
  }
});

// Dashboard - requires authentication
app.get('/dashboard', requireAuth, (req, res) => {
  const { userContext } = req;
  
  res.json({
    message: `Welcome to CRM, ${userContext.user.name}!`,
    organization: userContext.organization.name,
    permissions: userContext.permissions,
    roles: userContext.roles,
    subscription: userContext.subscription
  });
});

// Logout
app.get('/logout', (req, res) => {
  // Clear session
  req.session.destroy();
  
  // Redirect to wrapper logout
  const logoutUrl = `${WRAPPER_URL}/logout?app_code=crm&redirect_url=${encodeURIComponent(`${CRM_URL}/login`)}`;
  res.redirect(logoutUrl);
});

// Login page (optional - for when users access CRM directly)
app.get('/login', (req, res) => {
  res.send(`
    <h1>CRM Login</h1>
    <p>Please login to access the CRM system.</p>
    <a href="${WRAPPER_URL}/auth?app_code=crm&redirect_url=${encodeURIComponent(`${CRM_URL}/auth`)}">
      Login with Company Account
    </a>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'CRM',
    timestamp: new Date().toISOString()
  });
});

// API routes - all require authentication
app.use('/api/contacts', requireAuth, require('./routes/contacts.js'));
app.use('/api/leads', requireAuth, require('./routes/leads.js'));
app.use('/api/accounts', requireAuth, require('./routes/accounts.js'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('CRM Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3002, () => {
  console.log('🏢 CRM app running on port 3002');
  console.log(`🔗 Wrapper URL: ${WRAPPER_URL}`);
  console.log(`🎯 App Code: crm`);
});
```

## Environment Variables

```bash
# .env
WRAPPER_URL=http://localhost:3000
CRM_URL=http://localhost:3002
SESSION_SECRET=your-secret-key
NODE_ENV=development

# Optional: For wrapper app
CRM_APP_URL=http://localhost:3002
HR_APP_URL=http://localhost:3003
AFFILIATE_APP_URL=http://localhost:3004
```

## Testing

### 1. Authentication Flow Test

```bash
# Test authentication endpoints
curl -X GET "http://localhost:3000/auth?app_code=crm&redirect_url=http://localhost:3002/auth"

# Test token validation
curl -X POST http://localhost:3000/api/auth/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-token-here",
    "app_code": "crm"
  }'

# Test logout
curl -X GET "http://localhost:3000/logout?app_code=crm&redirect_url=http://localhost:3002/login"
```

### 2. Permission Testing

```javascript
// test-permissions.js
import permissionService from './services/permissionService.js';

async function testPermissions() {
  try {
    // Test with a valid token from authentication flow
    const token = 'your-valid-token-here';
    
    const response = await permissionService.validateToken(token);
    
    if (!response.success) {
      throw new Error(response.error);
    }

    const userContext = response.data;

    console.log('✅ User Context:', {
      user: userContext.user.name,
      organization: userContext.organization.name,
      permissions: userContext.permissions,
      roles: userContext.roles
    });

    console.log('🔍 Permission Tests:');
    console.log('Can create leads:', permissionService.hasPermission(userContext, 'leads', 'create'));
    console.log('Can view all contacts:', permissionService.canViewAll(userContext, 'contacts'));
    console.log('Contact limit:', permissionService.getRestriction(userContext, 'crm.max_contacts'));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPermissions();
```

### 3. Integration Test

```javascript
// test-integration.js
async function testCRMIntegration() {
  try {
    // 1. Start with no authentication - should redirect
    const response1 = await fetch('http://localhost:3002/dashboard');
    console.log('No auth redirect:', response1.url);
    
    // 2. Test authentication callback
    const token = 'test-token';
    const authResponse = await fetch(`http://localhost:3002/auth?token=${token}&app_code=crm&expires_at=${new Date()}`);
    
    // 3. Test API with authentication
    const apiResponse = await fetch('http://localhost:3002/api/contacts', {
      headers: {
        'Cookie': 'session-cookie-from-auth'
      }
    });
    
    console.log('✅ Integration test completed');
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

testCRMIntegration();
```

## Error Codes

- **401**: Authentication required or invalid token
- **403**: Permission denied or restriction exceeded
- **404**: User or tenant not found
- **500**: Server error

## Best Practices

1. Always check permissions before operations
2. Use tenant isolation (filter by tenant ID)
3. Cache user context in session
4. Handle permission errors gracefully
5. Check restrictions before creating records
6. Log permission checks for audit

## Troubleshooting

### 🚨 **Common Issue: Redirecting to Landing Page**

**Problem:** CRM calls `/auth` but gets redirected to landing page instead of authentication flow.

**Cause:** CRM is calling the frontend URL instead of backend URL.

**Solution:**
```javascript
// ❌ WRONG - Frontend URL (React dev server)
const authUrl = 'http://localhost:3001/auth?app_code=crm&redirect_url=...'

// ✅ CORRECT - Backend URL (Fastify API server)  
const authUrl = 'http://localhost:3000/auth?app_code=crm&redirect_url=...'
```

**How to verify:**
1. Check backend logs for: `🎯 ROOT /auth ENDPOINT HIT!`
2. If you don't see this log, CRM is calling wrong URL
3. Make sure `WRAPPER_URL = 'http://localhost:3000'` (backend)
4. NOT `http://localhost:3001` (frontend)

### 🚨 **Port Configuration**

In development:
- **Backend (Fastify):** `http://localhost:3000` ← Use this for CRM API calls
- **Frontend (React/Vite):** `http://localhost:3001` ← Only for browser access (proxies /api to backend)

### 🚨 **URL Structure**

```javascript
// Authentication endpoints
GET http://localhost:3000/auth                    // CRM auth entry point
GET http://localhost:3000/api/auth/auth           // Direct API endpoint
POST http://localhost:3000/api/auth/validate      // Token validation
GET http://localhost:3000/logout                  // CRM logout

// CRM Application
GET http://localhost:3002/auth                    // CRM auth callback
GET http://localhost:3002/dashboard              // CRM dashboard
```

## Authentication Flow Summary

### 🔄 **Complete Flow:**

1. **User accesses CRM** → `http://localhost:3002/dashboard`
2. **CRM checks session** → No auth found
3. **CRM redirects to wrapper** → `http://localhost:3000/auth?app_code=crm&redirect_url=http://localhost:3002/auth`
4. **Wrapper checks authentication** → User not logged in
5. **Wrapper redirects to Kinde** → OAuth flow
6. **User authenticates with Kinde** → Returns to wrapper
7. **Wrapper generates token** → App-specific JWT token
8. **Wrapper redirects to CRM** → `http://localhost:3002/auth?token=xxx&app_code=crm&expires_at=xxx`
9. **CRM validates token** → Calls `POST /api/auth/validate`
10. **CRM stores session** → User context saved
11. **CRM redirects to dashboard** → User authenticated and authorized

### 🎯 **Key Benefits:**

- **Single Sign-On**: One authentication for all apps
- **Centralized Permissions**: All permissions managed in wrapper
- **Tenant Isolation**: Automatic data separation
- **Token-Based**: Secure, stateless authentication
- **Role-Based Access**: Granular permission control
- **Subscription Limits**: Automatic restriction enforcement

### 🔧 **Quick Setup Checklist:**

1. ✅ Add wrapper authentication endpoints to `auth.js`
2. ✅ Create CRM permission service
3. ✅ Add authentication middleware
4. ✅ Update CRM routes with permission checks
5. ✅ Set environment variables
6. ✅ Test authentication flow
7. ✅ Test permission enforcement

This setup provides a complete, secure, and scalable authentication and authorization system for your CRM application! 