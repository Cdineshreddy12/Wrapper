#!/usr/bin/env node

/**
 * 🔄 **PERMISSION MATRIX SYNC SCRIPT**
 * Syncs the permission matrix from permission-matrix.js to the database
 * 
 * Usage:
 *   npm run sync-permissions           # Full sync
 *   npm run sync-permissions:validate  # Validate matrix only
 *   npm run sync-permissions:app crm   # Sync specific app
 *   npm run sync-permissions:summary   # Show summary
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { applications, applicationModules } from '../db/schema/core/suite-schema.js';
import { BUSINESS_SUITE_MATRIX, PermissionMatrixUtils } from '../data/permission-matrix.js';
import { eq, and } from 'drizzle-orm';
import 'dotenv/config';

class PermissionSyncService {
 
  constructor() {
    this.stats = {
      appsCreated: 0,
      appsUpdated: 0,
      modulesCreated: 0,
      modulesUpdated: 0,
      totalApps: 0,
      totalModules: 0,
      totalPermissions: 0
    };

    // Initialize database connection
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.client = postgres(process.env.DATABASE_URL, {
      prepare: false,
      connection: {
        search_path: 'public'
      }
    });
    this.db = drizzle(this.client);
  }

  // 🔍 **VALIDATE PERMISSION MATRIX**
  async validateMatrix() {
    console.log('🔍 Validating permission matrix...');
    
    const errors = PermissionMatrixUtils.validateMatrix();
    
    if (errors.length > 0) {
      console.error('❌ Validation errors found:');
      errors.forEach(error => console.error(`  - ${error}`));
      return false;
    }
    
    console.log('✅ Permission matrix is valid');
    return true;
  }

  // 📊 **SHOW MATRIX SUMMARY**
  async showSummary() {
    console.log('📊 **PERMISSION MATRIX SUMMARY**\n');
    
    Object.keys(BUSINESS_SUITE_MATRIX).forEach(appCode => {
      const app = BUSINESS_SUITE_MATRIX[appCode];
      const moduleCount = Object.keys(app.modules).length;
      let totalPerms = 0;
      
      Object.values(app.modules).forEach(module => {
        totalPerms += module.permissions.length;
      });
      
      console.log(`🏢 ${app.appInfo.appName} (${appCode})`);
      console.log(`   📍 URL: ${app.appInfo.baseUrl}`);
      console.log(`   📦 Modules: ${moduleCount}`);
      console.log(`   🔐 Permissions: ${totalPerms}`);
      console.log(`   🎯 Core: ${app.appInfo.isCore ? 'Yes' : 'No'}`);
      console.log('');
      
      this.stats.totalApps++;
      this.stats.totalModules += moduleCount;
      this.stats.totalPermissions += totalPerms;
    });
    
    console.log(`📈 **TOTALS**`);
    console.log(`   Applications: ${this.stats.totalApps}`);
    console.log(`   Modules: ${this.stats.totalModules}`);
    console.log(`   Permissions: ${this.stats.totalPermissions}`);
  }

  // 🔄 **SYNC SPECIFIC APPLICATION**
  async syncApplication(appCode) {
    const app = BUSINESS_SUITE_MATRIX[appCode];
    if (!app) {
      console.error(`❌ Application '${appCode}' not found in matrix`);
      return false;
    }

    console.log(`🔄 Syncing application: ${app.appInfo.appName} (${appCode})`);
    
    try {
      // 1. Sync application
      const appId = await this.syncAppRecord(appCode, app.appInfo);
      
      // 2. Sync modules
      await this.syncAppModules(appId, appCode, app.modules);
      
      console.log(`✅ Successfully synced ${appCode}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error syncing ${appCode}:`, error);
      return false;
    }
  }

  // 🔄 **SYNC ALL APPLICATIONS**
  async syncAll(dryRun = false) {
    console.log('🔄 Starting full permission matrix sync...\n');

    // 1. Validate matrix first
    if (!(await this.validateMatrix())) {
      console.error('❌ Matrix validation failed. Aborting sync.');
      return false;
    }

    // 2. Show summary
    await this.showSummary();
    console.log('');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - Showing what would be synced:\n');
      await this.showDryRunSummary();
      return true;
    }

    // 3. Sync each application
    for (const appCode of Object.keys(BUSINESS_SUITE_MATRIX)) {
      await this.syncApplication(appCode);
      console.log('');
    }

    // 4. Show final stats
    this.showFinalStats();

    return true;
  }

  // 🏢 **SYNC APPLICATION RECORD**
  async syncAppRecord(appCode, appInfo) {
    console.log(`  📝 Syncing application record: ${appInfo.appName}`);
    
    // Check if app exists
    const existingApp = await this.db
      .select()
      .from(applications)
      .where(eq(applications.appCode, appCode))
      .limit(1);

    if (existingApp.length > 0) {
      // Update existing app
      await this.db
        .update(applications)
        .set({
          appName: appInfo.appName,
          description: appInfo.description,
          icon: appInfo.icon,
          baseUrl: appInfo.baseUrl,
          version: appInfo.version,
          isCore: appInfo.isCore,
          sortOrder: appInfo.sortOrder,
          updatedAt: new Date()
        })
        .where(eq(applications.appCode, appCode));

      console.log(`    ✅ Updated existing application: ${appInfo.appName}`);
      this.stats.appsUpdated++;
      return existingApp[0].appId;

    } else {
      // Create new app
      const [newApp] = await this.db
        .insert(applications)
        .values({
          appCode: appCode,
          appName: appInfo.appName,
          description: appInfo.description,
          icon: appInfo.icon,
          baseUrl: appInfo.baseUrl,
          version: appInfo.version,
          isCore: appInfo.isCore,
          sortOrder: appInfo.sortOrder
        })
        .returning();

      console.log(`    ✅ Created new application: ${appInfo.appName}`);
      this.stats.appsCreated++;
      return newApp.appId;
    }
  }

  // 📦 **SYNC APPLICATION MODULES**
  async syncAppModules(appId, appCode, modules) {
    console.log(`  📦 Syncing modules for ${appCode}...`);
    
    for (const [moduleCode, module] of Object.entries(modules)) {
      console.log(`    📝 Syncing module: ${module.moduleName}`);
      
      // Check if module exists
      const existingModule = await this.db
        .select()
        .from(applicationModules)
        .where(and(
          eq(applicationModules.appId, appId),
          eq(applicationModules.moduleCode, moduleCode)
        ))
        .limit(1);

      if (existingModule.length > 0) {
        // Update existing module
        await this.db
          .update(applicationModules)
          .set({
            moduleName: module.moduleName,
            description: module.description,
            isCore: module.isCore,
            permissions: module.permissions
          })
          .where(eq(applicationModules.moduleId, existingModule[0].moduleId));

        console.log(`      ✅ Updated module: ${module.moduleName}`);
        this.stats.modulesUpdated++;

      } else {
        // Create new module
        await this.db
          .insert(applicationModules)
          .values({
            appId: appId,
            moduleCode: moduleCode,
            moduleName: module.moduleName,
            description: module.description,
            isCore: module.isCore,
            permissions: module.permissions
          });

        console.log(`      ✅ Created module: ${module.moduleName}`);
        this.stats.modulesCreated++;
      }
    }
  }

  // 📊 **SHOW DRY RUN SUMMARY**
  async showDryRunSummary() {
    console.log('📊 **DRY RUN SUMMARY - What would be synced:**\n');

    Object.keys(BUSINESS_SUITE_MATRIX).forEach(appCode => {
      const app = BUSINESS_SUITE_MATRIX[appCode];
      const moduleCount = Object.keys(app.modules).length;
      let totalPerms = 0;

      Object.values(app.modules).forEach(module => {
        totalPerms += module.permissions.length;
      });

      console.log(`🏢 ${app.appInfo.appName} (${appCode})`);
      console.log(`   📍 URL: ${app.appInfo.baseUrl}`);
      console.log(`   📦 Modules: ${moduleCount}`);
      console.log(`   🔐 Permissions: ${totalPerms}`);
      console.log(`   🎯 Core: ${app.appInfo.isCore ? 'Yes' : 'No'}`);
      console.log(`   ➡️  Would: Create application record`);
      console.log('');

      Object.keys(app.modules).forEach(moduleCode => {
        const module = app.modules[moduleCode];
        console.log(`   📦 Module: ${module.moduleName} (${moduleCode})`);
        console.log(`      ➡️  Would: Create module with ${module.permissions.length} permissions`);
      });
      console.log('');
    });

    console.log(`📈 **WOULD SYNC TOTALS**`);
    console.log(`   Applications: ${this.stats.totalApps}`);
    console.log(`   Modules: ${this.stats.totalModules}`);
    console.log(`   Permissions: ${this.stats.totalPermissions}`);
  }

  // 📊 **SHOW FINAL STATS**
  showFinalStats() {
    console.log('🎉 **SYNC COMPLETED SUCCESSFULLY**\n');
    console.log('📊 **SYNC STATISTICS**');
    console.log(`   Applications Created: ${this.stats.appsCreated}`);
    console.log(`   Applications Updated: ${this.stats.appsUpdated}`);
    console.log(`   Modules Created: ${this.stats.modulesCreated}`);
    console.log(`   Modules Updated: ${this.stats.modulesUpdated}`);
    console.log(`   Total Applications: ${this.stats.totalApps}`);
    console.log(`   Total Modules: ${this.stats.totalModules}`);
    console.log(`   Total Permissions: ${this.stats.totalPermissions}`);
  }

  // 🔌 **CLOSE DATABASE CONNECTION**
  async close() {
    if (this.client) {
      await this.client.end({ timeout: 5 });
    }
  }
}

// 🚀 **MAIN EXECUTION**
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'sync';
  
  const syncService = new PermissionSyncService();
  
  try {
    switch (command) {
      case 'validate':
        await syncService.validateMatrix();
        break;

      case 'summary':
        await syncService.showSummary();
        break;

      case 'dry-run':
        await syncService.syncAll(true);
        break;

      case 'app':
        const appCode = args[1];
        if (!appCode) {
          console.error('❌ Please specify an app code: npm run sync-permissions:app <appCode>');
          process.exit(1);
        }
        await syncService.syncApplication(appCode);
        break;

      case 'sync':
      default:
        await syncService.syncAll();
        break;
    }
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  } finally {
    await syncService.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default PermissionSyncService;
