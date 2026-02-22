import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateInternalApiKey } from '../middleware/auth/internal.js';
import { TenantService } from '../services/tenant-service.js';
import { db } from '../db/index.js';
import { tenantUsers, customRoles, userRoleAssignments } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import DistributedSSOCache from '../utils/distributed-sso-cache.js';
export default async function enhancedInternalRoutes(fastify: FastifyInstance, _options?: Record<string, unknown>): Promise<void> {

  // Enhanced user permissions with cache-first approach
  fastify.post('/user-permissions', {
    preHandler: [validateInternalApiKey],
    schema: {}
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const kinde_user_id = (body.kinde_user_id as string) ?? '';
      const kinde_org_code = (body.kinde_org_code as string) ?? '';
      const requesting_app = (body.requesting_app as string) ?? '';
      const force_refresh = body.force_refresh as boolean | undefined;
      
      console.log(`🔍 Processing user permissions request: ${kinde_user_id} for ${requesting_app}`);
      
      // Step 1: Check cache first (unless force refresh)
      if (!force_refresh) {
        const cachedAuth = await DistributedSSOCache.getUserAuth(kinde_user_id, kinde_org_code) as any;
        if (cachedAuth) {
          console.log(`🚀 CACHE HIT: Returning cached auth data for ${kinde_user_id}`);
          
          const cachedPermissions = await DistributedSSOCache.getUserPermissions(
            cachedAuth.user?.id ?? '',
            cachedAuth.tenant?.id ?? '',
            requesting_app
          );
          
          if (cachedPermissions) {
            console.log(`🎯 CACHE HIT: Returning cached permissions for ${requesting_app}`);
            return {
              success: true,
              data: {
                ...cachedAuth,
                permissions: (cachedPermissions as any).permissions || cachedPermissions,
                source: 'cache',
                cachedAt: cachedAuth.cachedAt || new Date().toISOString()
              }
            };
          }
        }
      }
      
      console.log(`💾 Cache MISS: Fetching fresh data from database`);
      
      // Step 2: Fetch fresh data from database (your existing logic)
      const tenant = await TenantService.getByKindeOrgId(kinde_org_code);
      if (!tenant) {
        return reply.code(404).send({ 
          error: 'Tenant not found',
          kinde_org_code 
        });
      }

      const userResult = await db
        .select({
          id: tenantUsers.userId,
          email: tenantUsers.email,
          firstName: tenantUsers.firstName,
          lastName: tenantUsers.lastName,
          isActive: tenantUsers.isActive
        })
        .from(tenantUsers)
        .where(
          and(
            eq(tenantUsers.kindeUserId, kinde_user_id as string),
            eq(tenantUsers.tenantId, tenant.tenantId as string)
          )
        )
        .limit(1) as any[];

      if (!userResult.length) {
        return reply.code(404).send({ 
          error: 'User not found in tenant',
          kinde_user_id,
          tenant_id: tenant.tenantId
        });
      }

      const user = userResult[0];

      if (!user.isActive) {
        return reply.code(403).send({ 
          error: 'User account is inactive',
          user_id: user.id
        });
      }

      const userRolesResult = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          permissions: customRoles.permissions,
          restrictions: (customRoles as any).restrictions,
          isActive: userRoleAssignments.isActive,
          expiresAt: userRoleAssignments.expiresAt
        })
        .from(userRoleAssignments)
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(
          and(
            eq(userRoleAssignments.userId, String(user.id)),
            eq(userRoleAssignments.isActive, true)
          )
        );

      const now = new Date();
      const activeRoles = userRolesResult.filter(role => 
        !role.expiresAt || new Date(role.expiresAt) > now
      );

      if (!activeRoles.length) {
        return reply.code(403).send({ 
          error: 'No active roles found for user',
          user_id: user.id
        });
      }

      const aggregatedPermissions: Record<string, string[]> = {};
      const aggregatedRestrictions: Record<string, unknown> = {};
      const userRoleNames: string[] = [];

      for (const role of activeRoles) {
        userRoleNames.push((role as any).roleName ?? '');
        
        const rolePermissions = typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions) 
          : role.permissions;

        const roleRestrictions = typeof (role as any).restrictions === 'string'
          ? JSON.parse((role as any).restrictions || '{}')
          : ((role as any).restrictions || {});

        const toolPermissions = (rolePermissions as any)[requesting_app] || {};
        
        Object.keys(toolPermissions).forEach(resource => {
          if (!aggregatedPermissions[resource]) {
            aggregatedPermissions[resource] = [];
          }
          
          const resourcePermissions = toolPermissions[resource];
          if (Array.isArray(resourcePermissions)) {
            resourcePermissions.forEach((permission: string) => {
              if (!aggregatedPermissions[resource].includes(permission)) {
                aggregatedPermissions[resource].push(permission);
              }
            });
          }
        });

        Object.keys(roleRestrictions).forEach(key => {
          if (key.startsWith(`${requesting_app}.`)) {
            if (typeof roleRestrictions[key] === 'number') {
              (aggregatedRestrictions as any)[key] = Math.min(
                ((aggregatedRestrictions as any)[key] as number) || Number.MAX_SAFE_INTEGER,
                roleRestrictions[key] as number
              );
            } else {
              if (!(aggregatedRestrictions as any)[key]) {
                (aggregatedRestrictions as any)[key] = roleRestrictions[key];
              }
            }
          }
        });
      }

      if (Object.keys(aggregatedPermissions).length === 0) {
        return reply.code(403).send({ 
          error: 'No permissions for requested application',
          requesting_app
        });
      }

      // Step 5: Prepare response data
      const responseData = {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          kinde_user_id
        },
        tenant: {
          id: tenant.tenantId,
          name: tenant.companyName,
          subdomain: tenant.subdomain
        },
        roles: userRoleNames,
        permissions: aggregatedPermissions,
        restrictions: aggregatedRestrictions,
        context: {
          requesting_app,
          kinde_org_code,
          timestamp: new Date().toISOString()
        }
      };

      // Step 6: Cache the results for future requests
      try {
        await Promise.all([
          // Cache user auth data (shared across all apps)
          DistributedSSOCache.cacheUserAuth(String(kinde_user_id), String(kinde_org_code), responseData as any),
          
          DistributedSSOCache.cacheUserRoles(String(user.id), String(tenant.tenantId), activeRoles as any),
          
          DistributedSSOCache.cacheUserPermissions(String(user.id), String(tenant.tenantId), String(requesting_app), {
            permissions: aggregatedPermissions,
            restrictions: aggregatedRestrictions,
            roles: userRoleNames
          })
        ]);
        
        console.log(`✅ Successfully cached auth data for ${kinde_user_id}:${requesting_app}`);
      } catch (cacheError) {
        console.error('⚠️ Cache write failed (non-critical):', cacheError);
      }

      return {
        success: true,
        data: {
          ...responseData,
          source: 'database',
          cachedAt: new Date().toISOString()
        }
      };

    } catch (err: unknown) {
      const error = err as Error;
      fastify.log.error(error, 'Error fetching user permissions:');
      return reply.code(500).send({ 
        error: 'Failed to fetch user permissions',
        message: error.message
      });
    }
  });

  // Cache management endpoints
  fastify.get('/cache/stats', {
    preHandler: [validateInternalApiKey]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await DistributedSSOCache.getCacheStats();
      return {
        success: true,
        data: stats
      };
    } catch (err: unknown) {
      const error = err as Error;
      fastify.log.error(error, 'Error getting cache stats:');
      return reply.code(500).send({ error: 'Failed to get cache stats' });
    }
  });

  fastify.post('/cache/invalidate', {
    preHandler: [validateInternalApiKey],
    schema: {}
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const type = (body.type as string) ?? '';
      const identifier = (body.identifier as string) ?? '';
      const tenant_id = body.tenant_id as string | undefined;
      
      switch (type) {
        case 'user':
          await DistributedSSOCache.invalidateUserCache(identifier, tenant_id);
          break;
        case 'tenant':
          await DistributedSSOCache.invalidateTenantCache(identifier);
          break;
        case 'app':
          await DistributedSSOCache.invalidateAppCache(identifier);
          break;
        default:
          return reply.code(400).send({ error: 'Invalid cache type' });
      }
      
      return {
        success: true,
        message: `Cache invalidated for ${type}: ${identifier}`
      };
    } catch (err: unknown) {
      const error = err as Error;
      fastify.log.error(error, 'Error invalidating cache:');
      return reply.code(500).send({ error: 'Failed to invalidate cache' });
    }
  });

  // Warm up cache for a user
  fastify.post('/cache/warmup', {
    preHandler: [validateInternalApiKey],
    schema: {}
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const kinde_user_id = (body.kinde_user_id as string) ?? '';
      const kinde_org_code = (body.kinde_org_code as string) ?? '';
      const apps = body.apps as string[] | undefined;
      const appsToWarm = apps || ['crm', 'hr', 'affiliate'];
      
      // Warm up cache by fetching data for all specified apps
      const warmupPromises = appsToWarm.map(app => 
        fastify.inject({
          method: 'POST',
          url: '/api/internal/user-permissions',
          headers: request.headers,
          body: {
            kinde_user_id,
            kinde_org_code,
            requesting_app: app,
            force_refresh: true
          }
        })
      );
      
      await Promise.all(warmupPromises);
      
      return {
        success: true,
        message: `Cache warmed up for user ${kinde_user_id} across ${appsToWarm.length} apps`
      };
    } catch (err: unknown) {
      const error = err as Error;
      fastify.log.error(error, 'Error warming up cache:');
      return reply.code(500).send({ error: 'Failed to warm up cache' });
    }
  });

} 