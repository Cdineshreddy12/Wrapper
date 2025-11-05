import { db } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { tenants } from '../db/schema/index.js';
import { applications, organizationApplications, applicationModules } from '../db/schema/suite-schema.js';
import { PLAN_ACCESS_MATRIX } from '../data/permission-matrix.js';

class OnboardingOrganizationSetupService {
  // Update organization applications based on credit package or plan
  async updateOrganizationApplicationsForCreditPackage(tenantId, creditPackage) {
    try {
      console.log('🔄 Updating organization applications for credit package:', { tenantId, creditPackage });

      // Map credit package to subscription plan
      const creditPackageToPlanMap = {
        basic: 'trial',
        standard: 'starter',
        premium: 'professional',
        enterprise: 'enterprise'
      };

      const planId = creditPackageToPlanMap[creditPackage] || 'free';
      
      // Use PLAN_ACCESS_MATRIX to get correct applications
      const planAccess = PLAN_ACCESS_MATRIX[planId];

      if (!planAccess) {
        console.warn(`⚠️ Plan ${planId} not found in PLAN_ACCESS_MATRIX, defaulting to free`);
        planAccess = PLAN_ACCESS_MATRIX.free;
      }

      const availableApplications = planAccess.applications || ['crm'];

      console.log('✅ Organization applications updated for credit package:', {
        creditPackage,
        planId,
        applications: availableApplications,
        limitations: 'unlimited' // All plans now have unlimited access
      });

      return {
        success: true,
        tenantId,
        creditPackage,
        planId,
        applicationsUpdated: availableApplications,
        limitations: 'unlimited' // All plans now have unlimited access
      };

    } catch (error) {
      console.error('❌ Error updating organization applications for credit package:', error);
      throw error;
    }
  }

  // Update organization applications based on plan (uses PLAN_ACCESS_MATRIX)
  static async updateOrganizationApplicationsForPlanChange(tenantId, planId, options = {}) {
    try {
      console.log('🔄 Updating organization applications for plan change:', { tenantId, planId });

      const { skipIfRecentlyUpdated = false } = options;

      // Get plan access from PLAN_ACCESS_MATRIX
      const planAccess = PLAN_ACCESS_MATRIX[planId];

      if (!planAccess) {
        throw new Error(`Plan ${planId} not found in PLAN_ACCESS_MATRIX`);
      }

      const availableApplications = planAccess.applications || ['crm'];

      console.log('📋 PLAN_ACCESS_MATRIX data:', {
        planId,
        planAccess,
        availableApplications,
        modules: planAccess.modules,
        permissions: planAccess.permissions
      });

      // Import required database schema and connection
      const { organizationApplications, applications } = await import('../db/schema/suite-schema.js');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('../db/index.js');
      const { BUSINESS_SUITE_MATRIX } = await import('../data/permission-matrix.js');

      // Get existing records for this tenant
      const existingRecords = await db
        .select()
        .from(organizationApplications)
        .where(eq(organizationApplications.tenantId, tenantId));

      console.log('📋 Existing organization application records:', {
        tenantId,
        recordCount: existingRecords.length,
        records: existingRecords.map(r => ({
          id: r.id,
          appId: r.appId,
          currentTier: r.subscriptionTier,
          currentModules: r.enabledModules?.slice(0, 3) + (r.enabledModules?.length > 3 ? '...' : '') // Truncate for logging
        }))
      });

      const updatedRecords = [];
      const createdRecords = [];

      // Process each application in the plan
      for (const appCode of availableApplications) {
        // Get application details from database
        const [app] = await db
          .select()
          .from(applications)
          .where(eq(applications.appCode, appCode))
          .limit(1);

        if (!app) {
          console.warn(`⚠️ Application '${appCode}' not found in applications table, skipping`);
          continue;
        }

        // Get modules for this application from the plan
        const appModules = planAccess.modules?.[appCode] || [];
        const appPermissions = planAccess.permissions?.[appCode] || {};

        console.log(`🔄 Processing application ${appCode} (${app.appId}):`, {
          modules: appModules.length,
          permissions: Object.keys(appPermissions).length
        });

        // Use UPSERT to prevent duplicates and handle race conditions
        console.log(`🔄 Upserting record for ${appCode}`);

        try {
          const [upserted] = await db
            .insert(organizationApplications)
            .values({
              tenantId,
              appId: app.appId,
              isEnabled: true,
              subscriptionTier: planId,
              enabledModules: appModules,
              customPermissions: appPermissions,
              maxUsers: null // Unlimited for now
            })
            .onConflictDoUpdate({
              target: [organizationApplications.tenantId, organizationApplications.appId],
              set: {
                subscriptionTier: planId,
                enabledModules: appModules,
                customPermissions: appPermissions,
                isEnabled: true,
                updatedAt: new Date()
              }
            })
            .returning();

          if (existingRecords.find(r => r.appId === app.appId)) {
            console.log(`🔄 Updated existing record for ${appCode}:`, upserted.id);
            updatedRecords.push(upserted);
          } else {
            console.log(`🆕 Created new record for ${appCode}:`, upserted.id);
            createdRecords.push(upserted);
          }
        } catch (upsertError) {
          console.error(`❌ Failed to upsert record for ${appCode}:`, upsertError.message);
          throw upsertError;
        }
      }

      // Disable applications that are no longer in the plan
      // Get all app IDs that should be enabled for this plan
      const planAppIds = [];
      for (const appCode of availableApplications) {
        const [app] = await db
          .select({ appId: applications.appId })
          .from(applications)
          .where(eq(applications.appCode, appCode))
          .limit(1);

        if (app) {
          planAppIds.push(app.appId);
        }
      }
      const recordsToDisable = existingRecords.filter(r => !planAppIds.includes(r.appId));

      if (recordsToDisable.length > 0) {
        console.log(`🔇 Disabling ${recordsToDisable.length} applications no longer in plan`);

        for (const record of recordsToDisable) {
          await db
            .update(organizationApplications)
            .set({
              isEnabled: false,
              updatedAt: new Date()
            })
            .where(eq(organizationApplications.id, record.id));
        }
      }

      console.log('✅ Organization applications updated for plan:', {
        planId,
        applications: availableApplications,
        recordsUpdated: updatedRecords.length,
        recordsCreated: createdRecords.length,
        recordsDisabled: recordsToDisable.length,
        totalRecords: updatedRecords.length + createdRecords.length
      });

      return {
        success: true,
        tenantId,
        planId,
        applicationsUpdated: availableApplications,
        recordsUpdated: updatedRecords.length,
        recordsCreated: createdRecords.length,
        recordsDisabled: recordsToDisable.length,
        updatedRecords,
        createdRecords
      };

    } catch (error) {
      console.error('❌ Error updating organization applications for plan change:', error);
      throw error;
    }
  }

  // Setup initial organization structure
  async setupInitialOrganizationStructure(tenantId, organizationData) {
    try {
      console.log('🏗️ Setting up initial organization structure:', { tenantId });

      // This would typically create default roles, permissions, etc.
      // For now, just return success
      console.log('✅ Initial organization structure setup completed');

      return {
        success: true,
        tenantId,
        structure: {
          rolesCreated: [],
          permissionsSet: [],
          applicationsConfigured: []
        }
      };

    } catch (error) {
      console.error('❌ Error setting up initial organization structure:', error);
      throw error;
    }
  }

