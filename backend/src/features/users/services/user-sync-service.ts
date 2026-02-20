import axios from 'axios';
import jwt from 'jsonwebtoken';
import { UserClassificationService } from './user-classification-service.js';
import { db } from '../../../db/index.js';
import { eq, and } from 'drizzle-orm';
import { tenants } from '../../../db/schema/index.js';

/**
 * 🔄 User Sync Service
 * 
 * This service handles synchronization of users to different applications
 * based on their classification and application access.
 */
export class UserSyncService {

  // Application URLs configuration
  static APP_URLS = {
    crm: process.env.CRM_APP_URL || 'https://crm.zopkit.com',
    hr: process.env.HR_APP_URL || 'http://localhost:3003',
    affiliate: process.env.AFFILIATE_APP_URL || 'http://localhost:3004',
    system: process.env.SYSTEM_APP_URL || 'http://localhost:3007',
    accounting: process.env.ACCOUNTING_APP_URL || 'http://localhost:3005',
    inventory: process.env.INVENTORY_APP_URL || 'http://localhost:3006'
  };

  // JWT configuration for wrapper authentication
  static WRAPPER_SECRET_KEY = process.env.WRAPPER_SECRET_KEY || 'your-wrapper-secret-key';
  static WRAPPER_ORG_CODE = process.env.WRAPPER_ORG_CODE || 'wrapper-org';

  /**
   * Generate JWT token for wrapper authentication
   * @param {string} orgCode - Organization code
   * @returns {string} JWT token
   */
  static generateWrapperToken(orgCode: string | null = null): string {
    const payload = {
      sub: 'wrapper-service',
      iss: 'wrapper.zopkit.com',
      role: 'admin',
      org_code: orgCode || this.WRAPPER_ORG_CODE,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
    };

    return jwt.sign(payload, this.WRAPPER_SECRET_KEY as string);
  }

