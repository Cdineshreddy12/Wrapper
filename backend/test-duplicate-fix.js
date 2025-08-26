#!/usr/bin/env node

/**
 * 🧪 **DUPLICATE APPLICATION FIX TEST SCRIPT**
 * 
 * This script tests the duplicate application prevention logic by simulating
 * multiple simultaneous plan upgrades and verifying no duplicates are created.
 * 
 * Usage:
 *   node test-duplicate-fix.js [--tenant-id=<id>] [--plan=<plan>]
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db, closeConnection } from './src/db/index.js';
import { OnboardingOrganizationSetupService } from './src/services/onboarding-organization-setup.js';
import { organizationApplications, applications } from './src/db/schema/suite-schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  tenantId: null,
  plan: 'professional'
};

args.forEach(arg => {
  if (arg.startsWith('--tenant-id=')) {
    options.tenantId = arg.split('=')[1];
  } else if (arg.startsWith('--plan=')) {
    options.plan = arg.split('=')[1];
  }
});

async function testDuplicatePrevention() {
  try {
    console.log('🧪 **DUPLICATE APPLICATION FIX TEST SCRIPT**\n');
    
    if (!options.tenantId) {
      console.log('❌ Please provide a tenant ID: --tenant-id=<id>');
      console.log('Example: node test-duplicate-fix.js --tenant-id=123e4567-e89b-12d3-a456-426614174000');
      return;
    }
    
    console.log(`🎯 Testing tenant: ${options.tenantId}`);
    console.log(`📋 Target plan: ${options.plan}\n`);
    
    // Step 1: Validate current state
    console.log('🔍 Step 1: Validating current organization setup...');
    const initialValidation = await OnboardingOrganizationSetupService.validateOrganizationSetup(options.tenantId);
    
    if (initialValidation.isValid) {
      console.log('✅ Initial state is valid');
    } else {
      console.log('⚠️ Initial state has issues:');
      initialValidation.issues.forEach(issue => {
        console.log(`   - ${issue.type}: ${issue.count} items`);
      });
      
      if (initialValidation.summary.hasDuplicates) {
        console.log('\n🧹 Cleaning up existing duplicates...');
        await OnboardingOrganizationSetupService.cleanupDuplicateApplications(null, options.tenantId);
        console.log('✅ Existing duplicates cleaned up');
      }
    }
    
    // Step 2: Simulate multiple simultaneous plan upgrades
    console.log('\n🔄 Step 2: Simulating multiple simultaneous plan upgrades...');
    
    const upgradePromises = [];
    const numSimultaneousUpgrades = 5;
    
    for (let i = 0; i < numSimultaneousUpgrades; i++) {
      const promise = OnboardingOrganizationSetupService.updateOrganizationApplicationsForPlanChange(
        options.tenantId,
        options.plan,
        { 
          skipIfRecentlyUpdated: true, 
          forceUpdate: false, 
          cleanupDuplicates: true 
        }
      );
      upgradePromises.push(promise);
    }
    
    console.log(`   🚀 Starting ${numSimultaneousUpgrades} simultaneous upgrade processes...`);
    
    const startTime = Date.now();
    const results = await Promise.allSettled(upgradePromises);
    const endTime = Date.now();
    
    console.log(`   ⏱️ All upgrades completed in ${endTime - startTime}ms`);
    
    // Step 3: Analyze results
    console.log('\n📊 Step 3: Analyzing upgrade results...');
    
    let successfulUpgrades = 0;
    let skippedUpgrades = 0;
    let failedUpgrades = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.skipped) {
          skippedUpgrades++;
          console.log(`   ✅ Upgrade ${index + 1}: SKIPPED (${result.value.reason})`);
        } else {
          successfulUpgrades++;
          console.log(`   ✅ Upgrade ${index + 1}: SUCCESS`);
        }
      } else {
        failedUpgrades++;
        console.log(`   ❌ Upgrade ${index + 1}: FAILED - ${result.reason.message}`);
      }
    });
    
    console.log(`\n📈 Results Summary:`);
    console.log(`   - Successful: ${successfulUpgrades}`);
    console.log(`   - Skipped: ${skippedUpgrades}`);
    console.log(`   - Failed: ${failedUpgrades}`);
    
    // Step 4: Validate final state
    console.log('\n🔍 Step 4: Validating final organization setup...');
    const finalValidation = await OnboardingOrganizationSetupService.validateOrganizationSetup(options.tenantId);
    
    if (finalValidation.isValid) {
      console.log('✅ Final state is valid - No duplicates created!');
    } else {
      console.log('❌ Final state has issues:');
      finalValidation.issues.forEach(issue => {
        console.log(`   - ${issue.type}: ${issue.count} items`);
      });
    }
    
    // Step 5: Check application records
    console.log('\n📱 Step 5: Checking application records...');
    const appRecords = await db
      .select({
        id: organizationApplications.id,
        appCode: applications.appCode,
        appName: applications.appName,
        subscriptionTier: organizationApplications.subscriptionTier,
        enabledModules: organizationApplications.enabledModules,
        createdAt: organizationApplications.createdAt,
        updatedAt: organizationApplications.updatedAt
      })
      .from(organizationApplications)
      .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
      .where(eq(organizationApplications.tenantId, options.tenantId))
      .orderBy(applications.appCode, organizationApplications.createdAt);
    
    if (appRecords && appRecords.length > 0) {
      console.log(`📊 Found ${appRecords.length} application records:`);
      
      const appsByCode = {};
      appRecords.forEach(row => {
        if (!appsByCode[row.appCode]) {
          appsByCode[row.appCode] = [];
        }
        appsByCode[row.appCode].push(row);
      });
      
      Object.entries(appsByCode).forEach(([appCode, records]) => {
        console.log(`   📱 ${appCode.toUpperCase()}: ${records.length} record(s)`);
        records.forEach((record, index) => {
          const status = index === 0 ? '✅ PRIMARY' : '❌ DUPLICATE';
          console.log(`     ${status} - ID: ${record.id}, Tier: ${record.subscriptionTier}, Created: ${record.createdAt}`);
        });
      });
      
      // Check for duplicates
      const hasDuplicates = Object.values(appsByCode).some(records => records.length > 1);
      if (hasDuplicates) {
        console.log('\n❌ DUPLICATES DETECTED! The fix may not be working properly.');
      } else {
        console.log('\n✅ NO DUPLICATES DETECTED! The fix is working correctly.');
      }
    } else {
      console.log('⚠️ No application records found for this tenant');
    }
    
    // Step 6: Performance metrics
    console.log('\n📊 Step 6: Performance metrics...');
    console.log(`   - Total execution time: ${endTime - startTime}ms`);
    console.log(`   - Average per upgrade: ${Math.round((endTime - startTime) / numSimultaneousUpgrades)}ms`);
    console.log(`   - Idempotency efficiency: ${Math.round((skippedUpgrades / numSimultaneousUpgrades) * 100)}%`);
    
    // Step 7: Recommendations
    console.log('\n💡 Step 7: Recommendations...');
    
    if (skippedUpgrades === numSimultaneousUpgrades - 1) {
      console.log('   🎯 EXCELLENT: Only one upgrade was processed, others were properly skipped');
    } else if (skippedUpgrades > 0) {
      console.log('   ✅ GOOD: Some upgrades were skipped due to idempotency');
    } else {
      console.log('   ⚠️ WARNING: No upgrades were skipped - check idempotency logic');
    }
    
    if (finalValidation.isValid) {
      console.log('   🎯 EXCELLENT: No duplicates created during testing');
    } else {
      console.log('   ❌ ISSUE: Duplicates were created - investigate the fix');
    }
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️ Test interrupted by user');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️ Test terminated');
  await closeConnection();
  process.exit(0);
});

// Run the test
testDuplicatePrevention().catch(async (error) => {
  console.error('\n❌ Unhandled error:', error);
  await closeConnection();
  process.exit(1);
});
