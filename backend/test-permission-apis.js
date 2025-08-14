#!/usr/bin/env node

/**
 * 🧪 PERMISSION API TESTING SCRIPT
 * Tests all permission-related APIs for CRM applications
 * 
 * Usage:
 * 1. Get a valid token from your main app
 * 2. Set the TOKEN and BASE_URL variables below
 * 3. Run: node test-permission-apis.js
 */

import axios from 'axios';
import chalk from 'chalk';

// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================================================

const BASE_URL = 'http://localhost:3000'; // or your production URL
const TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNjOmUyOmI1OjQwOmRkOmM4OjQzOjg3OjcwOmM3OjViOjhiOjFiOjYyOjRiOmI3IiwidHlwIjoiSldUIn0.eyJhdWQiOltdLCJhenAiOiI2NzdjNWY2ODFkYzE0YzhmYTFkNDJmYmFiNTUwYWViNiIsImV4cCI6MTc1NTE5MTkzMywiaWF0IjoxNzU1MTA1NTMzLCJpc3MiOiJodHRwczovL2F1dGguem9wa2l0LmNvbSIsImp0aSI6Ijc3NmY3MGRmLTdkMmQtNGYxYS05NmZjLTNiZjhlYWNkNjE5ZSIsIm9yZ19jb2RlIjoib3JnXzBlMzYxNTkyNWRiMWQiLCJwZXJtaXNzaW9ucyI6W10sInNjcCI6WyJlbWFpbCIsInByb2ZpbGUiLCJvcGVuaWQiLCJvZmZsaW5lIl0sInN1YiI6ImtwXzU2NDRmZDYzNWJmOTQ2YTI5MjA2OWUzNTcyNjM5ZTJiIn0.AUr82qTs4I8hQMI-q5B1N2KR18o0AiYfngJ4rNFEko_iEiOryQ1aDfL2VaTHg3MI-sjpf8xET4txwws7T-n8klqHkBdM-zBnm4PErZ7uv73qxIhtuU_CUmUzb_aYH5UhpmazLYQQrjXQlJMWj1_y2dveMeHhy1B8BmPAE8xY84o7YHSLe2suPY9UZRT1cfr7Z5gTLSGJvmj929FCpYt2M8xahcBXQ9z38PR6SSLDO90D-6y4ktcAxtydI8SLTWxyvWWfoxwYIQLLsur9pmTxKjh3Jlf6amlzW0-48cSMXX3B3bJIsKvqIUx539zhCzA1bU6Q7EWJsCl_RZZs3vQtiw';

// ============================================================================
// API TESTING FUNCTIONS
// ============================================================================

