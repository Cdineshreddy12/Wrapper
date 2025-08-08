#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tenants, tenantUsers } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';
import kindeService from '../src/services/kinde-service.js';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

console.log('🧹 Multiple Organization Cleanup Tool');
console.log('=====================================\n');

async function fixMultipleOrganizations() {
  try {
    // Get all tenant admin users
    const adminUsers = await db
      .select({
        userId: tenantUsers.userId,
        kindeUserId: tenantUsers.kindeUserId,
        email: tenantUsers.email,
        name: tenantUsers.name,
        tenantId: tenantUsers.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        kindeOrgId: tenants.kindeOrgId
      })
      .from(tenantUsers)
      .leftJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
      .where(eq(tenantUsers.isTenantAdmin, true));

    console.log(`Found ${adminUsers.length} admin users to check\n`);

    for (const user of adminUsers) {
      console.log(`👤 Checking: ${user.name} (${user.email})`);
      console.log(`   Company: ${user.companyName}`);
      console.log(`   Expected Org: ${user.kindeOrgId}`);
      console.log(`   Kinde User ID: ${user.kindeUserId}\n`);

      if (!user.kindeUserId || !user.kindeOrgId) {
        console.log('   ⚠️  Missing Kinde User ID or Org ID - skipping\n');
        continue;
      }

      try {
        // Check user's current organizations in Kinde
        console.log('   🔍 Getting user organizations from Kinde...');
        const userOrgs = await kindeService.getUserOrganizations(user.kindeUserId);
        
        if (!userOrgs.organizations || userOrgs.organizations.length === 0) {
          console.log('   📋 User has no organizations - needs to be added to intended org');
          
          try {
            await kindeService.addUserToOrganization(user.kindeUserId, user.kindeOrgId, [], false);
            console.log('   ✅ Added user to intended organization');
          } catch (addError) {
            console.log('   ❌ Failed to add user to organization:', addError.message);
          }
          console.log('');
          continue;
        }

        const orgCodes = userOrgs.organizations.map(org => org.code);
        console.log(`   📊 Current organizations: [${orgCodes.join(', ')}]`);

        // Check if user is in correct organization only
        if (orgCodes.length === 1 && orgCodes[0] === user.kindeOrgId) {
          console.log('   ✅ User is correctly assigned to single organization\n');
          continue;
        }

        // User is in multiple organizations or wrong organization
        if (orgCodes.length > 1) {
          console.log(`   ❌ User is in ${orgCodes.length} organizations (should be 1)`);
        } else {
          console.log(`   ❌ User is in wrong organization: ${orgCodes[0]} (should be ${user.kindeOrgId})`);
        }

        console.log('   🔧 Fixing organization assignment...');
        
        try {
          const result = await kindeService.ensureUserInSingleOrganization(
            user.kindeUserId, 
            user.kindeOrgId
          );

          if (result.success) {
            console.log('   ✅ Organization assignment fixed!');
            if (result.removedOrgs.length > 0) {
              console.log(`   📊 Removed from: [${result.removedOrgs.join(', ')}]`);
            }
            if (result.addedToTarget) {
              console.log(`   📊 Added to: ${user.kindeOrgId}`);
            }
            if (result.alreadyCorrect) {
              console.log('   📊 Was already correct');
            }
          } else {
            console.log('   ❌ Failed to fix organization assignment');
          }

          // Verify the fix
          const verifyOrgs = await kindeService.getUserOrganizations(user.kindeUserId);
          const newOrgCodes = verifyOrgs.organizations?.map(org => org.code) || [];
          
          if (newOrgCodes.length === 1 && newOrgCodes[0] === user.kindeOrgId) {
            console.log('   ✅ Fix verified - user is now in correct single organization');
          } else {
            console.log(`   ⚠️  Fix verification failed - user still in: [${newOrgCodes.join(', ')}]`);
          }

        } catch (fixError) {
          console.log('   ❌ Error fixing organization assignment:', fixError.message);
        }

        console.log('');

      } catch (error) {
        console.log(`   ❌ Error checking user organizations: ${error.message}\n`);
      }
    }

    console.log('🎉 Multiple organization cleanup completed!');

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await sql.end();
  }
}

async function checkSpecificUser(kindeUserId) {
  try {
    console.log(`🔍 Checking specific user: ${kindeUserId}\n`);

    // Get user from database
    const [dbUser] = await db
      .select({
        userId: tenantUsers.userId,
        tenantId: tenantUsers.tenantId,
        kindeUserId: tenantUsers.kindeUserId,
        email: tenantUsers.email,
        name: tenantUsers.name,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        kindeOrgId: tenants.kindeOrgId
      })
      .from(tenantUsers)
      .leftJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
      .where(eq(tenantUsers.kindeUserId, kindeUserId))
      .limit(1);

    if (!dbUser) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('📊 Database Info:');
    console.log(`   User: ${dbUser.name} (${dbUser.email})`);
    console.log(`   Company: ${dbUser.companyName}`);
    console.log(`   Expected Org: ${dbUser.kindeOrgId}\n`);

    // Check Kinde organizations
    try {
      const userOrgs = await kindeService.getUserOrganizations(kindeUserId);
      console.log('📊 Kinde Organizations:');
      
      if (userOrgs.organizations?.length > 0) {
        userOrgs.organizations.forEach((org, index) => {
          const isCorrect = org.code === dbUser.kindeOrgId ? '✅' : '❌';
          console.log(`   ${index + 1}. ${isCorrect} ${org.code} (${org.name})`);
        });

        console.log(`\n📊 Summary:`);
        console.log(`   Total organizations: ${userOrgs.organizations.length}`);
        console.log(`   Expected organization: ${dbUser.kindeOrgId}`);
        
        const isInCorrectOrg = userOrgs.organizations.some(org => org.code === dbUser.kindeOrgId);
        const isOnlyInCorrectOrg = userOrgs.organizations.length === 1 && userOrgs.organizations[0].code === dbUser.kindeOrgId;
        
        if (isOnlyInCorrectOrg) {
          console.log('   ✅ User is correctly in ONLY their intended organization');
        } else if (isInCorrectOrg) {
          console.log('   ⚠️  User is in correct organization BUT also in others');
          console.log('   💡 Run fix command to clean up multiple organizations');
        } else {
          console.log('   ❌ User is NOT in their intended organization');
          console.log('   💡 Run fix command to correct organization assignment');
        }

      } else {
        console.log('   ❌ No organizations found');
        console.log('   💡 User needs to be added to their intended organization');
      }

    } catch (kindeError) {
      console.log('❌ Error checking Kinde organizations:', kindeError.message);
    }

  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    await sql.end();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'check' && args[1]) {
    await checkSpecificUser(args[1]);
  } else if (command === 'fix' || !command) {
    await fixMultipleOrganizations();
  } else {
    console.log(`
Usage: node fix-multiple-organizations.js [command] [options]

Commands:
  fix           Fix all multiple organization issues (default)
  check <id>    Check specific user by Kinde user ID

Examples:
  node fix-multiple-organizations.js fix
  node fix-multiple-organizations.js check kp_b33625677dc74359ba12972c973c304b

This script ensures users are ONLY in their intended organization:
- Removes users from unwanted/default organizations
- Adds users to their intended organization if missing
- Ensures clean single-organization membership
    `);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 