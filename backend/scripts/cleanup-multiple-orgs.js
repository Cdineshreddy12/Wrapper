import { config } from 'dotenv';
import kindeService from '../src/services/kinde-service.js';
import { db } from '../src/db/index.js';
import { tenants, tenantUsers } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

// Load environment variables
config();

async function cleanupMultipleOrganizations() {
  try {
    console.log('🧹 Cleaning up users in multiple organizations...\n');
    
    // Get all tenant-user relationships where users should be in specific organizations
    const tenantUserData = await db
      .select({
        kindeUserId: tenantUsers.kindeUserId,
        userEmail: tenantUsers.email,
        userName: tenantUsers.name,
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        kindeOrgId: tenants.kindeOrgId,
        isTenantAdmin: tenantUsers.isTenantAdmin
      })
      .from(tenantUsers)
      .leftJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
      .where(eq(tenantUsers.isActive, true));

    console.log(`📋 Found ${tenantUserData.length} active users to check\n`);

    let processedCount = 0;
    let fixedCount = 0;
    let errorCount = 0;

    for (const userData of tenantUserData) {
      processedCount++;
      
      if (!userData.kindeUserId || !userData.kindeOrgId) {
        console.log(`⏭️  Skipping ${userData.userEmail} - missing Kinde data`);
        continue;
      }

      console.log(`\n📋 Processing ${processedCount}/${tenantUserData.length}: ${userData.userName} (${userData.userEmail})`);
      console.log(`   Company: ${userData.companyName}`);
      console.log(`   Expected Organization: ${userData.kindeOrgId}`);
      console.log(`   Kinde User ID: ${userData.kindeUserId}`);

      try {
        // Get user's current organizations
        const userOrgs = await kindeService.getUserOrganizations(userData.kindeUserId);
        
        if (!userOrgs.organizations || userOrgs.organizations.length === 0) {
          console.log(`   ⚠️  User has no organizations - needs to be added to ${userData.kindeOrgId}`);
          
          try {
            await kindeService.addUserToOrganization(
              userData.userEmail, 
              userData.kindeOrgId, 
              { exclusive: true }
            );
            console.log(`   ✅ Added user to correct organization`);
            fixedCount++;
          } catch (addError) {
            console.log(`   ❌ Failed to add user to organization: ${addError.message}`);
            errorCount++;
          }
          continue;
        }

        const currentOrgCodes = userOrgs.organizations.map(org => org.code);
        console.log(`   📊 Current organizations: [${currentOrgCodes.join(', ')}]`);

        // Check if user is in correct organization only
        if (currentOrgCodes.length === 1 && currentOrgCodes[0] === userData.kindeOrgId) {
          console.log(`   ✅ User is correctly in single organization`);
          continue;
        }

        // User is in multiple organizations or wrong organization
        if (currentOrgCodes.length > 1) {
          console.log(`   🔧 User is in ${currentOrgCodes.length} organizations - fixing...`);
        } else {
          console.log(`   🔧 User is in wrong organization (${currentOrgCodes[0]}) - fixing...`);
        }

        // Use exclusive organization assignment to fix
        try {
          await kindeService.addUserToOrganization(
            userData.userEmail,
            userData.kindeOrgId,
            { exclusive: true }
          );
          
          console.log(`   ✅ Fixed organization assignment`);
          
          // Verify the fix
          const verifyOrgs = await kindeService.getUserOrganizations(userData.kindeUserId);
          const newOrgCodes = verifyOrgs.organizations?.map(org => org.code) || [];
          
          if (newOrgCodes.length === 1 && newOrgCodes[0] === userData.kindeOrgId) {
            console.log(`   ✅ Verification successful - user now in correct single organization`);
            fixedCount++;
          } else {
            console.log(`   ⚠️  Verification failed - user still in: [${newOrgCodes.join(', ')}]`);
            errorCount++;
          }
          
        } catch (fixError) {
          console.log(`   ❌ Failed to fix organization assignment: ${fixError.message}`);
          errorCount++;
        }

      } catch (error) {
        console.log(`   ❌ Error checking user organizations: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n🎉 Cleanup completed!');
    console.log(`📊 Summary:`);
    console.log(`   Processed: ${processedCount} users`);
    console.log(`   Fixed: ${fixedCount} users`);
    console.log(`   Errors: ${errorCount} users`);
    
    if (fixedCount > 0) {
      console.log('\n✅ Users are now properly assigned to their exclusive organizations!');
    }

  } catch (error) {
    console.error('❌ Cleanup script failed:', error);
  }
}

// Run the cleanup
cleanupMultipleOrganizations(); 