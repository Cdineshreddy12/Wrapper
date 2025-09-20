#!/usr/bin/env node

/**
 * Cleanup script for duplicate credit configurations
 * This script identifies and removes duplicate credit configurations,
 * keeping only the most recent entry for each (tenant_id, operation_code) combination.
 */

import { systemDbConnection } from './src/db/index.js';
import { creditConfigurations } from './src/db/schema/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';

async function cleanupDuplicateCreditConfigs() {
  console.log('🧹 Starting cleanup of duplicate credit configurations...');

  try {
    // Step 1: Find all duplicates
    console.log('🔍 Finding duplicate configurations...');

    const duplicatesQuery = await systemDbConnection
      .select({
        tenant_id: creditConfigurations.tenantId,
        operation_code: creditConfigurations.operationCode,
        count: sql`count(*)`.as('count'),
        config_ids: sql`array_agg(config_id ORDER BY updated_at DESC)`.as('config_ids'),
        updated_ats: sql`array_agg(updated_at ORDER BY updated_at DESC)`.as('updated_ats')
      })
      .from(creditConfigurations)
      .groupBy(creditConfigurations.tenantId, creditConfigurations.operationCode)
      .having(sql`count(*) > 1`)
      .orderBy(creditConfigurations.operationCode);

    console.log(`📊 Found ${duplicatesQuery.length} duplicate groups`);

    if (duplicatesQuery.length === 0) {
      console.log('✅ No duplicates found! Database is clean.');
      return;
    }

    // Step 2: Process each duplicate group
    let totalDuplicatesRemoved = 0;

    for (const duplicate of duplicatesQuery) {
      const { tenant_id, operation_code, config_ids, updated_ats } = duplicate;

      console.log(`\n🔧 Processing duplicate group:`);
      console.log(`   Tenant ID: ${tenant_id || 'GLOBAL'}`);
      console.log(`   Operation: ${operation_code}`);
      console.log(`   Total entries: ${config_ids.length}`);
      console.log(`   Config IDs: ${config_ids.join(', ')}`);

      // Keep the most recent one (first in the array), delete the rest
      const configIdsToDelete = config_ids.slice(1); // All except the first (most recent)

      if (configIdsToDelete.length > 0) {
        console.log(`   🗑️  Deleting ${configIdsToDelete.length} older duplicates...`);

        const deleteResult = await systemDbConnection
          .delete(creditConfigurations)
          .where(sql`${creditConfigurations.configId} = ANY(${configIdsToDelete})`);

        console.log(`   ✅ Deleted ${deleteResult.rowCount} duplicate entries`);
        totalDuplicatesRemoved += deleteResult.rowCount;
      }
    }

    // Step 3: Verify cleanup
    console.log(`\n🔍 Verifying cleanup...`);
    const remainingDuplicates = await systemDbConnection
      .select({
        tenant_id: creditConfigurations.tenantId,
        operation_code: creditConfigurations.operationCode,
        count: sql`count(*)`.as('count')
      })
      .from(creditConfigurations)
      .groupBy(creditConfigurations.tenantId, creditConfigurations.operationCode)
      .having(sql`count(*) > 1`);

    if (remainingDuplicates.length === 0) {
      console.log('✅ Cleanup successful! No duplicates remaining.');
    } else {
      console.log(`⚠️  Warning: ${remainingDuplicates.length} duplicate groups still exist.`);
    }

    // Step 4: Show summary
    const totalConfigs = await systemDbConnection
      .select({ count: sql`count(*)` })
      .from(creditConfigurations);

    console.log(`\n📈 Summary:`);
    console.log(`   Total configurations: ${totalConfigs[0].count}`);
    console.log(`   Duplicates removed: ${totalDuplicatesRemoved}`);
    console.log(`   Duplicate groups processed: ${duplicatesQuery.length}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupDuplicateCreditConfigs()
    .then(() => {
      console.log('\n🎉 Cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupDuplicateCreditConfigs };
