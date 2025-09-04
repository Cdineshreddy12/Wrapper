/**
 * Onboarding Analytics Routes - Provide insights into onboarding funnel and user journey
 */

import { authenticateToken } from '../middleware/auth.js';
import { OnboardingTrackingService } from '../services/onboarding-tracking-service.js';
import { db } from '../db/index.js';
import { tenants, onboardingEvents } from '../db/schema/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export default async function onboardingAnalyticsRoutes(fastify, options) {

  // Get onboarding status for current tenant
  fastify.get('/status', {
    preHandler: [authenticateToken],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tenantId: { type: 'string' },
            overallCompleted: { type: 'boolean' },
            phases: {
              type: 'object',
              properties: {
                trial: { type: 'boolean' },
                profile: { type: 'boolean' },
                upgrade: { type: 'boolean' }
              }
            },
            completionRate: { type: 'number' },
            variant: { type: 'string' },
            nextPhase: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;

      if (!userContext?.isTenantAdmin && !userContext?.isAdmin) {
        return reply.code(403).send({
          success: false,
          message: 'Insufficient permissions to view onboarding status'
        });
      }

      const status = await OnboardingTrackingService.getOnboardingStatus(userContext.tenantId);

      if (!status) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      return {
        success: true,
        ...status
      };

    } catch (error) {
      console.error('❌ Failed to get onboarding status:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve onboarding status'
      });
    }
  });

  // Get detailed onboarding analytics for current tenant
  fastify.get('/analytics', {
    preHandler: [authenticateToken],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tenantId: { type: 'string' },
            phases: { type: 'object' },
            journey: { type: 'array' },
            events: { type: 'array' },
            summary: {
              type: 'object',
              properties: {
                trialCompleted: { type: 'boolean' },
                upgradeCompleted: { type: 'boolean' },
                profileCompleted: { type: 'boolean' },
                totalEvents: { type: 'number' },
                completionRate: { type: 'number' },
                averageTimeSpent: { type: 'number' },
                abandonmentRate: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;
      const { startDate, endDate } = request.query;

      if (!userContext?.isTenantAdmin && !userContext?.isAdmin) {
        return reply.code(403).send({
          success: false,
          message: 'Insufficient permissions to view onboarding analytics'
        });
      }

      const analytics = await OnboardingTrackingService.getOnboardingAnalytics(userContext.tenantId);

      if (!analytics) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      return {
        success: true,
        ...analytics
      };

    } catch (error) {
      console.error('❌ Failed to get onboarding analytics:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve onboarding analytics'
      });
    }
  });

  // Get onboarding funnel analytics (Admin only)
  fastify.get('/funnel', {
    preHandler: [authenticateToken],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            funnel: {
              type: 'object',
              properties: {
                trial: {
                  type: 'object',
                  properties: {
                    started: { type: 'number' },
                    completed: { type: 'number' },
                    skipped: { type: 'number' },
                    abandoned: { type: 'number' }
                  }
                },
                profile: {
                  type: 'object',
                  properties: {
                    started: { type: 'number' },
                    completed: { type: 'number' },
                    skipped: { type: 'number' },
                    abandoned: { type: 'number' }
                  }
                },
                upgrade: {
                  type: 'object',
                  properties: {
                    started: { type: 'number' },
                    completed: { type: 'number' },
                    skipped: { type: 'number' },
                    abandoned: { type: 'number' }
                  }
                }
              }
            },
            conversionRates: { type: 'object' },
            dateRange: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;
      const { startDate, endDate } = request.query;

      if (!userContext?.isAdmin) {
        return reply.code(403).send({
          success: false,
          message: 'Admin access required for funnel analytics'
        });
      }

      const analytics = await OnboardingTrackingService.getOnboardingFunnelAnalytics({
        startDate,
        endDate
      });

      return {
        success: true,
        ...analytics
      };

    } catch (error) {
      console.error('❌ Failed to get onboarding funnel analytics:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve onboarding funnel analytics'
      });
    }
  });

  // Assign A/B test variant (Admin only)
  fastify.post('/assign-variant', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['tenantId', 'variantId', 'experimentId'],
        properties: {
          tenantId: { type: 'string' },
          variantId: { type: 'string' },
          experimentId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            variantId: { type: 'string' },
            experimentId: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;
      const { tenantId, variantId, experimentId } = request.body;

      if (!userContext?.isAdmin) {
        return reply.code(403).send({
          success: false,
          message: 'Admin access required to assign variants'
        });
      }

      const result = await OnboardingTrackingService.assignOnboardingVariant(
        tenantId,
        variantId,
        experimentId
      );

      return {
        success: true,
        ...result
      };

    } catch (error) {
      console.error('❌ Failed to assign onboarding variant:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to assign onboarding variant'
      });
    }
  });

  // Get onboarding journey timeline for a tenant
  fastify.get('/journey/:tenantId', {
    preHandler: [authenticateToken],
    schema: {
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tenantId: { type: 'string' },
            journey: { type: 'array' },
            phases: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;
      const { tenantId } = request.params;

      if (!userContext?.isAdmin && userContext?.tenantId !== tenantId) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied to this tenant\'s journey'
        });
      }

      const [tenant] = await db
        .select({
          userJourney: tenants.userJourney,
          onboardingPhases: tenants.onboardingPhases
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      return {
        success: true,
        tenantId,
        journey: tenant.userJourney || [],
        phases: tenant.onboardingPhases || {}
      };

    } catch (error) {
      console.error('❌ Failed to get onboarding journey:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve onboarding journey'
      });
    }
  });
}