  /**
   * Transform user data to CRM format
   * @param {Object} user - User object from classification
   * @param {string} orgCode - Organization code
   * @returns {Object} CRM formatted user object
   */
  static transformUserToCRMFormat(user: Record<string, unknown>, orgCode: string): Record<string, unknown> {
    // Extract first and last name from full name
    const nameParts = String(user.name ?? '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Normalize zone to a string per CRM API (README spec)
    const zoneSource = user.zone !== undefined ? user.zone : user.zones;
    const zone = Array.isArray(zoneSource)
      ? (zoneSource[0] || '')
      : (zoneSource || '');

    return {
      externalId: user.kindeUserId || user.userId,
      email: user.email,
      firstName,
      lastName,
      mobile: user.contactMobile || user.phone || '',
      designation: user.title || user.designation || '',
      zone,
      isActive: user.isActive !== false,
      orgCode: orgCode,
      metadata: user.metadata || {}
    };
  }

  /**
   * Sync all users in a tenant to their respective applications
   * @param {string} tenantId - The tenant ID
   * @param {Object} options - Sync options
   * @returns {Object} Sync results
   */
  static async syncAllUsersForTenant(tenantId: string, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    try {
      console.log('🔄 Starting full user sync for tenant:', tenantId);

      // Get tenant information - only select columns we need
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          adminEmail: tenants.adminEmail,
          isActive: tenants.isActive,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Classify users by application
      const classification = await UserClassificationService.classifyUsersByApplication(tenantId);
      const classificationSummary = classification.summary as { totalUsers: number };

      const syncResults: Record<string, unknown> = {
        tenantId,
        organizationName: tenant.companyName,
        syncStartTime: new Date().toISOString(),
        syncResults: {} as Record<string, unknown>,
        summary: {
          totalUsers: classificationSummary.totalUsers,
          applicationsProcessed: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          skippedSyncs: 0
        },
        errors: [] as Array<{ application: string; error: string }>
      };

      // Sync users to each application they have access to
      const byApplication = classification.byApplication as Record<string, { totalUsers: number; users: Record<string, unknown>[] }>;
      const applications = Object.keys(byApplication);
      
      for (const appCode of applications) {
        const appData = byApplication[appCode];
        
        if (appData.totalUsers === 0) {
          console.log(`⏭️ Skipping ${appCode} - no users have access`);
          (syncResults.syncResults as Record<string, unknown>)[appCode] = {
            skipped: true,
            reason: 'No users have access to this application',
            userCount: 0
          };
          (syncResults.summary as Record<string, number>).skippedSyncs++;
          continue;
        }

        console.log(`🔄 Syncing ${appData.totalUsers} users to ${appCode}`);
        
        try {
          const appSyncResult = await this.syncUsersToApplication(
            appCode, 
            appData.users, 
            tenant,
            { ...options, forceUpdate: options.forceUpdate }
          );
          
          (syncResults.syncResults as Record<string, unknown>)[appCode] = appSyncResult;
          (syncResults.summary as Record<string, number>).applicationsProcessed++;
          
          if ((appSyncResult as Record<string, unknown>).success) {
            (syncResults.summary as Record<string, number>).successfulSyncs++;
          } else {
            (syncResults.summary as Record<string, number>).failedSyncs++;
          }

        } catch (err: unknown) {
          const error = err as Error;
          console.error(`❌ Failed to sync users to ${appCode}:`, error);
          (syncResults.syncResults as Record<string, unknown>)[appCode] = {
            success: false,
            error: error.message,
            userCount: appData.totalUsers
          };
          (syncResults.errors as Array<{ application: string; error: string }>).push({
            application: appCode,
            error: error.message
          });
          (syncResults.summary as Record<string, number>).failedSyncs++;
        }
      }

      const syncEndTime = new Date().toISOString();
      syncResults.syncEndTime = syncEndTime;
      syncResults.duration = new Date(syncEndTime).getTime() - new Date(syncResults.syncStartTime as string).getTime();

      console.log('✅ User sync completed:', syncResults.summary);
      return syncResults;

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error in full user sync:', error);
      throw error;
    }
  }


  /**
   * Sync users to a specific application
   * @param {string} appCode - Application code
   * @param {Array} users - Users to sync
   * @param {Object} tenant - Tenant information
   * @param {Object} options - Sync options
   * @returns {Object} Sync result for the application
   */
  static async syncUsersToApplication(appCode: string, users: Record<string, unknown>[], tenant: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    try {
      const appUrls = this.APP_URLS as Record<string, string>;
      const appUrl = appUrls[appCode];
      if (!appUrl) {
        throw new Error(`Application URL not configured for ${appCode}`);
      }

      console.log(`📤 Syncing ${users.length} users to ${appCode} at ${appUrl}`);

      // Generate JWT token for authentication (align org_code with Kinde org, allow override)
      const effectiveOrgCode = String(options.orgCodeOverride ?? tenant.kindeOrgId ?? tenant.subdomain ?? tenant.tenantId ?? '');
      const wrapperToken = this.generateWrapperToken(effectiveOrgCode);

      // Transform users to CRM format with aligned orgCode
      const crmUsers = users.map(user => this.transformUserToCRMFormat(user, effectiveOrgCode));

      // Determine sync mode based on sync type
      const syncMode = options.syncType === 'full' ? 'full-reconcile' : 'upsert';
      
      // For CRM, always use upsert to ensure orgCode updates
      const finalSyncMode = appCode === 'crm' ? 'upsert' : syncMode;

      // Prepare sync payload according to CRM API specification
      const syncPayload = {
        mode: finalSyncMode,
        orgCode: effectiveOrgCode,  // Include orgCode in body as fallback
        users: crmUsers
      };
      
      console.log('🔄 Sync payload:', syncPayload);

      // Add forceUpdate flag for CRM to ensure orgCode changes are applied
      if (appCode === 'crm' && options.forceUpdate) {
        (syncPayload as Record<string, unknown>).forceUpdate = true;
      }

      console.log(`🔄 Sending ${finalSyncMode} sync for ${crmUsers.length} users to ${appCode}`);
      console.log(`📋 Sync payload orgCode: ${effectiveOrgCode}`);
      console.log(`🔑 JWT token org_code: ${effectiveOrgCode}`);

      // Choose the correct endpoint based on application
      let endpoint;
      if (appCode === 'crm') {
        // Use CRM-specific endpoint
        endpoint = `${appUrl}/api/admin/users/sync`;
      } else {
        // Use generic internal sync endpoint for other apps
        endpoint = `${appUrl}/api/internal/sync/users`;
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (appCode === 'crm') {
        headers['Authorization'] = `Bearer ${wrapperToken}`;
      } else {
        headers['X-Internal-API-Key'] = process.env.INTERNAL_API_KEY || 'default-internal-key';
        headers['X-Tenant-ID'] = String(tenant.tenantId);
        headers['X-Sync-Source'] = 'wrapper-user-sync-service';
      }

      // Send sync request to application
      const response = await axios.post(endpoint, syncPayload, {
        headers,
        timeout: 30000 // 30 seconds
      });

      const result = {
        success: true,
        userCount: users.length,
        response: response.data,
        statusCode: response.status,
        syncedAt: new Date().toISOString(),
        applicationUrl: appUrl,
        endpoint: endpoint,
        syncMode: finalSyncMode
      };

      console.log(`✅ Successfully synced ${users.length} users to ${appCode} (${finalSyncMode} mode)`);
      return result;

    } catch (err: unknown) {
      const error = err as Error & { response?: { status?: number; data?: unknown }; code?: string };
      console.error(`❌ Error syncing users to ${appCode}:`, error);
      
      const result: Record<string, unknown> = {
        success: false,
        userCount: users.length,
        error: error.message,
        statusCode: error.response?.status,
        errorDetails: error.response?.data,
        syncedAt: new Date().toISOString(),
        applicationUrl: (this.APP_URLS as Record<string, string>)[appCode]
      };

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        result.warning = 'Application not available - this may be normal if the app is not deployed';
        console.log(`⚠️ Application ${appCode} not available - this may be normal`);
      }

      return result;
    }
  }

  /**
   * Sync a single user to all their allowed applications
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Sync options
   * @returns {Object} Sync results
   */
  static async syncUserToApplications(userId: string, tenantId: string, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    try {
      console.log('🔄 Syncing single user to applications:', { userId, tenantId });

      // Get user classification
      const userAccess = await UserClassificationService.getUserApplicationAccess(userId, tenantId);
      
      if (!userAccess) {
        throw new Error('User not found or has no application access');
      }

      // Get tenant information - only select columns we need
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          adminEmail: tenants.adminEmail,
          isActive: tenants.isActive,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const userAccessObj = userAccess as Record<string, unknown>;
      const syncResults: Record<string, unknown> = {
        userId,
        email: userAccessObj.email,
        allowedApplications: userAccessObj.allowedApplications as string[],
        syncResults: {} as Record<string, unknown>,
        summary: {
          applicationsProcessed: 0,
          successfulSyncs: 0,
          failedSyncs: 0
        }
      };

      // Sync to each allowed application
      for (const appCode of (userAccessObj.allowedApplications as string[])) {
        try {
          console.log(`🔄 Syncing user ${userAccessObj.email} to ${appCode}`);
          
          const appSyncResult = await this.syncUsersToApplication(
            appCode,
            [userAccess as Record<string, unknown>],
            tenant as Record<string, unknown>,
            { ...options, syncType: 'single_user', forceUpdate: options.forceUpdate }
          );
          
          (syncResults.syncResults as Record<string, unknown>)[appCode] = appSyncResult;
          (syncResults.summary as Record<string, number>).applicationsProcessed++;
          
          if ((appSyncResult as Record<string, unknown>).success) {
            (syncResults.summary as Record<string, number>).successfulSyncs++;
          } else {
            (syncResults.summary as Record<string, number>).failedSyncs++;
          }

        } catch (err: unknown) {
          const error = err as Error;
          console.error(`❌ Failed to sync user to ${appCode}:`, error);
          (syncResults.syncResults as Record<string, unknown>)[appCode] = {
            success: false,
            error: error.message
          };
          (syncResults.summary as Record<string, number>).failedSyncs++;
        }
      }

      console.log('✅ Single user sync completed:', syncResults.summary);
      return syncResults;

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error in single user sync:', error);
      throw error;
    }
  }

  /**
   * Sync users for a specific application only
   */
  static async syncUsersForApplication(tenantId: string, appCode: string, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    try {
      console.log(`🔄 Syncing users for application ${appCode} in tenant ${tenantId}`);

      // Get users for this specific application
      const appUsers = await UserClassificationService.getUsersForApplication(tenantId, appCode);
      
      if ((appUsers as Record<string, unknown>).totalUsers === 0) {
        return {
          success: true,
          skipped: true,
          reason: 'No users have access to this application',
          userCount: 0,
          application: appCode
        };
      }

      // Get tenant information - only select columns we need
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          adminEmail: tenants.adminEmail,
          isActive: tenants.isActive,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const appUsersTyped = appUsers as { users: Record<string, unknown>[] };
      const syncResult = await this.syncUsersToApplication(
        appCode,
        appUsersTyped.users,
        tenant as Record<string, unknown>,
        { ...options, syncType: 'application_specific', forceUpdate: options.forceUpdate }
      );

      console.log(`✅ Application-specific sync completed for ${appCode}`);
      return syncResult;

    } catch (err: unknown) {
      const error = err as Error;
      console.error(`❌ Error in application-specific sync for ${appCode}:`, error);
      throw error;
    }
  }

  /**
   * Remove user access from applications they no longer have permissions for
   */
  static async removeUserFromApplications(userId: string, tenantId: string, removedApps: string[]): Promise<Record<string, unknown>> {
    try {
      console.log('🗑️ Removing user from applications:', { userId, removedApps });

      // Get tenant information - only select columns we need
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          adminEmail: tenants.adminEmail,
          isActive: tenants.isActive,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const removalResults: { userId: string; removedFromApps: string[]; results: Record<string, unknown>; summary: Record<string, number> } = {
        userId,
        removedFromApps: removedApps,
        results: {},
        summary: {
          applicationsProcessed: 0,
          successfulRemovals: 0,
          failedRemovals: 0
        }
      };

      // Remove from each application
      for (const appCode of removedApps) {
        try {
          const appUrl = (this.APP_URLS as Record<string, string>)[appCode];
          if (!appUrl) {
            throw new Error(`Application URL not configured for ${appCode}`);
          }

          const removalData = {
            operation: 'user_removal',
            tenant: {
              id: tenant.tenantId,
              name: tenant.companyName
            },
            userId: userId,
            removedAt: new Date().toISOString(),
            reason: 'Access permissions changed'
          };

          const response = await axios.post(`${appUrl}/api/internal/sync/remove-user`, removalData, {
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'default-internal-key',
              'X-Tenant-ID': tenant.tenantId
            },
            timeout: 15000
          });

          removalResults.results[appCode] = {
            success: true,
            response: response.data,
            statusCode: response.status
          };
          removalResults.summary.successfulRemovals++;

        } catch (err: unknown) {
          const error = err as Error & { response?: { status?: number } };
          console.error(`❌ Failed to remove user from ${appCode}:`, error);
          removalResults.results[appCode] = {
            success: false,
            error: error.message,
            statusCode: error.response?.status
          };
          removalResults.summary.failedRemovals++;
        }

        removalResults.summary.applicationsProcessed++;
      }

      console.log('✅ User removal from applications completed:', removalResults.summary);
      return removalResults;

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error removing user from applications:', error);
      throw error;
    }
  }

