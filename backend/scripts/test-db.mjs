#!/usr/bin/env node
/**
 * One-off DB connection test.
 * Run from backend:  node scripts/test-db.mjs
 * Or:  npm run test:db
 */
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Add it to backend/.env');
  process.exit(1);
}

// Mask password in log
const safeUrl = DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
console.log('🔌 Testing DB connection...', safeUrl);

const sql = postgres(DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
});

try {
  const result = await sql`SELECT 1 as ok, current_database() as db, now() as at`;
  console.log('✅ Connection OK');
  console.log('   database:', result[0].db);
  console.log('   at:', result[0].at);
  await sql.end();
  process.exit(0);
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  if (err.code === 'ETIMEDOUT') console.error('   (timeout – check network or if Supabase project is paused)');
  if (err.code === 'ECONNREFUSED') console.error('   (refused – is PostgreSQL running?)');
  await sql.end().catch(() => {});
  process.exit(1);
}
