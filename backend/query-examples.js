import { eq, count, and, or } from "drizzle-orm";
import { db } from "./src/db/index.js";
import { organizations } from "./src/db/schema/organizations.js";
import { tenants } from "./src/db/schema/tenants.js";
import { creditConfigurations } from "./src/db/schema/credit_configurations.js";
import { tenantUsers } from './src/db/schema/users.js';
import { customRoles } from "./src/db/schema/permissions.js";
import { locationAssignments, locations } from "./src/db/schema/locations.js";
import { organizationMemberships } from "./src/db/schema/organization_memberships.js";
import { v4 as uuidv4 } from 'uuid';

/**
 * =============================================================================
 * DRIZZLE ORM: RELATIONS vs MANUAL JOINS EXAMPLES
 * =============================================================================
 *
 * This file demonstrates when to use Relations vs Manual Joins in Drizzle ORM
 * based on your actual schema relationships.
 *
 * KEY PRINCIPLES:
 * - Relations: Better for complex nested data, flexible APIs, multiple relationships
 * - Manual Joins: Better for performance, simple queries, precise SQL control
 *
 * DETAILED RELATION PROCESSING EXAMPLE:
 * Let's trace how Drizzle processes your locationsRelations:
 *
 * 1. Your Relation Definition:
 *    export const locationsRelations = relations(locations, ({ many, one }) => ({
 *      tenant: one(tenants, { fields: [locations.tenantId], references: [tenants.tenantId] }),
 *      assignments: many(locationAssignments),
 *      resources: many(locationResources),
 *      usage: many(locationUsage),
 *      responsiblePerson: one(tenantUsers, { fields: [locations.responsiblePersonId], references: [tenantUsers.userId] })
 *    }));
 *
 * 2. Drizzle's Internal Processing:
 *    - Parses the relations() call
 *    - Extracts relationship metadata
 *    - Builds bidirectional relationship maps
 *    - Stores in internal registry for runtime lookup
 *
 * 3. Runtime Query Resolution:
 *    When you query: db.query.locations.findMany({ with: { assignments: true } })
 *    Drizzle looks up 'assignments' in the internal map and generates appropriate JOINs
 */

/**
 * =============================================================================
 * HOW DRIZZLE PROCESSES YOUR locationsRelations IN DETAIL
 * =============================================================================
 *
 * Let's trace through your locationsRelations step by step:
 *
 * ORIGINAL RELATION DEFINITION:
 * export const locationsRelations = relations(locations, ({ many, one }) => ({
 *   tenant: one(tenants, {
 *     fields: [locations.tenantId],
 *     references: [tenants.tenantId],
 *   }),
 *   assignments: many(locationAssignments),
 *   resources: many(locationResources),
 *   usage: many(locationUsage),
 *   responsiblePerson: one(tenantUsers, {
 *     fields: [locations.responsiblePersonId],
 *     references: [tenantUsers.userId],
 *   }),
 * }));
 *
 * =============================================================================
 * STEP 1: SCHEMA PARSING (During Drizzle Initialization)
 * =============================================================================
 */

// Drizzle parses this and creates internal metadata:
const parsedLocationsRelations = {
  sourceTable: 'locations',
  relationships: {
    // ONE-TO-ONE: locations.tenantId -> tenants.tenantId
    tenant: {
      type: 'one-to-one',
      targetTable: 'tenants',
      sourceFields: ['tenantId'],
      targetFields: ['tenantId'],
      joinType: 'LEFT JOIN', // one() relationships use LEFT JOIN
      relationName: 'tenant'
    },

    // ONE-TO-MANY: locations.locationId <- locationAssignments.locationId
    assignments: {
      type: 'one-to-many',
      targetTable: 'location_assignments',
      sourceFields: ['locationId'],
      targetFields: ['locationId'],
      joinType: 'LEFT JOIN', // many() relationships use LEFT JOIN
      relationName: 'assignments'
    },

    // ONE-TO-MANY: locations.locationId <- locationResources.locationId
    resources: {
      type: 'one-to-many',
      targetTable: 'location_resources',
      sourceFields: ['locationId'],
      targetFields: ['locationId'],
      joinType: 'LEFT JOIN',
      relationName: 'resources'
    },

    // ONE-TO-MANY: locations.locationId <- locationUsage.locationId
    usage: {
      type: 'one-to-many',
      targetTable: 'location_usage',
      sourceFields: ['locationId'],
      targetFields: ['locationId'],
      joinType: 'LEFT JOIN',
      relationName: 'usage'
    },

    // ONE-TO-ONE: locations.responsiblePersonId -> tenantUsers.userId
    responsiblePerson: {
      type: 'one-to-one',
      targetTable: 'tenant_users',
      sourceFields: ['responsiblePersonId'],
      targetFields: ['userId'],
      joinType: 'LEFT JOIN',
      relationName: 'responsiblePerson'
    }
  }
};

