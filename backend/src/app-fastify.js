import './run-first-heavy.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import 'dotenv/config';
import { shouldLogVerbose } from './utils/verbose-log.js';
import './run-after-core.js';

// DB loads at start() so app.js parses quickly; routes load from app-routes.js

// Check if logging should be disabled (set this to true or use DISABLE_LOGGING env var)
const DISABLE_ALL_LOGGING = process.env.DISABLE_LOGGING === 'true';

// Optionally suppress all console output (uncomment if you want to disable console.log too)
if (DISABLE_ALL_LOGGING && process.env.SUPPRESS_CONSOLE === 'true') {
  const noop = () => { };
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  // Keep console.error for critical errors
  // console.error = noop;
}

// Routes and heavy plugins load on demand (app-routes.js, registerPlugins, start()) so app.js parses fast

import './run-before-dbmanager.js';
import { dbManager } from './db/connection-manager.js';

const fastify = Fastify({
  logger: DISABLE_ALL_LOGGING ? false : {
    level: process.env.LOG_LEVEL || 'info',
  },
  // Allow union types in JSON schema (fixes strict mode warnings for isActive, limit, etc.)
  ajv: {
    customOptions: { allowUnionTypes: true },
  },
  // Enable raw body support for webhooks
  bodyLimit: 1048576, // 1MB limit
  requestIdHeader: 'x-request-id'
});

// Initialize Elasticsearch logger and hook into Fastify logs
let enhancedLogger = null;

if (!DISABLE_ALL_LOGGING) {
  try {
    enhancedLogger = (await import('./utils/logger-enhanced.js')).default;
    console.log('✅ Elasticsearch logger initialized');
  } catch (error) {
    console.warn('⚠️ Could not load Elasticsearch logger:', error.message);
  }

  // Hook into Fastify's logging to send logs to Elasticsearch
  if (enhancedLogger && enhancedLogger.winstonLogger) {
    // Override Fastify's log methods to also send to Elasticsearch
    const originalLog = fastify.log;

    fastify.addHook('onRequest', async (request, reply) => {
      // Log incoming requests to Elasticsearch
      enhancedLogger.winstonLogger.info('Incoming request', {
        method: request.method,
        url: request.url,
        hostname: request.hostname,
        remoteAddress: request.ip,
        requestId: request.id,
        service: process.env.SERVICE_NAME || 'wrapper-backend',
        env: process.env.NODE_ENV || 'development'
      });
    });

    fastify.addHook('onResponse', async (request, reply) => {
      // Log completed requests to Elasticsearch
      enhancedLogger.winstonLogger.info('Request completed', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
        requestId: request.id,
        service: process.env.SERVICE_NAME || 'wrapper-backend',
        env: process.env.NODE_ENV || 'development'
      });
    });

    // Hook into Fastify's error logging
    fastify.addHook('onError', async (request, reply, error) => {
      // Log errors to Elasticsearch
      enhancedLogger.winstonLogger.error('Request error', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode || 500,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code
        },
        requestId: request.id,
        service: process.env.SERVICE_NAME || 'wrapper-backend',
        env: process.env.NODE_ENV || 'development'
      });
    });

    console.log('✅ Fastify logs will be sent to Elasticsearch');
  }
} else {
  console.log('🔇 All logging disabled');
}

// Helper function to log important messages to both console and Elasticsearch
// Usage: logToES('info', 'Important message', { key: 'value' })
global.logToES = (level, message, data = {}) => {
  if (DISABLE_ALL_LOGGING) return; // Skip logging if disabled

  console.log(`[${level.toUpperCase()}] ${message}`, data);
  if (enhancedLogger && enhancedLogger.winstonLogger) {
    const logData = {
      message,
      ...data,
      service: process.env.SERVICE_NAME || 'wrapper-backend',
      env: process.env.NODE_ENV || 'development'
    };

    switch (level.toLowerCase()) {
      case 'error':
        enhancedLogger.winstonLogger.error(message, logData);
        break;
      case 'warn':
        enhancedLogger.winstonLogger.warn(message, logData);
        break;
      case 'debug':
        enhancedLogger.winstonLogger.debug(message, logData);
        break;
      default:
        enhancedLogger.winstonLogger.info(message, logData);
    }
  }
};

