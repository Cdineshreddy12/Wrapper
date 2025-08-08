#!/usr/bin/env node

// Simple migration script that works with your existing setup
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Simple Migration Helper');
console.log('===========================\n');

const command = process.argv[2] || 'status';

function runCommand(cmd, description) {
  console.log(`📋 ${description}...`);
  try {
    const output = execSync(cmd, { encoding: 'utf8', cwd: path.join(__dirname, '..') });
    if (output.trim()) {
      console.log(output);
    }
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function showMigrationInfo() {
  console.log('📊 Migration Status Check\n');
  
  // Check if migrations exist
  const migrationsDir = path.join(__dirname, '../src/db/migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    console.log(`📁 Migration files found: ${files.length}`);
    if (files.length > 0) {
      console.log('   Available migrations:');
      files.forEach((file, i) => console.log(`   ${i + 1}. ${file}`));
    }
  } else {
    console.log('⚠️  No migrations directory found');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. To see what changes are pending: npm run db:migrate (then choose "No, abort")');
  console.log('2. To apply changes safely: npm run migrate:apply');
  console.log('3. To generate new migrations: npm run db:generate');
}

function showBackupInfo() {
  console.log('💾 Backup Status\n');
  
  const backupDir = path.join(__dirname, '../backups');
  if (fs.existsSync(backupDir)) {
    const backups = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'));
    console.log(`📁 Backup files found: ${backups.length}`);
    if (backups.length > 0) {
      console.log('   Recent backups:');
      backups.slice(-5).forEach((file, i) => {
        const stats = fs.statSync(path.join(backupDir, file));
        console.log(`   ${i + 1}. ${file} (${stats.birthtime.toLocaleString()})`);
      });
    }
  } else {
    console.log('📁 No backups directory - will be created when needed');
  }
}

switch (command) {
  case 'status':
    showMigrationInfo();
    console.log('\n');
    showBackupInfo();
    console.log('\n🔧 Available Commands:');
    console.log('  npm run migrate:preview  - Preview pending changes');
    console.log('  npm run migrate:apply   - Apply migrations safely');
    console.log('  npm run backup:create   - Create backup');
    break;
    
  case 'preview':
    console.log('🔍 Previewing Migration Changes\n');
    console.log('This will show you exactly what changes would be made:');
    console.log('Running: npm run db:migrate (you can abort safely)\n');
    
    try {
      execSync('npm run db:migrate', { 
        stdio: 'inherit', 
        cwd: path.join(__dirname, '..') 
      });
    } catch (error) {
      console.log('\n✅ Preview completed (command was aborted or completed)');
    }
    break;
    
  case 'apply':
    console.log('🚀 Applying Migrations Safely\n');
    
    // Create backup first
    console.log('Step 1: Creating backup...');
    if (runCommand('node scripts/backup-database.js create', 'Backup creation')) {
      console.log('✅ Backup created successfully\n');
      
      // Apply migrations
      console.log('Step 2: Applying migrations...');
      if (runCommand('npm run db:migrate', 'Migration application')) {
        console.log('✅ Migrations applied successfully\n');
        console.log('🎉 Migration completed safely!');
      } else {
        console.log('\n⚠️  Migration failed. Backup is available for recovery.');
        console.log('💡 Use: npm run backup:list to see available backups');
      }
    }
    break;
    
  default:
    console.log(`
Usage: node simple-migrate.js [command]

Commands:
  status    Show migration and backup status (default)
  preview   Preview what migrations would do
  apply     Apply migrations safely with backup

Examples:
  node simple-migrate.js status
  node simple-migrate.js preview
  node simple-migrate.js apply

This script provides transparency into your database migrations:
- Shows exactly what migrations exist
- Creates backups before applying changes
- Uses your existing drizzle setup
- Provides clear next steps
    `);
} 