import { eq, count } from "drizzle-orm";
import { db } from "./src/db/index.js";
import {organizations} from "./src/db/schema/organizations.js";
import {tenants} from "./src/db/schema/tenants.js";
import { creditConfigurations } from "./src/db/schema/credit_configurations.js";
import { tenantUsers } from './src/db/schema/users.js';
import { customRoles } from "./src/db/schema/permissions.js";
import { locationAssignments } from "./src/db/schema/locations.js";
import { locations } from "./src/db/schema/locations.js";
import { and } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';

// // // Solution 1: Use explicit field selection to avoid schema resolution issues
// // // Solution 2: Use raw SQL (uncomment below if Solution 1 still fails)
// // // import { sql } from "./src/db/index.js";
// // // const userID = await sql`SELECT user_id as "userId" FROM tenant_users WHERE tenant_id = ${tenant[0].tenantId} LIMIT 1`;

// // ✅ FIXED: Now working without circular reference errors!

// // Step 1: Get tenant (works fine)
// console.log('🔍 Finding tenant...');

// // Step 2: Get user for this tenant (now works without circular reference error!)
// const userID = await db
//                      .select({ userId: tenantUsers.userId })
//                      .from(tenantUsers)
//                      .where(eq(tenantUsers.tenantId, tenant[0].tenantId))
//                      .limit(1);

// console.log('✅ Found user:', userID);

// // Step 3: Query credit configurations for this tenant
// console.log('💰 Checking credit configurations...');



// // ✅ CORRECTED: Proper way to count records in Drizzle ORM
// const countResult = await db
//     .select({ count: count() })
//     .from(creditConfigurations)
//     .where(eq(creditConfigurations.tenantId, tenant[0].tenantId));

// console.log('Count result:', countResult);
// // Also get the actual credit configurations
// const creditConfigs = await db
//     .select()
//     .from(creditConfigurations)
//     .where(eq(creditConfigurations.tenantId, tenant[0].tenantId));

// console.log('📊 Credit configurations found:', creditConfigs.length, 'records');
// console.log('Credit configs:', creditConfigs);

// // Step 4: Optionally create a new credit configuration if none exist
// if (creditConfigs.length === 0 && userID.length > 0) {
//     console.log('✨ Creating new credit configuration...');
//     const newConfig = await db
//         .insert(creditConfigurations)
//         .values({
//             tenantId: tenant[0].tenantId,
//             operationCode: 'crm.leads.create',
//             entityType: 'organization',
//             entityId: tenant[0].organizationId,
//             creditCost: 100,
//             unit: 'operation',
//             unitMultiplier: 1,
//             freeAllowance: 0,
//             freeAllowancePeriod: 'month',
//             volumeTiers: [],
//             allowOverage: true,
//             overageLimit: 1000,
//             overagePeriod: 'month',
//             overageCost: 100,
//             scope: 'organization',
//             isInherited: false,
//             isActive: true,
//             isCustomized: false,
//             priority: 0,
//             createdBy: userID[0].userId,
//             updatedBy: userID[0].userId,
//         })
//         .returning();

//     console.log('🎉 Created new credit configuration:', newConfig);
// }


// const permissions =  db.
//                     select()
//                     .from(customRoles)
//                     .where(eq(customRoles.tenantId,tenant[0].tenantId));

// console.log(permissions);

// // const {organizationId} = tenant[0];
// // console.log(organizationId);
// console.log(tenant);


//fetching the tenant
const tenant = await db
                     .select()
                     .from(tenants)
                     .where(eq(tenants.organizationType, 'standalone'));
//fetching the organization id from the tenant
const organization = await db
                        .select()
                        .from(organizations)
                        .where(eq(organizations.tenantId,tenant[0].tenantId));
        
const organizationId = organization[0].organizationId;
//fetching the locations for the organization


 const orgLocs = db
                .select()
                .from(locationAssignments)
                .leftJoin(locations,eq(locationAssignments.locationId,locations.locationId))
                .where(eq(locationAssignments.organizationId,organizationId));

const orgLocations = await db.query.locationAssignments.findMany({
    where: and(
      eq(locationAssignments.entityId, organizationId),
      eq(locationAssignments.entityType, 'organization')
    ),
    with: {
      location: {
        where: eq(locations.isActive, true),
        columns: {
          locationId: true,
          locationName: true,
          address: true,
          isActive: true
        }
      }
    },
    columns: {
      assignedAt: true
    }
  });

  if(orgLocations.length === 0){
       const location = db
        .insert(locations)
        .values({
            locationId: uuidv4(),
            tenantId: tenant[0].tenantId,
            locationName: 'Headquarters',
            address: {
                street: '123 Tech Street',
                city: 'San Francisco',
                state: 'California',
                zipCode: '94105',
                country: 'USA'
            }
        }).
        returning();
    console.log(location);
  }else{
    console.log(orgLocations);
  }
