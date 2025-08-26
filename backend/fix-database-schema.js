import { sql, closeConnection } from './src/db/index.js';

async function fixDatabaseSchema() {
  try {
    console.log('🔧 Fixing database schema...');

    // Add missing stripe_customer_id column to tenants table
    await sql`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
    `;

    console.log('✅ Added stripe_customer_id column to tenants table');

    // Verify the column exists
    const verifyResult = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      AND column_name = 'stripe_customer_id';
    `;

    if (verifyResult.length > 0) {
      console.log('✅ Column verification successful:', verifyResult[0]);
    } else {
      console.log('❌ Column verification failed');
    }

    // Show sample rows
    const sampleRows = await sql`
      SELECT tenant_id, company_name, stripe_customer_id 
      FROM tenants 
      ORDER BY created_at DESC 
      LIMIT 3;
    `;
    console.log('📊 Sample tenants:', sampleRows);

    console.log('🎉 Database schema fix completed!');
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
  } finally {
    await closeConnection();
    process.exit(0);
  }
}

fixDatabaseSchema();