/**
 * =============================================================================
 * STEP 2: INTERNAL RELATIONSHIP REGISTRY (Startup Map)
 * =============================================================================
 *
 * Drizzle builds this bidirectional registry during startup:
 */

const drizzleRelationRegistry = {
  // Forward relationships (what you defined)
  locations: {
    tenant: parsedLocationsRelations.relationships.tenant,
    assignments: parsedLocationsRelations.relationships.assignments,
    resources: parsedLocationsRelations.relationships.resources,
    usage: parsedLocationsRelations.relationships.usage,
    responsiblePerson: parsedLocationsRelations.relationships.responsiblePerson
  },

  // Reverse relationships (automatically inferred)
  tenants: {
    locations: {
      type: 'one-to-many',
      targetTable: 'locations',
      sourceFields: ['tenantId'],
      targetFields: ['tenantId'],
      joinType: 'LEFT JOIN',
      relationName: 'locations'
    }
  },

  location_assignments: {
    location: {
      type: 'many-to-one',
      targetTable: 'locations',
      sourceFields: ['locationId'],
      targetFields: ['locationId'],
      joinType: 'INNER JOIN',
      relationName: 'location'
    }
  },

  tenant_users: {
    responsibleForLocations: {
      type: 'one-to-many',
      targetTable: 'locations',
      sourceFields: ['userId'],
      targetFields: ['responsiblePersonId'],
      joinType: 'LEFT JOIN',
      relationName: 'responsibleForLocations'
    }
  }
};

/**
 * =============================================================================
 * STEP 3: RUNTIME QUERY PROCESSING
 * =============================================================================
 *
 * When you execute: db.query.locations.findMany({ with: { assignments: true } })
 */

// Drizzle's query processor:
function processRelationsQuery(query) {
  // 1. Parse the query
  const parsedQuery = {
    table: 'locations',
    with: {
      assignments: true  // User wants to include assignments
    },
    where: query.where,
    columns: query.columns
  };

  // 2. Look up relationships in registry
  const tableRelations = drizzleRelationRegistry['locations'];
  const requestedRelation = tableRelations['assignments'];

  // 3. Generate SQL JOIN
  const joinClause = `LEFT JOIN location_assignments la ON l.location_id = la.location_id`;

  // 4. Build final SQL
  const finalSQL = `
    SELECT l.*, la.*
    FROM locations l
    ${joinClause}
    WHERE ${parsedQuery.where}
  `;

  return finalSQL;
}

/**
 * =============================================================================
 * STEP 4: ACTUAL SQL GENERATION FOR YOUR QUERY
 * =============================================================================
 *
 * Your query: db.query.locations.findMany({ with: { assignments: true } })
 * Becomes this SQL:
 */

const generatedSQL = `
  SELECT
    "locations"."location_id" as "locationId",
    "locations"."location_name" as "locationName",
    "locations"."address" as "address",
    "locations"."is_active" as "isActive",
    "locations"."tenant_id" as "tenantId",
    "locations"."responsible_person_id" as "responsiblePersonId",

    -- Joined data from assignments
    "location_assignments"."assignment_id" as "assignments.assignmentId",
    "location_assignments"."entity_type" as "assignments.entityType",
    "location_assignments"."entity_id" as "assignments.entityId",
    "location_assignments"."assigned_at" as "assignments.assignedAt"

  FROM "locations"
  LEFT JOIN "location_assignments"
    ON "locations"."location_id" = "location_assignments"."location_id"

  -- Result structure:
  -- [
  --   {
  --     locationId: "...",
  --     locationName: "...",
  --     assignments: [
  --       { assignmentId: "...", entityType: "...", ... },
  --       { assignmentId: "...", entityType: "...", ... }
  --     ]
  --   }
  -- ]
`;

