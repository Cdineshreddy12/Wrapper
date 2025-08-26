#!/usr/bin/env node

/**
 * 🧪 User Classification and Sync Testing Script
 * 
 * This script demonstrates and tests the user classification and sync functionality.
 * It shows how users are classified based on their application access and how 
 * they can be synchronized to their respective applications.
 * 
 * Usage:
 *   node test-user-classification-sync.js [tenantId]
 */

import 'dotenv/config';
import { UserClassificationService } from './src/services/user-classification-service.js';
import { UserSyncService } from './src/services/user-sync-service.js';
import { db } from './src/db/index.js';
import { tenants } from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function printHeader(title) {
  colorLog('\n' + '='.repeat(60), 'cyan');
  colorLog(`🎯 ${title}`, 'bright');
  colorLog('='.repeat(60), 'cyan');
}

function printSubHeader(title) {
  colorLog(`\n📊 ${title}`, 'yellow');
  colorLog('-'.repeat(40), 'yellow');
}

async function getTenantId() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    return args[0];
  }

  // Get the first available tenant
  const [tenant] = await db
    .select({ tenantId: tenants.tenantId, companyName: tenants.companyName })
    .from(tenants)
    .limit(1);

  if (!tenant) {
    throw new Error('No tenants found in database');
  }

  colorLog(`📍 Using tenant: ${tenant.companyName} (${tenant.tenantId})`, 'cyan');
  return tenant.tenantId;
}

async function testUserClassification(tenantId) {
  printHeader('USER CLASSIFICATION TEST');

  try {
    colorLog('🔍 Classifying users by application access...', 'blue');
    
    const classification = await UserClassificationService.classifyUsersByApplication(tenantId);
    
    printSubHeader('Classification Summary');
    console.log('Total Users:', classification.summary.totalUsers);
    console.log('Application Breakdown:');
    Object.entries(classification.summary.applicationBreakdown).forEach(([app, count]) => {
      colorLog(`  📱 ${app.toUpperCase()}: ${count} users`, 'green');
    });
    
    console.log('\nSubscription Breakdown:');
    Object.entries(classification.summary.subscriptionBreakdown).forEach(([tier, count]) => {
      colorLog(`  💳 ${tier}: ${count} users`, 'magenta');
    });

    printSubHeader('Users by Application');
    Object.entries(classification.byApplication).forEach(([appCode, appData]) => {
      if (appData.totalUsers > 0) {
        colorLog(`\n📱 ${appData.appInfo.appName} (${appCode})`, 'bright');
        colorLog(`   Users with access: ${appData.totalUsers}`, 'green');
        
        appData.users.slice(0, 3).forEach(user => {
          const reason = user.classificationReason?.primary || 'Unknown';
          colorLog(`   👤 ${user.name} (${user.email}) - ${reason}`, 'cyan');
        });
        
        if (appData.totalUsers > 3) {
          colorLog(`   ... and ${appData.totalUsers - 3} more users`, 'yellow');
        }
      }
    });

    return classification;

  } catch (error) {
    colorLog(`❌ Error in user classification: ${error.message}`, 'red');
    throw error;
  }
}

async function testSpecificUserAccess(tenantId, classification) {
  printHeader('INDIVIDUAL USER ACCESS TEST');

  try {
    // Get a sample user
    const sampleUserId = Object.keys(classification.byUser)[0];
    if (!sampleUserId) {
      colorLog('⚠️ No users found to test individual access', 'yellow');
      return;
    }

    colorLog(`🔍 Testing access for user: ${sampleUserId}`, 'blue');
    
    const userAccess = await UserClassificationService.getUserApplicationAccess(sampleUserId, tenantId);
    
    if (userAccess) {
      printSubHeader(`User: ${userAccess.name} (${userAccess.email})`);
      
      colorLog(`📱 Allowed Applications: ${userAccess.allowedApplications.join(', ')}`, 'green');
      colorLog(`🎭 Roles: ${userAccess.roles.map(r => r.roleName).join(', ')}`, 'magenta');
      colorLog(`💼 Department: ${userAccess.department || 'Not specified'}`, 'cyan');
      colorLog(`📋 Classification Reason: ${userAccess.classificationReason?.primary}`, 'yellow');
      
      console.log('\nDetailed Classification Reasons:');
      userAccess.classificationReason?.details.forEach(detail => {
        colorLog(`  • ${detail}`, 'cyan');
      });
    }

    return userAccess;

  } catch (error) {
    colorLog(`❌ Error in user access test: ${error.message}`, 'red');
    throw error;
  }
}

