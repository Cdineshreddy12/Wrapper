import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../../../middleware/auth/auth.js';
import { checkTrialStatus } from '../../../middleware/restrictions/trial-restriction.js';

// Stub until TrialEventService is implemented
const TrialEventService = {
  getTrialStats: async (_tenantId: string): Promise<Record<string, unknown>> => ({}),
  isFeatureRestricted: async (_tenantId: string, _feature: string): Promise<{ restricted: boolean; message: string; data: unknown }> => ({ restricted: false, message: '', data: null }),
  handleTrialExpiry: async (_sub: unknown): Promise<void> => {}
};

export default async function trialRoutes(fastify: FastifyInstance, _options?: Record<string, unknown>): Promise<void> {
  // Get trial status for current tenant
  fastify.get('/status', {
    preHandler: [authMiddleware]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.user as { tenantId?: string };
      
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID required' });
      }
      
      const trialStatus = await checkTrialStatus(tenantId);
      
      const stats = await TrialEventService.getTrialStats(tenantId);
      
      // Get current subscription info
      const { sql } = await import('../../../db/index.js');
      const subscription = await sql`
        SELECT 
          s.plan, s.status, s.trial_start, s.trial_end, 
          s.reminder_count, s.last_reminder_sent_at, s.restrictions_applied_at,
          t.company_name
        FROM subscriptions s
        JOIN tenants t ON s.tenant_id = t.tenant_id
        WHERE s.tenant_id = ${tenantId}
        ORDER BY s.created_at DESC
        LIMIT 1;
      `;

      const subscriptionData = subscription[0] || null;
      
      const message = trialStatus.isExpired ? 'Trial has expired' : trialStatus.hasRestrictions ? 'Restrictions apply' : '';
      return reply.send({
        success: true,
        data: {
          tenantId,
          isExpired: trialStatus.isExpired,
          hasRestrictions: trialStatus.hasRestrictions,
          message,
          subscription: subscriptionData,
          stats: stats,
          upgradeUrl: `${process.env.FRONTEND_URL}/billing?upgrade=true&source=trial_status`
        }
      });
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error getting trial status:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get trial status',
        error: error.message
      });
    }
  });

  // Get active restrictions for current tenant
  fastify.get('/restrictions', {
    preHandler: [authMiddleware]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.user as { tenantId?: string };
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID required' });
      }
      
      const { sql } = await import('../../../db/index.js');
      const restrictions = await (sql as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>)`
        SELECT restriction_type, restriction_data, applied_at, is_active
        FROM trial_restrictions
        WHERE tenant_id = ${tenantId}
        AND is_active = TRUE
        ORDER BY applied_at DESC;
      `;

      const arr = Array.isArray(restrictions) ? restrictions : [];
      return reply.send({
        success: true,
        data: {
          restrictions: arr,
          hasActiveRestrictions: arr.length > 0
        }
      });
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error getting trial restrictions:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get trial restrictions',
        error: error.message
      });
    }
  });

  // Check if specific feature is restricted
  fastify.get('/check/:feature', {
    preHandler: [authMiddleware]
  }, (async (request: FastifyRequest<{ Params: { feature: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.user as { tenantId?: string };
      const { feature } = request.params;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID required' });
      }
      
      const restriction = await TrialEventService.isFeatureRestricted(tenantId, feature);
      
      return reply.send({
        success: true,
        data: {
          feature,
          restricted: restriction.restricted,
          message: restriction.message,
          data: restriction.data
        }
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error checking feature restriction:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to check feature restriction',
        error: error.message
      });
    }
  }) as any);

  // Get trial events for current tenant (for debugging/admin)
  fastify.get('/events', {
    preHandler: [authMiddleware]
  }, (async (request: FastifyRequest<{ Querystring: Record<string, unknown> }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.user as { tenantId?: string };
      const q = request.query as Record<string, unknown>;
      const limit = Number(q.limit) || 50;
      const offset = Number(q.offset) || 0;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID required' });
      }
      
      const { sql } = await import('../../../db/index.js');
      const events = await (sql as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>)`
        SELECT event_type, event_data, created_at, user_id, ip_address
        FROM trial_events
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `;

      const eventsArr = Array.isArray(events) ? events : [];
      return reply.send({
        success: true,
        data: {
          events: eventsArr,
          pagination: {
            limit,
            offset
          }
        }
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error getting trial events:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get trial events',
        error: error.message
      });
    }
  }) as any);

  // Force trigger trial expiry check (for testing/admin)
  fastify.post('/force-expiry-check', {
    preHandler: [authMiddleware]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return reply.status(403).send({
          success: false,
          message: 'This endpoint is only available in development'
        });
      }

      const { tenantId } = request.user as { tenantId?: string };
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID required' });
      }
      
      const { sql } = await import('../../../db/index.js');
      const subscription = await (sql as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>)`
        SELECT * FROM subscriptions WHERE tenant_id = ${tenantId} LIMIT 1;
      `;

      const subArr = Array.isArray(subscription) ? subscription : [];
      if (subArr.length === 0) {
        return reply.status(404).send({
          success: false,
          message: 'No subscription found'
        });
      }

      await TrialEventService.handleTrialExpiry(subArr[0]);

      return reply.send({
        success: true,
        message: 'Trial expiry check completed',
        data: {
          tenantId,
          subscriptionId: (subArr[0] as Record<string, unknown>)?.subscription_id
        }
      });
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error forcing trial expiry check:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to force trial expiry check',
        error: error.message
      });
    }
  });
} 