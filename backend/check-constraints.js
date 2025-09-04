import postgres from 'postgres';
import 'dotenv/config';

async function checkConstraints() {
  const sql = postgres(process.env.DATABASE_URL);

  try {
    console.log('🔍 Checking foreign key constraints that reference tenants incorrectly...\n');

    // Check all foreign key constraints that reference tenant_id but should reference organization_id
    const badConstraints = await sql`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND kcu.column_name LIKE '%organization_id%'
        AND ccu.table_name = 'tenants'
        AND ccu.column_name = 'tenant_id'
      ORDER BY tc.table_name;
    `;

    console.log('🔗 Constraints that need fixing:');
    badConstraints.forEach((constraint, index) => {
      console.log(`${index + 1}. ${constraint.table_name}.${constraint.column_name} → ${constraint.referenced_table}.${constraint.referenced_column}`);
      console.log(`   Constraint: ${constraint.constraint_name}`);
    });

    if (badConstraints.length === 0) {
      console.log('✅ No incorrect organization_id constraints found!');
    }

    console.log(`\n📊 Total constraints to fix: ${badConstraints.length}`);

    // Also check organizations table structure
    console.log('\n🏢 Checking organizations table structure:');
    const orgColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log('📋 Organizations table columns:');
    orgColumns.forEach((col) => {
      console.log(`  ${col.column_name}: ${col.data_type}${col.is_nullable === 'YES' ? ' (nullable)' : ' (not null)'}`);
    });

  } catch (error) {
    console.error('❌ Error checking constraints:', error);
  } finally {
    await sql.end();
  }
}

checkConstraints().then(() => {
  console.log('\n🏁 Constraint check completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
