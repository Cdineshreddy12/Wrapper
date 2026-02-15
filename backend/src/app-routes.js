/**
 * Deferred route and middleware loader.
 * Imported dynamically after server core is up so the main app starts quickly.
 */

import { authRoutes, simplifiedAuthRoutes } from './features/auth/index.js';
import tenantRoutes from './routes/tenants.js';
import { usersRoutes, userRoutes, userSyncRoutes, userVerificationRoutes } from './features/users/index.js';
import { subscriptionsRoutes, paymentsRoutes, paymentUpgradeRoutes, paymentProfileCompletionRoutes } from './features/subscriptions/index.js';
import permissionRoutes from './routes/permissions.js';
import { rolesRoutes, customRolesRoutes } from './features/roles/index.js';
import usageRoutes from './routes/usage.js';
import internalRoutes from './routes/internal.js';
import enhancedInternalRoutes from './routes/internal-enhanced.js';
import webhookRoutes from './routes/webhooks.js';
import proxyRoutes from './routes/proxy.js';
import onboardingRoutes from './routes/onboarding-router.js';
import dnsManagementRoutes from './routes/dns-management.js';
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
import invitationRoutes from './routes/invitations.js';
import suiteRoutes from './routes/suite.js';
import activityRoutes from './routes/activity.js';
import trialRoutes from './routes/trial.js';
import adminPromotionRoutes from './routes/admin-promotion.js';
import permissionMatrixRoutes from './routes/permission-matrix.js';
import enhancedCrmIntegrationRoutes from './routes/enhanced-crm-integration.js';
import wrapperCrmSyncRoutes from './routes/wrapper-crm-sync.js';
import healthRoutes from './routes/health.js';
import permissionSyncRoutes from './routes/permission-sync.js';
import userApplicationRoutes from './routes/user-applications.js';
import { organizationsRoutes, locationsRoutes, entitiesRoutes } from './features/organizations/index.js';
import { creditsRoutes, creditExpiryRoutes } from './features/credits/index.js';
import demoRoutes from './routes/demo.js';
import contactRoutes from './routes/contact.js';
import notificationRoutes from './routes/notifications.js';
import entityScopeRoutes from './routes/entity-scope.js';

import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { trialRestrictionMiddleware } from './middleware/trial-restriction.js';
import { restrictInvitedUsers } from './middleware/invited-user-restriction.js';
import { trackActivity } from './middleware/activityTracker.js';

import { db } from './db/index.js';

export async function registerMiddleware(fastify) {
  fastify.addHook('onRequest', trackActivity());
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await restrictInvitedUsers(request, reply);
    } catch (error) {
      console.error('❌ Invited user restriction middleware error:', error);
    }
  });
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await trialRestrictionMiddleware(request, reply);
    } catch (error) {
      console.error('❌ Trial restriction middleware error:', error);
      console.log('⚠️ Continuing request despite trial restriction error');
    }
  });
  fastify.setErrorHandler(errorHandler);
}

