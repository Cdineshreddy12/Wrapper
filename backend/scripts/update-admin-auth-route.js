import { db } from '../src/db/index.js';
import { tenantUsers, customRoles, userRoleAssignments, tenants } from '../src/db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { CRM_PERMISSION_MATRIX, CRM_SPECIAL_PERMISSIONS } from '../src/data/comprehensive-crm-permissions.js';

/**
 * 🔧 UPDATE ADMIN AUTH-STATUS ROUTE
 * Updates the admin auth-status route to properly handle comprehensive CRM permissions
 */

console.log('🔄 Starting admin auth-status route update...');

// Function to extract all permissions from comprehensive matrix
function getAllCRMPermissions() {
  const allPermissions = [];
  
  // Add module permissions
  Object.values(CRM_PERMISSION_MATRIX).forEach(modulePerms => {
    allPermissions.push(...Object.keys(modulePerms));
  });
  
  // Add special permissions
  allPermissions.push(...Object.keys(CRM_SPECIAL_PERMISSIONS));
  
  return allPermissions;
}

// Function to map role permissions to flat permission list
function flattenRolePermissions(rolePermissions) {
  const flatPermissions = [];
  
  if (!rolePermissions || typeof rolePermissions !== 'object') {
    return flatPermissions;
  }
  
  // Handle new comprehensive permission structure
  Object.values(rolePermissions).forEach(moduleConfig => {
    if (moduleConfig.operations && Array.isArray(moduleConfig.operations)) {
      flatPermissions.push(...moduleConfig.operations);
    }
  });
  
  return flatPermissions;
}

// Enhanced permission processing function
export function processUserPermissions(userRoles) {
  const userPermissions = [];
  const processedPermissions = new Set();
  
  console.log('🔍 Processing permissions for roles:', userRoles.map(r => r.roleName));
  
  userRoles.forEach(role => {
    if (role.permissions) {
      console.log(`📋 Processing role: ${role.roleName}`);
      
      try {
        const rolePermissions = typeof role.permissions === 'string' 
          ? JSON.parse(role.permissions) 
          : role.permissions;
        
        // Extract flat permissions from role
        const flatPermissions = flattenRolePermissions(rolePermissions);
        
        flatPermissions.forEach(permissionName => {
          if (!processedPermissions.has(permissionName)) {
            processedPermissions.add(permissionName);
            
            // Create permission object
            const permission = {
              id: permissionName,
              name: permissionName,
              description: getPermissionDescription(permissionName),
              resource: extractResourceFromPermission(permissionName),
              level: extractLevelFromPermission(permissionName),
              app: 'crm',
              module: extractModuleFromPermission(permissionName),
              action: extractActionFromPermission(permissionName)
            };
            
            userPermissions.push(permission);
            console.log(`➕ Added permission: ${permissionName}`);
          }
        });
        
      } catch (parseError) {
        console.error(`❌ Error parsing permissions for role ${role.roleName}:`, parseError);
      }
    }
  });
  
  console.log(`✅ Total permissions processed: ${userPermissions.length}`);
  return userPermissions;
}

// Helper functions
function getPermissionDescription(permissionName) {
  // Check in module permissions
  for (const [module, perms] of Object.entries(CRM_PERMISSION_MATRIX)) {
    if (perms[permissionName]) {
      return perms[permissionName];
    }
  }
  
  // Check in special permissions
  if (CRM_SPECIAL_PERMISSIONS[permissionName]) {
    return CRM_SPECIAL_PERMISSIONS[permissionName];
  }
  
  return `Permission: ${permissionName}`;
}

function extractResourceFromPermission(permissionName) {
  const parts = permissionName.split('.');
  return parts.length >= 2 ? parts[1] : 'general';
}

function extractModuleFromPermission(permissionName) {
  const parts = permissionName.split('.');
  return parts.length >= 2 ? parts[1] : 'unknown';
}

function extractActionFromPermission(permissionName) {
  const parts = permissionName.split('.');
  return parts.length >= 3 ? parts.slice(2).join('_') : 'unknown';
}

function extractLevelFromPermission(permissionName) {
  if (permissionName.includes('delete') || permissionName.includes('admin')) {
    return 'admin';
  } else if (permissionName.includes('create') || permissionName.includes('update')) {
    return 'write';
  } else {
    return 'read';
  }
}

