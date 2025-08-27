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
  
  // 🔧 **HELPER: Parse Role Permissions**
  static parseRolePermissions(rolePermissions) {
    if (!rolePermissions) return [];
    
    try {
      if (typeof rolePermissions === 'string') {
        // Handle JSON string format
        const parsed = JSON.parse(rolePermissions);
        // If it's a nested object, flatten it
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return this.flattenNestedPermissions(parsed);
        }
        return parsed;
      } else if (Array.isArray(rolePermissions)) {
        // Handle array format
        return rolePermissions;
      } else if (typeof rolePermissions === 'object') {
        // Handle nested object format - flatten permissions
        return this.flattenNestedPermissions(rolePermissions);
      }
    } catch (error) {
      console.error('❌ Failed to parse role permissions:', error);
      console.error('   Raw permissions:', rolePermissions);
      return [];
    }
    
    return [];
  }

  // 🔧 **HELPER: Flatten Nested Permissions Structure**
  static flattenNestedPermissions(nestedPermissions) {
    if (!nestedPermissions || typeof nestedPermissions !== 'object') {
      return [];
    }
    
    const flattenedPermissions = [];
    
    // Handle nested structure like: { crm: { leads: ["read", "create"] } }
    Object.keys(nestedPermissions).forEach(appCode => {
      const appPermissions = nestedPermissions[appCode];
      if (appPermissions && typeof appPermissions === 'object') {
        Object.keys(appPermissions).forEach(moduleCode => {
          const actions = appPermissions[moduleCode];
          if (Array.isArray(actions)) {
            actions.forEach(action => {
              flattenedPermissions.push(`${appCode}.${moduleCode}.${action}`);
            });
          } else if (typeof actions === 'string') {
            // Handle single action case
            flattenedPermissions.push(`${appCode}.${moduleCode}.${actions}`);
          }
        });
      }
    });
    
    console.log(`🔧 Flattened ${flattenedPermissions.length} nested permissions:`, {
      original: nestedPermissions,
      flattened: flattenedPermissions.slice(0, 5) // Show first 5 for debugging
    });
    
    return flattenedPermissions;
  }

  // 🔧 **HELPER: Map Kinde ID to Internal UUID**
  static async mapKindeIdToInternalId(kindeUserId, tenantId) {
    try {
      const { tenantUsers } = await import('../db/schema/index.js');
      
      const [user] = await db
        .select({ userId: tenantUsers.userId })
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.kindeUserId, kindeUserId),
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isActive, true)
        ))
        .limit(1);
      
      if (!user) {
        throw new Error(`User not found: ${kindeUserId} in tenant ${tenantId}`);
      }
      
      console.log(`✅ Mapped Kinde ID ${kindeUserId} to internal UUID ${user.userId}`);
      return user.userId;
      
    } catch (error) {
      console.error(`❌ Error mapping Kinde ID to internal ID:`, error);
      throw error;
    }
  }

  // 🔍 **GET USER'S COMPLETE PERMISSION CONTEXT**
  static async getUserPermissionContext(userId, tenantId) {
    try {
      console.log(`🔍 Getting permission context for user: ${userId}, tenant: ${tenantId}`);
      
      // 🔧 UUID MAPPING: Convert Kinde ID to internal UUID if needed
      let internalUserId = userId;
      if (userId.startsWith('kp_')) {
        console.log(`🔄 Detected Kinde ID, mapping to internal UUID...`);
        internalUserId = await this.mapKindeIdToInternalId(userId, tenantId);
      }
      
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

      // 3. Get user's specific permissions (now using internal UUID)
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
          eq(userApplicationPermissions.userId, internalUserId), // Use internal UUID
          eq(userApplicationPermissions.isActive, true)
        ));

      // 4. Get user's roles and their permissions (now using internal UUID)
      const userRoles = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          permissions: customRoles.permissions,
          restrictions: customRoles.restrictions
        })
        .from(userRoleAssignments)
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(userRoleAssignments.userId, internalUserId)); // Use internal UUID

      // 5. Compile complete permission set
      const completePermissions = this.compileUserPermissions({
        plan,
        planAccess,
        orgApps,
        userPermissions,
        userRoles
      });

      return {
        userId: internalUserId, // Return internal UUID for consistency
        kindeUserId: userId.startsWith('kp_') ? userId : null, // Include original Kinde ID if it was one
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

  // 🔒 **VALIDATE USER PERMISSIONS (Security Check)**
  static validateUserPermissions(userPermissions, userRoles) {
    const validPermissions = new Set();
    
    if (!userRoles || userRoles.length === 0) {
      console.log('⚠️ No user roles found, returning empty permissions for security');
      return [];
    }
    
    // Get all valid permissions from user's roles
    userRoles.forEach(role => {
      const rolePermissions = this.parseRolePermissions(role.permissions);
      rolePermissions.forEach(permission => {
        if (permission && typeof permission === 'string') {
          validPermissions.add(permission);
        }
      });
    });
    
    // Filter user permissions to only include valid role permissions
    const filteredPermissions = userPermissions.filter(permission => 
      validPermissions.has(permission)
    );
    
    console.log(`🔒 Permission validation:`, {
      totalUserPermissions: userPermissions.length,
      validRolePermissions: validPermissions.size,
      filteredPermissions: filteredPermissions.length,
      removedPermissions: userPermissions.length - filteredPermissions.length
    });
    
    return filteredPermissions;
  }

  // 🔧 **COMPILE USER PERMISSIONS FROM ALL SOURCES**
  static compileUserPermissions({ plan, planAccess, orgApps, userPermissions, userRoles }) {
    const allPermissions = new Set();
    
    // 🚨 CRITICAL FIX: Only add permissions that the user's role actually has
    // Instead of adding ALL plan permissions, we filter by user's role permissions
    
    // 1. Parse and add ONLY the user's role permissions
    if (userRoles && userRoles.length > 0) {
      userRoles.forEach(role => {
        if (role.permissions) {
          // Use the helper method for consistent parsing
          const rolePermissions = this.parseRolePermissions(role.permissions);
          
          // Add only the permissions from the user's role
          rolePermissions.forEach(permission => {
            if (permission && typeof permission === 'string') {
              allPermissions.add(permission);
            }
          });
          
          console.log(`✅ Added ${rolePermissions.length} permissions from role: ${role.roleName}`);
        }
      });
    }
    
    // 2. Add user-specific permissions (if any) - WITH SECURITY VALIDATION
    if (userPermissions && userPermissions.length > 0) {
      const userSpecificPermissions = [];
      
      userPermissions.forEach(userPerm => {
        if (userPerm.permissions && Array.isArray(userPerm.permissions)) {
          userPerm.permissions.forEach(permission => {
            const fullCode = userPerm.moduleCode 
              ? `${userPerm.appCode}.${userPerm.moduleCode}.${permission}`
              : `${userPerm.appCode}.${permission}`;
            userSpecificPermissions.push(fullCode);
          });
        }
      });
      
      // Validate user-specific permissions against role permissions
      const validatedUserPermissions = this.validateUserPermissions(userSpecificPermissions, userRoles);
      validatedUserPermissions.forEach(permission => {
        allPermissions.add(permission);
      });
      
      console.log(`✅ Added ${validatedUserPermissions.length} validated user-specific permissions`);
    }
    
    // 3. Apply restrictions from roles
    userRoles.forEach(role => {
      if (role.restrictions) {
        Object.keys(role.restrictions).forEach(restrictedPermission => {
          if (role.restrictions[restrictedPermission] === false) {
            allPermissions.delete(restrictedPermission);
          }
        });
      }
    });
    
    const finalPermissions = Array.from(allPermissions);
    
    // Log the permission compilation for debugging
    console.log(`🔐 Permission compilation summary:`, {
      totalPermissions: finalPermissions.length,
      rolePermissions: finalPermissions.filter(p => p.startsWith('crm.')),
      userSpecificPermissions: finalPermissions.filter(p => !p.startsWith('crm.')),
      userRoles: userRoles.map(r => r.roleName),
      // Add detailed debugging for Super Administrator role
      superAdminPermissions: finalPermissions.filter(p => p.startsWith('crm.')).slice(0, 20), // Show first 20 CRM permissions
      permissionFormat: 'flat-array'
    });
    
    return finalPermissions;
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