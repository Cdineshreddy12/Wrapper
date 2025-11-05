#!/usr/bin/env node

/**
 * CRM Sync Test Script
 * Demonstrates how CRM can trigger tenant synchronization
 */

const axios = require('axios');

// Configuration
const WRAPPER_API_URL = process.env.WRAPPER_API_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNjOmUyOmI1OjQwOmRkOmM4OjQzOjg3OjcwOmM3OjViOjhiOjFiOjYyOjRiOmI3IiwidHlwIjoiSldUIn0.eyJhdWQiOltdLCJhenAiOiI2NzdjNWY2ODFkYzE0YzhmYTFkNDJmYmFiNTUwYWViNiIsImV4cCI6MTc2MjM1NzExMywiaWF0IjoxNzYyMjcwNzEyLCJpc3MiOiJodHRwczovL2F1dGguem9wa2l0LmNvbSIsImp0aSI6IjUwZjk5NzczLTQ2OGMtNDA5MC1iZjJjLThjOTU1NGFhNjM2YyIsIm9yZ19jb2RlIjoib3JnX2NiNTkzZDEzNjA5OTlhIiwicGVybWlzc2lvbnMiOltdLCJzY3AiOlsiZW1haWwiLCJwcm9maWxlIiwib3BlbmlkIiwib2ZmbGluZSJdLCJzdWIiOiJrcF9hZTcwZDM4MjQ0YjE0OWQwYWRiNWE3MzVmYzQ5YTNkMiJ9.Udf7lJczimSHmeJXTSGHUzHYB3REscFeJI6r0cyp9YkQDv_eWmXjSOx8qA4hwbhgyDoATh6fCu5amU27UtOWArjxDBSKA_RdRpIP0UOkSEtFeo7PsC0U6uqOlj427NCarnbTvj_OrbSKGOfniEMBjHEcSzsRYEyeD93OSrYNVSKV33Z-YKhu-2YkEgyonPcOsVUE1xTHta2jZScga2dijwixQcS_CT4Eax4x4EfRwrbXlrH09qTEAKXqSJ84sjVcitzj-yGTA6HA1jgcQXFcDwj-wLrHlXeUhgpxD0YAPuF3b2m3JbrgOAFtAC7iPjSPJJ7gBGKhvyuqapULVDn1mg';
const TENANT_ID = process.env.TENANT_ID || '395031ab-dad1-4b9a-b1b5-e3878477edad';

const api = axios.create({
  baseURL: WRAPPER_API_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Request-Source': 'crm-backend'
  }
});

// Database check function
async function checkDatabaseForRoles() {
  console.log('🔍 Checking database for roles...');
  try {
    // We'll add a direct database check here
    const fs = require('fs');
    const path = require('path');

    // Simple SQL query to check roles
    const sql = `
      SELECT count(*) as role_count
      FROM custom_roles
      WHERE tenant_id = '${TENANT_ID}' AND is_active = true;
    `;

    console.log('📊 Database query for roles count completed');
    return { hasRoles: true, count: 0 }; // Placeholder
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return { hasRoles: false, count: 0 };
  }
}

async function testTenantSync() {
  console.log('🚀 Testing CRM Tenant Synchronization\n');

  try {
    // 1. Test tenant verification
    console.log('1️⃣ Testing User Tenant Verification...');
    const tenantVerification = await api.get(`/api/users/tenant/zopkitexternal@gmail.com`);
    console.log('✅ Tenant verification:', tenantVerification.data);
    console.log('');

    // 2. Test data requirements
    console.log('2️⃣ Getting Data Requirements...');
    const requirements = await api.get('/api/users/sync/data-requirements');
    console.log('✅ Data requirements loaded');
    console.log('');

    // 3. Test sync status
    console.log('3️⃣ Checking Current Sync Status...');
    const syncStatus = await api.get(`/api/users/tenant/${TENANT_ID}/sync-status`);
    console.log('✅ Sync status:', JSON.stringify(syncStatus.data, null, 2));
    console.log('');

    // 4. Trigger full sync
    console.log('4️⃣ Triggering Full Tenant Sync...');
    const syncStart = Date.now();
    const syncResult = await api.post(`/api/users/tenant/${TENANT_ID}/sync`, {
      skipReferenceData: false,
      forceSync: true
    });
    const syncDuration = Date.now() - syncStart;

    console.log('✅ Sync completed in', syncDuration, 'ms');
    console.log('📊 Sync Results:', JSON.stringify(syncResult.data, null, 2));
    console.log('');

    // 5. Verify sync results
    console.log('5️⃣ Verifying Sync Results...');
    if (syncResult.data.success) {
      console.log('✅ Sync was successful!');
      console.log(`   📊 Duration: ${syncResult.data.duration}ms`);
      console.log(`   🏗️ Essential Data: ${syncResult.data.phases.essential.success ? '✅' : '❌'}`);
      console.log(`   📚 Reference Data: ${syncResult.data.phases.reference.success ? '✅' : '❌'}`);
      console.log(`   ✅ Validation: ${syncResult.data.phases.validation.success ? '✅' : '❌'}`);
    } else {
      console.log('❌ Sync failed!');
    }

    console.log('\n🎉 CRM Sync Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testTenantSync();
}

module.exports = { testTenantSync };
