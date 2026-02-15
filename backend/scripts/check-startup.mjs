#!/usr/bin/env node
/**
 * Quick startup check: DATABASE_URL and Supabase pause warning.
 * Run: npm run start:check   or  node scripts/check-startup.mjs
 */
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL is not set in backend/.env');
  console.error('   Add: DATABASE_URL=postgresql://user:pass@host:5432/dbname');
  process.exit(1);
}

const isSupabase = url.includes('supabase.co');
if (isSupabase) {
  console.log('ℹ️  DATABASE_URL points to Supabase.');
  console.log('   If the project was idle for several days, the database may be PAUSED.');
  console.log('   Open your Supabase dashboard and click "Restore" / "Resume" on the project.');
  console.log('');
}

console.log('✅ DATABASE_URL is set.');
console.log('   Run: npm run dev');
