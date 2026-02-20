/**
 * Data Isolation Middleware
 * Enforces multi-level data isolation based on user permissions
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserContext } from '../../types/common.js';
import DataIsolationService from '../../services/data-isolation-service.js';

export class DataIsolationMiddleware {

  /**
   * Middleware to enforce organization-level data isolation
   */
  static enforceOrganizationAccess() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userContext } = request;
        if (!userContext) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'User context not found'
          });
        }

        // For organization-specific routes, check access
        const params = request.params as { organizationId?: string } | undefined;
        const body = request.body as { organizationId?: string } | undefined;
        const organizationId = params?.organizationId ?? body?.organizationId;

        if (organizationId) {
          const hasAccess = await DataIsolationService.canAccessOrganization(userContext, organizationId);

          if (!hasAccess) {
            return reply.code(403).send({
              success: false,
              error: 'Forbidden',
              message: 'You do not have access to this organization'
            });
          }
        }

        // For list routes, we'll filter in the service layer
        request.userAccessScope = await DataIsolationService.getUserAccessScope(userContext);

      } catch (error) {
        console.error('❌ Data isolation middleware error:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to verify data access permissions'
        });
      }
    };
  }

  /**
   * Middleware to enforce location-level data isolation
   */
  static enforceLocationAccess() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userContext } = request;
        if (!userContext) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'User context not found'
          });
        }

        // For location-specific routes, check access
        const locParams = request.params as { locationId?: string } | undefined;
        const locBody = request.body as { locationId?: string } | undefined;
        const locationId = locParams?.locationId ?? locBody?.locationId;

        if (locationId) {
          const hasAccess = await DataIsolationService.canAccessLocation(userContext, locationId);

          if (!hasAccess) {
            return reply.code(403).send({
              success: false,
              error: 'Forbidden',
              message: 'You do not have access to this location'
            });
          }
        }

      } catch (error) {
        console.error('❌ Location isolation middleware error:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to verify location access permissions'
        });
      }
    };
  }

  /**
   * Middleware to add user access context to all requests
   */
  static addUserAccessContext() {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      try {
        const { userContext } = request;
        if (userContext) {
          request.userAccessScope = await DataIsolationService.getUserAccessScope(userContext);
        }
      } catch (error) {
        console.error('❌ User access context error:', error);
        // Don't fail the request, just log the error
      }
    };
  }

  /**
   * Helper function to filter organization data
   */
  static async filterOrganizationData(data: unknown | unknown[], userContext: UserContext) {
    if (Array.isArray(data)) {
      return await DataIsolationService.filterOrganizationsByAccess(data, userContext);
    }

    // For single organization objects
    const hasAccess = await DataIsolationService.canAccessOrganization(userContext, (data as { organizationId: string }).organizationId);
    return hasAccess ? data : null;
  }

  /**
   * Helper function to filter location data
   */
  static async filterLocationData(data: unknown | unknown[], userContext: UserContext) {
    if (Array.isArray(data)) {
      return await DataIsolationService.filterLocationsByAccess(data, userContext);
    }

    // For single location objects
    const hasAccess = await DataIsolationService.canAccessLocation(userContext, (data as { locationId: string }).locationId);
    return hasAccess ? data : null;
  }
}

// Export middleware functions
export const enforceOrganizationAccess = DataIsolationMiddleware.enforceOrganizationAccess;
export const enforceLocationAccess = DataIsolationMiddleware.enforceLocationAccess;
export const addUserAccessContext = DataIsolationMiddleware.addUserAccessContext;

// Export helper functions
export const filterOrganizationData = DataIsolationMiddleware.filterOrganizationData;
export const filterLocationData = DataIsolationMiddleware.filterLocationData;
