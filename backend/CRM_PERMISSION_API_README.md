# 🏢 CRM Permission API Integration Guide

## 📋 Overview
This guide shows CRM applications exactly how to integrate with the permission system to get user permissions, check access rights, and build permission-based UI components.

## 🔑 Authentication
All API calls require a valid JWT token in the Authorization header:
```bash
Authorization: Bearer <your-jwt-token>
```

## 🚀 Working APIs for CRM Integration

### 1. 🔍 Get User's Complete Permission Context
**Endpoint:** `GET /api/permission-matrix/user-context`

**Request:**
```bash
curl -X GET "http://localhost:3000/api/permission-matrix/user-context" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "userId": "kp_5644fd635bf946a292069e3572639e2b",
    "organizationId": "org_0e3615925db1d",
    "subscriptionTier": "Professional",
    "totalPermissions": 106,
    "applications": [
      {
        "name": "CRM",
        "enabled": true,
        "modules": [
          {
            "name": "Leads",
            "permissions": [
              "crm.leads.read",
              "crm.leads.create",
              "crm.leads.update",
              "crm.leads.delete"
            ]
          },
          {
            "name": "Contacts",
            "permissions": [
              "crm.contacts.read",
              "crm.contacts.create",
              "crm.contacts.update",
              "crm.contacts.delete"
            ]
          },
          {
            "name": "Deals",
            "permissions": [
              "crm.deals.read",
              "crm.deals.create",
              "crm.deals.update",
              "crm.deals.delete"
            ]
          },
          {
            "name": "Analytics",
            "permissions": [
              "crm.analytics.view",
              "crm.analytics.export"
            ]
          },
          {
            "name": "Settings",
            "permissions": [
              "crm.settings.view",
              "crm.settings.manage"
            ]
          }
        ]
      }
    ]
  }
}
```

**CRM Usage:**
```javascript
// Get user's complete permission profile
const getUserPermissions = async () => {
  try {
    const response = await fetch('/api/permission-matrix/user-context', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store permissions for UI rendering
      const crmPermissions = data.data.applications.find(app => app.name === 'CRM');
      return crmPermissions;
    }
  } catch (error) {
    console.error('Failed to get permissions:', error);
  }
};
```

### 2. ✅ Check Specific Permission
**Endpoint:** `POST /api/permission-matrix/check-permission`

**Request:**
```bash
curl -X POST "http://localhost:3000/api/permission-matrix/check-permission" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permission": "crm.leads.create"
  }'
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "permission": "crm.leads.create",
    "hasAccess": true,
    "message": "Permission granted"
  }
}
```

**CRM Usage:**
```javascript
// Check if user can create leads
const canCreateLead = async () => {
  try {
    const response = await fetch('/api/permission-matrix/check-permission', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        permission: 'crm.leads.create'
      })
    });
    
    const data = await response.json();
    return data.success && data.data.hasAccess;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
};

// Usage in UI
if (await canCreateLead()) {
  showCreateLeadButton();
} else {
  hideCreateLeadButton();
}
```

### 3. 📊 Get Available Permission Structure
**Endpoint:** `GET /api/permissions/available`

