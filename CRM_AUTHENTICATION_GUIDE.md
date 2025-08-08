# 🔐 CRM Authentication Integration Guide

## 📋 **Overview**

This guide explains how to integrate your CRM application with the Wrapper authentication system. The Wrapper acts as a central authentication authority that provides tokens and permissions to your CRM.

## 🏗️ **Architecture**

```
CRM (localhost:5173) ←→ Wrapper (localhost:3000)
     ↓                           ↓
  Frontend                    Backend API
  (React/Vue)                 (Fastify)
```

## 🚀 **Quick Start**

### **1. Test Authentication Flow**
Visit this URL in your browser to test the complete flow:
```
http://localhost:3000/test-auth?app_code=crm&redirect_url=http://localhost:5173/auth/callback
```

### **2. Expected Result**
- ✅ Redirects to your CRM with authentication token
- ✅ Token validation succeeds
- ✅ Permissions are loaded
- ✅ User is authenticated

## 🔧 **API Endpoints**

### **1. Token Validation**
**Endpoint:** `POST http://localhost:3000/api/auth/validate`

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "app_code": "crm"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "test-user-123",
      "email": "test@example.com",
      "name": "Test User",
      "kindeUserId": "test-user-123"
    },
    "organization": {
      "id": "test-org-123",
      "name": "Test Organization",
      "subdomain": "test",
      "kindeOrgId": "test-org"
    },
    "permissions": {
      "crm": {
        "contacts": ["read", "write", "delete"],
        "deals": ["read", "write"],
        "reports": ["read"]
      }
    },
    "restrictions": {},
    "roles": ["test-admin"],
    "subscription": {
      "plan": "premium",
      "status": "active"
    },
    "tokenInfo": {
      "issuedAt": "2025-08-04T16:02:00.000Z",
      "expiresAt": "2025-08-05T00:02:00.000Z",
      "app_code": "crm"
    }
  }
}
```

### **2. Get CRM Permissions**
**Endpoint:** `POST http://localhost:3000/api/auth/crm-permissions`

**Request:**
```json
{
  "kinde_user_id": "test-user-123",
  "kinde_org_code": "test-org",
  "requesting_app": "crm",
  "force_refresh": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "test-user-123",
      "email": "test@example.com",
      "name": "Test User",
      "kindeUserId": "test-user-123"
    },
    "organization": {
      "id": "test-org-123",
      "name": "Test Organization",
      "subdomain": "test",
      "kindeOrgId": "test-org"
    },
    "permissions": {
      "accounts": ["read", "write", "delete"],
      "leads": ["read", "write", "delete"],
      "opportunities": ["read", "write"],
      "contacts": ["read", "write"],
      "invoices": ["read", "write"],
      "quotations": ["read", "write"],
      "sales": ["read", "write"],
      "product-orders": ["read", "write"],
      "tickets": ["read", "write"],
      "communications": ["read", "write"],
      "calendar": ["read", "write"],
      "form-template-builder": ["read", "write"],
      "admin": ["read", "write"]
    },
    "restrictions": {
      "max_leads": 1000,
      "max_accounts": 500,
      "max_opportunities": 200,
      "max_contacts": 1000,
      "max_invoices": 100,
      "max_quotations": 100,
      "max_sales": 100,
      "max_product_orders": 100,
      "max_tickets": 200
    },
    "roles": ["test-admin"],
    "subscription": {
      "plan": "premium",
      "status": "active"
    },
    "source": "test",
    "cachedAt": "2025-08-04T16:15:49.808Z"
  }
}
```

## 🔄 **Authentication Flow**

### **Step 1: User Visits CRM**
```
User → http://localhost:5173
```

### **Step 2: CRM Redirects to Wrapper**
```javascript
// In your CRM's authentication logic
const wrapperAuthUrl = `http://localhost:3000/test-auth?app_code=crm&redirect_url=${encodeURIComponent('http://localhost:5173/auth/callback')}`;
window.location.href = wrapperAuthUrl;
```

### **Step 3: Wrapper Processes Authentication**
```
Wrapper → Generates JWT Token → Redirects to CRM
```

### **Step 4: CRM Receives Token**
```
CRM receives: http://localhost:5173/auth/callback?token=JWT_TOKEN&expires_at=TIMESTAMP&app_code=crm&test_mode=true
```

### **Step 5: CRM Validates Token**
```javascript
// Extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Validate token with wrapper
const validateResponse = await fetch('http://localhost:3000/api/auth/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, app_code: 'crm' })
});

