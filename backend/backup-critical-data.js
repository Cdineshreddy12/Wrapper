// Quick backup of critical data before migration
import { sql } from './src/db/index.js';

async function backupData() {
  try {
    console.log('🔍 Checking data that will be affected by migration...\n');

    // Check trial_status_view
    const trialViewData = await sql`SELECT * FROM trial_status_view LIMIT 5;`;
    console.log('📊 trial_status_view data:', trialViewData.length > 0 ? trialViewData[0] : 'No data');

    // Check cancelation_reason column
    const cancelationData = await sql`SELECT subscription_id, cancelation_reason FROM subscriptions WHERE cancelation_reason IS NOT NULL LIMIT 5;`;
    console.log('📝 cancelation_reason data:', cancelationData);

    // Check company_id column
    const companyData = await sql`SELECT tenant_id, company_id FROM tenants WHERE company_id IS NOT NULL LIMIT 5;`;
    console.log('🏢 company_id data:', companyData);

    // Check ip_address data
    const ipData = await sql`SELECT COUNT(*) as inet_count FROM trial_events WHERE ip_address::text LIKE '%/%';`;
    console.log('🌐 inet format ip_addresses:', ipData[0]);

    console.log('\n✅ Data check complete. Review above before proceeding with migration.');

  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

backupData();
