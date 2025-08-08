#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tenants, tenantUsers } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';
import kindeService from '../src/services/kinde-service.js';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

console.log('🔧 Organization Assignment Fixer');
console.log('=================================\n');

async function fixOrganizationAssignments() {
  try {
    // Get all tenants with their admin users
    const tenantsWithUsers = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        kindeOrgId: tenants.kindeOrgId,
        adminEmail: tenants.adminEmail,
        userId: tenantUsers.userId,
        kindeUserId: tenantUsers.kindeUserId,
        userEmail: tenantUsers.email,
        userName: tenantUsers.name,
        isTenantAdmin: tenantUsers.isTenantAdmin
      })
      .from(tenants)
      .leftJoin(tenantUsers, eq(tenants.tenantId, tenantUsers.tenantId))
      .where(eq(tenantUsers.isTenantAdmin, true)); // Only admin users

    console.log(`Found ${tenantsWithUsers.length} tenant-admin relationships to check\n`);

    for (const record of tenantsWithUsers) {
      console.log(`📋 Checking: ${record.companyName} (${record.subdomain})`);
      console.log(`   Admin: ${record.userName} (${record.userEmail})`);
      console.log(`   Kinde User ID: ${record.kindeUserId}`);
      console.log(`   Expected Org: ${record.kindeOrgId}\n`);

      if (!record.kindeUserId || !record.kindeOrgId) {
        console.log('   ⚠️  Missing Kinde User ID or Org ID - skipping\n');
        continue;
      }

      try {
        // Check user's current organizations in Kinde
        console.log('   🔍 Checking user organizations in Kinde...');
        const userOrgs = await kindeService.getUserOrganizations(record.kindeUserId);
        
        const userOrgCodes = userOrgs.organizations?.map(org => org.code) || [];
        console.log(`   📊 User is in organizations: [${userOrgCodes.join(', ')}]`);

        const isInCorrectOrg = userOrgCodes.includes(record.kindeOrgId);
        
        if (isInCorrectOrg) {
          console.log('   ✅ User is correctly assigned to organization\n');
          continue;
        }

        // User is not in the correct organization - fix it
        console.log('   ❌ User is NOT in the correct organization');
        console.log('   🔧 Attempting to fix assignment...');

        try {
          await kindeService.addUserToOrganization(record.kindeUserId, record.kindeOrgId);
          console.log('   ✅ Successfully assigned user to organization');

          // Verify the fix
          const verifyOrgs = await kindeService.getUserOrganizations(record.kindeUserId);
          const verifyOrgCodes = verifyOrgs.organizations?.map(org => org.code) || [];
          
          if (verifyOrgCodes.includes(record.kindeOrgId)) {
            console.log('   ✅ Assignment verified successfully');
          } else {
            console.log('   ⚠️  Assignment not verified - may need manual intervention');
          }

        } catch (assignError) {
          console.log(`   ❌ Failed to assign user to organization: ${assignError.message}`);
          
          // Try alternative method - invite user to organization
          try {
            console.log('   🔄 Trying invitation method as fallback...');
            await kindeService.inviteUserToOrganization(record.userEmail, record.kindeOrgId);
            console.log('   ✅ User invited to organization as fallback');
          } catch (inviteError) {
            console.log(`   ❌ Invite also failed: ${inviteError.message}`);
          }
        }

        console.log(''); // Add spacing between records

      } catch (error) {
        console.log(`   ❌ Error checking user organizations: ${error.message}\n`);
      }
    }

    console.log('🎉 Organization assignment check completed!');

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
        isTenantAdmin: tenantUsers.isTenantAdmin,
        onboardingCompleted: tenantUsers.onboardingCompleted
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.kindeUserId, kindeUserId))
      .limit(1);

    if (!dbUser) {
      console.log('❌ User not found in database');
      return;
    }

    // Get tenant
    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        kindeOrgId: tenants.kindeOrgId
      })
      .from(tenants)
      .where(eq(tenants.tenantId, dbUser.tenantId))
      .limit(1);

    console.log('📊 Database Info:');
    console.log(`   User: ${dbUser.name} (${dbUser.email})`);
    console.log(`   Tenant: ${tenant.companyName} (${tenant.subdomain})`);
    console.log(`   Expected Kinde Org: ${tenant.kindeOrgId}`);
    console.log(`   Onboarding Completed: ${dbUser.onboardingCompleted}`);
    console.log('');

    // Check Kinde organizations
    try {
      const userOrgs = await kindeService.getUserOrganizations(kindeUserId);
      console.log('📊 Kinde Organizations:');
      
      if (userOrgs.organizations?.length > 0) {
        userOrgs.organizations.forEach(org => {
          const isCorrect = org.code === tenant.kindeOrgId ? '✅' : '❌';
          console.log(`   ${isCorrect} ${org.code} (${org.name})`);
        });
      } else {
        console.log('   No organizations found');
      }

      // Check if user is in correct org
      const isInCorrectOrg = userOrgs.organizations?.some(org => org.code === tenant.kindeOrgId);
      
      if (isInCorrectOrg) {
        console.log('\n✅ User is correctly assigned to their organization');
      } else {
        console.log('\n❌ User is NOT in their correct organization');
        console.log('💡 Run with --fix to attempt automatic repair');
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
    await fixOrganizationAssignments();
  } else {
    console.log(`
Usage: node fix-organization-assignment.js [command] [options]

Commands:
  fix           Fix all organization assignments (default)
  check <id>    Check specific user by Kinde user ID

Examples:
  node fix-organization-assignment.js fix
  node fix-organization-assignment.js check kp_1c9ff509224847dcb297534348556643

This script:
- Checks if users are properly assigned to their Kinde organizations
- Fixes mismatched assignments automatically
- Provides detailed diagnostics for troubleshooting
    `);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 