class PermissionAPITester {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.axios = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Helper to make API calls with error handling
  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: endpoint,
        ...(data && { data })
      };

      console.log(chalk.blue(`🔍 ${method.toUpperCase()} ${endpoint}`));
      
      const response = await this.axios(config);
      
      console.log(chalk.green(`✅ Success (${response.status})`));
      console.log(chalk.gray(`📊 Response size: ${JSON.stringify(response.data).length} chars`));
      
      return response.data;
    } catch (error) {
      console.log(chalk.red(`❌ Error (${error.response?.status || 'Network'})`));
      if (error.response?.data) {
        console.log(chalk.red(`   Message: ${error.response.data.message || error.response.data.error}`));
      }
      return null;
    }
  }

  // Test 1: Get Available Permissions (Complete Structure)
  async testGetAvailablePermissions() {
    console.log(chalk.yellow('\n🔐 TEST 1: Get Available Permissions'));
    console.log(chalk.gray('Purpose: Get complete permission structure for CRM'));
    
    const result = await this.makeRequest('GET', '/api/permissions/available');
    
    if (result?.success) {
      const { applications, summary } = result.data;
      
      console.log(chalk.green('\n📊 Permission Structure Summary:'));
      console.log(`   Applications: ${summary.applicationCount}`);
      console.log(`   Modules: ${summary.moduleCount}`);
      console.log(`   Operations: ${summary.operationCount}`);
      
      // Show CRM modules
      const crmApp = applications.find(app => app.appCode === 'crm');
      if (crmApp) {
        console.log(chalk.cyan('\n🏢 CRM Application Details:'));
        console.log(`   Name: ${crmApp.appName}`);
        console.log(`   Modules: ${crmApp.moduleCount}`);
        console.log(`   Operations: ${crmApp.operationCount}`);
        
        console.log(chalk.cyan('\n📦 CRM Modules:'));
        crmApp.modules.forEach(module => {
          console.log(`   • ${module.moduleName}: ${module.permissions?.length || 0} permissions`);
        });
      }
    }
    
    return result;
  }

  // Test 2: Get User's Applications & Modules
  async testGetUserApplications() {
    console.log(chalk.yellow('\n🔐 TEST 2: Get User Applications'));
    console.log(chalk.gray('Purpose: Get user\'s enabled applications with modules'));
    
    const result = await this.makeRequest('GET', '/api/permissions/applications');
    
    if (result?.success) {
      console.log(chalk.green('\n📱 User Applications:'));
      result.data.forEach(app => {
        console.log(`   • ${app.appName} (${app.appCode})`);
        console.log(`     Status: ${app.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`     Tier: ${app.subscriptionTier}`);
        console.log(`     Modules: ${app.modules?.length || 0}`);
      });
    }
    
    return result;
  }

  // Test 3: Get Permission Matrix
  async testGetPermissionMatrix() {
    console.log(chalk.yellow('\n🔐 TEST 3: Get Permission Matrix'));
    console.log(chalk.gray('Purpose: Get complete business suite permission matrix'));
    
    const result = await this.makeRequest('GET', '/api/permission-matrix/matrix');
    
    if (result?.success) {
      const { applications, summary } = result.data;
      
      console.log(chalk.green('\n📊 Permission Matrix Summary:'));
      console.log(`   Total Applications: ${summary.totalApplications}`);
      console.log(`   Total Modules: ${summary.totalModules}`);
      console.log(`   Total Permissions: ${summary.totalPermissions}`);
      
      // Show available applications
      console.log(chalk.cyan('\n🏢 Available Applications:'));
      if (Array.isArray(applications)) {
        applications.forEach(app => {
          console.log(`   • ${app.appName || app.name}: ${app.moduleCount || 'N/A'} modules`);
        });
      } else if (applications && typeof applications === 'object') {
        Object.keys(applications).forEach(appKey => {
          const app = applications[appKey];
          console.log(`   • ${app.appName || app.name}: ${Object.keys(app.modules || {}).length} modules`);
        });
      }
    }
    
    return result;
  }

  // Test 4: Get User Permission Context
  async testGetUserContext() {
    console.log(chalk.yellow('\n🔐 TEST 4: Get User Permission Context'));
    console.log(chalk.gray('Purpose: Get current user\'s complete permission context'));
    
    const result = await this.makeRequest('GET', '/api/permission-matrix/user-context');
    
    if (result?.success) {
      const { user, permissions, roles, accessLevel } = result.data;
      
      console.log(chalk.green('\n👤 User Context:'));
      console.log(`   User ID: ${user?.id || 'N/A'}`);
      console.log(`   Email: ${user?.email || 'N/A'}`);
      console.log(`   Access Level: ${accessLevel || 'N/A'}`);
      
      if (permissions) {
        console.log(chalk.cyan('\n🔑 User Permissions:'));
        console.log(`   Total Permissions: ${permissions.length || 0}`);
        
        // Group by application
        const appPermissions = {};
        permissions.forEach(perm => {
          const app = perm.appCode || 'unknown';
          if (!appPermissions[app]) appPermissions[app] = [];
          appPermissions[app].push(perm);
        });
        
        Object.entries(appPermissions).forEach(([app, perms]) => {
          console.log(`   • ${app.toUpperCase()}: ${perms.length} permissions`);
        });
      }
      
      if (roles) {
        console.log(chalk.cyan('\n👥 User Roles:'));
        roles.forEach(role => {
          console.log(`   • ${role.name}: ${role.description || 'No description'}`);
        });
      }
    }
    
    return result;
  }

  // Test 5: Check Specific Permission
  async testCheckSpecificPermission() {
    console.log(chalk.yellow('\n🔐 TEST 5: Check Specific Permission'));
    console.log(chalk.gray('Purpose: Check if user has specific CRM permission'));
    
    // Test common CRM permissions
    const crmPermissions = [
      'crm.leads.read',
      'crm.leads.create',
      'crm.contacts.read',
      'crm.contacts.create',
      'crm.deals.read',
      'crm.deals.create',
      'crm.analytics.view',
      'crm.settings.manage'
    ];
    
    console.log(chalk.cyan('\n🔍 Testing CRM Permissions:'));
    
    for (const permission of crmPermissions) {
      const result = await this.makeRequest('POST', '/api/permission-matrix/check-permission', {
        permission: permission
      });
      
      if (result?.success) {
        const status = result.data ? '✅ ALLOWED' : '❌ DENIED';
        console.log(`   ${permission}: ${status}`);
      } else {
        console.log(`   ${permission}: ❌ ERROR`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Test 6: Get User Permissions by User ID
  async testGetUserPermissions() {
    console.log(chalk.yellow('\n🔐 TEST 6: Get User Permissions by User ID'));
    console.log(chalk.gray('Purpose: Get specific user\'s permissions across all applications'));
    
    // First get user context to get current user ID
    const userContext = await this.makeRequest('GET', '/api/permission-matrix/user-context');
    
    if (userContext?.success && userContext.data?.user?.id) {
      const userId = userContext.data.user.id;
      console.log(chalk.cyan(`\n👤 Getting permissions for user: ${userId}`));
      
      const result = await this.makeRequest('GET', `/api/permissions/users/${userId}/permissions`);
      
      if (result?.success) {
        console.log(chalk.green('\n🔑 User Permissions:'));
        console.log(`   Total Permission Records: ${result.data.length}`);
        
        // Group by application
        const appPermissions = {};
        result.data.forEach(perm => {
          const app = perm.appCode || 'unknown';
          if (!appPermissions[app]) appPermissions[app] = [];
          appPermissions[app].push(perm);
        });
        
        Object.entries(appPermissions).forEach(([app, perms]) => {
          console.log(`   • ${app.toUpperCase()}: ${perms.length} modules`);
          perms.forEach(perm => {
            console.log(`     - ${perm.moduleName}: ${perm.permissions?.length || 0} permissions`);
          });
        });
      }
    } else {
      console.log(chalk.red('❌ Could not get user ID from context'));
    }
  }

  // Test 7: Test CRM Integration Endpoints
  async testCRMIntegration() {
    console.log(chalk.yellow('\n🔐 TEST 7: Test CRM Integration Endpoints'));
    console.log(chalk.gray('Purpose: Test direct CRM app access and API proxy'));
    
    // Test direct app access
    console.log(chalk.cyan('\n🚀 Testing Direct CRM App Access:'));
    const appAccess = await this.makeRequest('GET', '/api/enhanced-crm-integration/app/crm');
    
    if (appAccess) {
      console.log(chalk.green('✅ CRM app access endpoint responded'));
    }
    
    // Test API proxy
    console.log(chalk.cyan('\n🔗 Testing CRM API Proxy:'));
    const proxyTest = await this.makeRequest('GET', '/api/enhanced-crm-integration/api/crm/test');
    
    if (proxyTest) {
      console.log(chalk.green('✅ CRM API proxy endpoint responded'));
    }
  }

  // Run all tests
  async runAllTests() {
    console.log(chalk.bold.blue('\n🚀 STARTING PERMISSION API TESTS'));
    console.log(chalk.gray(`Base URL: ${this.baseUrl}`));
    console.log(chalk.gray(`Token: ${this.token.substring(0, 20)}...`));
    
    const startTime = Date.now();
    
    try {
      await this.testGetAvailablePermissions();
      await this.testGetUserApplications();
      await this.testGetPermissionMatrix();
      await this.testGetUserContext();
      await this.testCheckSpecificPermission();
      await this.testGetUserPermissions();
      await this.testCRMIntegration();
      
      const duration = Date.now() - startTime;
      console.log(chalk.bold.green(`\n✅ ALL TESTS COMPLETED IN ${duration}ms`));
      
    } catch (error) {
      console.log(chalk.bold.red(`\n❌ TESTS FAILED: ${error.message}`));
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  // Check if token is set
  if (TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log(chalk.red('❌ ERROR: Please set the TOKEN variable in the script'));
    console.log(chalk.yellow('📝 Instructions:'));
    console.log('1. Get a valid JWT token from your main application');
    console.log('2. Update the TOKEN variable in this script');
    console.log('3. Run the script again');
    process.exit(1);
  }
  
  // Check if base URL is set
  if (!BASE_URL) {
    console.log(chalk.red('❌ ERROR: Please set the BASE_URL variable'));
    process.exit(1);
  }
  
  const tester = new PermissionAPITester(BASE_URL, TOKEN);
  await tester.runAllTests();
}

// Run the script
main().catch(console.error);
