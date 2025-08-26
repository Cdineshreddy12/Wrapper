#!/usr/bin/env node

import { db } from './src/db/index.js';
import { userRoleAssignments } from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';

async function simpleTest() {
  try {
    console.log('🔍 Simple test - checking user-role assignments...');
    
    const testTenantId = '893d8c75-68e6-4d42-92f8-45df62ef08b6';
    
    const userRoles = await db
      .select({
        userId: userRoleAssignments.userId,
        roleId: userRoleAssignments.roleId,
        isActive: userRoleAssignments.isActive
      })
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.tenantId, testTenantId));
    
    console.log(`Found ${userRoles.length} user-role assignments:`);
    userRoles.forEach((assignment, index) => {
      console.log(`  ${index + 1}. User: ${assignment.userId} → Role: ${assignment.roleId} (Active: ${assignment.isActive})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

simpleTest();
