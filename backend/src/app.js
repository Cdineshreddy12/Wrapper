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

// Import routes
import authRoutes from './routes/auth.js';
import tenantRoutes from './routes/tenants.js';
import userRoutes from './routes/users.js';
import subscriptionRoutes from './routes/subscriptions.js';
import permissionRoutes from './routes/permissions.js';
import roleRoutes from './routes/roles.js';
import analyticsRoutes from './routes/analytics.js';
import usageRoutes from './routes/usage.js';
import internalRoutes from './routes/internal.js';
import enhancedInternalRoutes from './routes/internal-enhanced.js';
import webhookRoutes from './routes/webhooks.js';
import proxyRoutes from './routes/proxy.js';
import onboardingRoutes from './routes/onboarding.js';
import adminRoutes from './routes/admin.js';
import invitationRoutes from './routes/invitations.js';
import suiteRoutes from './routes/suite.js';
import paymentRoutes from './routes/payments.js';
import activityRoutes from './routes/activity.js';
import trialRoutes from './routes/trial.js';
import customRolesRoutes from './routes/custom-roles.js';
import adminPromotionRoutes from './routes/admin-promotion.js';
import permissionMatrixRoutes from './routes/permission-matrix.js';
import enhancedCrmIntegrationRoutes from './routes/enhanced-crm-integration.js';


// Import middleware
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { usageTrackingPlugin } from './middleware/usage-tracking.js';
import { trialRestrictionMiddleware } from './middleware/trial-restriction.js';
import { fastifyCacheMetrics } from './middleware/cache-metrics.js';

// Import utilities
import trialManager from './utils/trial-manager.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  // Enable raw body support for webhooks
  bodyLimit: 1048576, // 1MB limit
  requestIdHeader: 'x-request-id'
});

// Raw body parser for webhooks
fastify.addContentTypeParser(['application/json'], { parseAs: 'buffer' }, function (req, body, done) {
  req.rawBody = body;
  
  // For webhook endpoints, keep raw body and don't parse JSON
  if (req.url.includes('/webhook')) {
    console.log('🎣 Webhook detected - preserving raw body for signature verification');
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
    contentSecurityPolicy: false // Disable CSP for development
  });

  // CORS
  await fastify.register(cors, {
    // Allow localhost for dev and *.zopkit.com for production
    origin: [
      process.env.FRONTEND_URL,
      /localhost:3001$/, // Frontend (dev)
      /localhost:3000$/, // Backend (dev)
      /localhost:5173$/, // CRM app (dev)
      /localhost:5174$/, // Alt port (dev)
      /localhost:3002$/, // Alt port (dev)
      /^https?:\/\/[a-z0-9-]+\.zopkit\.com$/i, // Any subdomain of zopkit.com (prod)
      /^https?:\/\/zopkit\.com$/i // Root domain if used
    ],
    credentials: true, // Required so browser can send cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    // Let the plugin echo the specific Origin back (not *) so cookies are accepted
    strictPreflight: true
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

  // Usage tracking plugin
  await fastify.register(usageTrackingPlugin);
  
  // Cache metrics plugin
  await fastify.register(fastifyCacheMetrics);
}

// Register global middleware
async function registerMiddleware() {
  // Auth middleware (will set userContext if authenticated) - runs on all requests
  fastify.addHook('preHandler', authMiddleware);

  // Trial restriction middleware (after auth, before routes)
  // Keep as preHandler but add better error handling
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      // Only run trial restriction if auth has been processed
      await trialRestrictionMiddleware(request, reply);
    } catch (error) {
      console.error('❌ Trial restriction middleware error:', error);
      // Don't block the request on middleware errors
      console.log('⚠️ Continuing request despite trial restriction error');
    }
  });

  // Error handler
  fastify.setErrorHandler(errorHandler);
}

