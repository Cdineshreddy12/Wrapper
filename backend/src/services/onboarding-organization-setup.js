import { db } from '../db/index.js';
import { 
  applications, 
  organizationApplications, 
  applicationModules 
} from '../db/schema/suite-schema.js';
import { eq, and } from 'drizzle-orm';
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
   * Update organization applications when plan changes (with idempotency)
   */
  static async updateOrganizationApplicationsForPlanChange(tenantId, newPlan, options = {}) {
    const { skipIfRecentlyUpdated = true, forceUpdate = false } = options;
    
    return await db.transaction(async (tx) => {
      try {
        console.log(`🔄 Updating organization applications for tenant ${tenantId} to ${newPlan} plan...`);
        
        // Check if this update was recently performed (idempotency check)
        if (skipIfRecentlyUpdated && !forceUpdate) {
          const recentUpdate = await tx
            .select()
            .from(organizationApplications)
            .where(and(
              eq(organizationApplications.tenantId, tenantId),
              eq(organizationApplications.subscriptionTier, newPlan)
            ))
            .limit(1);
            
          if (recentUpdate.length > 0) {
            const lastUpdate = new Date(recentUpdate[0].updatedAt);
            const timeSinceUpdate = Date.now() - lastUpdate.getTime();
            
            // If updated within last 5 minutes, skip
            if (timeSinceUpdate < 5 * 60 * 1000) {
              console.log(`⏭️ Skipping update - recently updated ${Math.round(timeSinceUpdate/1000)}s ago`);
              return { skipped: true, reason: 'recently_updated' };
            }
          }
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
        
        // First, update subscription tier for all existing organization applications
        await tx
          .update(organizationApplications)
          .set({
            subscriptionTier: newPlan,
            maxUsers: planAccess.limitations.users === -1 ? null : planAccess.limitations.users,
            updatedAt: new Date()
          })
          .where(eq(organizationApplications.tenantId, tenantId));
        
        console.log(`🏢 Updated existing organization applications to ${newPlan} plan`);
      
        // Process each application that should be available in the new plan
        for (const app of enabledApps) {
          try {
            // Determine enabled modules for this app based on plan
            const enabledModules = planAccess.modules[app.appCode] || [];
            const moduleList = enabledModules === '*' 
              ? await this.getAllModulesForApp(app.appId)
              : enabledModules;
            
            console.log(`📦 Processing ${app.appName}: modules [${moduleList.join(', ')}]`);
            
            // Check if organization application record already exists
            const [existingOrgApp] = await tx
              .select()
              .from(organizationApplications)
              .where(and(
                eq(organizationApplications.tenantId, tenantId),
                eq(organizationApplications.appId, app.appId)
              ))
              .limit(1);
            
            if (existingOrgApp) {
              // Update existing record with new modules and settings
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
              // Use INSERT ... ON CONFLICT to prevent duplicates
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
                    licenseCount: 1
                  });
            
                            console.log(`   ➕ Granted NEW access to: ${app.appName}`);
              } catch (insertError) {
                // If insert fails due to duplicate, try to update instead
                if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
                  console.log(`   🔄 Duplicate detected, updating instead for: ${app.appName}`);
                  await tx
                    .update(organizationApplications)
                    .set({
                      isEnabled: true,
                      enabledModules: moduleList,
                      subscriptionTier: newPlan,
                      maxUsers: planAccess.limitations.users === -1 ? null : planAccess.limitations.users,
                      updatedAt: new Date()
                    })
                    .where(and(
                      eq(organizationApplications.tenantId, tenantId),
                      eq(organizationApplications.appId, app.appId)
                    ));
                  console.log(`   ✅ Updated duplicate to: ${app.appName}`);
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
      
        // Disable applications that are not included in the new plan (for downgrades)
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
      
        console.log(`✅ Organization applications updated for ${newPlan} plan`);
        return { success: true, plan: newPlan, updated: true };
        
      } catch (error) {
        console.error(`❌ Failed to update organization applications for tenant ${tenantId}:`, error);
        throw error;
      }
    });
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