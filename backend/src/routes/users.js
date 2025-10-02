import { TenantService } from '../services/tenant-service.js';
import { getUserPermissions } from '../middleware/permission-middleware.js';
import { eq, and, gte, desc, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tenantUsers, userRoleAssignments, customRoles } from '../db/schema/index.js';
import ActivityLogger, { ACTIVITY_TYPES, RESOURCE_TYPES } from '../services/activityLogger.js';

export default async function userRoutes(fastify, options) {
  // Get current user profile
  fastify.get('/me', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      console.log('🔍 /me endpoint - userContext:', {
        tenantId: request.userContext.tenantId,
        internalUserId: request.userContext.internalUserId,
        kindeUserId: request.userContext.userId,
        email: request.userContext.email,
        name: request.userContext.name
      });

      // Get user details from database using internal user ID and tenant ID
      const [user] = await db
        .select({
          user: tenantUsers,
          role: customRoles,
        })
        .from(tenantUsers)
        .leftJoin(userRoleAssignments, eq(tenantUsers.userId, userRoleAssignments.userId))
        .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(and(
          eq(tenantUsers.tenantId, request.userContext.tenantId),
          eq(tenantUsers.userId, request.userContext.internalUserId)
        ))
        .limit(1);

      if (!user) {
        console.log('❌ User not found in database');
        return reply.code(404).send({ error: 'User not found' });
      }

      // Get user permissions
      const permissions = await getUserPermissions(
        request.userContext.internalUserId,
        request.userContext.tenantId
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
            id: request.userContext.userId,
            email: request.userContext.email,
            name: request.userContext.name,
            avatar: request.userContext.avatar,
          },
          permissions: permissions.modules,
          roles: permissions.roles,
          isAdmin: user.user.isTenantAdmin || false
        },
      };

      console.log('✅ /me endpoint successful');
      return response;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      request.log.error('Error fetching user profile:', error);
      return reply.code(500).send({ error: 'Failed to fetch user profile' });
    }
  });

  // Update user profile
  fastify.put('/me', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          title: { type: 'string', maxLength: 100 },
          department: { type: 'string', maxLength: 100 },
          preferences: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({
          ...request.body,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tenantUsers.tenantId, request.userContext.tenantId),
          eq(tenantUsers.userId, request.userContext.internalUserId)
        ))
        .returning();

      // Log profile update activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        request.userContext.tenantId,
        null,
        ACTIVITY_TYPES.USER_PROFILE_UPDATED,
        {
          updatedFields: Object.keys(request.body),
          userId: request.userContext.internalUserId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      request.log.error('Error updating user profile:', error);
      return reply.code(500).send({ error: 'Failed to update profile' });
    }
  });

  // Get user activity log
  fastify.get('/me/activity', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          days: { type: 'integer', minimum: 1, maximum: 90, default: 30 },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const { page, limit, days } = request.query;
      const offset = (page - 1) * limit;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get usage logs for this user
      const { usageLogs } = await import('../db/schema/index.js');
      
      const logs = await db
        .select()
        .from(usageLogs)
        .where(and(
          eq(usageLogs.tenantId, request.userContext.tenantId),
          eq(usageLogs.userId, request.userContext.internalUserId),
          gte(usageLogs.createdAt, startDate)
        ))
        .orderBy(desc(usageLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(usageLogs)
        .where(and(
          eq(usageLogs.tenantId, request.userContext.tenantId),
          eq(usageLogs.userId, request.userContext.internalUserId),
          gte(usageLogs.createdAt, startDate)
        ));

      return {
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
          },
        },
      };
    } catch (error) {
      request.log.error('Error fetching user activity:', error);
      return reply.code(500).send({ error: 'Failed to fetch activity' });
    }
  });

  // Complete onboarding
  fastify.post('/me/complete-onboarding', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
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
          eq(tenantUsers.tenantId, request.userContext.tenantId),
          eq(tenantUsers.userId, request.userContext.internalUserId)
        ))
        .returning();

      // Log onboarding completion activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        request.userContext.tenantId,
        null,
        ACTIVITY_TYPES.USER_ACTIVATED,
        {
          action: 'onboarding_completed',
          userId: request.userContext.internalUserId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        data: updatedUser,
        message: 'Onboarding completed successfully',
      };
    } catch (error) {
      request.log.error('Error completing onboarding:', error);
      return reply.code(500).send({ error: 'Failed to complete onboarding' });
    }
  });

  // Get user permissions (separate endpoint for permission checking)
  fastify.get('/me/permissions', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const permissions = await getUserPermissions(
        request.userContext.internalUserId,
        request.userContext.tenantId
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
      request.log.error('Error fetching user permissions:', error);
      return reply.code(500).send({ error: 'Failed to fetch permissions' });
    }
  });
} 