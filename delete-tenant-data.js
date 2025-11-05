// Script to safely delete all data for a specific tenant
// Order: Delete from child tables first, then parent tables to avoid FK constraints

import { db } from './backend/src/db/index.js';
import { sql } from 'drizzle-orm';

const TENANT_ID = '29cc915c-0663-43bf-ac2e-557f8edefbad';

async function deleteTenantData(tenantId) {
  console.log(`🗑️ Starting deletion of all data for tenant: ${tenantId}`);
  console.log('⚠️ This operation cannot be undone!');

  try {
    // Check if tenant exists first
    const tenantCheck = await db.execute(sql`SELECT company_name FROM tenants WHERE tenant_id = ${tenantId}`);
    const rows = tenantCheck.rows || tenantCheck;
    if (!rows || rows.length === 0) {
      console.log('❌ Tenant not found');
      return;
    }

    const tenantName = rows[0].company_name;
    console.log(`📋 Found tenant: ${tenantName} (${tenantId})`);

    // ==========================================
    // DELETE IN CORRECT ORDER (Child -> Parent)
    // ==========================================

    console.log('🗑️ Deleting all tenant-related data...');

    // Delete from all tables that reference this tenant
    // Order matters: child tables first, then parent tables

    // 1. Delete credit usage
    await db.execute(sql`DELETE FROM credit_usage WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted credit usage');

    // 2. Delete credit purchases
    await db.execute(sql`DELETE FROM credit_purchases WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted credit purchases');

    // 3. Delete credit transactions
    await db.execute(sql`DELETE FROM credit_transactions WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted credit transactions');

    // 4. Delete membership history (references entities, so we need to join)
    await db.execute(sql`
      DELETE FROM membership_history
      WHERE entity_id IN (
        SELECT entity_id FROM entities WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted membership history');

    // 5. Delete membership invitations (references entities, so we need to join)
    await db.execute(sql`
      DELETE FROM membership_invitations
      WHERE membership_id IN (
        SELECT membership_id FROM organization_memberships
        WHERE entity_id IN (
          SELECT entity_id FROM entities WHERE tenant_id = ${tenantId}
        )
      )
    `);
    console.log('✅ Deleted membership invitations');

    // 6. Delete organization memberships (references entities)
    await db.execute(sql`
      DELETE FROM organization_memberships
      WHERE entity_id IN (
        SELECT entity_id FROM entities WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted organization memberships');

    // 7. Delete onboarding events
    await db.execute(sql`DELETE FROM onboarding_events WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted onboarding events');

    // 8. Delete tenant invitations
    await db.execute(sql`DELETE FROM tenant_invitations WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted tenant invitations');

    // 9. Delete payments
    await db.execute(sql`DELETE FROM payments WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted payments');

    // 10. Delete subscriptions
    await db.execute(sql`DELETE FROM subscriptions WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted subscriptions');

    // 11. Delete user application permissions
    await db.execute(sql`DELETE FROM user_application_permissions WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted user application permissions');

    // 12. Delete organization applications
    await db.execute(sql`DELETE FROM organization_applications WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted organization applications');

    // 13. Delete credit allocation transactions
    await db.execute(sql`DELETE FROM credit_allocation_transactions WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted credit allocation transactions');

    // 14. Delete credit allocations
    await db.execute(sql`DELETE FROM credit_allocations WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted credit allocations');

    // 15. Delete credits
    await db.execute(sql`DELETE FROM credits WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted credit balances');

    // 16. Delete entities
    const entitiesResult = await db.execute(sql`DELETE FROM entities WHERE tenant_id = ${tenantId}`);
    console.log(`✅ Deleted ${entitiesResult.rowCount} entities`);

    // 17. Delete audit logs (references tenant_users)
    await db.execute(sql`
      DELETE FROM audit_logs
      WHERE user_id IN (
        SELECT user_id FROM tenant_users WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted audit logs');

    // 18. Delete user manager relationships (references tenant_users)
    await db.execute(sql`
      DELETE FROM user_manager_relationships
      WHERE user_id IN (
        SELECT user_id FROM tenant_users WHERE tenant_id = ${tenantId}
      ) OR manager_id IN (
        SELECT user_id FROM tenant_users WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted user manager relationships');

    // 19. Delete user sessions (references tenant_users)
    await db.execute(sql`
      DELETE FROM user_sessions
      WHERE user_id IN (
        SELECT user_id FROM tenant_users WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted user sessions');

    // 20. Delete user role assignments (references tenant_users)
    await db.execute(sql`
      DELETE FROM user_role_assignments
      WHERE user_id IN (
        SELECT user_id FROM tenant_users WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted user role assignments');

    // 21. Delete usage logs (references tenant_users)
    await db.execute(sql`
      DELETE FROM usage_logs
      WHERE user_id IN (
        SELECT user_id FROM tenant_users WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted usage logs');

    // 22. Delete responsibility history (references tenant_users)
    await db.execute(sql`
      DELETE FROM responsibility_history
      WHERE changed_by IN (
        SELECT user_id FROM tenant_users WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted responsibility history');

    // 23. Delete responsible persons (references tenant_users)
    await db.execute(sql`
      DELETE FROM responsible_persons
      WHERE user_id IN (
        SELECT user_id FROM tenant_users WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted responsible persons');

    // 24. Delete credit configurations (references tenant_users)
    await db.execute(sql`
      DELETE FROM credit_configurations
      WHERE created_by IN (
        SELECT user_id FROM tenant_users WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted credit configurations');

    // 25. Delete custom roles (references tenant_users)
    await db.execute(sql`
      DELETE FROM custom_roles
      WHERE created_by IN (
        SELECT user_id FROM tenant_users WHERE tenant_id = ${tenantId}
      )
    `);
    console.log('✅ Deleted custom roles');

    // 26. Delete tenant users
    const usersResult = await db.execute(sql`DELETE FROM tenant_users WHERE tenant_id = ${tenantId}`);
    console.log(`✅ Deleted ${usersResult.rowCount} tenant users`);

    // 27. Finally, delete the tenant itself
    await db.execute(sql`DELETE FROM tenants WHERE tenant_id = ${tenantId}`);
    console.log('✅ Deleted tenant record');

    console.log('\n🎉 SUCCESS: All tenant data has been deleted!');
    console.log(`📊 Summary:`);
    console.log(`   - Tenant: ${tenantName}`);
    console.log(`   - Users deleted: ${usersResult?.rowCount || 0}`);
    console.log(`   - Entities deleted: ${entitiesResult?.rowCount || 0}`);
    console.log(`   - Tenant record: deleted`);

  } catch (error) {
    console.error('❌ Error during tenant deletion:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      code: error.code,
      table: error.table,
      constraint: error.constraint
    });
    process.exit(1);
  }
}

// Run the deletion
console.log('🚨 WARNING: This will permanently delete ALL data for tenant:', TENANT_ID);
console.log('Type "YES" to confirm deletion:');

process.stdin.on('data', (data) => {
  const input = data.toString().trim();
  if (input === 'YES') {
    deleteTenantData(TENANT_ID);
  } else {
    console.log('❌ Deletion cancelled');
    process.exit(0);
  }
});
