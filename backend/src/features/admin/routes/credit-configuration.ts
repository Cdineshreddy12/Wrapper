import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreditService } from '../../../features/credits/index.js';
import { PERMISSIONS } from '../../../constants/permissions.js';
import { requirePermissions } from '../../../middleware/auth/permission-middleware.js';
import { authenticateToken } from '../../../middleware/auth/auth.js';
import { requireTenantMatch } from '../../../middleware/validation/tenant-validation.js';

/**
 * Admin Credit Configuration Routes
 * Handles tenant-specific credit configuration management
 */

export default async function creditConfigurationRoutes(fastify: FastifyInstance, _options?: object): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', authenticateToken);

  /**
   * GET /api/admin/credit-configurations/:tenantId
   * Get all credit configurations for a specific tenant (current + inherited)
   */
  fastify.get('/:tenantId', {
    schema: {
      description: 'Get all credit configurations for a tenant',
      tags: ['Admin', 'Credit Configuration']
    },
    preHandler: requirePermissions([PERMISSIONS.CREDIT_CONFIG_VIEW])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const tenantId = params.tenantId ?? '';

      // Verify tenant access (admin can access any, tenant admin only their own)
      const userContext = (request as any).userContext;
      if (!userContext?.isSuperAdmin && userContext?.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to this tenant\'s configurations' });
      }

      const configurations = await CreditService.getTenantConfigurations(tenantId) as any;
      reply.send(configurations);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error fetching tenant configurations:', error);
      reply.code(500).send({ error: 'Failed to fetch tenant configurations' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/:tenantId/operation/:operationCode
   * Update operation-level credit configuration for a tenant
   */
  fastify.put('/:tenantId/operation/:operationCode', {
    schema: {
      description: 'Update operation-level credit configuration for a tenant',
      tags: ['Admin', 'Credit Configuration']
    },
    // Temporarily disable permission check for debugging
    // preHandler: requirePermissions([PERMISSIONS.CREDIT_CONFIG_EDIT])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const tenantId = params.tenantId ?? '';
      const operationCode = params.operationCode ?? '';
      const configData = body;
      const userId = (request as any).userContext?.internalUserId ?? '';

      // Verify tenant access
      const userContext = (request as any).userContext;
      if (!userContext?.isSuperAdmin && userContext?.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to modify this tenant\'s configurations' });
      }

      const result = await CreditService.setTenantOperationConfig(operationCode, configData as any, userId, tenantId) as any;
      reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error updating operation configuration:', error);
      reply.code(500).send({ error: 'Failed to update operation configuration' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/:tenantId/module/:moduleCode
   * Update module-level credit configuration for a tenant
   */
  fastify.put('/:tenantId/module/:moduleCode', {
    schema: {
      description: 'Update module-level credit configuration for a tenant',
      tags: ['Admin', 'Credit Configuration']
    },
    preHandler: requirePermissions([PERMISSIONS.CREDIT_CONFIG_EDIT])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const tenantId = params.tenantId ?? '';
      const moduleCode = params.moduleCode ?? '';
      const configData = body;
      const userId = (request as any).userContext?.internalUserId ?? '';

      const userContext = (request as any).userContext;
      if (!userContext?.isSuperAdmin && userContext?.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to modify this tenant\'s configurations' });
      }

      const result = await CreditService.setTenantModuleConfig(moduleCode, configData as any, userId, tenantId) as any;
      reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error updating module configuration:', error);
      reply.code(500).send({ error: 'Failed to update module configuration' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/:tenantId/app/:appCode
   * Update app-level credit configuration for a tenant
   */
  fastify.put('/:tenantId/app/:appCode', {
    schema: {
      description: 'Update app-level credit configuration for a tenant',
      tags: ['Admin', 'Credit Configuration']
    },
    preHandler: requirePermissions([PERMISSIONS.CREDIT_CONFIG_EDIT])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const tenantId = params.tenantId ?? '';
      const appCode = params.appCode ?? '';
      const configData = body;
      const userId = (request as any).userContext?.internalUserId ?? '';

      const userContext = (request as any).userContext;
      if (!userContext?.isSuperAdmin && userContext?.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to modify this tenant\'s configurations' });
      }

      const result = await CreditService.setTenantAppConfig(appCode, configData as any, userId, tenantId) as any;
      reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error updating app configuration:', error);
      reply.code(500).send({ error: 'Failed to update app configuration' });
    }
  });

  /**
   * DELETE /api/admin/credit-configurations/:tenantId/:configType/:configCode
   * Reset tenant configuration to global default
   */
  fastify.delete('/:tenantId/:configType/:configCode', {
    schema: {
      description: 'Reset tenant configuration to global default',
      tags: ['Admin', 'Credit Configuration']
    },
    preHandler: requirePermissions([PERMISSIONS.CREDIT_CONFIG_RESET])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const tenantId = params.tenantId ?? '';
      const configType = params.configType ?? '';
      const configCode = params.configCode ?? '';
      const userId = (request as any).userContext?.internalUserId ?? '';

      const userContext = (request as any).userContext;
      if (!userContext?.isSuperAdmin && userContext?.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to reset this tenant\'s configurations' });
      }

      const result = await CreditService.resetTenantConfiguration(tenantId, configType, configCode, userId) as any;
      reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error resetting tenant configuration:', error);
      reply.code(500).send({ error: 'Failed to reset tenant configuration' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/:tenantId/bulk
   * Bulk update multiple configurations for a tenant
   */
  fastify.put('/:tenantId/bulk', {
    schema: {
      description: 'Bulk update multiple configurations for a tenant',
      tags: ['Admin', 'Credit Configuration']
    },
    preHandler: requirePermissions([PERMISSIONS.CREDIT_CONFIG_BULK_UPDATE])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const tenantId = params.tenantId ?? '';
      const updates = body.updates;
      const userId = (request as any).userContext?.internalUserId ?? '';

      const userContext = (request as any).userContext;
      if (!userContext?.isSuperAdmin && userContext?.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to bulk update this tenant\'s configurations' });
      }

      const result = await CreditService.bulkUpdateTenantConfigurations(tenantId, updates as any, userId) as any;
      reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error bulk updating tenant configurations:', error);
      reply.code(500).send({ error: 'Failed to bulk update tenant configurations' });
    }
  });

  /**
   * GET /api/admin/credit-configuration-templates
   * Get all available configuration templates
   */
  fastify.get('/templates', {
    schema: {
      description: 'Get all available configuration templates',
      tags: ['Admin', 'Credit Configuration']
    },
    preHandler: requirePermissions([PERMISSIONS.CREDIT_CONFIG_VIEW])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const templates = await CreditService.getConfigurationTemplates() as any;
      reply.send(templates);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error fetching configuration templates:', error);
      reply.code(500).send({ error: 'Failed to fetch configuration templates' });
    }
  });

  /**
   * POST /api/admin/credit-configurations/:tenantId/apply-template
   * Apply a configuration template to a tenant
   */
  fastify.post('/:tenantId/apply-template', {
    schema: {
      description: 'Apply a configuration template to a tenant',
      tags: ['Admin', 'Credit Configuration']
    },
    preHandler: requirePermissions([PERMISSIONS.CREDIT_CONFIG_APPLY_TEMPLATES])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const tenantId = params.tenantId ?? '';
      const templateId = body.templateId;
      const userId = (request as any).userContext?.internalUserId ?? '';

      const userContext = (request as any).userContext;
      if (!userContext?.isSuperAdmin && userContext?.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to apply templates to this tenant' });
      }

      const result = await CreditService.applyConfigurationTemplate(tenantId, templateId as string, userId) as any;
      reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error applying configuration template:', error);
      reply.code(500).send({ error: 'Failed to apply configuration template' });
    }
  });

  /**
   * GET /api/admin/credit-configurations/applications
   * Get all application credit configurations (global)
   */
  fastify.get('/applications', {
    schema: {
      description: 'Get all application credit configurations',
      tags: ['Admin', 'Credit Configuration']
    },
    preHandler: requirePermissions([PERMISSIONS.ADMIN_APPS_VIEW])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const configurations = await CreditService.getApplicationCreditConfigurations() as any;
      return reply.send({
        success: true,
        data: {
          configurations
        }
      });
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error fetching application credit configurations:', error);
      reply.code(500).send({ error: 'Failed to fetch application credit configurations' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/applications/:appCode
   * Update application credit configuration
   */
  fastify.put('/applications/:appCode', {
    schema: {
      description: 'Update application credit configuration',
      tags: ['Admin', 'Credit Configuration']
    },
    preHandler: requirePermissions([PERMISSIONS.ADMIN_APPS_EDIT])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const appCode = params.appCode ?? '';
      const configData = body;
      const userId = (request as any).userContext?.internalUserId ?? '';

      const result = await (CreditService as any).updateApplicationCreditConfiguration(appCode, configData as any, userId) as any;
      reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error updating application credit configuration:', error);
      reply.code(500).send({ error: 'Failed to update application credit configuration' });
    }
  });

  /**
   * PUT /api/admin/credit-configurations/applications/:appCode/modules/:moduleCode
   * Update module credit configuration
   */
  fastify.put('/applications/:appCode/modules/:moduleCode', {
    schema: {
      description: 'Update module credit configuration',
      tags: ['Admin', 'Credit Configuration']
    },
    preHandler: requirePermissions([PERMISSIONS.ADMIN_APPS_EDIT])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const appCode = params.appCode ?? '';
      const moduleCode = params.moduleCode ?? '';
      const configData = body;
      const userId = (request as any).userContext?.internalUserId ?? '';

      const result = await (CreditService as any).updateModuleCreditConfiguration(appCode, moduleCode, configData as any, userId) as any;
      reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error updating module credit configuration:', error);
      reply.code(500).send({ error: 'Failed to update module credit configuration' });
    }
  });

  /**
   * POST /api/admin/credit-configurations/tenant/:tenantId/operations
   * Create tenant-specific operation cost
   */
  fastify.post('/tenant/:tenantId/operations', {
    schema: {
      description: 'Create tenant-specific operation cost',
      tags: ['Admin', 'Credit Configuration']
    },
    // Temporarily disable permission check for debugging
    // preHandler: requirePermissions([PERMISSIONS.ADMIN_APPS_EDIT])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const tenantId = params.tenantId ?? '';
      const configData = body;
      const userId = (request as any).userContext?.internalUserId ?? '';

      const userContext = (request as any).userContext;
      if (!userContext?.isSuperAdmin && userContext?.tenantId !== tenantId) {
        return reply.code(403).send({ error: 'Access denied to create configurations for this tenant' });
      }

      console.log('📝 Creating tenant operation cost:', { tenantId, configData, userId });

      const result = await CreditService.createTenantOperationCost(tenantId, configData as any, userId) as any;

      console.log('✅ Tenant operation cost created successfully:', result);
      reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error in tenant operation cost route:', err);
      request.log.error('Error creating tenant operation cost:', error);

      reply.code(500).send({
        error: (error?.message ?? '') || 'Failed to create tenant operation cost',
        details: (error as any).details
      });
    }
  });

  // Initialize credits for a tenant (temporary route for testing)
  fastify.post('/initialize-credits/:tenantId', {
    preHandler: [requirePermissions([PERMISSIONS.CREDIT_CONFIG_MANAGE]), requireTenantMatch()],
    schema: {
      description: 'Initialize credits for a tenant'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    const tenantId = params.tenantId ?? '';
    const initialCredits = Number(body.initialCredits) || 1000;
    const userId = (request as any).userContext?.userId ?? (request as any).user?.userId ?? '';

    try {
      console.log(`🎯 Initializing ${initialCredits} credits for tenant: ${tenantId}`);

      const result = await CreditService.initializeTenantCredits(tenantId, initialCredits) as any;

      reply.send({
        success: true,
        message: `Successfully initialized ${initialCredits} credits for tenant ${tenantId}`,
        data: result
      });
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error initializing credits:', error);
      reply.code(500).send({
        error: 'Failed to initialize credits',
        details: error?.message ?? ''
      });
    }
  });

  /**
   * GET /api/admin/credit-configurations/global/by-app
   * Get global credit configurations filtered by application code or name
   * Query params:
   *   - app: Application code (e.g., 'crm') or name (e.g., 'B2B CRM'). Optional - if not provided, returns all apps.
   */
  fastify.get('/global/by-app', {
    schema: {
      description: 'Get global credit configurations filtered by application code or name',
      tags: ['Admin', 'Credit Configuration', 'Global']
    },
    preHandler: requirePermissions([PERMISSIONS.CREDIT_CONFIG_VIEW])
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    try {
      const app = query.app;

      console.log('📊 Fetching global credit configurations for app:', app || 'ALL');

      const result = await CreditService.getGlobalCreditConfigurationsByApp(app as any) as any;

      reply.send(result);
    } catch (err: unknown) {
      const error = err as Error;
      request.log.error('Error fetching global credit configurations by app:', error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch global credit configurations',
        error: error?.message ?? ''
      });
    }
  });
}
