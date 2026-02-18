import { db } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { tenantUsers, userRoleAssignments, customRoles } from '../db/schema/index.js';

/**
 * Permission middleware to check user permissions for routes
 */
export function requirePermissions(requiredPermissions) {
  return async (request, reply) => {
    request.log.debug({
      requiredPermissions,
      userId: request.userContext?.internalUserId,
      tenantId: request.userContext?.tenantId,
      isAuthenticated: request.userContext?.isAuthenticated,
      isAdmin: request.userContext?.isAdmin,
      isTenantAdmin: request.userContext?.isTenantAdmin
    }, 'Permission check initiated');

    if (!request.userContext?.isAuthenticated) {
      request.log.debug('User not authenticated');
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Admin users have all permissions
    if (request.userContext.isAdmin || request.userContext.isTenantAdmin) {
      request.log.debug('Admin user detected, granting access');
      return;
    }

    try {
      // Get user permissions
      request.log.debug('Fetching user permissions...');
      const userPermissions = await getUserPermissions(
        request.userContext.internalUserId,
        request.userContext.tenantId
      );

      request.log.debug({
        moduleCount: Object.keys(userPermissions.modules).length,
        roleCount: userPermissions.roles.length,
        modules: Object.keys(userPermissions.modules),
        roles: userPermissions.roles.map(r => r.roleName)
      }, 'User permissions fetched');

      // Check if user has required permissions
      const hasPermission = checkPermissions(userPermissions, requiredPermissions);
      
      request.log.debug({
        hasPermission,
        required: requiredPermissions,
        userModules: Object.keys(userPermissions.modules)
      }, 'Permission check result');

      if (!hasPermission) {
        request.log.debug({
          required: requiredPermissions,
          userPermissions: userPermissions.modules
        }, 'Permission denied');
        return reply.code(403).send({ 
          error: 'Insufficient permissions',
          required: requiredPermissions
        });
      }

      request.log.debug('Permission granted');
      // Add permissions to request context
      request.userContext.permissions = userPermissions;
    } catch (error) {
      request.log.error({ err: error }, 'Permission check failed');
      return reply.code(500).send({ error: 'Permission check failed' });
    }
  };
}

/**
 * Get user permissions from database
 */
export async function getUserPermissions(userId, tenantId) {
  try {
    // Get user roles and their permissions
    const userRoles = await db
      .select({
        role: customRoles,
      })
      .from(userRoleAssignments)
      .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
      .where(and(
        eq(userRoleAssignments.userId, userId),
        eq(customRoles.tenantId, tenantId)
      ));

    // Aggregate permissions from all roles
    const aggregatedPermissions = {};
    
    for (const { role } of userRoles) {
      // Check for Super Admin role with '*' permissions
      if (role.permissions === '*' || role.roleName === 'Super Administrator' || role.priority >= 1000) {
        // Return early with admin flag - they have all permissions
        return {
          modules: '*', // Special marker for all permissions
          roles: userRoles.map(({ role }) => ({
            roleId: role.roleId,
            roleName: role.roleName,
            priority: role.priority || 100,
            isSuperAdmin: true
          })),
          isSuperAdmin: true
        };
      }
      
      let rolePermissions;
      try {
        rolePermissions = typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions) 
          : role.permissions || {};
        
      } catch (parseError) {
        console.error(`❌ [PermissionMiddleware] Failed to parse permissions for role ${role.roleName}:`, parseError);
        rolePermissions = {};
      }

      // Merge permissions - Handle both legacy array format and new object format
      Object.keys(rolePermissions).forEach(module => {
        if (module === 'metadata' || module === 'inheritance' || module === 'restrictions') {
          return;
        }

        if (!aggregatedPermissions[module]) {
          aggregatedPermissions[module] = {};
        }
        
        const modulePermissions = rolePermissions[module];
        
        // Handle legacy array format (e.g., "crm": ["leads", "contacts", "dashboard"])
        if (Array.isArray(modulePermissions)) {
          // Convert array format to object format
          modulePermissions.forEach(permission => {
            if (typeof permission === 'string') {
              // Create section for each permission with basic actions
              if (!aggregatedPermissions[module][permission]) {
                aggregatedPermissions[module][permission] = [];
              }
              
              // Add basic permissions for legacy format
              const basicActions = ['view', 'read'];
              basicActions.forEach(action => {
                if (!aggregatedPermissions[module][permission].includes(action)) {
                  aggregatedPermissions[module][permission].push(action);
                }
              });
              
            }
          });
        }
        // Handle new object format (e.g., "crm": { "contacts": ["read", "create"] })
        else if (typeof modulePermissions === 'object' && modulePermissions !== null) {
          Object.keys(modulePermissions).forEach(section => {
            if (!aggregatedPermissions[module][section]) {
              aggregatedPermissions[module][section] = [];
            }
            
            // Combine and deduplicate permissions
            const existingPerms = aggregatedPermissions[module][section];
            const newPerms = modulePermissions[section] || [];
            aggregatedPermissions[module][section] = [
              ...new Set([...existingPerms, ...newPerms])
            ];
            
          });
        }
      });
    }

    const result = {
      modules: aggregatedPermissions,
      roles: userRoles.map(({ role }) => ({
        roleId: role.roleId,
        roleName: role.roleName,
        priority: role.priority || 100
      }))
    };

    return result;
  } catch (error) {
    console.error('❌ [PermissionMiddleware] Error fetching user permissions:', error);
    console.error('❌ [PermissionMiddleware] Error stack:', error.stack);
    return { modules: {}, roles: [] };
  }
}