export async function registerRoutes(fastify) {
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
    };
  });

  fastify.get('/debug-routes', async (request, reply) => {
    const routes = [];
    fastify.routes.forEach(route => {
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

  fastify.get('/test-no-middleware', async (request, reply) => {
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
  await fastify.register(usageRoutes, { prefix: '/api/usage' });
  await fastify.register(internalRoutes, { prefix: '/api/internal' });
  await fastify.register(enhancedInternalRoutes, { prefix: '/api' });
  await fastify.register(webhookRoutes, { prefix: '/api/webhooks' });
  await fastify.register(proxyRoutes, { prefix: '/api/proxy' });
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

  const { externalAppRoutes } = await import('./features/admin/index.js');
  await fastify.register(externalAppRoutes, { prefix: '/api/admin/external-apps' });

  const externalNotificationApiRoutes = (await import('./routes/external-notification-api.js')).default;
  await fastify.register(externalNotificationApiRoutes, { prefix: '/api/v1/notifications' });

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
  await fastify.register(enhancedCrmIntegrationRoutes, { prefix: '/api/enhanced-crm-integration' });
  await fastify.register(wrapperCrmSyncRoutes, { prefix: '/api/wrapper' });
  await fastify.register(wrapperCrmSyncRoutes, { prefix: '/api/api/wrapper' });
  await fastify.register(userVerificationRoutes, { prefix: '/api' });
  await fastify.register(healthRoutes, { prefix: '/api' });
  console.log('📋 Registering entity-scope routes...');
  await fastify.register(entityScopeRoutes, { prefix: '/api/admin' });
  console.log('✅ Entity-scope routes registered successfully');

  fastify.get('/api/applications', async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      if (!tenantId) {
        return reply.code(401).send({ error: 'Authentication required' });
      }
      console.log('📱 Getting applications for tenant:', { tenantId });
      const { applications, organizationApplications } = await import('./db/schema/suite-schema.js');
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
    } catch (error) {
      console.error('❌ Failed to get applications:', error);
      return reply.code(500).send({
        error: 'Failed to get applications',
        message: error.message
      });
    }
  });

  await fastify.register(invitationRoutes, { prefix: '/api/invitations' });

  fastify.get('/auth', async (request, reply) => {
    const { app_code, redirect_url, ...otherParams } = request.query;
    console.log('🎯 ROOT /auth ENDPOINT HIT!', {
      app_code,
      redirect_url,
      method: request.method,
      url: request.url,
      fullUrl: request.protocol + '://' + request.hostname + request.url,
      headers: request.headers['user-agent']
    });
    try {
      const validAppCodes = ['crm', 'hr', 'affiliate', 'accounting', 'inventory'];
      if (!app_code || !validAppCodes.includes(app_code)) {
        console.log('❌ Invalid app_code:', app_code);
        return reply.code(400).send({
          error: 'Invalid app_code',
          message: `app_code must be one of: ${validAppCodes.join(', ')}`
        });
      }
      if (!redirect_url) {
        console.log('❌ Missing redirect_url');
        return reply.code(400).send({
          error: 'Missing redirect_url',
          message: 'redirect_url parameter is required'
        });
      }
      console.log('✅ Valid CRM auth request, processing... (SSO removed)');
      const kindeService = await import('./services/kinde-service.js');
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/callback`;
      const stateData = { app_code, redirect_url, timestamp: Date.now() };
      console.log('🔍 Generating Kinde auth URL with:', {
        redirectUri,
        stateData,
        fullState: JSON.stringify(stateData)
      });
      const kindeAuthUrl = kindeService.default.generateSocialLoginUrl({
        redirectUri,
        state: JSON.stringify(stateData),
        prompt: 'login'
      });
      console.log('🚀 Redirecting to Kinde authentication:', kindeAuthUrl);
      return reply.redirect(kindeAuthUrl);
    } catch (error) {
      console.error('❌ Root auth handler error:', error);
      return reply.code(500).send({
        error: 'Authentication failed',
        message: error.message
      });
    }
  });

  fastify.get('/test-auth', async (request, reply) => {
    const { app_code, redirect_url } = request.query;
    console.log('🧪 Test auth endpoint called:', { app_code, redirect_url });
    if (!app_code || !redirect_url) {
      return reply.code(400).send({
        error: 'Missing parameters',
        message: 'app_code and redirect_url are required'
      });
    }
    try {
      const jwt = await import('jsonwebtoken');
      const testTokenPayload = {
        iss: 'unified-wrapper-sso',
        sub: 'test-user-123',
        aud: app_code,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60),
        user: {
          id: 'test-user-123',
          kindeId: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
          isAdmin: true,
          isActive: true
        },
        organization: {
          id: 'test-org-123',
          name: 'Test Organization',
          subdomain: 'test',
          kindeOrgId: 'test-org'
        },
        permissions: {
          crm: {
            contacts: ['read', 'write', 'delete'],
            deals: ['read', 'write'],
            reports: ['read']
          }
        },
        subscription: {
          tier: 'premium',
          status: 'active',
          subscribedFeatures: ['crm', 'analytics', 'billing']
        }
      };
      const testToken = jwt.default.sign(
        testTokenPayload,
        process.env.JWT_SECRET || 'test-secret-key',
        { algorithm: 'HS256' }
      );
      const expiresAt = new Date(Date.now() + (8 * 60 * 60 * 1000));
      const targetUrl = new URL(redirect_url);
      targetUrl.searchParams.set('token', testToken);
      targetUrl.searchParams.set('expires_at', expiresAt.toISOString());
      targetUrl.searchParams.set('app_code', app_code);
      targetUrl.searchParams.set('test_mode', 'true');
      console.log('🧪 Test auth: Redirecting to CRM with test token');
      return reply.redirect(targetUrl.toString());
    } catch (error) {
      console.error('❌ Test auth error:', error);
      return reply.code(500).send({
        error: 'Test authentication failed',
        message: error.message
      });
    }
  });

  fastify.get('/logout', async (request, reply) => {
    const { app_code, redirect_url, ...otherParams } = request.query;
    console.log('🔍 Root /logout redirect:', { app_code, redirect_url });
    const redirectUrl = new URL('/api/auth/logout', `${process.env.BACKEND_URL || 'http://localhost:3000'}`);
    if (app_code) redirectUrl.searchParams.set('app_code', app_code);
    if (redirect_url) redirectUrl.searchParams.set('redirect_url', redirect_url);
    Object.keys(otherParams).forEach(key => {
      redirectUrl.searchParams.set(key, otherParams[key]);
    });
    console.log('🚀 Redirecting to:', redirectUrl.toString());
    return reply.redirect(redirectUrl.toString());
  });
}
