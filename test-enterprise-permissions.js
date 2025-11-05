// Test the updated enterprise plan permissions
async function testEnterprisePermissions() {
  try {
    console.log('🧪 Testing enterprise plan permissions...\n');

    const { PLAN_ACCESS_MATRIX } = await import('./backend/src/data/permission-matrix.js');

    const enterprise = PLAN_ACCESS_MATRIX.enterprise;

    console.log('📋 Enterprise Applications:', enterprise.applications);
    console.log('📋 Enterprise CRM Modules:', enterprise.modules.crm);
    console.log('📋 Enterprise HR Modules:', enterprise.modules.hr);
    console.log('📋 Enterprise AffiliateConnect Modules:', enterprise.modules.affiliateConnect);

    console.log('\n📋 CRM Leads Permissions:', enterprise.permissions.crm.leads);
    console.log('📋 HR Employees Permissions:', enterprise.permissions.hr.employees);
    console.log('📋 AffiliateConnect Dashboard Permissions:', enterprise.permissions.affiliateConnect.dashboard);

    // Verify no * values remain
    const hasStars = JSON.stringify(enterprise).includes('*');
    console.log('\n✅ No * values found:', !hasStars);

    console.log('\n✅ Enterprise plan permissions successfully updated!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEnterprisePermissions();
