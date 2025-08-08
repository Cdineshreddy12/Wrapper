import { config } from 'dotenv';
import kindeService from '../src/services/kinde-service.js';
import { db } from '../src/db/index.js';
import { tenants, tenantUsers } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

// Load environment variables
config();

async function updateUserIds() {
  try {
    console.log('🔄 Updating database with correct Kinde user IDs...\n');
    
    // Get all tenant-user relationships
    const tenantUserData = await db
      .select({
        id: tenantUsers.id,
        kindeUserId: tenantUsers.kindeUserId,
        userEmail: tenantUsers.email,
        userName: tenantUsers.name,
        companyName: tenants.companyName,
        expectedOrgId: tenants.kindeOrgId
      })
      .from(tenantUsers)
      .leftJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
      .where(eq(tenantUsers.isActive, true));

    console.log(`📋 Found ${tenantUserData.length} active users to update\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const userData of tenantUserData) {
      console.log(`\n🔍 Processing ${userData.userName} (${userData.userEmail})`);
      console.log(`   Current Database User ID: ${userData.kindeUserId}`);

      try {
        // Look up user by email in Kinde
        console.log(`🔄 Looking up current user ID in Kinde...`);
        const users = await kindeService.makeRequest('GET', `/users?email=${encodeURIComponent(userData.userEmail)}`);
        
        if (users.users && users.users.length > 0) {
          const kindeUser = users.users[0];
          console.log(`✅ Found current user ID: ${kindeUser.id}`);
          
          if (kindeUser.id !== userData.kindeUserId) {
            console.log(`🔄 Updating database with correct user ID...`);
            
            // Update the database with the correct user ID
            await db
              .update(tenantUsers)
              .set({ kindeUserId: kindeUser.id })
              .where(eq(tenantUsers.id, userData.id));
            
            console.log(`✅ Updated: ${userData.kindeUserId} → ${kindeUser.id}`);
            updatedCount++;
          } else {
            console.log(`✅ User ID already correct in database`);
          }
          
        } else {
          console.log(`❌ No users found in Kinde for email: ${userData.userEmail}`);
          errorCount++;
        }

      } catch (error) {
        console.log(`❌ Error updating user: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n🎉 Update completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    
    if (updatedCount > 0) {
      console.log('\n✅ Database has been updated with correct Kinde user IDs!');
      console.log('🔄 You can now run the verification script to confirm everything is working.');
    }

  } catch (error) {
    console.error('❌ Update script failed:', error);
  }
}

// Run the update
updateUserIds(); 