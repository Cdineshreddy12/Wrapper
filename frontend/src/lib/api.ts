import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Store for Kinde token getter function
let kindeTokenGetter: (() => Promise<string | null>) | null = null;

// Function to set the Kinde token getter (called from components that have access to useKindeAuth)
export const setKindeTokenGetter = (getter: () => Promise<string | null>) => {
  kindeTokenGetter = getter;
};

// Function to get Kinde token from localStorage/sessionStorage
const getKindeToken = async () => {
  // First check for backup token (for refresh scenarios when cookies are cleared)
  const backupToken = localStorage.getItem('kinde_backup_token');
  if (backupToken) {
    console.log('🔄 Found backup token, using it first');
    return backupToken;
  }

  // Then try to use the Kinde SDK if available
  if (kindeTokenGetter) {
    try {
      console.log('🔑 Trying Kinde SDK getToken()...');
      const token = await kindeTokenGetter();
      if (token) {
        console.log('✅ Got token from Kinde SDK');
        // Store as backup for next time
        localStorage.setItem('kinde_backup_token', token);
        return token;
      }
    } catch (error) {
      console.log('❌ Kinde SDK getToken() failed:', error);
    }
  }

  // Fallback to manual token search
  try {
    console.log('🔍 Searching for authentication token manually...');
    
    // Method 1: Check localStorage for kinde_session
    const kindeAuth = localStorage.getItem('kinde_session');
    if (kindeAuth) {
      console.log('📱 Found kinde_session in localStorage');
      try {
        const session = JSON.parse(kindeAuth);
        if (session.access_token) {
          console.log('✅ Found access_token in kinde_session');
          return session.access_token;
        }
      } catch (e) {
        console.log('❌ Failed to parse kinde_session JSON');
      }
    }

    // Method 2: Check sessionStorage
    const sessionAuth = sessionStorage.getItem('kinde_session');
    if (sessionAuth) {
      console.log('📱 Found kinde_session in sessionStorage');
      try {
        const session = JSON.parse(sessionAuth);
        if (session.access_token) {
          console.log('✅ Found access_token in sessionStorage');
          return session.access_token;
        }
      } catch (e) {
        console.log('❌ Failed to parse sessionStorage kinde_session JSON');
      }
    }

    // Method 3: Check all localStorage keys for ANY auth patterns
    console.log('🔍 Checking all localStorage keys for auth patterns...');
    const localStorageKeys = Object.keys(localStorage);
    console.log('📁 LocalStorage keys:', localStorageKeys);
    
    for (const key of localStorageKeys) {
      const value = localStorage.getItem(key);
      console.log(`🔑 Checking key: ${key}`);
      console.log(`📄 Value preview: ${value?.substring(0, 100)}...`);
      
      // Check for Kinde-specific patterns
      if (key.toLowerCase().includes('kinde')) {
        console.log(`🎯 Found Kinde-related key: ${key}`);
        
        // Check if it's a JSON object with tokens
        try {
          const parsed = JSON.parse(value || '{}');
          if (parsed.access_token) {
            console.log('✅ Found access_token in', key);
            return parsed.access_token;
          }
          if (parsed.accessToken) {
            console.log('✅ Found accessToken in', key);
            return parsed.accessToken;
          }
        } catch (e) {
          // Not JSON, check if it looks like a raw token
          if (value && value.length > 50 && !value.includes(' ') && !value.includes('{')) {
            console.log('✅ Found potential raw token in', key);
            return value;
          }
        }
      }
      
      // Check for general auth patterns (like refreshToken0)
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
        console.log(`🔍 Found general auth key: ${key}`);
        try {
          const parsed = JSON.parse(value || '{}');
          if (parsed.access_token) {
            console.log('✅ Found access_token in general auth key', key);
            return parsed.access_token;
          }
          if (parsed.accessToken) {
            console.log('✅ Found accessToken in general auth key', key);
            return parsed.accessToken;
          }
          if (parsed.token) {
            console.log('✅ Found token in general auth key', key);
            return parsed.token;
          }
        } catch (e) {
          // Not JSON, might be a raw token
          if (value && value.length > 20 && !value.includes(' ')) {
            console.log('✅ Found potential raw token in general auth key', key);
            return value;
          }
        }
      }
    }

    // Method 4: Check sessionStorage keys
    console.log('🔍 Checking all sessionStorage keys for auth patterns...');
    const sessionStorageKeys = Object.keys(sessionStorage);
    console.log('📁 SessionStorage keys:', sessionStorageKeys);
    
    for (const key of sessionStorageKeys) {
      const value = sessionStorage.getItem(key);
      console.log(`🔑 Checking sessionStorage key: ${key}`);
      console.log(`📄 Value preview: ${value?.substring(0, 100)}...`);
      
      if (key.toLowerCase().includes('kinde') || key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
        console.log(`🎯 Found auth-related key in sessionStorage: ${key}`);
        
        try {
          const parsed = JSON.parse(value || '{}');
          if (parsed.access_token) {
            console.log('✅ Found access_token in sessionStorage', key);
            return parsed.access_token;
          }
          if (parsed.accessToken) {
            console.log('✅ Found accessToken in sessionStorage', key);
            return parsed.accessToken;
          }
          if (parsed.token) {
            console.log('✅ Found token in sessionStorage', key);
            return parsed.token;
          }
        } catch (e) {
          // Not JSON, check if it looks like a raw token
          if (value && value.length > 20 && !value.includes(' ')) {
            console.log('✅ Found potential raw token in sessionStorage', key);
            return value;
          }
        }
      }
    }

    // Method 5: Check cookies as backup
    console.log('🔍 Checking cookies for auth tokens...');
    const cookies = document.cookie.split(';');
    console.log('🍪 Available cookies:', cookies.map(c => c.trim().split('=')[0]));
    
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name && value && (
        name.includes('kinde') || 
        name.includes('token') || 
        name.includes('auth') ||
        name === 'access_token' ||
        name === 'accessToken'
      )) {
        console.log('✅ Found auth token in cookies:', name);
        return decodeURIComponent(value);
      }
    }

    console.log('❌ No authentication token found in any storage location');
    console.log('💡 This might mean the user is not authenticated or tokens are stored differently');
    
    return null;
  } catch (error) {
    console.error('🚨 Error getting authentication token:', error);
    return null;
  }
};

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add debugging and ensure cookies are sent
api.interceptors.request.use(async (config) => {
  // Try to get the authentication token and add it to headers
  const authToken = await getKindeToken();
  
  if (authToken) {
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as any;
    }
    
    // Set the Authorization header
    config.headers['Authorization'] = `Bearer ${authToken}`;
    console.log('🔑 Added authentication token to request headers');
    console.log('🔍 Token preview:', authToken.substring(0, 20) + '...');
  } else {
    console.log('❌ No authentication token found for request');
  }

  console.log('🔍 API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    withCredentials: config.withCredentials,
    hasAuthToken: !!authToken,
    authHeader: config.headers?.Authorization ? 'SET' : 'NOT SET'
  });
  
  return config
}, (error) => {
  console.error('🚨 API Request Error:', error);
  return Promise.reject(error);
})

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Don't log authentication errors in production
    if (error.response?.status !== 401) {
      console.error('🚨 API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data
      })
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('🔐 Authentication required - redirecting to login')
      // Clear any stale auth data
      localStorage.removeItem('kinde_token')
      localStorage.removeItem('authToken')
      
      // TODO: Re-enable this redirect once backend API is properly set up
      // window.location.href = '/login'
    }

    // Handle trial expiry (200 status with subscriptionExpired flag) - Graceful handling without excessive toasts
    if (error.response?.status === 200 && (error.response?.data as any)?.subscriptionExpired) {
      const responseData = error.response.data as any
      
      if (responseData?.code === 'TRIAL_EXPIRED' || responseData?.code === 'SUBSCRIPTION_EXPIRED') {
        console.log('🚫 Trial/Subscription expired response intercepted:', responseData)
        
        // Store trial/subscription expiry state for banner to use
        const expiredData = {
          expired: true,
          expiredAt: new Date().toISOString(),
          isTrialExpired: responseData.isTrialExpired,
          isSubscriptionExpired: responseData.isSubscriptionExpired,
          trialEnd: responseData.data?.trialEnd,
          currentPeriodEnd: responseData.data?.currentPeriodEnd,
          expiredDate: responseData.data?.expiredDate,
          expiredDuration: responseData.data?.expiredDuration,
          plan: responseData.data?.plan,
          message: responseData.message,
          immediate: responseData.immediate,
          code: responseData.code
        }
        
        // Store in localStorage for persistence
        localStorage.setItem('trialExpired', JSON.stringify(expiredData))
        
        // Only emit events if not already done to prevent spam
        const lastEmitted = localStorage.getItem('trialExpiredEventEmitted')
        const now = Date.now()
        
        if (!lastEmitted || (now - parseInt(lastEmitted)) > 5000) { // 5 second cooldown
          localStorage.setItem('trialExpiredEventEmitted', now.toString())
          
          // Emit immediate event for banner to show instantly
          window.dispatchEvent(new CustomEvent('apiTrialExpired', { 
            detail: responseData 
          }))
          
          // Also emit the original event for compatibility
          window.dispatchEvent(new CustomEvent('trialExpired', { 
            detail: expiredData 
          }))
        }
        
        // Don't show additional error toasts - let the banner and dashboard handle it gracefully
        return Promise.reject(error)
      }
    }

    // Handle server errors - but don't spam toasts for trial expiry scenarios
    if (error.response?.status && error.response.status >= 500) {
      console.error('🚨 Server error intercepted:', error.response.status)
      
      // Don't show server error toasts if we're in a trial expiry state
      const trialExpired = localStorage.getItem('trialExpired')
      if (!trialExpired) {
        toast.error('Server temporarily unavailable. Please try again in a moment.', {
          duration: 4000,
          position: 'top-center'
        })
      }
    }
    
    return Promise.reject(error)
  }
)

