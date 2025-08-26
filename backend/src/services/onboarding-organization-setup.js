import { db } from '../db/index.js';
import { 
  applications, 
  organizationApplications, 
  applicationModules 
} from '../db/schema/suite-schema.js';
import { eq, and, sql, count } from 'drizzle-orm';
import { PLAN_ACCESS_MATRIX } from '../data/permission-matrix.js';

/**
 * 🏗️ ONBOARDING ORGANIZATION SETUP SERVICE
 * Automatically sets up organization applications during onboarding
 */
export class OnboardingOrganizationSetupService {
  
  /**
   * Set up organization applications for a new tenant based on their plan
   */
  static async setupOrganizationApplicationsForNewTenant(tenantId, plan = 'professional') {
    try {
      console.log(`🏢 Setting up organization applications for tenant ${tenantId} with ${plan} plan...`);
      
      // Get plan access configuration
      const planAccess = PLAN_ACCESS_MATRIX[plan];
      if (!planAccess) {
        console.warn(`⚠️ Plan ${plan} not found in access matrix, using default professional plan`);
        plan = 'professional';
      }
      
      // Get all applications from database
      const allApps = await db.select().from(applications);
      console.log(`📱 Found ${allApps.length} available applications`);
      
      // Get applications this plan has access to
      const planApplications = planAccess?.applications || ['crm', 'hr', 'system'];
      const enabledApps = allApps.filter(app => planApplications.includes(app.appCode));
      
      console.log(`🎯 Plan ${plan} grants access to: ${planApplications.join(', ')}`);
      
      // Set up each application for the organization
      for (const app of enabledApps) {
        try {
          // Determine enabled modules for this app based on plan
          const enabledModules = planAccess?.modules?.[app.appCode] || [];
          const moduleList = enabledModules === '*' 
            ? await this.getAllModulesForApp(app.appId)
            : enabledModules;
          
          console.log(`📦 ${app.appName}: enabling modules [${moduleList.join(', ')}]`);
          
          // Create organization application record
          await db
            .insert(organizationApplications)
            .values({
              tenantId,
              appId: app.appId,
              isEnabled: true,
              enabledModules: moduleList,
              subscriptionTier: plan,
              maxUsers: planAccess?.limitations?.users === -1 ? null : planAccess?.limitations?.users,
              licenseCount: 1
            });
          
          console.log(`✅ Granted access to: ${app.appName}`);
          
        } catch (error) {
          console.error(`❌ Failed to set up ${app.appName} for tenant ${tenantId}:`, error.message);
          // Continue with other apps even if one fails
        }
      }
      
      console.log(`🎉 Organization applications setup completed for tenant ${tenantId}`);
      return { success: true, appsConfigured: enabledApps.length };
      
    } catch (error) {
      console.error(`❌ Failed to setup organization applications for tenant ${tenantId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all module codes for an application
   */
  static async getAllModulesForApp(appId) {
    try {
      const modules = await db
        .select({ moduleCode: applicationModules.moduleCode })
        .from(applicationModules)
        .where(eq(applicationModules.appId, appId));
      
      return modules.map(m => m.moduleCode);
    } catch (error) {
      console.error(`Failed to get modules for app ${appId}:`, error);
      return [];
    }
  }
  
  /**
   * 🔄 **UPDATE ORGANIZATION APPLICATIONS FOR PLAN CHANGE**
   * Handles plan upgrades/downgrades and prevents duplicate applications
   */
  static async updateOrganizationApplicationsForPlanChange(tenantId, newPlan, options = {}) {
    const { skipIfRecentlyUpdated = true, forceUpdate = false, cleanupDuplicates = true } = options;
    
    return await db.transaction(async (tx) => {
      try {
        console.log(`🔄 Updating organization applications for tenant ${tenantId} to ${newPlan} plan...`);
        
        // 🔍 **ENHANCED IDEMPOTENCY CHECK** - Check both plan and application state
        if (skipIfRecentlyUpdated && !forceUpdate) {
          const currentState = await tx
            .select({
              id: organizationApplications.id,
              subscriptionTier: organizationApplications.subscriptionTier,
              updatedAt: organizationApplications.updatedAt,
              appCode: applications.appCode
            })
            .from(organizationApplications)
            .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
            .where(eq(organizationApplications.tenantId, tenantId));
            
          if (currentState.length > 0) {
            const allSamePlan = currentState.every(app => app.subscriptionTier === newPlan);
            const lastUpdate = Math.max(...currentState.map(app => app.updatedAt.getTime()));
            const timeSinceUpdate = Date.now() - lastUpdate;
            
            // If all apps are already on the new plan and updated within last 5 minutes, skip
            if (allSamePlan && timeSinceUpdate < 5 * 60 * 1000) {
              console.log(`⏭️ Skipping update - all apps already on ${newPlan} plan, updated ${Math.round(timeSinceUpdate/1000)}s ago`);
              return { skipped: true, reason: 'recently_updated', plan: newPlan };
            }
          }
        }
        
        // 🧹 **CLEANUP DUPLICATES** - Remove any existing duplicates before processing
        if (cleanupDuplicates) {
          await this.cleanupDuplicateApplications(tx, tenantId);
        }
        
        const planAccess = PLAN_ACCESS_MATRIX[newPlan];
        if (!planAccess) {
          throw new Error(`Plan ${newPlan} not found in access matrix`);
        }
        
        // Get all applications from database
        const allApps = await tx.select().from(applications);
        console.log(`📱 Found ${allApps.length} available applications`);
        
        // Get applications this plan has access to
        const planApplications = planAccess.applications || [];
        const enabledApps = allApps.filter(app => planApplications.includes(app.appCode));
        
        console.log(`🎯 Plan ${newPlan} grants access to: ${planApplications.join(', ')}`);
        
        // 🔒 **ATOMIC UPDATE** - Update subscription tier for all existing organization applications
        await tx
          .update(organizationApplications)
          .set({
            subscriptionTier: newPlan,
            maxUsers: planAccess.limitations.users === -1 ? null : planAccess.limitations.users,
            updatedAt: new Date()
          })
          .where(eq(organizationApplications.tenantId, tenantId));
        
        console.log(`🏢 Updated existing organization applications to ${newPlan} plan`);
      
        // 📦 **PROCESS EACH APPLICATION** with proper UPSERT logic
        for (const app of enabledApps) {
          try {
            // Determine enabled modules for this app based on plan
            const enabledModules = planAccess.modules[app.appCode] || [];
            const moduleList = enabledModules === '*' 
              ? await this.getAllModulesForApp(app.appId)
              : enabledModules;
            
            console.log(`📦 Processing ${app.appName}: modules [${moduleList.join(', ')}]`);
            
            // 🔍 **CHECK EXISTING RECORD** - Look for exact match
            const [existingOrgApp] = await tx
              .select()
              .from(organizationApplications)
              .where(and(
                eq(organizationApplications.tenantId, tenantId),
                eq(organizationApplications.appId, app.appId)
              ))
              .limit(1);
            
            if (existingOrgApp) {
              // ✅ **UPDATE EXISTING RECORD** - Only update if there are actual changes
              const needsUpdate = 
                existingOrgApp.subscriptionTier !== newPlan ||
                existingOrgApp.maxUsers !== (planAccess.limitations.users === -1 ? null : planAccess.limitations.users) ||
                JSON.stringify(existingOrgApp.enabledModules) !== JSON.stringify(moduleList);
              
              if (needsUpdate) {
                await tx
                  .update(organizationApplications)
                  .set({
                    isEnabled: true,
                    enabledModules: moduleList,
                    subscriptionTier: newPlan,
                    maxUsers: planAccess.limitations.users === -1 ? null : planAccess.limitations.users,
                    updatedAt: new Date()
                  })
                  .where(eq(organizationApplications.id, existingOrgApp.id));
                
                console.log(`   ✅ Updated existing access to: ${app.appName}`);
              } else {
                console.log(`   ⏭️ No changes needed for: ${app.appName}`);
              }
            } else {
              // ➕ **INSERT NEW RECORD** - Use proper error handling for unique constraint violations
              try {
                await tx
                  .insert(organizationApplications)
                  .values({
                    tenantId,
                    appId: app.appId,
                    isEnabled: true,
                    enabledModules: moduleList,
                    subscriptionTier: newPlan,
                    maxUsers: planAccess.limitations.users === -1 ? null : planAccess.limitations.users,
                    licenseCount: 1,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  });
                
                console.log(`   ➕ Granted NEW access to: ${app.appName}`);
              } catch (insertError) {
                // 🔄 **HANDLE DUPLICATE INSERT** - If insert fails due to duplicate, try to update instead
                if (insertError.message.includes('duplicate') || 
                    insertError.message.includes('unique') || 
                    insertError.message.includes('constraint')) {
                  console.log(`   🔄 Duplicate detected during insert, updating instead for: ${app.appName}`);
                  
                  // Try to find the record that was just created (race condition)
                  const [duplicateRecord] = await tx
                    .select()
                    .from(organizationApplications)
                    .where(and(
                      eq(organizationApplications.tenantId, tenantId),
                      eq(organizationApplications.appId, app.appId)
                    ))
                    .limit(1);
                  
                  if (duplicateRecord) {
                    await tx
                      .update(organizationApplications)
                      .set({
                        isEnabled: true,
                        enabledModules: moduleList,
                        subscriptionTier: newPlan,
                        maxUsers: planAccess.limitations.users === -1 ? null : planAccess.limitations.users,
                        updatedAt: new Date()
                      })
                      .where(eq(organizationApplications.id, duplicateRecord.id));
                    
                    console.log(`   ✅ Updated duplicate record for: ${app.appName}`);
                  } else {
                    console.warn(`   ⚠️ Duplicate detected but record not found for: ${app.appName}`);
                  }
                } else {
                  throw insertError;
                }
              }
            }
            
          } catch (error) {
            console.error(`❌ Failed to process ${app.appName} for tenant ${tenantId}:`, error.message);
            // Continue with other apps even if one fails
          }
        }
      
        // 🚫 **DISABLE APPLICATIONS** not included in the new plan (for downgrades)
        const currentOrgApps = await tx
          .select({
            id: organizationApplications.id,
            appCode: applications.appCode,
            appName: applications.appName
          })
          .from(organizationApplications)
          .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
          .where(eq(organizationApplications.tenantId, tenantId));
      
        for (const orgApp of currentOrgApps) {
          if (!planApplications.includes(orgApp.appCode)) {
            // This app is not included in the new plan - disable it
            await tx
              .update(organizationApplications)
              .set({
                isEnabled: false,
                subscriptionTier: newPlan,
                updatedAt: new Date()
              })
              .where(eq(organizationApplications.id, orgApp.id));
            
            console.log(`   ❌ Disabled access to: ${orgApp.appName} (not included in ${newPlan} plan)`);
          }
        }
      
        // 🔍 **FINAL VALIDATION** - Ensure no duplicates exist after processing
        if (cleanupDuplicates) {
          await this.cleanupDuplicateApplications(tx, tenantId);
        }
      
        console.log(`✅ Organization applications updated for ${newPlan} plan`);
        return { success: true, plan: newPlan, updated: true };
        
      } catch (error) {
        console.error(`❌ Failed to update organization applications for tenant ${tenantId}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * 🧹 **CLEANUP DUPLICATE APPLICATIONS**
   * Removes any duplicate organization application records
   */
  static async cleanupDuplicateApplications(tx, tenantId) {
    try {
      console.log(`🧹 Cleaning up duplicate applications for tenant ${tenantId}...`);
      
      // Find duplicates using Drizzle ORM
      const duplicates = await db
        .select({
          id: organizationApplications.id,
          tenantId: organizationApplications.tenantId,
          appId: organizationApplications.appId
        })
        .from(organizationApplications)
        .where(sql`(
          SELECT COUNT(*) 
          FROM organization_applications oa2 
          WHERE oa2.tenant_id = organization_applications.tenant_id 
          AND oa2.app_id = organization_applications.app_id
        ) > 1`)
        .orderBy(organizationApplications.createdAt);
      
      if (duplicates && duplicates.length > 0) {
        console.log(`   🗑️ Found ${duplicates.length} duplicate records to remove`);
        
        // Delete duplicate records using Drizzle ORM
        for (const duplicate of duplicates) {
          // Find the first record for this tenant/app combination (keep the oldest)
          const [firstRecord] = await db
            .select({ id: organizationApplications.id })
            .from(organizationApplications)
            .where(and(
              eq(organizationApplications.tenantId, duplicate.tenantId),
              eq(organizationApplications.appId, duplicate.appId)
            ))
            .orderBy(organizationApplications.createdAt)
            .limit(1);
          
          if (firstRecord && firstRecord.id !== duplicate.id) {
            // Delete this duplicate record
            await db
              .delete(organizationApplications)
              .where(eq(organizationApplications.id, duplicate.id));
          }
        }
        
        console.log(`   ✅ Removed ${duplicates.length} duplicate records`);
        return { cleaned: true, removedCount: duplicates.length };
      } else {
        console.log(`   ✅ No duplicates found`);
        return { cleaned: false, removedCount: 0 };
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup duplicate applications:`, error);
      // Don't throw error - this is cleanup, not critical
      return { cleaned: false, error: error.message };
    }
  }
  
  /**
   * 🌍 **CLEANUP ALL DUPLICATE APPLICATIONS** (System-wide)
   * Removes duplicate organization application records across all tenants
   * Use this for one-time cleanup or maintenance
   */
  static async cleanupAllDuplicateApplications() {
    try {
      console.log(`🌍 Starting system-wide duplicate application cleanup...`);
      
      // Find all duplicates across all tenants using Drizzle ORM
      const duplicates = await db
        .select({
          id: organizationApplications.id,
          tenantId: organizationApplications.tenantId,
          appCode: applications.appCode
        })
        .from(organizationApplications)
        .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
        .where(sql`(
          SELECT COUNT(*) 
          FROM organization_applications oa2 
          WHERE oa2.tenant_id = organization_applications.tenant_id 
          AND oa2.app_id = organization_applications.app_id
        ) > 1`)
        .orderBy(organizationApplications.tenantId, applications.appCode);
      
      if (duplicates && duplicates.length > 0) {
        console.log(`🗑️ Found ${duplicates.length} duplicate records across all tenants`);
        
        // Group duplicates by tenant for better logging
        const duplicatesByTenant = duplicates.reduce((acc, row) => {
          if (!acc[row.tenantId]) {
            acc[row.tenantId] = [];
          }
          acc[row.tenantId].push({ id: row.id, appCode: row.appCode });
          return acc;
        }, {});
        
        // Log summary by tenant
        Object.entries(duplicatesByTenant).forEach(([tenantId, apps]) => {
          console.log(`   📊 Tenant ${tenantId}: ${apps.length} duplicate app records`);
        });
        
        // Delete all duplicates using Drizzle ORM
        const duplicateIds = duplicates.map(row => row.id);
        
        // Use a more targeted approach to delete duplicates
        for (const duplicate of duplicates) {
          // Find the first record for this tenant/app combination (keep the oldest)
          const [firstRecord] = await db
            .select({ id: organizationApplications.id })
            .from(organizationApplications)
            .where(and(
              eq(organizationApplications.tenantId, duplicate.tenantId),
              eq(organizationApplications.appId, 
                db.select({ appId: applications.appId })
                  .from(applications)
                  .where(eq(applications.appCode, duplicate.appCode))
                  .limit(1)
              )
            ))
            .orderBy(organizationApplications.createdAt)
            .limit(1);
          
          if (firstRecord && firstRecord.id !== duplicate.id) {
            // Delete this duplicate record
            await db
              .delete(organizationApplications)
              .where(eq(organizationApplications.id, duplicate.id));
          }
        }
        
        console.log(`✅ Successfully removed ${duplicates.length} duplicate records`);
        
        return { 
          cleaned: true, 
          removedCount: duplicates.length,
          tenantsAffected: Object.keys(duplicatesByTenant).length,
          summary: duplicatesByTenant
        };
      } else {
        console.log(`✅ No duplicates found across all tenants`);
        return { cleaned: false, removedCount: 0, tenantsAffected: 0 };
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup all duplicate applications:`, error);
      throw error;
    }
  }
  
  /**
   * 🔍 **VALIDATE ORGANIZATION SETUP**
   * Checks for any inconsistencies in organization application setup
   */
  static async validateOrganizationSetup(tenantId) {
    try {
      console.log(`🔍 Validating organization setup for tenant ${tenantId}...`);
      
      // Check for duplicates using Drizzle ORM
      const duplicates = await db
        .select({
          appId: organizationApplications.appId,
          appCode: applications.appCode,
          recordCount: count()
        })
        .from(organizationApplications)
        .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
        .where(eq(organizationApplications.tenantId, tenantId))
        .groupBy(organizationApplications.appId, applications.appCode)
        .having(sql`COUNT(*) > 1`);
      
      // Check for orphaned records using Drizzle ORM
      const orphaned = await db
        .select({
          id: organizationApplications.id,
          appId: organizationApplications.appId
        })
        .from(organizationApplications)
        .leftJoin(applications, eq(organizationApplications.appId, applications.appId))
        .where(and(
          eq(organizationApplications.tenantId, tenantId),
          sql`applications.app_id IS NULL`
        ));
      
      // Check for inconsistent subscription tiers using Drizzle ORM
      const inconsistentTiers = await db
        .select({
          subscriptionTier: organizationApplications.subscriptionTier,
          appCount: count()
        })
        .from(organizationApplications)
        .where(eq(organizationApplications.tenantId, tenantId))
        .groupBy(organizationApplications.subscriptionTier)
        .having(sql`COUNT(*) > 0`);
      
      const issues = [];
      
      if (duplicates && duplicates.length > 0) {
        issues.push({
          type: 'duplicates',
          count: duplicates.length,
          details: duplicates.map(row => ({
            appCode: row.appCode,
            recordCount: row.recordCount
          }))
        });
      }
      
      if (orphaned && orphaned.length > 0) {
        issues.push({
          type: 'orphaned',
          count: orphaned.length,
          details: orphaned.map(row => ({ id: row.id, appId: row.appId }))
        });
      }
      
      if (inconsistentTiers && inconsistentTiers.length > 1) {
        issues.push({
          type: 'inconsistent_tiers',
          count: inconsistentTiers.length,
          details: inconsistentTiers.map(row => ({
            tier: row.subscriptionTier,
            appCount: row.appCount
          }))
        });
      }
      
      const isValid = issues.length === 0;
      
      console.log(`🔍 Validation ${isValid ? '✅ PASSED' : '❌ FAILED'}: ${issues.length} issues found`);
      
      return {
        isValid,
        issues,
        summary: {
          totalIssues: issues.length,
          hasDuplicates: issues.some(i => i.type === 'duplicates'),
          hasOrphaned: issues.some(i => i.type === 'orphaned'),
          hasInconsistentTiers: issues.some(i => i.type === 'inconsistent_tiers')
        }
      };
    } catch (error) {
      console.error(`❌ Failed to validate organization setup:`, error);
      return {
        isValid: false,
        error: error.message,
        issues: []
      };
    }
  }
  
  /**
   * Get all module codes for an application by app code
   */
  static async getAllModulesForAppCode(appCode) {
    try {
      const modules = await db
        .select({ moduleCode: applicationModules.moduleCode })
        .from(applicationModules)
        .innerJoin(applications, eq(applicationModules.appId, applications.appId))
        .where(eq(applications.appCode, appCode));
      
      return modules.map(m => m.moduleCode);
    } catch (error) {
      console.error(`Failed to get modules for app ${appCode}:`, error);
      return [];
    }
  }
  
  /**
   * Verify organization application setup
   */
  static async verifyOrganizationSetup(tenantId) {
    try {
      const orgApps = await db
        .select({
          appCode: applications.appCode,
          appName: applications.appName,
          enabledModules: organizationApplications.enabledModules,
          isEnabled: organizationApplications.isEnabled,
          subscriptionTier: organizationApplications.subscriptionTier
        })
        .from(organizationApplications)
        .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
        .where(and(
          eq(organizationApplications.tenantId, tenantId),
          eq(organizationApplications.isEnabled, true)
        ));
      
      console.log(`🔍 Verification for tenant ${tenantId}:`);
      console.log(`   ✅ Has access to ${orgApps.length} applications`);
      
      orgApps.forEach(app => {
        const moduleCount = Array.isArray(app.enabledModules) ? app.enabledModules.length : 0;
        console.log(`   📦 ${app.appName}: ${moduleCount} modules (${app.subscriptionTier} tier)`);
      });
      
      return {
        success: true,
        applicationsCount: orgApps.length,
        applications: orgApps
      };
      
    } catch (error) {
      console.error(`Failed to verify organization setup for tenant ${tenantId}:`, error);
      return { success: false, error: error.message };
    }
  }
} 