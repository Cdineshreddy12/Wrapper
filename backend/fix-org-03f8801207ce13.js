import { db } from './src/db/index.js';
import {
  organizations,
  tenants,
  tenantUsers,
  customRoles,
  userRoleAssignments
} from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import DNSManagementService from './src/services/dns-management-service.js';

async function fixOrganizationAndDNS() {
  try {
    console.log('🔧 Fixing organization and DNS issues for org_03f8801207ce13\n');

    // 1. Get tenant details
    const tenant = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        adminEmail: tenants.adminEmail
      })
      .from(tenants)
      .where(eq(tenants.kindeOrgId, 'org_03f8801207ce13'))
      .limit(1);

    if (tenant.length === 0) {
      console.log('❌ Tenant not found');
      return;
    }

    const tenantData = tenant[0];
    console.log('✅ Found tenant:', tenantData);

    // 2. Get the admin user ID for this tenant
    const adminUser = await db
      .select({
        userId: tenantUsers.userId,
        name: tenantUsers.name
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantData.tenantId))
      .limit(1);

    if (adminUser.length === 0) {
      console.log('❌ No admin user found for tenant');
      return;
    }

    const adminUserId = adminUser[0].userId;
    console.log('👤 Found admin user:', adminUser[0]);

    // 3. Check if organization exists
    const existingOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.tenantId, tenantData.tenantId));

    if (existingOrg.length === 0) {
      console.log('📝 Creating missing organization...');

      // Create parent organization
      const [newOrg] = await db
        .insert(organizations)
        .values({
          organizationId: uuidv4(),
          tenantId: tenantData.tenantId,
          parentOrganizationId: null, // This is the root organization
          organizationLevel: 1,
          hierarchyPath: '/',
          organizationName: tenantData.companyName,
          organizationCode: `org_${tenantData.subdomain}_${Date.now()}`,
          description: 'Parent organization created during onboarding',
          organizationType: 'parent',
          isActive: true,
          isDefault: true,
          contactEmail: tenantData.adminEmail,
          createdBy: adminUserId, // Use the actual user ID
          updatedBy: adminUserId
        })
        .returning();

      console.log('✅ Organization created:', newOrg.organizationId);
    } else {
      console.log('✅ Organization already exists');
    }

    // 4. Check user role assignments
    const roleAssignment = await db
      .select()
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.userId, adminUserId));

    if (roleAssignment.length === 0) {
      console.log('📝 Creating missing role assignment...');

      // Get the Super Admin role for this tenant
      const role = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName
        })
        .from(customRoles)
        .where(eq(customRoles.tenantId, tenantData.tenantId))
        .limit(1);

      if (role.length > 0) {
        const [assignment] = await db
          .insert(userRoleAssignments)
          .values({
            userId: adminUserId,
            roleId: role[0].roleId,
            assignedBy: adminUserId, // Self-assigned during onboarding
            organizationId: tenantData.tenantId // Using tenant ID due to schema issue
          })
          .returning();

        console.log('✅ Role assignment created:', assignment.assignmentId);
      } else {
        console.log('⚠️ No role found to assign');
      }
    } else {
      console.log('✅ Role assignment already exists');
    }

    // 5. Create DNS record if subdomain exists
    if (tenantData.subdomain) {
      console.log('🌐 Creating DNS record for subdomain...');

      try {
        // Check if DNS record already exists
        const dnsResult = await DNSManagementService.createTenantSubdomain(tenantData.tenantId);
        console.log('✅ DNS record created:', dnsResult);
      } catch (dnsError) {
        if (dnsError.message.includes('already has a subdomain')) {
          console.log('✅ DNS record already exists');
        } else {
          console.log('⚠️ DNS creation failed:', dnsError.message);
        }
      }
    } else {
      console.log('⚠️ No subdomain found - cannot create DNS record');
    }

    // 5. Verify the fixes
    console.log('\n🔍 Verification:');

    const finalTenant = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain
      })
      .from(tenants)
      .where(eq(tenants.kindeOrgId, 'org_03f8801207ce13'))
      .limit(1);

    const finalOrgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.tenantId, tenantData.tenantId));

    const finalAssignments = await db
      .select()
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.userId, adminUserId));

    console.log(`🏢 Tenant: ${finalTenant[0]?.companyName}`);
    console.log(`🏛️ Organizations: ${finalOrgs.length}`);
    console.log(`🔐 Role Assignments: ${finalAssignments.length}`);
    console.log(`🌐 Subdomain: ${finalTenant[0]?.subdomain}`);

    if (finalTenant[0]?.subdomain) {
      console.log(`Expected DNS: ${finalTenant[0].subdomain}.zopkit.com`);
    }

  } catch (error) {
    console.error('❌ Error fixing organization:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the fix
fixOrganizationAndDNS().then(() => {
  console.log('\n🏁 Fix completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
