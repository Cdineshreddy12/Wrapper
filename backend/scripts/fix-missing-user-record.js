#!/usr/bin/env node

import { db } from '../src/db/index.js';
import { tenants, tenantUsers, userRoleAssignments, customRoles } from '../src/db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const MISSING_USER_KINDE_ID = 'kp_c436b2d0b9454593ac3f9d35068caddc';
const TENANT_ID = '41af9109-e1af-440b-9c1d-a0deab90af26';

async function fixMissingUserRecord() {
  console.log('🔧 === FIXING MISSING USER RECORD ===\n');
  
  try {
    // Step 1: Check if user already exists
    console.log('🔍 Checking if user record exists...');
    const existingUser = await db
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.kindeUserId, MISSING_USER_KINDE_ID),
        eq(tenantUsers.tenantId, TENANT_ID)
      ))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('✅ User record already exists:', existingUser[0]);
      return;
    }

    console.log('❌ User record not found. Creating...');

    // Step 2: Verify tenant exists
    console.log('🔍 Verifying tenant exists...');
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, TENANT_ID))
      .limit(1);

    if (tenant.length === 0) {
      throw new Error('Tenant not found');
    }

    console.log('✅ Tenant found:', tenant[0].companyName);

    // Step 3: Find the developer role (from your logs, this user should have developer role)
    console.log('🔍 Finding developer role...');
    const developerRole = await db
      .select()
      .from(customRoles)
      .where(eq(customRoles.roleName, 'developer'))
      .limit(1);

    if (developerRole.length === 0) {
      throw new Error('Developer role not found. Please create it first.');
    }

    console.log('✅ Developer role found:', developerRole[0].roleId);

    // Step 4: Create user record
    console.log('👤 Creating user record...');
    const newUserId = uuidv4();
    
    const newUser = await db.insert(tenantUsers).values({
      userId: newUserId,
      tenantId: TENANT_ID,
      email: 's211119@rguktsklm.ac.in', // From the logs
      name: 'S211119 CHINTA DINESH REDDY', // From Kinde response
      kindeUserId: MISSING_USER_KINDE_ID,
      isActive: true, // Make them active
      isVerified: true,
      isTenantAdmin: false,
      onboardingCompleted: true, // Mark as completed
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('✅ User record created:', newUser[0]);

    // Step 5: Assign developer role
    console.log('🔗 Assigning developer role...');
    await db.insert(userRoleAssignments).values({
      userId: newUserId,
      roleId: developerRole[0].roleId,
      assignedBy: newUserId, // Self-assigned during setup
      assignedAt: new Date()
    });

    console.log('✅ Role assigned successfully');

    // Step 6: Test by looking up permissions
    console.log('🧪 Testing permission lookup...');
    const userWithRole = await db
      .select({
        userId: tenantUsers.userId,
        email: tenantUsers.email,
        name: tenantUsers.name,
        roleName: customRoles.roleName,
        permissions: customRoles.permissions
      })
      .from(tenantUsers)
      .leftJoin(userRoleAssignments, eq(tenantUsers.userId, userRoleAssignments.userId))
      .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
      .where(eq(tenantUsers.kindeUserId, MISSING_USER_KINDE_ID))
      .limit(1);

    if (userWithRole.length > 0) {
      console.log('✅ User permissions verified:', {
        email: userWithRole[0].email,
        role: userWithRole[0].roleName,
        hasPermissions: !!userWithRole[0].permissions
      });
    }

    console.log('\n🎉 SUCCESS! User record created and role assigned.');
    console.log('👤 User can now access the system with proper permissions.');
    console.log('🔄 Try accessing the CRM again - it should work now!');

  } catch (error) {
    console.error('❌ Error fixing user record:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Alternative: Create user with any role
async function createUserWithRole(kindeUserId, tenantId, email, name, roleName = 'developer') {
  console.log(`🔧 Creating user ${email} with role ${roleName}...`);
  
  try {
    // Find the role
    const role = await db
      .select()
      .from(customRoles)
      .where(eq(customRoles.roleName, roleName))
      .limit(1);

    if (role.length === 0) {
      throw new Error(`Role '${roleName}' not found`);
    }

    // Create user
    const newUserId = uuidv4();
    const newUser = await db.insert(tenantUsers).values({
      userId: newUserId,
      tenantId: tenantId,
      email: email,
      name: name,
      kindeUserId: kindeUserId,
      isActive: true,
      isVerified: true,
      isTenantAdmin: false,
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Assign role
    await db.insert(userRoleAssignments).values({
      userId: newUserId,
      roleId: role[0].roleId,
      assignedBy: newUserId, // Self-assigned during setup
      assignedAt: new Date()
    });

    console.log('✅ User created successfully:', {
      userId: newUserId,
      email: email,
      role: roleName
    });

    return newUser[0];
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    throw error;
  }
}

// Run the fix
fixMissingUserRecord();

export { createUserWithRole }; 