// Register routes
async function registerRoutes() {
  // Health check
  fastify.get('/health', async (request, reply) => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
    };
  });

  // Debug endpoint to test route registration
  fastify.get('/debug-routes', async (request, reply) => {
    const routes = [];
    fastify.routes.forEach(route => {
      routes.push({
        method: route.method,
        url: route.url,
        prefix: route.prefix
      });
    });
    
    return {
      success: true,
      message: 'Route debugging info',
      totalRoutes: routes.length,
      routes: routes.slice(0, 20), // Show first 20 routes
      timestamp: new Date().toISOString()
    };
  });

  // Test endpoint that bypasses all middleware
  fastify.get('/test-no-middleware', async (request, reply) => {
    return {
      success: true,
      message: 'This endpoint bypasses all middleware',
      timestamp: new Date().toISOString(),
      headers: request.headers,
      url: request.url,
      method: request.method
    };
  });



  // API routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(tenantRoutes, { prefix: '/api/tenants' });
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(subscriptionRoutes, { prefix: '/api/subscriptions' });
  await fastify.register(permissionRoutes, { prefix: '/api/permissions' });
  await fastify.register(roleRoutes, { prefix: '/api/roles' });
  await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
  await fastify.register(usageRoutes, { prefix: '/api/usage' });
  await fastify.register(internalRoutes, { prefix: '/api/internal' });
  await fastify.register(enhancedInternalRoutes, { prefix: '/api' }); // Add proper prefix for consistency
  await fastify.register(webhookRoutes, { prefix: '/api/webhooks' });
  await fastify.register(proxyRoutes, { prefix: '/api/proxy' });
  await fastify.register(onboardingRoutes, { prefix: '/api/onboarding' });
  await fastify.register(adminRoutes, { prefix: '/api/admin' });
  await fastify.register(suiteRoutes, { prefix: '/api/suite' });
  await fastify.register(paymentRoutes, { prefix: '/api/payments' });
  await fastify.register(activityRoutes, { prefix: '/api/activity' });
  await fastify.register(trialRoutes, { prefix: '/api/trial' });
  await fastify.register(customRolesRoutes, { prefix: '/api/custom-roles' });
  await fastify.register(adminPromotionRoutes, { prefix: '/api/admin-promotion' });
  await fastify.register(permissionMatrixRoutes, { prefix: '/api/permission-matrix' });
  await fastify.register(enhancedCrmIntegrationRoutes, { prefix: '/api/enhanced-crm-integration' });
  
  // Applications endpoint (proxy to suite applications)
  fastify.get('/api/applications', async (request, reply) => {
    try {
      // Proxy to suite applications endpoint
      const { internalUserId, tenantId } = request.userContext;
      
      if (!internalUserId || !tenantId) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      // Import the SSO service (already instantiated)
      const ssoService = (await import('./services/sso-service.js')).default;
      const userApps = await ssoService.getUserApplications(internalUserId, tenantId);

      return {
        success: true,
        data: userApps
      };

    } catch (error) {
      console.error('❌ Failed to get applications:', error);
      return reply.code(500).send({
        error: 'Failed to get applications',
        message: error.message
      });
    }
  });

  // Public routes (no authentication required)
  await fastify.register(invitationRoutes, { prefix: '/api/invitations' });

  // Redirect root /auth to /api/auth/auth for CRM compatibility
  fastify.get('/auth', async (request, reply) => {
    const { app_code, redirect_url, ...otherParams } = request.query;
    
    console.log('🎯 ROOT /auth ENDPOINT HIT!', { 
      app_code, 
      redirect_url, 
      method: request.method,
      url: request.url,
      fullUrl: request.protocol + '://' + request.hostname + request.url,
      headers: request.headers['user-agent']
    });
    
    // Instead of redirecting, let's handle it directly here
    // This avoids redirect loops and ensures proper handling
    try {
      // Validate app_code
      const validAppCodes = ['crm', 'hr', 'affiliate', 'accounting', 'inventory'];
      if (!app_code || !validAppCodes.includes(app_code)) {
        console.log('❌ Invalid app_code:', app_code);
        return reply.code(400).send({
          error: 'Invalid app_code',
          message: `app_code must be one of: ${validAppCodes.join(', ')}`
        });
      }

      if (!redirect_url) {
        console.log('❌ Missing redirect_url');
        return reply.code(400).send({
          error: 'Missing redirect_url',
          message: 'redirect_url parameter is required'
        });
      }

      console.log('✅ Valid CRM auth request, processing...');
      
      // Import the auth handler logic
      const { UnifiedSSOService } = await import('./services/unified-sso-service.js');
      
      // Check if user is already authenticated
      const token = request.headers.authorization?.replace('Bearer ', '') || 
                    request.cookies?.auth_token ||
                    request.query.token;

      if (token) {
        try {
          console.log('🔍 Checking existing token...');
          const tokenContext = await UnifiedSSOService.validateUnifiedToken(token);
          
          if (tokenContext.isValid) {
            // User is already authenticated, generate app-specific token and redirect
            console.log('✅ User already authenticated, generating app token...');
            const appToken = await UnifiedSSOService.generateUnifiedToken(
              tokenContext.kindeUserId,
              tokenContext.kindeOrgId,
              app_code
            );

            const targetUrl = new URL(redirect_url);
            targetUrl.searchParams.set('token', appToken.token);
            targetUrl.searchParams.set('expires_at', appToken.expiresAt.toISOString());
            targetUrl.searchParams.set('app_code', app_code);

            console.log('🚀 Redirecting authenticated user to:', targetUrl.toString());
            return reply.redirect(targetUrl.toString());
          }
        } catch (error) {
          console.log('⚠️ Existing token invalid, proceeding with fresh auth');
        }
      }

      // User not authenticated, redirect to Kinde auth with app context
      const kindeService = await import('./services/kinde-service.js');
      // Use backend callback URL - this is the most reliable approach
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/callback`;
      const stateData = {
        app_code,
        redirect_url,
        timestamp: Date.now()
      };
      
      console.log('🔍 Generating Kinde auth URL with:', {
        redirectUri,
        stateData,
        fullState: JSON.stringify(stateData)
      });
      
      const kindeAuthUrl = kindeService.default.generateSocialLoginUrl({
        redirectUri,
        state: JSON.stringify(stateData),
        prompt: 'login'
      });

      console.log('🚀 Redirecting to Kinde authentication:', kindeAuthUrl);
      console.log('🔍 Decoded redirect URI:', decodeURIComponent(redirectUri));
      return reply.redirect(kindeAuthUrl);

    } catch (error) {
      console.error('❌ Root auth handler error:', error);
      return reply.code(500).send({
        error: 'Authentication failed',
        message: error.message
      });
    }
  });

  // Test endpoint for CRM authentication (bypasses Kinde for testing)
  fastify.get('/test-auth', async (request, reply) => {
    const { app_code, redirect_url } = request.query;
    
    console.log('🧪 Test auth endpoint called:', { app_code, redirect_url });
    
    if (!app_code || !redirect_url) {
      return reply.code(400).send({
        error: 'Missing parameters',
        message: 'app_code and redirect_url are required'
      });
    }
    
    try {
      // Create a simple test token without database queries
      const jwt = await import('jsonwebtoken');
      
      const testTokenPayload = {
        iss: 'unified-wrapper-sso',
        sub: 'test-user-123',
        aud: app_code,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60), // 8 hours
        
        // Test user data
        user: {
          id: 'test-user-123',
          kindeId: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
          isAdmin: true,
          isActive: true
        },
        
        // Test organization data
        organization: {
          id: 'test-org-123',
          name: 'Test Organization',
          subdomain: 'test',
          kindeOrgId: 'test-org'
        },
        
        // Test permissions
        permissions: {
          crm: {
            contacts: ['read', 'write', 'delete'],
            deals: ['read', 'write'],
            reports: ['read']
          }
        },
        
        // Test subscription
        subscription: {
          tier: 'premium',
          status: 'active',
          subscribedFeatures: ['crm', 'analytics', 'billing']
        }
      };
      
      const testToken = jwt.default.sign(
        testTokenPayload,
        process.env.JWT_SECRET || 'test-secret-key',
        { algorithm: 'HS256' }
      );
      
      const expiresAt = new Date(Date.now() + (8 * 60 * 60 * 1000)); // 8 hours from now
      
      const targetUrl = new URL(redirect_url);
      targetUrl.searchParams.set('token', testToken);
      targetUrl.searchParams.set('expires_at', expiresAt.toISOString());
      targetUrl.searchParams.set('app_code', app_code);
      targetUrl.searchParams.set('test_mode', 'true');
      
      console.log('🧪 Test auth: Redirecting to CRM with test token');
      console.log('🔍 Target URL:', targetUrl.toString());
      console.log('🔍 Token length:', testToken.length);
      console.log('🔍 App code:', app_code);
      console.log('🔍 Test mode:', 'true');
      
      return reply.redirect(targetUrl.toString());
      
    } catch (error) {
      console.error('❌ Test auth error:', error);
      return reply.code(500).send({
        error: 'Test authentication failed',
        message: error.message
      });
    }
  });

  // Redirect root /logout to /api/auth/logout for CRM compatibility
  fastify.get('/logout', async (request, reply) => {
    const { app_code, redirect_url, ...otherParams } = request.query;
    
    console.log('🔍 Root /logout redirect:', { app_code, redirect_url });
    
    // Build the redirect URL
    const redirectUrl = new URL('/api/auth/logout', `${process.env.BACKEND_URL || 'http://localhost:3000'}`);
    
    // Add all query parameters
    if (app_code) redirectUrl.searchParams.set('app_code', app_code);
    if (redirect_url) redirectUrl.searchParams.set('redirect_url', redirect_url);
    
    // Add any other parameters
    Object.keys(otherParams).forEach(key => {
      redirectUrl.searchParams.set(key, otherParams[key]);
    });
    
    console.log('🚀 Redirecting to:', redirectUrl.toString());
    return reply.redirect(redirectUrl.toString());
  });

  // Note: Static files should be served by nginx/reverse proxy in production
  // No catch-all route needed here - let nginx handle frontend routes
}

// Graceful shutdown
async function gracefulShutdown() {
  console.log('Starting graceful shutdown...');
  
  try {
    await fastify.close();
    console.log('Fastify server closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    console.log('🚀 Starting Wrapper API Server...');
    
    // Register everything
    await registerPlugins();
    await registerMiddleware();
    await registerRoutes();

    // Start the server
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log(`✅ Server listening on http://${host}:${port}`);
    console.log(`📚 API Documentation: http://${host}:${port}/docs`);
    console.log(`🏥 Health Check: http://${host}:${port}/health`);
    
    // Initialize trial monitoring system after app setup
    await initializeTrialSystem();
    
    // Initialize demo cache data for distributed caching demonstration
    try {
      const { initializeDemoCache } = await import('./utils/redis.js');
      await initializeDemoCache();
    } catch (error) {
      console.error('❌ Failed to initialize demo cache:', error);
    }
    
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

// Start the application
if (import.meta.url === `file://${process.argv[1]}` || process.env.NODE_ENV !== 'production') {
  start();
}

// Initialize trial monitoring system after app setup
export async function initializeTrialSystem() {
  try {
    console.log('🚀 Initializing trial monitoring system...');
    
    // Start trial monitoring
    trialManager.startTrialMonitoring();
    
    // Verify it's running
    const status = trialManager.getMonitoringStatus();
    if (status.isRunning) {
      console.log('✅ Trial monitoring system initialized successfully');
      console.log(`📊 Active jobs: ${status.activeJobs}`);
    } else {
      console.error('❌ Failed to initialize trial monitoring system');
    }
    
  } catch (error) {
    console.error('❌ Error initializing trial system:', error);
  }
}

// Call initialization after database connection is established
if (process.env.NODE_ENV !== 'test') {
  // Delay initialization to ensure database is ready
  setTimeout(() => {
    initializeTrialSystem().catch(error => {
      console.error('Failed to initialize trial system:', error);
    });
  }, 2000);
}

export default fastify; 