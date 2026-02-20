/**
 * 🛡️ **ROLES FEATURE**
 * Centralized roles feature module
 * Exports all role routes and services
 */

// Routes
export { default as rolesRoutes } from './routes/roles.js';
export { default as customRolesRoutes } from './routes/custom-roles.js';
export { default as permissionRoutes } from './routes/permissions.js';
export { default as permissionMatrixRoutes } from './routes/permission-matrix.js';
export { default as permissionSyncRoutes } from './routes/permission-sync.js';

// Services
export { default as customRoleService } from './services/custom-role-service.js';
export { default as permissionMatrixService } from './services/permission-matrix-service.js';
export { default as AutoPermissionSyncService } from './services/permission-sync-service.js';
