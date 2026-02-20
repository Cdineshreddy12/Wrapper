/**
 * Application-Level Data Isolation Service
 * Extends multi-level isolation to include application-specific data segregation
 */

import { db } from '../db/index.js';
import { entities } from '../db/schema/organizations/unified-entities.js';
import { tenantUsers } from '../db/schema/core/users.js';
import { organizationMemberships } from '../db/schema/organizations/organization_memberships.js';
import { eq, and } from 'drizzle-orm';

export interface UserContext { userId: string; internalUserId?: string | null; tenantId: string | null; roles?: string[] }

export class ApplicationDataIsolationService {

  /**
   * Application definitions for the business suite
   */
  static APPLICATIONS = {
    CRM: 'crm',
    HR: 'hr',
    FINANCE: 'finance',
    SALES: 'sales',
    MARKETING: 'marketing',
    INVENTORY: 'inventory',
    PROJECTS: 'projects',
    ANALYTICS: 'analytics'
  };

  /**
   * Application-specific permission levels
   */
  static PERMISSION_LEVELS = {
    NONE: 0,
    VIEWER: 1,
    EDITOR: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4
  };

  /**
   * Get user's accessible data for a specific application
   */
  async getUserApplicationAccess(userContext: UserContext, application: string): Promise<Record<string, unknown>> {
    const { userId, internalUserId, tenantId } = userContext;
    if (!tenantId) {
      return { hasAccess: false, entities: [], permissions: ApplicationDataIsolationService.PERMISSION_LEVELS.NONE, application, scope: { entityCount: 0, orgCount: 0, locationCount: 0 } };
    }
    // Get user's application-specific permissions
    const appPermissions = await this.getUserApplicationPermissions(internalUserId || userId, application);

    if (!appPermissions || appPermissions.permissionLevel === ApplicationDataIsolationService.PERMISSION_LEVELS.NONE) {
      return {
        hasAccess: false,
        entities: [],
        permissions: ApplicationDataIsolationService.PERMISSION_LEVELS.NONE
      };
    }

    // Get application-specific accessible organizations
    const accessibleOrgs = await this.getUserAccessibleOrganizationsForApp(
      userContext,
      application,
      appPermissions
    );

    // Get application-specific accessible locations
    const accessibleLocations = await this.getUserAccessibleLocationsForApp(
      userContext,
      application,
      accessibleOrgs,
      appPermissions
    );

    return {
      hasAccess: true,
      entities: [...accessibleOrgs, ...accessibleLocations],
      permissions: appPermissions.permissionLevel,
      application: application,
      scope: {
        entityCount: accessibleOrgs.length + accessibleLocations.length,
        orgCount: accessibleOrgs.length,
        locationCount: accessibleLocations.length
      }
    };
  }

