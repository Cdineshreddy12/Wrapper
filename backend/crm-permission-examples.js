/**
 * 🏢 CRM PERMISSION API EXAMPLES
 * Exact examples of how to call permission APIs for CRM applications
 * 
 * This script shows the exact API calls your CRM app should make
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_CONFIG = {
  baseURL: 'https://your-backend.zopkit.com', // Update this to your backend URL
  headers: {
    'Content-Type': 'application/json'
  }
};

// ============================================================================
// API CALL EXAMPLES FOR CRM APPLICATIONS
// ============================================================================

/**
 * 🔑 EXAMPLE 1: Get Complete Permission Structure
 * Use this when your CRM app starts to understand available permissions
 */
async function getAvailablePermissions(token) {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/api/permissions/available`, {
      method: 'GET',
      headers: {
        ...API_CONFIG.headers,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Available permissions retrieved');
      console.log(`📊 Applications: ${data.data.summary.applicationCount}`);
      console.log(`📦 Modules: ${data.data.summary.moduleCount}`);
      console.log(`⚡ Operations: ${data.data.summary.operationCount}`);
      
      // Find CRM application
      const crmApp = data.data.applications.find(app => app.appCode === 'crm');
      if (crmApp) {
        console.log(`🏢 CRM: ${crmApp.moduleCount} modules, ${crmApp.operationCount} operations`);
      }
      
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to get permissions');
    }
  } catch (error) {
    console.error('❌ Error getting available permissions:', error.message);
    throw error;
  }
}

/**
 * 👤 EXAMPLE 2: Get User's Permission Context
 * Use this to get current user's permissions when CRM app loads
 */
async function getUserPermissionContext(token) {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/api/permission-matrix/user-context`, {
      method: 'GET',
      headers: {
        ...API_CONFIG.headers,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      const { user, permissions, roles, accessLevel } = data.data;
      
      console.log('✅ User permission context retrieved');
      console.log(`👤 User: ${user.email}`);
      console.log(`🔑 Access Level: ${accessLevel}`);
      console.log(`🔐 Total Permissions: ${permissions?.length || 0}`);
      console.log(`👥 Total Roles: ${roles?.length || 0}`);
      
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to get user context');
    }
  } catch (error) {
    console.error('❌ Error getting user context:', error.message);
    throw error;
  }
}

/**
 * 🔍 EXAMPLE 3: Check Specific Permission
 * Use this before allowing user to perform actions
 */
async function checkPermission(token, permission) {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/api/permission-matrix/check-permission`, {
      method: 'POST',
      headers: {
        ...API_CONFIG.headers,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ permission })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      const hasPermission = data.data;
      console.log(`🔍 Permission ${permission}: ${hasPermission ? '✅ ALLOWED' : '❌ DENIED'}`);
      return hasPermission;
    } else {
      throw new Error(data.message || 'Failed to check permission');
    }
  } catch (error) {
    console.error(`❌ Error checking permission ${permission}:`, error.message);
    throw error;
  }
}

/**
 * 📱 EXAMPLE 4: Get User's Enabled Applications
 * Use this to show user which apps they can access
 */
async function getUserApplications(token) {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/api/permissions/applications`, {
      method: 'GET',
      headers: {
        ...API_CONFIG.headers,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ User applications retrieved');
      data.data.forEach(app => {
        console.log(`📱 ${app.appName}: ${app.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   Tier: ${app.subscriptionTier}, Modules: ${app.modules?.length || 0}`);
      });
      
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to get applications');
    }
  } catch (error) {
    console.error('❌ Error getting user applications:', error.message);
    throw error;
  }
}

/**
 * 🚀 EXAMPLE 5: Get Direct CRM App Access
 * Use this to redirect user to CRM with unified token
 */
