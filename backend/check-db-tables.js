const { db } = require('./src/db/index.js');

async function checkDatabaseTables() {
  console.log('🔍 CHECKING DATABASE TABLES\n');

  try {
    // Check if organizations table exists
    console.log('1. Checking organizations table...');
    const orgs = await db.select().from(require('./src/db/schema/organizations.js').organizations).limit(1);
    console.log('✅ Organizations table exists');

    // Check if locations table exists
    console.log('2. Checking locations table...');
    const locs = await db.select().from(require('./src/db/schema/locations.js').locations).limit(1);
    console.log('✅ Locations table exists');

    // Check if location_assignments table exists
    console.log('3. Checking location_assignments table...');
    const assigns = await db.select().from(require('./src/db/schema/locations.js').locationAssignments).limit(1);
    console.log('✅ Location assignments table exists');

    // Check current data
    console.log('\n📊 CURRENT DATA:');
    const allOrgs = await db.select().from(require('./src/db/schema/organizations.js').organizations);
    console.log(`🏢 Organizations: ${allOrgs.length}`);

    const allLocs = await db.select().from(require('./src/db/schema/locations.js').locations);
    console.log(`📍 Locations: ${allLocs.length}`);

    const allAssigns = await db.select().from(require('./src/db/schema/locations.js').locationAssignments);
    console.log(`🔗 Location assignments: ${allAssigns.length}`);

  } catch (error) {
    console.log('❌ Database error:', error.message);
    console.log('This suggests the tables may not exist or there\'s a connection issue');
  }
}

checkDatabaseTables().catch(console.error);