// API Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  tenantId: string
  lastActiveAt: string
  createdAt: string
}

// Unified user interface that matches the backend response
export interface UnifiedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  invitationStatus: 'active' | 'pending' | 'inactive'
  invitedAt: string
  expiresAt: string | null
  lastActiveAt: string | null
  invitationId: string | null
  status: string
  userType: 'active' | 'invited'
  originalData?: any
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface Tenant {
  id: string
  name: string
  domain: string
  status: 'active' | 'suspended' | 'pending'
  plan: string
  createdAt: string
  settings: Record<string, any>
}

export interface Subscription {
  id: string
  tenantId: string
  planId: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  amount: number
  currency: string
}

export interface UsageMetrics {
  apiCalls: number
  storage: number
  users: number
  bandwidth: number
}

export interface Plan {
  id: string
  name: string
  price: number
  currency: string
  features: Record<string, any>
  limits: Record<string, number>
}

export interface Permission {
  id: string
  name: string
  description: string
  category: string
  resource: string
  action: string
}

// Enhanced Role interface that supports both legacy flat and new hierarchical permission formats
export interface Role {
  roleId: string
  roleName: string
  name?: string // Alternative name field for compatibility
  description?: string
  color?: string
  // Support both permission formats
  permissions: string[] | Record<string, any>
  restrictions?: {
    // Legacy fields
    ipWhitelist?: string[]
    timeRestrictions?: {
      allowedHours?: number[]
      allowedDays?: number[]
      timezone?: string
    }
    dataAccess?: {
      ownDataOnly?: boolean
      departmentOnly?: boolean
      allowedApps?: string[]
    }
    // New comprehensive restrictions
    planType?: string
    maxUsers?: number
    maxRoles?: number
    storageLimit?: string
    apiCallLimit?: number
  }
  isSystemRole: boolean
  isDefault: boolean
  priority: number
  createdBy: string
  createdAt: string
  updatedAt: string
  // Additional fields for enhanced role management
  userCount?: number
  icon?: string
  category?: string
  inheritance?: {
    parentRoles: string[]
    inheritanceMode: 'additive' | 'restrictive'
    priority: number
  }
  metadata?: {
    icon?: string
    category?: string
    tags?: string[]
    level?: string
    department?: string
    isTemplate?: boolean
  }
}

