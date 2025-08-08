import { db } from '../db/index.js';
import { auditLogs, tenantUsers } from '../db/schema/users.js';
import { applications, activityLogs } from '../db/schema/suite-schema.js';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import Logger from '../utils/logger.js';

/**
 * Comprehensive Activity Logger Service
 * Tracks all user activities, system changes, and audit events
 */
class ActivityLogger {
  
  /**
   * Activity Types Constants
   */
  static ACTIVITY_TYPES = {
    // Authentication Activities
    AUTH_LOGIN: 'auth.login',
    AUTH_LOGOUT: 'auth.logout',
    AUTH_TOKEN_REFRESH: 'auth.token_refresh',
    AUTH_PASSWORD_CHANGE: 'auth.password_change',
    AUTH_FAILED_LOGIN: 'auth.failed_login',
    
    // User Management Activities
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_INVITED: 'user.invited',
    USER_INVITATION_ACCEPTED: 'user.invitation_accepted',
    USER_ACTIVATED: 'user.activated',
    USER_DEACTIVATED: 'user.deactivated',
    USER_PROMOTED: 'user.promoted',
    USER_DEMOTED: 'user.demoted',
    USER_PROFILE_UPDATED: 'user.profile_updated',
    
    // Role Management Activities
    ROLE_CREATED: 'role.created',
    ROLE_UPDATED: 'role.updated',
    ROLE_DELETED: 'role.deleted',
    ROLE_ASSIGNED: 'role.assigned',
    ROLE_REMOVED: 'role.removed',
    ROLE_PERMISSIONS_CHANGED: 'role.permissions_changed',
    ROLE_CLONED: 'role.cloned',
    
    // Permission Activities
    PERMISSION_GRANTED: 'permission.granted',
    PERMISSION_REVOKED: 'permission.revoked',
    PERMISSION_MODIFIED: 'permission.modified',
    
    // Application Activities
    APP_ACCESSED: 'app.accessed',
    APP_SSO_LOGIN: 'app.sso_login',
    APP_ENABLED: 'app.enabled',
    APP_DISABLED: 'app.disabled',
    APP_SETTINGS_CHANGED: 'app.settings_changed',
    
    // System Activities
    SYSTEM_SETTINGS_CHANGED: 'system.settings_changed',
    SYSTEM_BACKUP_CREATED: 'system.backup_created',
    SYSTEM_MAINTENANCE: 'system.maintenance',
    
    // Billing Activities
    BILLING_SUBSCRIPTION_CREATED: 'billing.subscription_created',
    BILLING_SUBSCRIPTION_UPDATED: 'billing.subscription_updated',
    BILLING_SUBSCRIPTION_CANCELLED: 'billing.subscription_cancelled',
    BILLING_PAYMENT_SUCCESS: 'billing.payment_success',
    BILLING_PAYMENT_FAILED: 'billing.payment_failed',
    
    // Data Activities
    DATA_EXPORT: 'data.export',
    DATA_IMPORT: 'data.import',
    DATA_BULK_UPDATE: 'data.bulk_update',
    DATA_BULK_DELETE: 'data.bulk_delete',
    
    // Security Activities
    SECURITY_BREACH_ATTEMPT: 'security.breach_attempt',
    SECURITY_ACCESS_DENIED: 'security.access_denied',
    SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  };

  /**
   * Resource Types Constants
   */
  static RESOURCE_TYPES = {
    USER: 'user',
    ROLE: 'role',
    PERMISSION: 'permission',
    APPLICATION: 'application',
    TENANT: 'tenant',
    SUBSCRIPTION: 'subscription',
    PAYMENT: 'payment',
    SYSTEM: 'system',
    SESSION: 'session',
    INVITATION: 'invitation',
  };

