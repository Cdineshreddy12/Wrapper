/**
 * Organization Routes - RESTful API endpoints for organization management
 * Follows SOLID principles with clear separation of concerns
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import OrganizationService from '../services/organization-service.js';
import LocationService from '../services/location-service.js';
import { authenticateToken } from '../../../middleware/auth/auth.js';
import {
  validateOrganizationCreation,
  validateOrganizationUpdate,
  sanitizeInput
} from '../../../middleware/validation/validation.js';
import {
  enforceOrganizationAccess,
  addUserAccessContext
} from '../../../middleware/security/data-isolation.js';
import {
  enforceApplicationAccess,
  addApplicationDataFiltering,
  validateApplicationExists
} from '../../../middleware/security/application-isolation.js';
import { setupDatabaseConnection } from '../../../middleware/auth/auth.js';

export default async function organizationRoutes(
  fastify: FastifyInstance,
  _options?: Record<string, unknown>
): Promise<void> {

  // Apply authentication and data isolation to all routes except public ones
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip authentication for public routes that don't require it
    const publicRoutes = [
      'GET /api/organizations/hierarchy',   // Allow hierarchy viewing with fallback auth
      'GET /api/organizations/parent',      // Allow parent organization viewing with fallback auth
      'POST /api/organizations/parent',     // Allow parent organization creation with fallback auth
      'POST /api/organizations/sub',        // Allow sub-organization creation with fallback auth
      'POST /api/organizations/bulk',       // Allow bulk organization creation with fallback auth
    ];

    const routeKey = `${request.method} ${request.url}`;

    const isPublic = publicRoutes.some(route => {
      const routeParts = route.split(' ');
      const method = routeParts[0];
      const path = routeParts[1];
      // Skip public route check for /current routes - they handle their own auth
      if (request.url.endsWith('/current')) {
        return false;
      }
      return request.method === method && request.url.includes(path);
    });

    if (!isPublic) {
      // First authenticate the user
      await authenticateToken(request, reply);

      // Then apply data isolation context
      if (request.userContext) {
        await addUserAccessContext()(request, reply);
      }

      // Apply application-level isolation
      await validateApplicationExists()(request, reply);
      await enforceApplicationAccess()(request, reply);
      await addApplicationDataFiltering()(request, reply);
    } else {
      // For public routes, just set up database connection
      await setupDatabaseConnection(request);
    }
  });

  // Create parent organization
  fastify.post('/parent', {
    schema: {
      description: 'Create a new parent organization'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      let userId = (request as any).userContext?.userId;

      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c';
      }

      const sanitizedData = sanitizeInput(body) as any;
      const result = await OrganizationService.createParentOrganization(sanitizedData, userId ?? '');

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Create parent organization failed:', error);

      if (error.message.includes('GSTIN')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid GSTIN',
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Tenant not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Creation failed',
        message: 'Failed to create parent organization'
      });
    }
  });

  // Create sub-organization
  fastify.post('/sub', {
    schema: {
      description: 'Create a sub-organization under a parent organization'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      let userId = (request as any).userContext?.userId;

      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '3a9b3f2c-e335-4c3e-956f-be5341ef38eb';
      }

      const sanitizedData = sanitizeInput(body) as any;
      const result = await OrganizationService.createSubOrganization(sanitizedData, userId ?? '');

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Create sub-organization failed:', error);

      if (error.message.includes('GSTIN')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid GSTIN',
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Creation failed',
        message: 'Failed to create sub-organization'
      });
    }
  });

  // Get organization details
  fastify.get('/:organizationId', {
    preHandler: [enforceOrganizationAccess()],
    schema: {
      description: 'Get organization details with hierarchy information'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const organizationId = (params as any).organizationId ?? '';
      const result = await OrganizationService.getOrganizationDetails(organizationId);

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Get organization details failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get organization details'
      });
    }
  });

  // Get sub-organizations
  fastify.get('/:organizationId/sub-organizations', {
    schema: {
      description: 'Get all sub-organizations for a parent organization'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const organizationId = (params as any).organizationId ?? '';
      const result = await OrganizationService.getSubOrganizations(organizationId);

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Get sub-organizations failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get sub-organizations'
      });
    }
  });

  // Get parent organization for tenant
  fastify.get('/parent/:tenantId', {
    preHandler: [
      authenticateToken,
      addUserAccessContext(),
      validateApplicationExists(),
      enforceApplicationAccess(),
      addApplicationDataFiltering()
    ],
    schema: {
      description: 'Get parent organization for a tenant'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const tenantId = (params as any).tenantId ?? '';

      const organization = await OrganizationService.getParentOrganization(tenantId);

      if (organization) {
        return {
          success: true,
          organization: organization,
          message: 'Parent organization retrieved successfully'
        };
      } else {
        return {
          success: false,
          organization: null,
          message: 'No parent organization found for this tenant'
        };
      }
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to retrieve parent organization'
      });
    }
  });

  // Get organization hierarchy for current tenant
  fastify.get('/hierarchy/current', {
    preHandler: [authenticateToken, addUserAccessContext(), validateApplicationExists(), enforceApplicationAccess(), addApplicationDataFiltering()],
    schema: {
      description: 'Get complete organization hierarchy for the current tenant'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const userContext = (request as any).userContext;
      const tenantId = userContext?.tenantId ?? '';
      const result = await OrganizationService.getOrganizationHierarchy(
        tenantId,
        userContext as any,
        (request as any).applicationContext
      );

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Get organization hierarchy failed:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ User context:', (request as any).userContext);
      console.error('❌ Tenant ID:', (request as any).userContext?.tenantId);
      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get organization hierarchy'
      });
    }
  });

  // Get organization hierarchy
  fastify.get('/hierarchy/:tenantId', {
    preHandler: [
      authenticateToken,
      addUserAccessContext(),
      validateApplicationExists(),
      enforceApplicationAccess(),
      addApplicationDataFiltering()
    ],
    schema: {
      description: 'Get complete organization hierarchy for a tenant'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    let tenantId = (params as any).tenantId ?? '';
    const userContext = (request as any).userContext;
    try {
      if (tenantId === 'current') {
        if (userContext?.tenantId) {
          tenantId = userContext.tenantId;
        } else if (userContext?.internalUserId) {
          try {
            const { tenantUsers } = await import('../../../db/schema/index.js');
            const { eq } = await import('drizzle-orm');
            const { db } = await import('../../../db/index.js');

            const [userRecord] = await db
              .select({ tenantId: tenantUsers.tenantId })
              .from(tenantUsers)
              .where(eq(tenantUsers.userId, userContext.internalUserId))
              .limit(1);

            if (userRecord?.tenantId) {
              tenantId = userRecord.tenantId;
              console.log('✅ Found tenantId from user record:', tenantId);
            } else {
              return reply.code(400).send({
                success: false,
                error: 'Invalid tenant',
                message: 'Cannot determine current tenant - user not associated with any tenant'
              });
            }
          } catch (dbError: unknown) {
            const dbErr = dbError as Error;
            console.error('❌ Error looking up tenantId from user record:', dbErr);
            return reply.code(500).send({
              success: false,
              error: 'Database error',
              message: 'Failed to determine user tenant'
            });
          }
        } else {
          console.log('❌ Cannot determine tenantId for current user:', {
            hasUserContext: !!userContext,
            userContextKeys: userContext ? Object.keys(userContext) : [],
            internalUserId: userContext?.internalUserId,
            tenantId: userContext?.tenantId,
            isAuthenticated: (userContext as any)?.isAuthenticated
          });

          return reply.code(400).send({
            success: false,
            error: 'Invalid tenant',
            message: 'Cannot determine current tenant - user authentication context incomplete',
            debug: {
              hasUserContext: !!userContext,
              isAuthenticated: (userContext as any)?.isAuthenticated,
              hasInternalUserId: !!userContext?.internalUserId,
              hasTenantId: !!userContext?.tenantId
            }
          });
        }
      }

      const result = await OrganizationService.getOrganizationHierarchy(
        tenantId,
        userContext as any,
        (request as any).applicationContext
      );

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Get organization hierarchy failed:', error);

      try {
        console.log('Falling back to simple organization query...');
        const { db } = await import('../../../db/index.js');
        const { entities } = await import('../../../db/schema/index.js');
        const { eq } = await import('drizzle-orm');

        const finalTenantId = userContext?.tenantId || tenantId;

        const organizations = await db
          .select({
            organizationId: entities.entityId,
            organizationName: entities.entityName,
            organizationType: entities.organizationType,
            organizationLevel: entities.entityLevel,
            hierarchyPath: entities.hierarchyPath,
            description: entities.description,
            isActive: entities.isActive,
            createdAt: entities.createdAt,
            updatedAt: entities.updatedAt,
            parentOrganizationId: entities.parentEntityId
          })
          .from(entities)
          .where(eq(entities.tenantId, finalTenantId))
          .orderBy(entities.entityLevel, entities.entityName);

        return reply.send({
          success: true,
          hierarchy: organizations as any,
          totalOrganizations: organizations.length,
          message: 'Organization hierarchy retrieved (fallback method)'
        });
      } catch (fallbackErr: unknown) {
        const fallbackError = fallbackErr as Error;
        console.error('❌ Fallback hierarchy query also failed:', fallbackError);
        return reply.code(500).send({
          success: false,
          error: 'Retrieval failed',
          message: 'Failed to get organization hierarchy'
        });
      }
    }
  });

  // Update organization
  fastify.put('/:organizationId', {
    preHandler: [enforceOrganizationAccess(), validateOrganizationUpdate],
    schema: {
      description: 'Update organization details'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const organizationId = (params as any).organizationId ?? '';
      const ctx = (request as any).userContext;
      const dbUserId = (ctx?.internalUserId || ctx?.userId) ?? '';
      const result = await OrganizationService.updateOrganization(organizationId, body as any, dbUserId);

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Update organization failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Update failed',
        message: 'Failed to update organization'
      });
    }
  });

  // Get organization locations
  fastify.get('/:organizationId/locations', {
    schema: {
      description: 'Get all locations for an organization'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const organizationId = (params as any).organizationId ?? '';
      const result = await LocationService.getLocationsByOrganization(organizationId);

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Get organization locations failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Retrieval failed',
        message: 'Failed to get organization locations'
      });
    }
  });

  // Move organization to new parent
  fastify.patch('/:organizationId/move', {
    schema: {
      description: 'Move organization to a new parent (reorganize hierarchy)'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const organizationId = (params as any).organizationId ?? '';
      const newParentId = (body as any).newParentId ?? '';

      let userId = (request as any).userContext?.userId;
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c';
      }

      const result = await OrganizationService.moveOrganization(organizationId, newParentId, userId ?? '');

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Move organization failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Not found',
          message: error.message
        });
      }

      if (error.message.includes('circular reference')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid operation',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Move failed',
        message: 'Failed to move organization'
      });
    }
  });

  // Bulk create organizations
  fastify.post('/bulk', {
    schema: {
      description: 'Bulk create organizations'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const organizations = (body as any).organizations as any[] | undefined;
      let userId = (request as any).userContext?.userId;
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c';
      }

      const sanitizedData = (organizations ?? []).map((org: any) => sanitizeInput(org) as any);
      const result = await OrganizationService.bulkCreateOrganizations(sanitizedData, userId ?? '');

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Bulk create organizations failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Bulk creation failed',
        message: 'Failed to process bulk organization creation'
      });
    }
  });

  // Bulk update organizations
  fastify.put('/bulk', {
    schema: {
      description: 'Bulk update organizations'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const updates = (body as any).updates as any[] | undefined;
      let userId = (request as any).userContext?.userId;
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c';
      }

      const sanitizedData = (updates ?? []).map((update: any) => sanitizeInput(update) as any);
      const result = await OrganizationService.bulkUpdateOrganizations(sanitizedData, userId ?? '');

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Bulk update organizations failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Bulk update failed',
        message: 'Failed to process bulk organization updates'
      });
    }
  });

  // Bulk delete organizations
  fastify.delete('/bulk', {
    schema: {
      description: 'Bulk delete organizations'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const organizationIds = (body as any).organizationIds as string[] | undefined;
      let userId = (request as any).userContext?.userId;
      if (!userId) {
        console.log('⚠️ No authentication context, using fallback user for testing');
        userId = '50d4f694-202f-4f27-943d-7aafeffee29c';
      }

      const result = await OrganizationService.bulkDeleteOrganizations(organizationIds ?? [], userId ?? '');

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Bulk delete organizations failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Bulk deletion failed',
        message: 'Failed to process bulk organization deletions'
      });
    }
  });

  // Delete organization (soft delete)
  fastify.delete('/:organizationId', {
    schema: {
      description: 'Delete organization (soft delete)'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const organizationId = (params as any).organizationId ?? '';
      const userId = (request as any).userContext?.userId ?? '';
      const result = await OrganizationService.deleteOrganization(organizationId, userId);

      return reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Delete organization failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: error.message
        });
      }

      if (error.message.includes('sub-organizations')) {
        return reply.code(400).send({
          success: false,
          error: 'Cannot delete',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Deletion failed',
        message: 'Failed to delete organization'
      });
    }
  });
}
