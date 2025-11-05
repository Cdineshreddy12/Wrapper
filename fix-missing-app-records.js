// Fix missing organization application records for tenants
async function fixMissingAppRecords() {
  try {
    console.log('🔧 Starting fix for missing organization application records...\n');

    // Import required modules
    const { subscriptions } = await import('./backend/src/db/schema/subscriptions.js');
    const { organizationApplications } = await import('./backend/src/db/schema/suite-schema.js');
    const { eq } = await import('drizzle-orm');
    const { db } = await import('./backend/src/db/index.js');
    const { PLAN_ACCESS_MATRIX } = await import('./backend/src/data/permission-matrix.js');
    const { BUSINESS_SUITE_MATRIX } = await import('./backend/src/data/permission-matrix.js');

    // Application ID mapping (these should match the app_ids in the database)
    const APPLICATION_IDS = {
      crm: 'c146f554-be8a-46fa-9758-7f52f80c2e7d',
      hr: '08c24954-45be-4247-8d00-73140c8a1524',
      affiliateConnect: 'affiliate-app-id-placeholder' // Add when needed
    };

    // Get all tenants with their current subscription plans
    const tenantSubscriptions = await db
      .select({
        tenantId: subscriptions.tenantId,
        plan: subscriptions.plan,
        status: subscriptions.status
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active')); // Only active subscriptions

    console.log(`📋 Found ${tenantSubscriptions.length} active tenant subscriptions`);

    let totalRecordsCreated = 0;
    let totalRecordsUpdated = 0;
    let totalRecordsDisabled = 0;

    for (const tenantSub of tenantSubscriptions) {
      const { tenantId, plan } = tenantSub;

      console.log(`\n🔄 Processing tenant ${tenantId} with plan ${plan}`);

      // Skip if plan not in PLAN_ACCESS_MATRIX
      if (!PLAN_ACCESS_MATRIX[plan]) {
        console.warn(`⚠️ Plan ${plan} not found in PLAN_ACCESS_MATRIX, skipping tenant ${tenantId}`);
        continue;
      }

      const planAccess = PLAN_ACCESS_MATRIX[plan];
      const availableApplications = planAccess.applications || ['crm'];

      // Get existing records for this tenant
      const existingRecords = await db
        .select()
        .from(organizationApplications)
        .where(eq(organizationApplications.tenantId, tenantId));

      console.log(`   📋 Existing records: ${existingRecords.length}`);
      existingRecords.forEach(record => {
        console.log(`     - ${record.appId} (${record.isEnabled ? 'enabled' : 'disabled'})`);
      });

      let recordsCreated = 0;
      let recordsUpdated = 0;
      let recordsDisabled = 0;

      // Process each application in the plan
      for (const appCode of availableApplications) {
        const app = BUSINESS_SUITE_MATRIX[appCode];
        if (!app) {
          console.warn(`⚠️ Application ${appCode} not found in BUSINESS_SUITE_MATRIX, skipping`);
          continue;
        }

        const appId = APPLICATION_IDS[appCode];
        if (!appId) {
          console.warn(`⚠️ No appId mapping found for ${appCode}, skipping`);
          continue;
        }

        // Get modules and permissions for this application from the plan
        const appModules = planAccess.modules?.[appCode] || [];
        const appPermissions = planAccess.permissions?.[appCode] || {};

        // Find existing record for this application
        const existingRecord = existingRecords.find(r => r.appId === appId);

        if (existingRecord) {
          // Update existing record
          console.log(`   🔄 Updating ${appCode} record: ${existingRecord.id}`);

          await db
            .update(organizationApplications)
            .set({
              subscriptionTier: plan,
              enabledModules: appModules,
              customPermissions: appPermissions,
              isEnabled: true,
              updatedAt: new Date()
            })
            .where(eq(organizationApplications.id, existingRecord.id));

          recordsUpdated++;
        } else {
          // Create new record for this application
          console.log(`   🆕 Creating ${appCode} record`);

          await db
            .insert(organizationApplications)
            .values({
              tenantId,
              appId,
              isEnabled: true,
              subscriptionTier: plan,
              enabledModules: appModules,
              customPermissions: appPermissions,
              maxUsers: null // Unlimited for now
            });

          recordsCreated++;
        }
      }

      // Disable applications that are no longer in the plan
      const planAppIds = availableApplications.map(appCode => APPLICATION_IDS[appCode]).filter(Boolean);
      const recordsToDisable = existingRecords.filter(r => !planAppIds.includes(r.appId) && r.isEnabled);

      if (recordsToDisable.length > 0) {
        console.log(`   🔇 Disabling ${recordsToDisable.length} applications no longer in plan`);

        for (const record of recordsToDisable) {
          await db
            .update(organizationApplications)
            .set({
              isEnabled: false,
              updatedAt: new Date()
            })
            .where(eq(organizationApplications.id, record.id));
        }

        recordsDisabled += recordsToDisable.length;
      }

      console.log(`   ✅ Tenant ${tenantId}: +${recordsCreated} created, ${recordsUpdated} updated, ${recordsDisabled} disabled`);

      totalRecordsCreated += recordsCreated;
      totalRecordsUpdated += recordsUpdated;
      totalRecordsDisabled += recordsDisabled;
    }

    console.log(`\n📊 Fix Summary:`);
    console.log(`   ✅ Records created: ${totalRecordsCreated}`);
    console.log(`   🔄 Records updated: ${totalRecordsUpdated}`);
    console.log(`   🔇 Records disabled: ${totalRecordsDisabled}`);
    console.log(`   📋 Total tenants processed: ${tenantSubscriptions.length}`);

    // Verify the fix by showing final state
    console.log(`\n🔍 Verification - Final organization application records:`);
    const finalRecords = await db
      .select({
        tenantId: organizationApplications.tenantId,
        appId: organizationApplications.appId,
        plan: organizationApplications.subscriptionTier,
        isEnabled: organizationApplications.isEnabled,
        moduleCount: organizationApplications.enabledModules
      })
      .from(organizationApplications)
      .orderBy(organizationApplications.tenantId, organizationApplications.appId);

    // Group by tenant
    const tenantGroups = {};
    finalRecords.forEach(record => {
      if (!tenantGroups[record.tenantId]) {
        tenantGroups[record.tenantId] = [];
      }
      tenantGroups[record.tenantId].push(record);
    });

    Object.keys(tenantGroups).forEach(tenantId => {
      const tenantRecords = tenantGroups[tenantId];
      const enabledRecords = tenantRecords.filter(r => r.isEnabled);
      const plan = tenantRecords[0]?.plan;

      console.log(`   Tenant ${tenantId} (${plan}): ${enabledRecords.length} enabled apps`);
      enabledRecords.forEach(record => {
        const appName = Object.keys(APPLICATION_IDS).find(key => APPLICATION_IDS[key] === record.appId) || 'unknown';
        console.log(`     - ${appName} (${record.appId}): ${Array.isArray(record.moduleCount) ? record.moduleCount.length : 0} modules`);
      });
    });

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Full error:', error);
  }
}

fixMissingAppRecords();
