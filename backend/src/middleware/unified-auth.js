import { UnifiedSSOService } from '../services/unified-sso-service.js';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/health',
  '/api/auth',
  '/api/webhooks',
  '/api/invitations',
  '/docs'
];

export async function unifiedAuthMiddleware(request, reply) {
  // Skip auth for public routes
  if (isPublicRoute(request.url)) {
    return;
  }

  console.log('🔍 Unified Auth - Processing request:', {
    method: request.method,
    url: request.url,
    hasAuthHeader: !!request.headers.authorization
  });

  // Extract token
  const token = extractToken(request);
  
  if (!token) {
    console.log('❌ No token found');
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication token required'
    });
  }

  try {
    // Validate token and get full context
    const tokenContext = await UnifiedSSOService.validateUnifiedToken(token);
    
    if (!tokenContext.isValid) {
      console.log('❌ Invalid token:', tokenContext.error);
      return reply.code(401).send({
        error: 'Invalid token',
        message: tokenContext.error
      });
    }

    console.log('✅ Token validated successfully for user:', tokenContext.user.email);

    // Set comprehensive user context - everything apps need!
    request.userContext = {
      // User identity
      userId: tokenContext.user.id,
      kindeUserId: tokenContext.user.kindeId,
      email: tokenContext.user.email,
      name: tokenContext.user.name,
      avatar: tokenContext.user.avatar,
      isAdmin: tokenContext.user.isAdmin,
      isActive: tokenContext.user.isActive,

      // Organization context
      tenantId: tokenContext.organization.id,
      organizationName: tokenContext.organization.name,
      subdomain: tokenContext.organization.subdomain,
      kindeOrgId: tokenContext.organization.kindeOrgId,

      // Subscription & access
      subscription: tokenContext.subscription,
      allowedApps: tokenContext.allowedApps,

      // Permissions
      permissions: tokenContext.permissions,
      restrictions: tokenContext.restrictions,
      roles: tokenContext.roles,

      // Helper methods
      hasPermission: (module, action) => 
        UnifiedSSOService.checkPermission(tokenContext, module, action),
      
      hasAppAccess: (appCode) => 
        UnifiedSSOService.checkAppAccess(tokenContext, appCode),

      // Authentication flags
      isAuthenticated: true,
      needsOnboarding: false
    };

    // Legacy compatibility
    request.user = request.userContext;

    console.log('✅ User context set successfully');

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return reply.code(500).send({
      error: 'Authentication error',
      message: 'Failed to process authentication'
    });
  }
}

function isPublicRoute(url) {
  return PUBLIC_ROUTES.some(route => url.startsWith(route));
}

function extractToken(request) {
  // Try Authorization header first
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to cookies
  return request.cookies?.kinde_token || request.cookies?.token || null;
}