**Request:**
```bash
curl -X GET "http://localhost:3000/api/permissions/available" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "totalModules": 17,
    "totalOperations": 92,
    "applications": [
      {
        "name": "CRM",
        "modules": [
          {
            "name": "Leads",
            "operations": [
              {
                "name": "read",
                "permission": "crm.leads.read",
                "description": "View leads"
              },
              {
                "name": "create",
                "permission": "crm.leads.create",
                "description": "Create new leads"
              },
              {
                "name": "update",
                "permission": "crm.leads.update",
                "description": "Edit existing leads"
              },
              {
                "name": "delete",
                "permission": "crm.leads.delete",
                "description": "Remove leads"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**CRM Usage:**
```javascript
// Build permission-based UI components
const buildPermissionUI = async () => {
  try {
    const response = await fetch('/api/permissions/available', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const crmApp = data.data.applications.find(app => app.name === 'CRM');
      
      // Build navigation menu based on available modules
      crmApp.modules.forEach(module => {
        if (module.operations.some(op => op.name === 'read')) {
          addNavigationItem(module.name);
        }
      });
    }
  } catch (error) {
    console.error('Failed to build UI:', error);
  }
};
```

### 4. 🏢 Get User's Application Access
**Endpoint:** `GET /api/permissions/applications`

**Request:**
```bash
curl -X GET "http://localhost:3000/api/permissions/applications" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "subscriptionTier": "Professional",
    "applications": [
      {
        "name": "CRM",
        "enabled": true,
        "moduleCount": 5,
        "permissionCount": 20
      },
      {
        "name": "HR",
        "enabled": true,
        "moduleCount": 4,
        "permissionCount": 16
      },
      {
        "name": "Affiliate",
        "enabled": true,
        "moduleCount": 3,
        "permissionCount": 12
      }
    ]
  }
}
```

**CRM Usage:**
```javascript
// Check if CRM is enabled for user
const isCRMEnabled = async () => {
  try {
    const response = await fetch('/api/permissions/applications', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const crmApp = data.data.applications.find(app => app.name === 'CRM');
      return crmApp && crmApp.enabled;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to check CRM access:', error);
    return false;
  }
};
```

## 🎯 Complete CRM Integration Example

### Frontend Permission Manager
```javascript
class CRMPermissionManager {
  constructor(token) {
    this.token = token;
    this.permissions = null;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Initialize permissions on app startup
  async initialize() {
    try {
      const response = await fetch('/api/permission-matrix/user-context', {
        headers: this.headers
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.permissions = data.data;
        this.setupUI();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to initialize permissions:', error);
      return false;
    }
  }

  // Check specific permission
  async hasPermission(permission) {
    try {
      const response = await fetch('/api/permission-matrix/check-permission', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ permission })
      });
      
      const data = await response.json();
      return data.success && data.data.hasAccess;
    } catch (error) {
      console.error(`Permission check failed for ${permission}:`, error);
      return false;
    }
  }

  // Setup UI based on permissions
  setupUI() {
    const crmApp = this.permissions.applications.find(app => app.name === 'CRM');
    
    if (!crmApp) return;

    // Setup navigation
    if (this.hasModulePermission('Leads', 'read')) {
      this.showNavigationItem('Leads');
    }
    
    if (this.hasModulePermission('Contacts', 'read')) {
      this.showNavigationItem('Contacts');
    }
    
    if (this.hasModulePermission('Deals', 'read')) {
      this.showNavigationItem('Deals');
    }
    
    if (this.hasModulePermission('Analytics', 'view')) {
      this.showNavigationItem('Analytics');
    }
  }

  // Check module permission
  hasModulePermission(moduleName, operation) {
    const crmApp = this.permissions.applications.find(app => app.name === 'CRM');
    if (!crmApp) return false;
    
    const module = crmApp.modules.find(m => m.name === moduleName);
    if (!module) return false;
    
    const permission = `crm.${moduleName.toLowerCase()}.${operation}`;
    return module.permissions.includes(permission);
  }

  // Show/hide UI elements
  showNavigationItem(name) {
    const element = document.querySelector(`[data-nav="${name}"]`);
    if (element) element.style.display = 'block';
  }

  hideNavigationItem(name) {
    const element = document.querySelector(`[data-nav="${name}"]`);
    if (element) element.style.display = 'none';
  }
}

// Usage
const permissionManager = new CRMPermissionManager(userToken);
await permissionManager.initialize();

// Check permissions in real-time
if (await permissionManager.hasPermission('crm.leads.create')) {
  showCreateLeadButton();
}
```

## 🔒 Permission-Based UI Components

### Navigation Menu
```html
<nav class="crm-navigation">
  <div data-nav="Leads" style="display: none;">
    <a href="/leads">Leads</a>
  </div>
  
  <div data-nav="Contacts" style="display: none;">
    <a href="/contacts">Contacts</a>
  </div>
  
  <div data-nav="Deals" style="display: none;">
    <a href="/deals">Deals</a>
  </div>
  
  <div data-nav="Analytics" style="display: none;">
    <a href="/analytics">Analytics</a>
  </div>
</nav>
```

### Action Buttons
```html
<!-- Create Lead Button -->
<button 
  id="createLeadBtn" 
  style="display: none;"
  onclick="createLead()">
  Create Lead
</button>

<!-- Edit Lead Button -->
<button 
  id="editLeadBtn" 
  style="display: none;"
  onclick="editLead()">
  Edit Lead
</button>
```

### JavaScript for Button Visibility
```javascript
// Show/hide buttons based on permissions
const setupActionButtons = async () => {
  if (await permissionManager.hasPermission('crm.leads.create')) {
    document.getElementById('createLeadBtn').style.display = 'block';
  }
  
  if (await permissionManager.hasPermission('crm.leads.update')) {
    document.getElementById('editLeadBtn').style.display = 'block';
  }
};

// Call on page load
setupActionButtons();
```

## 📱 Mobile/React Native Integration

### React Native Example
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

const CRMPermissionComponent = ({ token }) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const response = await fetch('http://your-api.com/api/permission-matrix/user-context', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPermissions(data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission) => {
    if (!permissions) return false;
    
    const crmApp = permissions.applications.find(app => app.name === 'CRM');
    if (!crmApp) return false;
    
    return crmApp.modules.some(module => 
      module.permissions.includes(permission)
    );
  };

  if (loading) {
    return <Text>Loading permissions...</Text>;
  }

  return (
    <View>
      {hasPermission('crm.leads.create') && (
        <TouchableOpacity onPress={() => Alert.alert('Create Lead')}>
          <Text>Create Lead</Text>
        </TouchableOpacity>
      )}
      
      {hasPermission('crm.leads.read') && (
        <TouchableOpacity onPress={() => Alert.alert('View Leads')}>
          <Text>View Leads</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default CRMPermissionComponent;
```

## 🚨 Error Handling

### Common Error Responses
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "statusCode": 401
}
```

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Insufficient permissions",
  "statusCode": 403
}
```

