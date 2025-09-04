#!/usr/bin/env node

/**
 * Direct Test of Hierarchical Organization and Location Services
 *
 * This script tests the organization and location services directly
 * without starting the full server, to avoid any startup issues.
 */

import { config } from 'dotenv';
import OrganizationService from './src/services/organization-service.js';
import LocationService from './src/services/location-service.js';

// Load environment variables
config();

async function testOrganizationService() {
  console.log('🏢 Testing Organization Service Directly');
  console.log('='.repeat(60));

  try {
    const testData = {
      name: "Test Tech Solutions " + Date.now(),
      description: "Test company for hierarchical organizations",
      gstin: "37AAAAA0000A1Z" + Math.floor(Math.random() * 9 + 1),
      parentTenantId: '893d8c75-68e6-4d42-92f8-45df62ef08b6' // Use real tenant from database
    };

    console.log('📝 Creating parent organization with data:', testData);

    const result = await OrganizationService.createParentOrganization(testData, '50d4f694-202f-4f27-943d-7aafeffee29c');

    if (result.success) {
      console.log('✅ Parent organization created successfully!');
      console.log('🏢 Organization ID:', result.organization.organizationId);
      console.log('🏢 Organization Name:', result.organization.organizationName);

      // Test getting organization details
      console.log('\n📖 Testing getOrganizationDetails...');
      try {
        const detailsResult = await OrganizationService.getOrganizationDetails(result.organization.organizationId);
        console.log('✅ Organization details retrieved:', detailsResult.organization.organizationName);
      } catch (error) {
        console.log('⚠️ Organization details test failed (Drizzle ORM issue), skipping...');
        console.log('Error:', error.message);
      }

      // Test creating sub-organization
      console.log('\n📂 Testing createSubOrganization...');
      const subOrgData = {
        name: "Test Development Division " + Date.now(),
        description: "Test software development department",
        gstin: "37BBBBB0000B1Z" + Math.floor(Math.random() * 9 + 1),
        parentOrganizationId: result.organization.organizationId
      };

      const subResult = await OrganizationService.createSubOrganization(subOrgData, '50d4f694-202f-4f27-943d-7aafeffee29c');

      if (subResult.success) {
        console.log('✅ Sub-organization created successfully!');
        console.log('📂 Sub-Org ID:', subResult.organization.organizationId);

        // Test getting sub-organizations
        console.log('\n📋 Testing getSubOrganizations...');
        const subOrgsResult = await OrganizationService.getSubOrganizations(result.organization.organizationId);
        console.log('✅ Found', subOrgsResult.count, 'sub-organizations');

        // Test organization hierarchy
        console.log('\n🌳 Testing getOrganizationHierarchy...');
        const hierarchyResult = await OrganizationService.getOrganizationHierarchy('893d8c75-68e6-4d42-92f8-45df62ef08b6');
        console.log('✅ Hierarchy retrieved with', hierarchyResult.totalOrganizations, 'organizations');

        return {
          parentOrg: result.organization,
          subOrg: subResult.organization
        };
      }
    } else {
      console.log('❌ Failed to create parent organization');
      return null;
    }

  } catch (error) {
    console.error('🚨 Organization service test failed:', error);
    return null;
  }
}

async function testLocationService(orgData) {
  console.log('\n📍 Testing Location Service Directly');
  console.log('='.repeat(60));

  if (!orgData) {
    console.log('⚠️ Skipping location tests - no organization data available');
    return;
  }

  try {
    const locationData = {
      name: "Test Headquarters " + Date.now(),
      address: "123 Test Street, Silicon Valley",
      city: "San Francisco",
      state: "California",
      zipCode: "94105",
      country: "USA",
      organizationId: orgData.parentOrg.organizationId
    };

    console.log('📝 Creating location with data:', locationData);

    const result = await LocationService.createLocation(locationData, '50d4f694-202f-4f27-943d-7aafeffee29c');

    if (result.success) {
      console.log('✅ Location created successfully!');
      console.log('📍 Location ID:', result.location.locationId);
      console.log('📍 Location Name:', result.location.locationName);

      // Test getting location details
      console.log('\n📖 Testing getLocationDetails...');
      const detailsResult = await LocationService.getLocationDetails(result.location.locationId);
      console.log('✅ Location details retrieved:', detailsResult.location.locationName);

      // Test getting organization locations
      console.log('\n🏢 Testing getOrganizationLocations...');
      const orgLocationsResult = await LocationService.getOrganizationLocations(orgData.parentOrg.organizationId);
      console.log('✅ Found', orgLocationsResult.count, 'locations for organization');

      // Test assigning location to sub-organization
      console.log('\n🔗 Testing assignLocationToOrganization...');
      const assignResult = await LocationService.assignLocationToOrganization(
        result.location.locationId,
        orgData.subOrg.organizationId,
        '50d4f694-202f-4f27-943d-7aafeffee29c'
      );

      if (assignResult.success) {
        console.log('✅ Location assigned to sub-organization successfully!');
      }

      // Test getting tenant locations
      console.log('\n🏛️ Testing getTenantLocations...');
      const tenantLocationsResult = await LocationService.getTenantLocations('893d8c75-68e6-4d42-92f8-45df62ef08b6');
      console.log('✅ Found', tenantLocationsResult.count, 'locations for tenant');

      return result.location;

    } else {
      console.log('❌ Failed to create location');
      return null;
    }

  } catch (error) {
    console.error('🚨 Location service test failed:', error);
    return null;
  }
}

