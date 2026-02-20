/**
 * Deferred route and middleware loader.
 * Imported dynamically after server core is up so the main app starts quickly.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authRoutes } from './features/auth/index.js';
import tenantRoutes from './features/admin/routes/tenants.js';
import { usersRoutes, userRoutes, userSyncRoutes, userVerificationRoutes } from './features/users/index.js';
import { subscriptionsRoutes, paymentsRoutes, paymentUpgradeRoutes, paymentProfileCompletionRoutes } from './features/subscriptions/index.js';
import permissionRoutes from './features/roles/routes/permissions.js';
import { rolesRoutes, customRolesRoutes } from './features/roles/index.js';
import internalRoutes from './routes/internal.js';
import enhancedInternalRoutes from './routes/internal-enhanced.js';
import webhookRoutes from './features/webhooks/routes/webhooks.js';
import onboardingRoutes from './features/onboarding/index.js';
import dnsManagementRoutes from './features/onboarding/routes/dns-management.js';
import {
  adminRoutes,
  adminDashboardRoutes,
  adminTenantManagementRoutes,
  adminEntityManagementRoutes,
  adminCreditOverviewRoutes,
  adminCreditConfigurationRoutes,
  adminApplicationAssignmentRoutes,
  adminOperationCostRoutes,
  seasonalCreditsRoutes,
  adminNotificationRoutes
} from './features/admin/index.js';
import invitationRoutes from './features/organizations/routes/invitations.js';
import suiteRoutes from './routes/suite.js';
import activityRoutes from './routes/activity.js';
import trialRoutes from './features/subscriptions/routes/trial.js';
import adminPromotionRoutes from './features/admin/routes/admin-promotion.js';
import permissionMatrixRoutes from './features/roles/routes/permission-matrix.js';
import appSyncRoutes from './features/app-sync/routes/sync-routes.js';
import healthRoutes from './routes/health.js';
import permissionSyncRoutes from './features/roles/routes/permission-sync.js';
import userApplicationRoutes from './features/users/routes/user-applications.js';
import { organizationsRoutes, locationsRoutes, entitiesRoutes } from './features/organizations/index.js';
import { creditsRoutes, creditExpiryRoutes } from './features/credits/index.js';
import demoRoutes from './routes/demo.js';
import contactRoutes from './routes/contact.js';
import notificationRoutes from './features/notifications/routes/notifications.js';
import entityScopeRoutes from './features/organizations/routes/entity-scope.js';

import { authMiddleware, csrfProtection } from './middleware/auth/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { trialRestrictionMiddleware } from './middleware/restrictions/trial-restriction.js';
import { restrictInvitedUsers } from './middleware/restrictions/invited-user-restriction.js';
import { trackActivity } from './middleware/activityTracker.js';

import { db } from './db/index.js';

export async function registerMiddleware(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', trackActivity());
  fastify.addHook('preHandler', csrfProtection);
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await restrictInvitedUsers(request, reply);
    } catch (err: unknown) {
      console.error('❌ Invited user restriction middleware error:', err);
    }
  });
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await trialRestrictionMiddleware(request, reply);
    } catch (err: unknown) {
      console.error('❌ Trial restriction middleware error:', err);
      console.log('⚠️ Continuing request despite trial restriction error');
    }
  });
  fastify.setErrorHandler(errorHandler);
}

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
    };
  });

  fastify.get('/debug-routes', async (request: FastifyRequest, reply: FastifyReply) => {
    const routes: Array<{ method: string; url: string; prefix?: string }> = [];
    const routeList = (fastify as any).routes ?? [];
    routeList.forEach((route: { method: string; url: string; prefix?: string }) => {
      routes.push({
        method: route.method,
        url: route.url,
        prefix: route.prefix
      });
    });
    return {
      success: true,
      message: 'Route debugging info',
      totalRoutes: routes.length,
      routes: routes.slice(0, 20),
      timestamp: new Date().toISOString()
    };
  });

  fastify.get('/test-no-middleware', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      success: true,
      message: 'This endpoint bypasses all middleware',
      timestamp: new Date().toISOString(),
      headers: request.headers,
      url: request.url,
      method: request.method
    };
  });

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(tenantRoutes, { prefix: '/api/tenants' });
  await fastify.register(usersRoutes, { prefix: '/api/users' });
  await fastify.register(subscriptionsRoutes, { prefix: '/api/subscriptions' });
  await fastify.register(permissionRoutes, { prefix: '/api/permissions' });
  await fastify.register(rolesRoutes, { prefix: '/api/roles' });
  await fastify.register(customRolesRoutes, { prefix: '/api/custom-roles' });
  await fastify.register(customRolesRoutes, { prefix: '/api/api/custom-roles' });
  await fastify.register(internalRoutes, { prefix: '/api/internal' });
  await fastify.register(enhancedInternalRoutes, { prefix: '/api' });
  await fastify.register(webhookRoutes, { prefix: '/api/webhooks' });
  await fastify.register(onboardingRoutes, { prefix: '/api/onboarding' });
  await fastify.register(dnsManagementRoutes, { prefix: '/api/dns' });
  await fastify.register(adminRoutes, { prefix: '/api/admin' });
  await fastify.register(adminCreditConfigurationRoutes, { prefix: '/api/admin/credit-configurations' });
  await fastify.register(adminApplicationAssignmentRoutes, { prefix: '/api/admin/application-assignments' });
  await fastify.register(adminOperationCostRoutes, { prefix: '/api/admin/operation-costs' });
  await fastify.register(adminDashboardRoutes, { prefix: '/api/admin/dashboard' });
  await fastify.register(adminTenantManagementRoutes, { prefix: '/api/admin/tenants' });
  await fastify.register(adminEntityManagementRoutes, { prefix: '/api/admin/entities' });
  await fastify.register(adminCreditOverviewRoutes, { prefix: '/api/admin/credits' });
  await fastify.register(seasonalCreditsRoutes, { prefix: '/api/admin/seasonal-credits' });
  await fastify.register(adminNotificationRoutes, { prefix: '/api/admin/notifications' });

  await fastify.register(suiteRoutes, { prefix: '/api/suite' });
  await fastify.register(paymentsRoutes, { prefix: '/api/payments' });
  await fastify.register(activityRoutes, { prefix: '/api/activity' });
  await fastify.register(trialRoutes, { prefix: '/api/trial' });
  await fastify.register(adminPromotionRoutes, { prefix: '/api/admin-promotion' });
  await fastify.register(permissionMatrixRoutes, { prefix: '/api/permission-matrix' });
  await fastify.register(permissionSyncRoutes, { prefix: '/api/permission-sync' });
  await fastify.register(userSyncRoutes, { prefix: '/api/user-sync' });
  await fastify.register(userApplicationRoutes, { prefix: '/api/user-applications' });
  await fastify.register(organizationsRoutes, { prefix: '/api/organizations' });
  await fastify.register(locationsRoutes, { prefix: '/api/locations' });
  console.log('📋 Registering entities routes...');
  await fastify.register(entitiesRoutes, { prefix: '/api/entities' });
  console.log('✅ Entities routes registered successfully');
  await fastify.register(paymentUpgradeRoutes, { prefix: '/api/payment-upgrade' });
  await fastify.register(creditsRoutes, { prefix: '/api/credits' });
  await fastify.register(creditExpiryRoutes, { prefix: '/api/credits/expiry' });
  await fastify.register(notificationRoutes, { prefix: '/api/notifications' });
  await fastify.register(demoRoutes, { prefix: '/api/demo' });
  await fastify.register(contactRoutes, { prefix: '/api/contact' });
  await fastify.register(appSyncRoutes, { prefix: '/api/wrapper' });
  await fastify.register(appSyncRoutes, { prefix: '/api/api/wrapper' });
  await fastify.register(userVerificationRoutes, { prefix: '/api' });
  await fastify.register(healthRoutes, { prefix: '/api' });
  console.log('✅ Entity-scope routes registered successfully');

  fastify.get('/api/applications', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).userContext?.tenantId;
      if (!tenantId) {
        return reply.code(401).send({ error: 'Authentication required' });
      }
      console.log('📱 Getting applications for tenant:', { tenantId });
      const { applications, organizationApplications } = await import('./db/schema/core/suite-schema.js');
      const { eq, and } = await import('drizzle-orm');
      const userApps = await db
        .select({
          appId: applications.appId,
          appCode: applications.appCode,
          appName: applications.appName,
          description: applications.description,
          icon: applications.icon,
          baseUrl: applications.baseUrl,
          isCore: applications.isCore,
          sortOrder: applications.sortOrder,
          isEnabled: organizationApplications.isEnabled,
          subscriptionTier: organizationApplications.subscriptionTier,
          enabledModules: organizationApplications.enabledModules
        })
        .from(organizationApplications)
        .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
        .where(and(
          eq(organizationApplications.tenantId, tenantId),
          eq(organizationApplications.isEnabled, true)
        ))
        .orderBy(applications.sortOrder, applications.appName);
      return { success: true, data: userApps };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to get applications:', error);
      return reply.code(500).send({
        error: 'Failed to get applications',
        message: error.message
      });
    }
  });

  await fastify.register(invitationRoutes, { prefix: '/api/invitations' });
}