/**
 * =============================================================================
 * STEP 5: RESULT TRANSFORMATION
 * =============================================================================
 *
 * Drizzle transforms the flat SQL result into nested objects:
 */

function transformSQLResult(sqlRows) {
  const result = [];

  // Group by location
  const locationMap = new Map();

  sqlRows.forEach(row => {
    const locationId = row.locationId;

    // Create location object if it doesn't exist
    if (!locationMap.has(locationId)) {
      locationMap.set(locationId, {
        locationId: row.locationId,
        locationName: row.locationName,
        address: row.address,
        isActive: row.isActive,
        tenantId: row.tenantId,
        responsiblePersonId: row.responsiblePersonId,
        assignments: [] // Initialize empty array for one-to-many
      });
    }

    // Add assignment to location's assignments array
    const location = locationMap.get(locationId);
    if (row['assignments.assignmentId']) { // Only if assignment exists
      location.assignments.push({
        assignmentId: row['assignments.assignmentId'],
        entityType: row['assignments.entityType'],
        entityId: row['assignments.entityId'],
        assignedAt: row['assignments.assignedAt']
      });
    }
  });

  return Array.from(locationMap.values());
}

/**
 * =============================================================================
 * SCENARIO 1: SIMPLE QUERY WITH FILTERING
 * Use MANUAL JOINS for performance-critical, simple relationships
 * =============================================================================
 */

// ✅ GOOD: Manual Join for Simple Location Query
console.log('🚀 SCENARIO 1: Manual Join - Simple Location Query');
console.log('Generated SQL will be: SELECT ... FROM locations INNER JOIN location_assignments ...');

const simpleOrgLocations = await db
  .select({
    locationId: locations.locationId,
    locationName: locations.locationName,
    address: locations.address,
    isActive: locations.isActive,
    assignedAt: locationAssignments.assignedAt
  })
  .from(locations)
  .innerJoin(locationAssignments,
    eq(locations.locationId, locationAssignments.locationId))
  .where(and(
    eq(locationAssignments.entityId, 'some-org-id'),
    eq(locationAssignments.entityType, 'organization'),
    eq(locations.isActive, true)
  ))
  .orderBy(locations.createdAt);
  

console.log('✅ Manual Join Result:', simpleOrgLocations);

/**
 * =============================================================================
 * SCENARIO 2: COMPLEX NESTED DATA WITH MULTIPLE RELATIONSHIPS
 * Use RELATIONS for complex object graphs and API responses
 * =============================================================================
 */

// ✅ GOOD: Relations for Complex Organization Data
console.log('\n🏢 SCENARIO 2: Relations - Complex Organization Data');
console.log('Generated SQL will include multiple JOINs and nested data');

