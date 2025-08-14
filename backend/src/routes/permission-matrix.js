// 🎯 **PERMISSION MATRIX API ROUTES**
// Provides API access to the permission matrix system

import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import PermissionMatrixService from '../services/permission-matrix-service.js';
import { 
  BUSINESS_SUITE_MATRIX, 
  PLAN_ACCESS_MATRIX, 
  PermissionMatrixUtils 
} from '../data/permission-matrix.js';

export default async function permissionMatrixRoutes(fastify, options) {

  // 🔍 **GET COMPLETE PERMISSION MATRIX**
  fastify.get('/matrix', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage]
  }, async (request, reply) => {
    try {
      console.log('📡 GET /api/permission-matrix/matrix - Fetching complete permission matrix');
      
      return {
        success: true,
        data: {
          applications: PermissionMatrixUtils.getAllApplications(),
          matrix: BUSINESS_SUITE_MATRIX,
          planAccess: PLAN_ACCESS_MATRIX,
          summary: {
            totalApplications: Object.keys(BUSINESS_SUITE_MATRIX).length,
            totalModules: Object.values(BUSINESS_SUITE_MATRIX).reduce((total, app) => 
              total + Object.keys(app.modules).length, 0),
            totalPermissions: Object.values(BUSINESS_SUITE_MATRIX).reduce((total, app) => 
              total + Object.values(app.modules).reduce((moduleTotal, module) => 
                moduleTotal + (module.permissions?.length || 0), 0), 0)
          }
        }
      };
    } catch (error) {
      console.error('❌ Error fetching permission matrix:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch permission matrix',
        error: error.message
      });
    }
  });

  // 🏢 **GET USER'S PERMISSION CONTEXT**
  fastify.get('/user-context', {
    preHandler: [authenticateToken, trackUsage]
  }, async (request, reply) => {
    try {
      const { internalUserId, tenantId } = request.userContext;
      
      console.log(`📡 GET /api/permission-matrix/user-context - User: ${internalUserId}, Tenant: ${tenantId}`);
      
      const context = await PermissionMatrixService.getUserPermissionContext(internalUserId, tenantId);
      
      return {
        success: true,
        data: context
      };
    } catch (error) {
      console.error('❌ Error fetching user permission context:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch user permission context',
        error: error.message
      });
    }
  });

  // 🎯 **CHECK SPECIFIC PERMISSION**
  fastify.post('/check-permission', {
    preHandler: [authenticateToken, trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['permission'],
        properties: {
          permission: { type: 'string' },
          userId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { permission, userId } = request.body;
      const { internalUserId, tenantId } = request.userContext;
      
      // Use provided userId or current user
      const targetUserId = userId || internalUserId;
      
      console.log(`🔍 Checking permission: ${permission} for user: ${targetUserId}`);
      
      const hasPermission = await PermissionMatrixService.hasPermission(targetUserId, tenantId, permission);
      
      return {
        success: true,
        data: {
          permission,
          hasPermission,
          userId: targetUserId
        }
      };
    } catch (error) {
      console.error('❌ Error checking permission:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to check permission',
        error: error.message
      });
    }
  });

  // 🎯 **CHECK MULTIPLE PERMISSIONS**
  fastify.post('/check-permissions', {
    preHandler: [authenticateToken, trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['permissions'],
        properties: {
          permissions: { type: 'array', items: { type: 'string' } },
          userId: { type: 'string' },
          checkType: { type: 'string', enum: ['any', 'all'], default: 'any' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { permissions, userId, checkType = 'any' } = request.body;
      const { internalUserId, tenantId } = request.userContext;
      
      const targetUserId = userId || internalUserId;
      
      console.log(`🔍 Checking ${checkType} permissions: ${permissions.join(', ')} for user: ${targetUserId}`);
      
      const hasPermission = checkType === 'all'
        ? await PermissionMatrixService.hasAllPermissions(targetUserId, tenantId, permissions)
        : await PermissionMatrixService.hasAnyPermission(targetUserId, tenantId, permissions);
      
      return {
        success: true,
        data: {
          permissions,
          checkType,
          hasPermission,
          userId: targetUserId
        }
      };
    } catch (error) {
      console.error('❌ Error checking multiple permissions:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to check permissions',
        error: error.message
      });
    }
  });

  // 📱 **GET USER'S ACCESSIBLE APPLICATIONS**
  fastify.get('/user-applications', {
    preHandler: [authenticateToken, trackUsage]
  }, async (request, reply) => {
    try {
      const { internalUserId, tenantId } = request.userContext;
      
      console.log(`📱 Getting accessible applications for user: ${internalUserId}`);
      
      const applications = await PermissionMatrixService.getUserAccessibleApplications(internalUserId, tenantId);
      
      return {
        success: true,
        data: {
          applications,
          count: applications.length
        }
      };
    } catch (error) {
      console.error('❌ Error fetching user applications:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch user applications',
        error: error.message
      });
    }
  });

  // 👥 **GET AVAILABLE ROLE TEMPLATES**
  fastify.get('/role-templates', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage]
  }, async (request, reply) => {
    try {
      console.log('📡 GET /api/permission-matrix/role-templates');
      
      const templates = PermissionMatrixService.getAvailableRoleTemplates();
      
      return {
        success: true,
        data: {
          templates,
          count: templates.length
        }
      };
    } catch (error) {
      console.error('❌ Error fetching role templates:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch role templates',
        error: error.message
      });
    }
  });

  // 🎯 **ASSIGN ROLE TEMPLATE TO USER**
  fastify.post('/assign-template', {
    preHandler: [authenticateToken, requirePermission('permissions:manage'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'templateId'],
        properties: {
          userId: { type: 'string' },
          templateId: { type: 'string' },
          customizations: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId, templateId, customizations = {} } = request.body;
      const { tenantId } = request.userContext;
      
      console.log(`🎯 Assigning template ${templateId} to user ${userId}`);
      
      const result = await PermissionMatrixService.assignRoleTemplate(userId, tenantId, templateId, customizations);
      
      return {
        success: true,
        data: result,
        message: `Role template ${templateId} assigned successfully`
      };
    } catch (error) {
      console.error('❌ Error assigning role template:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to assign role template',
        error: error.message
      });
    }
  });

  // 📊 **GET PERMISSION ANALYTICS**
  fastify.get('/analytics', {
    preHandler: [authenticateToken, requirePermission('permissions:read'), trackUsage]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      
      console.log(`📊 Getting permission analytics for tenant: ${tenantId}`);
      
      const analytics = await PermissionMatrixService.getPermissionAnalytics(tenantId);
      
      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      console.error('❌ Error fetching permission analytics:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch permission analytics',
        error: error.message
      });
    }
  });



  // 🔍 **VALIDATE PERMISSION MATRIX** (Admin only)
  fastify.get('/validate', {
    preHandler: [authenticateToken, requirePermission('admin:system'), trackUsage]
  }, async (request, reply) => {
    try {
      console.log('🔍 Validating permission matrix...');
      
      const errors = PermissionMatrixUtils.validateMatrix();
      
      return {
        success: true,
        data: {
          valid: errors.length === 0,
          errors,
          summary: {
            totalApplications: Object.keys(BUSINESS_SUITE_MATRIX).length,
            totalModules: Object.values(BUSINESS_SUITE_MATRIX).reduce((total, app) => 
              total + Object.keys(app.modules).length, 0),
            totalPermissions: Object.values(BUSINESS_SUITE_MATRIX).reduce((total, app) => 
              total + Object.values(app.modules).reduce((moduleTotal, module) => 
                moduleTotal + (module.permissions?.length || 0), 0), 0)
          }
        },
        message: errors.length === 0 ? 'Permission matrix is valid' : `Found ${errors.length} validation errors`
      };
    } catch (error) {
      console.error('❌ Error validating permission matrix:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to validate permission matrix',
        error: error.message
      });
    }
  });

  // 📋 **GET PLAN ACCESS INFORMATION**
  fastify.get('/plan-access/:planId', {
    preHandler: [authenticateToken, trackUsage]
  }, async (request, reply) => {
    try {
      const { planId } = request.params;
      
      console.log(`📋 Getting plan access for: ${planId}`);
      
      const planAccess = PLAN_ACCESS_MATRIX[planId];
      if (!planAccess) {
        return reply.code(404).send({
          success: false,
          message: `Plan ${planId} not found`
        });
      }
      
      const permissions = PermissionMatrixUtils.getPlanPermissions(planId);
      
      return {
        success: true,
        data: {
          planId,
          ...planAccess,
          permissionCount: permissions.length,
          detailedPermissions: permissions
        }
      };
    } catch (error) {
      console.error('❌ Error fetching plan access:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch plan access',
        error: error.message
      });
    }
  });

  // 🧹 **REVOKE ALL USER PERMISSIONS** (Admin only)
  fastify.post('/revoke-user-permissions', {
    preHandler: [authenticateToken, requirePermission('permissions:manage'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.body;
      const { tenantId } = request.userContext;
      
      console.log(`🧹 Revoking all permissions for user: ${userId}`);
      
      await PermissionMatrixService.revokeAllUserPermissions(userId, tenantId);
      
      return {
        success: true,
        message: `All permissions revoked for user ${userId}`
      };
    } catch (error) {
      console.error('❌ Error revoking user permissions:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to revoke user permissions',
        error: error.message
      });
    }
  });
} 