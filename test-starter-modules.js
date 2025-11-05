// Test what modules the starter plan should have
async function testStarterModules() {
  try {
    console.log('🧪 Testing starter plan module extraction...\n');

    // Import PLAN_ACCESS_MATRIX
    const { PLAN_ACCESS_MATRIX } = await import('./backend/src/data/permission-matrix.js');

    const planId = 'starter';
    const planAccess = PLAN_ACCESS_MATRIX[planId];

    console.log('📋 PLAN_ACCESS_MATRIX for starter:', planAccess);

    // Collect all modules from all applications for this plan
    const allModules = [];
    if (planAccess.modules) {
      Object.values(planAccess.modules).forEach(moduleList => {
        if (Array.isArray(moduleList)) {
          allModules.push(...moduleList);
        } else if (moduleList === '*') {
          // For enterprise plan, we might need to handle this differently
          console.log('Found * modules, skipping');
        }
      });
    }

    console.log('🎯 All modules for starter plan:', allModules);
    console.log('📊 Unique modules (no duplicates):', [...new Set(allModules)]);
    console.log('📊 Total modules count:', allModules.length);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStarterModules();
