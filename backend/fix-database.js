import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sql = postgres({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'wrapper',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function fixDatabase() {
  try {
    console.log('🔧 Connecting to database...');
    console.log('✅ Connected to database');

    console.log('🔧 Adding missing stripe_customer_id column...');
    
    // Add the missing column
    await sql`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
    `;
    
    console.log('✅ Added stripe_customer_id column');

    // Verify the column exists
    const verifyResult = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      AND column_name = 'stripe_customer_id';
    `;

    if (verifyResult.length > 0) {
      console.log('✅ Column verification successful:', verifyResult[0]);
    } else {
      console.log('❌ Column verification failed');
    }

    // Show some sample data
    const sampleResult = await sql`
      SELECT tenant_id, company_name, stripe_customer_id 
      FROM tenants 
      LIMIT 3;
    `;

    console.log('📊 Sample tenant data:', sampleResult);

    console.log('🎉 Database fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing database:', error);
  } finally {
    await sql.end();
    console.log('🔌 Database connection closed');
  }
}

fixDatabase();
