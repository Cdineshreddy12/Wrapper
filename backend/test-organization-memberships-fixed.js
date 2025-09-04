import { sql } from './src/db/index.js';

async function checkOrganizationMembershipsFixed() {
  try {
    console.log('🔍 Testing organization memberships query with correct user ID...');

    // Test with internal user ID (UUID) instead of Kinde user ID
    const internalUserId = '50d4f694-202f-4f27-943d-7aafeffee29c'; // From the logs

    const memberships = await sql`
      SELECT
        entity_id as organization_id,
        membership_type,
        membership_status
      FROM organization_memberships
      WHERE user_id = ${internalUserId}
      AND entity_type = 'organization'
      AND membership_status = 'active'
    `;

    console.log('✅ Organization memberships query with internal user ID successful');
    console.log('📊 Results:', memberships);

    if (memberships.length === 0) {
      console.log('ℹ️ No organization memberships found for internal user ID');
      console.log('🔍 This is expected since the user is a tenant admin and gets access to all organizations');
    } else {
      console.log('📋 Found organization memberships:', memberships.length);
    }

  } catch (error) {
    console.error('❌ Organization memberships test failed:', error);
  } finally {
    await sql.end();
  }
}

checkOrganizationMembershipsFixed();