// Raw body parser for webhooks
fastify.addContentTypeParser(['application/json'], { parseAs: 'buffer' }, function (req, body, done) {
  req.rawBody = body;

  console.log('🔍 CONTENT PARSER - URL:', req.url, 'Method:', req.method);

  // For webhook endpoints, keep raw body and don't parse JSON
  if (req.url.includes('/webhook')) {
    console.log('🎣 GLOBAL WEBHOOK DETECTED:', req.url, '- preserving raw body for signature verification');
    console.log('🎣 WEBHOOK BODY LENGTH:', body.length);
    done(null, body);
    return;
  }

  try {
    const json = JSON.parse(body);

    // Handle double-stringified restrictions field issue
    if (json.restrictions && typeof json.restrictions === 'string') {
      try {
        json.restrictions = JSON.parse(json.restrictions);
        console.log('🔧 Fixed double-stringified restrictions field');
      } catch (e) {
        // If parsing fails, keep as string for validation to catch it
        console.log('⚠️ Could not parse restrictions string, keeping as is for validation');
      }
    }

    done(null, json);
  } catch (err) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

// Register plugins
async function registerPlugins() {
  // Security
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable CSP for development
    hsts: false // Disable HSTS until HTTPS is configured
  });

  // CORS
  await fastify.register(cors, {
    // Allow localhost for dev and *.zopkit.com for production
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Always allow localhost origins (for development)
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        if (shouldLogVerbose()) console.log(`✅ CORS allowed origin: ${origin}`);
        callback(null, true);
        return;
      }

      // Check against allowed production origins
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        /^https?:\/\/[a-z0-9-]+\.zopkit\.com$/i, // Any subdomain of zopkit.com (prod)
        /^https?:\/\/zopkit\.com$/i // Root domain if used
      ];

      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        }
        return allowed.test(origin);
      });

      if (isAllowed) {
        if (shouldLogVerbose()) console.log(`✅ CORS allowed origin: ${origin}`);
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Required so browser can send cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Application',
      'X-Kinde-User-ID',      // CRM sends this
      'X-Organization-ID',    // CRM sends this
      'X-Tenant-ID',          // Frontend sends this
      'x-tenant-id',          // Alternative casing
      'Origin',               // Browser sends this
      'Accept',               // Browser sends this
      'Accept-Language',      // Browser sends this
      'Accept-Encoding',      // Browser sends this
      'Cache-Control',        // Browser sends this
      'Pragma',               // Browser sends this
      'Sec-Fetch-Dest',       // Modern browser security
      'Sec-Fetch-Mode',       // Modern browser security
      'Sec-Fetch-Site',       // Modern browser security
      'User-Agent'            // Browser identification
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page'
    ],
    // Let the plugin echo the specific Origin back (not *) so cookies are accepted
    strictPreflight: true,
    // Handle preflight requests properly
    preflightContinue: false,
    // Set max age for preflight cache
    maxAge: 86400 // 24 hours
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // Cookies
  await fastify.register(cookie, {
    secret: process.env.SESSION_SECRET,
    parseOptions: {},
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '800'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    skipOnError: true,
    keyGenerator: (request) => {
      // Rate limit by tenant + IP for authenticated requests
      if (request.userContext?.tenantId) {
        return `${request.userContext.tenantId}:${request.ip}`;
      }
      return request.ip;
    },
  });

  // File upload
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000'), // 50MB
      files: 5,
      headerPairs: 2000,
    },
  });

  // Swagger documentation
  if (process.env.NODE_ENV === 'development') {
    await fastify.register(swagger, {
      routePrefix: '/docs',
      swagger: {
        info: {
          title: 'Wrapper API',
          description: 'Multi-tenant SaaS wrapper platform API',
          version: '1.0.0',
        },
        host: `localhost:${process.env.PORT || 3000}`,
        schemes: ['http'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'Auth', description: 'Authentication endpoints' },
          { name: 'Tenants', description: 'Tenant management' },
          { name: 'Users', description: 'User management' },
          { name: 'Subscriptions', description: 'Billing and subscriptions' },
          { name: 'Permissions', description: 'Role and permission management' },
          { name: 'Usage', description: 'Usage tracking and analytics' },
          { name: 'Activity', description: 'Activity logs and audit trails' },
          { name: 'Organization', description: 'Organization resolution and validation' },
          { name: 'Internal', description: 'Internal API for tools' },
          { name: 'Webhooks', description: 'Webhook handlers' },
        ],
        securityDefinitions: {
          Bearer: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
          },
        },
      },
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      exposeRoute: true,
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
  }

  const { usageTrackingPlugin } = await import('./middleware/usage-tracking.js');
  await fastify.register(usageTrackingPlugin);

  const { fastifyCacheMetrics } = await import('./middleware/cache-metrics.js');
  await fastify.register(fastifyCacheMetrics);
}