async function getCRMAppAccess(token) {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/api/enhanced-crm-integration/app/crm`, {
      method: 'GET',
      headers: {
        ...API_CONFIG.headers,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // This endpoint returns a redirect URL
    const redirectUrl = response.url;
    console.log('✅ CRM app access URL generated');
    console.log(`🔗 Redirect URL: ${redirectUrl}`);
    
    return redirectUrl;
  } catch (error) {
    console.error('❌ Error getting CRM app access:', error.message);
    throw error;
  }
}

// ============================================================================
// CRM-SPECIFIC PERMISSION CHECKS
// ============================================================================

/**
 * 🏢 CRM Permission Checker Class
 * Use this in your CRM application for permission management
 */
class CRMPermissionChecker {
  constructor(token) {
    this.token = token;
    this.baseURL = API_CONFIG.baseURL;
  }

  /**
   * Check if user can read leads
   */
  async canReadLeads() {
    return await checkPermission(this.token, 'crm.leads.read');
  }

  /**
   * Check if user can create leads
   */
  async canCreateLeads() {
    return await checkPermission(this.token, 'crm.leads.create');
  }

  /**
   * Check if user can read contacts
   */
  async canReadContacts() {
    return await checkPermission(this.token, 'crm.contacts.read');
  }

  /**
   * Check if user can create contacts
   */
  async canCreateContacts() {
    return await checkPermission(this.token, 'crm.contacts.create');
  }

  /**
   * Check if user can read deals
   */
  async canReadDeals() {
    return await checkPermission(this.token, 'crm.deals.read');
  }

  /**
   * Check if user can create deals
   */
  async canCreateDeals() {
    return await checkPermission(this.token, 'crm.deals.create');
  }

  /**
   * Check if user can view analytics
   */
  async canViewAnalytics() {
    return await checkPermission(this.token, 'crm.analytics.view');
  }

  /**
   * Check if user can manage settings
   */
  async canManageSettings() {
    return await checkPermission(this.token, 'crm.settings.manage');
  }

  /**
   * Get all user permissions for CRM
   */
  async getCRMPermissions() {
    try {
      const userContext = await getUserPermissionContext(this.token);
      
      // Filter for CRM permissions only
      const crmPermissions = userContext.permissions?.filter(perm => 
        perm.appCode === 'crm' || perm.permission?.startsWith('crm.')
      ) || [];
      
      return crmPermissions;
    } catch (error) {
      console.error('❌ Error getting CRM permissions:', error.message);
      return [];
    }
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * 📝 HOW TO USE IN YOUR CRM APPLICATION
 */

// Example 1: Initialize permission checker
async function initializeCRMPermissions(token) {
  console.log('🚀 Initializing CRM permissions...');
  
  try {
    // Get available permissions structure
    const permissions = await getAvailablePermissions(token);
    
    // Get user's specific permissions
    const userContext = await getUserPermissionContext(token);
    
    // Create permission checker
    const permissionChecker = new CRMPermissionChecker(token);
    
    console.log('✅ CRM permissions initialized successfully');
    
    return {
      permissions,
      userContext,
      permissionChecker
    };
  } catch (error) {
    console.error('❌ Failed to initialize CRM permissions:', error.message);
    throw error;
  }
}

// Example 2: Check permissions before actions
async function handleLeadCreation(token) {
  const permissionChecker = new CRMPermissionChecker(token);
  
  try {
    // Check if user can create leads
    const canCreate = await permissionChecker.canCreateLeads();
    
    if (canCreate) {
      console.log('✅ User can create leads - proceeding...');
      // Your lead creation logic here
      return true;
    } else {
      console.log('❌ User cannot create leads - access denied');
      // Show access denied message
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking lead creation permission:', error.message);
    return false;
  }
}

// Example 3: Show/hide UI elements based on permissions
async function setupCRMUI(token) {
  const permissionChecker = new CRMPermissionChecker(token);
  
  try {
    // Check various permissions
    const permissions = await Promise.all([
      permissionChecker.canCreateLeads(),
      permissionChecker.canCreateContacts(),
      permissionChecker.canCreateDeals(),
      permissionChecker.canViewAnalytics(),
      permissionChecker.canManageSettings()
    ]);
    
    const [canCreateLeads, canCreateContacts, canCreateDeals, canViewAnalytics, canManageSettings] = permissions;
    
    // Update UI based on permissions
    console.log('🔧 Setting up CRM UI based on permissions:');
    console.log(`   Create Leads Button: ${canCreateLeads ? '✅ Show' : '❌ Hide'}`);
    console.log(`   Create Contacts Button: ${canCreateContacts ? '✅ Show' : '❌ Hide'}`);
    console.log(`   Create Deals Button: ${canCreateDeals ? '✅ Show' : '❌ Hide'}`);
    console.log(`   Analytics Tab: ${canViewAnalytics ? '✅ Show' : '❌ Hide'}`);
    console.log(`   Settings Menu: ${canManageSettings ? '✅ Show' : '❌ Hide'}`);
    
    return {
      canCreateLeads,
      canCreateContacts,
      canCreateDeals,
      canViewAnalytics,
      canManageSettings
    };
  } catch (error) {
    console.error('❌ Error setting up CRM UI:', error.message);
    return {};
  }
}

// ============================================================================
// EXPORT FOR USE IN OTHER FILES
// ============================================================================

export {
  getAvailablePermissions,
  getUserPermissionContext,
  checkPermission,
  getUserApplications,
  getCRMAppAccess,
  CRMPermissionChecker,
  initializeCRMPermissions,
  handleLeadCreation,
  setupCRMUI
};

// ============================================================================
// DEMO FUNCTION (for testing)
// ============================================================================

/**
 * 🧪 DEMO: Test all CRM permission APIs
 * Run this to test the APIs (requires valid token)
 */
async function demoCRMPermissions(token) {
  if (!token || token === 'YOUR_TOKEN_HERE') {
    console.log('❌ Please provide a valid token to run the demo');
    return;
  }

  console.log('🚀 DEMO: Testing CRM Permission APIs\n');

  try {
    // Test 1: Get available permissions
    console.log('📋 Test 1: Getting available permissions...');
    await getAvailablePermissions(token);
    console.log('');

    // Test 2: Get user context
    console.log('👤 Test 2: Getting user permission context...');
    await getUserPermissionContext(token);
    console.log('');

    // Test 3: Check specific permissions
    console.log('🔍 Test 3: Checking specific CRM permissions...');
    await checkPermission(token, 'crm.leads.read');
    await checkPermission(token, 'crm.leads.create');
    console.log('');

    // Test 4: Get user applications
    console.log('📱 Test 4: Getting user applications...');
    await getUserApplications(token);
    console.log('');

    // Test 5: CRM permission checker
    console.log('🏢 Test 5: Testing CRM permission checker...');
    const checker = new CRMPermissionChecker(token);
    const canReadLeads = await checker.canReadLeads();
    const canCreateLeads = await checker.canCreateLeads();
    
    console.log(`   Can read leads: ${canReadLeads ? '✅ Yes' : '❌ No'}`);
    console.log(`   Can create leads: ${canCreateLeads ? '✅ Yes' : '❌ No'}`);
    console.log('');

    // Test 6: Setup CRM UI
    console.log('🔧 Test 6: Setting up CRM UI...');
    await setupCRMUI(token);
    console.log('');

    console.log('✅ DEMO COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ DEMO FAILED:', error.message);
  }
}

// Uncomment to run demo (requires valid token)
// demoCRMPermissions('YOUR_TOKEN_HERE');
