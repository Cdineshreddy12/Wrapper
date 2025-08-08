#!/usr/bin/env node

import { db } from '../src/db/index.js';
import { userRoleAssignments, customRoles } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

const userId = '2837ffa8-a9d6-4aee-bf33-d6d2fadee40d';

async function assignRole() {
  try {
    console.log('🔗 Assigning developer role to user...');
    
    const role = await db.select().from(customRoles).where(eq(customRoles.roleName, 'developer')).limit(1);
    
    if (role.length === 0) {
      console.log('❌ Developer role not found');
      return;
    }

    await db.insert(userRoleAssignments).values({
      userId: userId,
      roleId: role[0].roleId,
      assignedBy: userId,
      assignedAt: new Date()
    });
    
    console.log('✅ Developer role assigned successfully');
  } catch (error) {
    if (error.message.includes('duplicate key value')) {
      console.log('✅ Role already assigned');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
  
  process.exit(0);
}

assignRole(); 