  /**
   * Get user's permissions for a specific application
   */
  async getUserApplicationPermissions(userId: string, application: string): Promise<Record<string, unknown>> {
    // In a real implementation, this would query an application_permissions table
    // For now, we'll simulate based on user roles and application

    // userId here should already be the internal user ID
    const userInfo = await db
      .select({ isTenantAdmin: tenantUsers.isTenantAdmin })
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId))
      .limit(1);

    // Simulate application-specific permissions based on user admin status
    if (userInfo[0]?.isTenantAdmin) {
      return {
        permissionLevel: ApplicationDataIsolationService.PERMISSION_LEVELS.SUPER_ADMIN,
        canAccessAllData: true,
        canManageUsers: true,
        canConfigureApp: true
      };
    }

    // Default permissions for regular users (in production, this would be stored in DB)
    return {
      permissionLevel: ApplicationDataIsolationService.PERMISSION_LEVELS.EDITOR,
      canAccessAllData: false,
      canManageUsers: false,
      canConfigureApp: false
    };
  }

  /**
   * Get user's accessible organizations for a specific application
   */
  async getUserAccessibleOrganizationsForApp(userContext: UserContext, application: string, appPermissions: Record<string, unknown>): Promise<string[]> {
    const { userId, internalUserId, tenantId } = userContext;
    if (!tenantId) return [];
    // If user has super admin permissions for this app, they can access all organizations
    if ((appPermissions.permissionLevel as number) >= ApplicationDataIsolationService.PERMISSION_LEVELS.SUPER_ADMIN) {
      const allOrgs = await db
        .select({ organizationId: entities.entityId })
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.entityType, 'organization')
        ));

      return allOrgs.map(org => org.organizationId);
    }

    // Get user's direct organization memberships from organization_memberships table
    const userMemberships = await db
      .select({
        organizationId: organizationMemberships.entityId,
        membershipType: organizationMemberships.membershipType,
        membershipStatus: organizationMemberships.membershipStatus
      })
      .from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.userId, internalUserId || userId), // Use internalUserId if available
        eq(organizationMemberships.entityType, 'organization'),
        eq(organizationMemberships.membershipStatus, 'active')
      ));

    const directOrgIds = userMemberships.map(m => m.organizationId).filter(id => id != null);

    // For application-specific access, we might have different permissions per org per app
    // For now, we'll use the same hierarchy logic but could be extended

    const accessibleOrgs = new Set(directOrgIds);

    // Add parent organizations (users can see their org's parent)
    for (const orgId of directOrgIds) {
      const org = await db
        .select({ parentEntityId: entities.parentEntityId })
        .from(entities)
        .where(and(
          eq(entities.entityId, orgId),
          eq(entities.entityType, 'organization')
        ))
        .limit(1);

      if (org[0]?.parentEntityId) {
        accessibleOrgs.add(org[0].parentEntityId);
      }
    }

    // Add child organizations (users can see their org's children)
    for (const orgId of directOrgIds) {
      const children = await db
        .select({ organizationId: entities.entityId })
        .from(entities)
        .where(and(
          eq(entities.parentEntityId, orgId),
          eq(entities.entityType, 'organization')
        ));

      children.forEach(child => accessibleOrgs.add(child.organizationId));
    }

    return Array.from(accessibleOrgs);
  }

  /**
   * Get user's accessible locations for a specific application
   */
  async getUserAccessibleLocationsForApp(userContext: UserContext, application: string, accessibleOrgs: string[], _appPermissions: Record<string, unknown>): Promise<string[]> {
    if (!accessibleOrgs || accessibleOrgs.length === 0 || !userContext.tenantId) {
      return [];
    }
    const tenantId = userContext.tenantId;
    let locationQuery = db
      .select({ locationId: entities.entityId })
      .from(entities)
      .where(and(
        eq(entities.tenantId, tenantId),
        eq(entities.entityType, 'location')
      ));

    // Apply application-specific filtering
    if (application === ApplicationDataIsolationService.APPLICATIONS.HR) {
      // HR can access all locations (for employee management)
      // No additional filtering needed
    } else if (application === ApplicationDataIsolationService.APPLICATIONS.FINANCE) {
      // Finance might only need access to HQ and regional offices
      // This could be extended with location types or tags
    } else if (application === ApplicationDataIsolationService.APPLICATIONS.CRM) {
      // CRM might need access to customer-facing locations
    }

    const locationResults = await locationQuery;
    return locationResults.map(result => result.locationId);
  }

  /**
   * Check if user has access to specific data in an application
   */
  async canAccessDataInApplication(userContext: UserContext, application: string, dataType: string, dataId: string): Promise<boolean> {
    try {
      const appAccess = await this.getUserApplicationAccess(userContext, application) as { hasAccess: boolean; entities: string[] };
      if (!appAccess.hasAccess) return false;
      switch (dataType) {
        case 'organization':
        case 'location':
          return (appAccess.entities as string[]).includes(dataId);
        case 'user':
          // Users can typically access other users in their accessible organizations
          return true; // This could be more restrictive
        default:
          return false;
      }
    } catch (err: unknown) {
      console.error('❌ Error in canAccessDataInApplication:', err);
      return false;
    }
  }

  /**
   * Filter data based on application and user context
   */
  async filterDataByApplication(data: Record<string, unknown> | Record<string, unknown>[], userContext: UserContext, application: string, dataType = 'organization'): Promise<Record<string, unknown>[] | Record<string, unknown> | null> {
    try {
      const appAccess = await this.getUserApplicationAccess(userContext, application) as { hasAccess: boolean; entities: string[] };
      if (!appAccess.hasAccess) return Array.isArray(data) ? [] : null;
      if (Array.isArray(data)) {
        return data.filter(item => {
          const itemId = (item as Record<string, unknown>).organizationId ?? (item as Record<string, unknown>).locationId ?? (item as Record<string, unknown>).userId;
          return typeof itemId === 'string' && (appAccess.entities as string[]).includes(itemId);
        });
      }
      const itemId = (data as Record<string, unknown>).organizationId ?? (data as Record<string, unknown>).locationId ?? (data as Record<string, unknown>).userId;
      const canAccess = typeof itemId === 'string' && (appAccess.entities as string[]).includes(itemId);

      return canAccess ? data : null;
    } catch (err: unknown) {
      console.error('❌ Error in filterDataByApplication:', err);
      return Array.isArray(data) ? [] : null;
    }
  }

  /**
   * Get user's complete access profile across all applications
   */
  async getUserCompleteAccessProfile(userContext: UserContext): Promise<Record<string, unknown>> {
    const profile: Record<string, unknown> = {
      userId: userContext.userId,
      tenantId: userContext.tenantId,
      applications: {} as Record<string, unknown>
    };

    for (const [appName, appCode] of Object.entries(ApplicationDataIsolationService.APPLICATIONS)) {
      try {
        const appAccess = await this.getUserApplicationAccess(userContext, appCode) as { hasAccess: boolean; permissions: number; scope?: { orgCount?: number; locationCount?: number } };
        (profile.applications as Record<string, unknown>)[appCode] = {
          name: appName,
          hasAccess: appAccess.hasAccess,
          permissionLevel: appAccess.permissions,
          organizationCount: appAccess.scope?.orgCount || 0,
          locationCount: appAccess.scope?.locationCount || 0
        };
      } catch (err: unknown) {
        const error = err as Error;
        (profile.applications as Record<string, unknown>)[appCode] = {
          name: appName,
          hasAccess: false,
          error: error.message
        };
      }
    }
    return profile;
  }

  /**
   * Validate cross-application data sharing
   */
  async canShareDataBetweenApplications(userContext: UserContext, sourceApp: string, targetApp: string, dataType: string, dataId: string): Promise<boolean> {
    // Check if user has access to the data in source application
    const sourceAccess = await this.canAccessDataInApplication(userContext, sourceApp, dataType, dataId);
    if (!sourceAccess) {
      return false;
    }

    // Check if user has appropriate permissions in target application
    const targetAccess = await this.getUserApplicationAccess(userContext, targetApp) as { hasAccess: boolean };
    if (!targetAccess.hasAccess) return false;

    const sharingRules: Record<string, string[]> = {
      'hr-finance': ['user', 'organization'],
      'hr-crm': ['user'],
      'finance-sales': ['organization'],
      'crm-sales': ['user', 'organization']
    };
    const ruleKey = `${sourceApp}-${targetApp}`;
    const allowedDataTypes = sharingRules[ruleKey] ?? [];

    return allowedDataTypes.includes(dataType);
  }
}

// Export default instance (class is already exported above)
export default new ApplicationDataIsolationService();
