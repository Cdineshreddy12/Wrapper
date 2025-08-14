/**
 * Health Check Routes
 * Provides endpoints for monitoring application health and deployment verification
 */

export default async function healthRoutes(fastify, options) {
  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    try {
      // Basic health check
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      };

      // Check database connection if available
      if (fastify.db) {
        try {
          // Simple database query to verify connection
          await fastify.db.execute('SELECT 1');
          health.database = 'connected';
        } catch (error) {
          health.database = 'disconnected';
          health.databaseError = error.message;
        }
      }

      // Check Redis connection if available
      if (fastify.redis) {
        try {
          await fastify.redis.ping();
          health.redis = 'connected';
        } catch (error) {
          health.redis = 'disconnected';
          health.redisError = error.message;
        }
      }

      // Check if all critical services are healthy
      const isHealthy = health.database !== 'disconnected' && health.redis !== 'disconnected';
      
      if (isHealthy) {
        reply.code(200).send(health);
      } else {
        reply.code(503).send({
          ...health,
          status: 'unhealthy',
          message: 'Some services are not responding'
        });
      }
    } catch (error) {
      reply.code(500).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Detailed health check endpoint
  fastify.get('/health/detailed', async (request, reply) => {
    try {
      const detailedHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        services: {}
      };

      // Database health check
      if (fastify.db) {
        try {
          const startTime = Date.now();
          await fastify.db.execute('SELECT 1');
          const responseTime = Date.now() - startTime;
          
          detailedHealth.services.database = {
            status: 'healthy',
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          detailedHealth.services.database = {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Redis health check
      if (fastify.redis) {
        try {
          const startTime = Date.now();
          await fastify.redis.ping();
          const responseTime = Date.now() - startTime;
          
          detailedHealth.services.redis = {
            status: 'healthy',
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          detailedHealth.services.redis = {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Check overall health
      const unhealthyServices = Object.values(detailedHealth.services)
        .filter(service => service.status === 'unhealthy');
      
      if (unhealthyServices.length > 0) {
        detailedHealth.status = 'degraded';
        detailedHealth.unhealthyServices = unhealthyServices.length;
      }

      reply.code(200).send(detailedHealth);
    } catch (error) {
      reply.code(500).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Readiness probe endpoint
  fastify.get('/health/ready', async (request, reply) => {
    try {
      // Check if application is ready to receive traffic
      const readiness = {
        ready: true,
        timestamp: new Date().toISOString(),
        checks: {}
      };

      // Database readiness check
      if (fastify.db) {
        try {
          await fastify.db.execute('SELECT 1');
          readiness.checks.database = 'ready';
        } catch (error) {
          readiness.checks.database = 'not_ready';
          readiness.ready = false;
        }
      }

      // Redis readiness check
      if (fastify.redis) {
        try {
          await fastify.redis.ping();
          readiness.checks.redis = 'ready';
        } catch (error) {
          readiness.checks.redis = 'not_ready';
          readiness.ready = false;
        }
      }

      if (readiness.ready) {
        reply.code(200).send(readiness);
      } else {
        reply.code(503).send(readiness);
      }
    } catch (error) {
      reply.code(500).send({
        ready: false,
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // Liveness probe endpoint
  fastify.get('/health/live', async (request, reply) => {
    // Simple liveness check - if this endpoint responds, the application is alive
    reply.code(200).send({
      alive: true,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime()
    });
  });

  // Deployment info endpoint
  fastify.get('/health/deployment', async (request, reply) => {
    try {
      const deployment = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        commit: process.env.GIT_COMMIT || 'unknown',
        branch: process.env.GIT_BRANCH || 'unknown',
        buildTime: process.env.BUILD_TIME || 'unknown',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          rss: process.memoryUsage().rss
        },
        uptime: process.uptime(),
        pid: process.pid
      };

      reply.code(200).send(deployment);
    } catch (error) {
      reply.code(500).send({
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });
}
