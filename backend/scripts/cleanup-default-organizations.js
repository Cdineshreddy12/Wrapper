import { db } from '../src/db/index.js';
import { tenants, tenantUsers } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';
import KindeService from '../src/services/kinde-service.js';

const kindeService = new KindeService();

async function cleanupDefaultOrganizations() {
  console.log('🧹 Starting cleanup of unwanted default organization assignments...');
  
  try {
    // Get all users from our database
    const allUsers = await db
      .select({
        kindeUserId: tenantUsers.kindeUserId,
        email: tenantUsers.email,
        name: tenantUsers.name,
        tenantId: tenantUsers.tenantId
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.isActive, true));

    console.log(`📋 Found ${allUsers.length} active users in database`);

    // Get all valid organization codes from our database
    const validTenants = await db
      .select({
        tenantId: tenants.tenantId,
        kindeOrgId: tenants.kindeOrgId,
        companyName: tenants.companyName
      })
      .from(tenants);

    const validOrgCodes = validTenants.map(t => t.kindeOrgId);
    console.log(`📋 Valid organization codes in our system:`, validOrgCodes);

    let cleanedCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of allUsers) {
      if (!user.kindeUserId) {
        console.log(`⚠️ Skipping user ${user.email} - no Kinde user ID`);
        continue;
      }

      try {
        console.log(`\n🔍 Processing user: ${user.email} (${user.kindeUserId})`);
        
        // Get user's organizations from Kinde
        const userOrgs = await kindeService.getUserOrganizations(user.kindeUserId);
        
        if (!userOrgs.organizations || userOrgs.organizations.length <= 1) {
          console.log(`✅ User ${user.email} has ${userOrgs.organizations?.length || 0} organizations - no cleanup needed`);
          continue;
        }

        console.log(`📋 User ${user.email} is in ${userOrgs.organizations.length} organizations:`, 
          userOrgs.organizations.map(org => org.code));

        // Find the user's valid organization
        const userTenant = validTenants.find(t => t.tenantId === user.tenantId);
        const userValidOrgCode = userTenant?.kindeOrgId;

        if (!userValidOrgCode) {
          console.log(`⚠️ Could not find valid org code for user ${user.email}`);
          continue;
        }

        // Remove user from unwanted organizations
        for (const org of userOrgs.organizations) {
          if (org.code !== userValidOrgCode) {
            console.log(`🗑️ Removing user ${user.email} from unwanted organization: ${org.code}`);
            
            try {
              await kindeService.removeUserFromOrganization(user.kindeUserId, org.code);
              console.log(`✅ Successfully removed user from organization: ${org.code}`);
              cleanedCount++;
            } catch (removeError) {
              console.error(`❌ Failed to remove user from organization ${org.code}:`, removeError.message);
              errorCount++;
            }
          } else {
            console.log(`✅ User ${user.email} correctly in organization: ${org.code}`);
          }
        }

      } catch (userError) {
        console.error(`❌ Error processing user ${user.email}:`, userError.message);
        errorCount++;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n🎉 Cleanup completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Users processed: ${allUsers.length}`);
    console.log(`   - Organizations cleaned: ${cleanedCount}`);
    console.log(`   - Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDefaultOrganizations()
  .then(() => {
    console.log('✅ Cleanup script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  }); 