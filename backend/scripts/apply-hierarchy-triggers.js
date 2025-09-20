/**
 * Apply Hierarchy Triggers Migration
 * This script applies the database triggers for automatic hierarchy path management
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyHierarchyTriggers() {
  console.log('🚀 Starting hierarchy triggers migration...');

  const sql = postgres(process.env.DATABASE_URL);

  try {
    console.log('✅ Connected to database');

    // Read the SQL file
    const sqlFilePath = join(__dirname, '../src/db/migrations/hierarchy_triggers.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf8');

    console.log('📄 Read SQL file, executing...');

    // Execute the SQL file
    await sql.unsafe(sqlContent);
    console.log('✅ Hierarchy triggers applied successfully!');

    // Test the triggers by rebuilding existing hierarchy paths
    console.log('🔄 Rebuilding existing hierarchy paths...');
    await sql`SELECT rebuild_all_hierarchy_paths()`;
    console.log('✅ Hierarchy paths rebuilt!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    sql.end();
    process.exit(0);
  }
}

// Run the migration
applyHierarchyTriggers();
