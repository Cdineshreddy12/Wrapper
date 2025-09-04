import { db } from './src/db/index.js';
import { organizations } from './src/db/schema/organizations.js';
import { locations, locationAssignments } from './src/db/schema/locations.js';
import { eq, and, isNull } from 'drizzle-orm';

async function checkOverallData() {
  try {
    console.log('🔍 COMPREHENSIVE DATA INTEGRITY CHECK');
    console.log('='.repeat(60));

    const TENANT_ID = '893d8c75-68e6-4d42-92f8-45df62ef08b6';

    // 1. Check Organizations
    console.log('\n🏢 ORGANIZATIONS SUMMARY');
    console.log('-'.repeat(40));

    const allOrgs = await db
      .select({
        organizationId: organizations.organizationId,
        organizationName: organizations.organizationName,
        organizationType: organizations.organizationType,
        parentOrganizationId: organizations.parentOrganizationId,
        createdAt: organizations.createdAt
      })
      .from(organizations)
      .where(eq(organizations.tenantId, TENANT_ID))
      .orderBy(organizations.createdAt);

    console.log(`📊 Total Organizations: ${allOrgs.length}`);

    // Categorize organizations
    const parentOrgs = allOrgs.filter(org => org.organizationType === 'parent');
    const subOrgs = allOrgs.filter(org => org.organizationType === 'sub');
    const orgsWithoutParent = allOrgs.filter(org => !org.parentOrganizationId);

    console.log(`   • Parent Organizations: ${parentOrgs.length}`);
    console.log(`   • Sub-Organizations: ${subOrgs.length}`);
    console.log(`   • Organizations without parent: ${orgsWithoutParent.length}`);

    // Check for data quality
    const orgsWithNullNames = allOrgs.filter(org => !org.organizationName);
    const orgsWithEmptyNames = allOrgs.filter(org => org.organizationName === '');
    console.log(`   • Organizations with null names: ${orgsWithNullNames.length}`);
    console.log(`   • Organizations with empty names: ${orgsWithEmptyNames.length}`);

    // 2. Check Locations
    console.log('\n📍 LOCATIONS SUMMARY');
    console.log('-'.repeat(40));

    const allLocations = await db
      .select({
        locationId: locations.locationId,
        locationName: locations.locationName,
        tenantId: locations.tenantId,
        responsiblePersonId: locations.responsiblePersonId,
        createdAt: locations.createdAt
      })
      .from(locations)
      .where(eq(locations.tenantId, TENANT_ID))
      .orderBy(locations.createdAt);

    console.log(`📊 Total Locations: ${allLocations.length}`);

    const locationsWithNullNames = allLocations.filter(loc => !loc.locationName);
    console.log(`   • Locations with null names: ${locationsWithNullNames.length}`);

    // 3. Check Location Assignments
    console.log('\n🔗 LOCATION ASSIGNMENTS SUMMARY');
    console.log('-'.repeat(40));

    const allAssignments = await db
      .select({
        assignmentId: locationAssignments.assignmentId,
        locationId: locationAssignments.locationId,
        entityType: locationAssignments.entityType,
        entityId: locationAssignments.entityId,
        assignmentType: locationAssignments.assignmentType,
        isActive: locationAssignments.isActive,
        assignedAt: locationAssignments.assignedAt
      })
      .from(locationAssignments)
      .orderBy(locationAssignments.assignedAt);

    console.log(`📊 Total Location Assignments: ${allAssignments.length}`);

    // Group by entity type
    const orgAssignments = allAssignments.filter(assignment => assignment.entityType === 'organization');
    const locationAssignmentsCount = allAssignments.filter(assignment => assignment.entityType === 'location');

    console.log(`   • Assigned to Organizations: ${orgAssignments.length}`);
    console.log(`   • Assigned to Locations: ${locationAssignmentsCount.length}`);

    // 4. Check Data Integrity
    console.log('\n🔍 DATA INTEGRITY CHECK');
    console.log('-'.repeat(40));

    // Check for orphaned assignments
    const validOrgIds = new Set(allOrgs.map(org => org.organizationId));
    const invalidOrgAssignments = orgAssignments.filter(assignment => !validOrgIds.has(assignment.entityId));
    console.log(`   • Invalid organization assignments: ${invalidOrgAssignments.length}`);

    // Check for orphaned locations
    const validLocationIds = new Set(allLocations.map(loc => loc.locationId));
    const invalidLocationAssignments = allAssignments.filter(assignment =>
      assignment.entityType === 'location' && !validLocationIds.has(assignment.entityId));
    console.log(`   • Invalid location assignments: ${invalidLocationAssignments.length}`);

    // Check for locations without assignments
    const assignedLocationIds = new Set(allAssignments.map(assignment => assignment.locationId));
    const unassignedLocations = allLocations.filter(loc => !assignedLocationIds.has(loc.locationId));
    console.log(`   • Locations without assignments: ${unassignedLocations.length}`);

    // 5. Hierarchy Analysis
    console.log('\n🌳 HIERARCHY ANALYSIS');
    console.log('-'.repeat(40));

    // Build hierarchy
    const hierarchyMap = {};
    allOrgs.forEach(org => {
      hierarchyMap[org.organizationId] = {
        ...org,
        children: [],
        locations: []
      };
    });

    // Build parent-child relationships
    allOrgs.forEach(org => {
      if (org.parentOrganizationId && hierarchyMap[org.parentOrganizationId]) {
        hierarchyMap[org.parentOrganizationId].children.push(hierarchyMap[org.organizationId]);
      }
    });

    // Assign locations to organizations
    allAssignments.forEach(assignment => {
      if (assignment.entityType === 'organization' && hierarchyMap[assignment.entityId]) {
        hierarchyMap[assignment.entityId].locations.push(assignment.locationId);
      }
    });

    // Display hierarchy
    const rootOrgs = allOrgs.filter(org => !org.parentOrganizationId);

    console.log('\n📋 ORGANIZATION HIERARCHY:');
    rootOrgs.forEach(root => {
      const rootOrg = hierarchyMap[root.organizationId];
      console.log(`🏢 ${rootOrg.organizationName} (${rootOrg.organizationType})`);
      console.log(`   📍 Locations: ${rootOrg.locations.length}`);

      if (rootOrg.children.length > 0) {
        rootOrg.children.forEach(child => {
          console.log(`   ├── ${child.organizationName} (${child.organizationType})`);
          console.log(`       📍 Locations: ${child.locations.length}`);
        });
      }
      console.log('');
    });

    // 6. Summary Statistics
    console.log('\n📊 SUMMARY STATISTICS');
    console.log('-'.repeat(40));
    console.log(`🏢 Organizations: ${allOrgs.length}`);
    console.log(`   • Parents: ${parentOrgs.length}`);
    console.log(`   • Subs: ${subOrgs.length}`);
    console.log(`📍 Locations: ${allLocations.length}`);
    console.log(`🔗 Assignments: ${allAssignments.length}`);
    console.log(`📈 Assignment Rate: ${Math.round((allAssignments.length / allLocations.length) * 100)}%`);

    // Data quality score
    let qualityScore = 100;
    if (orgsWithNullNames.length > 0) qualityScore -= 20;
    if (invalidOrgAssignments.length > 0) qualityScore -= 15;
    if (unassignedLocations.length > 0) qualityScore -= 10;

    console.log(`🎯 Data Quality Score: ${qualityScore}/100`);

    if (qualityScore >= 90) {
      console.log('✅ EXCELLENT: Data integrity is very good');
    } else if (qualityScore >= 70) {
      console.log('⚠️ GOOD: Data integrity is acceptable');
    } else {
      console.log('❌ NEEDS ATTENTION: Data integrity issues detected');
    }

  } catch (error) {
    console.error('❌ Error during data check:', error);
  } finally {
    process.exit(0);
  }
}

checkOverallData();
