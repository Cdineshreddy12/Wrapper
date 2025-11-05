// Migration to add unique constraint to organization_applications table
async function addUniqueConstraint() {
  try {
    console.log('🔧 Adding unique constraint to organization_applications table...\n');

    // Import database connection directly
    const { sql } = await import('drizzle-orm');
    const { db } = await import('./backend/src/db/index.js');

    console.log('🔍 Checking for existing duplicates before adding constraint...');

    // Check for duplicates using raw SQL
    const duplicatesResult = await db.execute(sql`
      SELECT tenant_id, app_id, COUNT(*) as count
      FROM organization_applications
      GROUP BY tenant_id, app_id
      HAVING COUNT(*) > 1;
    `);

    if (duplicatesResult.rows && duplicatesResult.rows.length > 0) {
      console.log('⚠️ Found duplicate records that need to be cleaned up:');
      duplicatesResult.rows.forEach(row => {
        console.log(`   Tenant ${row.tenant_id}, App ${row.app_id}: ${row.count} records`);
      });

      console.log('\n🧹 Cleaning up duplicates...');

      // Clean up duplicates by keeping the most recently updated record
      for (const duplicate of duplicatesResult.rows) {
        await db.execute(sql`
          DELETE FROM organization_applications
          WHERE tenant_id = ${duplicate.tenant_id} AND app_id = ${duplicate.app_id}
          AND id NOT IN (
            SELECT id FROM organization_applications
            WHERE tenant_id = ${duplicate.tenant_id} AND app_id = ${duplicate.app_id}
            ORDER BY updated_at DESC
            LIMIT 1
          );
        `);

        console.log(`   ✅ Cleaned up duplicates for tenant ${duplicate.tenant_id}, app ${duplicate.app_id}`);
      }
    } else {
      console.log('✅ No duplicates found');
    }

    console.log('🔧 Adding unique constraint...');

    // Add the unique constraint using raw SQL
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = 'organization_applications'
          AND c.contype = 'u'
          AND conname = 'organization_applications_tenant_app_unique'
        ) THEN
          ALTER TABLE organization_applications
          ADD CONSTRAINT organization_applications_tenant_app_unique
          UNIQUE (tenant_id, app_id);
        END IF;
      END $$;
    `);

    console.log('✅ Unique constraint added successfully!');

    // Verify the constraint was added
    const verifyResult = await db.execute(sql`
      SELECT conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'organization_applications'
      AND c.contype = 'u'
      AND conname = 'organization_applications_tenant_app_unique';
    `);

    if (verifyResult.rows && verifyResult.rows.length > 0) {
      console.log('✅ Constraint verification successful');
    } else {
      console.log('❌ Constraint verification failed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  }
}

addUniqueConstraint();