```json
{
  "success": false,
  "error": "Subscription Expired",
  "message": "Your subscription has expired",
  "statusCode": 402
}
```

### Error Handling in CRM
```javascript
const handlePermissionError = (error) => {
  switch (error.statusCode) {
    case 401:
      // Redirect to login
      redirectToLogin();
      break;
      
    case 403:
      // Show access denied message
      showAccessDeniedMessage();
      break;
      
    case 402:
      // Show subscription expired message
      showSubscriptionExpiredMessage();
      break;
      
    default:
      // Show generic error
      showErrorMessage('Permission check failed');
  }
};

// Usage in API calls
try {
  const response = await fetch('/api/permission-matrix/user-context', {
    headers: this.headers
  });
  
  const data = await response.json();
  
  if (!data.success) {
    handlePermissionError(data);
    return;
  }
  
  // Process successful response
  this.permissions = data.data;
  
} catch (error) {
  console.error('Network error:', error);
  showErrorMessage('Network error occurred');
}
```

## 🔄 Caching Strategy

### Local Storage Caching
```javascript
class PermissionCache {
  constructor() {
    this.cacheKey = 'crm_permissions_cache';
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  // Get cached permissions
  getCachedPermissions() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() - data.timestamp > this.cacheExpiry) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }
      
      return data.permissions;
    } catch (error) {
      localStorage.removeItem(this.cacheKey);
      return null;
    }
  }

  // Cache permissions
  cachePermissions(permissions) {
    try {
      const cacheData = {
        permissions,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to cache permissions:', error);
    }
  }

  // Clear cache
  clearCache() {
    localStorage.removeItem(this.cacheKey);
  }
}

// Usage in permission manager
const permissionCache = new PermissionCache();

// Try cache first, then API
const loadPermissions = async () => {
  // Try cache first
  const cached = permissionCache.getCachedPermissions();
  if (cached) {
    this.permissions = cached;
    return true;
  }
  
  // Load from API
  const success = await this.loadFromAPI();
  if (success) {
    permissionCache.cachePermissions(this.permissions);
  }
  
  return success;
};
```

