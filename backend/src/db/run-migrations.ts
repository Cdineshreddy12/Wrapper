import 'dotenv/config';
import path from 'node:path';

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);
  const migrationsFolder = path.resolve(process.cwd(), 'src/db/migrations');

  try {
    console.log(`🗄️ Applying versioned migrations from: ${migrationsFolder}`);
    await migrate(db, {
      migrationsFolder,
      migrationsSchema: 'public',
      migrationsTable: '__drizzle_migrations',
    });
    console.log('✅ Migrations applied successfully');
  } finally {
    await client.end();
  }
}

runMigrations().catch((error: unknown) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
