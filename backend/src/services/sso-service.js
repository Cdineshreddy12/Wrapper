import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { 
  applications, 
  organizationApplications, 
  userApplicationPermissions,
  ssoTokens,
  activityLogs 
} from '../db/schema/suite-schema.js';
import { tenantUsers } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

class SSOService {
  
  /**
   * Generate SSO token for app access
   */
  async generateSSOToken(userId, appCode, orgId, requestInfo = {}) {
    try {
      console.log('🔐 Generating SSO token:', { userId, appCode, orgId });

      // Get application details
      const [app] = await db
        .select()
        .from(applications)
        .where(eq(applications.appCode, appCode))
        .limit(1);

      if (!app) {
        throw new Error(`Application '${appCode}' not found`);
      }

      // Get user details
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Check if organization has access to this application
      const [orgApp] = await db
        .select()
        .from(organizationApplications)
        .where(and(
          eq(organizationApplications.tenantId, orgId),
          eq(organizationApplications.appId, app.appId),
          eq(organizationApplications.isEnabled, true)
        ))
        .limit(1);

      if (!orgApp) {
        throw new Error(`Organization does not have access to ${app.appName}`);
      }

      // Get user permissions for this app
      const userPermissions = await db
        .select()
        .from(userApplicationPermissions)
        .where(and(
          eq(userApplicationPermissions.userId, userId),
          eq(userApplicationPermissions.appId, app.appId),
          eq(userApplicationPermissions.isActive, true)
        ));

      // Create token payload
      const tokenPayload = {
        // Standard JWT claims
        iss: 'wrapper-sso',
        sub: userId,
        aud: app.appCode,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 hours
        
        // User information
        userId: user.userId,
        kindeUserId: user.kindeUserId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        
        // Organization context
        organizationId: orgId,
        organizationCode: orgApp.subscriptionTier,
        
        // Application context
        appId: app.appId,
        appCode: app.appCode,
        appVersion: app.version,
        
        // Permissions
        permissions: userPermissions.reduce((acc, perm) => {
          acc[perm.moduleId] = perm.permissions;
          return acc;
        }, {}),
        
        // Organization app settings
        enabledModules: orgApp.enabledModules || [],
        maxUsers: orgApp.maxUsers,
        subscriptionTier: orgApp.subscriptionTier,
        
        // Additional metadata
        isAdmin: user.isTenantAdmin,
        isActive: user.isActive,
        loginTime: new Date().toISOString()
      };

      // Sign the token
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        algorithm: 'HS256'
      });

      // Store token in database for tracking
      const expiresAt = new Date(tokenPayload.exp * 1000);
      await db.insert(ssoTokens).values({
        userId,
        appId: app.appId,
        token,
        expiresAt
      });

      // Log the authentication
      await this.logActivity(userId, orgId, app.appId, 'sso_token_generated', {
        appCode: app.appCode,
        requestInfo,
        expiresAt: expiresAt.toISOString()
      });

      console.log('✅ SSO token generated successfully');

      return {
        token,
        expiresAt,
        appInfo: {
          appId: app.appId,
          appCode: app.appCode,
          appName: app.appName,
          baseUrl: app.baseUrl
        },
        userInfo: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          isAdmin: user.isTenantAdmin
        }
      };

    } catch (error) {
      console.error('❌ SSO token generation failed:', error);
      throw error;
    }
  }

  /**
   * Validate SSO token from application
   */
  async validateSSOToken(token, appCode) {
    try {
      console.log('🔍 Validating SSO token for app:', appCode);

      // Verify JWT signature and decode
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      // Check if token is for the correct app
      if (payload.aud !== appCode) {
        throw new Error('Token not valid for this application');
      }

      // Check if token exists in database and is not revoked
      const [ssoToken] = await db
        .select()
        .from(ssoTokens)
        .where(and(
          eq(ssoTokens.token, token),
          eq(ssoTokens.isRevoked, false)
        ))
        .limit(1);

      if (!ssoToken) {
        throw new Error('Token not found or has been revoked');
      }

      // Check if token has expired
      if (new Date() > ssoToken.expiresAt) {
        throw new Error('Token has expired');
      }

      console.log('✅ SSO token validation successful');

      return {
        valid: true,
        payload,
        tokenInfo: ssoToken
      };

    } catch (error) {
      console.error('❌ SSO token validation failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke SSO token (logout from app)
   */
  async revokeSSOToken(token) {
    try {
      await db
        .update(ssoTokens)
        .set({ isRevoked: true })
        .where(eq(ssoTokens.token, token));

      console.log('✅ SSO token revoked');
      return { success: true };

    } catch (error) {
      console.error('❌ SSO token revocation failed:', error);
      throw error;
    }
  }

  /**
   * Get user's available applications
   */
  async getUserApplications(userId, orgId) {
    try {
      console.log('📱 Getting user applications:', { userId, orgId });

      const userApps = await db
        .select({
          appId: applications.appId,
          appCode: applications.appCode,
          appName: applications.appName,
          description: applications.description,
          icon: applications.icon,
          baseUrl: applications.baseUrl,
          isEnabled: organizationApplications.isEnabled,
          subscriptionTier: organizationApplications.subscriptionTier,
          enabledModules: organizationApplications.enabledModules
        })
        .from(applications)
        .innerJoin(
          organizationApplications,
          and(
            eq(organizationApplications.appId, applications.appId),
            eq(organizationApplications.tenantId, orgId),
            eq(organizationApplications.isEnabled, true)
          )
        )
        .where(eq(applications.status, 'active'));

      console.log(`✅ Found ${userApps.length} available applications`);
      return userApps;

    } catch (error) {
      console.error('❌ Failed to get user applications:', error);
      throw error;
    }
  }

  /**
   * Handle SSO redirect from application
   */
  async handleSSORedirect(appCode, returnTo, userContext, request) {
    try {
      console.log('🔄 Handling SSO redirect:', { appCode, returnTo });

      // Generate SSO token
      const ssoResult = await this.generateSSOToken(
        userContext.internalUserId,
        appCode,
        userContext.tenantId,
        {
          returnTo,
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip
        }
      );

      // Build redirect URL with token
      const redirectUrl = new URL(returnTo || '/', ssoResult.appInfo.baseUrl);
      redirectUrl.searchParams.set('sso_token', ssoResult.token);

      console.log('✅ SSO redirect prepared:', redirectUrl.toString());

      return {
        redirectUrl: redirectUrl.toString(),
        appInfo: ssoResult.appInfo,
        expiresAt: ssoResult.expiresAt
      };

    } catch (error) {
      console.error('❌ SSO redirect handling failed:', error);
      throw error;
    }
  }

  /**
   * Log user activity
   */
  async logActivity(userId, tenantId, appId, action, metadata = {}) {
    try {
      await db.insert(activityLogs).values({
        userId,
        tenantId,
        appId,
        action,
        metadata,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      });
    } catch (error) {
      console.error('❌ Failed to log activity:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivity(userId, limit = 50) {
    try {
      const activities = await db
        .select({
          logId: activityLogs.logId,
          action: activityLogs.action,
          appCode: applications.appCode,
          appName: applications.appName,
          metadata: activityLogs.metadata,
          createdAt: activityLogs.createdAt
        })
        .from(activityLogs)
        .leftJoin(applications, eq(activityLogs.appId, applications.appId))
        .where(eq(activityLogs.userId, userId))
        .orderBy(activityLogs.createdAt)
        .limit(limit);

      return activities;
    } catch (error) {
      console.error('❌ Failed to get user activity:', error);
      throw error;
    }
  }
}

export default new SSOService(); 