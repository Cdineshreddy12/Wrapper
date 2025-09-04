import { db } from './src/db/index.js';
import {
  organizations,
  tenants,
  tenantUsers,
  customRoles,
  userRoleAssignments,
  subscriptions,
  credits
} from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';

async function debugOrganization() {
  try {
    console.log('🔍 Debugging organization: org_03f8801207ce13\n');

    // 1. Check tenant with this Kinde org ID
    console.log('1. Checking tenants table...');
    const tenant = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        kindeOrgId: tenants.kindeOrgId,
        adminEmail: tenants.adminEmail,
        gstin: tenants.gstin,
        onboardingCompleted: tenants.onboardingCompleted,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt
      })
      .from(tenants)
      .where(eq(tenants.kindeOrgId, 'org_03f8801207ce13'))
      .limit(1);

    if (tenant.length === 0) {
      console.log('❌ No tenant found with org_03f8801207ce13');
      return;
    }

    console.log('✅ Found tenant:', tenant[0]);
    const tenantId = tenant[0].tenantId;

    // 2. Check organizations for this tenant
    console.log('\n2. Checking organizations...');
    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.tenantId, tenantId));

    console.log(`📊 Found ${orgs.length} organizations:`);
    orgs.forEach((org, index) => {
      console.log(`${index + 1}. ${org.organizationName} (${org.organizationCode}) - ${org.organizationType}`);
    });

    // 3. Check tenant users for this tenant
    console.log('\n3. Checking tenant users...');
    const users = await db
      .select({
        userId: tenantUsers.userId,
        kindeUserId: tenantUsers.kindeUserId,
        email: tenantUsers.email,
        name: tenantUsers.name,
        phone: tenantUsers.phone,
        isActive: tenantUsers.isActive,
        isTenantAdmin: tenantUsers.isTenantAdmin,
        onboardingCompleted: tenantUsers.onboardingCompleted,
        createdAt: tenantUsers.createdAt
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId));

    console.log(`👥 Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Kinde ID: ${user.kindeUserId}`);
      console.log(`   Admin: ${user.isTenantAdmin}, Active: ${user.isActive}, Onboarding: ${user.onboardingCompleted}`);
    });

    // 4. Check for duplicate users by email
    console.log('\n4. Checking for duplicate users...');
    const userEmails = users.map(u => u.email);
    const uniqueEmails = [...new Set(userEmails)];

    if (userEmails.length !== uniqueEmails.length) {
      console.log('⚠️  DUPLICATE USERS DETECTED!');
      uniqueEmails.forEach(email => {
        const duplicates = users.filter(u => u.email === email);
        if (duplicates.length > 1) {
          console.log(`   Email ${email}: ${duplicates.length} users`);
          duplicates.forEach((dup, idx) => {
            console.log(`     ${idx + 1}. User ID: ${dup.userId}, Kinde ID: ${dup.kindeUserId}`);
          });
        }
      });
    } else {
      console.log('✅ No duplicate users found');
    }

    // 5. Check custom roles
    console.log('\n5. Checking custom roles...');
    const roles = await db
      .select()
      .from(customRoles)
      .where(eq(customRoles.tenantId, tenantId));

    console.log(`🔐 Found ${roles.length} roles:`);
    roles.forEach((role, index) => {
      console.log(`${index + 1}. ${role.roleName} (${role.roleId})`);
    });

    // 6. Check user role assignments
    console.log('\n6. Checking user role assignments...');
    const assignments = await db
      .select({
        assignmentId: userRoleAssignments.id,
        userId: userRoleAssignments.userId,
        roleId: userRoleAssignments.roleId,
        assignedBy: userRoleAssignments.assignedBy
      })
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.organizationId, tenantId)); // Note: using tenantId as organizationId due to schema issue

    console.log(`📋 Found ${assignments.length} role assignments:`);
    assignments.forEach((assignment, index) => {
      console.log(`${index + 1}. User ${assignment.userId} assigned role ${assignment.roleId}`);
    });

    // 7. Check subscriptions
    console.log('\n7. Checking subscriptions...');
    const subs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId));

    console.log(`📦 Found ${subs.length} subscriptions:`);
    subs.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.plan} (${sub.status}) - Trial: ${sub.trialStart} to ${sub.trialEnd}`);
    });

    // 8. Check credits
    console.log('\n8. Checking credits...');
    const creditRecords = await db
      .select()
      .from(credits)
      .where(eq(credits.tenantId, tenantId));

    console.log(`💰 Found ${creditRecords.length} credit records:`);
    creditRecords.forEach((credit, index) => {
      console.log(`${index + 1}. ${credit.amount} credits - Expires: ${credit.expiryDate}`);
    });

    // 9. Summary
    console.log('\n📊 SUMMARY:');
    console.log(`🏢 Tenant: ${tenant[0].companyName}`);
    console.log(`🌐 Subdomain: ${tenant[0].subdomain}.zopkit.com`);
    console.log(`👥 Users: ${users.length}`);
    console.log(`🏛️ Organizations: ${orgs.length}`);
    console.log(`🔐 Roles: ${roles.length}`);
    console.log(`📦 Subscriptions: ${subs.length}`);
    console.log(`💰 Credits: ${creditRecords.length}`);
    console.log(`✅ Onboarding Completed: ${tenant[0].onboardingCompleted}`);

    // 10. Check DNS records
    console.log('\n🌐 DNS CHECK:');
    if (tenant[0].subdomain) {
      console.log(`Expected subdomain: ${tenant[0].subdomain}.zopkit.com`);
      console.log('Note: DNS records are created asynchronously after onboarding completion');
    } else {
      console.log('❌ No subdomain found - DNS records cannot be created');
    }

  } catch (error) {
    console.error('❌ Error debugging organization:', error);
  }
}

// Run the debug
debugOrganization().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