## 📊 Performance Optimization

### Batch Permission Checking
```javascript
// Check multiple permissions at once
const checkMultiplePermissions = async (permissions) => {
  const results = {};
  
  // Check each permission
  for (const permission of permissions) {
    results[permission] = await this.hasPermission(permission);
  }
  
  return results;
};

// Usage
const permissions = ['crm.leads.create', 'crm.leads.update', 'crm.leads.delete'];
const results = await checkMultiplePermissions(permissions);

// results = {
//   'crm.leads.create': true,
//   'crm.leads.update': true,
//   'crm.leads.delete': false
// }
```

### Lazy Loading
```javascript
// Load permissions only when needed
const lazyLoadPermissions = async (moduleName) => {
  if (!this.permissions) {
    await this.initialize();
  }
  
  return this.hasModulePermission(moduleName, 'read');
};

// Usage in component
const [canViewLeads, setCanViewLeads] = useState(false);

useEffect(() => {
  lazyLoadPermissions('Leads').then(setCanViewLeads);
}, []);
```

## 🎯 Best Practices

1. **Always check permissions before showing UI elements**
2. **Cache permissions locally to reduce API calls**
3. **Handle errors gracefully with user-friendly messages**
4. **Use permission checks for both UI rendering and API validation**
5. **Implement real-time permission updates when user roles change**
6. **Log permission checks for audit purposes**
7. **Use batch permission checking for better performance**

## 🔗 API Endpoints Summary

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/permission-matrix/user-context` | GET | Get complete user permissions | Full permission structure |
| `/api/permission-matrix/check-permission` | POST | Check specific permission | Boolean access result |
| `/api/permissions/available` | GET | Get available permissions | Permission matrix |
| `/api/permissions/applications` | GET | Get user's app access | Application status |

## 🚀 Getting Started

1. **Get your JWT token** from the authentication system
2. **Initialize the permission manager** with your token
3. **Load user permissions** on app startup
4. **Check permissions** before showing UI elements
5. **Handle errors** gracefully
6. **Cache permissions** for better performance

## 🔐 **Kinde Silent Authentication & Domain Cookies**

### **Overview**
CRM applications can implement seamless silent authentication using **Kinde's built-in domain cookie functionality**. This eliminates the need for manual token sharing and provides a native silent login experience across subdomains.

### **How It Works**
```
User logs into wrapper.zopkit.com
         ↓
Kinde sets domain cookies on .zopkit.com
         ↓
Cookies automatically available to all subdomains:
- crm.zopkit.com ✅
- hr.zopkit.com ✅  
- affiliate.zopkit.com ✅
```

### **Implementation in CRM App**

#### **1. Install Kinde SDK**
```bash
npm install @kinde-oss/kinde-auth-react
```

#### **2. Configure KindeProvider**
```javascript
// In CRM App (crm.zopkit.com)
import { KindeProvider } from '@kinde-oss/kinde-auth-react';

const CRMApp = () => {
  return (
    <KindeProvider
      clientId={process.env.REACT_APP_KINDE_CLIENT_ID}
      domain="https://auth.zopkit.com"
      redirectUri="https://crm.zopkit.com/callback"
      logoutUri="https://crm.zopkit.com"
      scope="openid profile email offline"
      prompt="none" // Enable silent authentication
      isDangerouslyUseLocalStorage={false} // Use domain cookies
    >
      <CRMApplication />
    </KindeProvider>
  );
};
```

#### **3. Use Silent Authentication**
```javascript
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