const tenantWithFullData = await db.query.tenants.findFirst({
  where: eq(tenants.organizationType, 'standalone'),
  with: {
    // Include organizations
    organizations: {
      with: {
        // Include memberships for each organization
        memberships: {
          with: {
            // Include user details for each membership
            user: {
              columns: {
                userId: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            // Include role details
            role: {
              columns: {
                roleId: true,
                roleName: true,
                permissions: true
              }
            }
          }
        }
      }
    },
    // Include users
    users: {
      columns: {
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        primaryOrganizationId: true
      }
    }
  }
});

console.log('✅ Relations Result:', JSON.stringify(tenantWithFullData, null, 2));

/**
 * =============================================================================
 * SCENARIO 3: PERFORMANCE-CRITICAL COUNT QUERIES
 * Use MANUAL JOINS for aggregate queries and counts
 * =============================================================================
 */

// ✅ GOOD: Manual Join for Count Queries
console.log('\n📊 SCENARIO 3: Manual Join - Count Query');
console.log('Generated SQL will be: SELECT COUNT(*) FROM ...');

const locationCount = await db
  .select({ count: count() })
  .from(locations)
  .innerJoin(locationAssignments,
    eq(locations.locationId, locationAssignments.locationId))
  .where(and(
    eq(locationAssignments.entityId, 'some-org-id'),
    eq(locations.isActive, true)
  ));

console.log('✅ Count Result:', locationCount);

/**
 * =============================================================================
 * SCENARIO 4: FLEXIBLE API ENDPOINTS WITH OPTIONAL RELATIONSHIPS
 * Use RELATIONS for APIs that need dynamic relationship loading
 * =============================================================================
 */

// ✅ GOOD: Relations for Flexible API Responses
console.log('\n🔄 SCENARIO 4: Relations - Flexible API Loading');

async function getOrganizationWithOptions(includeUsers = false, includeLocations = false) {
  const relations = {};

  if (includeUsers) {
    relations.memberships = {
      with: {
        user: {
          columns: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    };
  }

  if (includeLocations) {
    relations.locations = true;
  }

  return await db.query.organizations.findFirst({
    where: eq(organizations.organizationId, 'some-org-id'),
    with: relations
  });
}

const orgBasic = await getOrganizationWithOptions();
const orgWithUsers = await getOrganizationWithOptions(true, false);
const orgFull = await getOrganizationWithOptions(true, true);

console.log('✅ Flexible Relations Results:');
console.log('Basic:', orgBasic);
console.log('With Users:', orgWithUsers);
console.log('Full:', orgFull);

/**
 * =============================================================================
 * SCENARIO 5: BATCH OPERATIONS AND MULTIPLE TABLE UPDATES
 * Use MANUAL JOINS for transactions and batch operations
 * =============================================================================
 */

// ✅ GOOD: Manual Joins for Batch Operations
console.log('\n⚡ SCENARIO 5: Manual Joins - Batch Operations');

const batchLocationData = await db
  .select({
    // Organization data
    orgId: organizations.organizationId,
    orgName: organizations.organizationName,
    // Location data
    locationId: locations.locationId,
    locationName: locations.locationName,
    // Assignment data
    assignedAt: locationAssignments.assignedAt,
    assignmentType: locationAssignments.assignmentType
  })
  .from(organizations)
  .innerJoin(locationAssignments,
    eq(organizations.organizationId, locationAssignments.entityId))
  .innerJoin(locations,
    eq(locationAssignments.locationId, locations.locationId))
  .where(and(
    eq(organizations.tenantId, 'some-tenant-id'),
    eq(locations.isActive, true),
    eq(locationAssignments.entityType, 'organization')
  ));

console.log('✅ Batch Operation Result:', batchLocationData);

/**
 * =============================================================================
 * SCENARIO 6: PROBLEMATIC RELATIONS EXAMPLE (What NOT to do)
 * =============================================================================
 */

// ❌ BAD: Relations with complex nested conditions (generates inefficient SQL)
console.log('\n❌ SCENARIO 6: Problematic Relations Example');

const badQuery = await db.query.locationAssignments.findMany({
  where: and(
    eq(locationAssignments.entityId, 'some-org-id'),
    eq(locationAssignments.entityType, 'organization')
  ),
  with: {
    location: {
      where: eq(locations.isActive, true), // Nested condition = inefficient SQL
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

console.log('❌ This generates complex LATERAL JOIN + JSON_BUILD_ARRAY SQL');

/**
 * =============================================================================
 * DECISION GUIDE: When to Use Relations vs Manual Joins
 * =============================================================================
 *
 * USE RELATIONS WHEN:
 * ✅ Building APIs with flexible data loading
 * ✅ Need nested object graphs (3+ levels deep)
 * ✅ Working with GraphQL-like data fetching
 * ✅ The query structure is dynamic
 * ✅ You want type-safe nested data access
 *
 * USE MANUAL JOINS WHEN:
 * ✅ Performance is critical
 * ✅ Query is simple (1-2 table relationships)
 * ✅ Need exact SQL control
 * ✅ Working with aggregates (COUNT, SUM, etc.)
 * ✅ Complex WHERE conditions across multiple tables
 * ✅ Batch operations and transactions
 *
 * PERFORMANCE RULE:
 * - Manual Joins: Usually faster for simple queries
 * - Relations: Can be slower due to JSON construction and complex SQL
 * - Test both approaches for your specific use cases!
 *
 * =============================================================================
 */

console.log('\n🎯 SUMMARY:');
console.log('• Use Manual Joins for: Performance, Simple queries, Aggregates');
console.log('• Use Relations for: Complex APIs, Nested data, Flexible loading');
console.log('• Always test performance for your specific use cases!');
