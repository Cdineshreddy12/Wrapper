// Simple database connection test
const { db } = require('./src/db/index.js');

async function testDBConnection() {
  console.log('🧪 TESTING DATABASE CONNECTION\n');

  try {
    // Simple query to test connection
    console.log('Testing basic database connection...');
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection successful');
    console.log('Result:', result);

    // Try to list tables
    console.log('\nListing available tables...');
    const tables = await db.execute(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log('Available tables:');
    tables.forEach(row => {
      console.log(`  - ${row.tablename}`);
    });

  } catch (error) {
    console.log('❌ Database connection failed:');
    console.log('Error:', error.message);
    console.log('Code:', error.code);
    console.log('This suggests database is not running or credentials are incorrect');
  }
}

testDBConnection().catch(console.error);
