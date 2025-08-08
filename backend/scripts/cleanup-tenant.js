#!/usr/bin/env node

/**
 * Tenant Cleanup Script
 * 
 * Usage:
 *   node scripts/cleanup-tenant.js --tenant-id <tenantId>
 *   node scripts/cleanup-tenant.js --domain <emailDomain>
 *   node scripts/cleanup-tenant.js --summary <tenantId>
 * 
 * Examples:
 *   node scripts/cleanup-tenant.js --tenant-id "abc-123-def"
 *   node scripts/cleanup-tenant.js --domain "test.com"
 *   node scripts/cleanup-tenant.js --summary "abc-123-def"
 */

import { deleteTenantData, deleteTenantsByDomain, getTenantDataSummary } from '../src/utils/tenant-cleanup.js';
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';

const program = new Command();

program
  .name('cleanup-tenant')
  .description('Clean up tenant data for testing purposes')
  .version('1.0.0');

program
  .option('-t, --tenant-id <tenantId>', 'Delete specific tenant by ID')
  .option('-d, --domain <domain>', 'Delete all tenants by email domain')
  .option('-s, --summary <tenantId>', 'Get tenant data summary')
  .option('-f, --force', 'Skip confirmation prompts')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .parse();

const options = program.opts();

async function main() {
  try {
    console.log(chalk.blue.bold('🧹 Tenant Cleanup Tool\n'));

    // Summary mode
    if (options.summary) {
      console.log(chalk.yellow(`📊 Getting summary for tenant: ${options.summary}`));
      const summary = await getTenantDataSummary(options.summary);
      
      console.log(chalk.green('\n✅ Tenant Summary:'));
      console.log(chalk.cyan('Tenant Info:'), {
        tenantId: summary.tenant.tenantId,
        companyName: summary.tenant.companyName,
        adminEmail: summary.tenant.adminEmail,
        status: summary.tenant.status,
        createdAt: summary.tenant.createdAt
      });
      
      console.log(chalk.cyan('\nRecord Counts:'));
      Object.entries(summary.recordCounts).forEach(([table, count]) => {
        console.log(`  ${table}: ${chalk.white.bold(count)}`);
      });
      
      return;
    }

    // Tenant deletion mode
    if (options.tenantId) {
      console.log(chalk.yellow(`🎯 Target tenant: ${options.tenantId}`));
      
      // Get summary first
      console.log(chalk.blue('📊 Getting tenant summary...'));
      const summary = await getTenantDataSummary(options.tenantId);
      
      console.log(chalk.cyan('\nTenant to be deleted:'));
      console.log(`  Company: ${summary.tenant.companyName}`);
      console.log(`  Admin: ${summary.tenant.adminEmail}`);
      console.log(`  Status: ${summary.tenant.status}`);
      
      console.log(chalk.cyan('\nData to be deleted:'));
      Object.entries(summary.recordCounts).forEach(([table, count]) => {
        if (count > 0) {
          console.log(`  ${table}: ${chalk.red.bold(count)} records`);
        }
      });

      if (options.dryRun) {
        console.log(chalk.yellow('\n🔍 DRY RUN: No data will be deleted'));
        return;
      }

      // Confirmation
      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: chalk.red('Are you sure you want to DELETE all this tenant data? This cannot be undone!'),
            default: false
          }
        ]);

        if (!confirm) {
          console.log(chalk.yellow('❌ Operation cancelled'));
          return;
        }

        // Double confirmation for safety
        const { doubleConfirm } = await inquirer.prompt([
          {
            type: 'input',
            name: 'doubleConfirm',
            message: chalk.red(`Type "DELETE ${options.tenantId}" to confirm:`),
            validate: (input) => {
              return input === `DELETE ${options.tenantId}` ? true : 'Please type the exact confirmation text';
            }
          }
        ]);
      }

      console.log(chalk.red('\n🗑️ Starting tenant deletion...'));
      const result = await deleteTenantData(options.tenantId);
      
      console.log(chalk.green('\n🎉 Deletion completed successfully!'));
      console.log(chalk.cyan('Summary:'), {
        tenantId: result.tenantId,
        duration: `${result.endTime - result.startTime}ms`,
        deletedRecords: result.deletedRecords
      });
      
      return;
    }

    // Domain deletion mode
    if (options.domain) {
      console.log(chalk.yellow(`🌐 Target domain: ${options.domain}`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('\n🔍 DRY RUN: Finding tenants with this domain...'));
        // This would need a separate function to just list tenants
        console.log(chalk.yellow('DRY RUN: No data will be deleted'));
        return;
      }

      // Confirmation
      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: chalk.red(`Are you sure you want to DELETE ALL tenants with domain "${options.domain}"? This cannot be undone!`),
            default: false
          }
        ]);

        if (!confirm) {
          console.log(chalk.yellow('❌ Operation cancelled'));
          return;
        }

        // Double confirmation for safety
        const { doubleConfirm } = await inquirer.prompt([
          {
            type: 'input',
            name: 'doubleConfirm',
            message: chalk.red(`Type "DELETE DOMAIN ${options.domain}" to confirm:`),
            validate: (input) => {
              return input === `DELETE DOMAIN ${options.domain}` ? true : 'Please type the exact confirmation text';
            }
          }
        ]);
      }

      console.log(chalk.red('\n🗑️ Starting domain cleanup...'));
      const result = await deleteTenantsByDomain(options.domain);
      
      console.log(chalk.green('\n🎉 Domain cleanup completed!'));
      console.log(chalk.cyan('Summary:'), {
        domain: result.domain,
        totalTenants: result.totalTenants,
        successfulDeletions: result.results.filter(r => r.success).length,
        failures: result.results.filter(r => !r.success).length
      });

      // Show details for any failures
      const failures = result.results.filter(r => !r.success);
      if (failures.length > 0) {
        console.log(chalk.red('\n❌ Failed deletions:'));
        failures.forEach(failure => {
          console.log(chalk.red(`  ${failure.tenantId}: ${failure.error}`));
        });
      }
      
      return;
    }

    // No valid options provided
    console.log(chalk.red('❌ Please specify an action:'));
    console.log('  --tenant-id <id>   Delete specific tenant');
    console.log('  --domain <domain>  Delete all tenants with email domain');
    console.log('  --summary <id>     Get tenant data summary');
    console.log('\nFor help: node scripts/cleanup-tenant.js --help');
    process.exit(1);

  } catch (error) {
    console.error(chalk.red('\n🚨 Error:'), error.message);
    
    if (error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('🚨 Unhandled Rejection at:'), promise);
  console.error(chalk.red('Reason:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('🚨 Uncaught Exception:'), error.message);
  console.error(chalk.gray(error.stack));
  process.exit(1);
});

main(); 