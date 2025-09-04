/**
 * Location Service - Handles Location Management for Organizations
 * Follows SOLID principles with single responsibility for location operations
 */

import { db } from '../db/index.js';
import { organizations } from '../db/schema/organizations.js';
import { locations, locationAssignments, locationUsage } from '../db/schema/locations.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class LocationService {

  /**
   * Create a new location for an organization
   */
  async createLocation(data, createdBy) {
    const { name, street, city, state, zipCode, country, organizationId } = data;

    // Validate input
    this.validateLocationData(data);

    // Check if organization exists
    const organization = await db
      .select()
      .from(organizations)
      .where(eq(organizations.organizationId, organizationId))
      .limit(1);

    if (organization.length === 0) {
      throw new Error('Organization not found');
    }

    const locationId = uuidv4();

    // Create address object for JSONB field
    const addressData = {
      street: street || '',
      city: city || '',
      state: state || '',
      zipCode: zipCode || '',
      country: country || '',
      additionalDetails: ''
    };

    // Create capacity object for JSONB field
    const capacityData = {
      maxOccupancy: null,
      currentOccupancy: 0,
      resources: {}
    };

    // Create location
    const location = await db.insert(locations).values({
      locationId,
      tenantId: organization[0].tenantId,
      locationName: name,
      address: addressData,
      capacity: capacityData,
      responsiblePersonId: createdBy,
      isActive: true,
      createdBy,
      createdAt: new Date()
    }).returning();

    // Link location to organization
    await db.insert(locationAssignments).values({
      locationId,
      entityType: 'organization',
      entityId: organizationId,
      assignedBy: createdBy,
      assignedAt: new Date()
    });

    return {
      success: true,
      location: location[0],
      organization: {
        organizationId: organization[0].organizationId,
        organizationName: organization[0].organizationName
      },
      message: 'Location created and assigned to organization successfully'
    };
  }

  /**
   * Get all locations for an organization
   */
  async getOrganizationLocations(organizationId) {
    // Check if organization exists
    const organization = await db
      .select()
      .from(organizations)
      .where(eq(organizations.organizationId, organizationId))
      .limit(1);

    if (organization.length === 0) {
      throw new Error('Organization not found');
    }

    // Get locations for this organization using manual join (more efficient)
    const orgLocations = await db
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
        eq(locationAssignments.entityId, organizationId),
        eq(locationAssignments.entityType, 'organization'),
        eq(locations.isActive, true)
      ))
      .orderBy(locations.createdAt);

    return {
      success: true,
      organization: {
        organizationId: organization[0].organizationId,
        organizationName: organization[0].organizationName
      },
      locations: orgLocations,
      count: orgLocations.length,
      message: 'Organization locations retrieved successfully'
    };
  }

  /**
   * Get location details
   */
  async getLocationDetails(locationId) {
    const location = await db
      .select({
        locationId: locations.locationId,
        tenantId: locations.tenantId,
        locationName: locations.locationName,
        address: locations.address,
        city: locations.city,
        state: locations.state,
        zipCode: locations.zipCode,
        country: locations.country,
        responsiblePersonId: locations.responsiblePersonId,
        isActive: locations.isActive,
        createdAt: locations.createdAt
      })
      .from(locations)
      .where(eq(locations.locationId, locationId))
      .limit(1);

    if (location.length === 0) {
      throw new Error('Location not found');
    }

    // Get organizations that use this location
    const orgLinks = await db
      .select({
        organizationId: organizations.organizationId,
        organizationName: organizations.organizationName,
        organizationType: organizations.organizationType,
        assignedAt: locationAssignments.assignedAt
      })
      .from(organizations)
      .innerJoin(locationAssignments,
        eq(organizations.organizationId, locationAssignments.entityId))
      .where(and(
        eq(locationAssignments.locationId, locationId),
        eq(locationAssignments.entityType, 'organization')
      ));

    return {
      success: true,
      location: location[0],
      organizations: orgLinks,
      organizationCount: orgLinks.length,
      message: 'Location details retrieved successfully'
    };
  }

  /**
   * Update location details
   */
  async updateLocation(locationId, updateData, updatedBy) {
    const allowedFields = ['locationName', 'address', 'city', 'state', 'zipCode', 'country', 'responsiblePersonId'];

    const updateFields = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields[key] = updateData[key];
      }
    });

    if (Object.keys(updateFields).length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.updatedAt = new Date();
    updateFields.updatedBy = updatedBy;

    const updatedLocation = await db
      .update(locations)
      .set(updateFields)
      .where(eq(locations.locationId, locationId))
      .returning();

    if (updatedLocation.length === 0) {
      throw new Error('Location not found or update failed');
    }

    return {
      success: true,
      location: updatedLocation[0],
      message: 'Location updated successfully'
    };
  }

  /**
   * Assign location to another organization
   */
  async assignLocationToOrganization(locationId, organizationId, assignedBy) {
    // Check if location exists
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.locationId, locationId))
      .limit(1);

    if (location.length === 0) {
      throw new Error('Location not found');
    }

    // Check if organization exists
    const organization = await db
      .select()
      .from(organizations)
      .where(eq(organizations.organizationId, organizationId))
      .limit(1);

    if (organization.length === 0) {
      throw new Error('Organization not found');
    }

    // Check if assignment already exists
    const existingAssignment = await db
      .select()
      .from(organizationLocations)
      .where(and(
        eq(organizationLocations.locationId, locationId),
        eq(organizationLocations.organizationId, organizationId)
      ))
      .limit(1);

    if (existingAssignment.length > 0) {
      throw new Error('Location is already assigned to this organization');
    }

    // Create assignment
    const assignment = await db.insert(organizationLocations).values({
      organizationId,
      locationId,
      assignedBy,
      assignedAt: new Date()
    }).returning();

    return {
      success: true,
      assignment: assignment[0],
      location: {
        locationId: location[0].locationId,
        locationName: location[0].locationName
      },
      organization: {
        organizationId: organization[0].organizationId,
        organizationName: organization[0].organizationName
      },
      message: 'Location assigned to organization successfully'
    };
  }

  /**
   * Remove location from organization
   */
  async removeLocationFromOrganization(locationId, organizationId, removedBy) {
    // Check if organization has other locations before removing
    const orgLocations = await db
      .select({ locationId: locationAssignments.locationId })
      .from(locationAssignments)
      .where(and(
        eq(locationAssignments.entityId, organizationId),
        eq(locationAssignments.entityType, 'organization')
      ));

    if (orgLocations.length <= 1) {
      throw new Error('Cannot remove the last location from an organization');
    }

    // Remove assignment
    const removed = await db
      .delete(locationAssignments)
      .where(and(
        eq(locationAssignments.locationId, locationId),
        eq(locationAssignments.entityId, organizationId),
        eq(locationAssignments.entityType, 'organization')
      ))
      .returning();

    if (removed.length === 0) {
      throw new Error('Location assignment not found');
    }

    return {
      success: true,
      assignment: removed[0],
      message: 'Location removed from organization successfully'
    };
  }

  /**
   * Delete location (soft delete)
   */
  async deleteLocation(locationId, deletedBy) {
    // Check if location is assigned to any organizations
    const assignments = await db
      .select({ entityId: locationAssignments.entityId })
      .from(locationAssignments)
      .where(and(
        eq(locationAssignments.locationId, locationId),
        eq(locationAssignments.entityType, 'organization')
      ))
      .limit(1);

    if (assignments.length > 0) {
      throw new Error('Cannot delete location that is assigned to organizations');
    }

    const deletedLocation = await db
      .update(locations)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: deletedBy
      })
      .where(eq(locations.locationId, locationId))
      .returning();

    if (deletedLocation.length === 0) {
      throw new Error('Location not found');
    }

    return {
      success: true,
      location: deletedLocation[0],
      message: 'Location deactivated successfully'
    };
  }

  /**
   * Get all locations for a tenant
   */
  async getTenantLocations(tenantId) {
    const tenantLocations = await db
      .select({
        locationId: locations.locationId,
        locationName: locations.locationName,
        address: locations.address,
        isActive: locations.isActive,
        createdAt: locations.createdAt
      })
      .from(locations)
      .where(and(
        eq(locations.tenantId, tenantId),
        eq(locations.isActive, true)
      ))
      .orderBy(locations.createdAt);

    return {
      success: true,
      locations: tenantLocations,
      count: tenantLocations.length,
      message: 'Tenant locations retrieved successfully'
    };
  }

  /**
   * Update location capacity and usage
   */
  async updateLocationCapacity(locationId, capacityData, updatedBy) {
    try {
      console.log('🔄 Updating location capacity for:', locationId);

      const { maxOccupancy, currentOccupancy, resources } = capacityData;

      // Validate capacity data
      if (maxOccupancy !== undefined && maxOccupancy < 0) {
        throw new Error('Maximum occupancy cannot be negative');
      }

      if (currentOccupancy !== undefined && currentOccupancy < 0) {
        throw new Error('Current occupancy cannot be negative');
      }

      if (currentOccupancy !== undefined && maxOccupancy !== undefined && currentOccupancy > maxOccupancy) {
        throw new Error('Current occupancy cannot exceed maximum occupancy');
      }

      // First, get current capacity
      const currentLocation = await db
        .select({
          capacity: locations.capacity
        })
        .from(locations)
        .where(eq(locations.locationId, locationId))
        .limit(1);

      if (currentLocation.length === 0) {
        throw new Error('Location not found');
      }

      const currentCapacity = currentLocation[0].capacity || {};

      // Prepare updated capacity
      const updatedCapacity = {
        maxOccupancy: maxOccupancy !== undefined ? maxOccupancy : currentCapacity.maxOccupancy,
        currentOccupancy: currentOccupancy !== undefined ? currentOccupancy : currentCapacity.currentOccupancy,
        resources: resources !== undefined ? resources : currentCapacity.resources
      };

      console.log('📊 Updating capacity:', updatedCapacity);

      // Update the location
      const updatedLocation = await db
        .update(locations)
        .set({
          capacity: updatedCapacity,
          updatedBy,
          updatedAt: new Date()
        })
        .where(eq(locations.locationId, locationId))
        .returning();

      if (updatedLocation.length === 0) {
        throw new Error('Location update failed');
      }

      console.log('✅ Location capacity updated successfully');

      return {
        success: true,
        location: updatedLocation[0],
        message: 'Location capacity updated successfully'
      };
    } catch (error) {
      console.error('❌ Error updating location capacity:', error);
      throw error;
    }
  }

  /**
   * Get location utilization analytics
   */
  async getLocationAnalytics(locationId) {
    try {
      console.log('📊 Getting location analytics for:', locationId);

      // Get location details with capacity
      const location = await db
        .select({
          locationId: locations.locationId,
          locationName: locations.locationName,
          capacity: locations.capacity,
          createdAt: locations.createdAt
        })
        .from(locations)
        .where(eq(locations.locationId, locationId))
        .limit(1);

      if (location.length === 0) {
        throw new Error('Location not found');
      }

      const loc = location[0];
      console.log('🏢 Location found:', loc.locationName);

      // Calculate utilization metrics
      const maxOccupancy = loc.capacity?.maxOccupancy || 0;
      const currentOccupancy = loc.capacity?.currentOccupancy || 0;
      const utilizationRate = maxOccupancy > 0 ? (currentOccupancy / maxOccupancy) * 100 : 0;

      // Get usage history (handle gracefully if table doesn't exist)
      let usageHistory = [];
      let totalUsage = 0;
      let avgUsagePerDay = 0;

      try {
        usageHistory = await db
          .select()
          .from(locationUsage)
          .where(eq(locationUsage.locationId, locationId))
          .orderBy(locationUsage.createdAt)
          .limit(30); // Last 30 usage records

        totalUsage = usageHistory.length;
        avgUsagePerDay = totalUsage / 30; // Rough calculation
        console.log('📈 Usage history retrieved:', totalUsage, 'records');
      } catch (usageError) {
        console.log('⚠️ Could not retrieve usage history:', usageError.message);
        // Continue with empty usage data
      }

      // Get resource utilization
      const resources = loc.capacity?.resources || {};
      const resourceUtilization = Object.keys(resources).map(resourceName => {
        const resource = resources[resourceName];
        return {
          name: resourceName,
          total: resource.total || 0,
          used: resource.used || 0,
          utilization: resource.total > 0 ? (resource.used / resource.total) * 100 : 0
        };
      });

      console.log('✅ Analytics calculated successfully');

      return {
        success: true,
        analytics: {
          locationId: loc.locationId,
          locationName: loc.locationName,
          capacity: {
            maxOccupancy,
            currentOccupancy,
            utilizationRate: Math.round(utilizationRate * 100) / 100
          },
          usage: {
            totalRecords: totalUsage,
            avgUsagePerDay: Math.round(avgUsagePerDay * 100) / 100,
            utilizationTrend: utilizationRate > 70 ? 'high' : utilizationRate > 30 ? 'medium' : 'low'
          },
          resources: resourceUtilization,
          lastUpdated: loc.createdAt
        },
        message: 'Location analytics retrieved successfully'
      };
    } catch (error) {
      console.error('❌ Error in getLocationAnalytics:', error);
      throw new Error(`Failed to get location analytics: ${error.message}`);
    }
  }

  /**
   * Get locations by utilization level
   */
  async getLocationsByUtilization(tenantId, utilizationLevel = 'all') {
    const allLocations = await db
      .select({
        locationId: locations.locationId,
        locationName: locations.locationName,
        capacity: locations.capacity,
        isActive: locations.isActive
      })
      .from(locations)
      .where(and(
        eq(locations.tenantId, tenantId),
        eq(locations.isActive, true)
      ));

    // Calculate utilization for each location
    const locationsWithUtilization = allLocations.map(loc => {
      const maxOccupancy = loc.capacity?.maxOccupancy || 0;
      const currentOccupancy = loc.capacity?.currentOccupancy || 0;
      const utilizationRate = maxOccupancy > 0 ? (currentOccupancy / maxOccupancy) * 100 : 0;

      return {
        ...loc,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        utilizationLevel: utilizationRate > 80 ? 'critical' :
                         utilizationRate > 60 ? 'high' :
                         utilizationRate > 30 ? 'medium' : 'low'
      };
    });

    // Filter by utilization level if specified
    let filteredLocations = locationsWithUtilization;
    if (utilizationLevel !== 'all') {
      filteredLocations = locationsWithUtilization.filter(loc => loc.utilizationLevel === utilizationLevel);
    }

    return {
      success: true,
      locations: filteredLocations,
      total: filteredLocations.length,
      breakdown: {
        critical: locationsWithUtilization.filter(l => l.utilizationLevel === 'critical').length,
        high: locationsWithUtilization.filter(l => l.utilizationLevel === 'high').length,
        medium: locationsWithUtilization.filter(l => l.utilizationLevel === 'medium').length,
        low: locationsWithUtilization.filter(l => l.utilizationLevel === 'low').length
      },
      message: `Locations retrieved by utilization level: ${utilizationLevel}`
    };
  }

  /**
   * Bulk update location capacities
   */
  async bulkUpdateLocationCapacities(updates, updatedBy) {
    const results = [];
    const errors = [];

    for (const [index, update] of updates.entries()) {
      try {
        const { locationId, ...capacityData } = update;

        if (!locationId) {
          throw new Error('Location ID is required');
        }

        const result = await this.updateLocationCapacity(locationId, capacityData, updatedBy);
        results.push({
          index,
          locationId,
          success: true,
          data: result.location
        });
      } catch (error) {
        errors.push({
          index,
          locationId: update.locationId,
          success: false,
          error: error.message,
          data: update
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalProcessed: updates.length,
      successful: results.length,
      failed: errors.length,
      message: `Bulk capacity update completed: ${results.length} successful, ${errors.length} failed`
    };
  }

  /**
   * Validate location data
   */
  validateLocationData(data) {
    const { name, address, city, country, organizationId } = data;

    if (!name || name.trim().length < 2) {
      throw new Error('Location name must be at least 2 characters');
    }

    if (!address || address.trim().length < 5) {
      throw new Error('Address must be at least 5 characters');
    }

    if (!city || city.trim().length < 2) {
      throw new Error('City must be at least 2 characters');
    }

    if (!country || country.trim().length < 2) {
      throw new Error('Country must be at least 2 characters');
    }

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
  }
}

export default new LocationService();
