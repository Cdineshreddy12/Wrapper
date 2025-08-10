import trialManager from '../utils/trial-manager.js';
import Logger from '../utils/logger.js';

// Middleware to check if trial is expired and restrict operations
export async function trialRestrictionMiddleware(request, reply) {
  // Skip check for non-authenticated requests
  if (!request.userContext?.tenantId) {
    console.log('🔓 Trial restriction: No tenantId, skipping check');
    return;
  }

  // Skip check for auth-related operations during registration
  if (request.url.includes('/auth') || request.url.includes('/onboarding')) {
    console.log('🔓 Trial restriction: Auth/onboarding operation, skipping check');
    return;
  }

  // Allow ONLY payment, subscription, and auth operations when expired
  const allowedPathsForExpired = [
    '/api/subscriptions',
    '/api/payments', 
    '/api/billing',
    '/api/webhooks',
    '/api/auth',
    '/api/admin/auth-status',
    '/api/admin/trials', // For admin trial management
    '/health',
    '/docs',
    '/debug-routes',
    '/test-no-middleware'
  ];

  // Check if current path is allowed for expired trials
  const isAllowedPath = allowedPathsForExpired.some(path => 
    request.url.startsWith(path)
  );

  if (isAllowedPath) {
    console.log(`✅ Path ${request.url} is allowed even if trial expired`);
    return; // Allow these operations
  }

  // Additional check for critical endpoints that should always work
  const criticalEndpoints = [
    '/api/subscriptions/current',
    '/api/admin/auth-status',
    '/api/tenants/current'
  ];
  
  if (criticalEndpoints.some(endpoint => request.url === endpoint)) {
    console.log(`🔓 Trial restriction: Critical endpoint ${request.url}, allowing access`);
    return;
  }

  const requestId = Logger.generateRequestId('trial-restriction');
  const tenantId = request.userContext.tenantId;

  try {
    console.log(`🔒 [${requestId}] Checking trial expiry for tenant: ${tenantId}`);
    console.log(`🌐 [${requestId}] Request URL: ${request.url}`);
    console.log(`📝 [${requestId}] Method: ${request.method}`);

    // Add more detailed logging for debugging
    console.log(`🔍 [${requestId}] User context:`, {
      userId: request.userContext?.userId,
      email: request.userContext?.email,
      tenantId: request.userContext?.tenantId,
      isAuthenticated: request.userContext?.isAuthenticated
    });

    const expiryCheck = await trialManager.isTrialExpired(tenantId);
    
    console.log(`📊 [${requestId}] Trial status:`, expiryCheck);

    // Check if user has active paid subscription - skip trial expiry if they do
    const hasActivePaidSubscription = await trialManager.hasActivePaidSubscription(tenantId);
    console.log(`💳 [${requestId}] Has active paid subscription:`, hasActivePaidSubscription);

    if (expiryCheck.expired && !hasActivePaidSubscription) {
      console.log(`🚫 [${requestId}] TRIAL/PLAN EXPIRED - Access completely blocked!`);
      console.log(`📅 [${requestId}] Expired: ${expiryCheck.trialEnd || expiryCheck.currentPeriodEnd}`);
      console.log(`🔒 [${requestId}] Reason: ${expiryCheck.reason}`);
      console.log(`💳 [${requestId}] Only payment operations allowed`);

      // Calculate how long ago the trial/plan expired
      const now = new Date();
      const expiredDate = new Date(expiryCheck.trialEnd || expiryCheck.currentPeriodEnd);
      const daysExpired = Math.floor((now - expiredDate) / (1000 * 60 * 60 * 24));
      const hoursExpired = Math.floor((now - expiredDate) / (1000 * 60 * 60));
      const minutesExpired = Math.floor((now - expiredDate) / (1000 * 60));

      let expiredDuration = '';
      if (daysExpired > 0) {
        expiredDuration = `${daysExpired} day${daysExpired > 1 ? 's' : ''} ago`;
      } else if (hoursExpired > 0) {
        expiredDuration = `${hoursExpired} hour${hoursExpired > 1 ? 's' : ''} ago`;
      } else if (minutesExpired > 0) {
        expiredDuration = `${minutesExpired} minute${minutesExpired > 1 ? 's' : ''} ago`;
      } else {
        expiredDuration = 'just now';
      }

      // Determine the type of operation being blocked
      let operationType = 'operation';
      let specificMessage = '';
      
      const isTrialExpired = expiryCheck.reason.includes('trial');
      const isPaidPlanExpired = expiryCheck.reason.includes('paid_plan');

      if (isTrialExpired) {
        specificMessage = 'Your trial period has ended and your account is suspended. Upgrade your subscription to restore access to all features and data.';
      } else if (isPaidPlanExpired) {
        specificMessage = `Your ${expiryCheck.plan} subscription has expired and your account is suspended. Renew your subscription or choose a new plan to restore access.`;
      } else {
        specificMessage = 'Your subscription has expired and access is suspended. Please upgrade or renew to continue using the service.';
      }

      // More specific messages based on what they're trying to access
      if (request.url.includes('/users') || request.url.includes('/admin')) {
        operationType = 'user management';
      } else if (request.url.includes('/roles') || request.url.includes('/permissions')) {
        operationType = 'role management';
      } else if (request.url.includes('/analytics') || request.url.includes('/usage') || request.url.includes('/dashboard')) {
        operationType = 'dashboard and analytics';
      } else if (request.url.includes('/tenants') || request.url.includes('/organizations')) {
        operationType = 'organization management';
      } else if (request.url.includes('/api/')) {
        operationType = 'API access';
      } else if (request.method === 'GET') {
        operationType = 'data access';
      } else {
        operationType = 'feature access';
      }

      console.log(`📊 [${requestId}] Blocking ${operationType} - ${isTrialExpired ? 'Trial' : 'Plan'} expired ${expiredDuration}`);

      // Show immediate banner in response - return 200 to avoid HTTP errors
      return reply.code(200).send({
        success: false,
        error: isTrialExpired ? 'Trial Expired' : 'Subscription Expired',
        message: specificMessage,
        code: isTrialExpired ? 'TRIAL_EXPIRED' : 'SUBSCRIPTION_EXPIRED',
        operationType,
        data: {
          trialEnd: expiryCheck.trialEnd,
          currentPeriodEnd: expiryCheck.currentPeriodEnd,
          expiredDate: expiryCheck.trialEnd || expiryCheck.currentPeriodEnd,
          expiredDateFormatted: expiredDate.toLocaleDateString() + ' at ' + expiredDate.toLocaleTimeString(),
          expiredDuration,
          reason: expiryCheck.reason,
          plan: expiryCheck.plan,
          isTrialExpired,
          isPaidPlanExpired,
          allowedOperations: ['payments', 'subscriptions', 'billing'],
          upgradeUrl: '/api/subscriptions/checkout',
          billingUrl: '/billing',
          blockedOperation: {
            url: request.url,
            method: request.method,
            type: operationType
          }
        },
        requestId,
        // For frontend to show immediate banner/modal
        isTrialExpired: isTrialExpired,
        isSubscriptionExpired: isPaidPlanExpired,
        showUpgradePrompt: true,
        blockAppLoading: true, // Block all app loading until resolved
        immediate: true, // Show banner immediately
        // Add this to indicate the response is for subscription expiry
        subscriptionExpired: true
      });
    }

    console.log(`✅ [${requestId}] Access granted - subscription is active`);
    if (expiryCheck.trialEnd) {
      console.log(`📅 [${requestId}] Trial ends: ${expiryCheck.trialEnd}`);
    }
    if (expiryCheck.currentPeriodEnd) {
      console.log(`📅 [${requestId}] Current period ends: ${expiryCheck.currentPeriodEnd}`);
    }

  } catch (error) {
    console.error(`❌ [${requestId}] Error checking trial expiry:`, error);
    console.error(`❌ [${requestId}] Error details:`, {
      message: error.message,
      stack: error.stack,
      tenantId,
      url: request.url,
      method: request.method
    });
    
    // Don't block on check failure - log and continue
    console.log(`⚠️ [${requestId}] Continuing request due to check failure`);
    
    // If it's a database connection error or critical error, we might want to block
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error(`🚨 [${requestId}] Critical database error - blocking request`);
      return reply.code(503).send({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Database connection failed. Please try again later.'
      });
    }
  }
}

// Export for use in routes that need trial checking
export async function checkTrialStatus(tenantId) {
  return await trialManager.isTrialExpired(tenantId);
} 