async function testApplicationSpecificUsers(tenantId) {
  printHeader('APPLICATION-SPECIFIC USER ACCESS TEST');

  try {
    const applications = ['crm', 'hr', 'affiliate'];
    
    for (const appCode of applications) {
      colorLog(`\n🔍 Getting users for application: ${appCode.toUpperCase()}`, 'blue');
      
      const appUsers = await UserClassificationService.getUsersForApplication(tenantId, appCode);
      
      if (appUsers.totalUsers > 0) {
        colorLog(`✅ Found ${appUsers.totalUsers} users with ${appCode} access`, 'green');
        
        appUsers.users.slice(0, 2).forEach(user => {
          colorLog(`   👤 ${user.name} - ${user.subscriptionTier} tier`, 'cyan');
        });
      } else {
        colorLog(`⚠️ No users have access to ${appCode}`, 'yellow');
      }
    }

  } catch (error) {
    colorLog(`❌ Error in application-specific test: ${error.message}`, 'red');
    throw error;
  }
}

async function testSyncStatus(tenantId) {
  printHeader('SYNC STATUS TEST');

  try {
    colorLog('🔍 Getting sync status...', 'blue');
    
    const status = await UserSyncService.getSyncStatus(tenantId);
    
    printSubHeader('Sync Configuration');
    console.log('Tenant ID:', status.tenantId);
    console.log('Last Classified:', status.lastClassified);
    console.log('Total Users:', status.summary.totalUsers);
    
    printSubHeader('Application Status');
    Object.entries(status.applicationStatus).forEach(([appCode, appStatus]) => {
      colorLog(`\n📱 ${appCode.toUpperCase()}`, 'bright');
      colorLog(`   Users: ${appStatus.userCount}`, 'green');
      colorLog(`   URL: ${appStatus.applicationUrl}`, 'cyan');
      colorLog(`   Configured: ${appStatus.isConfigured ? '✅' : '❌'}`, appStatus.isConfigured ? 'green' : 'red');
      colorLog(`   Status: ${appStatus.status}`, 'yellow');
    });

    return status;

  } catch (error) {
    colorLog(`❌ Error in sync status test: ${error.message}`, 'red');
    throw error;
  }
}

async function testDryRunSync(tenantId) {
  printHeader('DRY RUN SYNC TEST');

  try {
    colorLog('🧪 Performing dry run sync (no actual sync)...', 'blue');
    
    // Simulate what would happen in a sync without actually syncing
    const classification = await UserClassificationService.classifyUsersByApplication(tenantId);
    
    printSubHeader('Sync Preview');
    colorLog(`📊 Would sync ${classification.summary.totalUsers} total users`, 'green');
    
    Object.entries(classification.summary.applicationBreakdown).forEach(([app, count]) => {
      if (count > 0) {
        colorLog(`   📱 ${app.toUpperCase()}: ${count} users would be synced`, 'cyan');
      }
    });

    colorLog('\n🔄 This was a dry run - no actual synchronization was performed', 'yellow');
    
    return {
      dryRun: true,
      wouldSync: classification.summary,
      applicationBreakdown: classification.summary.applicationBreakdown
    };

  } catch (error) {
    colorLog(`❌ Error in dry run sync: ${error.message}`, 'red');
    throw error;
  }
}

async function runTests() {
  try {
    printHeader('USER CLASSIFICATION & SYNC TESTING SUITE');
    colorLog('🚀 Starting comprehensive testing...', 'green');

    // Get tenant ID
    const tenantId = await getTenantId();

    // Test 1: User Classification
    const classification = await testUserClassification(tenantId);

    // Test 2: Individual User Access
    await testSpecificUserAccess(tenantId, classification);

    // Test 3: Application-Specific Users
    await testApplicationSpecificUsers(tenantId);

    // Test 4: Sync Status
    await testSyncStatus(tenantId);

    // Test 5: Dry Run Sync
    await testDryRunSync(tenantId);

    printHeader('TESTING SUMMARY');
    colorLog('✅ All tests completed successfully!', 'green');
    colorLog('\n📝 API Endpoints Available:', 'bright');
    colorLog('   GET  /api/user-sync/classification', 'cyan');
    colorLog('   GET  /api/user-sync/classification/:appCode', 'cyan');
    colorLog('   GET  /api/user-sync/user/:userId/access', 'cyan');
    colorLog('   POST /api/user-sync/sync/all', 'cyan');
    colorLog('   POST /api/user-sync/sync/application/:appCode', 'cyan');
    colorLog('   POST /api/user-sync/sync/user/:userId', 'cyan');
    colorLog('   POST /api/user-sync/refresh/:userId', 'cyan');
    colorLog('   GET  /api/user-sync/status', 'cyan');
    colorLog('   POST /api/user-sync/test-connectivity', 'cyan');
    
    colorLog('\n🎯 Next Steps:', 'bright');
    colorLog('   1. Configure external application URLs in environment variables', 'yellow');
    colorLog('   2. Set up INTERNAL_API_KEY for secure sync operations', 'yellow');
    colorLog('   3. Implement sync endpoints in external applications', 'yellow');
    colorLog('   4. Test actual sync operations with real applications', 'yellow');

  } catch (error) {
    colorLog(`💥 Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
