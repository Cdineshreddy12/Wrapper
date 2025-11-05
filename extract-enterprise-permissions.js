// Extract all modules and permissions for enterprise plan
async function extractEnterprisePermissions() {
  try {
    const { BUSINESS_SUITE_MATRIX } = await import('./backend/src/data/permission-matrix.js');

    console.log('🔍 Extracting enterprise plan permissions...\n');

    const result = {
      crm: {
        modules: [],
        permissions: {}
      },
      hr: {
        modules: [],
        permissions: {}
      },
      affiliateConnect: {
        modules: [],
        permissions: {}
      }
    };

    // Extract CRM modules and permissions
    if (BUSINESS_SUITE_MATRIX.crm && BUSINESS_SUITE_MATRIX.crm.modules) {
      Object.keys(BUSINESS_SUITE_MATRIX.crm.modules).forEach(moduleCode => {
        result.crm.modules.push(moduleCode);

        const module = BUSINESS_SUITE_MATRIX.crm.modules[moduleCode];
        if (module.permissions) {
          result.crm.permissions[moduleCode] = module.permissions.map(p => p.code);
        }
      });
    }

    // Extract HR modules and permissions
    if (BUSINESS_SUITE_MATRIX.hr && BUSINESS_SUITE_MATRIX.hr.modules) {
      Object.keys(BUSINESS_SUITE_MATRIX.hr.modules).forEach(moduleCode => {
        result.hr.modules.push(moduleCode);

        const module = BUSINESS_SUITE_MATRIX.hr.modules[moduleCode];
        if (module.permissions) {
          result.hr.permissions[moduleCode] = module.permissions.map(p => p.code);
        }
      });
    }

    // Extract AffiliateConnect modules and permissions
    if (BUSINESS_SUITE_MATRIX.affiliateConnect && BUSINESS_SUITE_MATRIX.affiliateConnect.modules) {
      Object.keys(BUSINESS_SUITE_MATRIX.affiliateConnect.modules).forEach(moduleCode => {
        result.affiliateConnect.modules.push(moduleCode);

        const module = BUSINESS_SUITE_MATRIX.affiliateConnect.modules[moduleCode];
        if (module.permissions) {
          result.affiliateConnect.permissions[moduleCode] = module.permissions.map(p => p.code);
        }
      });
    }

    console.log('📋 CRM Modules:', result.crm.modules);
    console.log('📋 CRM Permissions:', JSON.stringify(result.crm.permissions, null, 2));

    console.log('\n📋 HR Modules:', result.hr.modules);
    console.log('📋 HR Permissions:', JSON.stringify(result.hr.permissions, null, 2));

    console.log('\n📋 AffiliateConnect Modules:', result.affiliateConnect.modules);
    console.log('📋 AffiliateConnect Permissions:', JSON.stringify(result.affiliateConnect.permissions, null, 2));

    return result;

  } catch (error) {
    console.error('❌ Error extracting permissions:', error);
    return null;
  }
}

extractEnterprisePermissions();
