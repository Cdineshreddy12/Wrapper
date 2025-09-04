import { db } from './src/db/index.js';
import { organizations } from './src/db/schema/organizations.js';
import { tenants } from './src/db/schema/tenants.js';
import { tenantUsers } from './src/db/schema/users.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function createMissingOrganization() {
  try {
    console.log('🔧 Creating missing parent organization for tenant...\n');

    // Get the tenant details
    const tenantResult = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        adminEmail: tenants.adminEmail
      })
      .from(tenants)
      .where(eq(tenants.kindeOrgId, 'org_ce82b312045c94'))
      .limit(1);

    if (!tenantResult || tenantResult.length === 0) {
      console.log('❌ Tenant not found');
      return;
    }

    const tenant = tenantResult[0];
    console.log('✅ Found tenant:', tenant);

    // Get the admin user for this tenant
    const userResult = await db
      .select({
        userId: tenantUsers.userId,
        email: tenantUsers.email,
        name: tenantUsers.name
      })
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, tenant.tenantId),
        eq(tenantUsers.email, tenant.adminEmail)
      ))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }

    const adminUser = userResult[0];
    console.log('✅ Found admin user:', adminUser);

    // Create the parent organization
    const organizationId = uuidv4();

    const organizationData = {
      organizationId,
      tenantId: tenant.tenantId,
      organizationName: tenant.companyName,
      organizationCode: `org_${Date.now()}`, // Generate a unique code
      description: 'Parent organization created during setup fix',
      organizationType: 'parent',
      organizationLevel: 1,
      hierarchyPath: organizationId,
      isActive: true,
      isDefault: true,
      responsiblePersonId: adminUser.userId,
      createdBy: adminUser.userId,
      createdAt: new Date()
    };

    console.log('🏗️ Creating organization:', organizationData);

    const result = await db.insert(organizations).values(organizationData).returning();

    console.log('✅ Organization created successfully:', result[0]);

    // Note: Skipping tenant and user organization updates due to schema constraints
    // Both tenants.parentOrganizationId and tenant_users.primaryOrganizationId incorrectly reference tenants instead of organizations
    console.log('⚠️ Skipping tenant parent organization update (schema constraint issue)');
    console.log('⚠️ Skipping user primary organization update (schema constraint issue)');

    console.log('\n📋 Next Steps Required:');
    console.log('1. Fix database schema - organization reference fields are incorrectly pointing to tenants');
    console.log('2. Update tenant.parentOrganizationId to reference organizations.organizationId');
    console.log('3. Update tenant_users.primaryOrganizationId to reference organizations.organizationId');
    console.log('4. Run database migration to fix existing data');

    console.log('\n🎉 Organization setup completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Organization ID: ${organizationId}`);
    console.log(`   - Organization Name: ${tenant.companyName}`);
    console.log(`   - Organization Code: ${organizationData.organizationCode}`);
    console.log(`   - Tenant: ${tenant.tenantId}`);
    console.log(`   - Admin User: ${adminUser.userId}`);

  } catch (error) {
    console.error('❌ Error creating organization:', error);
  } finally {
    process.exit(0);
  }
}

createMissingOrganization();
