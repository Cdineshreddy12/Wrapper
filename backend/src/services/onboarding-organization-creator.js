/**
 * Onboarding Organization Creator Service
 * Handles automatic parent organization creation during onboarding
 */

export class OnboardingOrganizationCreator {

  /**
   * Create parent organization during onboarding
   * @param {Object} params - Organization creation parameters
   * @param {string} params.companyName - Company name from onboarding
   * @param {string} params.tenantId - Tenant ID
   * @param {string} params.adminUserId - Admin user ID
   * @param {string} params.gstin - Optional GSTIN
   * @returns {Promise<Object>} Created organization result
   */
  static async createParentOrganizationForOnboarding({
    companyName,
    tenantId,
    adminUserId,
    gstin = null
  }) {
    try {
      console.log('🏢 Creating parent organization for onboarding...');

      const OrganizationService = (await import('./organization-service.js')).default;

              const orgResult = await OrganizationService.createParentOrganization({
          name: companyName,
          description: `Parent organization for ${companyName}`,
          gstin: gstin || null, // GSTIN is optional during basic onboarding
          parentTenantId: tenantId
        }, adminUserId);

      console.log('✅ Parent organization created during onboarding:', {
        organizationId: orgResult.organization.organizationId,
        organizationName: orgResult.organization.organizationName,
        organizationType: orgResult.organization.organizationType,
        tenantId: tenantId
      });

      return orgResult;
    } catch (error) {
      console.error('❌ Failed to create parent organization during onboarding:', error.message);

      // Return a structured error response instead of throwing
      return {
        success: false,
        error: error.message,
        organization: null,
        message: 'Parent organization creation failed, but onboarding can continue'
      };
    }
  }

  /**
   * Create default locations for a newly created parent organization
   * @param {string} organizationId - Parent organization ID
   * @param {string} organizationName - Organization name for location naming
   * @param {string} createdBy - User who created the organization
   * @returns {Promise<Array>} Created locations
   */
  static async createDefaultLocationsForOrganization(organizationId, organizationName, createdBy) {
    try {
      console.log('📍 Creating default locations for organization...');

      const LocationService = (await import('./location-service.js')).default;

      // Create a default HQ location
      const defaultLocation = await LocationService.createLocation({
        name: `${organizationName} Headquarters`,
        street: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        organizationId: organizationId
      }, createdBy);

      console.log('✅ Default location created:', {
        locationId: defaultLocation.location.locationId,
        locationName: defaultLocation.location.locationName,
        organizationId: organizationId
      });

      return [defaultLocation];
    } catch (error) {
      console.error('❌ Failed to create default locations:', error.message);
      return [];
    }
  }
}

export default OnboardingOrganizationCreator;
