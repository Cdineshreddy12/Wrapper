// Test the organization applications logic
async function testOrgAppsLogic() {
  try {
    console.log('🧪 Testing organization applications logic...\n');

    // Import the service
    const { OnboardingOrganizationSetupService } = await import('./backend/src/services/onboarding-organization-setup.js');

    // Test with a known tenant that has starter plan
    const tenantId = '29cc915c-0663-43bf-ac2e-557f8edefbad';
    const planId = 'starter';

    console.log(`Testing tenant ${tenantId} with plan ${planId}...\n`);

    // Call the update method
    const result = await OnboardingOrganizationSetupService.updateOrganizationApplicationsForPlanChange(
      tenantId,
      planId,
      { skipIfRecentlyUpdated: false }
    );

    console.log('\n✅ Test completed successfully!');
    console.log('Result:', result);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testOrgAppsLogic();
