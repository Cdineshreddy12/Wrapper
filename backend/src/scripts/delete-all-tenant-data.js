#!/usr/bin/env node
/**
 * Deletes all tenant data by running delete-all-tenant-data.sql in a transaction.
 * Run from backend: npm run delete-all-tenants
 */
import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = join(__dirname, 'delete-all-tenant-data.sql');

function getStatements(content) {
  return content
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== 'BEGIN' && s !== 'COMMIT');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });
  const sqlContent = readFileSync(SQL_PATH, 'utf8');
  const statements = getStatements(sqlContent);

  const isEntitiesLeafDelete = (s) =>
    s.includes('DELETE FROM entities') && s.includes('NOT EXISTS');

  try {
    console.log('Deleting all tenant data...');
    await sql.begin(async (tx) => {
      for (const stmt of statements) {
        try {
          if (isEntitiesLeafDelete(stmt)) {
            let total = 0;
            for (;;) {
              const r = await tx.unsafe(stmt);
              const n = r?.count ?? r?.length ?? 0;
              if (n === 0) break;
              total += n;
            }
            if (total > 0) console.log(`  entities: ${total} rows (leaves-first)`);
          } else {
            await tx.unsafe(stmt);
          }
        } catch (e) {
          if (e.code === '42P01') continue; // skip missing table
          throw e;
        }
      }
    });
    console.log('✅ All tenant data deleted.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
