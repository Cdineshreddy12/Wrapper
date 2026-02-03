import { db, systemDbConnection } from '../../../db/index.js';
import { eq, and } from 'drizzle-orm';
import { tenants } from '../../../db/schema/index.js';
import { applications, organizationApplications, applicationModules } from '../../../db/schema/suite-schema.js';
import { v4 as uuidv4 } from 'uuid';

class OnboardingOrganizationSetupService {
  // Update organization applications based on credit package (legacy; no DB writes)
  async updateOrganizationApplicationsForCreditPackage(tenantId, creditPackage) {
    try {
      console.log('🔄 Updating organization applications for credit package:', { tenantId, creditPackage });

      const applicationsByPackage = {
        basic: ['crm'],
        standard: ['crm', 'hr'],
        premium: ['crm', 'hr', 'affiliate'],
        enterprise: ['crm', 'hr', 'affiliate', 'accounting', 'inventory']
      };

      const availableApplications = applicationsByPackage[creditPackage] || ['crm'];
      console.log('✅ Organization applications updated for credit package:', availableApplications);

      return {
        success: true,
        tenantId,
        creditPackage,
        applicationsUpdated: availableApplications
      };
    } catch (error) {
      console.error('❌ Error updating organization applications for credit package:', error);
      throw error;
    }
  }

