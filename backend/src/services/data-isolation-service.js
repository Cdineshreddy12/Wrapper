/**
 * Data Isolation Service
 * Implements multi-level data isolation for organizations, sub-orgs, and locations
 */

import { db } from '../db/index.js';
import { organizations } from '../db/schema/organizations.js';
import { locations, locationAssignments } from '../db/schema/locations.js';
import { tenantUsers } from '../db/schema/users.js';
import { organizationMemberships } from '../db/schema/organization_memberships.js';
import { eq, and, or, inArray } from 'drizzle-orm';

export class DataIsolationService {

  /**
   * Get user's accessible organizations based on their role and membership
   */
  async getUserAccessibleOrganizations(userContext) {
    const { userId, internalUserId, tenantId, roles = [] } = userContext;
    console.log('🔍 getUserAccessibleOrganizations - userId:', userId, 'internalUserId:', internalUserId, 'tenantId:', tenantId, 'roles:', roles);

    // Get user's direct organization memberships from organization_memberships table
    console.log('🔍 Querying organization_memberships for user memberships...');
    let userMemberships = [];
    try {
      userMemberships = await db
        .select({
          organizationId: organizationMemberships.entityId,
          membershipType: organizationMemberships.membershipType,
          membershipStatus: organizationMemberships.membershipStatus
        })
        .from(organizationMemberships)
        .where(and(
          eq(organizationMemberships.userId, internalUserId || userId), // Use internalUserId if available, fallback to userId
          eq(organizationMemberships.entityType, 'organization'),
          eq(organizationMemberships.membershipStatus, 'active')
        ));
      console.log('✅ User organization memberships query successful:', userMemberships.length, 'records');
    } catch (queryError) {
      console.error('❌ User organization memberships query failed:', queryError);
      console.error('❌ Query error details:', queryError.message);
      console.error('❌ Using userId:', internalUserId || userId);
      userMemberships = [];
    }

    const directOrgIds = userMemberships.map(m => m.organizationId).filter(id => id != null);
    console.log('📋 Direct organization IDs:', directOrgIds);

    // If user is tenant admin, they can access all organizations
    if (roles && roles.includes && roles.includes('TENANT_ADMIN')) {
      console.log('👑 User is tenant admin, granting access to all organizations');
      const allOrgs = await db
        .select({ organizationId: organizations.organizationId })
        .from(organizations)
        .where(eq(organizations.tenantId, tenantId));

      return allOrgs.map(org => org.organizationId);
    }

    // For regular users, get their accessible orgs based on hierarchy
    const accessibleOrgs = new Set(directOrgIds);

    // If user has no direct organization memberships, return empty array
    if (directOrgIds.length === 0) {
      console.log('ℹ️ User has no direct organization memberships, returning empty array');
      return [];
    }

    // Add parent organizations (users can see their org's parent)
    for (const orgId of directOrgIds) {
      const org = await db
        .select({ parentOrganizationId: organizations.parentOrganizationId })
        .from(organizations)
        .where(eq(organizations.organizationId, orgId))
        .limit(1);

      if (org[0]?.parentOrganizationId) {
        accessibleOrgs.add(org[0].parentOrganizationId);
      }
    }

    // Add child organizations (users can see their org's children)
    for (const orgId of directOrgIds) {
      const children = await db
        .select({ organizationId: organizations.organizationId })
        .from(organizations)
        .where(eq(organizations.parentOrganizationId, orgId));

      children.forEach(child => accessibleOrgs.add(child.organizationId));
    }

    return Array.from(accessibleOrgs);
  }

  /**
   * Get user's accessible locations based on their organization access
   */
  async getUserAccessibleLocations(userContext, accessibleOrgs) {
    if (!accessibleOrgs || accessibleOrgs.length === 0) {
      return [];
    }

    // Get locations assigned to accessible organizations
    const locationResults = await db
      .select({
        locationId: locationAssignments.locationId
      })
      .from(locationAssignments)
      .where(and(
        eq(locationAssignments.entityType, 'organization'),
        inArray(locationAssignments.entityId, accessibleOrgs)
      ));

    return locationResults.map(result => result.locationId);
  }