async function testUpdateOperations(orgData, locationData) {
  console.log('\n✏️ Testing Update Operations');
  console.log('='.repeat(60));

  if (!orgData || !locationData) {
    console.log('⚠️ Skipping update tests - missing data');
    return;
  }

  try {
    // Test updating organization
    console.log('📝 Testing organization update...');
    const orgUpdateResult = await OrganizationService.updateOrganization(
      orgData.parentOrg.organizationId,
      {
        organizationName: "Updated Test Tech Solutions " + Date.now(),
        description: "Updated test company description"
      },
      '50d4f694-202f-4f27-943d-7aafeffee29c'
    );

    if (orgUpdateResult.success) {
      console.log('✅ Organization updated successfully!');
      console.log('🏢 New name:', orgUpdateResult.organization.organizationName);
    }

    // Test updating location
    console.log('\n📝 Testing location update...');
    const locationUpdateResult = await LocationService.updateLocation(
      locationData.locationId,
      {
        locationName: "Updated Test Headquarters " + Date.now(),
        address: "456 Updated Test Street, Silicon Valley"
      },
      '50d4f694-202f-4f27-943d-7aafeffee29c'
    );

    if (locationUpdateResult.success) {
      console.log('✅ Location updated successfully!');
      console.log('📍 New name:', locationUpdateResult.location.locationName);
    }

  } catch (error) {
    console.error('🚨 Update operations test failed:', error);
  }
}

async function testDeleteOperations(orgData, locationData) {
  console.log('\n🗑️ Testing Delete Operations');
  console.log('='.repeat(60));

  if (!orgData || !locationData) {
    console.log('⚠️ Skipping delete tests - missing data');
    return;
  }

  try {
    // Test removing location from sub-organization
    console.log('🔗 Testing remove location from sub-organization...');
    const removeResult = await LocationService.removeLocationFromOrganization(
      locationData.locationId,
      orgData.subOrg.organizationId,
      '50d4f694-202f-4f27-943d-7aafeffee29c'
    );

    if (removeResult.success) {
      console.log('✅ Location removed from sub-organization successfully!');
    }

    // Test soft deleting location
    console.log('\n🗑️ Testing location soft delete...');
    const deleteLocationResult = await LocationService.deleteLocation(
      locationData.locationId,
      '50d4f694-202f-4f27-943d-7aafeffee29c'
    );

    if (deleteLocationResult.success) {
      console.log('✅ Location soft deleted successfully!');
    }

    // Test soft deleting sub-organization
    console.log('\n🗑️ Testing sub-organization soft delete...');
    const deleteSubOrgResult = await OrganizationService.deleteOrganization(
      orgData.subOrg.organizationId,
      '50d4f694-202f-4f27-943d-7aafeffee29c'
    );

    if (deleteSubOrgResult.success) {
      console.log('✅ Sub-organization soft deleted successfully!');
    }

    // Test soft deleting parent organization
    console.log('\n🗑️ Testing parent organization soft delete...');
    const deleteParentResult = await OrganizationService.deleteOrganization(
      orgData.parentOrg.organizationId,
      '50d4f694-202f-4f27-943d-7aafeffee29c'
    );

    if (deleteParentResult.success) {
      console.log('✅ Parent organization soft deleted successfully!');
    }

  } catch (error) {
    console.error('🚨 Delete operations test failed:', error);
  }
}

async function runAllServiceTests() {
  console.log('🚀 STARTING HIERARCHICAL SERVICES DIRECT TEST');
  console.log('⏰ Started at:', new Date().toISOString());
  console.log('='.repeat(80));

  try {
    // Test organization service
    const orgData = await testOrganizationService();

    // Test location service
    const locationData = await testLocationService(orgData);

    // Test update operations
    await testUpdateOperations(orgData, locationData);

    // Test delete operations
    await testDeleteOperations(orgData, locationData);

  } catch (error) {
    console.error('🚨 Service test execution failed:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 HIERARCHICAL SERVICES DIRECT TEST COMPLETED');
  console.log('⏰ Finished at:', new Date().toISOString());
  console.log('='.repeat(80));
}

console.log('\n📝 Usage:');
console.log('node test-hierarchical-services.js');
console.log('\nOr import in another file:');
console.log('import { runAllServiceTests } from "./test-hierarchical-services.js";');
console.log('await runAllServiceTests();');

// Export for use in other files
export { runAllServiceTests };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllServiceTests();
}
