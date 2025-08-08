#!/usr/bin/env node

import MigrationManager from './migration-manager.js';
import DatabaseBackup from './backup-database.js';
import readline from 'readline';
import 'dotenv/config';

class MigrationWorkflow {
  constructor() {
    this.migrationManager = new MigrationManager();
    this.backup = new DatabaseBackup();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.toLowerCase().trim());
      });
    });
  }

  async confirmAction(message) {
    const answer = await this.askQuestion(`${message} (y/N): `);
    return answer === 'y' || answer === 'yes';
  }

  async runSafeMigration(options = {}) {
    const {
      skipBackup = false,
      skipConfirmation = false,
      backupName = null
    } = options;

    console.log('🚀 Starting Safe Migration Workflow');
    console.log('=====================================\n');

    try {
      // Step 1: Check database connection
      console.log('Step 1: Checking database connection...');
      const connected = await this.migrationManager.checkConnection();
      if (!connected) {
        throw new Error('Cannot connect to database');
      }

      // Step 2: Show current migration status
      console.log('\nStep 2: Checking current migration status...');
      await this.migrationManager.getCurrentMigrationState();
      const pendingMigrations = await this.migrationManager.listPendingMigrations();

      if (pendingMigrations.length === 0) {
        console.log('\n✅ No pending migrations found. Database is up to date.');
        return;
      }

      console.log(`\n⚠️  Found ${pendingMigrations.length} pending migrations.`);

      // Step 3: Confirm migration
      if (!skipConfirmation) {
        const proceed = await this.confirmAction(
          '\nDo you want to proceed with the migration?'
        );
        if (!proceed) {
          console.log('Migration cancelled by user.');
          return;
        }
      }

      // Step 4: Create backup (unless skipped)
      let backupFile = null;
      if (!skipBackup) {
        console.log('\nStep 3: Creating database backup...');
        const shouldBackup = skipConfirmation || await this.confirmAction(
          'Create a backup before migration?'
        );
        
        if (shouldBackup) {
          const name = backupName || `pre-migration-${new Date().toISOString().split('T')[0]}`;
          backupFile = await this.backup.createBackup(name);
          console.log(`✅ Backup created: ${backupFile}`);
        } else {
          console.log('⚠️  Skipping backup (not recommended for production)');
        }
      }

      // Step 5: Validate schema before migration
      console.log('\nStep 4: Validating current schema...');
      const schemaBefore = await this.migrationManager.validateSchema();

      // Step 6: Run migrations
      console.log('\nStep 5: Running migrations...');
      await this.migrationManager.runMigrations(false);

      // Step 7: Validate schema after migration
      console.log('\nStep 6: Validating schema after migration...');
      const schemaAfter = await this.migrationManager.validateSchema();

      // Step 8: Generate migration report
      console.log('\nStep 7: Generating migration report...');
      const report = await this.migrationManager.generateMigrationReport();

      // Step 9: Summary
      console.log('\n🎉 Migration Workflow Completed Successfully!');
      console.log('===========================================');
      console.log(`✅ Applied ${pendingMigrations.length} migrations`);
      if (backupFile) {
        console.log(`✅ Backup available: ${backupFile}`);
      }
      console.log(`✅ Schema validated (${schemaAfter.tables.length} tables)`);
      console.log('✅ Migration report generated');

      // Show table changes
      const newTables = schemaAfter.tables.filter(
        table => !schemaBefore.tables.includes(table)
      );
      if (newTables.length > 0) {
        console.log(`\n📊 New tables created: ${newTables.join(', ')}`);
      }

    } catch (error) {
      console.error('\n❌ Migration workflow failed:', error.message);
      
      if (backupFile && await this.confirmAction(
        '\nWould you like to restore from backup?'
      )) {
        console.log('Restoring from backup...');
        await this.backup.restoreBackup(backupFile);
        console.log('✅ Database restored from backup');
      }
      
      throw error;
    }
  }

  async runDryRun() {
    console.log('🔍 Running Migration Dry Run');
    console.log('============================\n');

    try {
      await this.migrationManager.checkConnection();
      await this.migrationManager.getCurrentMigrationState();
      await this.migrationManager.runMigrations(true);
      await this.migrationManager.validateSchema();
    } catch (error) {
      console.error('❌ Dry run failed:', error.message);
      throw error;
    }
  }

  async rollbackToBackup(backupFile) {
    console.log('🔄 Rolling back to backup');
    console.log('=========================\n');

    try {
      const proceed = await this.confirmAction(
        `⚠️  This will overwrite the current database with the backup.\nContinue?`
      );
      
      if (!proceed) {
        console.log('Rollback cancelled.');
        return;
      }

      await this.backup.restoreBackup(backupFile);
      console.log('✅ Rollback completed successfully');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  async close() {
    this.rl.close();
    await this.migrationManager.close();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';

  const workflow = new MigrationWorkflow();

  try {
    switch (command) {
      case 'migrate':
        const options = {
          skipBackup: args.includes('--no-backup'),
          skipConfirmation: args.includes('--yes'),
          backupName: args.find(arg => arg.startsWith('--backup-name='))?.split('=')[1]
        };
        await workflow.runSafeMigration(options);
        break;

      case 'dry-run':
        await workflow.runDryRun();
        break;

      case 'rollback':
        const backupFile = args[1];
        if (!backupFile) {
          console.error('❌ Please specify backup file for rollback');
          process.exit(1);
        }
        await workflow.rollbackToBackup(backupFile);
        break;

      default:
        console.log(`
Usage: node run-migrations.js [command] [options]

Commands:
  migrate           Run safe migration workflow (default)
                    --no-backup: Skip backup creation
                    --yes: Skip confirmation prompts
                    --backup-name=<name>: Custom backup name
  
  dry-run           Show what migrations would be applied
  
  rollback <file>   Rollback database to backup file

Examples:
  node run-migrations.js migrate
  node run-migrations.js migrate --no-backup --yes
  node run-migrations.js dry-run
  node run-migrations.js rollback ../backups/pre-migration-2024-01-15.sql

This workflow provides:
- ✅ Database connection verification
- ✅ Migration status transparency
- ✅ Automatic backup creation (optional)
- ✅ Schema validation before/after
- ✅ Comprehensive reporting
- ✅ Rollback capability
- ✅ Safety confirmations
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await workflow.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MigrationWorkflow; 