/**
 * Check if user has required permissions
 */
export function checkPermissions(userPermissions, requiredPermissions) {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  // Check for Super Admin permissions
  if (userPermissions.isSuperAdmin || userPermissions.modules === '*') {
    return true;
  }

  return requiredPermissions.some(permission => {
    const [module, section, action] = permission.split('.');
    return userPermissions.modules[module]?.[section]?.includes(action) || false;
  });
}

/**
 * Check if user can access a specific module
 */
export function canAccessModule(userPermissions, module) {
  return Object.keys(userPermissions.modules[module] || {}).length > 0;
}

/**
 * Get available permissions for a tenant - Updated with realistic CRM permissions including import/export
 */
export function getAvailablePermissions() {
  return {
    crm: {
      // Core modules with import/export capabilities
      leads: ['create', 'read', 'read_all', 'update', 'delete', 'export', 'import'],
      accounts: ['create', 'read', 'read_all', 'update', 'delete', 'view_contacts', 'export', 'import'],
      contacts: ['create', 'read', 'read_all', 'update', 'delete', 'export', 'import'],
      opportunities: ['create', 'read', 'read_all', 'update', 'delete', 'export', 'import'],
      quotations: ['create', 'read', 'read_all', 'update', 'delete', 'generate_pdf', 'export', 'import'],
      
      // Service modules
      tickets: ['create', 'read', 'read_all', 'update', 'delete'],
      communications: ['create', 'read', 'read_all', 'update', 'delete'],
      invoices: ['create', 'read', 'read_all', 'update', 'delete'],
      sales_orders: ['create', 'read', 'read_all', 'update', 'delete'],
      documents: ['upload', 'read', 'read_all', 'download', 'delete'],
      
      // System modules  
      bulk_operations: ['import', 'export', 'template'],
      pdf: ['generate', 'download'],
      dashboard: ['view', 'stats'],
      users: ['create', 'read', 'read_all', 'update', 'delete', 'change_status', 'change_role', 'change_password', 'bulk_upload'],
      roles: ['create', 'read', 'update', 'delete'],
      audit: ['view_own', 'view_all', 'export', 'stats', 'search'],
      
      // Special permissions
      special: ['admin_access', 'super_admin', 'view_all_data', 'export_all', 'import_all']
    }
  };
} 