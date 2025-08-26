#!/usr/bin/env node

/**
 * 🧪 **USER APPLICATION ACCESS TEST**
 * Test script for user application access and sync functionality
 */

import 'dotenv/config';
import { UserApplicationService } from './src/services/user-application-service.js';

const userAppService = new UserApplicationService();

async function testUserApplicationAccess() {
  console.log('🧪 Testing User Application Access Service...\n');

  try {
    // You'll need to replace this with an actual tenant ID from your database
    const testTenantId = 'your-tenant-id-here';
    
    console.log('📊 1. Getting application access summary...');
    const summary = await userAppService.getApplicationAccessSummary(testTenantId);
    console.log('Summary:', JSON.stringify(summary, null, 2));

    console.log('\n👥 2. Getting all users with application access...');
    const users = await userAppService.getUsersWithApplicationAccess(testTenantId, {
      includeInactive: false,
      includePermissionDetails: true
    });
    
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
      console.log(`    Applications: ${user.totalApplications}`);
      console.log(`    Has Access: ${user.hasAnyAccess}`);
      if (user.applicationAccess.length > 0) {
        user.applicationAccess.forEach(app => {
          console.log(`      • ${app.appName} (${app.appCode})`);
        });
      }
      console.log('');
    });

    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n🔍 3. Getting detailed access for user: ${testUser.name}`);
      const userAccess = await userAppService.getUserApplicationAccess(
        testUser.userId, 
        testTenantId
      );
      console.log('User Access:', JSON.stringify(userAccess, null, 2));

      console.log('\n🔄 4. Testing dry-run sync to CRM...');
      const dryRunResult = await userAppService.syncUsersToExternalApplication(
        testTenantId,
        'crm',
        { dryRun: true, userIds: [testUser.userId] }
      );
      console.log('Dry Run Result:', JSON.stringify(dryRunResult, null, 2));

      console.log('\n🚀 5. Testing bulk dry-run sync...');
      const bulkDryRun = await userAppService.bulkSyncAllUsers(testTenantId, {
        dryRun: true
      });
      console.log('Bulk Dry Run Result:', JSON.stringify(bulkDryRun, null, 2));
    }

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('your-tenant-id-here')) {
      console.log('\n💡 To run this test:');
      console.log('1. Replace "your-tenant-id-here" with an actual tenant ID from your database');
      console.log('2. Make sure you have users and applications set up in your database');
      console.log('3. Run: node test-user-applications.js');
    }
    
    process.exit(1);
  }
}

// Helper function to get a real tenant ID from the database
async function getTestTenantId() {
  try {
    const { sql } = await import('./src/db/index.js');
    
    const tenants = await sql`
      SELECT tenant_id, name 
      FROM tenants 
      LIMIT 1
    `;
    
    if (tenants.length > 0) {
      console.log(`Using tenant: ${tenants[0].name} (${tenants[0].tenant_id})`);
      return tenants[0].tenant_id;
    } else {
      throw new Error('No tenants found in database');
    }
  } catch (error) {
    console.error('Error getting test tenant ID:', error.message);
    throw error;
  }
}

// Run with real tenant ID if available
async function runTest() {
  try {
    console.log('🔍 Looking for test tenant...');
    const tenantId = await getTestTenantId();
    
    // Update the test function to use the real tenant ID
    const originalTest = testUserApplicationAccess.toString();
    const updatedTest = originalTest.replace(
      'your-tenant-id-here', 
      tenantId
    );
    
    // Execute the test with real tenant ID
    eval(`(${updatedTest})()`);
    
  } catch (error) {
    console.log('⚠️  Could not find test tenant, running with placeholder...');
    await testUserApplicationAccess();
  }
}

// Run the test
runTest();