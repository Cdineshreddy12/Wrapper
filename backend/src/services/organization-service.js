/**
 * Organization Service - Handles Parent and Sub-Organization Management
 * Follows SOLID principles with single responsibility for organization operations
 */

import { db } from '../db/index.js';
import { tenants } from '../db/schema/tenants.js';
import { organizations } from '../db/schema/organizations.js';
import { organizationMemberships } from '../db/schema/organization_memberships.js';
import { eq, and, or, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import DataIsolationService from './data-isolation-service.js';
import ApplicationDataIsolationService from './application-data-isolation-service.js';

export class OrganizationService {

  /**
   * Create a new parent organization (at most 1 per tenant)
   */
  async createParentOrganization(data, createdBy) {
    const { name, description, gstin, parentTenantId } = data;

    // Validate input
    this.validateOrganizationData(data);

    // Check if parent tenant exists
    const parentTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, parentTenantId))
      .limit(1);

    if (parentTenant.length === 0) {
      throw new Error('Parent tenant not found');
    }

    // Check if a parent organization already exists for this tenant
    const existingParentOrg = await db
      .select()
      .from(organizations)
      .where(and(
        eq(organizations.tenantId, parentTenantId),
        eq(organizations.organizationType, 'parent'),
        eq(organizations.isActive, true)
      ))
      .limit(1);

    if (existingParentOrg.length > 0) {
      throw new Error('A parent organization already exists for this tenant. Only one parent organization is allowed per tenant.');
    }

    const organizationId = uuidv4();

    // Create organization
    const organization = await db.insert(organizations).values({
      organizationId,
      tenantId: parentTenantId,
      organizationName: name,
      description,
      gstin,
      organizationType: 'parent',
      organizationLevel: 1,
      hierarchyPath: organizationId,
      responsiblePersonId: createdBy,
      isActive: true,
      createdBy,
      createdAt: new Date()
    }).returning();

    return {
      success: true,
      organization: organization[0],
      message: 'Parent organization created successfully'
    };
  }

  /**
   * Get the parent organization for a tenant
   */
  async getParentOrganization(tenantId) {
    const parentOrg = await db
      .select()
      .from(organizations)
      .where(and(
        eq(organizations.tenantId, tenantId),
        eq(organizations.organizationType, 'parent'),
        eq(organizations.isActive, true)
      ))
      .limit(1);

    return parentOrg.length > 0 ? parentOrg[0] : null;
  }

  /**
   * Check if tenant has a parent organization
   */
  async hasParentOrganization(tenantId) {
    const parentOrg = await this.getParentOrganization(tenantId);
    return parentOrg !== null;
  }

  /**
   * Create a sub-organization under a parent organization
   */
  async createSubOrganization(data, createdBy) {
    const { name, description, gstin, parentOrganizationId } = data;

    // Validate input
    this.validateOrganizationData(data);

    // Get parent organization details
    const parentOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.organizationId, parentOrganizationId))
      .limit(1);

    if (parentOrg.length === 0) {
      throw new Error('Parent organization not found');
    }

    const organizationId = uuidv4();
    const hierarchyPath = `${parentOrg[0].hierarchyPath}.${organizationId}`;

    // Create sub-organization
    const organization = await db.insert(organizations).values({
      organizationId,
      tenantId: parentOrg[0].tenantId,
      parentOrganizationId,
      organizationName: name,
      description,
      gstin,
      organizationType: 'sub',
      organizationLevel: parentOrg[0].organizationLevel + 1,
      hierarchyPath,
      responsiblePersonId: createdBy,
      isActive: true,
      createdBy,
      createdAt: new Date()
    }).returning();

    return {
      success: true,
      organization: organization[0],
      message: 'Sub-organization created successfully'
    };
  }

  /**
   * Get organization details with hierarchy
   */
  async getOrganizationDetails(organizationId) {
    try {
      console.log('🔍 Getting organization details for:', organizationId);

      // First, check if organization exists with a simple query
      const orgCheck = await db
        .select({
          organizationId: organizations.organizationId,
          organizationName: organizations.organizationName
        })
        .from(organizations)
        .where(eq(organizations.organizationId, organizationId))
        .limit(1);

      if (!orgCheck || orgCheck.length === 0) {
        throw new Error('Organization not found');
      }

      console.log('✅ Organization exists:', orgCheck[0]);

      // Now get full details
      const organization = await db
        .select()
        .from(organizations)
        .where(eq(organizations.organizationId, organizationId))
        .limit(1);

      console.log('📊 Full organization query result:', organization);

      if (!organization || organization.length === 0) {
        throw new Error('Organization not found');
      }

      const orgData = organization[0];
      console.log('🏢 Organization data:', orgData);

      // Get parent organization details if exists
      let parentOrganization = null;
      if (orgData.parentOrganizationId) {
        console.log('👨‍👩‍👧‍👦 Getting parent organization:', orgData.parentOrganizationId);
        try {
          const parent = await db
            .select({
              organizationId: organizations.organizationId,
              organizationName: organizations.organizationName
            })
            .from(organizations)
            .where(eq(organizations.organizationId, orgData.parentOrganizationId))
            .limit(1);

          if (parent && parent.length > 0) {
            parentOrganization = parent[0];
            console.log('👨‍👩‍👧‍👦 Parent organization found:', parentOrganization);
          }
        } catch (parentError) {
          console.log('⚠️ Could not get parent organization:', parentError.message);
          // Continue without parent organization
        }
      }

      return {
        success: true,
        organization: orgData,
        parentOrganization,
        message: 'Organization details retrieved successfully'
      };
    } catch (error) {
      console.error('❌ Error in getOrganizationDetails:', error);
      throw new Error(`Failed to get organization details: ${error.message}`);
    }
  }

  /**
   * Get all sub-organizations for a parent organization
   */
  async getSubOrganizations(parentOrganizationId) {
    const subOrgs = await db
      .select({
        organizationId: organizations.organizationId,
        organizationName: organizations.organizationName,
        description: organizations.description,
        organizationType: organizations.organizationType,
        organizationLevel: organizations.organizationLevel,
        isActive: organizations.isActive,
        createdAt: organizations.createdAt
      })
      .from(organizations)
      .where(eq(organizations.parentOrganizationId, parentOrganizationId))
      .orderBy(organizations.createdAt);

    return {
      success: true,
      subOrganizations: subOrgs,
      count: subOrgs.length,
      message: 'Sub-organizations retrieved successfully'
    };
  }

  /**
   * Get organization hierarchy tree
   */
  async getOrganizationHierarchy(tenantId, userContext = null, applicationContext = null) {
    let query = db
      .select({
        organizationId: organizations.organizationId,
        parentOrganizationId: organizations.parentOrganizationId,
        organizationName: organizations.organizationName,
        organizationType: organizations.organizationType,
        organizationLevel: organizations.organizationLevel,
        hierarchyPath: organizations.hierarchyPath,
        isActive: organizations.isActive
      })
      .from(organizations)
      .where(eq(organizations.tenantId, tenantId))
      .orderBy(organizations.organizationLevel, organizations.createdAt);

    // Apply data isolation if user context is provided
    if (userContext) {
      let accessibleOrgs = [];

      // If application context is provided, use application-specific filtering
      if (applicationContext?.application) {
        const appAccess = await ApplicationDataIsolationService.getUserApplicationAccess(
          userContext,
          applicationContext.application
        );

        if (!appAccess.hasAccess) {
          return {
            success: true,
            hierarchy: [],
            totalOrganizations: 0,
            message: `User does not have access to ${applicationContext.application} application`
          };
        }

        accessibleOrgs = appAccess.organizations;
      } else {
        // Use regular organizational access
        accessibleOrgs = await DataIsolationService.getUserAccessibleOrganizations(userContext);
      }

      if (accessibleOrgs.length > 0) {
        query = query.where(inArray(organizations.organizationId, accessibleOrgs));
      } else {
        // User has no access to any organizations
        return { success: true, hierarchy: [], totalOrganizations: 0 };
      }
    }

    const allOrgs = await query;

    // Build hierarchy tree
    const hierarchyMap = {};
    const rootOrgs = [];

    // First pass: create all nodes
    allOrgs.forEach(org => {
      hierarchyMap[org.organizationId] = {
        ...org,
        children: []
      };
    });

    // Second pass: build tree structure
    allOrgs.forEach(org => {
      if (org.parentOrganizationId) {
        if (hierarchyMap[org.parentOrganizationId]) {
          hierarchyMap[org.parentOrganizationId].children.push(hierarchyMap[org.organizationId]);
        }
      } else {
        rootOrgs.push(hierarchyMap[org.organizationId]);
      }
    });

    return {
      success: true,
      hierarchy: rootOrgs,
      totalOrganizations: allOrgs.length,
      message: 'Organization hierarchy retrieved successfully'
    };
  }

  /**
   * Move organization to new parent (hierarchy reorganization)
   */
  async moveOrganization(organizationId, newParentId, movedBy) {
    // Validate organization exists
    const organization = await db
      .select()
      .from(organizations)
      .where(eq(organizations.organizationId, organizationId))
      .limit(1);

    if (organization.length === 0) {
      throw new Error('Organization not found');
    }

    const org = organization[0];

    // Validate new parent exists (if provided)
    let newParent = null;
    if (newParentId) {
      const parentCheck = await db
        .select()
        .from(organizations)
        .where(eq(organizations.organizationId, newParentId))
        .limit(1);

      if (parentCheck.length === 0) {
        throw new Error('New parent organization not found');
      }

      newParent = parentCheck[0];

      // Check for circular reference
      if (newParent.hierarchyPath.includes(organizationId)) {
        throw new Error('Cannot move organization to its own descendant (circular reference)');
      }
    }

    // Calculate new hierarchy path and level
    const newHierarchyPath = newParentId
      ? `${newParent.hierarchyPath}.${organizationId}`
      : organizationId;

    const newLevel = newParentId ? newParent.organizationLevel + 1 : 1;

    // Update the organization
    const updatedOrg = await db
      .update(organizations)
      .set({
        parentOrganizationId: newParentId,
        hierarchyPath: newHierarchyPath,
        organizationLevel: newLevel,
        updatedBy: movedBy,
        updatedAt: new Date()
      })
      .where(eq(organizations.organizationId, organizationId))
      .returning();

    // Update hierarchy paths for all descendants
    await this.updateDescendantHierarchyPaths(organizationId, newHierarchyPath, newLevel);

    return {
      success: true,
      organization: updatedOrg[0],
      message: 'Organization moved successfully'
    };
  }

  /**
   * Update hierarchy paths for all descendants after a move
   */
  async updateDescendantHierarchyPaths(parentOrgId, newParentPath, newParentLevel) {
    try {
      console.log('🔄 Updating descendant hierarchy paths for:', parentOrgId);

      // Find all descendants using string contains approach
      const allOrgs = await db
        .select()
        .from(organizations)
        .where(sql`${organizations.hierarchyPath} LIKE ${`%${parentOrgId}%`}`);

      const descendants = allOrgs.filter(org =>
        org.hierarchyPath &&
        org.hierarchyPath.includes(`${parentOrgId}.`) &&
        org.organizationId !== parentOrgId
      );

      console.log('📊 Found descendants:', descendants.length);

      // Update each descendant's hierarchy path and level
      for (const descendant of descendants) {
        const relativePath = descendant.hierarchyPath.replace(`${parentOrgId}.`, '');
        const newPath = `${newParentPath}.${relativePath}`;
        const newLevel = newParentLevel + (descendant.organizationLevel - 1); // Adjust level relative to new parent

        console.log(`🔄 Updating ${descendant.organizationId}: ${descendant.hierarchyPath} → ${newPath}`);

        await db
          .update(organizations)
          .set({
            hierarchyPath: newPath,
            organizationLevel: newLevel,
            updatedAt: new Date()
          })
          .where(eq(organizations.organizationId, descendant.organizationId));
      }

      console.log('✅ Descendant hierarchy paths updated successfully');
    } catch (error) {
      console.error('❌ Error updating descendant hierarchy paths:', error);
      throw error;
    }
  }

  /**
   * Update organization details
   */
  async updateOrganization(organizationId, updateData, updatedBy) {
    const allowedFields = ['organizationName', 'description', 'gstin', 'responsiblePersonId'];

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

    const updatedOrg = await db
      .update(organizations)
      .set(updateFields)
      .where(eq(organizations.organizationId, organizationId))
      .returning();

    if (updatedOrg.length === 0) {
      throw new Error('Organization not found or update failed');
    }

    return {
      success: true,
      organization: updatedOrg[0],
      message: 'Organization updated successfully'
    };
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(organizationId, deletedBy) {
    // Check if organization has sub-organizations
    const subOrgs = await db
      .select({ organizationId: organizations.organizationId })
      .from(organizations)
      .where(eq(organizations.parentOrganizationId, organizationId))
      .limit(1);

    if (subOrgs.length > 0) {
      throw new Error('Cannot delete organization with active sub-organizations');
    }

    const deletedOrg = await db
      .update(organizations)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: deletedBy
      })
      .where(eq(organizations.organizationId, organizationId))
      .returning();

    if (deletedOrg.length === 0) {
      throw new Error('Organization not found');
    }

    return {
      success: true,
      organization: deletedOrg[0],
      message: 'Organization deactivated successfully'
    };
  }

  /**
   * Bulk create organizations
   */
  async bulkCreateOrganizations(organizationData, createdBy) {
    const results = [];
    const errors = [];

    for (const [index, data] of organizationData.entries()) {
      try {
        // Validate data
        this.validateOrganizationData(data);

        const result = await this.createParentOrganization(data, createdBy);
        results.push({
          index,
          success: true,
          data: result.organization
        });
      } catch (error) {
        errors.push({
          index,
          success: false,
          error: error.message,
          data
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalProcessed: organizationData.length,
      successful: results.length,
      failed: errors.length,
      message: `Bulk creation completed: ${results.length} successful, ${errors.length} failed`
    };
  }

  /**
   * Bulk update organizations
   */
  async bulkUpdateOrganizations(updateData, updatedBy) {
    const results = [];
    const errors = [];

    for (const [index, item] of updateData.entries()) {
      try {
        const { organizationId, ...updateFields } = item;

        if (!organizationId) {
          throw new Error('Organization ID is required');
        }

        const result = await this.updateOrganization(organizationId, updateFields, updatedBy);
        results.push({
          index,
          organizationId,
          success: true,
          data: result.organization
        });
      } catch (error) {
        errors.push({
          index,
          organizationId: item.organizationId,
          success: false,
          error: error.message,
          data: item
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalProcessed: updateData.length,
      successful: results.length,
      failed: errors.length,
      message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`
    };
  }

  /**
   * Bulk delete organizations
   */
  async bulkDeleteOrganizations(organizationIds, deletedBy) {
    const results = [];
    const errors = [];

    for (const [index, organizationId] of organizationIds.entries()) {
      try {
        const result = await this.deleteOrganization(organizationId, deletedBy);
        results.push({
          index,
          organizationId,
          success: true,
          data: result.organization
        });
      } catch (error) {
        errors.push({
          index,
          organizationId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalProcessed: organizationIds.length,
      successful: results.length,
      failed: errors.length,
      message: `Bulk deletion completed: ${results.length} successful, ${errors.length} failed`
    };
  }

  /**
   * Validate organization data
   */
  validateOrganizationData(data) {
    const { name, gstin } = data;

    if (!name || name.trim().length < 2) {
      throw new Error('Organization name must be at least 2 characters');
    }

    if (gstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(gstin)) {
        throw new Error('Invalid GSTIN format');
      }
    }
  }
}

export default new OrganizationService();
