// Fix the starter plan tenant with correct modules and permissions
async function fixStarterPlan() {
  try {
    console.log('🔧 Fixing starter plan tenant organization applications...\n');

    const tenantId = '29cc915c-0663-43bf-ac2e-557f8edefbad';
    const planId = 'starter';

    // Import the service class
    const { OnboardingOrganizationSetupService } = await import('./backend/src/services/onboarding-organization-setup.js');

    console.log('🔄 Updating starter plan organization applications with correct modules and permissions...');
    const result = await OnboardingOrganizationSetupService.updateOrganizationApplicationsForPlanChange(
      tenantId,
      planId,
      { skipIfRecentlyUpdated: false }
    );

    console.log('✅ Starter plan organization applications fixed:');
    console.log('   - subscription_tier: starter');
    console.log('   - enabled_modules:', result.modulesEnabled);
    console.log('   - custom_permissions: Updated from PLAN_ACCESS_MATRIX');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Full error:', error);
  }
}

fixStarterPlan();