  /**
   * Get sync status for a tenant
   */
  static async getSyncStatus(tenantId: string): Promise<Record<string, unknown>> {
    try {
      console.log('🔍 getSyncStatus: Starting for tenant:', tenantId);
      
      const classification = await UserClassificationService.classifyUsersByApplication(tenantId);
      
      const summary = classification.summary as { totalUsers: number; applicationBreakdown?: Record<string, number> };
      const byApplication = classification.byApplication as Record<string, unknown>;
      const byUser = classification.byUser as Record<string, unknown>;
      console.log('🔍 getSyncStatus: Classification result:', {
        totalUsers: summary.totalUsers,
        applicationBreakdown: summary.applicationBreakdown,
        byApplicationKeys: Object.keys(byApplication),
        byUserKeys: Object.keys(byUser)
      });
      
      const byApp = classification.byApplication as Record<string, { totalUsers: number }>;
      const status: Record<string, unknown> = {
        tenantId,
        lastClassified: new Date().toISOString(),
        summary,
        applicationStatus: {} as Record<string, unknown>
      };

      const applications = Object.keys(byApp);
      console.log('🔍 getSyncStatus: Applications found:', applications);
      
      for (const appCode of applications) {
        const appData = byApp[appCode];
        const appUrl = (this.APP_URLS as Record<string, string>)[appCode];
        
        (status.applicationStatus as Record<string, unknown>)[appCode] = {
          userCount: appData.totalUsers,
          applicationUrl: appUrl,
          isConfigured: !!appUrl,
          lastSyncAttempt: null, // Could be stored in database for tracking
          status: 'ready' // Could be determined by health check
        };
      }
      
      console.log('🔍 getSyncStatus: Final status:', {
        tenantId: status.tenantId,
        summaryKeys: Object.keys((status.summary as object) || {}),
        applicationStatusKeys: Object.keys((status.applicationStatus as object) || {})
      });

      return status;

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error getting sync status:', error);
      throw error;
    }
  }