  /**
   * Filter data based on user's access permissions
   */
  async filterOrganizationsByAccess(organizations, userContext) {
    const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
    return organizations.filter(org => accessibleOrgs.includes(org.organizationId));
  }

  /**
   * Filter locations based on user's access permissions
   */
  async filterLocationsByAccess(locations, userContext) {
    const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
    const accessibleLocations = await this.getUserAccessibleLocations(userContext, accessibleOrgs);

    return locations.filter(loc => accessibleLocations.includes(loc.locationId));
  }

  /**
   * Check if user has access to specific organization
   */
  async canAccessOrganization(userContext, organizationId) {
    const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
    return accessibleOrgs.includes(organizationId);
  }

  /**
   * Check if user has access to specific location
   */
  async canAccessLocation(userContext, locationId) {
    const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
    const accessibleLocations = await this.getUserAccessibleLocations(userContext, accessibleOrgs);

    return accessibleLocations.includes(locationId);
  }

  /**
   * Get user's data access scope
   */
  async getUserAccessScope(userContext) {
    try {
      console.log('🔍 getUserAccessScope - Starting with userContext:', {
        userId: userContext.userId,
        tenantId: userContext.tenantId,
        roles: userContext.roles
      });

      const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
      console.log('📋 Accessible organizations:', accessibleOrgs);

      const accessibleLocations = await this.getUserAccessibleLocations(userContext, accessibleOrgs);
      console.log('📍 Accessible locations:', accessibleLocations);

      // Additional safety: filter out any null/undefined values
      const cleanOrgIds = (accessibleOrgs || []).filter(id => id != null);
      const cleanLocationIds = (accessibleLocations || []).filter(id => id != null);

      console.log('🧹 Clean org IDs:', cleanOrgIds);
      console.log('🧹 Clean location IDs:', cleanLocationIds);

      let orgDetails = [];
      let locationDetails = [];

      // Get organization details - only query if there are accessible organizations
      if (cleanOrgIds.length > 0) {
        console.log('🔍 Querying organization details...');
        try {
          orgDetails = await db
            .select({
              organizationId: organizations.organizationId,
              organizationName: organizations.organizationName,
              organizationType: organizations.organizationType
            })
            .from(organizations)
            .where(inArray(organizations.organizationId, cleanOrgIds));
          console.log('✅ Organization details retrieved:', orgDetails.length);
        } catch (orgError) {
          console.error('❌ Organization query failed:', orgError);
          orgDetails = [];
        }
      } else {
        console.log('ℹ️ No accessible organizations, skipping query');
      }

      // Get location details - only query if there are accessible locations
      if (cleanLocationIds.length > 0) {
        console.log('🔍 Querying location details...');
        try {
          locationDetails = await db
            .select({
              locationId: locations.locationId,
              locationName: locations.locationName
            })
            .from(locations)
            .where(inArray(locations.locationId, cleanLocationIds));
          console.log('✅ Location details retrieved:', locationDetails.length);
        } catch (locError) {
          console.error('❌ Location query failed:', locError);
          locationDetails = [];
        }
      } else {
        console.log('ℹ️ No accessible locations, skipping query');
      }

      const result = {
        organizations: orgDetails || [],
        locations: locationDetails || [],
        scope: {
          orgCount: cleanOrgIds.length,
          locationCount: cleanLocationIds.length
        }
      };

      console.log('✅ getUserAccessScope - Success:', result.scope);
      return result;
    } catch (error) {
      console.error('❌ Error in getUserAccessScope:', error);
      console.error('❌ Error stack:', error.stack);
      // Return safe defaults on error
      return {
        organizations: [],
        locations: [],
        scope: {
          orgCount: 0,
          locationCount: 0
        }
      };
    }
  }
}

export default new DataIsolationService();