export interface RoleTemplate {
  templateId: string
  templateName: string
  displayName: string
  description?: string
  category?: string
  permissions: string[]
  restrictions?: any
  targetTools: string[]
  isActive: boolean
  sortOrder: number
}

export interface RoleAssignment {
  assignmentId: string
  userId: string
  roleId: string
  roleName: string
  assignedBy: string
  assignedAt: string
  isTemporary: boolean
  expiresAt?: string
  isActive: boolean
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface AuditLogEntry {
  logId: string
  tenantId: string
  userId?: string
  action: string
  resourceType: string
  resourceId?: string
  oldValues?: any
  newValues?: any
  details?: any
  ipAddress?: string
  userAgent?: string
  createdAt: string
  user?: {
    name: string
    email: string
  }
}

// Auth API
export const authAPI = {
  getLoginUrl: (subdomain: string) => api.get(`/auth/login/${subdomain}`),
  handleCallback: (code: string, state?: string) => 
    api.get('/auth/callback', { params: { code, state } }),
  getUserInfo: () => api.get<User>('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProviders: () => api.get('/auth/providers'),
}

// Tenant API
export const tenantAPI = {
  // Get current tenant details
  getCurrentTenant: () => api.get<Tenant>('/tenants/current'),
  
  // Get tenant users
  getUsers: () => api.get<ApiResponse<UnifiedUser[]>>('/tenants/current/users'),
  
  // Invite user to tenant
  inviteUser: (data: { email: string; roleId: string; message?: string }) =>
    api.post<ApiResponse<any>>('/tenants/current/users/invite', data),
  
  // Remove user from tenant
  removeUser: (userId: string) =>
    api.delete<ApiResponse<any>>(`/tenants/current/users/${userId}`),
  
  // Update user role
  updateUserRole: (userId: string, roleId: string) =>
    api.put<ApiResponse<any>>(`/tenants/current/users/${userId}/role`, { roleId }),
  
  // Get tenant usage
  getUsage: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<any>>('/tenants/current/usage', { params }),
  
  // Export users
  exportUsers: () => api.get('/tenants/current/users/export'),
}

// Subscription API
export const subscriptionAPI = {
  // Debug endpoint for testing authentication
  debugAuth: () => api.get('/subscriptions/debug-auth'),
  
  getCurrent: () => api.get('/subscriptions/current'),
  getAvailablePlans: () => api.get('/subscriptions/plans'),
  getBillingHistory: () => api.get('/subscriptions/billing-history'),
  getConfigStatus: () => api.get('/subscriptions/config-status'),
  createCheckout: (data: {
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    successUrl: string;
    cancelUrl: string;
  }) => api.post('/subscriptions/checkout', data),
  changePlan: (data: {
    planId: string;
    billingCycle?: 'monthly' | 'yearly';
  }) => api.post('/subscriptions/change-plan', data),
  cancelSubscription: () => api.post('/subscriptions/cancel'),
  updatePaymentMethod: () => api.post('/subscriptions/update-payment-method'),
  getUsage: () => api.get('/subscriptions/usage'),
  
  // Enhanced payment management
  immediateDowngrade: (data: { newPlan: string; reason?: string; refundRequested?: boolean }) => 
    api.post('/subscriptions/immediate-downgrade', data),
  processRefund: (data: { paymentId: string; amount?: number; reason?: string }) => 
    api.post('/subscriptions/refund', data),
  getPaymentDetails: (paymentId: string) => 
    api.get(`/subscriptions/payment/${paymentId}`),
  getSubscriptionActions: () => 
    api.get('/subscriptions/actions'),
  getPlanLimits: () => 
    api.get('/subscriptions/plan-limits'),
  cleanupDuplicatePayments: () => 
    api.post('/subscriptions/cleanup-duplicate-payments'),
  toggleTrialRestrictions: (disable: boolean) => 
    api.post('/subscriptions/toggle-trial-restrictions', { disable }),
}

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getMetrics: (period?: string) => 
    api.get('/analytics/metrics', { params: { period } }),
  getPerformance: () => api.get('/analytics/performance'),
  getReports: () => api.get('/analytics/reports'),
  exportData: (type: string) => api.get(`/analytics/export/${type}`),
}

// Usage API
export const usageAPI = {
  getCurrent: () => api.get<UsageMetrics>('/usage/current'),
  getMetrics: (period?: string) => 
    api.get('/usage/metrics', { params: { period } }),
  getBreakdown: () => api.get('/usage/breakdown'),
  getAlerts: () => api.get('/usage/alerts'),
  getLogs: (page = 1, limit = 50) => 
    api.get('/usage/logs', { params: { page, limit } }),
}

// Permissions API
export const permissionsAPI = {
  getAvailablePermissions: () => api.get('/permissions/available'),
  
  // Applications and modules
  getApplications: () => api.get('/permissions/applications'),
  
  // Users
  getUsers: () => api.get('/permissions/users'),
  getUserPermissions: (userId: string) => api.get(`/permissions/users/${userId}/permissions`),
  
  // Bulk operations
  bulkAssignPermissions: (assignments: Array<{
    userId: string;
    appId: string;
    moduleId: string;
    permissions: string[];
  }>) => api.post('/permissions/bulk-assign', { assignments }),
  
  // Template operations
  getTemplates: () => api.get('/permissions/templates'),
  applyTemplate: (userId: string, data: {
    templateId: string;
    clearExisting?: boolean;
  }) => api.post(`/permissions/users/${userId}/apply-template`, data),
  
  // Permission removal
  removeUserPermissions: (userId: string, data: {
    appId?: string;
    moduleId?: string;
    permissionIds?: string[];
  }) => api.delete(`/permissions/users/${userId}/permissions`, { data }),
  
  // Roles - Basic operations only (creation moved to builder)
  getRoles: (params?: { page?: number; limit?: number; search?: string; type?: string }) => 
    api.get('/permissions/roles', { params }),
  updateRole: (roleId: string, data: { 
    name?: string; 
    description?: string; 
    permissions?: string[]; 
    restrictions?: any 
  }) => api.put(`/permissions/roles/${roleId}`, data),
  deleteRole: (roleId: string) => api.delete(`/permissions/roles/${roleId}`),
  
  // Role Templates - REMOVED (using application/module builder instead)
  
  // Custom Role Builder (using applications/modules tables)
  getRoleBuilderOptions: () => api.get('/custom-roles/builder-options'),
  createRoleFromBuilder: (data: {
    roleName: string;
    description?: string;
    selectedApps: string[];
    selectedModules: Record<string, string[]>;
    selectedPermissions: Record<string, string[]>;
    restrictions?: Record<string, boolean>;
    metadata?: any;
  }) => api.post('/custom-roles/create-from-builder', data),
  assignUserPermissions: (data: {
    userId: string;
    appCode: string;
    moduleCode: string;
    permissions: string[];
    reason?: string;
    expiresAt?: string;
  }) => api.post('/custom-roles/assign-user-permissions', data),
  getCustomUserPermissions: (userId: string) => api.get(`/custom-roles/user-permissions/${userId}`),
  
  // Role Assignments
  getAssignments: (params?: { 
    userId?: string; 
    roleId?: string; 
    page?: number; 
    limit?: number 
  }) => api.get('/permissions/assignments', { params }),
  assignRole: (data: {
    userId: string;
    roleId: string;
    expiresAt?: string;
    conditions?: any;
  }) => api.post('/permissions/assignments', data),
  removeAssignment: (assignmentId: string) => 
    api.delete(`/permissions/assignments/${assignmentId}`),
  bulkAssignRoles: (assignments: Array<{
    userId: string;
    roleId: string;
    expiresAt?: string;
  }>) => api.post('/permissions/assignments/bulk', { assignments }),
  
  // Permission Checking
  checkPermissions: (data: {
    permissions: string[];
    userId?: string;
    resource?: string;
    context?: any;
  }) => api.post('/permissions/check', data),
  getUserEffectivePermissions: (userId: string) => 
    api.get(`/permissions/user/${userId}/effective`),
  
  // Audit
  getAuditLog: (params?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/permissions/audit', { params }),
}

// User API
export const userAPI = {
  getProfile: () => api.get<User>('/users/profile'),
  updateProfile: (data: Partial<User>) => api.put('/users/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.put('/users/password', data),
  getActivityLogs: () => api.get('/users/activity'),
  completeOnboarding: (data: Record<string, any>) => 
    api.post('/users/onboarding', data),
}

// Onboarding API
export const onboardingAPI = {
  checkSubdomain: async (subdomain: string) => {
    return await api.get(`/onboarding/check-subdomain?subdomain=${subdomain}`)
  },

  complete: async (data: any) => {
    return await api.post('/onboarding/onboard', data)
  },

  checkStatus: async () => {
    return await api.get('/onboarding/status')
  },

  markUserAsOnboarded: async (tenantId: string) => {
    return await api.post('/onboarding/mark-onboarded', { tenantId })
  },

  // Removed syncUser - overly complex, replaced with proper onboarding flow

  // Get user's organization info after onboarding
  getUserOrganization: () => api.get('/onboarding/user-organization'),
  
  // Get saved onboarding data by email (for pre-filling)
  getDataByEmail: (email: string) => 
    api.post('/onboarding/get-data', { email }),
  
  // Mark onboarding as complete (called after successful setup)
  markComplete: (organizationId: string) => 
    api.post('/onboarding/mark-complete', { organizationId }),
  
  // Update current onboarding step for progress tracking
  updateStep: (step: string, data?: any, email?: string, formData?: any) => 
    api.post('/onboarding/update-step', { step, data, email, formData }),
  
  // Reset onboarding status (for testing/admin purposes)
  reset: (targetUserId?: string) => 
    api.post('/onboarding/reset', targetUserId ? { targetUserId } : {}),
}

// User Sync and Classification API
export const userSyncAPI = {
  // Get all users classified by application access
  getUserClassification: () => 
    api.get('/user-sync/classification'),

  // Get users for specific application
  getUsersForApplication: (appCode: string) => 
    api.get(`/user-sync/classification/${appCode}`),

  // Get specific user's application access
  getUserApplicationAccess: (userId: string) => 
    api.get(`/user-sync/user/${userId}/access`),

  // Sync all users to their applications
  syncAllUsers: (options: { syncType?: 'full' | 'incremental', dryRun?: boolean } = {}) => 
    api.post('/user-sync/sync/all', options),

  // Sync users for specific application
  syncUsersForApplication: (appCode: string, options: { syncType?: 'full' | 'incremental' } = {}) => 
    api.post(`/user-sync/sync/application/${appCode}`, options),

  // Sync individual user
  syncUser: (userId: string, options: { syncType?: 'full' | 'update' } = {}) => 
    api.post(`/user-sync/sync/user/${userId}`, options),

  // Refresh user classification after role changes
  refreshUserClassification: (userId: string, options: { 
    autoSync?: boolean, 
    previousApps?: string[] 
  } = {}) => 
    api.post(`/user-sync/refresh/${userId}`, options),

  // Get sync status for tenant
  getSyncStatus: () => 
    api.get('/user-sync/status'),

  // Test connectivity to applications
  testConnectivity: (appCode?: string) => 
    api.post('/user-sync/test-connectivity', { appCode })
}

// User Application Management API (enhanced functionality)
export const userApplicationAPI = {
  // Get all users with their application access
  getUsersWithApplicationAccess: (params?: {
    includeInactive?: boolean;
    appCode?: string;
    includePermissionDetails?: boolean;
  }) => api.get('/user-sync/classification', { params }),

  // Get specific user's application access
  getUserApplicationAccess: (userId: string, params?: {
    appCode?: string;
    includePermissionDetails?: boolean;
  }) => api.get(`/user-sync/user/${userId}/access`, { params }),

  // Get application access summary
  getApplicationAccessSummary: () => 
    api.get('/user-sync/classification'),

  // Sync users to specific application
  syncUsersToApplication: (appCode: string, options?: {
    dryRun?: boolean;
    userIds?: string[];
    forceSync?: boolean;
  }) => api.post(`/user-sync/sync/application/${appCode}`, options),

  // Bulk sync all users to all applications
  bulkSyncAllUsers: (options?: {
    dryRun?: boolean;
  }) => api.post('/user-sync/sync/all', options),

  // Sync specific user to their applications
  syncUserToApplications: (userId: string, options?: {
    dryRun?: boolean;
    appCodes?: string[];
  }) => api.post(`/user-sync/sync/user/${userId}`, options)
}

// Invitation Management API
export const invitationAPI = {
  // Get all invitations for an organization (admin)
  getAdminInvitations: (orgCode: string) => 
    api.get(`/invitations/admin/${orgCode}`),

  // Create invitation for current tenant
  createInvitation: (data: { email: string; roleName: string }) => 
    api.post('/invitations/create', data),

  // Create test invitation
  createTestInvitation: (data: { orgCode: string; email: string; roleName: string }) => 
    api.post('/invitations/create-test-invitation', data),

  // Resend invitation email
  resendInvitation: (orgCode: string, invitationId: string) => 
    api.post(`/invitations/admin/${orgCode}/${invitationId}/resend`),

  // Cancel invitation
  cancelInvitation: (orgCode: string, invitationId: string) => 
    api.delete(`/invitations/admin/${orgCode}/${invitationId}`),

  // Get invitation details (public)
  getInvitationDetails: (org: string, email: string) => 
    api.get('/invitations/details', { params: { org, email } }),

  // Accept invitation (public)
  acceptInvitation: (data: { org: string; email: string; kindeUserId: string }) => 
    api.post('/invitations/accept', data)
}

export default api 