  /**
   * Test connectivity to external applications
   */
  static async testApplicationConnectivity(appCode: string | null = null): Promise<Record<string, unknown>> {
    try {
      console.log('🔗 Testing application connectivity...', appCode ? `for ${appCode}` : 'for all apps');
      
      const appsToTest = appCode ? [appCode] : Object.keys(this.APP_URLS);
      const results: { timestamp: string; results: Record<string, unknown>; summary: Record<string, number> } = {
        timestamp: new Date().toISOString(),
        results: {},
        summary: {
          total: appsToTest.length,
          successful: 0,
          failed: 0
        }
      };

      let startTime = 0;
      for (const app of appsToTest) {
        const appUrl = (this.APP_URLS as Record<string, string>)[app];
        
        if (!appUrl) {
          results.results[app] = {
            success: false,
            error: 'Application URL not configured',
            url: null,
            responseTime: null
          };
          results.summary.failed++;
          continue;
        }

        try {
          startTime = Date.now() as number;
          
          // Test basic connectivity with health check endpoint
          const response = await axios.get(`${appUrl}/api/health`, {
            timeout: 10000,
            headers: {
              'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'default-internal-key'
            }
          });
          
          const responseTime = Date.now() - startTime;
          
          results.results[app] = {
            success: true,
            url: appUrl,
            statusCode: response.status,
            responseTime: responseTime,
            data: response.data,
            message: 'Connection successful'
          };
          results.summary.successful++;
          
        } catch (err: unknown) {
          const error = err as Error & { response?: { status?: number }; code?: string };
          const responseTime = Date.now() - startTime;
          
          results.results[app] = {
            success: false,
            url: appUrl,
            error: error.message,
            statusCode: error.response?.status || null,
            responseTime: responseTime,
            message: error.code === 'ECONNREFUSED' ? 'Connection refused - application may be down' : 'Connection failed'
          };
          results.summary.failed++;
        }
      }

      console.log('✅ Connectivity test completed:', {
        total: results.summary.total,
        successful: results.summary.successful,
        failed: results.summary.failed
      });

      return results;
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error testing connectivity:', error);
      throw error;
    }
  }
}