const CRMApplication = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useKindeAuth();

  // Kinde automatically handles silent authentication
  // Domain cookies are checked automatically on app load
  
  if (isLoading) {
    return <div>Checking authentication...</div>;
  }

  if (isAuthenticated) {
    return (
      <div>
        <h1>Welcome, {user.given_name}!</h1>
        <button onClick={logout}>Logout</button>
        <CRMDashboard user={user} />
      </div>
    );
  }

  return (
    <div>
      <h1>Please login to access CRM</h1>
      <button onClick={login}>Login</button>
    </div>
  );
};
```

### **Silent Authentication Flow**

#### **Step 1: App Initialization**
```javascript
// When CRM app loads, Kinde automatically:
// 1. Checks for existing domain cookies
// 2. Attempts silent authentication
// 3. Returns user if valid session exists
// 4. No user interaction required
```

#### **Step 2: Automatic Cookie Management**
```javascript
// Kinde handles all cookie operations:
// ✅ Sets cookies on .zopkit.com domain
// ✅ Manages cookie expiration and renewal
// ✅ Handles secure cookie attributes
// ✅ Automatic cleanup on logout
```

#### **Step 3: Seamless User Experience**
```javascript
// User experience:
// 1. Visit crm.zopkit.com
// 2. If logged into wrapper.zopkit.com → Automatic access
// 3. If not logged in → Redirect to login
// 4. After login → Automatic return to CRM
```

### **Environment Configuration**

#### **CRM App Environment Variables**
```bash
# .env
REACT_APP_KINDE_CLIENT_ID=your_crm_client_id
REACT_APP_KINDE_DOMAIN=https://auth.zopkit.com
REACT_APP_KINDE_REDIRECT_URI=https://crm.zopkit.com/callback
REACT_APP_KINDE_LOGOUT_URI=https://crm.zopkit.com
```

#### **Kinde Dashboard Configuration**
```
Domain: auth.zopkit.com
Allowed Callback URLs: https://crm.zopkit.com/callback
Allowed Logout URLs: https://crm.zopkit.com
Domain Cookies: Enabled
```

### **Advanced Silent Authentication**

#### **Custom Silent Auth Hook**
```javascript
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useEffect, useState } from 'react';

const useSilentAuth = () => {
  const { user, isAuthenticated, isLoading } = useKindeAuth();
  const [silentAuthAttempted, setSilentAuthAttempted] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !silentAuthAttempted) {
      // Attempt silent authentication
      setSilentAuthAttempted(true);
      
      // Kinde will automatically try to authenticate using domain cookies
      console.log('🔄 Attempting silent authentication...');
    }
  }, [isLoading, isAuthenticated, silentAuthAttempted]);

  return {
    user,
    isAuthenticated,
    isLoading,
    silentAuthAttempted
  };
};

