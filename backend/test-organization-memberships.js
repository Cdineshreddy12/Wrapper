import { sql } from './src/db/index.js';

async function checkOrganizationMemberships() {
  try {
    console.log('🔍 Checking organization memberships for user...');

    // Test the query that the data isolation service uses
    const userId = '50d4f694-202f-4f27-943d-7aafeffee29c'; // From the logs

    const memberships = await sql`
      SELECT
        entity_id as organization_id,
        membership_type,
        membership_status
      FROM organization_memberships
      WHERE user_id = ${userId}
      AND entity_type = 'organization'
      AND membership_status = 'active'
    `;

    console.log('✅ Organization memberships query successful');
    console.log('📊 Results:', memberships);

    if (memberships.length === 0) {
      console.log('ℹ️ No organization memberships found for user');
      console.log('🔍 Checking all organization memberships in the table...');

      const allMemberships = await sql`
        SELECT COUNT(*) as total_memberships
        FROM organization_memberships
        WHERE entity_type = 'organization'
      `;

      console.log('📊 Total organization memberships in table:', allMemberships[0].total_memberships);
    }

  } catch (error) {
    console.error('❌ Organization memberships check failed:', error);
  } finally {
    await sql.end();
  }
}

checkOrganizationMemberships();
