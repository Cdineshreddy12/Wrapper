import { config } from 'dotenv';
import kindeService from '../src/services/kinde-service.js';
import { db } from '../src/db/index.js';
import { tenants, tenantUsers } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

// Load environment variables
config();

async function verifyUserOrganizations() {
  try {
    console.log('🔍 Verifying users are in single organizations only...\n');
    
    // Get all tenant-user relationships
    const tenantUserData = await db
      .select({
        kindeUserId: tenantUsers.kindeUserId,
        userEmail: tenantUsers.email,
        userName: tenantUsers.name,
        companyName: tenants.companyName,
        expectedOrgId: tenants.kindeOrgId
      })
      .from(tenantUsers)
      .leftJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
      .where(eq(tenantUsers.isActive, true));

    console.log(`📋 Found ${tenantUserData.length} active users to verify\n`);

    let allGood = true;
    let singleOrgCount = 0;
    let multipleOrgCount = 0;
    let noOrgCount = 0;

    for (const userData of tenantUserData) {
      if (!userData.kindeUserId || !userData.expectedOrgId) {
        console.log(`⏭️  Skipping ${userData.userEmail} - missing Kinde data`);
        continue;
      }

      console.log(`\n🔍 Checking ${userData.userName} (${userData.userEmail})`);
      console.log(`   Company: ${userData.companyName}`);
      console.log(`   Expected Organization: ${userData.expectedOrgId}`);

      try {
        // Get user's current organizations
        const userOrgs = await kindeService.getUserOrganizations(userData.kindeUserId);
        const orgCodes = userOrgs.organizations?.map(org => org.code) || [];
        
        console.log(`   📊 Current organizations: [${orgCodes.join(', ')}]`);

        if (orgCodes.length === 0) {
          console.log(`   ❌ User has NO organizations`);
          allGood = false;
          noOrgCount++;
        } else if (orgCodes.length === 1) {
          if (orgCodes[0] === userData.expectedOrgId) {
            console.log(`   ✅ User is correctly in SINGLE organization: ${orgCodes[0]}`);
            singleOrgCount++;
          } else {
            console.log(`   ❌ User is in WRONG organization: ${orgCodes[0]} (expected: ${userData.expectedOrgId})`);
            allGood = false;
          }
        } else {
          console.log(`   ❌ User is in MULTIPLE organizations: [${orgCodes.join(', ')}]`);
          allGood = false;
          multipleOrgCount++;
        }

      } catch (error) {
        console.log(`   ❌ Error checking user organizations: ${error.message}`);
        allGood = false;
      }
    }

    console.log('\n🎉 Verification completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Users in correct single organization: ${singleOrgCount}`);
    console.log(`   ❌ Users in multiple organizations: ${multipleOrgCount}`);
    console.log(`   ❌ Users with no organizations: ${noOrgCount}`);
    
    if (allGood) {
      console.log('\n🎉 SUCCESS: All users are properly assigned to their exclusive organizations!');
    } else {
      console.log('\n⚠️  ISSUES FOUND: Some users need to be fixed. Run cleanup script.');
    }

  } catch (error) {
    console.error('❌ Verification script failed:', error);
  }
}

// Run the verification
verifyUserOrganizations(); 