// Function to add CRM module access permissions
export function addCRMModulePermissions(userPermissions) {
  const modulePermissions = [];
  
  // Check which modules user has access to
  Object.keys(CRM_PERMISSION_MATRIX).forEach(module => {
    const hasModuleAccess = userPermissions.some(p => 
      p.name.startsWith(`crm.${module}.`)
    );
    
    if (hasModuleAccess) {
      const modulePermission = {
        id: `crm.${module}.access`,
        name: `crm.${module}.access`,
        description: `Access to ${module} module`,
        resource: module,
        level: 'read',
        app: 'crm',
        module: module,
        action: 'access'
      };
      
      if (!userPermissions.find(p => p.name === modulePermission.name)) {
        modulePermissions.push(modulePermission);
      }
    }
  });
  
  return modulePermissions;
}

// Enhanced auth-status route logic
export function enhancedAuthStatusResponse(user, tenant, userRoles) {
  // Process permissions using comprehensive matrix
  const userPermissions = processUserPermissions(userRoles);
  
  // Add module access permissions
  const modulePermissions = addCRMModulePermissions(userPermissions);
  userPermissions.push(...modulePermissions);
  
  // Add basic CRM permissions if user has any CRM access
  const hasCRMAccess = userPermissions.some(p => p.app === 'crm');
  if (hasCRMAccess) {
    const basicPermissions = [
      {
        id: 'crm.access',
        name: 'crm.access',
        description: 'Access to CRM application',
        resource: 'crm',
        level: 'read',
        app: 'crm',
        module: 'system',
        action: 'access'
      },
      {
        id: 'crm.dashboard.view',
        name: 'crm.dashboard.view',
        description: 'View CRM dashboard',
        resource: 'dashboard',
        level: 'read',
        app: 'crm',
        module: 'dashboard',
        action: 'view'
      }
    ];
    
    basicPermissions.forEach(basicPerm => {
      if (!userPermissions.find(p => p.name === basicPerm.name)) {
        userPermissions.push(basicPerm);
      }
    });
  }
  
  return {
    success: true,
    user: {
      userId: user.userId,
      kindeUserId: user.kindeUserId,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      isTenantAdmin: user.isTenantAdmin || false,
      isActive: user.isActive,
      onboardingCompleted: user.onboardingCompleted,
      needsOnboarding: !user.onboardingCompleted
    },
    tenant: tenant,
    permissions: userPermissions,
    roles: userRoles.map(role => ({
      roleId: role.roleId,
      roleName: role.roleName,
      description: role.description,
      isSystemRole: role.isSystemRole,
      isDefault: role.isDefault
    })),
    availableModules: getAvailableModules(userPermissions),
    permissionMatrix: {
      total: userPermissions.length,
      byModule: groupPermissionsByModule(userPermissions),
      specialPermissions: userPermissions.filter(p => 
        Object.keys(CRM_SPECIAL_PERMISSIONS).includes(p.name)
      ).map(p => p.name)
    }
  };
}

function getAvailableModules(userPermissions) {
  const modules = {};
  
  Object.keys(CRM_PERMISSION_MATRIX).forEach(module => {
    const modulePermissions = userPermissions.filter(p => 
      p.module === module || p.name.includes(`.${module}.`)
    );
    
    modules[module] = {
      available: modulePermissions.length > 0,
      permissions: modulePermissions.map(p => p.name),
      canCreate: modulePermissions.some(p => p.action === 'create'),
      canRead: modulePermissions.some(p => p.action === 'read' || p.action === 'read_all'),
      canUpdate: modulePermissions.some(p => p.action === 'update' || p.action === 'update_all'),
      canDelete: modulePermissions.some(p => p.action === 'delete' || p.action === 'delete_all')
    };
  });
  
  return modules;
}

function groupPermissionsByModule(userPermissions) {
  const grouped = {};
  
  userPermissions.forEach(permission => {
    const module = permission.module || 'general';
    if (!grouped[module]) {
      grouped[module] = [];
    }
    grouped[module].push(permission.name);
  });
  
  return grouped;
}

console.log('✅ Admin auth-status route enhancement functions ready');
console.log('📊 Available CRM permissions:', getAllCRMPermissions().length);
console.log('🏢 Available CRM modules:', Object.keys(CRM_PERMISSION_MATRIX).length);

export default {
  processUserPermissions,
  addCRMModulePermissions,
  enhancedAuthStatusResponse,
  getAllCRMPermissions
}; 