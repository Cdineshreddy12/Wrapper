#!/usr/bin/env node

/**
 * 🧪 **SIMPLE VALIDATION TEST SCRIPT**
 * 
 * This script validates the current organization setup to ensure no duplicates exist
 * after the cleanup.
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db, closeConnection } from './src/db/index.js';
import { organizationApplications, applications } from './src/db/schema/suite-schema.js';
import { eq, sql, count } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function simpleValidation() {
  try {
    console.log('🧪 **SIMPLE VALIDATION TEST**\n');
    
    // Check for duplicates across all tenants
    console.log('🔍 Checking for duplicate applications...');
    
    const duplicates = await db
      .select({
        tenantId: organizationApplications.tenantId,
        appCode: applications.appCode,
        recordCount: count()
      })
      .from(organizationApplications)
      .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
      .groupBy(organizationApplications.tenantId, applications.appCode)
      .having(sql`COUNT(*) > 1`)
      .orderBy(organizationApplications.tenantId, applications.appCode);
    
    if (duplicates && duplicates.length > 0) {
      console.log(`❌ Found ${duplicates.length} duplicate application records:`);
      duplicates.forEach(dup => {
        console.log(`   - Tenant ${dup.tenantId}: ${dup.appCode} has ${dup.recordCount} records`);
      });
    } else {
      console.log('✅ No duplicate applications found!');
    }
    
    // Check total application records
    console.log('\n📊 Checking total application records...');
    
    const totalRecords = await db
      .select({ count: count() })
      .from(organizationApplications);
    
    console.log(`📊 Total organization application records: ${totalRecords[0]?.count || 0}`);
    
    // Check records by tenant
    console.log('\n🏢 Checking records by tenant...');
    
    const recordsByTenant = await db
      .select({
        tenantId: organizationApplications.tenantId,
        recordCount: count()
      })
      .from(organizationApplications)
      .groupBy(organizationApplications.tenantId)
      .orderBy(organizationApplications.tenantId);
    
    if (recordsByTenant && recordsByTenant.length > 0) {
      console.log(`📊 Found ${recordsByTenant.length} tenants with application records:`);
      recordsByTenant.forEach(tenant => {
        console.log(`   - Tenant ${tenant.tenantId}: ${tenant.recordCount} records`);
      });
    } else {
      console.log('⚠️ No tenants found with application records');
    }
    
    console.log('\n✨ Validation completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️ Validation interrupted by user');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️ Validation terminated');
  await closeConnection();
  process.exit(0);
});

// Run the validation
simpleValidation().catch(async (error) => {
  console.error('\n❌ Unhandled error:', error);
  await closeConnection();
  process.exit(1);
});