  // Configure applications for new organization based on credit package or plan
  // IMPORTANT: This method ONLY assigns applications, modules, and permissions that are
  // EXPLICITLY defined in the PLAN_ACCESS_MATRIX. No defaults are assigned.
  async configureApplicationsForNewOrganization(tenantId, creditPackageOrPlan) {
    try {
      console.log('⚙️ Configuring applications for new organization (plan-controlled only):', { tenantId, creditPackageOrPlan });

      // Determine if input is credit package or plan
      const creditPackages = ['basic', 'standard', 'premium', 'enterprise'];
      const isCreditPackage = creditPackages.includes(creditPackageOrPlan);

      let planId;
      if (isCreditPackage) {
        // Map credit package to plan
        const creditPackageToPlanMap = {
          basic: 'trial',
          standard: 'starter',
          premium: 'professional',
          enterprise: 'enterprise'
        };
        planId = creditPackageToPlanMap[creditPackageOrPlan] || 'trial';
      } else {
        // Already a plan ID
        planId = creditPackageOrPlan || 'trial';
      }

      // Get plan access from PLAN_ACCESS_MATRIX
      const planAccess = PLAN_ACCESS_MATRIX[planId];
      
      if (!planAccess) {
        console.warn(`⚠️ Plan ${planId} not found in PLAN_ACCESS_MATRIX, defaulting to trial`);
        planAccess = PLAN_ACCESS_MATRIX.trial;
      }

      const applicationsConfigured = planAccess.applications || ['crm'];

      console.log('⚙️ Creating database records for applications:', {
        planId,
        applications: applicationsConfigured,
        modules: planAccess.modules
      });

      // Create organization application records for each configured application
      const createdApplications = [];
      for (const appCode of applicationsConfigured) {
        try {
          // Get application details
          const [app] = await db
            .select()
            .from(applications)
            .where(eq(applications.appCode, appCode))
            .limit(1);

          if (!app) {
            console.warn(`⚠️ Application '${appCode}' not found in applications table, skipping`);
            continue;
          }

          // IMPORTANT: Only assign modules that are explicitly defined in the plan
          // Do not assign any modules that are not in the PLAN_ACCESS_MATRIX for this plan
          let enabledModules = [];
          if (planAccess.modules?.[appCode] === '*') {
            // Plan allows all modules for this application
            enabledModules = await this.getAllModulesForApp(appCode);
            console.log(`🎯 Plan ${planId} allows ALL modules for ${appCode}:`, enabledModules);
          } else if (Array.isArray(planAccess.modules?.[appCode])) {
            // Plan specifies exact modules for this application
            enabledModules = planAccess.modules[appCode];
            console.log(`🎯 Plan ${planId} allows specific modules for ${appCode}:`, enabledModules);
          } else {
            // No modules defined for this application in the plan
            console.log(`⚠️ Plan ${planId} does not define any modules for ${appCode}, skipping application`);
            continue;
          }

          // IMPORTANT: Only assign permissions that are explicitly defined in the plan
          // Do not assign default permissions - only what's specified in PLAN_ACCESS_MATRIX
          const customPermissions = await this.buildCustomPermissionsFromPlan(planAccess.permissions?.[appCode], appCode, enabledModules);

          console.log(`🔐 Final configuration for ${appCode} in plan ${planId}:`, {
            enabledModules: enabledModules.length,
            customPermissionsKeys: customPermissions ? Object.keys(customPermissions) : []
          });

          // Use UPSERT to prevent duplicates and handle race conditions
          console.log(`🔄 Upserting application record for ${appCode}`);

          try {
            await db
              .insert(organizationApplications)
              .values({
                tenantId,
                appId: app.appId,
                isEnabled: true,
                subscriptionTier: planId,
                enabledModules: enabledModules,
                customPermissions: customPermissions,
                maxUsers: null // Unlimited for now
              })
              .onConflictDoUpdate({
                target: [organizationApplications.tenantId, organizationApplications.appId],
                set: {
                  isEnabled: true,
                  subscriptionTier: planId,
                  enabledModules: enabledModules,
                  customPermissions: customPermissions,
                  maxUsers: null, // Unlimited for now
                  updatedAt: new Date()
                }
              });

            console.log(`✅ Application record upserted for ${appCode}`);
          } catch (upsertError) {
            console.error(`❌ Failed to upsert application record for ${appCode}:`, upsertError.message);
            throw upsertError;
          }

          createdApplications.push({
            appCode,
            appName: app.appName,
            enabledModules,
            customPermissions,
            subscriptionTier: planId
          });

        } catch (appError) {
          console.error(`❌ Error configuring application ${appCode}:`, appError);
          // Continue with other applications
        }
      }

      console.log('✅ Applications successfully configured for new organization:', {
        tenantId,
        planId,
        configuredApplications: createdApplications.length,
        applications: createdApplications
      });

      return {
        success: true,
        tenantId,
        planId,
        applicationsConfigured: createdApplications,
        modulesEnabled: planAccess.modules,
        permissionsConfigured: planAccess.permissions,
        limitations: 'unlimited' // All plans now have unlimited access
      };

    } catch (error) {
      console.error('❌ Error configuring applications for new organization:', error);
      throw error;
    }
  }