  /**
   * Assign applications to the tenant based on plan (starter, professional, enterprise).
   * Inserts into organization_applications so the Applications dashboard shows all plan apps (e.g. CRM + HR for Professional).
   */
  async updateOrganizationApplicationsForPlanChange(tenantId, planId, options = {}) {
    const { skipIfRecentlyUpdated } = options;
    try {
      console.log('🔄 Updating organization applications for plan change:', { tenantId, planId });

      const { PLAN_ACCESS_MATRIX } = await import('../../../data/permission-matrix.js');
      const planAccess = PLAN_ACCESS_MATRIX[planId] || PLAN_ACCESS_MATRIX.free;
      const appCodes = planAccess.applications || ['crm'];
      const modulesByApp = planAccess.modules || {};

      const normalizeAppCode = (code) => {
        const codeMap = {
          affiliateconnect: 'affiliateConnect',
          affiliate: 'affiliateConnect',
          project_management: 'project_management',
          projectmanagement: 'project_management'
        };
        return codeMap[String(code).toLowerCase()] || code;
      };

      const resolveAppId = (appCode, map) => {
        const normalized = normalizeAppCode(appCode);
        return map[normalized] ?? map[appCode] ?? map[normalized.replace(/_/g, '')] ?? null;
      };

      const appRecords = await systemDbConnection
        .select({ appId: applications.appId, appCode: applications.appCode })
        .from(applications)
        .where(eq(applications.status, 'active'));

      const appCodeToIdMap = {};
      appRecords.forEach(app => {
        appCodeToIdMap[app.appCode] = app.appId;
      });

      const existing = await systemDbConnection
        .select({ appId: organizationApplications.appId })
        .from(organizationApplications)
        .where(eq(organizationApplications.tenantId, tenantId));
      const existingAppIds = new Set(existing.map(r => r.appId));

      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const applicationsToInsert = [];
      for (const appCode of appCodes) {
        const appId = resolveAppId(appCode, appCodeToIdMap);
        if (!appId) {
          console.warn(`⚠️ Application code "${appCode}" not found in applications table. Skipping. Available: ${Object.keys(appCodeToIdMap).join(', ')}`);
          continue;
        }
        if (existingAppIds.has(appId)) {
          continue;
        }
        let enabledModules = modulesByApp[appCode] || [];
        if (enabledModules === '*') {
          const allModules = await systemDbConnection
            .select({ moduleCode: applicationModules.moduleCode })
            .from(applicationModules)
            .where(eq(applicationModules.appId, appId));
          enabledModules = allModules.map(m => m.moduleCode);
        }
        applicationsToInsert.push({
          id: uuidv4(),
          tenantId,
          appId,
          subscriptionTier: planId,
          isEnabled: true,
          enabledModules: Array.isArray(enabledModules) ? enabledModules : [],
          expiresAt: expiryDate
        });
        console.log(`✅ Will assign application ${appCode} (${appId}) to tenant ${tenantId}`);
      }

      if (applicationsToInsert.length > 0) {
        await systemDbConnection
          .insert(organizationApplications)
          .values(applicationsToInsert);
        console.log(`✅ Assigned ${applicationsToInsert.length} application(s) for plan ${planId} to tenant ${tenantId}`);
      } else {
        console.log(`ℹ️ No new applications to assign for plan ${planId} (tenant already has plan apps).`);
      }

      return {
        success: true,
        tenantId,
        planId,
        applicationsAssigned: applicationsToInsert.length,
        applicationsInPlan: appCodes
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

  // Configure applications for new organization based on credit package with modules from permission matrix
  async configureApplicationsForNewOrganization(tenantId, creditPackage, organizationId = null) {
    try {
      console.log('⚙️ Configuring applications for new organization:', { tenantId, creditPackage, organizationId });

      // Import permission matrix to get plan-based modules
      const { PLAN_ACCESS_MATRIX } = await import('../../../data/permission-matrix.js');
      const planAccess = PLAN_ACCESS_MATRIX[creditPackage];
      
      if (!planAccess) {
        throw new Error(`Plan ${creditPackage} not found in PLAN_ACCESS_MATRIX`);
      }

      // Get applications and modules from permission matrix
      const appCodes = planAccess.applications || [];
      const modulesByApp = planAccess.modules || {};
      
      console.log(`📋 Assigning applications for ${creditPackage} plan:`, appCodes);
      console.log(`📋 Modules per application:`, modulesByApp);

      // Normalize app codes to match database (case-insensitive matching)
      const normalizeAppCode = (code) => {
        const codeMap = {
          'affiliateconnect': 'affiliateConnect',
          'affiliate': 'affiliateConnect'
        };
        return codeMap[code.toLowerCase()] || code;
      };

      // Get application IDs from app codes
      const appRecords = await systemDbConnection
        .select({ appId: applications.appId, appCode: applications.appCode })
        .from(applications)
        .where(eq(applications.status, 'active'));

      const appCodeToIdMap = {};
      appRecords.forEach(app => {
        appCodeToIdMap[app.appCode] = app.appId;
      });

      // Calculate expiry date (1 year from now for free plan, or based on plan)
      const expiryDate = new Date();
      const expiryMonths = creditPackage === 'free' ? 12 : (creditPackage === 'enterprise' ? 24 : 12);
      expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

      // Insert organization applications with enabled modules from permission matrix
      const applicationsToInsert = [];
      for (const appCode of appCodes) {
        const normalizedCode = normalizeAppCode(appCode);
        const appId = appCodeToIdMap[normalizedCode];
        if (appId) {
          // Get enabled modules for this application from permission matrix
          const enabledModules = modulesByApp[appCode] || [];
          
          // If modules is '*', get all modules for this app (for enterprise plan)
          let finalEnabledModules = enabledModules;
          if (enabledModules === '*') {
            // Get all modules for this application from application_modules table
            const { applicationModules } = await import('../../../db/schema/suite-schema.js');
            const allModules = await systemDbConnection
              .select({ moduleCode: applicationModules.moduleCode })
              .from(applicationModules)
              .where(eq(applicationModules.appId, appId));
            finalEnabledModules = allModules.map(m => m.moduleCode);
          }
          
          applicationsToInsert.push({
            id: uuidv4(),
            tenantId,
            appId,
            subscriptionTier: creditPackage,
            isEnabled: true,
            enabledModules: finalEnabledModules, // CRITICAL FIX: Populate from permission matrix
            customPermissions: {},
            expiresAt: expiryDate
          });
          
          console.log(`✅ Application ${appCode} configured with modules:`, finalEnabledModules);
        } else {
          console.warn(`⚠️ Application with code ${normalizedCode} (original: ${appCode}) not found in database. Available apps:`, Object.keys(appCodeToIdMap));
        }
      }

      if (applicationsToInsert.length > 0) {
        await systemDbConnection
          .insert(organizationApplications)
          .values(applicationsToInsert);
        
        console.log(`✅ Successfully assigned ${applicationsToInsert.length} applications with modules to tenant ${tenantId}`);
      } else {
        console.warn(`⚠️ No applications were assigned to tenant ${tenantId}`);
      }

      return {
        success: true,
        tenantId,
        creditPackage,
        applicationsConfigured: appCodes,
        applicationsAssigned: applicationsToInsert.length,
        modulesConfigured: applicationsToInsert.reduce((acc, app) => {
          acc[app.appId] = app.enabledModules;
          return acc;
        }, {})
      };

    } catch (error) {
      console.error('❌ Error configuring applications for new organization:', error);
      throw error;
    }
  }
}

export { OnboardingOrganizationSetupService };
export default new OnboardingOrganizationSetupService();
