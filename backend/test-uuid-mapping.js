// 🧪 Test script to verify UUID mapping fixes
// Run with: node test-uuid-mapping.js

import { db } from './src/db/index.js';
import { tenantUsers } from './src/db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import PermissionMatrixService from './src/services/permission-matrix-service.js';

async function testUuidMapping() {
  console.log('🧪 Testing UUID Mapping Fixes...\n');
  
  try {
    // Test 1: Check if we have users with Kinde IDs
    console.log('📋 Test 1: Check for Users with Kinde IDs');
    
    const usersWithKindeIds = await db
      .select({
        userId: tenantUsers.userId,
        kindeUserId: tenantUsers.kindeUserId,
        email: tenantUsers.email,
        isActive: tenantUsers.isActive,
        tenantId: tenantUsers.tenantId
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.kindeUserId, 'kp_5644fd635bf946a292069e3572639e2b'))
      .limit(5);
    
    if (usersWithKindeIds.length > 0) {
      console.log('✅ Found users with Kinde IDs:', usersWithKindeIds.length);
      usersWithKindeIds.forEach(user => {
        console.log(`   - ${user.email}: Kinde ID ${user.kindeUserId} → Internal UUID ${user.userId}`);
      });
      
      const testUser = usersWithKindeIds[0];
      const testTenantId = testUser.tenantId;
      
      // Test 2: Test UUID mapping function
      console.log('\n📋 Test 2: Test UUID Mapping Function');
      try {
        const mappedUserId = await PermissionMatrixService.mapKindeIdToInternalId(
          testUser.kindeUserId, 
          testTenantId
        );
        
        console.log('✅ UUID mapping successful:', {
          kindeId: testUser.kindeUserId,
          internalId: mappedUserId,
          expected: testUser.userId,
          match: mappedUserId === testUser.userId
        });
        
        // Test 3: Test getUserPermissionContext with Kinde ID
        console.log('\n📋 Test 3: Test getUserPermissionContext with Kinde ID');
        try {
          const permissionContext = await PermissionMatrixService.getUserPermissionContext(
            testUser.kindeUserId, 
            testTenantId
          );
          
          console.log('✅ Permission context retrieved successfully:', {
            originalKindeId: testUser.kindeUserId,
            returnedUserId: permissionContext.userId,
            kindeUserId: permissionContext.kindeUserId,
            tenantId: permissionContext.tenantId,
            permissions: permissionContext.permissions?.length || 0,
            roles: permissionContext.userRoles?.length || 0
          });
          
        } catch (permissionError) {
          console.log('❌ Permission context test failed:', permissionError.message);
        }
        
        // Test 4: Test with non-existent Kinde ID
        console.log('\n📋 Test 4: Test with Non-existent Kinde ID');
        try {
          await PermissionMatrixService.mapKindeIdToInternalId(
            'kp_nonexistent123', 
            testTenantId
          );
          console.log('❌ Should have failed with non-existent ID');
        } catch (expectedError) {
          console.log('✅ Correctly failed with non-existent ID:', expectedError.message);
        }
        
        // Test 5: Test with invalid UUID format
        console.log('\n📋 Test 5: Test with Invalid UUID Format');
        try {
          await PermissionMatrixService.mapKindeIdToInternalId(
            'invalid-uuid-format', 
            testTenantId
          );
          console.log('❌ Should have failed with invalid format');
        } catch (expectedError) {
          console.log('✅ Correctly failed with invalid format:', expectedError.message);
        }
        
      } catch (mappingError) {
        console.log('❌ UUID mapping test failed:', mappingError.message);
      }
      
    } else {
      console.log('❌ No users with Kinde IDs found in database');
    }
    
    console.log('\n🎉 UUID mapping tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testUuidMapping();
