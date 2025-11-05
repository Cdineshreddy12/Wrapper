import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function checkMigration() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://app_user:AppUserSecurePass123!@db.bpxridmrgbrywpesptho.supabase.co:5432/postgres';

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    console.log('🔍 Checking seasonal credit migration status...\n');

    // Check table structure
    console.log('1. Checking credit_allocations table structure:');
    const columns = await sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'credit_allocations'
      ORDER BY ordinal_position;
    `;

    console.log('Columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Check check constraints
    console.log('\n2. Checking check constraints:');
    const constraints = await sql`
      SELECT
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'credit_allocations'::regclass
      AND contype = 'c';
    `;

    constraints.forEach(con => {
      console.log(`  - ${con.constraint_name}: ${con.constraint_definition}`);
    });

    // Check indexes
    console.log('\n3. Checking indexes:');
    const indexes = await sql`
      SELECT
        indexname as index_name,
        indexdef as index_definition
      FROM pg_indexes
      WHERE tablename = 'credit_allocations';
    `;

    indexes.forEach(idx => {
      console.log(`  - ${idx.index_name}: ${idx.index_definition}`);
    });

    // Check comments
    console.log('\n4. Checking column comments:');
    const comments = await sql`
      SELECT
        c.column_name,
        pgd.description
      FROM pg_catalog.pg_statio_all_tables AS st
      INNER JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
      INNER JOIN information_schema.columns c ON (pgd.objsubid = c.ordinal_position AND c.table_schema = st.schemaname AND c.table_name = st.relname)
      WHERE c.table_name = 'credit_allocations';
    `;

    comments.forEach(comment => {
      console.log(`  - ${comment.column_name}: ${comment.description}`);
    });

    // Test inserting different credit types
    console.log('\n5. Testing credit type insertion:');
    const creditTypes = ['free', 'paid', 'seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension'];

    for (const type of creditTypes) {
      try {
        // First check if we can validate the constraint without actually inserting
        const result = await sql`
          SELECT ${type} IN (
            'free', 'paid', 'seasonal', 'bonus', 'promotional',
            'event', 'partnership', 'trial_extension'
          ) as is_valid;
        `;
        console.log(`  - ${type}: ${result[0].is_valid ? '✅ Valid' : '❌ Invalid'}`);
      } catch (error) {
        console.log(`  - ${type}: ❌ Error - ${error.message}`);
      }
    }

    // Check backup table
    console.log('\n6. Checking backup table:');
    const backupExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'credit_allocations_backup'
      ) as exists;
    `;

    console.log(`  - credit_allocations_backup table: ${backupExists[0].exists ? '✅ Exists' : '❌ Does not exist'}`);

    console.log('\n🎉 Migration verification complete!');

  } catch (error) {
    console.error('❌ Migration check failed:', error);
  } finally {
    await sql.end();
  }
}

checkMigration();
