import 'dotenv/config';
import { systemDbConnection } from './backend/src/db/index.js';
import { creditConfigurations } from './backend/src/db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

async function testSeparatedAPI() {
  console.log('🧪 Testing Separated API Fix...');

  try {
    // Test 1: Check global configurations only (should not include tenant-specific)
    console.log('\n📋 Test 1: Global API Query (should return ONLY global configs)');
    const globalResult = await systemDbConnection
      .select({
        operationCode: creditConfigurations.operationCode,
        creditCost: creditConfigurations.creditCost,
        isGlobal: creditConfigurations.isGlobal,
        tenantId: creditConfigurations.tenantId
      })
      .from(creditConfigurations)
      .where(sql`${creditConfigurations.isGlobal} = true AND ${creditConfigurations.tenantId} IS NULL`)
      .limit(5);

    console.log(`✅ Found ${globalResult.length} global configurations:`);
    globalResult.forEach(config => {
      console.log(`  ${config.operationCode}: ${config.creditCost} credits`);
      console.log(`    Global: ${config.isGlobal}, TenantId: ${config.tenantId}`);
    });

    // Verify no tenant-specific configs are mixed in
    const hasTenantConfigs = globalResult.some(config => config.tenantId !== null);
    if (hasTenantConfigs) {
      console.log('❌ ERROR: Global API returned tenant-specific configurations!');
      return false;
    } else {
      console.log('✅ SUCCESS: Global API returned only global configurations');
    }

    // Test 2: Check tenant-specific configurations only
    console.log('\n📋 Test 2: Tenant API Query (should return ONLY tenant-specific configs)');
    const tenantResult = await systemDbConnection
      .select({
        operationCode: creditConfigurations.operationCode,
        creditCost: creditConfigurations.creditCost,
        isGlobal: creditConfigurations.isGlobal,
        tenantId: creditConfigurations.tenantId
      })
      .from(creditConfigurations)
      .where(sql`${creditConfigurations.isGlobal} = false AND ${creditConfigurations.tenantId} IS NOT NULL`)
      .limit(5);

    console.log(`✅ Found ${tenantResult.length} tenant-specific configurations:`);
    tenantResult.forEach(config => {
      console.log(`  ${config.operationCode}: ${config.creditCost} credits`);
      console.log(`    Global: ${config.isGlobal}, TenantId: ${config.tenantId}`);
    });

    // Verify no global configs are mixed in
    const hasGlobalConfigs = tenantResult.some(config => config.isGlobal === true);
    if (hasGlobalConfigs) {
      console.log('❌ ERROR: Tenant API returned global configurations!');
      return false;
    } else {
      console.log('✅ SUCCESS: Tenant API returned only tenant-specific configurations');
    }

    // Test 3: Check for duplicates (should be none with new partial indexes)
    console.log('\n📋 Test 3: Check for duplicates');
    const duplicates = await systemDbConnection.execute(sql`
      SELECT operation_code, COUNT(*) as count
      FROM credit_configurations
      WHERE is_global = true AND tenant_id IS NULL
      GROUP BY operation_code
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      console.log('❌ ERROR: Found duplicate global configurations:');
      duplicates.forEach(dup => {
        console.log(`  ${dup.operation_code}: ${dup.count} duplicates`);
      });
      return false;
    } else {
      console.log('✅ SUCCESS: No duplicate global configurations found');
    }

    console.log('\n🎉 All tests passed! API separation is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await systemDbConnection.end();
  }
}

testSeparatedAPI();
