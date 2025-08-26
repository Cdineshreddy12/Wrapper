/**
 * 🧪 **COMPREHENSIVE USER APPLICATION ACCESS TEST**
 * Test the complete user-application access system with sync functionality
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config();

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:8787';
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'test-tenant-123';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const header = (title) => {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`${title.toUpperCase()}`, 'bold');
  log(`${'='.repeat(60)}`, 'blue');
};

async function testAPI(endpoint, options = {}) {
  try {
    log(`\n🔍 Testing: ${endpoint}`, 'yellow');
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TEST_TENANT_ID,
        ...options.headers
      },
      ...options
    });

    const result = await response.json();
    
    if (response.ok) {
      log(`✅ Success: ${response.status}`, 'green');
      if (result.data) {
        log(`📊 Data summary: ${JSON.stringify({
          type: Array.isArray(result.data) ? 'array' : typeof result.data,
          count: Array.isArray(result.data) ? result.data.length : Object.keys(result.data || {}).length
        }, null, 2)}`, 'blue');
      }
      return { success: true, data: result.data, message: result.message };
    } else {
      log(`❌ Error: ${response.status} - ${result.error || result.message}`, 'red');
      return { success: false, error: result.error || result.message };
    }
  } catch (error) {
    log(`💥 Request failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  header('COMPREHENSIVE USER APPLICATION ACCESS SYSTEM TEST');
  
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    results: []
  };

  const tests = [
    {
      name: 'Get All Users with Application Access',
      endpoint: '/api/user-applications/users',
      options: { method: 'GET' }
    },
    {
      name: 'Get Application Access Summary',
      endpoint: '/api/user-applications/summary',
      options: { method: 'GET' }
    },
    {
      name: 'Test Dry Run Sync to CRM',
      endpoint: '/api/user-applications/sync/crm',
      options: {
        method: 'POST',
        body: JSON.stringify({ dryRun: true })
      }
    },
    {
      name: 'Test Bulk Dry Run Sync',
      endpoint: '/api/user-applications/sync/bulk',
      options: {
        method: 'POST',
        body: JSON.stringify({ dryRun: true })
      }
    },
    {
      name: 'Get User Classification',
      endpoint: '/api/user-sync/classification',
      options: { method: 'GET' }
    },
    {
      name: 'Get Sync Status',
      endpoint: '/api/user-sync/status',
      options: { method: 'GET' }
    },
    {
      name: 'Test Application Connectivity',
      endpoint: '/api/user-sync/test-connectivity',
      options: {
        method: 'POST',
        body: JSON.stringify({ applications: ['crm', 'hr'] })
      }
    }
  ];

  // Run each test
  for (const test of tests) {
    testResults.total++;
    log(`\n${'─'.repeat(40)}`, 'blue');
    log(`Test ${testResults.total}: ${test.name}`, 'bold');
    
    const result = await testAPI(test.endpoint, test.options);
    
    testResults.results.push({
      name: test.name,
      endpoint: test.endpoint,
      success: result.success,
      data: result.data,
      error: result.error
    });
    
    if (result.success) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }
  }

  // Test specific user scenarios if we have users
  const usersResult = testResults.results.find(r => r.name.includes('Get All Users'));
  if (usersResult && usersResult.success && usersResult.data && usersResult.data.length > 0) {
    const testUser = usersResult.data[0];
    
    header('USER-SPECIFIC TESTS');
    
    const userTests = [
      {
        name: `Get Application Access for User: ${testUser.email}`,
        endpoint: `/api/user-applications/users/${testUser.userId}`,
        options: { method: 'GET' }
      },
      {
        name: `Test User Sync for: ${testUser.email}`,
        endpoint: `/api/user-applications/sync/user/${testUser.userId}`,
        options: {
          method: 'POST',
          body: JSON.stringify({ dryRun: true })
        }
      }
    ];

    for (const test of userTests) {
      testResults.total++;
      log(`\n${'─'.repeat(40)}`, 'blue');
      log(`Test ${testResults.total}: ${test.name}`, 'bold');
      
      const result = await testAPI(test.endpoint, test.options);
      
      testResults.results.push({
        name: test.name,
        endpoint: test.endpoint,
        success: result.success,
        data: result.data,
        error: result.error
      });
      
      if (result.success) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    }
  }

  // Print final results
  header('TEST RESULTS SUMMARY');
  
  log(`\n📊 Overall Results:`, 'bold');
  log(`   Total Tests: ${testResults.total}`, 'blue');
  log(`   Passed: ${testResults.passed}`, 'green');
  log(`   Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`   Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`, 
      testResults.failed === 0 ? 'green' : 'yellow');

  if (testResults.failed > 0) {
    log(`\n❌ Failed Tests:`, 'red');
    testResults.results
      .filter(r => !r.success)
      .forEach(r => {
        log(`   • ${r.name}: ${r.error}`, 'red');
      });
  }

  log(`\n✅ Successful Tests:`, 'green');
  testResults.results
    .filter(r => r.success)
    .forEach(r => {
      log(`   • ${r.name}`, 'green');
    });

  // Application-specific insights
  const summaryResult = testResults.results.find(r => r.name.includes('Summary'));
  if (summaryResult && summaryResult.success && summaryResult.data) {
    header('SYSTEM INSIGHTS');
    
    const summary = summaryResult.data;
    log(`\n🏢 Organization Statistics:`, 'bold');
    log(`   Total Users: ${summary.totalUsers}`, 'blue');
    log(`   Enabled Applications: ${summary.enabledApplications}`, 'blue');
    log(`   Users with Access: ${summary.usersWithAccess}`, 'green');
    log(`   Users without Access: ${summary.usersWithoutAccess}`, 'yellow');
    
    if (summary.applicationUsage && summary.applicationUsage.length > 0) {
      log(`\n📱 Application Usage:`, 'bold');
      summary.applicationUsage.forEach(app => {
        const percentage = summary.totalUsers > 0 ? 
          Math.round((app.userCount / summary.totalUsers) * 100) : 0;
        log(`   ${app.appName}: ${app.userCount} users (${percentage}%)`, 'blue');
      });
    }
  }

  const classificationResult = testResults.results.find(r => r.name.includes('Classification'));
  if (classificationResult && classificationResult.success && classificationResult.data) {
    log(`\n🔍 User Classification:`, 'bold');
    const classification = classificationResult.data;
    if (classification.summary) {
      log(`   Total Users Classified: ${classification.summary.totalUsers}`, 'blue');
      if (classification.summary.applicationBreakdown) {
        Object.entries(classification.summary.applicationBreakdown).forEach(([app, count]) => {
          log(`   ${app.toUpperCase()}: ${count} users`, 'blue');
        });
      }
    }
  }

  log(`\n${'='.repeat(60)}`, 'blue');
  log(`🎉 TEST COMPLETED`, 'bold');
  log(`${'='.repeat(60)}`, 'blue');

  return testResults;
}

// Run the tests
runTests()
  .then(results => {
    process.exit(results.failed === 0 ? 0 : 1);
  })
  .catch(error => {
    log(`💥 Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  });
