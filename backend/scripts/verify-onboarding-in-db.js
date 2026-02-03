#!/usr/bin/env node
/**
 * Verifies onboarding success in the database (same checks you can run via Supabase MCP execute_sql).
 * Run from backend: node scripts/verify-onboarding-in-db.js
 *
 * Optional: EMAIL=user@example.com to check a specific user; otherwise shows latest tenants + users.
 */
import 'dotenv/config';
import postgres from 'postgres';

const sqlQuery = `
  SELECT
    t.tenant_id,
    t.company_name,
    t.subdomain,
    t.admin_email,
    t.created_at AS tenant_created_at,
    u.user_id,
    u.email,
    u.name,
    u.onboarding_completed,
    u.onboarding_step
  FROM tenants t
  LEFT JOIN tenant_users u ON u.tenant_id = t.tenant_id
  ORDER BY t.created_at DESC
  LIMIT 20
`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });
  const email = process.env.EMAIL;

  try {
    if (email) {
      console.log('🔍 Checking onboarding for email:', email);
      const rows = await sql`
        SELECT
          t.tenant_id,
          t.company_name,
          t.subdomain,
          u.user_id,
          u.email,
          u.name,
          u.onboarding_completed,
          u.onboarding_step
        FROM tenant_users u
        JOIN tenants t ON t.tenant_id = u.tenant_id
        WHERE u.email = ${email}
        ORDER BY t.created_at DESC
      `;
      if (rows.length === 0) {
        console.log('❌ No tenant_user found for that email.');
        process.exit(1);
      }
      for (const row of rows) {
        console.log(JSON.stringify(row, null, 2));
        const ok = row.onboarding_completed === true;
        console.log(ok ? '✅ Onboarding completed' : '⚠️ Onboarding not completed');
      }
      const anyCompleted = rows.some((r) => r.onboarding_completed === true);
      process.exit(anyCompleted ? 0 : 1);
    }

    console.log('🔍 Latest tenants and users (onboarding verification):\n');
    const rows = await sql.unsafe(sqlQuery);
    if (rows.length === 0) {
      console.log('No tenants found.');
      process.exit(0);
    }

    console.table(
      rows.map((r) => ({
        tenant_id: (r.tenant_id || '').slice(0, 8) + '…',
        company_name: r.company_name || '',
        subdomain: r.subdomain || '',
        user_email: r.email || '',
        onboarding_completed: r.onboarding_completed === true ? '✅' : '❌',
        onboarding_step: r.onboarding_step || '',
      }))
    );

    const completed = rows.filter((r) => r.onboarding_completed === true);
    console.log('\n✅ Onboarding completed for', completed.length, 'user(s).');
    if (completed.length === 0 && rows.length > 0) {
      console.log('⚠️ No user has onboarding_completed = true yet.');
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
