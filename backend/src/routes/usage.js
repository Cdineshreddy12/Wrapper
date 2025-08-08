import { TenantService } from '../services/tenant-service.js';
import { UsageCache } from '../utils/redis.js';
import { eq, and, gte, lte, desc, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { usageMetricsDaily, usageLogs, usageAlerts } from '../db/schema/index.js';

export default async function usageRoutes(fastify, options) {
  // Get real-time usage stats
  fastify.get('/realtime', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const today = new Date().toISOString().split('T')[0];
      
      // Get current usage from cache (fallback if cache not available)
      let apiCalls = 0;
      let activeUsers = 0;
      
      try {
        [apiCalls, activeUsers] = await Promise.all([
          UsageCache.getTotalApiCalls(tenantId, today),
          UsageCache.getActiveUserCount(tenantId),
        ]);
      } catch (cacheError) {
        console.log('Cache not available, using database fallback');
        // Fallback to database query
        const todayStart = new Date(today + 'T00:00:00Z');
        const todayEnd = new Date(today + 'T23:59:59Z');
        
        const [apiCallResult] = await db
          .select({
            total: count()
          })
          .from(usageLogs)
          .where(and(
            eq(usageLogs.tenantId, tenantId),
            gte(usageLogs.createdAt, todayStart),
            lte(usageLogs.createdAt, todayEnd)
          ));
        
        apiCalls = apiCallResult?.total || 0;
        activeUsers = 1; // At least current user is active
      }

      // Get subscription limits - use fallback if service not available
      let limits = {
        apiCalls: 1000,
        users: 5,
        storage: 1000000000,
      };

      try {
        const subscription = await TenantService.getCurrentSubscription?.(tenantId);
        if (subscription?.usageLimits) {
          limits = subscription.usageLimits;
        }
      } catch (error) {
        console.log('Using default limits, subscription service unavailable');
      }

      return {
        success: true,
        data: {
          current: {
            apiCalls,
            activeUsers,
            storage: 0, // TODO: Implement storage tracking
          },
          limits,
          percentages: {
            apiCalls: limits.apiCalls > 0 ? (apiCalls / limits.apiCalls) * 100 : 0,
            users: limits.users > 0 ? (activeUsers / limits.users) * 100 : 0,
            storage: 0,
          },
        },
      };
    } catch (error) {
      request.log.error('Error fetching realtime usage:', error);
      return reply.code(500).send({ error: 'Failed to fetch realtime usage' });
    }
  });

  // Get usage metrics over time
  fastify.get('/metrics', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['day', 'week', 'month'], default: 'week' },
          app: { type: 'string' },
          metric: { type: 'string', enum: ['apiCalls', 'activeUsers', 'storage'] },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { period, app, metric } = request.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(startDate.getDate() - 7); // Last 7 days
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 30); // Last 30 days
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 6); // Last 6 months
          break;
      }

      let whereConditions = and(
        eq(usageMetricsDaily.tenantId, tenantId),
        gte(usageMetricsDaily.date, startDate),
        lte(usageMetricsDaily.date, endDate)
      );

      if (app) {
        whereConditions = and(
          whereConditions,
          eq(usageMetricsDaily.app, app)
        );
      }

      const metrics = await db
        .select()
        .from(usageMetricsDaily)
        .where(whereConditions)
        .orderBy(usageMetricsDaily.date);

      return {
        success: true,
        data: {
          period,
          metrics,
          summary: {
            totalApiCalls: metrics.reduce((sum, m) => sum + (m.apiCalls || 0), 0),
            totalUsers: Math.max(...metrics.map(m => m.activeUsers || 0), 0),
            avgResponseTime: metrics.length > 0 
              ? metrics.reduce((sum, m) => sum + (m.avgResponseTime || 0), 0) / metrics.length 
              : 0,
          },
        },
      };
    } catch (error) {
      request.log.error('Error fetching usage metrics:', error);
      return reply.code(500).send({ error: 'Failed to fetch usage metrics' });
    }
  });

  // Get usage breakdown by app
  fastify.get('/breakdown', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const today = new Date().toISOString().split('T')[0];
      const apps = ['crm', 'hr', 'affiliate', 'accounting', 'inventory', 'wrapper'];
      
      const breakdown = await Promise.all(
        apps.map(async (app) => {
          let apiCalls = 0;
          try {
            apiCalls = await UsageCache.getApiCallCount(tenantId, app, today);
          } catch (error) {
            // Fallback to database
            const todayStart = new Date(today + 'T00:00:00Z');
            const todayEnd = new Date(today + 'T23:59:59Z');
            
            const [result] = await db
              .select({
                total: count()
              })
              .from(usageLogs)
              .where(and(
                eq(usageLogs.tenantId, tenantId),
                eq(usageLogs.app, app),
                gte(usageLogs.createdAt, todayStart),
                lte(usageLogs.createdAt, todayEnd)
              ));
            
            apiCalls = result?.total || 0;
          }
          
          return {
            app,
            apiCalls,
            percentage: 0, // Will calculate after getting totals
          };
        })
      );

      const totalApiCalls = breakdown.reduce((sum, app) => sum + app.apiCalls, 0);
      
      // Calculate percentages
      breakdown.forEach(app => {
        app.percentage = totalApiCalls > 0 ? (app.apiCalls / totalApiCalls) * 100 : 0;
      });

      return {
        success: true,
        data: {
          breakdown: breakdown.filter(app => app.apiCalls > 0),
          total: totalApiCalls,
          period: 'today',
        },
      };
    } catch (error) {
      request.log.error('Error fetching usage breakdown:', error);
      return reply.code(500).send({ error: 'Failed to fetch usage breakdown' });
    }
  });

  // Get usage alerts
  fastify.get('/alerts', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
          isRead: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { page, limit, severity, isRead } = request.query;
      const offset = (page - 1) * limit;

      let whereClause = eq(usageAlerts.tenantId, tenantId);
      
      if (severity) {
        whereClause = and(whereClause, eq(usageAlerts.severity, severity));
      }
      
      if (typeof isRead === 'boolean') {
        whereClause = and(whereClause, eq(usageAlerts.isRead, isRead));
      }

      const alerts = await db
        .select()
        .from(usageAlerts)
        .where(whereClause)
        .orderBy(desc(usageAlerts.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: count() })
        .from(usageAlerts)
        .where(whereClause);

      return {
        success: true,
        data: {
          alerts,
          pagination: {
            page,
            limit,
            total: count,
            pages: Math.ceil(count / limit),
          },
        },
      };
    } catch (error) {
      request.log.error('Error fetching usage alerts:', error);
      return reply.code(500).send({ error: 'Failed to fetch usage alerts' });
    }
  });

  // Mark alert as read
  fastify.put('/alerts/:alertId/read', {
    schema: {
      params: {
        type: 'object',
        required: ['alertId'],
        properties: {
          alertId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { alertId } = request.params;

      const [alert] = await db
        .update(usageAlerts)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(
          eq(usageAlerts.alertId, alertId),
          eq(usageAlerts.tenantId, tenantId)
        ))
        .returning();

      if (!alert) {
        return reply.code(404).send({ error: 'Alert not found' });
      }

      return {
        success: true,
        data: alert,
        message: 'Alert marked as read',
      };
    } catch (error) {
      request.log.error('Error marking alert as read:', error);
      return reply.code(500).send({ error: 'Failed to mark alert as read' });
    }
  });

  // Get detailed usage logs
  fastify.get('/logs', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          app: { type: 'string' },
          endpoint: { type: 'string' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
          statusCode: { type: 'integer' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { page, limit, app, endpoint, method, statusCode, startDate, endDate } = request.query;
      const offset = (page - 1) * limit;

      let whereClause = eq(usageLogs.tenantId, tenantId);
      
      if (app) {
        whereClause = and(whereClause, eq(usageLogs.app, app));
      }
      
      if (endpoint) {
        whereClause = and(whereClause, eq(usageLogs.endpoint, endpoint));
      }
      
      if (method) {
        whereClause = and(whereClause, eq(usageLogs.method, method));
      }
      
      if (statusCode) {
        whereClause = and(whereClause, eq(usageLogs.statusCode, statusCode));
      }
      
      if (startDate) {
        whereClause = and(whereClause, gte(usageLogs.createdAt, new Date(startDate)));
      }
      
      if (endDate) {
        whereClause = and(whereClause, lte(usageLogs.createdAt, new Date(endDate)));
      }

      const logs = await db
        .select()
        .from(usageLogs)
        .where(whereClause)
        .orderBy(desc(usageLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: count() })
        .from(usageLogs)
        .where(whereClause);

      return {
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total: count,
            pages: Math.ceil(count / limit),
          },
          filters: {
            app,
            endpoint,
            method,
            statusCode,
            startDate,
            endDate,
          },
        },
      };
    } catch (error) {
      request.log.error('Error fetching usage logs:', error);
      return reply.code(500).send({ error: 'Failed to fetch usage logs' });
    }
  });
} 