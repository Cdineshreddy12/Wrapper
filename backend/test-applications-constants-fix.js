import { sql } from './src/db/index.js';

// Test the APPLICATIONS constants fix
async function testApplicationsConstantsFix() {
  try {
    console.log('🔍 Testing APPLICATIONS constants fix...');

    // Test 1: Verify APPLICATIONS constants are accessible
    console.log('📋 Test 1: APPLICATIONS constants');

    // Import the service to test the constants
    const { ApplicationDataIsolationService } = await import('./src/services/application-data-isolation-service.js');

    console.log('✅ APPLICATIONS constants accessible:', {
      CRM: ApplicationDataIsolationService.APPLICATIONS.CRM,
      HR: ApplicationDataIsolationService.APPLICATIONS.HR,
      FINANCE: ApplicationDataIsolationService.APPLICATIONS.FINANCE,
      SALES: ApplicationDataIsolationService.APPLICATIONS.SALES,
      MARKETING: ApplicationDataIsolationService.APPLICATIONS.MARKETING,
      INVENTORY: ApplicationDataIsolationService.APPLICATIONS.INVENTORY,
      PROJECTS: ApplicationDataIsolationService.APPLICATIONS.PROJECTS,
      ANALYTICS: ApplicationDataIsolationService.APPLICATIONS.ANALYTICS
    });

    // Test 2: Test getUserApplicationAccess method
    console.log('📋 Test 2: getUserApplicationAccess method');
    const service = new ApplicationDataIsolationService();

    // Simulate user context
    const userContext = {
      userId: 'kp_5644fd635bf946a292069e3572639e2b',
      internalUserId: '50d4f694-202f-4f27-943d-7aafeffee29c',
      tenantId: '893d8c75-68e6-4d42-92f8-45df62ef08b6',
      roles: ['TENANT_ADMIN']
    };

    try {
      const appAccess = await service.getUserApplicationAccess(userContext, 'crm');
      console.log('✅ getUserApplicationAccess successful:', {
        hasAccess: appAccess?.hasAccess,
        permissions: appAccess?.permissions,
        orgCount: appAccess?.scope?.orgCount,
        locationCount: appAccess?.scope?.locationCount
      });
    } catch (appError) {
      console.error('❌ getUserApplicationAccess failed:', appError);
    }

    // Test 3: Test getUserCompleteAccessProfile method
    console.log('📋 Test 3: getUserCompleteAccessProfile method');
    try {
      const profile = await service.getUserCompleteAccessProfile(userContext);
      console.log('✅ getUserCompleteAccessProfile successful:', {
        userId: profile?.userId,
        tenantId: profile?.tenantId,
        applicationCount: Object.keys(profile?.applications || {}).length
      });

      // Show a sample application access
      const sampleApp = Object.keys(profile?.applications || {})[0];
      if (sampleApp) {
        console.log(`📋 Sample app (${sampleApp}):`, profile.applications[sampleApp]);
      }
    } catch (profileError) {
      console.error('❌ getUserCompleteAccessProfile failed:', profileError);
    }

    console.log('🎉 APPLICATIONS constants fix test completed successfully!');

  } catch (error) {
    console.error('❌ APPLICATIONS constants test failed:', error);
  } finally {
    await sql.end();
  }
}

testApplicationsConstantsFix();
