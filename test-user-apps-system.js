#!/usr/bin/env node

/**
 * 🧪 **USER APPLICATION ACCESS SYSTEM TEST**
 * Quick test to verify the enhanced user-application access system
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config();

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

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

async function testEndpoint(endpoint, description) {
  try {
    log(`\n🔍 Testing: ${description}`, 'yellow');
    log(`   URL: ${BASE_URL}${endpoint}`, 'blue');
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      log(`✅ ${response.status} - Endpoint accessible`, 'green');
      const data = await response.json();
      log(`📊 Response type: ${Array.isArray(data) ? 'array' : typeof data}`, 'blue');
      return { success: true, status: response.status, data };
    } else {
      const errorData = await response.json().catch(() => ({}));
      log(`❌ ${response.status} - ${errorData.error || errorData.message || 'Unknown error'}`, 'red');
      return { success: false, status: response.status, error: errorData };
    }
  } catch (error) {
    log(`💥 Request failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  header('USER APPLICATION ACCESS SYSTEM TEST');
  
  log('🎯 Testing enhanced user-application access management system', 'blue');
  log(`📡 Backend URL: ${BASE_URL}`, 'blue');
  
  const tests = [
    {
      endpoint: '/api/health',
      description: 'Backend Health Check'
    },
    {
      endpoint: '/api/user-sync/classification',
      description: 'User Classification API'
    },
    {
      endpoint: '/api/user-sync/status',
      description: 'Sync Status API'
    },
    {
      endpoint: '/api/user-applications/users',
      description: 'User Application Access API'
    },
    {
      endpoint: '/api/user-applications/summary',
      description: 'Application Access Summary API'
    }
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.description);
    results.push({ ...test, ...result });
  }

  // Summary
  header('TEST RESULTS SUMMARY');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log(`\n📊 Results:`, 'bold');
  log(`   Total Tests: ${results.length}`, 'blue');
  log(`   Successful: ${successful}`, successful > 0 ? 'green' : 'red');
  log(`   Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`   Success Rate: ${Math.round((successful / results.length) * 100)}%`, 
      failed === 0 ? 'green' : 'yellow');

  if (successful > 0) {
    log(`\n✅ Working Endpoints:`, 'green');
    results
      .filter(r => r.success)
      .forEach(r => log(`   • ${r.description} (${r.status})`, 'green'));
  }

  if (failed > 0) {
    log(`\n❌ Failed Endpoints:`, 'red');
    results
      .filter(r => !r.success)
      .forEach(r => {
        const reason = r.status === 401 ? 'Authentication Required' : 
                     r.status === 404 ? 'Endpoint Not Found' :
                     r.error?.error || r.error || 'Unknown Error';
        log(`   • ${r.description}: ${reason}`, 'red');
      });
  }

  // Recommendations
  header('RECOMMENDATIONS');
  
  if (failed === 0) {
    log('🎉 All endpoints are working! Your system is ready to use.', 'green');
  } else {
    log('🔧 To fix issues:', 'yellow');
    
    if (results.some(r => r.error?.includes?.('ECONNREFUSED'))) {
      log('   1. Start the backend server: npm run dev', 'yellow');
    }
    
    if (results.some(r => r.status === 401)) {
      log('   2. Ensure proper authentication tokens are set', 'yellow');
    }
    
    if (results.some(r => r.status === 404)) {
      log('   3. Check that all API routes are properly registered', 'yellow');
    }
  }

  log(`\n🌐 Frontend should connect to: ${BASE_URL}`, 'blue');
  log('📱 Access the enhanced User Apps interface at: /dashboard/user-apps', 'blue');
  log('🎯 Click on "Sync Management" tab for comprehensive features', 'blue');
  
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`🏁 TEST COMPLETED`, 'bold');
  log(`${'='.repeat(60)}`, 'blue');

  process.exit(failed === 0 ? 0 : 1);
}

main().catch(error => {
  log(`💥 Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
