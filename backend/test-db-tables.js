import { sql } from './src/db/index.js';

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...');

    // Check if organizations table exists
    const orgTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'organizations'
    `;

    console.log('📋 Organizations table exists:', orgTable.length > 0);

    // Check if locations table exists
    const locTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'locations'
    `;

    console.log('📍 Locations table exists:', locTable.length > 0);

    // Check if location_assignments table exists
    const locAssignTable = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'location_assignments'
    `;

    console.log('🔗 Location assignments table exists:', locAssignTable.length > 0);

    // List all tables
    const allTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('📊 All tables in database:');
    allTables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await sql.end();
  }
}

checkTables();
