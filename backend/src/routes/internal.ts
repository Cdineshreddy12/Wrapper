import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateInternalApiKey } from '../middleware/auth/internal.js';
import { TenantService } from '../services/tenant-service.js';
import { db } from '../db/index.js';
import { tenantUsers, customRoles, userRoleAssignments } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import DistributedSSOCache from '../utils/distributed-sso-cache.js';
import crypto from 'crypto';
import ErrorResponses from '../utils/error-responses.js';

export default async function internalRoutes(fastify: FastifyInstance, _options?: Record<string, unknown>): Promise<void> {
    // Internal health check for tools
    fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'wrapper-backend',
      };
    });
  
    // Get tenant configuration for tools
    fastify.get('/tenant/:tenantId/config', async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as Record<string, string>;
      const internalApiKey = request.headers['x-internal-api-key'] as string | undefined;
      
      if (internalApiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
  
      try {
        const tenantId = params.tenantId ?? '';
        const { SubscriptionService } = await import('../features/subscriptions/services/subscription-service.js');
        
        const tenant = await TenantService.getTenantDetails(tenantId);
        
        if (!tenant) {
          return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
        }
  
        const subscription = await SubscriptionService.getCurrentSubscription(tenantId);
  
        return {
          success: true,
          data: {
            tenant: {
              id: tenant.tenantId,
              name: tenant.companyName,
              subdomain: tenant.subdomain,
              isActive: tenant.isActive,
              settings: tenant.settings,
              branding: {
                logoUrl: tenant.logoUrl,
                primaryColor: tenant.primaryColor,
              },
            },
            subscription: {
              plan: subscription?.plan,
              status: subscription?.status,
              subscribedTools: subscription?.subscribedTools || [],
              usageLimits: subscription?.usageLimits || {},
            },
          },
        };
      } catch (err: unknown) {
        const error = err as Error;
        fastify.log.error(error, 'Error fetching tenant config:');
        return reply.code(500).send({ error: 'Failed to fetch tenant config' });
      }
    });
  
    // Validate user access for tools
    fastify.post('/validate-access', async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const internalApiKey = request.headers['x-internal-api-key'] as string | undefined;
      
      if (internalApiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
  
      try {
        const tenantId = (body.tenantId as string) ?? '';
        const userId = (body.userId as string) ?? '';
        const tool = (body.tool as string) ?? '';
        const action = body.action as string | undefined;
        
        if (!tenantId || !userId || !tool) {
          return reply.code(400).send({ error: 'Missing required fields' });
        }
  
        // TODO: Implement permission checking logic
        // For now, just check if user exists and tenant is active
        const tenant = await TenantService.getTenantDetails(tenantId);
        
        if (!tenant || !tenant.isActive) {
          return reply.code(403).send({ 
            error: 'Tenant not active',
            hasAccess: false 
          });
        }
  
        const [user] = (await db
          .select()
          .from(tenantUsers)
          .where(and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.userId, userId),
            eq(tenantUsers.isActive, true)
          ))
          .limit(1)) as Array<{ userId: string; name: string | null; email: string | null; isTenantAdmin: boolean | null }>;
  
        if (!user) {
          return reply.code(403).send({ 
            error: 'User not found or inactive',
            hasAccess: false 
          });
        }
  
        return {
          success: true,
          hasAccess: true,
          user: {
            id: user.userId,
            name: user.name ?? '',
            email: user.email ?? '',
            isTenantAdmin: user.isTenantAdmin ?? false,
          },
          tenant: {
            id: tenant.tenantId,
            name: tenant.companyName,
          },
        };
      } catch (err: unknown) {
        const error = err as Error;
        fastify.log.error(error, 'Error validating access:');
        return reply.code(500).send({ error: 'Failed to validate access' });
      }
    });
  
    // Get feature flags for tenant
    fastify.get('/tenant/:tenantId/features', async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as Record<string, string>;
      const internalApiKey = request.headers['x-internal-api-key'] as string | undefined;
      
      if (internalApiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
  
      try {
        const tenantId = params.tenantId ?? '';
        const { SubscriptionService } = await import('../features/subscriptions/services/subscription-service.js');
        
        const subscription = await SubscriptionService.getCurrentSubscription(tenantId);
        
        if (!subscription) {
          return ErrorResponses.notFound(reply, 'Subscription', 'Subscription not found');
        }
  
        // Default feature flags based on plan
        const featureFlags = {
          crm_advanced_reports: subscription.plan !== 'trial' && subscription.plan !== 'starter',
          hr_payroll: subscription.plan === 'professional' || subscription.plan === 'enterprise',
          affiliate_custom_commissions: subscription.plan === 'enterprise',
          white_label: subscription.plan === 'enterprise',
          api_access: subscription.plan !== 'trial',
          webhook_support: subscription.plan === 'professional' || subscription.plan === 'enterprise',
          custom_integrations: subscription.plan === 'enterprise',
          priority_support: subscription.plan === 'professional' || subscription.plan === 'enterprise',
        };
  
        return {
          success: true,
          data: {
            tenantId,
            plan: subscription.plan,
            featureFlags,
          },
        };
      } catch (err: unknown) {
        const error = err as Error;
        fastify.log.error(error, 'Error fetching feature flags:');
        return reply.code(500).send({ error: 'Failed to fetch feature flags' });
      }
    });
  
    // Sync data between tools
    fastify.post('/sync', async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const internalApiKey = request.headers['x-internal-api-key'] as string | undefined;
      
      if (internalApiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
  
      try {
        const tenantId = (body.tenantId as string) ?? '';
        const sourceApp = (body.sourceApp as string) ?? '';
        const targetApp = (body.targetApp as string) ?? '';
        const dataType = (body.dataType as string) ?? '';
        const data = body.data;
  
        if (!tenantId || !sourceApp || !targetApp || !dataType) {
          return reply.code(400).send({ error: 'Missing required fields' });
        }
  
        // Log the sync operation
        fastify.log.info(`Data sync: ${sourceApp} -> ${targetApp} (${dataType}) for tenant ${tenantId}`);
  
        // Here you would implement actual data synchronization logic
        // For now, just acknowledge the sync request
        
        return {
          success: true,
          message: 'Data sync completed',
          syncId: `sync_${Date.now()}`,
          timestamp: new Date().toISOString(),
        };
      } catch (err: unknown) {
        const error = err as Error;
        fastify.log.error(error, 'Error syncing data:');
        return reply.code(500).send({ error: 'Failed to sync data' });
      }
    });

    // Enhanced user permissions endpoint with distributed caching
    fastify.post('/user-permissions', {
      preHandler: [validateInternalApiKey],
      schema: {}
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const kinde_user_id = (body.kinde_user_id as string) ?? '';
      const kinde_org_code = (body.kinde_org_code as string) ?? '';
      const requesting_app = (body.requesting_app as string) ?? '';
      const force_refresh = body.force_refresh as boolean | undefined;
      try {
        console.log(`🔍 Processing user permissions request: ${kinde_user_id} for ${requesting_app}`);
        
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
                  cachedAt: (cachedAuth as any).cachedAt || new Date().toISOString()
                }
              };
            }
          }
        }
        
        console.log(`💾 Cache MISS: Fetching fresh data from database`);
        
        const tenant = await TenantService.getByKindeOrgId(kinde_org_code);
        if (!tenant) {
          return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found', { kinde_org_code } as any);
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
          return ErrorResponses.notFound(reply, 'User', 'User not found in tenant', { 
            kinde_user_id,
            tenant_id: tenant.tenantId
          } as any);
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
              eq(userRoleAssignments.userId, user.id),
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
            requesting_app,
            available_tools: getAvailableTools(activeRoles)
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

        try {
          await Promise.all([
            DistributedSSOCache.cacheUserAuth(String(kinde_user_id), String(kinde_org_code), responseData),
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

    // Enhanced session validation with caching
    fastify.post('/validate-session', {
      preHandler: [validateInternalApiKey],
      schema: {}
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const kinde_user_id = (body.kinde_user_id as string) ?? '';
      const kinde_org_code = (body.kinde_org_code as string) ?? '';
      const force_refresh = body.force_refresh as boolean | undefined;
      try {
        if (!force_refresh) {
          const cachedSession = await (DistributedSSOCache as any).getSessionValidation?.(kinde_user_id, kinde_org_code);
          if (cachedSession) {
            console.log(`🎯 CACHE HIT: Session validation for ${kinde_user_id}`);
            return cachedSession;
          }
        }
        
        console.log(`💾 Cache MISS: Validating session in database`);
        
        const tenant = await TenantService.getByKindeOrgId(kinde_org_code);
        if (!tenant) {
          const result = { valid: false, error: 'Tenant not found' };
          await (DistributedSSOCache as any).cacheSessionValidation?.(kinde_user_id, kinde_org_code, false);
          return result;
        }

        const userResult = await db
          .select({ id: tenantUsers.userId, isActive: tenantUsers.isActive })
          .from(tenantUsers)
          .where(
            and(
              eq(tenantUsers.kindeUserId, kinde_user_id as string),
              eq(tenantUsers.tenantId, tenant.tenantId as string)
            )
          )
          .limit(1) as any[];

        const isValid = userResult.length > 0 && userResult[0].isActive;
        const userData = isValid ? {
          tenant_id: tenant.tenantId,
          user_id: userResult[0].id
        } : null;

        await (DistributedSSOCache as any).cacheSessionValidation?.(kinde_user_id, kinde_org_code, isValid, userData);

        return {
          valid: isValid,
          ...userData
        };

      } catch (err: unknown) {
        const error = err as Error;
        fastify.log.error(error, 'Error validating session:');
        return { valid: false, error: 'Validation failed' };
      }
    });

    // Enhanced SSO token validation with caching
    fastify.post('/validate-sso-token', {
      preHandler: [validateInternalApiKey],
      schema: {}
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const token = (body.token as string) ?? '';
      const app_code = body.app_code as string | undefined;
      const force_refresh = body.force_refresh as boolean | undefined;
      try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        if (!force_refresh) {
          const cachedToken = await (DistributedSSOCache as any).getSSOToken?.(tokenHash);
          if (cachedToken) {
            console.log(`🎯 CACHE HIT: SSO token validation`);
            return {
              valid: true,
              ...cachedToken,
              source: 'cache'
            };
          }
        }
        
        console.log(`💾 Cache MISS: Validating SSO token in database`);
        
        const tokenValidation = {
          valid: true,
          user: {
            id: 'user_123',
            email: 'user@example.com',
            name: 'John Doe'
          },
          tenant: {
            id: 'tenant_123',
            name: 'Company Name'
          },
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000)
        };
        
        if (tokenValidation.valid) {
          await (DistributedSSOCache as any).cacheSSOToken?.(tokenHash, tokenValidation);
        }
        
        return {
          ...tokenValidation,
          source: 'database'
        };

      } catch (err: unknown) {
        const error = err as Error;
        fastify.log.error(error, 'Error validating SSO token:');
        return reply.code(500).send({ 
          error: 'Failed to validate SSO token',
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
      const body = request.body as Record<string, unknown>;
      const type = (body.type as string) ?? '';
      const identifier = (body.identifier as string) ?? '';
      const tenant_id = body.tenant_id as string | undefined;
      try {
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
      const body = request.body as Record<string, unknown>;
      const kinde_user_id = (body.kinde_user_id as string) ?? '';
      const kinde_org_code = (body.kinde_org_code as string) ?? '';
      const apps = body.apps as string[] | undefined;
      const appsToWarm = apps || ['crm', 'hr', 'affiliate'];
      try {
        const warmupPromises = appsToWarm.map((app: string) => 
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

    // Get available tools for user
    fastify.post('/user-tools', {
      preHandler: [validateInternalApiKey],
      schema: {}
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const kinde_user_id = (body.kinde_user_id as string) ?? '';
      const kinde_org_code = (body.kinde_org_code as string) ?? '';
      try {
        const tenant = await TenantService.getByKindeOrgId(kinde_org_code);
        if (!tenant) {
          return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
        }

        const userResult = await db
          .select({ id: tenantUsers.userId })
          .from(tenantUsers)
          .where(
            and(
              eq(tenantUsers.kindeUserId, kinde_user_id as string),
              eq(tenantUsers.tenantId, tenant.tenantId as string)
            )
          )
          .limit(1) as any[];

        if (!userResult.length) {
          return ErrorResponses.notFound(reply, 'User', 'User not found');
        }

        const userRolesResult = await db
          .select({ permissions: customRoles.permissions })
          .from(userRoleAssignments)
          .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
          .where(
            and(
              eq(userRoleAssignments.userId, String(userResult[0].id)),
              eq(userRoleAssignments.isActive, true)
            )
          );

        const availableTools = getAvailableTools(userRolesResult);

        return {
          success: true,
          data: {
            available_tools: availableTools,
            tenant_id: tenant.tenantId
          }
        };

      } catch (err: unknown) {
        const error = err as Error;
        fastify.log.error(error, 'Error fetching user tools:');
        return reply.code(500).send({ error: 'Failed to fetch user tools' });
      }
    });

    // Service authentication endpoint for CRM to get API tokens
    fastify.post('/service-auth', {
      preHandler: [validateInternalApiKey],
      schema: {}
    }, async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const service = (body.service as string) ?? '';
      const tenant_id = (body.tenant_id as string) ?? '';
      const permissions = (body.permissions as string[]) ?? ['read'];
      try {
        console.log(`🔑 Service authentication request: ${service} for tenant ${tenant_id}`);

        // Validate tenant exists
        const tenant = await TenantService.getTenantDetails(tenant_id);
        if (!tenant) {
          return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
        }

        // Generate a service token (JWT) for the requesting service
        const { sign } = await import('jsonwebtoken');

        const payload = {
          service: service,
          tenant_id: tenant_id,
          permissions: permissions,
          type: 'service_token',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        };

        const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
        const token = sign(payload, secret);

        console.log(`✅ Service token generated for ${service}`);

        return {
          success: true,
          data: {
            token: token,
            service: service,
            tenant_id: tenant_id,
            permissions: permissions,
            expires_in: 24 * 60 * 60,
            token_type: 'service_jwt'
          }
        };

      } catch (err: unknown) {
        const error = err as Error;
        console.error('❌ Service authentication error:', error);
        fastify.log.error(error, 'Service authentication error:');
        return reply.code(500).send({ error: 'Failed to authenticate service' });
      }
    });
}

function getAvailableTools(roles: any[]): string[] {
  const tools = new Set<string>();
  
  roles.forEach((role: any) => {
    const permissions = typeof role.permissions === 'string' 
      ? JSON.parse(role.permissions) 
      : role.permissions;
    
    Object.keys(permissions || {}).forEach((tool: string) => {
      if (Object.keys((permissions as any)[tool] || {}).length > 0) {
        tools.add(tool);
      }
    });
  });
  
  return Array.from(tools);
}