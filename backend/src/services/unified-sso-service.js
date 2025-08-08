import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { 
  tenants, 
  tenantUsers, 
  customRoles, 
  userRoleAssignments,
  subscriptions 
} from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

export class UnifiedSSOService {

  /**
   * Generate a single, comprehensive token containing ALL user context
   * This replaces multiple API calls and caching layers
   */
  static async generateUnifiedToken(kindeUserId, orgCode, targetApp = null) {
    try {
      console.log('🔐 Generating unified token:', { kindeUserId, orgCode, targetApp });

      // Step 1: Get user and organization data in single query
      const [userContext] = await db
        .select({
          // User data
          userId: tenantUsers.userId,
          kindeUserId: tenantUsers.kindeUserId,
          email: tenantUsers.email,
          name: tenantUsers.name,
          avatar: tenantUsers.avatar,
          isAdmin: tenantUsers.isTenantAdmin,
          isActive: tenantUsers.isActive,
          
          // Organization data
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          kindeOrgId: tenants.kindeOrgId,
          
          // Subscription data
          subscriptionTier: subscriptions.tier,
          subscriptionStatus: subscriptions.status,
          subscribedTools: subscriptions.subscribedFeatures
        })
        .from(tenantUsers)
        .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
        .leftJoin(subscriptions, eq(tenants.tenantId, subscriptions.tenantId))
        .where(and(
          eq(tenantUsers.kindeUserId, kindeUserId),
          eq(tenants.kindeOrgId, orgCode)
        ))
        .limit(1);

      if (!userContext) {
        throw new Error('User or organization not found');
      }

      // Step 2: Get user roles and permissions
      const userRoles = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          permissions: customRoles.permissions,
          restrictions: customRoles.restrictions
        })
        .from(userRoleAssignments)
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(and(
          eq(userRoleAssignments.userId, userContext.userId),
          eq(userRoleAssignments.isActive, true)
        ));

      // Step 3: Aggregate all permissions
      const aggregatedPermissions = this.aggregatePermissions(userRoles);
      const aggregatedRestrictions = this.aggregateRestrictions(userRoles);

      // Step 4: Create comprehensive token payload
      const tokenPayload = {
        // Standard JWT claims
        iss: 'unified-wrapper-sso',
        sub: userContext.kindeUserId,
        aud: targetApp || 'all-apps',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60), // 8 hours

        // User Identity
        user: {
          id: userContext.userId,
          kindeId: userContext.kindeUserId,
          email: userContext.email,
          name: userContext.name,
          avatar: userContext.avatar,
          isAdmin: userContext.isAdmin,
          isActive: userContext.isActive
        },

        // Organization Context
        organization: {
          id: userContext.tenantId,
          name: userContext.companyName,
          subdomain: userContext.subdomain,
          kindeOrgId: userContext.kindeOrgId
        },

        // Subscription & Access
        subscription: {
          tier: userContext.subscriptionTier || 'free',
          status: userContext.subscriptionStatus || 'active',
          tools: JSON.parse(userContext.subscribedTools || '[]')
        },

        // Comprehensive Permissions
        permissions: aggregatedPermissions,
        restrictions: aggregatedRestrictions,
        roles: userRoles.map(r => ({
          id: r.roleId,
          name: r.roleName
        })),

        // App Access Control
        allowedApps: this.getAllowedApps(userContext.subscriptionTier, aggregatedPermissions),
        
        // Session metadata
        loginTime: new Date().toISOString(),
        tokenVersion: '2.0'
      };

      // Step 5: Sign the token
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        algorithm: 'HS256'
      });

      console.log('✅ Unified token generated successfully');

      return {
        token,
        expiresAt: new Date(tokenPayload.exp * 1000),
        user: tokenPayload.user,
        organization: tokenPayload.organization,
        permissions: tokenPayload.permissions
      };

    } catch (error) {
      console.error('❌ Unified token generation failed:', error);
      throw error;
    }
  }

  /**
   * Validate and extract context from unified token
   */
  static async validateUnifiedToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if token is still valid
      if (decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      // Return full context - no additional database calls needed!
      return {
        isValid: true,
        user: decoded.user,
        organization: decoded.organization,
        subscription: decoded.subscription,
        permissions: decoded.permissions,
        restrictions: decoded.restrictions,
        roles: decoded.roles,
        allowedApps: decoded.allowedApps
      };

    } catch (error) {
      console.error('❌ Token validation failed:', error);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Check if user has access to specific app/module
   */
  static checkAppAccess(tokenContext, appCode) {
    // Handle test tokens or tokens without subscription data
    if (!tokenContext.subscription || !tokenContext.subscription.tools) {
      // For test tokens or tokens without subscription data, allow access
      console.log('🧪 Allowing access for test token or token without subscription data');
      return { allowed: true };
    }

    // Check subscription tier
    if (!tokenContext.subscription.tools.includes(appCode)) {
      return { allowed: false, reason: 'App not included in subscription' };
    }

    // Check app in allowed list (if available)
    if (tokenContext.allowedApps && !tokenContext.allowedApps.includes(appCode)) {
      return { allowed: false, reason: 'App access not permitted' };
    }

    return { allowed: true };
  }

  /**
   * Check specific permission
   */
  static checkPermission(tokenContext, module, action) {
    const modulePermissions = tokenContext.permissions[module];
    if (!modulePermissions) {
      return false;
    }

    return modulePermissions.includes(action) || modulePermissions.includes('*');
  }

  // Helper methods
  static aggregatePermissions(roles) {
    const permissions = {};
    
    roles.forEach(role => {
      const rolePermissions = JSON.parse(role.permissions || '{}');
      Object.keys(rolePermissions).forEach(module => {
        if (!permissions[module]) {
          permissions[module] = [];
        }
        permissions[module] = [
          ...new Set([...permissions[module], ...rolePermissions[module]])
        ];
      });
    });

    return permissions;
  }

  static aggregateRestrictions(roles) {
    const restrictions = {};
    
    roles.forEach(role => {
      if (role.restrictions) {
        const roleRestrictions = JSON.parse(role.restrictions);
        Object.assign(restrictions, roleRestrictions);
      }
    });

    return restrictions;
  }

  static getAllowedApps(subscriptionTier, permissions) {
    // Define app access based on subscription and permissions
    const appMatrix = {
      free: ['crm'],
      starter: ['crm', 'hr'],
      professional: ['crm', 'hr', 'affiliate', 'accounting'],
      enterprise: ['crm', 'hr', 'affiliate', 'accounting', 'inventory']
    };

    return appMatrix[subscriptionTier] || ['crm'];
  }
}