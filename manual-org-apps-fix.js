// Manual fix for organization applications
async function fixOrgApps() {
  try {
    console.log('🔧 Manually fixing organization applications for tenant...\n');

    const tenantId = '29cc915c-0663-43bf-ac2e-557f8edefbad';
    const planId = 'starter';

    // Import the service class
    const { OnboardingOrganizationSetupService } = await import('./backend/src/services/onboarding-organization-setup.js');

    console.log('🔄 Calling updateOrganizationApplicationsForPlanChange...');
    const result = await OnboardingOrganizationSetupService.updateOrganizationApplicationsForPlanChange(
      tenantId,
      planId,
      { skipIfRecentlyUpdated: false }
    );

    console.log('✅ Organization applications fixed:', result);

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Full error:', error);
  }
}

fixOrgApps();
