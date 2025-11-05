// Fix existing organization applications records to have correct modules and permissions
async function fixExistingOrgApps() {
  try {
    console.log('🔧 Starting fix for existing organization applications records...\n');

    // Import required modules
    const { organizationApplications } = await import('./backend/src/db/schema/suite-schema.js');
    const { eq } = await import('drizzle-orm');
    const { db } = await import('./backend/src/db/index.js');
    const { PLAN_ACCESS_MATRIX } = await import('./backend/src/data/permission-matrix.js');

    // Get all existing organization application records
    const existingRecords = await db
      .select()
      .from(organizationApplications);

    console.log(`📋 Found ${existingRecords.length} existing organization application records`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const record of existingRecords) {
      try {
        const { id, tenantId, appId, subscriptionTier, enabledModules, customPermissions } = record;

        console.log(`\n🔄 Processing record ${id} for tenant ${tenantId}:`);
        console.log(`   Current tier: ${subscriptionTier}`);
        console.log(`   Current modules: ${JSON.stringify(enabledModules)}`);

        // Get plan access from PLAN_ACCESS_MATRIX
        const planAccess = PLAN_ACCESS_MATRIX[subscriptionTier];

        if (!planAccess) {
          console.warn(`⚠️ Plan ${subscriptionTier} not found in PLAN_ACCESS_MATRIX, skipping record ${id}`);
          continue;
        }

        // Collect all modules from all applications for this plan
        const allModules = [];
        if (planAccess.modules) {
          Object.values(planAccess.modules).forEach(moduleList => {
            if (Array.isArray(moduleList)) {
              allModules.push(...moduleList);
            } else if (moduleList === '*') {
              // For enterprise plan, we might need to handle this differently
              console.log(`   Enterprise plan detected - modules: *`);
            }
          });
        }

        // Get plan permissions
        const planPermissions = planAccess.permissions || {};

        console.log(`   Plan access - applications: ${JSON.stringify(planAccess.applications)}`);
        console.log(`   New modules: ${JSON.stringify(allModules)}`);
        console.log(`   New permissions: ${Object.keys(planPermissions).length} apps`);

        // Update the record
        const [updatedRecord] = await db
          .update(organizationApplications)
          .set({
            enabledModules: allModules,
            customPermissions: planPermissions,
            updatedAt: new Date()
          })
          .where(eq(organizationApplications.id, id))
          .returning();

        console.log(`✅ Updated record ${id}`);
        console.log(`   Before: modules=${JSON.stringify(enabledModules)}, permissions=${JSON.stringify(customPermissions)}`);
        console.log(`   After: modules=${JSON.stringify(updatedRecord.enabledModules)}, permissions=${JSON.stringify(updatedRecord.customPermissions)}`);

        updatedCount++;

      } catch (recordError) {
        console.error(`❌ Error processing record ${record.id}:`, recordError.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Fix Summary:`);
    console.log(`   ✅ Records updated: ${updatedCount}`);
    console.log(`   ❌ Records with errors: ${errorCount}`);
    console.log(`   📋 Total records processed: ${existingRecords.length}`);

    // Verify the fix by showing a sample of updated records
    console.log(`\n🔍 Verification - Sample of updated records:`);
    const sampleRecords = await db
      .select()
      .from(organizationApplications)
      .limit(5);

    sampleRecords.forEach(record => {
      console.log(`   Record ${record.id}:`);
      console.log(`     Tenant: ${record.tenantId}`);
      console.log(`     Tier: ${record.subscriptionTier}`);
      console.log(`     Modules: ${JSON.stringify(record.enabledModules)}`);
      console.log(`     Permissions: ${Object.keys(record.customPermissions || {}).length} apps`);
    });

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Full error:', error);
  }
}

fixExistingOrgApps();
