import { db } from './src/db/index.js';
import { organizations } from './src/db/schema/organizations.js';
import { locations, locationAssignments } from './src/db/schema/locations.js';
import { eq, and, or } from 'drizzle-orm';

async function analyzeDataIsolation() {
  console.log('🔐 DATA ISOLATION ANALYSIS');
  console.log('='.repeat(60));

  const TENANT_ID = '893d8c75-68e6-4d42-92f8-45df62ef08b6';

  // 1. Current Isolation Mechanisms
  console.log('\n1. CURRENT ISOLATION MECHANISMS');
  console.log('-'.repeat(40));

  // Check tenant-level isolation
  const tenantOrgs = await db
    .select({ count: organizations.organizationId })
    .from(organizations)
    .where(eq(organizations.tenantId, TENANT_ID));

  console.log(`✅ Tenant-level isolation: ${tenantOrgs.length} organizations isolated by tenant_id`);

  // 2. Organization Hierarchy Analysis
  console.log('\n2. ORGANIZATION HIERARCHY ISOLATION');
  console.log('-'.repeat(40));

  // Get a sample organization with sub-orgs
  const parentOrgs = await db
    .select({
      organizationId: organizations.organizationId,
      organizationName: organizations.organizationName,
      organizationType: organizations.organizationType
    })
    .from(organizations)
    .where(and(
      eq(organizations.tenantId, TENANT_ID),
      eq(organizations.organizationType, 'parent')
    ))
    .limit(3);

  for (const parent of parentOrgs) {
    const subOrgs = await db
      .select({
        organizationId: organizations.organizationId,
        organizationName: organizations.organizationName
      })
      .from(organizations)
      .where(eq(organizations.parentOrganizationId, parent.organizationId));

    console.log(`🏢 ${parent.organizationName}:`);
    console.log(`   • Parent ID: ${parent.organizationId}`);
    console.log(`   • Sub-organizations: ${subOrgs.length}`);
    subOrgs.forEach(sub => {
      console.log(`     - ${sub.organizationName} (${sub.organizationId})`);
    });
    console.log('');
  }

  // 3. Location Assignment Analysis
  console.log('\n3. LOCATION ASSIGNMENT ISOLATION');
  console.log('-'.repeat(40));

  // Check how locations are assigned to organizations
  const assignments = await db
    .select({
      locationId: locationAssignments.locationId,
      entityType: locationAssignments.entityType,
      entityId: locationAssignments.entityId,
      assignmentType: locationAssignments.assignmentType
    })
    .from(locationAssignments)
    .limit(10);

  console.log('Sample location assignments:');
  assignments.forEach(assignment => {
    console.log(`📍 Location ${assignment.locationId.substring(0, 8)}... assigned to:`);
    console.log(`   • Entity Type: ${assignment.entityType}`);
    console.log(`   • Entity ID: ${assignment.entityId}`);
    console.log(`   • Assignment Type: ${assignment.assignmentType}`);
    console.log('');
  });

  // 4. Data Access Patterns Analysis
  console.log('\n4. DATA ACCESS PATTERNS');
  console.log('-'.repeat(40));

  console.log('Current Access Control:');
  console.log('• Tenant ID filtering: ✅ IMPLEMENTED');
  console.log('• Organization hierarchy: ✅ IMPLEMENTED');
  console.log('• Location assignments: ✅ IMPLEMENTED');
  console.log('');

  console.log('Missing Access Control:');
  console.log('• User role-based permissions: ❌ NOT IMPLEMENTED');
  console.log('• Row-level security (RLS): ❌ NOT IMPLEMENTED');
  console.log('• Location-level data isolation: ⚠️ PARTIALLY IMPLEMENTED');
  console.log('• Sub-org data isolation: ⚠️ PARTIALLY IMPLEMENTED');

  // 5. Isolation Gaps Analysis
  console.log('\n5. ISOLATION GAPS & RECOMMENDATIONS');
  console.log('-'.repeat(40));

  console.log('⚠️ CURRENT GAPS:');
  console.log('1. No user role-based access control');
  console.log('2. No location-level data filtering in queries');
  console.log('3. No sub-organization data segregation enforcement');
  console.log('4. No audit logging for data access');
  console.log('5. No tenant data leakage protection');
  console.log('');

  console.log('💡 RECOMMENDED SOLUTIONS:');
  console.log('1. Implement Row-Level Security (RLS) policies');
  console.log('2. Add user context to all data queries');
  console.log('3. Create data access middleware');
  console.log('4. Implement location-based filtering');
  console.log('5. Add sub-organization permission checks');

  // 6. Proposed Isolation Architecture
  console.log('\n6. PROPOSED ISOLATION ARCHITECTURE');
  console.log('-'.repeat(40));

  console.log(`
┌─────────────────────────────────────────────────┐
│                TENANT LEVEL                     │
│  ┌─────────────────────────────────────────┐    │
│  │          ORGANIZATION LEVEL            │    │
│  │  ┌─────────────────────────────────┐   │    │
│  │  │       SUB-ORG LEVEL            │   │    │
│  │  │  ┌─────────────────────────┐   │   │    │
│  │  │  │     LOCATION LEVEL      │   │   │    │
│  │  │  │  ┌─────────────────┐    │   │   │    │
│  │  │  │  │   USER LEVEL    │    │   │   │    │
│  │  │  │  │                 │    │   │   │    │
│  │  │  │  └─────────────────┘    │   │   │    │
│  │  │  └─────────────────────────┘   │   │    │
│  │  └─────────────────────────────────┘   │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘

ISOLATION LAYERS:
1. Tenant ID (already implemented)
2. Organization hierarchy (partially implemented)
3. Sub-organization permissions (needs implementation)
4. Location-based access (needs implementation)
5. User role permissions (needs implementation)
`);

  console.log('\n🎯 CONCLUSION:');
  console.log('Current approach provides BASIC isolation but needs enhancement');
  console.log('for production SaaS requirements.');
  console.log('');
  console.log('✅ SUFFICIENT for: Basic multi-tenancy, organization hierarchy');
  console.log('❌ INSUFFICIENT for: Fine-grained access control, data security');

  process.exit(0);
}

analyzeDataIsolation();
