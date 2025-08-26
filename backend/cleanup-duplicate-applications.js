#!/usr/bin/env node

/**
 * 🧹 **DUPLICATE APPLICATION CLEANUP UTILITY**
 * 
 * This script cleans up duplicate organization application records that may have been
 * created due to race conditions during subscription plan upgrades.
 * 
 * Usage:
 *   node cleanup-duplicate-applications.js [--tenant-id=<id>] [--dry-run] [--force]
 * 
 * Options:
 *   --tenant-id=<id>  Clean up duplicates for specific tenant only
 *   --dry-run         Show what would be cleaned up without actually doing it
 *   --force           Skip confirmation prompts
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db, closeConnection } from './src/db/index.js';
import { OnboardingOrganizationSetupService } from './src/services/onboarding-organization-setup.js';
import { organizationApplications, applications } from './src/db/schema/suite-schema.js';
import { eq, sql, count, and } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  tenantId: null,
  dryRun: false,
  force: false
};

args.forEach(arg => {
  if (arg.startsWith('--tenant-id=')) {
    options.tenantId = arg.split('=')[1];
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--force') {
    options.force = true;
  }
});

async function main() {
  try {
    console.log('🧹 **DUPLICATE APPLICATION CLEANUP UTILITY**\n');
    
    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }
    
    // Check for existing duplicates
    console.log('🔍 Checking for duplicate applications...\n');
    
    if (options.tenantId) {
      // Clean up specific tenant
      console.log(`🎯 Targeting specific tenant: ${options.tenantId}\n`);
      
      const validation = await OnboardingOrganizationSetupService.validateOrganizationSetup(options.tenantId);
      
      if (validation.isValid) {
        console.log('✅ No issues found for this tenant');
        return;
      }
      
      console.log('❌ Issues found:');
      validation.issues.forEach(issue => {
        console.log(`   - ${issue.type}: ${issue.count} items`);
        if (issue.details) {
          issue.details.forEach(detail => {
            console.log(`     * ${JSON.stringify(detail)}`);
          });
        }
      });
      
      if (!options.dryRun && (options.force || await confirmAction(`Clean up issues for tenant ${options.tenantId}?`))) {
        console.log('\n🧹 Cleaning up duplicates for specific tenant...');
        const result = await OnboardingOrganizationSetupService.cleanupDuplicateApplications(null, options.tenantId);
        console.log(`✅ Cleanup completed: ${JSON.stringify(result, null, 2)}`);
      }
      
    } else {
      // System-wide cleanup
      console.log('🌍 Checking for duplicates across all tenants...\n');
      
      // Get summary of duplicates across all tenants using Drizzle ORM
      const duplicates = await db
        .select({
          tenantId: organizationApplications.tenantId,
          appCode: applications.appCode,
          recordCount: count()
        })
        .from(organizationApplications)
        .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
        .groupBy(organizationApplications.tenantId, applications.appCode)
        .having(sql`COUNT(*) > 1`)
        .orderBy(organizationApplications.tenantId, applications.appCode);
      
      if (duplicates && duplicates.length > 0) {
        console.log(`🗑️ Found ${duplicates.length} duplicate application records across all tenants:\n`);
        
        // Group by tenant for better display
        const duplicatesByTenant = duplicates.reduce((acc, row) => {
          if (!acc[row.tenantId]) {
            acc[row.tenantId] = [];
          }
          acc[row.tenantId].push({
            appCode: row.appCode,
            recordCount: row.recordCount
          });
          return acc;
        }, {});
        
        Object.entries(duplicatesByTenant).forEach(([tenantId, apps]) => {
          console.log(`📊 Tenant ${tenantId}:`);
          apps.forEach(app => {
            console.log(`   - ${app.appCode}: ${app.recordCount} records`);
          });
          console.log('');
        });
        
        const totalDuplicates = duplicates.reduce((sum, row) => sum + row.recordCount, 0);
        console.log(`📊 Total duplicate records: ${totalDuplicates}`);
        console.log(`📊 Tenants affected: ${Object.keys(duplicatesByTenant).length}\n`);
        
        if (!options.dryRun && (options.force || await confirmAction('Proceed with system-wide cleanup?'))) {
          console.log('\n🧹 Starting system-wide cleanup...');
          const result = await OnboardingOrganizationSetupService.cleanupAllDuplicateApplications();
          console.log(`✅ Cleanup completed: ${JSON.stringify(result, null, 2)}`);
        }
        
      } else {
        console.log('✅ No duplicate applications found across all tenants');
      }
    }
    
    console.log('\n✨ Cleanup utility completed successfully');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

async function confirmAction(message) {
  if (options.force) return true;
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️ Process interrupted by user');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️ Process terminated');
  await closeConnection();
  process.exit(0);
});

// Run the main function
main().catch(async (error) => {
  console.error('\n❌ Unhandled error:', error);
  await closeConnection();
  process.exit(1);
});
