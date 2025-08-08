#!/usr/bin/env node

import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseBackup {
  constructor() {
    this.dbUrl = process.env.DATABASE_URL;
    if (!this.dbUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  parseDbUrl() {
    const url = new URL(this.dbUrl);
    return {
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.slice(1),
      username: url.username,
      password: url.password
    };
  }

  async createBackup(name = null) {
    const dbConfig = this.parseDbUrl();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = name || `backup-${timestamp}`;
    const backupFile = path.join(this.backupDir, `${backupName}.sql`);

    console.log('🔄 Creating database backup...');
    console.log(`Database: ${dbConfig.database}`);
    console.log(`Backup file: ${backupFile}`);

    return new Promise((resolve, reject) => {
      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      
      const pgDump = spawn('pg_dump', [
        '-h', dbConfig.host,
        '-p', dbConfig.port,
        '-U', dbConfig.username,
        '-d', dbConfig.database,
        '--clean',
        '--create',
        '--if-exists',
        '--verbose',
        '-f', backupFile
      ], { env });

      let stderr = '';

      pgDump.stderr.on('data', (data) => {
        stderr += data.toString();
        // pg_dump outputs progress to stderr, so we show it
        process.stderr.write(data);
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Backup created successfully: ${backupFile}`);
          
          // Get file size
          const stats = fs.statSync(backupFile);
          console.log(`Backup size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          
          resolve(backupFile);
        } else {
          console.error('❌ Backup failed');
          console.error('stderr:', stderr);
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });

      pgDump.on('error', (error) => {
        console.error('❌ Failed to start pg_dump:', error.message);
        reject(error);
      });
    });
  }

  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      console.log('\n📋 Available Backups:');
      if (files.length === 0) {
        console.log('  No backups found.');
      } else {
        files.forEach((file, index) => {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          console.log(`  ${index + 1}. ${file.name}`);
          console.log(`     Size: ${sizeMB} MB`);
          console.log(`     Created: ${file.created.toISOString()}`);
          console.log('');
        });
      }

      return files;
    } catch (error) {
      console.error('❌ Failed to list backups:', error.message);
      return [];
    }
  }

  async restoreBackup(backupFile) {
    const dbConfig = this.parseDbUrl();
    
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    console.log(`🔄 Restoring database from backup: ${backupFile}`);
    console.log(`Target database: ${dbConfig.database}`);
    console.log('⚠️  This will overwrite the current database!');

    return new Promise((resolve, reject) => {
      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      
      const psql = spawn('psql', [
        '-h', dbConfig.host,
        '-p', dbConfig.port,
        '-U', dbConfig.username,
        '-d', 'postgres', // Connect to postgres db first
        '-f', backupFile,
        '--verbose'
      ], { env });

      let stderr = '';

      psql.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      psql.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Database restored successfully');
          resolve();
        } else {
          console.error('❌ Restore failed');
          console.error('stderr:', stderr);
          reject(new Error(`psql exited with code ${code}`));
        }
      });

      psql.on('error', (error) => {
        console.error('❌ Failed to start psql:', error.message);
        reject(error);
      });
    });
  }

  async cleanOldBackups(daysToKeep = 30) {
    console.log(`🧹 Cleaning backups older than ${daysToKeep} days...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const backups = await this.listBackups();
    const oldBackups = backups.filter(backup => backup.created < cutoffDate);

    if (oldBackups.length === 0) {
      console.log('No old backups to clean.');
      return;
    }

    console.log(`Found ${oldBackups.length} old backups to remove:`);
    oldBackups.forEach(backup => {
      console.log(`  - ${backup.name} (${backup.created.toISOString()})`);
      fs.unlinkSync(backup.path);
    });

    console.log(`✅ Cleaned ${oldBackups.length} old backups`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'create';

  const backup = new DatabaseBackup();

  try {
    switch (command) {
      case 'create':
        const name = args[1];
        await backup.createBackup(name);
        break;

      case 'list':
        await backup.listBackups();
        break;

      case 'restore':
        const backupFile = args[1];
        if (!backupFile) {
          console.error('❌ Please specify backup file to restore');
          process.exit(1);
        }
        await backup.restoreBackup(backupFile);
        break;

      case 'clean':
        const days = parseInt(args[1]) || 30;
        await backup.cleanOldBackups(days);
        break;

      default:
        console.log(`
Usage: node backup-database.js [command] [options]

Commands:
  create [name]     Create a new backup (default)
  list              List all available backups
  restore <file>    Restore database from backup file
  clean [days]      Clean backups older than specified days (default: 30)

Examples:
  node backup-database.js create pre-migration-backup
  node backup-database.js list
  node backup-database.js restore backup-2024-01-15.sql
  node backup-database.js clean 7
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default DatabaseBackup; 