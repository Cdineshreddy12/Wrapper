import { SeasonalCreditService } from './backend/src/services/seasonal-credit-service.js';
import { db } from './backend/src/db/index.js';
import { eq } from 'drizzle-orm';
import { tenants } from './backend/src/db/schema/index.js';

async function testSeasonalCampaign() {
  try {
    console.log('🧪 Testing seasonal credit campaign creation...');

    // Get a test tenant
    const testTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.isActive, true))
      .limit(1);

    if (!testTenant.length) {
      console.error('❌ No active tenants found for testing');
      return;
    }

    const tenant = testTenant[0];
    console.log(`📋 Testing with tenant: ${tenant.name} (${tenant.tenantId})`);

    const seasonalService = new SeasonalCreditService();

    // Test allocating seasonal credits
    console.log('🎄 Allocating seasonal credits...');
    const allocation = await seasonalService.allocateSeasonalCredits({
      tenantId: tenant.tenantId,
      sourceEntityId: tenant.tenantId, // Assuming tenant ID is entity ID
      creditAmount: 100,
      creditType: 'seasonal',
      campaignId: 'test-campaign-123',
      campaignName: 'Test Holiday Campaign',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      metadata: {
        testCampaign: true,
        launchedBy: 'test-user'
      },
      allocatedBy: 'test-user',
      targetApplications: ['crm'] // Just test with CRM
    });

    console.log('✅ Seasonal credit allocation successful:', allocation);

    // Test creating a campaign via the service method
    console.log('🚀 Testing campaign creation...');
    const campaignResult = await seasonalService.createSeasonalCampaign({
      campaignId: 'test-full-campaign-456',
      campaignName: 'Test Full Campaign',
      creditType: 'bonus',
      totalCredits: 500,
      tenantIds: [tenant.tenantId],
      targetApplications: ['crm', 'hr'],
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      metadata: { testFullCampaign: true },
      allocatedBy: 'test-user'
    });

    console.log('✅ Campaign creation successful:', campaignResult);

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

testSeasonalCampaign();





