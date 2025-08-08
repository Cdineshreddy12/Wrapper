// 🎯 **PERMISSION MATRIX SERVICE**
// Runtime service for permission management using the matrix system

import { db } from '../db/index.js';
import { 
  applications, 
  applicationModules, 
  organizationApplications,
  userApplicationPermissions 
} from '../db/schema/suite-schema.js';
import { tenantUsers, customRoles, userRoleAssignments } from '../db/schema/index.js';
import {
  BUSINESS_SUITE_MATRIX,
  PLAN_ACCESS_MATRIX,
  PermissionMatrixUtils
} from '../data/permission-matrix.js';
import { eq, and, inArray } from 'drizzle-orm';

class PermissionMatrixService {
  
  // 🔍 **GET USER'S COMPLETE PERMISSION CONTEXT**
  static async getUserPermissionContext(userId, tenantId) {
    try {
      console.log(`🔍 Getting permission context for user: ${userId}, tenant: ${tenantId}`);
      
      // 1. Get user's subscription plan
      const { subscriptions } = await import('../db/schema/subscriptions.js');
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .limit(1);

      const plan = subscription?.plan || 'starter';
      const planAccess = PLAN_ACCESS_MATRIX[plan];
      
      // 2. Get organization's enabled applications
      const orgApps = await db
        .select({
          appId: applications.appId,
          appCode: applications.appCode,
          appName: applications.appName,
          isEnabled: organizationApplications.isEnabled,
          enabledModules: organizationApplications.enabledModules,
          subscriptionTier: organizationApplications.subscriptionTier
        })
        .from(applications)
        .innerJoin(
          organizationApplications,
          and(
            eq(organizationApplications.appId, applications.appId),
            eq(organizationApplications.tenantId, tenantId),
            eq(organizationApplications.isEnabled, true)
          )
        );

      // 3. Get user's specific permissions
      const userPermissions = await db
        .select({
          appId: userApplicationPermissions.appId,
          moduleId: userApplicationPermissions.moduleId,
          permissions: userApplicationPermissions.permissions,
          appCode: applications.appCode,
          moduleCode: applicationModules.moduleCode
        })
        .from(userApplicationPermissions)
        .innerJoin(applications, eq(userApplicationPermissions.appId, applications.appId))
        .leftJoin(applicationModules, eq(userApplicationPermissions.moduleId, applicationModules.moduleId))
        .where(and(
          eq(userApplicationPermissions.userId, userId),
          eq(userApplicationPermissions.isActive, true)
        ));

      // 4. Get user's roles and their permissions
      const userRoles = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          permissions: customRoles.permissions,
          restrictions: customRoles.restrictions
        })
        .from(userRoleAssignments)
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(userRoleAssignments.userId, userId));

      // 5. Compile complete permission set
      const completePermissions = this.compileUserPermissions({
        plan,
        planAccess,
        orgApps,
        userPermissions,
        userRoles
      });

      return {
        userId,
        tenantId,
        plan,
        planLimitations: planAccess?.limitations || {},
        organizationApps: orgApps,
        userRoles: userRoles,
        permissions: completePermissions,
        accessMatrix: this.generateAccessMatrix(completePermissions)
      };
      
    } catch (error) {
      console.error('❌ Failed to get user permission context:', error);
      throw error;
    }
  }

  // 🎯 **CHECK SPECIFIC PERMISSION**
  static async hasPermission(userId, tenantId, permissionCode) {
    try {
      const context = await this.getUserPermissionContext(userId, tenantId);
      return context.permissions.includes(permissionCode);
    } catch (error) {
      console.error(`❌ Permission check failed for ${permissionCode}:`, error);
      return false; // Fail closed
    }
  }

  // 🎯 **CHECK MULTIPLE PERMISSIONS (ANY)**
  static async hasAnyPermission(userId, tenantId, permissionCodes) {
    try {
      const context = await this.getUserPermissionContext(userId, tenantId);
      return permissionCodes.some(code => context.permissions.includes(code));
    } catch (error) {
      console.error(`❌ Multiple permission check failed:`, error);
      return false;
    }
  }

  // 🎯 **CHECK MULTIPLE PERMISSIONS (ALL)**
  static async hasAllPermissions(userId, tenantId, permissionCodes) {
    try {
      const context = await this.getUserPermissionContext(userId, tenantId);
      return permissionCodes.every(code => context.permissions.includes(code));
    } catch (error) {
      console.error(`❌ All permissions check failed:`, error);
      return false;
    }
  }

  // 🏢 **GET APPLICATIONS USER CAN ACCESS**
  static async getUserAccessibleApplications(userId, tenantId) {
    try {
      const context = await this.getUserPermissionContext(userId, tenantId);
      
      const accessibleApps = context.organizationApps.filter(app => {
        // Check if user has any permissions for this app
        const appPermissions = context.permissions.filter(p => p.startsWith(app.appCode));
        return appPermissions.length > 0;
      });

      return accessibleApps.map(app => ({
        ...app,
        modules: this.getUserAccessibleModules(app.appCode, context),
        baseUrl: this.getApplicationBaseUrl(app.appCode)
      }));
      
    } catch (error) {
      console.error('❌ Failed to get user accessible applications:', error);
      throw error;
    }
  }

  // 📦 **GET MODULES USER CAN ACCESS FOR AN APP**
  static getUserAccessibleModules(appCode, context) {
    const appModules = PermissionMatrixUtils.getApplicationModules(appCode);
    
    return appModules.filter(module => {
      // Check if user has any permissions for this module
      const modulePermissions = context.permissions.filter(p => 
        p.startsWith(`${appCode}.${module.moduleCode}`)
      );
      return modulePermissions.length > 0;
    }).map(module => ({
      ...module,
      permissions: this.getUserModulePermissions(appCode, module.moduleCode, context)
    }));
  }

  // ⚡ **GET USER'S PERMISSIONS FOR A SPECIFIC MODULE**
  static getUserModulePermissions(appCode, moduleCode, context) {
    const prefix = `${appCode}.${moduleCode}.`;
    return context.permissions
      .filter(p => p.startsWith(prefix))
      .map(p => p.replace(prefix, ''));
  }

  // 🔧 **COMPILE USER PERMISSIONS FROM ALL SOURCES**
  static compileUserPermissions({ plan, planAccess, orgApps, userPermissions, userRoles }) {
    const allPermissions = new Set();
    
    // 1. Add plan-based permissions
    if (planAccess) {
      const planPermissions = PermissionMatrixUtils.getPlanPermissions(plan);
      planPermissions.forEach(permission => {
        allPermissions.add(permission.fullCode);
      });
    }
    
    // 2. Add role-based permissions
    userRoles.forEach(role => {
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach(permission => {
          allPermissions.add(permission);
        });
      }
    });
    
    // 3. Add user-specific permissions
    userPermissions.forEach(userPerm => {
      if (userPerm.permissions && Array.isArray(userPerm.permissions)) {
        userPerm.permissions.forEach(permission => {
          const fullCode = userPerm.moduleCode 
            ? `${userPerm.appCode}.${userPerm.moduleCode}.${permission}`
            : `${userPerm.appCode}.${permission}`;
          allPermissions.add(fullCode);
        });
      }
    });
    
    // 4. Apply restrictions from roles
    userRoles.forEach(role => {
      if (role.restrictions) {
        Object.keys(role.restrictions).forEach(restrictedPermission => {
          if (role.restrictions[restrictedPermission] === false) {
            allPermissions.delete(restrictedPermission);
          }
        });
      }
    });
    
    return Array.from(allPermissions);
  }

  // 📊 **GENERATE ACCESS MATRIX FOR QUICK LOOKUPS**
  static generateAccessMatrix(permissions) {
    const matrix = {};
    
    permissions.forEach(permission => {
      const parts = permission.split('.');
      if (parts.length >= 3) {
        const [appCode, moduleCode, action] = parts;
        
        if (!matrix[appCode]) matrix[appCode] = {};
        if (!matrix[appCode][moduleCode]) matrix[appCode][moduleCode] = [];
        
        matrix[appCode][moduleCode].push(action);
      }
    });
    
    return matrix;
  }

  // 🌐 **GET APPLICATION BASE URL**
  static getApplicationBaseUrl(appCode) {
    const app = BUSINESS_SUITE_MATRIX[appCode];
    return app?.appInfo?.baseUrl || `http://localhost:3000/${appCode}`;
  }

  // 👥 **ROLE TEMPLATE METHODS REMOVED**
  // Templates are no longer used - roles are created directly from applications/modules

  // 🧹 **REVOKE ALL USER PERMISSIONS**
  static async revokeAllUserPermissions(userId, tenantId) {
    try {
      console.log(`🧹 Revoking all permissions for user: ${userId}`);
      
      // Deactivate user application permissions
      await db
        .update(userApplicationPermissions)
        .set({ isActive: false })
        .where(eq(userApplicationPermissions.userId, userId));

      // Remove role assignments
      const { userRoleAssignments } = await import('../db/schema/index.js');
      await db
        .delete(userRoleAssignments)
        .where(eq(userRoleAssignments.userId, userId));

      console.log(`✅ All permissions revoked for user: ${userId}`);
      
    } catch (error) {
      console.error(`❌ Failed to revoke permissions for user ${userId}:`, error);
      throw error;
    }
  }

  // 📊 **GET PERMISSION ANALYTICS**
  static async getPermissionAnalytics(tenantId) {
    try {
      const { subscriptions } = await import('../db/schema/subscriptions.js');
      
      // Get organization info
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .limit(1);

      const plan = subscription?.plan || 'starter';
      
      // Get user count with permissions
      const users = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      // Get role usage
      const roleUsage = await db
        .select()
        .from(userRoleAssignments)
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(customRoles.tenantId, tenantId));

      // Get application usage
      const appUsage = await db
        .select()
        .from(organizationApplications)
        .innerJoin(applications, eq(organizationApplications.appId, applications.appId))
        .where(eq(organizationApplications.tenantId, tenantId));

      return {
        tenantId,
        plan,
        analytics: {
          totalUsers: users.length,
          usersWithRoles: roleUsage.length,
          activeApplications: appUsage.filter(app => app.isEnabled).length,
          totalApplications: appUsage.length,
          planPermissions: PermissionMatrixUtils.getPlanPermissions(plan).length,
          customRoles: [...new Set(roleUsage.map(r => r.roleId))].length
        },
        applications: appUsage.map(app => ({
          appCode: app.appCode,
          appName: app.appName,
          isEnabled: app.isEnabled,
          enabledModules: app.enabledModules?.length || 0
        }))
      };
      
    } catch (error) {
      console.error('❌ Failed to get permission analytics:', error);
      throw error;
    }
  }
}

export default PermissionMatrixService; 