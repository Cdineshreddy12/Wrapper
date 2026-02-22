import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TenantService } from '../../../services/tenant-service.js';
import { getUserPermissions } from '../../../middleware/auth/permission-middleware.js';
import { eq, and, gte, desc, count } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { tenantUsers, userRoleAssignments, customRoles, tenants, entities } from '../../../db/schema/index.js';
import ActivityLogger, { ACTIVITY_TYPES } from '../../../services/activityLogger.js';

export default async function userRoutes(
  fastify: FastifyInstance,
  _options?: Record<string, unknown>
): Promise<void> {
  // Get current user profile
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const userContext = request.userContext as { isAuthenticated?: boolean; tenantId?: string; internalUserId?: string; userId?: string; email?: string; name?: string } | undefined;
    if (!userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      console.log('🔍 /me endpoint - userContext:', {
        tenantId: userContext.tenantId,
        internalUserId: userContext.internalUserId,
        kindeUserId: userContext.userId,
        email: userContext.email,
        name: userContext.name
      });

      const [user] = await db
        .select({
          user: tenantUsers,
          role: customRoles,
        })
        .from(tenantUsers)
        .leftJoin(userRoleAssignments, eq(tenantUsers.userId, userRoleAssignments.userId))
        .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(and(
          eq(tenantUsers.tenantId, userContext.tenantId!),
          eq(tenantUsers.userId, userContext.internalUserId!)
        ))
        .limit(1);

      if (!user) {
        console.log('❌ User not found in database');
        return reply.code(404).send({ error: 'User not found' });
      }

      const permissions = await getUserPermissions(
        userContext.internalUserId!,
        userContext.tenantId!
      );

      const response = {
        success: true,
        data: {
          user: {
            ...user.user,
            // Add computed fields
            isAdmin: user.user.isTenantAdmin || false,
            permissions: permissions.modules,
            roles: permissions.roles
          },
          role: user.role,
          kindeUser: {
            id: userContext.userId,
            email: userContext.email,
            name: userContext.name,
            avatar: (userContext as { avatar?: string }).avatar,
          },
          permissions: permissions.modules,
          roles: permissions.roles,
          isAdmin: user.user.isTenantAdmin || false
        },
      };

      console.log('✅ /me endpoint successful');
      return response;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error fetching user profile:', error);
      request.log.error(error, 'Error fetching user profile:');
      return reply.code(500).send({ error: 'Failed to fetch user profile' });
    }
  });

  // Update user profile
  fastify.put('/me', {
    schema: {},
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const uc = request.userContext as { isAuthenticated?: boolean; tenantId?: string; internalUserId?: string } | undefined;
    if (!uc?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const body = request.body as Record<string, unknown>;
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tenantUsers.tenantId, uc.tenantId!),
          eq(tenantUsers.userId, uc.internalUserId!)
        ))
        .returning();

      await ActivityLogger.logActivity(
        uc.internalUserId!,
        uc.tenantId!,
        null,
        ACTIVITY_TYPES.USER_PROFILE_UPDATED,
        {
          updatedFields: Object.keys(body),
          userId: uc.internalUserId,
          userEmail: (uc as { email?: string }).email
        },
        ActivityLogger.createRequestContext(request as unknown as Record<string, unknown>)
      );

      return {
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      };
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error(error, 'Error updating user profile:');
      return reply.code(500).send({ error: 'Failed to update profile' });
    }
  });

  // Complete onboarding
  fastify.post('/me/complete-onboarding', async (request: FastifyRequest, reply: FastifyReply) => {
    const uc = request.userContext as { isAuthenticated?: boolean; tenantId?: string; internalUserId?: string } | undefined;
    if (!uc?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({
          onboardingCompleted: true,
          onboardingStep: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tenantUsers.tenantId, uc.tenantId!),
          eq(tenantUsers.userId, uc.internalUserId!)
        ))
        .returning();

      await ActivityLogger.logActivity(
        uc.internalUserId!,
        uc.tenantId!,
        null,
        ACTIVITY_TYPES.USER_ACTIVATED,
        {
          action: 'onboarding_completed',
          userId: uc.internalUserId,
          userEmail: (uc as { email?: string }).email
        },
        ActivityLogger.createRequestContext(request as unknown as Record<string, unknown>)
      );

      return {
        success: true,
        data: updatedUser,
        message: 'Onboarding completed successfully',
      };
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error(error, 'Error completing onboarding:');
      return reply.code(500).send({ error: 'Failed to complete onboarding' });
    }
  });

  // Get user permissions (separate endpoint for permission checking)
  fastify.get('/me/permissions', async (request: FastifyRequest, reply: FastifyReply) => {
    const uc = request.userContext as { isAuthenticated?: boolean; tenantId?: string; internalUserId?: string } | undefined;
    if (!uc?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const permissions = await getUserPermissions(
        uc.internalUserId!,
        uc.tenantId!
      );

      return {
        success: true,
        data: {
          permissions: permissions.modules,
          roles: permissions.roles,
          isAdmin: request.userContext.isTenantAdmin || false
        }
      };
    } catch (error) {
      request.log.error(error, 'Error fetching user permissions:');
      return reply.code(500).send({ error: 'Failed to fetch permissions' });
    }
  });

  // CRM Integration: User Tenant Verification
  fastify.get('/tenant/:email', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string | string[]>;
      const email = params.email;

      console.log('🔍 CRM Tenant Verification for email:', email);

      const uc = request.userContext as { isAuthenticated?: boolean } | undefined;
      if (!uc?.isAuthenticated) {
        console.log('❌ Authentication failed');
        return reply.code(401).send({
          success: false,
          message: 'Authentication failed'
        });
      }

      // Check if request comes from CRM or Operations backend
      const requestSource = request.headers['x-request-source'];
      const allowedSources = ['crm-backend', 'operations-backend', 'operations-tenant-sync'];
      const sourceStr: string = Array.isArray(requestSource) ? (requestSource[0] ?? '') : (requestSource ?? '');
      if (!sourceStr || !allowedSources.includes(sourceStr)) {
        console.log('❌ Invalid request source:', requestSource);
        return reply.code(403).send({
          success: false,
          message: 'Access restricted to CRM backend'
        });
      }

      console.log('✅ Authentication passed, proceeding with query');

      try {
        console.log('🔍 Executing database query for email:', email);
        // Find user by email across all tenants
        const emailStr = typeof email === 'string' ? email : Array.isArray(email) ? (email[0] ?? '') : '';
        const [user] = await db
          .select({
            userId: tenantUsers.userId,
            tenantId: tenantUsers.tenantId,
            email: tenantUsers.email,
            name: tenantUsers.name,
            firstName: tenantUsers.firstName,
            lastName: tenantUsers.lastName,
            isActive: tenantUsers.isActive,
            tenantName: tenants.companyName,
            tenantIsActive: tenants.isActive
          })
          .from(tenantUsers)
          .innerJoin(
            tenants,
            eq(tenantUsers.tenantId, tenants.tenantId)
          )
          .where(and(
            eq(tenantUsers.email, emailStr as string),
            eq(tenantUsers.isActive, true),
            eq(tenants.isActive, true)
          ))
          .limit(1);

        console.log('✅ Database query completed, user found:', !!user);

        if (!user) {
          console.log('ℹ️ User not found or inactive:', email);
          // CRM expects 200 OK with null data for "no tenant assigned"
          return reply.send({
            success: true,
            data: null
          });
        }

        console.log('🔍 Getting organization details for tenant:', user.tenantId);
        // Get organization details (assuming first organization for the tenant)
        const [org] = await db
          .select({
            orgCode: entities.entityCode,
            orgName: entities.entityName
          })
          .from(entities)
          .where(and(
            eq(entities.tenantId, user.tenantId),
            eq(entities.entityType, 'organization'),
            eq(entities.isActive, true)
          ))
          .limit(1);

        console.log('✅ Organization query completed, org found:', !!org);

        const response = {
          success: true,
          data: {
            tenantId: user.tenantId,
            userId: user.userId,
            entityId: org?.orgCode || `tenant_${user.tenantId}`, // Maps to orgCode in CRM
            tenantName: user.tenantName,
            organization: {
              orgName: org?.orgName || user.tenantName
            },
            tenantIsActive: user.tenantIsActive,
            userIsActive: user.isActive
          }
        };

        console.log('✅ CRM Tenant Verification success:', response.data);
        return reply.send(response);

      } catch (dbErr: unknown) {
        console.error('❌ Database error in CRM Tenant Verification:', dbErr);
        return reply.code(500).send({
          success: false,
          message: 'Database error'
        });
      }

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ CRM Tenant Verification failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // CRM Sync endpoints using WrapperSyncService
  fastify.post('/tenant/:tenantId/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const { tenantId } = params;
      const body = (request.body as Record<string, unknown>) || {};
      const { skipReferenceData = false, forceSync = false } = body;

      console.log('🔄 Triggering tenant sync via WrapperSyncService:', { tenantId, skipReferenceData, forceSync });

      const { WrapperSyncService } = await import('../../app-sync/services/sync-service.js');

      const syncResults = await WrapperSyncService.triggerTenantSync(tenantId, {
        skipReferenceData: skipReferenceData as boolean,
        forceSync: forceSync as boolean,
        requestedBy: (request.userContext as { userId?: string })?.userId || 'system'
      });

      return reply.send({
        success: true,
        data: syncResults
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Tenant sync failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Tenant sync failed',
        error: error.message
      });
    }
  });

  fastify.get('/tenant/:tenantId/sync-status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const { tenantId } = params;

      console.log('📊 Getting sync status for tenant:', tenantId);

      const { WrapperSyncService } = await import('../../app-sync/services/sync-service.js');

      const syncStatus = await WrapperSyncService.getSyncStatus(tenantId);

      return reply.send({
        success: true,
        data: syncStatus
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to get sync status:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get sync status',
        error: error.message
      });
    }
  });

  fastify.get('/sync/data-requirements', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('📋 Getting data requirements specification');

      const { WrapperSyncService } = await import('../../app-sync/services/sync-service.js');

      const requirements = WrapperSyncService.getDataRequirements();

      return reply.send({
        success: true,
        data: requirements
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to get data requirements:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get data requirements',
        error: error.message
      });
    }
  });
} 