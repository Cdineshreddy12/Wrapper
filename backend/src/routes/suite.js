import { db } from '../db/index.js';
import { 
  applications, 
  organizationApplications, 
  userApplicationPermissions,
  applicationModules,
  activityLogs
} from '../db/schema/suite-schema.js';
import { tenants, tenantUsers } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import SSOService from '../services/sso-service.js';

export default async function suiteRoutes(fastify, options) {

  // Get user's available applications
  fastify.get('/applications', async (request, reply) => {
    try {
      const { internalUserId, tenantId } = request.userContext;
      
      console.log('📱 Getting user applications:', { internalUserId, tenantId });

      const userApps = await SSOService.getUserApplications(internalUserId, tenantId);

      return {
        success: true,
        applications: userApps
      };

    } catch (error) {
      console.error('❌ Failed to get user applications:', error);
      return reply.code(500).send({
        error: 'Failed to get applications',
        message: error.message
      });
    }
  });

  // Get user activity logs
  fastify.get('/activity', async (request, reply) => {
    try {
      const { internalUserId } = request.userContext;
      const { limit = 50 } = request.query;

      console.log('📊 Getting user activity:', { internalUserId, limit });

      const activities = await SSOService.getUserActivity(internalUserId, parseInt(limit));

      return {
        success: true,
        activities
      };

    } catch (error) {
      console.error('❌ Failed to get user activity:', error);
      return reply.code(500).send({
        error: 'Failed to get activity',
        message: error.message
      });
    }
  });

  // SSO redirect endpoint
  fastify.post('/sso/redirect', async (request, reply) => {
    try {
      const { appCode, returnTo } = request.body;
      const userContext = request.userContext;

      if (!appCode) {
        return reply.code(400).send({
          error: 'Missing required field: appCode'
        });
      }

      console.log('🔄 Handling SSO redirect:', { appCode, returnTo, userId: userContext.internalUserId });

      const redirectInfo = await SSOService.handleSSORedirect(
        appCode,
        returnTo,
        userContext,
        request
      );

      return {
        success: true,
        ...redirectInfo
      };

    } catch (error) {
      console.error('❌ SSO redirect failed:', error);
      return reply.code(500).send({
        error: 'SSO redirect failed',
        message: error.message
      });
    }
  });

  // Validate SSO token (called by applications)
  fastify.post('/sso/validate', async (request, reply) => {
    try {
      const { token, appCode } = request.body;

      if (!token || !appCode) {
        return reply.code(400).send({
          error: 'Missing required fields: token, appCode'
        });
      }

      console.log('🔍 Validating SSO token:', { appCode });

      const validation = await SSOService.validateSSOToken(token, appCode);

      if (!validation.valid) {
        return reply.code(401).send({
          error: 'Invalid token',
          message: validation.error
        });
      }

      return {
        success: true,
        valid: true,
        user: validation.payload
      };

    } catch (error) {
      console.error('❌ SSO validation failed:', error);
      return reply.code(500).send({
        error: 'SSO validation failed',
        message: error.message
      });
    }
  });

  // Revoke SSO token (logout from app)
  fastify.post('/sso/revoke', async (request, reply) => {
    try {
      const { token } = request.body;

      if (!token) {
        return reply.code(400).send({
          error: 'Missing required field: token'
        });
      }

      console.log('🔄 Revoking SSO token');

      await SSOService.revokeSSOToken(token);

      return {
        success: true,
        message: 'Token revoked successfully'
      };

    } catch (error) {
      console.error('❌ SSO token revocation failed:', error);
      return reply.code(500).send({
        error: 'Failed to revoke token',
        message: error.message
      });
    }
  });

  // Get all applications (admin only)
  fastify.get('/admin/applications', async (request, reply) => {
    try {
      console.log('🔧 Getting all applications (admin)');

      const allApps = await db
        .select()
        .from(applications)
        .orderBy(applications.sortOrder, applications.appName);

      return {
        success: true,
        applications: allApps
      };

    } catch (error) {
      console.error('❌ Failed to get all applications:', error);
      return reply.code(500).send({
        error: 'Failed to get applications',
        message: error.message
      });
    }
  });

  // Create new application (admin only)
  fastify.post('/admin/applications', async (request, reply) => {
    try {
      const { 
        appCode, 
        appName, 
        description, 
        icon, 
        baseUrl, 
        isCore = false, 
        sortOrder = 0 
      } = request.body;

      if (!appCode || !appName || !baseUrl) {
        return reply.code(400).send({
          error: 'Missing required fields: appCode, appName, baseUrl'
        });
      }

      console.log('🆕 Creating new application:', { appCode, appName });

      const [newApp] = await db
        .insert(applications)
        .values({
          appCode,
          appName,
          description,
          icon,
          baseUrl,
          isCore,
          sortOrder
        })
        .returning();

      return {
        success: true,
        application: newApp
      };

    } catch (error) {
      console.error('❌ Failed to create application:', error);
      return reply.code(500).send({
        error: 'Failed to create application',
        message: error.message
      });
    }
  });

  // Get organization applications
  fastify.get('/admin/organizations/:orgId/applications', async (request, reply) => {
    try {
      const { orgId } = request.params;

      console.log('🏢 Getting organization applications:', { orgId });

      const orgApps = await db
        .select({
          id: organizationApplications.id,
          appId: organizationApplications.appId,
          appCode: applications.appCode,
          appName: applications.appName,
          description: applications.description,
          icon: applications.icon,
          baseUrl: applications.baseUrl,
          isEnabled: organizationApplications.isEnabled,
          enabledModules: organizationApplications.enabledModules,
          subscriptionTier: organizationApplications.subscriptionTier,
          licenseCount: organizationApplications.licenseCount,
          maxUsers: organizationApplications.maxUsers,
          expiresAt: organizationApplications.expiresAt
        })
        .from(organizationApplications)
        .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
        .where(eq(organizationApplications.tenantId, orgId));

      return {
        success: true,
        applications: orgApps
      };

    } catch (error) {
      console.error('❌ Failed to get organization applications:', error);
      return reply.code(500).send({
        error: 'Failed to get organization applications',
        message: error.message
      });
    }
  });

  // Enable/disable application for organization
  fastify.post('/admin/organizations/:orgId/applications/:appId/toggle', async (request, reply) => {
    try {
      const { orgId, appId } = request.params;
      const { isEnabled, subscriptionTier, enabledModules, maxUsers } = request.body;

      console.log('🔄 Toggling application for organization:', { orgId, appId, isEnabled });

      // Check if record exists
      const [existing] = await db
        .select()
        .from(organizationApplications)
        .where(and(
          eq(organizationApplications.tenantId, orgId),
          eq(organizationApplications.appId, appId)
        ))
        .limit(1);

      let result;
      if (existing) {
        // Update existing record
        [result] = await db
          .update(organizationApplications)
          .set({
            isEnabled,
            subscriptionTier,
            enabledModules,
            maxUsers,
            updatedAt: new Date()
          })
          .where(eq(organizationApplications.id, existing.id))
          .returning();
      } else {
        // Create new record
        [result] = await db
          .insert(organizationApplications)
          .values({
            tenantId: orgId,
            appId,
            isEnabled: isEnabled ?? true,
            subscriptionTier: subscriptionTier || 'basic',
            enabledModules,
            maxUsers
          })
          .returning();
      }

      return {
        success: true,
        organizationApplication: result
      };

    } catch (error) {
      console.error('❌ Failed to toggle application:', error);
      return reply.code(500).send({
        error: 'Failed to toggle application',
        message: error.message
      });
    }
  });



  // Test endpoint for debugging
  fastify.get('/debug', async (request, reply) => {
    try {
      const userContext = request.userContext;

      return {
        success: true,
        debug: {
          userContext,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        }
      };

    } catch (error) {
      console.error('❌ Debug endpoint failed:', error);
      return reply.code(500).send({
        error: 'Debug failed',
        message: error.message
      });
    }
  });
} 