const validateData = await validateResponse.json();
```

### **Step 6: CRM Fetches Permissions**
```javascript
// Get user and org info from validation response
const kinde_user_id = validateData.data.user.kindeUserId;
const kinde_org_code = validateData.data.organization.kindeOrgId;

// Fetch permissions
const permissionsResponse = await fetch('http://localhost:3000/api/auth/crm-permissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    kinde_user_id,
    kinde_org_code,
    requesting_app: 'crm',
    force_refresh: false
  })
});

const permissionsData = await permissionsResponse.json();
```

### **Step 7: User is Authenticated**
```javascript
// Store authentication state
localStorage.setItem('auth_token', token);
localStorage.setItem('user_data', JSON.stringify(permissionsData.data.user));
localStorage.setItem('permissions', JSON.stringify(permissionsData.data.permissions));

// Redirect to dashboard
window.location.href = '/dashboard';
```

## 💻 **Implementation Examples**

### **React Implementation**

```jsx
// AuthCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const appCode = searchParams.get('app_code');
        
        if (!token || appCode !== 'crm') {
          throw new Error('Invalid authentication parameters');
        }

        console.log('🔍 Validating token with wrapper...');

        // Step 1: Validate token
        const validateResponse = await fetch('http://localhost:3000/api/auth/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, app_code: 'crm' })
        });

        if (!validateResponse.ok) {
          throw new Error('Token validation failed');
        }

        const validateData = await validateResponse.json();
        console.log('✅ Token validated successfully');

        // Step 2: Get permissions
        const kinde_user_id = validateData.data.user.kindeUserId;
        const kinde_org_code = validateData.data.organization.kindeOrgId;

        const permissionsResponse = await fetch('http://localhost:3000/api/auth/crm-permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kinde_user_id,
            kinde_org_code,
            requesting_app: 'crm',
            force_refresh: false
          })
        });

        if (!permissionsResponse.ok) {
          throw new Error('Failed to fetch permissions');
        }

        const permissionsData = await permissionsResponse.json();
        console.log('✅ Permissions fetched successfully');

        // Step 3: Store authentication state
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(permissionsData.data.user));
        localStorage.setItem('permissions', JSON.stringify(permissionsData.data.permissions));
        localStorage.setItem('organization', JSON.stringify(permissionsData.data.organization));

        // Step 4: Redirect to dashboard
        navigate('/dashboard', { replace: true });

      } catch (error) {
        console.error('❌ Authentication error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
```

### **Authentication Service**

```javascript
// authService.js
class AuthService {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
  }

  async validateToken(token, appCode = 'crm') {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, app_code: appCode })
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Token validation error:', error);
      throw error;
    }
  }

  async getPermissions(kindeUserId, kindeOrgCode, requestingApp = 'crm') {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/crm-permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kinde_user_id: kindeUserId,
          kinde_org_code: kindeOrgCode,
          requesting_app: requestingApp,
          force_refresh: false
        })
      });

      if (!response.ok) {
        throw new Error(`Permissions fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Permissions fetch error:', error);
      throw error;
    }
  }

  async authenticate(token) {
    try {
      // Step 1: Validate token
      const validateData = await this.validateToken(token);
      
      // Step 2: Get permissions
      const kindeUserId = validateData.data.user.kindeUserId;
      const kindeOrgCode = validateData.data.organization.kindeOrgId;
      
      const permissionsData = await this.getPermissions(kindeUserId, kindeOrgCode);
      
      // Step 3: Store authentication state
      this.storeAuthData(token, permissionsData.data);
      
      return permissionsData.data;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  storeAuthData(token, userData) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(userData.user));
    localStorage.setItem('permissions', JSON.stringify(userData.permissions));
    localStorage.setItem('organization', JSON.stringify(userData.organization));
    localStorage.setItem('subscription', JSON.stringify(userData.subscription));
  }

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  }

  getToken() {
    return localStorage.getItem('auth_token');
  }

  getUser() {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  getPermissions() {
    const permissions = localStorage.getItem('permissions');
    return permissions ? JSON.parse(permissions) : {};
  }

  hasPermission(module, action) {
    const permissions = this.getPermissions();
    const modulePermissions = permissions[module] || [];
    return modulePermissions.includes(action) || modulePermissions.includes('*');
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('permissions');
    localStorage.removeItem('organization');
    localStorage.removeItem('subscription');
    window.location.href = '/';
  }
}

export const authService = new AuthService();
```

## 🔒 **Permission Checking**

### **Check if User Has Permission**
```javascript
// Check if user can read contacts
if (authService.hasPermission('contacts', 'read')) {
  // Show contacts
}

// Check if user can write to leads
if (authService.hasPermission('leads', 'write')) {
  // Allow creating/editing leads
}

// Check if user is admin
if (authService.hasPermission('admin', 'read')) {
  // Show admin features
}
```

### **React Hook for Permissions**
```javascript
// usePermissions.js
import { useState, useEffect } from 'react';
import { authService } from './authService';

export function usePermissions() {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      setPermissions(authService.getPermissions());
    }
    setLoading(false);
  }, []);

  const hasPermission = (module, action) => {
    const modulePermissions = permissions[module] || [];
    return modulePermissions.includes(action) || modulePermissions.includes('*');
  };

  return { permissions, hasPermission, loading };
}
```

## 🧪 **Testing**

### **Test Token Validation**
```bash
curl -X POST "http://localhost:3000/api/auth/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "app_code": "crm"
  }'
```

### **Test Permissions Fetch**
```bash
curl -X POST "http://localhost:3000/api/auth/crm-permissions" \
  -H "Content-Type: application/json" \
  -d '{
    "kinde_user_id": "test-user-123",
    "kinde_org_code": "test-org",
    "requesting_app": "crm"
  }'
```

### **Test Complete Flow**
Visit this URL in your browser:
```
http://localhost:3000/test-auth?app_code=crm&redirect_url=http://localhost:5173/auth/callback
```

## 🚨 **Error Handling**

### **Common Errors**

1. **Token Validation Failed (401)**
   - Token is expired or invalid
   - Check if token is properly extracted from URL

2. **Permissions Fetch Failed (500)**
   - User or organization not found in database
   - Check if `kinde_user_id` and `kinde_org_code` are correct

3. **CORS Errors**
   - Make sure your CRM is running on `localhost:5173`
   - Check that CORS is properly configured on the wrapper

### **Error Response Format**
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

## 🔧 **Environment Variables**

Make sure your CRM has these environment variables:

```env
VITE_WRAPPER_URL=http://localhost:3000
VITE_CLIENT_URL=http://localhost:5173
```

## 📱 **Mobile/SPA Considerations**

1. **Token Storage**: Use `localStorage` for web apps, secure storage for mobile
2. **Token Refresh**: Implement token refresh logic for long-lived sessions
3. **Offline Support**: Cache permissions locally for offline functionality

## 🔄 **Production Deployment**

1. **Update URLs**: Change `localhost:3000` to your production wrapper URL
2. **HTTPS**: Ensure all communication uses HTTPS in production
3. **CORS**: Configure CORS to allow your production CRM domain
4. **Rate Limiting**: Implement rate limiting for API calls

## 📞 **Support**

If you encounter issues:

1. Check the browser console for error messages
2. Verify the wrapper is running on port 3000
3. Test the endpoints directly with curl
4. Check that your CRM is running on port 5173

## 🎯 **Next Steps**

1. **Implement the authentication flow** in your CRM
2. **Test with the test endpoint** to verify everything works
3. **Replace test endpoint** with real Kinde authentication
4. **Add permission checks** throughout your CRM
5. **Implement logout functionality**

---

**Happy coding! 🚀** 