  /**
   * Log user activity (for general activities like app access, login, etc.)
   */
  async logActivity(userId, tenantId, appId, action, metadata = {}, requestContext = {}) {
    const requestId = Logger.generateRequestId('activity-log');
    
    try {
      Logger.activity.log(requestId, action, 'activity', `${userId}:${appId}`, {
        userId,
        tenantId,
        appId,
        action,
        metadata,
        requestContext: {
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          sessionId: requestContext.sessionId
        }
      });
      
      const activityData = {
        userId,
        tenantId,
        appId,
        action,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          sessionId: requestContext.sessionId,
          requestId: requestId
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      };

      await db.insert(activityLogs).values(activityData);

      console.log(`✅ [${requestId}] Activity logged successfully: ${action} for user ${userId}`);
      return { success: true, requestId };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to log activity:`, {
        error: error.message,
        userId,
        tenantId,
        action,
        stack: error.stack
      });
      // Don't throw - logging failures shouldn't break main operations
      return { success: false, error: error.message, requestId };
    }
  }

  /**
   * Log audit event (for system changes, data modifications, security events)
   */
  async logAuditEvent(tenantId, userId, action, resourceType, resourceId, changes = {}, requestContext = {}) {
    const requestId = Logger.generateRequestId('audit-log');
    
    try {
      Logger.activity.log(requestId, action, resourceType, resourceId, {
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        changes: {
          hasOldValues: !!changes.oldValues,
          hasNewValues: !!changes.newValues,
          detailsCount: Object.keys(changes.details || {}).length
        },
        requestContext: {
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          sessionId: requestContext.sessionId,
          source: requestContext.source || 'web'
        }
      });
      
      const auditData = {
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        oldValues: changes.oldValues || null,
        newValues: changes.newValues || null,
        details: {
          ...changes.details,
          timestamp: new Date().toISOString(),
          sessionId: requestContext.sessionId,
          source: requestContext.source || 'web',
          requestId: requestId
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      };

      await db.insert(auditLogs).values(auditData);

      console.log(`✅ [${requestId}] Audit event logged successfully: ${action} on ${resourceType}:${resourceId} by user ${userId}`);
      return { success: true, requestId };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to log audit event:`, {
        error: error.message,
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        stack: error.stack
      });
      return { success: false, error: error.message, requestId };
    }
  }

  /**
   * Get user activity logs with filtering and pagination
   */
  async getUserActivity(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        startDate,
        endDate,
        actionFilter,
        appFilter,
        includeMetadata = true
      } = options;

      let query = db
        .select({
          logId: activityLogs.logId,
          action: activityLogs.action,
          appCode: applications.appCode,
          appName: applications.appName,
          metadata: includeMetadata ? activityLogs.metadata : sql`NULL`,
          ipAddress: activityLogs.ipAddress,
          createdAt: activityLogs.createdAt
        })
        .from(activityLogs)
        .leftJoin(applications, eq(activityLogs.appId, applications.appId))
        .where(eq(activityLogs.userId, userId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset);

      // Apply filters
      const conditions = [eq(activityLogs.userId, userId)];
      
      if (startDate) {
        conditions.push(gte(activityLogs.createdAt, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(activityLogs.createdAt, endDate));
      }
      
      if (actionFilter) {
        conditions.push(eq(activityLogs.action, actionFilter));
      }
      
      if (appFilter) {
        conditions.push(eq(applications.appCode, appFilter));
      }

      if (conditions.length > 1) {
        query = query.where(and(...conditions));
      }

      const activities = await query;
      
      return {
        activities,
        pagination: {
          limit,
          offset,
          total: activities.length
        }
      };
    } catch (error) {
      console.error('❌ Failed to get user activity:', error);
      throw error;
    }
  }

  /**
   * Get tenant audit logs with filtering and pagination
   */
  async getTenantAuditLogs(tenantId, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        startDate,
        endDate,
        actionFilter,
        resourceTypeFilter,
        userFilter,
        includeDetails = true
      } = options;

      const conditions = [eq(auditLogs.tenantId, tenantId)];
      
      if (startDate) {
        conditions.push(gte(auditLogs.createdAt, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(auditLogs.createdAt, endDate));
      }
      
      if (actionFilter) {
        conditions.push(eq(auditLogs.action, actionFilter));
      }
      
      if (resourceTypeFilter) {
        conditions.push(eq(auditLogs.resourceType, resourceTypeFilter));
      }
      
      if (userFilter) {
        conditions.push(eq(auditLogs.userId, userFilter));
      }

      const logs = await db
        .select({
          logId: auditLogs.logId,
          userId: auditLogs.userId,
          userName: tenantUsers.name,
          userEmail: tenantUsers.email,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          oldValues: includeDetails ? auditLogs.oldValues : sql`NULL`,
          newValues: includeDetails ? auditLogs.newValues : sql`NULL`,
          details: includeDetails ? auditLogs.details : sql`NULL`,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt
        })
        .from(auditLogs)
        .leftJoin(tenantUsers, eq(auditLogs.userId, tenantUsers.userId))
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql`count(*)` })
        .from(auditLogs)
        .where(and(...conditions));

      const total = parseInt(totalCountResult[0]?.count || 0);

      return {
        logs,
        pagination: {
          limit,
          offset,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Failed to get tenant audit logs:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics for dashboard
   */
  async getActivityStats(tenantId, period = '24h') {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Get activity counts by type
      const activityStats = await db
        .select({
          action: activityLogs.action,
          count: sql`count(*)`.as('count')
        })
        .from(activityLogs)
        .where(and(
          eq(activityLogs.tenantId, tenantId),
          gte(activityLogs.createdAt, startDate)
        ))
        .groupBy(activityLogs.action);

      // Get audit event counts
      const auditStats = await db
        .select({
          resourceType: auditLogs.resourceType,
          action: auditLogs.action,
          count: sql`count(*)`.as('count')
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.tenantId, tenantId),
          gte(auditLogs.createdAt, startDate)
        ))
        .groupBy(auditLogs.resourceType, auditLogs.action);

      // Get unique active users
      const activeUsersResult = await db
        .select({
          uniqueUsers: sql`count(distinct user_id)`.as('uniqueUsers')
        })
        .from(activityLogs)
        .where(and(
          eq(activityLogs.tenantId, tenantId),
          gte(activityLogs.createdAt, startDate)
        ));

      const uniqueActiveUsers = parseInt(activeUsersResult[0]?.uniqueUsers || 0);

      return {
        period,
        startDate,
        endDate: now,
        uniqueActiveUsers,
        activityBreakdown: activityStats.map(stat => ({
          action: stat.action,
          count: parseInt(stat.count)
        })),
        auditBreakdown: auditStats.map(stat => ({
          resourceType: stat.resourceType,
          action: stat.action,
          count: parseInt(stat.count)
        }))
      };
    } catch (error) {
      console.error('❌ Failed to get activity stats:', error);
      throw error;
    }
  }

  /**
   * Helper method to create request context from request object
   */
  createRequestContext(request, sessionId = null) {
    return {
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress,
      userAgent: request.headers['user-agent'],
      sessionId: sessionId || request.headers['x-session-id'],
      source: request.headers['x-source'] || 'web'
    };
  }

  /**
   * Batch log multiple activities (for bulk operations)
   */
  async logBatchActivities(activities) {
    try {
      if (!activities || activities.length === 0) {
        return { success: true, count: 0 };
      }

      const activityData = activities.map(activity => ({
        ...activity,
        metadata: {
          ...activity.metadata,
          timestamp: new Date().toISOString(),
          batch: true,
        }
      }));

      await db.insert(activityLogs).values(activityData);

      console.log(`📊 Batch activities logged: ${activities.length} entries`);
      return { success: true, count: activities.length };
    } catch (error) {
      console.error('❌ Failed to log batch activities:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch log multiple audit events (for bulk operations)
   */
  async logBatchAuditEvents(auditEvents) {
    try {
      if (!auditEvents || auditEvents.length === 0) {
        return { success: true, count: 0 };
      }

      const auditData = auditEvents.map(event => ({
        ...event,
        details: {
          ...event.details,
          timestamp: new Date().toISOString(),
          batch: true,
        }
      }));

      await db.insert(auditLogs).values(auditData);

      console.log(`🔍 Batch audit events logged: ${auditEvents.length} entries`);
      return { success: true, count: auditEvents.length };
    } catch (error) {
      console.error('❌ Failed to log batch audit events:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create instance
const activityLogger = new ActivityLogger();

// Export the instance as default and also export the static constants
export default activityLogger;
export const ACTIVITY_TYPES = ActivityLogger.ACTIVITY_TYPES;
export const RESOURCE_TYPES = ActivityLogger.RESOURCE_TYPES; 