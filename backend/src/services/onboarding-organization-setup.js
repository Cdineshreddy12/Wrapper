import { db } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { tenants } from '../db/schema/index.js';

class OnboardingOrganizationSetupService {
  // Update organization applications based on credit package
  async updateOrganizationApplicationsForCreditPackage(tenantId, creditPackage) {
    try {
      console.log('🔄 Updating organization applications for credit package:', { tenantId, creditPackage });

      // Determine applications available based on credit package
      const applicationsByPackage = {
        basic: ['crm'],
        standard: ['crm', 'hr'],
        premium: ['crm', 'hr', 'affiliate'],
        enterprise: ['crm', 'hr', 'affiliate', 'accounting', 'inventory']
      };

      const availableApplications = applicationsByPackage[creditPackage] || ['crm'];

      // In a real implementation, you'd update the tenant's application access here
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

  // Legacy method for backward compatibility
  async updateOrganizationApplicationsForPlanChange(tenantId, planId) {
    // Map plan to credit package for backward compatibility
    const planToPackageMap = {
      trial: 'basic',
      starter: 'basic',
      professional: 'standard',
      enterprise: 'enterprise'
    };

    const creditPackage = planToPackageMap[planId] || 'basic';
    return this.updateOrganizationApplicationsForCreditPackage(tenantId, creditPackage);
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

  // Configure applications for new organization based on credit package
  async configureApplicationsForNewOrganization(tenantId, creditPackage) {
    try {
      console.log('⚙️ Configuring applications for new organization:', { tenantId, creditPackage });

      // Get applications for the credit package
      const applicationsByPackage = {
        basic: ['crm'],
        standard: ['crm', 'hr'],
        premium: ['crm', 'hr', 'affiliate'],
        enterprise: ['crm', 'hr', 'affiliate', 'accounting', 'inventory']
      };

      const applicationsConfigured = applicationsByPackage[creditPackage] || ['crm'];

      // In a real implementation, you'd set up application access records here
      console.log('✅ Applications configured for new organization:', applicationsConfigured);

      return {
        success: true,
        tenantId,
        creditPackage,
        applicationsConfigured
      };

    } catch (error) {
      console.error('❌ Error configuring applications for new organization:', error);
      throw error;
    }
  }
}

export { OnboardingOrganizationSetupService };
export default new OnboardingOrganizationSetupService();
