#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationManager {
  constructor() {
    this.dbUrl = process.env.DATABASE_URL;
    if (!this.dbUrl) {
      console.error('❌ DATABASE_URL environment variable is required');
      console.log('\n🔧 Setup Instructions:');
      console.log('1. Copy env.example to .env: cp env.example .env');
      console.log('2. Edit .env and set your DATABASE_URL');
      console.log('3. Example: DATABASE_URL=postgresql://username:password@localhost:5432/your_db');
      console.log('\nOr set it temporarily: $env:DATABASE_URL="postgresql://..." (PowerShell)');
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    this.sql = postgres(this.dbUrl);
    this.db = drizzle(this.sql);
    this.migrationsFolder = path.join(__dirname, '../src/db/migrations');
  }

  async checkConnection() {
    try {
      await this.sql`SELECT 1`;
      console.log('✅ Database connection established');
      console.log(`📍 Connected to: ${this.dbUrl.replace(/\/\/.*@/, '//***:***@')}`);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('- Check your DATABASE_URL format');
      console.log('- Ensure PostgreSQL is running');
      console.log('- Verify database credentials');
      return false;
    }
  }

  async getCurrentMigrationState() {
    try {
      const journalPath = path.join(this.migrationsFolder, 'meta/_journal.json');
      
      if (!fs.existsSync(journalPath)) {
        console.log('\n⚠️  No migration journal found. Run `npm run db:generate` first.');
        return null;
      }

      const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
      
      console.log('\n📊 Current Migration State:');
      console.log(`Database Dialect: ${journal.dialect}`);
      console.log(`Schema Version: ${journal.version}`);
      console.log(`Total Migrations: ${journal.entries.length}`);
      
      if (journal.entries.length > 0) {
        console.log('\n📋 Migration History:');
        journal.entries.forEach((entry, index) => {
          const date = new Date(entry.when).toISOString();
          console.log(`  ${index + 1}. ${entry.tag} (${date})`);
        });
      }
      
      return journal;
    } catch (error) {
      console.error('❌ Failed to read migration state:', error.message);
      return null;
    }
  }

  async listPendingMigrations() {
    try {
      // Check if __drizzle_migrations table exists
      const result = await this.sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '__drizzle_migrations'
        );
      `;
      
      console.log('\n📋 Applied Migrations:');
      if (!result[0].exists) {
        console.log('  Migration tracking table not found - this is the first migration run.');
      } else {
        // Get applied migrations
        const appliedMigrations = await this.sql`
          SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at;
        `;

        if (appliedMigrations.length === 0) {
          console.log('  No migrations have been applied yet.');
        } else {
          appliedMigrations.forEach((migration, index) => {
            console.log(`  ${index + 1}. ${migration.hash} (${migration.created_at})`);
          });
        }
      }

      // Get all available migrations
      const allMigrations = this.getAllMigrations();
      
      console.log('\n⏳ Available Migration Files:');
      if (allMigrations.length === 0) {
        console.log('  No migration files found. Run `npm run db:generate` to create migrations.');
      } else {
        allMigrations.forEach((migration, index) => {
          console.log(`  ${index + 1}. ${migration.name}`);
        });
      }

      return allMigrations;
    } catch (error) {
      console.error('❌ Failed to check migrations:', error.message);
      return [];
    }
  }

  getAllMigrations() {
    try {
      if (!fs.existsSync(this.migrationsFolder)) {
        console.log(`⚠️  Migrations folder not found: ${this.migrationsFolder}`);
        return [];
      }

      const files = fs.readdirSync(this.migrationsFolder)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      return files.map(file => ({
        name: file,
        path: path.join(this.migrationsFolder, file),
        hash: file.replace('.sql', '')
      }));
    } catch (error) {
      console.error('❌ Failed to read migration files:', error.message);
      return [];
    }
  }

  async runMigrations(dryRun = false) {
    console.log(`\n🚀 ${dryRun ? 'DRY RUN: ' : ''}Running database migrations...`);
    
    if (dryRun) {
      console.log('This is a dry run. No changes will be made to the database.');
      const pending = await this.listPendingMigrations();
      console.log(`\nWould apply ${pending.length} migrations.`);
      console.log('\n💡 To see actual changes, run: npm run db:migrate');
      return;
    }

    try {
      await migrate(this.db, { migrationsFolder: this.migrationsFolder });
      console.log('✅ Migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async validateSchema() {
    console.log('\n🔍 Validating database schema...');
    
    try {
      // Get all tables
      const tables = await this.sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;

      console.log('\n📊 Database Tables:');
      if (tables.length === 0) {
        console.log('  No tables found. Database may be empty.');
      } else {
        tables.forEach((table, index) => {
          console.log(`  ${index + 1}. ${table.table_name}`);
        });
      }

      // Check for critical tables
      const criticalTables = ['tenants', 'tenant_users', 'subscriptions', 'payments'];
      const existingTables = tables.map(t => t.table_name);
      const missingTables = criticalTables.filter(table => !existingTables.includes(table));

      if (missingTables.length > 0) {
        console.log('\n⚠️  Missing Critical Tables:');
        missingTables.forEach(table => {
          console.log(`  - ${table}`);
        });
        console.log('\n💡 Run migrations to create missing tables: npm run migrate');
      } else {
        console.log('\n✅ All critical tables are present');
      }

      return { tables: existingTables, missing: missingTables };
    } catch (error) {
      console.error('❌ Schema validation failed:', error.message);
      return null;
    }
  }

  async generateMigrationReport() {
    console.log('\n📊 Generating Migration Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      database: {
        connected: await this.checkConnection(),
        url: this.dbUrl.replace(/\/\/.*@/, '//***:***@') // Hide credentials
      },
      migrations: await this.getCurrentMigrationState(),
      schema: await this.validateSchema(),
      pending: await this.listPendingMigrations()
    };

    // Save report to file
    const reportPath = path.join(__dirname, '../migration-reports', 
      `migration-report-${new Date().toISOString().split('T')[0]}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);

    return report;
  }

  async close() {
    await this.sql.end();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  console.log('🚀 Database Migration Manager');
  console.log('=============================\n');

  let manager;
  try {
    manager = new MigrationManager();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  try {
    switch (command) {
      case 'status':
        await manager.checkConnection();
        await manager.getCurrentMigrationState();
        await manager.listPendingMigrations();
        await manager.validateSchema();
        break;

      case 'migrate':
        const dryRun = args.includes('--dry-run');
        await manager.runMigrations(dryRun);
        break;

      case 'report':
        await manager.generateMigrationReport();
        break;

      case 'validate':
        await manager.validateSchema();
        break;

      default:
        console.log(`
Usage: node migration-manager.js [command] [options]

Commands:
  status    Show current migration status (default)
  migrate   Run pending migrations
            --dry-run: Show what would be migrated without applying
  report    Generate comprehensive migration report
  validate  Validate database schema

Examples:
  node migration-manager.js status
  node migration-manager.js migrate --dry-run
  node migration-manager.js migrate
  node migration-manager.js report

Environment Setup:
  Copy env.example to .env and set DATABASE_URL
  Or set temporarily: $env:DATABASE_URL="postgresql://user:pass@host:port/db"
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (manager) {
      await manager.close();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MigrationManager; 