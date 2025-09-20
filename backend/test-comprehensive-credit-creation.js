import { db } from './src/db/index.js';
import { creditConfigurations } from './src/db/schema/credit_configurations.js';
import { eq, and, or, isNull } from 'drizzle-orm';

async function testComprehensiveCreditCreation() {
  console.log('🔍 Testing comprehensive credit configuration creation...');
  
  try {
    const testUserId = 'a5c53dc2-fd8a-40ae-8704-59add9cf5d93';
    const testTenantId = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';
    
    // Test cases
    const testCases = [
      {
        name: 'Global CRM operation',
        data: {
          operationCode: 'crm.leads.advanced_search',
          creditCost: 2.5,
          unit: 'operation',
          unitMultiplier: 1,
          isGlobal: true,
          isActive: true
        }
      },
      {
        name: 'Tenant-specific HR operation',
        data: {
          operationCode: 'hr.payroll.bulk_update',
          creditCost: 5.0,
          unit: 'operation',
          unitMultiplier: 1,
          isGlobal: false,
          isActive: true
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📋 Testing: ${testCase.name}`);
      console.log('Data:', testCase.data);
      
      const { operationCode, creditCost, unit, unitMultiplier, isGlobal, isActive } = testCase.data;
      
      // Check if operation already exists
      let existingQuery = db
        .select()
        .from(creditConfigurations)
        .where(eq(creditConfigurations.operationCode, operationCode));
      
      if (!isGlobal) {
        existingQuery = existingQuery.where(eq(creditConfigurations.tenantId, testTenantId));
      } else {
        existingQuery = existingQuery.where(eq(creditConfigurations.isGlobal, true));
      }
      
      const existing = await existingQuery.limit(1);
      
      if (existing.length > 0) {
        console.log('⚠️ Operation already exists, skipping creation');
        continue;
      }
      
      // Prepare configuration data
      const configData = {
        operationCode,
        creditCost: creditCost.toString(),
        unit,
        unitMultiplier: unitMultiplier.toString(),
        isGlobal,
        isActive,
        createdBy: testUserId,
        updatedBy: testUserId
      };
      
      if (!isGlobal) {
        configData.tenantId = testTenantId;
      }
      
      // Create configuration
      const newConfig = await db
        .insert(creditConfigurations)
        .values(configData)
        .returning();
      
      console.log('✅ Created successfully:', newConfig[0]);
      
      // Store for cleanup
      testCase.createdId = newConfig[0].configId;
    }
    
    // Verify all configurations exist
    console.log('\n�� Verifying created configurations...');
    for (const testCase of testCases) {
      if (testCase.createdId) {
        const verify = await db
          .select()
          .from(creditConfigurations)
          .where(eq(creditConfigurations.configId, testCase.createdId));
        
        console.log(`✅ ${testCase.name}: ${verify.length > 0 ? 'Exists' : 'Missing'}`);
      }
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up test configurations...');
    for (const testCase of testCases) {
      if (testCase.createdId) {
        await db
          .delete(creditConfigurations)
          .where(eq(creditConfigurations.configId, testCase.createdId));
        
        console.log(`🗑️ Deleted ${testCase.name}`);
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during comprehensive test:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail
    });
  } finally {
    process.exit(0);
  }
}

testComprehensiveCreditCreation();
