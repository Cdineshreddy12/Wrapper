import postgres from 'postgres';
import 'dotenv/config';

async function checkExistingTables() {
  const sql = postgres(process.env.DATABASE_URL);

  try {
    console.log('🔍 Checking existing database tables...\n');

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log('📋 Existing tables:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });

    console.log(`\n📊 Total tables: ${tables.length}`);

    // Check for organization-related columns
    console.log('\n🔍 Checking organization-related columns:');

    const orgColumns = await sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND column_name LIKE '%organization_id%'
      ORDER BY table_name, column_name;
    `;

    console.log('🏢 Organization-related columns:');
    orgColumns.forEach((col) => {
      console.log(`  ${col.table_name}.${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await sql.end();
  }
}

checkExistingTables().then(() => {
  console.log('\n🏁 Table check completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
