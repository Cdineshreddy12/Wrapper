#!/usr/bin/env node

/**
 * Test all Wrapper CRM Sync endpoints to identify issues
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNjOmUyOmI1OjQwOmRkOmM4OjQzOjg3OjcwOmM3OjViOjhiOjFiOjYyOjRiOmI3IiwidHlwIjoiSldUIn0.eyJhdWQiOltdLCJhenAiOiI2NzdjNWY2ODFkYzE0YzhmYTFkNDJmYmFiNTUwYWViNiIsImV4cCI6MTc1OTU1MDEyMSwiaWF0IjoxNzU5NDYzNzIxLCJpc3MiOiJodHRwczovL2F1dGguem9wa2l0LmNvbSIsImp0aSI6ImQ1NzJkNGM3LTM3NTEtNDNjYS05NzYyLTJjMDM3MGQ2OWIxMCIsIm9yZ19jb2RlIjoib3JnX2NiNTkzZDEzNjA5OTlhIiwicGVybWlzc2lvbnMiOltdLCJzY3AiOlsiZW1haWwiLCJwcm9maWxlIiwib3BlbmlkIiwib2ZmbGluZSJdLCJzdWIiOiJrcF9hZTcwZDM4MjQ0YjE0OWQwYWRiNWE3MzVmYzQ5YTNkMiJ9.h8J85MZaukNDgJILa3_SDqCXCozAams9cRnbkRtXUICrXTj-wsBTZtERHMlSPKsv1XSyaJ2IUy8cByjgSiyqG8JDkRHFhLS3UFIxYrJGLltNZ-NIKsv-Y72kJ2f2pO5ibmQD3z_frcSebGkwIDF5KddX13MNgWOKi5PjDzJeg0EWXp1TmJlPqdZ46GJR6yoCayRD-ZbZ2ZmU06aGHIuzbFF-pQYjKmmu1-7ZMnziv-UwBQcq9KSeizqB5wImdPnxubtCb4ysaj7p_LDaxEl9AczuYK8OKpI-mN1IJGNvKC4To5CjpsQp9FRTNJkLcsodJ0w7Jp9B3Eualz13XwnjTw';
const TENANT_ID = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function testEndpoint(method, endpoint, description) {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.success) {
      logSuccess(`${description}: ✅ Working (${response.data.data?.length || response.data.pagination?.total || 'OK'} records)`);
      return { success: true, data: response.data };
    } else {
      logError(`${description}: ❌ Failed - ${response.data.error}`);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
    logError(`${description}: ❌ Error - ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

async function testAllEndpoints() {
  logSection('🚀 Testing All Wrapper CRM Sync Endpoints');

  const endpoints = [
    // Sync Management
    { method: 'GET', endpoint: '/api/wrapper/data-requirements', desc: 'Data Requirements' },
    { method: 'GET', endpoint: `/api/wrapper/tenants/${TENANT_ID}/sync/status`, desc: 'Sync Status' },
    { method: 'POST', endpoint: `/api/wrapper/tenants/${TENANT_ID}/sync?skipReferenceData=true&forceSync=true`, desc: 'Trigger Sync' },

    // Essential Data
    { method: 'GET', endpoint: `/api/wrapper/tenants/${TENANT_ID}`, desc: 'Tenant Info' },
    { method: 'GET', endpoint: `/api/wrapper/tenants/${TENANT_ID}/users`, desc: 'User Profiles' },
    { method: 'GET', endpoint: `/api/wrapper/tenants/${TENANT_ID}/organizations`, desc: 'Organizations' },

    // Reference Data
    { method: 'GET', endpoint: `/api/wrapper/tenants/${TENANT_ID}/tenant-users`, desc: 'Detailed Users' },
    { method: 'GET', endpoint: `/api/wrapper/tenants/${TENANT_ID}/roles`, desc: 'Role Definitions' },
    { method: 'GET', endpoint: `/api/wrapper/tenants/${TENANT_ID}/credit-configs`, desc: 'Credit Configurations' },
    { method: 'GET', endpoint: `/api/wrapper/tenants/${TENANT_ID}/entity-credits`, desc: 'Entity Credits' },
    { method: 'GET', endpoint: `/api/wrapper/tenants/${TENANT_ID}/employee-assignments`, desc: 'Employee Assignments' },
    { method: 'GET', endpoint: `/api/wrapper/tenants/${TENANT_ID}/role-assignments`, desc: 'Role Assignments' }
  ];

  const results = {};

  for (const endpoint of endpoints) {
    results[endpoint.desc] = await testEndpoint(endpoint.method, endpoint.endpoint, endpoint.desc);
  }

  // Summary
  logSection('📊 Test Summary');

  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;

  log(`Overall: ${successful}/${total} endpoints working (${Math.round(successful/total*100)}%)`);

  if (successful === total) {
    logSuccess('🎉 All endpoints are working perfectly!');
  } else if (successful > total * 0.8) {
    logWarning('⚠️ Most endpoints are working, some issues detected');
  } else {
    logError('❌ Multiple endpoints have issues');
  }

  // Show which ones are failing
  const failing = Object.entries(results).filter(([name, result]) => !result.success);
  if (failing.length > 0) {
    logWarning('Failing endpoints:');
    failing.forEach(([name, result]) => {
      log(`  - ${name}: ${result.error}`, colors.yellow);
    });
  }

  return results;
}

// Run the tests
testAllEndpoints().catch(console.error);