// Initialize RLS service (uses db from app-routes load or preload)
let rlsService = null;

async function initializeRLS() {
  try {
    console.log('🚀 Initializing RLS Tenant Isolation Service...');
    const { db, connectionString } = await import('./db/index.js');
    const { RLSTenantIsolationService } = await import('./middleware/rls-tenant-isolation.js');

    rlsService = new RLSTenantIsolationService(db, connectionString);

    // Import and set tenants table reference
    const { tenants } = await import('./db/schema/index.js');
    rlsService.setTenantsTable(tenants);

    // Make RLS service globally available for health checks
    global.rlsService = rlsService;

    console.log('✅ RLS Tenant Isolation Service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize RLS service:', error);
    // Don't exit - continue without RLS for now
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  console.log('🛑 Starting graceful shutdown...');

  try {
    // Close Fastify server first
    await fastify.close();
    console.log('✅ Fastify server closed.');

    // Redis connection disabled - no need to disconnect
    // Disconnect Redis connections
    /*
    try {
      const redisManager = (await import('./utils/redis.js')).default;
      await redisManager.disconnect();
      console.log('✅ Redis connections closed.');
    } catch (redisError) {
      console.warn('⚠️ Error closing Redis connections:', redisError.message);
    }
    */

    console.log('✅ Graceful shutdown completed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    console.log('🚀 Starting Wrapper API Server...');

    console.log('🔌 Initializing database...');
    await import('./db/index.js');
    await dbManager.initialize();
    console.log('✅ Database ready');

    await registerPlugins();

    process.stdout.write('  Loading routes & middleware (may take 1–2 min on first run)...\n');
    const { registerMiddleware, registerRoutes } = await import('./app-routes.js');
    await registerMiddleware(fastify);

    await initializeRLS();

    await registerRoutes(fastify);

    // Start the server
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    const server = await fastify.listen({ port, host });

    // Initialize WebSocket server for real-time notifications
    try {
      const { initWebSocketServer } = await import('./utils/websocket-server.js');
      // Get the underlying HTTP server from Fastify
      initWebSocketServer(fastify.server);
      console.log('✅ WebSocket server initialized for real-time notifications');
    } catch (error) {
      console.warn('⚠️ Failed to initialize WebSocket server:', error.message);
      // Don't fail startup if WebSocket fails
    }

    console.log(`✅ Server listening on http://${host}:${port}`);
    console.log(`📚 API Documentation: http://${host}:${port}/docs`);
    console.log(`🏥 Health Check: http://${host}:${port}/health`);

    // TEST: Force a log to Elasticsearch
    try {
      const enhancedLogger = (await import('./utils/logger-enhanced.js')).default;
      enhancedLogger.winstonLogger.info('Server started successfully', {
        port,
        host,
        environment: process.env.NODE_ENV || 'development',
        service: process.env.SERVICE_NAME || 'wrapper-backend',
        timestamp: new Date().toISOString()
      });
      console.log('📝 Test log sent to Elasticsearch');
    } catch (error) {
      console.error('❌ Failed to send test log:', error.message);
      // Check for Elasticsearch connection errors
      if (error.message.includes('Elasticsearch') || error.message.includes('ECONNREFUSED')) {
        console.warn('⚠️ Elasticsearch may not be running or accessible');
        console.warn('   Make sure Elasticsearch is running: docker compose ps');
        console.warn('   Check ELASTICSEARCH_URL environment variable');
      }
    }

    // // Initialize trial monitoring system after app setup
    // await initializeTrialSystem();

    // Redis connection disabled - app will run without Redis
    // To re-enable Redis, uncomment the code below and ensure Redis is running
    /*
    try {
      const redisManager = (await import('./utils/redis.js')).default;
      
      // Set a timeout for Redis connection (5 seconds)
      const connectPromise = redisManager.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      console.log('✅ Redis sync services initialized');

      // Verify Redis connection
      if (!redisManager.isConnected) {
        console.warn('⚠️ Redis connected but isConnected flag is false');
      } else {
        console.log('✅ Redis connection verified');
      }
    } catch (error) {
      // Redis is optional - log warning but don't fail startup
      console.warn('⚠️ Redis not available - continuing without Redis');
      console.warn('   Redis is used for caching and sync services');
      console.warn('   To enable Redis:');
      console.warn('   1. Start Redis: redis-server');
      console.warn('   2. Or set REDIS_URL environment variable for cloud Redis');
      console.warn('   App will continue to run without Redis (some features may be limited)');
    }
    */
    console.log('ℹ️ Redis optional; app running without Redis. Uncomment Redis init in app.js to enable.');

    // Setup graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});


export async function run() { await start(); }


// // Initialize trial monitoring system after app setup
// export async function initializeTrialSystem() {
//   try {
//     console.log('🚀 Initializing trial monitoring system...');

//     // Start trial monitoring
//     trialManager.startTrialMonitoring();

//     // Verify it's running
//     const status = trialManager.getMonitoringStatus();
//     if (status.isRunning) {
//       console.log('✅ Trial monitoring system initialized successfully');
//       console.log(`📊 Active jobs: ${status.activeJobs}`);
//     } else {
//       console.error('❌ Failed to initialize trial monitoring system');
//     }

//   } catch (error) {
//     console.error('❌ Error initializing trial system:', error);
//   }
// }

// Initialize credit expiry monitoring system after app setup
export async function initializeCreditExpirySystem() {
  try {
    console.log('🚀 Initializing credit expiry monitoring system...');

    const { default: creditExpiryManager } = await import('./utils/credit-expiry-manager.js');
    creditExpiryManager.startExpiryMonitoring();

    const status = creditExpiryManager.getMonitoringStatus();
    if (status.isRunning) {
      console.log('✅ Credit expiry monitoring system initialized successfully');
      console.log(`📊 Active jobs: ${status.activeJobs}`);
    } else {
      console.error('❌ Failed to initialize credit expiry monitoring system');
    }

  } catch (error) {
    console.error('❌ Error initializing credit expiry system:', error);
  }
}

// // Call initialization after database connection is established
// if (process.env.NODE_ENV !== 'test') {
//   // Delay initialization to ensure database is ready
//   setTimeout(() => {
//     initializeTrialSystem().catch(error => {
//       console.error('Failed to initialize trial system:', error);
//     });
//   }, 2000);
// }

// Call credit expiry initialization after database connection is established
if (process.env.NODE_ENV !== 'test') {
  // Delay initialization to ensure database is ready
  setTimeout(() => {
    initializeCreditExpirySystem().catch(error => {
      console.error('Failed to initialize credit expiry system:', error);
    });
  }, 3000);
}

export default fastify;
