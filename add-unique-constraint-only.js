// Add only the unique constraint for organization_applications table
async function addUniqueConstraintOnly() {
  try {
    console.log('🔧 Adding unique constraint to organization_applications table...\n');

    const { sql } = await import('drizzle-orm');
    const { db } = await import('./backend/src/db/index.js');

    console.log('🔍 Checking if constraint already exists...');

    // Check if constraint exists
    const checkResult = await db.execute(sql`
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'organization_applications'
      AND c.contype = 'u'
      AND conname = 'organization_applications_tenant_app_unique';
    `);

    if (checkResult.rows && checkResult.rows.length > 0) {
      console.log('✅ Unique constraint already exists!');
      return;
    }

    console.log('🔍 Checking for duplicates before adding constraint...');

    // Check for duplicates
    const duplicatesResult = await db.execute(sql`
      SELECT tenant_id, app_id, COUNT(*) as count
      FROM organization_applications
      GROUP BY tenant_id, app_id
      HAVING COUNT(*) > 1;
    `);

    if (duplicatesResult.rows && duplicatesResult.rows.length > 0) {
      console.log('⚠️ Found duplicate records. Please clean them up first.');
      console.log('Run the fix-missing-app-records.js script again to clean duplicates.');
      return;
    }

    console.log('✅ No duplicates found, adding unique constraint...');

    // Add the unique constraint
    await db.execute(sql`
      CREATE UNIQUE INDEX "organization_applications_tenant_app_unique"
      ON "organization_applications" ("tenant_id", "app_id");
    `);

    console.log('✅ Unique constraint added successfully!');

    // Verify
    const verifyResult = await db.execute(sql`
      SELECT conname FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'organization_applications'
      AND c.contype = 'u'
      AND conname = 'organization_applications_tenant_app_unique';
    `);

    if (verifyResult.rows && verifyResult.rows.length > 0) {
      console.log('✅ Constraint verification successful!');
    } else {
      console.log('❌ Constraint verification failed!');
    }

  } catch (error) {
    console.error('❌ Failed to add unique constraint:', error.message);

    if (error.message.includes('already exists')) {
      console.log('ℹ️ Constraint may already exist from a previous attempt');
    } else {
      console.error('Full error:', error);
    }
  }
}

addUniqueConstraintOnly();