// Usage
const CRMDashboard = () => {
  const { user, isAuthenticated, isLoading, silentAuthAttempted } = useSilentAuth();

  if (isLoading) {
    return <div>Initializing...</div>;
  }

  if (!isAuthenticated && silentAuthAttempted) {
    return (
      <div>
        <p>Silent authentication failed. Please login.</p>
        <button onClick={() => window.location.href = 'https://wrapper.zopkit.com/login'}>
          Go to Login
        </button>
      </div>
    );
  }

  if (isAuthenticated) {
    return <div>Welcome, {user.given_name}!</div>;
  }

  return <div>Loading...</div>;
};
```

#### **Silent Auth with Fallback**
```javascript
const SilentAuthWrapper = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useKindeAuth();
  const [fallbackAttempted, setFallbackAttempted] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !fallbackAttempted) {
      setFallbackAttempted(true);
      
      // Try to get token from main app as fallback
      const checkMainAppToken = async () => {
        try {
          // Check if we can get token from main app
          const response = await fetch('https://wrapper.zopkit.com/api/auth/status', {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
              // Redirect to main app to refresh session
              window.location.href = 'https://wrapper.zopkit.com/login?returnTo=' + 
                encodeURIComponent(window.location.href);
              return;
            }
          }
        } catch (error) {
          console.error('Fallback auth check failed:', error);
        }
        
        // If all else fails, redirect to login
        window.location.href = 'https://wrapper.zopkit.com/login?returnTo=' + 
          encodeURIComponent(window.location.href);
      };
      
      checkMainAppToken();
    }
  }, [isLoading, isAuthenticated, fallbackAttempted]);

  if (isLoading) {
    return <div>Checking authentication...</div>;
  }

  if (isAuthenticated) {
    return children;
  }

  return <div>Redirecting to login...</div>;
};
```

### **Cross-Subdomain Navigation**

#### **Seamless App Switching**
```javascript
const AppNavigation = () => {
  const { user } = useKindeAuth();

  const navigateToApp = (appName) => {
    const appUrls = {
      'CRM': 'https://crm.zopkit.com',
      'HR': 'https://hr.zopkit.com',
      'Affiliate': 'https://affiliate.zopkit.com',
      'Main': 'https://wrapper.zopkit.com'
    };

    const targetUrl = appUrls[appName];
    if (targetUrl) {
      // User will be automatically authenticated due to domain cookies
      window.location.href = targetUrl;
    }
  };

  return (
    <nav>
      <button onClick={() => navigateToApp('Main')}>Main App</button>
      <button onClick={() => navigateToApp('CRM')}>CRM</button>
      <button onClick={() => navigateToApp('HR')}>HR</button>
      <button onClick={() => navigateToApp('Affiliate')}>Affiliate</button>
    </nav>
  );
};
```

### **Benefits of Kinde Silent Authentication**

#### **✅ Advantages**
- **Automatic domain cookie management** - No manual handling needed
- **Seamless cross-subdomain experience** - Users stay logged in
- **Built-in security** - Kinde handles all security aspects
- **No token sharing complexity** - Each app manages its own auth
- **Automatic session renewal** - Cookies are refreshed automatically
- **Consistent user experience** - Same auth flow across all apps

#### **🔧 Technical Benefits**
- **Reduced API calls** - No need to validate tokens manually
- **Better performance** - Authentication happens client-side
- **Easier maintenance** - Standard Kinde implementation
- **Automatic error handling** - Kinde manages auth failures
- **Built-in logout handling** - Automatic cleanup across subdomains

### **Troubleshooting Silent Authentication**

#### **Common Issues & Solutions**

**Issue 1: Silent auth not working**
```javascript
// Check Kinde configuration
const checkKindeConfig = () => {
  console.log('Kinde Config:', {
    clientId: process.env.REACT_APP_KINDE_CLIENT_ID,
    domain: process.env.REACT_APP_KINDE_DOMAIN,
    redirectUri: process.env.REACT_APP_KINDE_REDIRECT_URI
  });
};
```

**Issue 2: Domain cookies not accessible**
```javascript
// Verify cookie domain
const checkCookies = () => {
  const cookies = document.cookie.split(';');
  const kindeCookies = cookies.filter(cookie => 
    cookie.includes('kinde') || cookie.includes('auth')
  );
  console.log('Available cookies:', kindeCookies);
};
```

**Issue 3: CORS issues**
```javascript
// Ensure proper CORS configuration in backend
// Backend should allow requests from crm.zopkit.com
```

### **Migration from JWT Tokens**

#### **If you're currently using JWT tokens:**
```javascript
// Old approach (JWT tokens)
class OldCRMAuth {
  async checkAuth() {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      return await this.validateToken(token);
    }
    return false;
  }
}

// New approach (Kinde silent auth)
const NewCRMAuth = () => {
  const { user, isAuthenticated } = useKindeAuth();
  
  // No manual token management needed
  // Kinde handles everything automatically
  
  return isAuthenticated ? <Dashboard user={user} /> : <LoginPrompt />;
};
```

### **Best Practices**

1. **Always use `prompt="none"`** for silent authentication
2. **Set `isDangerouslyUseLocalStorage={false}`** to use domain cookies
3. **Configure proper redirect URIs** in Kinde dashboard
4. **Handle loading states** during silent auth attempts
5. **Provide fallback authentication** for edge cases
6. **Test across different subdomains** to ensure cookie sharing works

Your CRM application is now ready to use the enterprise-level permission system! 🎉
