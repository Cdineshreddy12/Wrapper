import postgres from 'postgres';
import 'dotenv/config';

// Create direct postgres connection
const sql = postgres(process.env.DATABASE_URL);

async function checkTenantData(tenantId) {
  console.log(`🔍 Checking data for tenant: ${tenantId}\n`);

  try {
    // 1. Check overall database state first
    console.log('1️⃣ Checking overall database state...');
    const totalTenants = await sql`SELECT COUNT(*) as count FROM tenants`;
    const totalOrganizations = await sql`SELECT COUNT(*) as count FROM organizations`;
    const totalUsers = await sql`SELECT COUNT(*) as count FROM tenant_users`;

    console.log(`📊 Database Overview:`);
    console.log(`   - Total Tenants: ${totalTenants[0].count}`);
    console.log(`   - Total Organizations: ${totalOrganizations[0].count}`);
    console.log(`   - Total Users: ${totalUsers[0].count}`);

    if (parseInt(totalTenants[0].count) === 0) {
      console.log('\n🗑️  DATABASE IS EMPTY');
      console.log('💡 All data was deleted in the recent cleanup');
      console.log('🔄 No tenants exist in the database');

      await sql.end();
      return;
    }

    // 2. Check if tenant exists (try both UUID and string formats)
    console.log('\n2️⃣ Checking tenant record...');

    // First try as UUID (if it's a valid UUID)
    let tenant = [];
    try {
      tenant = await sql`SELECT * FROM tenants WHERE tenant_id = ${tenantId}`;
    } catch (uuidError) {
      // If it's not a valid UUID, try searching by other fields
      console.log(`⚠️  ${tenantId} is not a valid UUID, searching by other criteria...`);
    }

    // If not found as UUID, try searching by subdomain or company name
    if (tenant.length === 0) {
      console.log(`🔍 Searching for tenant by subdomain or company name containing: ${tenantId}`);

      // Search by subdomain
      const tenantBySubdomain = await sql`
        SELECT * FROM tenants WHERE subdomain LIKE ${'%' + tenantId + '%'}
      `;

      // Search by company name
      const tenantByCompany = await sql`
        SELECT * FROM tenants WHERE company_name LIKE ${'%' + tenantId + '%'}
      `;

      // Search by tenant_id as string (in case it's stored differently)
      const tenantByStringId = await sql`
        SELECT * FROM tenants WHERE tenant_id::text LIKE ${'%' + tenantId + '%'}
      `;

      if (tenantBySubdomain.length > 0) {
        tenant = tenantBySubdomain;
        console.log(`✅ Found tenant by subdomain: ${tenant[0].subdomain}`);
      } else if (tenantByCompany.length > 0) {
        tenant = tenantByCompany;
        console.log(`✅ Found tenant by company name: ${tenant[0].company_name}`);
      } else if (tenantByStringId.length > 0) {
        tenant = tenantByStringId;
        console.log(`✅ Found tenant by string ID match: ${tenant[0].tenant_id}`);
      }
    }

    if (tenant.length === 0) {
      console.log('❌ Specified tenant not found in database');
      console.log('💡 This is expected since all data was recently deleted');

      // Show what tenants actually exist
      console.log('\n📋 EXISTING TENANTS IN DATABASE:');
      const allTenants = await sql`SELECT tenant_id, company_name, subdomain FROM tenants LIMIT 10`;

      if (allTenants.length > 0) {
        allTenants.forEach((t, index) => {
          console.log(`   ${index + 1}. ID: ${t.tenant_id}`);
          console.log(`      Company: ${t.company_name}`);
          console.log(`      Subdomain: ${t.subdomain}`);
        });

        console.log('\n🔄 Checking data for the first existing tenant instead...');
        tenantId = allTenants[0].tenant_id;
        tenant = await sql`SELECT * FROM tenants WHERE tenant_id = ${tenantId}`;
      } else {
        console.log('🗑️  Database is completely empty');
        await sql.end();
        return;
      }
    }

    console.log('✅ Tenant found:', {
      tenantId: tenant[0].tenant_id,
      companyName: tenant[0].company_name,
      subdomain: tenant[0].subdomain,
      isActive: tenant[0].is_active,
      createdAt: tenant[0].created_at
    });

    // 2. Check organizations
    console.log('\n2️⃣ Checking organizations...');
    const organizations = await sql`
      SELECT * FROM organizations WHERE tenant_id = ${tenantId}
    `;

    console.log(`📋 Found ${organizations.length} organizations:`);
    organizations.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.organization_name} (${org.organization_code})`);
      console.log(`      - Level: ${org.organization_level}`);
      console.log(`      - Type: ${org.organization_type}`);
      console.log(`      - Active: ${org.is_active}`);
    });

    // 3. Check tenant users
    console.log('\n3️⃣ Checking tenant users...');
    const tenantUsers = await sql`
      SELECT * FROM tenant_users WHERE tenant_id = ${tenantId}
    `;

    console.log(`👥 Found ${tenantUsers.length} tenant users:`);
    tenantUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.user_id})`);
      console.log(`      - Admin: ${user.is_tenant_admin}`);
      console.log(`      - Active: ${user.is_active}`);
      console.log(`      - Verified: ${user.is_verified}`);
    });

    // 4. Check subscriptions
    console.log('\n4️⃣ Checking subscriptions...');
    const subscriptions = await sql`
      SELECT * FROM subscriptions WHERE tenant_id = ${tenantId}
    `;

    console.log(`💰 Found ${subscriptions.length} subscriptions:`);
    subscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. Plan: ${sub.plan}`);
      console.log(`      - Status: ${sub.status}`);
      console.log(`      - Trial: ${sub.is_trial_user ? 'Yes' : 'No'}`);
      console.log(`      - Trial End: ${sub.trial_end}`);
    });

    // 5. Check custom roles
    console.log('\n5️⃣ Checking custom roles...');
    const customRoles = await sql`
      SELECT * FROM custom_roles WHERE tenant_id = ${tenantId}
    `;

    console.log(`🔐 Found ${customRoles.length} custom roles:`);
    customRoles.forEach((role, index) => {
      console.log(`   ${index + 1}. ${role.role_name}`);
      console.log(`      - System Role: ${role.is_system_role}`);
      console.log(`      - Default: ${role.is_default}`);
    });

    // 6. Check user role assignments
    console.log('\n6️⃣ Checking user role assignments...');
    const roleAssignments = await sql`
      SELECT ura.*, tu.email, cr.role_name, o.organization_name
      FROM user_role_assignments ura
      LEFT JOIN tenant_users tu ON ura.user_id = tu.user_id
      LEFT JOIN custom_roles cr ON ura.role_id = cr.role_id
      LEFT JOIN organizations o ON ura.organization_id = o.organization_id
      WHERE tu.tenant_id = ${tenantId}
    `;

    console.log(`👤 Found ${roleAssignments.length} role assignments:`);
    roleAssignments.forEach((assignment, index) => {
      console.log(`   ${index + 1}. ${assignment.email} → ${assignment.role_name}`);
      console.log(`      - Organization: ${assignment.organization_name || 'N/A'}`);
      console.log(`      - Active: ${assignment.is_active}`);
    });

    // 7. Check credits
    console.log('\n7️⃣ Checking credits...');
    const credits = await sql`
      SELECT * FROM credits WHERE tenant_id = ${tenantId}
    `;

    console.log(`💳 Found ${credits.length} credit records:`);
    credits.forEach((credit, index) => {
      console.log(`   ${index + 1}. Available: ${credit.available_credits}`);
      console.log(`      - Total: ${credit.total_credits}`);
      console.log(`      - Active: ${credit.is_active}`);
    });

    // 8. Check audit logs
    console.log('\n8️⃣ Checking audit logs...');
    const auditLogs = await sql`
      SELECT COUNT(*) as count FROM audit_logs WHERE tenant_id = ${tenantId}
    `;

    console.log(`📝 Audit log entries: ${auditLogs[0].count}`);

    // 9. Check trial events
    console.log('\n9️⃣ Checking trial events...');
    const trialEvents = await sql`
      SELECT * FROM trial_events WHERE tenant_id = ${tenantId}
    `;

    console.log(`🎯 Found ${trialEvents.length} trial events:`);
    trialEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.event_type} at ${event.created_at}`);
    });

    // Summary
    console.log('\n📊 TENANT DATA SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Tenant ID: ${tenantId}`);
    console.log(`Company: ${tenant[0].company_name}`);
    console.log(`Subdomain: ${tenant[0].subdomain}`);
    console.log(`Organizations: ${organizations.length}`);
    console.log(`Users: ${tenantUsers.length}`);
    console.log(`Subscriptions: ${subscriptions.length}`);
    console.log(`Roles: ${customRoles.length}`);
    console.log(`Role Assignments: ${roleAssignments.length}`);
    console.log(`Credit Records: ${credits.length}`);
    console.log(`Audit Logs: ${auditLogs[0].count}`);
    console.log(`Trial Events: ${trialEvents.length}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error checking tenant data:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close the connection
    await sql.end();
  }
}

// Get tenant ID from command line or use the provided one
const tenantId = process.argv[2] || 'org_878448121226e4';
checkTenantData(tenantId).then(() => {
  console.log('\n🏁 Tenant data check completed');
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