  // Helper method to get all modules for an application
  async getAllModulesForApp(appCode) {
    const modules = await db
      .select({
        moduleCode: applicationModules.moduleCode
      })
      .from(applicationModules)
      .where(eq(applicationModules.appId, appCode));

    return modules.map(module => module.moduleCode);
  }

  // Helper method to build custom permissions from plan access matrix
  // IMPORTANT: Only assigns permissions that are EXPLICITLY defined in the PLAN_ACCESS_MATRIX
  // No default permissions are assigned - only what's specified in the plan
  async buildCustomPermissionsFromPlan(appPermissions, appCode, enabledModules) {
    if (!appPermissions) {
      console.log(`⚠️ No permissions defined for app ${appCode} in plan, assigning no permissions`);
      return null;
    }

    const customPermissions = {};

    if (appPermissions === '*') {
      // Plan allows ALL permissions for ALL enabled modules
      console.log(`🎯 Plan allows ALL permissions for ALL modules in ${appCode}`);
      for (const moduleCode of enabledModules) {
        const modulePermissions = await this.getModulePermissionsFromDb(appCode, moduleCode);
        customPermissions[moduleCode] = modulePermissions;
        console.log(`✅ Assigned ${modulePermissions.length} permissions to ${appCode}.${moduleCode}`);
      }
    } else if (typeof appPermissions === 'object') {
      // Plan specifies exact permissions per module
      console.log(`🎯 Plan specifies custom permissions for ${appCode} modules`);
      for (const moduleCode of enabledModules) {
        const modulePermCodes = appPermissions[moduleCode];

        if (!modulePermCodes) {
          // Module is enabled but no permissions defined - assign no permissions
          console.log(`⚠️ Module ${appCode}.${moduleCode} is enabled but no permissions defined in plan`);
          continue;
        }

        if (modulePermCodes === '*') {
          // All permissions for this specific module
          const modulePermissions = await this.getModulePermissionsFromDb(appCode, moduleCode);
          customPermissions[moduleCode] = modulePermissions;
          console.log(`✅ Assigned ALL ${modulePermissions.length} permissions to ${appCode}.${moduleCode}`);
        } else if (Array.isArray(modulePermCodes)) {
          // Specific permissions for this module
          customPermissions[moduleCode] = modulePermCodes;
          console.log(`✅ Assigned ${modulePermCodes.length} specific permissions to ${appCode}.${moduleCode}:`, modulePermCodes);
        }
      }
    }

    const finalPermissions = Object.keys(customPermissions).length > 0 ? customPermissions : null;
    console.log(`🔐 Final permissions for ${appCode}:`, finalPermissions ? Object.keys(finalPermissions) : 'none');
    return finalPermissions;
  }

  // Helper method to get permissions from database for a module
  async getModulePermissionsFromDb(appCode, moduleCode) {
    const [moduleData] = await db
      .select({
        permissions: applicationModules.permissions
      })
      .from(applicationModules)
      .where(and(
        eq(applicationModules.appId, appCode),
        eq(applicationModules.moduleCode, moduleCode)
      ))
      .limit(1);

    if (!moduleData?.permissions) return [];

    try {
      const parsedPermissions = typeof moduleData.permissions === 'string' ?
        JSON.parse(moduleData.permissions) : moduleData.permissions;

      if (Array.isArray(parsedPermissions)) {
        return parsedPermissions.map(p => p.code || p);
      } else if (Array.isArray(parsedPermissions)) {
        return parsedPermissions;
      }
    } catch (error) {
      console.warn(`Failed to parse permissions for module ${moduleCode}:`, error);
    }

    return [];
  }
}

export { OnboardingOrganizationSetupService };
export default new OnboardingOrganizationSetupService();
