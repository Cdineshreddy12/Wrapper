import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserClassificationService } from '../services/user-classification-service.js';
import { UserSyncService } from '../services/user-sync-service.js';
import { requirePermissions } from '../../../middleware/auth/permission-middleware.js';
import { PERMISSIONS } from '../../../constants/permissions.js';

/**
 * 🔄 User Sync and Classification API Routes
 * 
 * These routes provide endpoints for user classification based on application access
 * and synchronization of users to their respective applications.
 */
export default async function userSyncRoutes(
  fastify: FastifyInstance,
  _options?: Record<string, unknown>
): Promise<void> {

  // Get user classification by applications
  fastify.get('/classification', {
    // Add route debugging
    config: {
      routeId: 'user-classification'
    } as Record<string, unknown>,
    preHandler: requirePermissions([PERMISSIONS.CRM_SYSTEM_USERS_READ]),
    schema: {
      tags: ['User Management'],
      description: 'Returns all users classified by which applications they can access'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as FastifyRequest & { userContext?: { tenantId?: string; userId?: string; email?: string; organizationName?: string }; routeConfig?: { routeId?: string } };
      console.log('🎯 CLASSIFICATION ENDPOINT CALLED!');
      console.log('📊 Request details:', {
        method: request.method,
        url: request.url,
        routeId: req.routeConfig?.routeId,
        headers: request.headers
      });
      
      const tenantId = req.userContext?.tenantId;
      
      console.log('📊 API: Getting user classification for tenant:', tenantId);
      console.log('👤 API: User context:', {
        userId: req.userContext?.userId,
        email: req.userContext?.email,
        tenantId: req.userContext?.tenantId,
        organizationName: req.userContext?.organizationName
      });
      
      const classification = await UserClassificationService.classifyUsersByApplication(tenantId as string);
      type ClassShape = {
        summary: { totalUsers: number; applicationBreakdown: Record<string, unknown>; subscriptionBreakdown: Record<string, unknown> };
        byApplication: Record<string, { appInfo: { appCode: string; appName: string; description?: string; icon?: string; baseUrl?: string }; users?: Array<{ userId: string; email?: string; name?: string; isTenantAdmin?: boolean }>; totalUsers?: number; userCount?: number }>;
        byUser: Record<string, { name?: string; email?: string; allowedApplications?: string[]; isTenantAdmin?: boolean }>;
      };
      const cls = classification as ClassShape;
      // Debug: Log what the service actually returned
      console.log('🔍 DEBUG: Service returned classification:', {
        hasSummary: !!cls.summary,
        summaryKeys: cls.summary ? Object.keys(cls.summary) : [],
        hasByApplication: !!cls.byApplication,
        byApplicationKeys: cls.byApplication ? Object.keys(cls.byApplication) : [],
        hasByUser: !!cls.byUser,
        byUserKeys: cls.byUser ? Object.keys(cls.byUser) : [],
        summaryContent: cls.summary,
        byApplicationContent: cls.byApplication,
        byUserContent: cls.byUser
      });
      
      // Clean the data to remove potential circular references
      const cleanClassification: { summary: { totalUsers: number; applicationBreakdown: Record<string, unknown>; subscriptionBreakdown: Record<string, unknown> }; byApplication: Record<string, unknown>; byUser: Record<string, unknown> } = {
        summary: {
          totalUsers: cls.summary.totalUsers,
          applicationBreakdown: cls.summary.applicationBreakdown,
          subscriptionBreakdown: cls.summary.subscriptionBreakdown
        },
        byApplication: {} as Record<string, unknown>,
        byUser: {} as Record<string, unknown>
      };

      // Clean byApplication data
      console.log('🔍 DEBUG: Starting byApplication cleaning...');
      console.log('🔍 DEBUG: classification.byApplication keys:', Object.keys(cls.byApplication));
      
      Object.keys(cls.byApplication).forEach(appCode => {
        const appData = cls.byApplication[appCode];
        console.log(`🔍 DEBUG: Processing app ${appCode}:`, {
          hasAppData: !!appData,
          appDataKeys: appData ? Object.keys(appData) : [],
          hasAppInfo: !!appData?.appInfo,
          hasUsers: !!appData?.users,
          usersLength: appData?.users?.length || 0
        });
        
        // Test if we can serialize the users array
        let usersArray: Array<{ userId: string; email: string; name: string; isTenantAdmin: boolean }> = [];
        try {
          if (appData.users && Array.isArray(appData.users)) {
            usersArray = appData.users.map((user: { userId: string; email?: string; name?: string; isTenantAdmin?: boolean }) => ({
              userId: user.userId,
              email: user.email || '',
              name: user.name || '',
              isTenantAdmin: user.isTenantAdmin || false
            }));
            console.log(`✅ DEBUG: Created users array for ${appCode}:`, usersArray.length, 'users');
          }
        } catch (error) {
          console.log(`⚠️ Error processing users for ${appCode}:`, error);
        }
        
        (cleanClassification.byApplication as Record<string, unknown>)[appCode] = {
          appCode: appData.appInfo.appCode,
          appName: appData.appInfo.appName,
          description: appData.appInfo.description,
          icon: appData.appInfo.icon,
          baseUrl: appData.appInfo.baseUrl,
          userCount: appData.totalUsers || appData.userCount || 0,
          totalUsers: appData.totalUsers || appData.userCount || 0,
          // Include cleaned user data for frontend processing
          users: usersArray
        };
        
        console.log(`✅ DEBUG: Added ${appCode} to cleanClassification.byApplication`);
      });
      
      console.log('🔍 DEBUG: After byApplication cleaning, keys:', Object.keys(cleanClassification.byApplication));

      // Clean byUser data
      Object.keys(cls.byUser).forEach(userId => {
        const userData = cls.byUser[userId];
        (cleanClassification.byUser as Record<string, unknown>)[userId] = {
          name: userData.name || '',
          email: userData.email || '',
          allowedApps: userData.allowedApplications || [],
          isTenantAdmin: userData.isTenantAdmin || false
        };
      });

      console.log('📊 API: Classification result summary:', {
        totalUsers: cleanClassification.summary.totalUsers,
        applicationBreakdown: cleanClassification.summary.applicationBreakdown,
        byApplicationKeys: Object.keys(cleanClassification.byApplication),
        byUserKeys: Object.keys(cleanClassification.byUser)
      });
      
      console.log('📊 API: Full classification object keys:', Object.keys(cleanClassification));
      console.log('📊 API: byApplication content:', cleanClassification.byApplication);
      console.log('📊 API: summary content:', cleanClassification.summary);

      const response = {
        success: true,
        data: cleanClassification,
        message: `Classified ${cls.summary.totalUsers} users across ${Object.keys(cls.byApplication).length} applications`
      };
      
      console.log('📊 API: Response being sent:', {
        success: response.success,
        dataKeys: Object.keys(response.data),
        message: response.message
      });
      
      console.log('📊 API: Response data details:', {
        summaryKeys: Object.keys(response.data.summary),
        byApplicationKeys: Object.keys(response.data.byApplication),
        byUserKeys: Object.keys(response.data.byUser)
      });
      
      console.log('📊 API: Response data content check:', {
        summaryHasData: !!response.data.summary.applicationBreakdown && Object.keys(response.data.summary.applicationBreakdown).length > 0,
        byApplicationHasData: !!response.data.byApplication && Object.keys(response.data.byApplication).length > 0,
        byUserHasData: !!response.data.byUser && Object.keys(response.data.byUser).length > 0
      });
      
      // Log the exact response being sent
      console.log('📊 API: FINAL RESPONSE BEING SENT:', JSON.stringify(response, null, 2));
      
      // Test if we can serialize the response
      try {
        const testSerialization = JSON.stringify(response);
        console.log('✅ Response serialization test passed, length:', testSerialization.length);
      } catch (error) {
        console.error('❌ Response serialization test failed:', error);
      }
      
      // Force explicit JSON serialization to prevent Fastify from cleaning the response
      console.log('📊 API: Sending response with explicit serialization...');
      
      // Add CORS headers to ensure the response isn't modified
      return reply
        .code(200)
        .header('Content-Type', 'application/json')
        .header('Access-Control-Allow-Origin', 'http://localhost:3001')
        .header('Access-Control-Allow-Credentials', 'true')
        .header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        .send(response);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error getting user classification:', error);
      return reply.code(500).send({
        error: 'Failed to get user classification',
        message: error.message
      });
    }
  });

  // Get users for a specific application
  fastify.get('/classification/:appCode', {
    preHandler: requirePermissions([PERMISSIONS.CRM_SYSTEM_USERS_READ]),
    schema: {
      tags: ['User Management'],
      description: 'Returns users who have access to the specified application'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const appCode = params.appCode;
      const req = request as FastifyRequest & { userContext?: { tenantId?: string } };
      const tenantId = req.userContext?.tenantId;
      
      console.log(`📊 Getting users for application ${appCode} in tenant ${tenantId}`);
      
      const appUsers = await UserClassificationService.getUsersForApplication(tenantId as string, appCode);
      
      return {
        success: true,
        data: appUsers,
        message: `Found ${appUsers.totalUsers} users with access to ${appCode}`
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error getting users for application:', error);
      return reply.code(500).send({
        error: 'Failed to get users for application',
        message: error.message
      });
    }
  });

  // Get application access for a specific user
  fastify.get('/user/:userId/access', {
    preHandler: requirePermissions([PERMISSIONS.CRM_SYSTEM_USERS_READ]),
    schema: {
      tags: ['User Management'],
      description: 'Returns the applications a specific user has access to'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const userId = params.userId;
      const req = request as FastifyRequest & { userContext?: { tenantId?: string } };
      const tenantId = req.userContext?.tenantId;
      
      console.log(`📊 Getting application access for user ${userId}`);
      
      const userAccess = await UserClassificationService.getUserApplicationAccess(userId, tenantId as string);
      
      if (!userAccess) {
        return reply.code(404).send({
          error: 'User not found',
          message: 'User not found or has no application access'
        });
      }
      
      return {
        success: true,
        data: userAccess,
        message: `User has access to ${(userAccess as { allowedApplications: string[] }).allowedApplications.length} applications`
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error getting user application access:', error);
      return reply.code(500).send({
        error: 'Failed to get user application access',
        message: error.message
      });
    }
  });

  // Sync all users to their respective applications
  fastify.post('/sync/all', {
    preHandler: requirePermissions([PERMISSIONS.CRM_SYSTEM_USERS_UPDATE]),
    schema: {
      tags: ['User Sync'],
      description: 'Synchronizes all tenant users to the applications they have access to'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as FastifyRequest & { userContext?: { tenantId?: string; kindeOrgId?: string }; body?: Record<string, unknown> };
      const tenantId = req.userContext?.tenantId;
      const body = (request.body as Record<string, unknown>) || {};
      const { syncType = 'full', dryRun = false, forceUpdate = false } = body;
      const providedOrgCode = body.orgCode as string | undefined;
      const effectiveOrgCode = providedOrgCode || req.userContext?.kindeOrgId || null;
      
      console.log(`🔄 Starting ${dryRun ? 'dry run ' : ''}sync for tenant ${tenantId}`);
      if (!providedOrgCode && effectiveOrgCode) {
        console.log('🏢 Using orgCode from userContext.kindeOrgId:', effectiveOrgCode);
      }
      
      if (dryRun) {
        // For dry run, just return classification without syncing
        const dryRunClassification = await UserClassificationService.classifyUsersByApplication(tenantId as string) as { summary: { totalUsers: number; applicationBreakdown: Record<string, unknown> }; byApplication: Record<string, unknown>; byUser: Record<string, unknown> };
        return {
          success: true,
          dryRun: true,
          data: {
            wouldSync: dryRunClassification.summary,
            applicationBreakdown: dryRunClassification.summary.applicationBreakdown
          },
          message: 'Dry run completed - no actual sync performed'
        };
      }
      
      const syncResults = await UserSyncService.syncAllUsersForTenant(tenantId as string, { syncType: syncType as string, orgCodeOverride: effectiveOrgCode, forceUpdate: forceUpdate as boolean });
      
      const summary = (syncResults as { summary: { successfulSyncs: number; failedSyncs: number } }).summary;
      return {
        success: true,
        data: syncResults,
        message: `Sync completed: ${summary.successfulSyncs} successful, ${summary.failedSyncs} failed`
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error syncing all users:', error);
      return reply.code(500).send({
        error: 'Failed to sync users',
        message: error.message
      });
    }
  });

  // Sync users for a specific application
  fastify.post('/sync/application/:appCode', {
    preHandler: requirePermissions([PERMISSIONS.CRM_SYSTEM_USERS_UPDATE]),
    schema: {
      tags: ['User Sync'],
      description: 'Synchronizes users who have access to the specified application'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const { appCode } = params;
      const req = request as FastifyRequest & { userContext?: { tenantId?: string; kindeOrgId?: string }; body?: Record<string, unknown> };
      const tenantId = req.userContext?.tenantId;
      const body = (request.body as Record<string, unknown>) || {};
      const { syncType = 'full', orgCode, forceUpdate = false } = body;
      const effectiveOrgCode = (orgCode as string) || req.userContext?.kindeOrgId || null;
      
      console.log(`🔄 Syncing users for application ${appCode}`);
      if (!orgCode && effectiveOrgCode) {
        console.log('🏢 Using orgCode from userContext.kindeOrgId:', effectiveOrgCode);
      }
      
      const syncResult = await UserSyncService.syncUsersForApplication(tenantId as string, appCode, { syncType: syncType as string, orgCodeOverride: effectiveOrgCode, forceUpdate: forceUpdate as boolean });
      
      const sr = syncResult as { skipped?: boolean; userCount?: number };
      return {
        success: true,
        data: syncResult,
        message: sr.skipped 
          ? `No users to sync for ${appCode}` 
          : `Successfully synced ${sr.userCount || 0} users to ${appCode}`
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error syncing users for application:', error);
      return reply.code(500).send({
        error: 'Failed to sync users for application',
        message: error.message
      });
    }
  });

  // Sync a specific user to their allowed applications
  fastify.post('/sync/user/:userId', {
    preHandler: requirePermissions([PERMISSIONS.CRM_SYSTEM_USERS_UPDATE]),
    schema: {
      tags: ['User Sync'],
      description: 'Synchronizes a specific user to all applications they have access to'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const { userId } = params;
      const req = request as FastifyRequest & { userContext?: { tenantId?: string; kindeOrgId?: string }; body?: Record<string, unknown> };
      const tenantId = req.userContext?.tenantId;
      const body = (request.body as Record<string, unknown>) || {};
      const { syncType = 'update', orgCode, forceUpdate = false } = body;
      const effectiveOrgCode = (orgCode as string) || req.userContext?.kindeOrgId || null;
      
      console.log(`🔄 Syncing user ${userId} to applications`);
      if (!orgCode && effectiveOrgCode) {
        console.log('🏢 Using orgCode from userContext.kindeOrgId:', effectiveOrgCode);
      }
      
      const syncResults = await UserSyncService.syncUserToApplications(userId, tenantId as string, { syncType: syncType as string, orgCodeOverride: effectiveOrgCode, forceUpdate: forceUpdate as boolean });
      
      const sum = (syncResults as { summary?: { successfulSyncs?: number } })?.summary;
      return {
        success: true,
        data: syncResults,
        message: `User synced to ${sum?.successfulSyncs ?? 0} applications`
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error syncing user to applications:', error);
      return reply.code(500).send({
        error: 'Failed to sync user to applications',
        message: error.message
      });
    }
  });

  // Refresh user classification (when roles change)
  fastify.post('/refresh/:userId', {
    preHandler: requirePermissions([PERMISSIONS.CRM_SYSTEM_USERS_UPDATE]),
    schema: {
      tags: ['User Management'],
      description: 'Refreshes a users application access classification after role or permission changes'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const { userId } = params;
      const req = request as FastifyRequest & { userContext?: { tenantId?: string }; body?: Record<string, unknown> };
      const tenantId = req.userContext?.tenantId;
      const body = (request.body as Record<string, unknown>) || {};
      const { autoSync = true, previousApps = [] } = body;
      
      console.log(`🔄 Refreshing classification for user ${userId}`);
      
      // Refresh user classification
      const userClassification = await UserClassificationService.refreshUserClassification(userId, tenantId);
      
      if (!userClassification) {
        return reply.code(404).send({
          error: 'User not found',
          message: 'User not found in tenant'
        });
      }

      const result: { success: boolean; data: { userClassification: unknown; syncResults: unknown; removalResults: unknown }; message: string } = {
        success: true,
        data: {
          userClassification,
          syncResults: null,
          removalResults: null
        },
        message: 'User classification refreshed'
      };

      if (autoSync) {
        console.log('🔄 Auto-syncing user after classification refresh');
        
        // Sync user to their current applications
        const syncResults = await UserSyncService.syncUserToApplications(userId, tenantId as string, { syncType: 'update' });
        result.data.syncResults = syncResults;
        
        // Remove user from applications they no longer have access to
        const currentApps = (userClassification as { allowedApplications?: string[] }).allowedApplications ?? [];
        const removedApps = (previousApps as string[]).filter((app: string) => !currentApps.includes(app));
        
        if (removedApps.length > 0) {
          console.log(`🗑️ Removing user from ${removedApps.length} applications`);
          const removalResults = await UserSyncService.removeUserFromApplications(userId, tenantId as string, removedApps);
          result.data.removalResults = removalResults;
        }
        
        const syncSummary = (syncResults as { summary?: { successfulSyncs?: number } })?.summary;
        result.message = `User classification refreshed and synced to ${syncSummary?.successfulSyncs ?? 0} applications`;
      }
      
      return result;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error refreshing user classification:', error);
      return reply.code(500).send({
        error: 'Failed to refresh user classification',
        message: error.message
      });
    }
  });

  // Get sync status for the tenant
  fastify.get('/status', {
    // Add route debugging
    config: {
      routeId: 'user-sync-status'
    } as Record<string, unknown>,
    preHandler: requirePermissions([PERMISSIONS.CRM_SYSTEM_USERS_READ]),
    schema: {
      tags: ['User Sync'],
      description: 'Returns the current sync status and configuration for the tenant'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as FastifyRequest & { userContext?: { tenantId?: string }; routeConfig?: { routeId?: string } };
      console.log('🎯 STATUS ENDPOINT CALLED!');
      console.log('📊 Request details:', {
        method: request.method,
        url: request.url,
        routeId: req.routeConfig?.routeId,
        headers: request.headers
      });
      
      const tenantId = req.userContext?.tenantId;
      
      console.log(`📊 Getting sync status for tenant ${tenantId}`);
      
      const status = await UserSyncService.getSyncStatus(tenantId as string);
      
      return {
        success: true,
        data: status,
        message: 'Sync status retrieved successfully'
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error getting sync status:', error);
      return reply.code(500).send({
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  });

}
