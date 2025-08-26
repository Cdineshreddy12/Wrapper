import kindeService from '../services/kinde-service.js';
import { db } from '../db/index.js';
import { tenants, tenantUsers } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/health',
  '/auth', // CRM authentication endpoint (root level)
  '/logout', // CRM logout endpoint (root level)
  '/test-auth', // Test authentication endpoint
  '/api/auth',
  '/api/webhooks',
  '/api/subscriptions/webhook', // Stripe webhook endpoint
  '/api/subscriptions/test-webhook', // Test webhook endpoint (for debugging)
  '/api/subscriptions/debug-stripe-config', // Stripe config debug endpoint
  '/api/payments/webhook', // Payment webhook endpoint
  '/api/onboarding',
  '/api/invitations',
  // Removed resolve-org endpoint
  '/api/organizations/',
  '/docs',
  '/api/metrics/', // Add metrics endpoints for dashboard access
];

export async function authMiddleware(request, reply) {
  // Skip auth for public routes
  if (isPublicRoute(request.url)) {
    return;
  }

  // Add detailed logging of incoming request
  console.log('🔍 Auth Middleware - Incoming Request:', {
    method: request.method,
    url: request.url,
    headers: {
      authorization: request.headers.authorization,
      cookie: request.headers.cookie,
      'content-type': request.headers['content-type'],
      origin: request.headers.origin,
      'user-agent': request.headers['user-agent']?.substring(0, 50) + '...'
    },
    cookies: request.cookies,
    hasAuthHeader: !!request.headers.authorization,
    authHeaderValue: request.headers.authorization ? 
      request.headers.authorization.substring(0, 20) + '...' : 'None'
  });

  // Extract token from cookies (new format)
  const token = extractToken(request);
  
  if (!token) {
    console.log('❌ Auth Middleware - No token extracted, sending 401');
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication token required',
      statusCode: 401,
    });
  }

  console.log('✅ Auth Middleware - Token extracted successfully, validating...');

  try {
    // Validate token with Kinde
    const kindeUser = await kindeService.validateToken(token);
    
    console.log('✅ Auth Middleware - Token validation successful');
    
    // Validate user context
    if (!kindeUser || !kindeUser.userId) {
      console.error('❌ Auth Middleware - Invalid user context from token validation');
      return reply.code(401).send({ error: 'Invalid token: no user ID found' });
    }

    console.log('🔍 Auth Middleware - Validated kindeUser:', {
      userId: kindeUser.userId,
      organizationId: kindeUser.organization?.id,
      hasOrganization: !!kindeUser.organization?.id
    });

    // Clean up unwanted default organization assignments from Kinde
    if (kindeUser.organizations && kindeUser.organizations.length > 1) {
      console.log('🧹 User assigned to multiple organizations, checking for unwanted defaults...');
      
      // Check if user has a proper organization in our database
      const userTenants = await db
        .select({
          tenantId: tenantUsers.tenantId,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenantUsers)
        .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
        .where(eq(tenantUsers.kindeUserId, kindeUser.userId));
      
      const validOrgCodes = userTenants.map(t => t.kindeOrgId);
      console.log('📋 User\'s valid organizations in our system:', validOrgCodes);
      
      // Remove user from any Kinde organizations they shouldn't be in
      for (const org of kindeUser.organizations) {
        if (!validOrgCodes.includes(org.code) && org.code !== kindeUser.organization?.id) {
          console.log(`🗑️ Removing user from unwanted default organization: ${org.code}`);
          try {
            await kindeService.removeUserFromOrganization(kindeUser.userId, org.code);
            console.log(`✅ Removed user from default organization: ${org.code}`);
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to remove user from organization ${org.code}:`, cleanupError.message);
          }
        }
      }
    }

    // Look up tenant in database using Kinde org_code
    let tenantId = null;
    let userRecord = null;
    let onboardingCompleted = false;
    
    if (kindeUser.organization?.id) {
      console.log('🔍 Auth Middleware - Looking up tenant for org_code:', kindeUser.organization.id);
      
      try {
        const [tenant] = await db
          .select({ tenantId: tenants.tenantId })
          .from(tenants)
          .where(eq(tenants.kindeOrgId, kindeUser.organization.id))
          .limit(1);
          
        if (tenant) {
          tenantId = tenant.tenantId;
          console.log('✅ Auth Middleware - Found tenant:', tenantId);
          
          // Now look up the user record to check onboarding completion
          console.log('🔍 Auth Middleware - Looking up user record for Kinde user:', kindeUser.userId);
          const [user] = await db
            .select({ 
              userId: tenantUsers.userId,
              onboardingCompleted: tenantUsers.onboardingCompleted,
              email: tenantUsers.email,
              name: tenantUsers.name,
              isActive: tenantUsers.isActive,
              isTenantAdmin: tenantUsers.isTenantAdmin,
              invitedBy: tenantUsers.invitedBy
            })
            .from(tenantUsers)
            .where(and(
              eq(tenantUsers.kindeUserId, kindeUser.userId),
              eq(tenantUsers.tenantId, tenantId)
            ))
            .limit(1);
            
          if (user) {
            userRecord = user;
            onboardingCompleted = user.onboardingCompleted;
            console.log('✅ Auth Middleware - Found user record:', {
              userId: user.userId,
              email: user.email,
              onboardingCompleted: user.onboardingCompleted,
              isActive: user.isActive,
              isTenantAdmin: user.isTenantAdmin,
              invitedBy: user.invitedBy
            });
          } else {
            console.log('⚠️ Auth Middleware - Tenant exists but user record not found. User may need to complete onboarding.');
          }
        } else {
          console.log('❌ Auth Middleware - No tenant found for org_code. User needs onboarding.');
        }
      } catch (dbError) {
        console.error('❌ Auth Middleware - Database lookup error:', dbError);
      }
    } else {
      console.log('⚠️ Auth Middleware - User has no organization. Checking for existing user records...');
      console.log('🔍 Auth Middleware - Looking for kindeUserId:', kindeUser.userId);
      
      // User has no current organization, but they might have completed onboarding before
      // Let's check if they have any user records in the system
      try {
        const userRecords = await db
          .select({
            userId: tenantUsers.userId,
            tenantId: tenantUsers.tenantId,
            email: tenantUsers.email,
            name: tenantUsers.name,
            onboardingCompleted: tenantUsers.onboardingCompleted,
            isActive: tenantUsers.isActive,
            isTenantAdmin: tenantUsers.isTenantAdmin,
            invitedBy: tenantUsers.invitedBy
          })
          .from(tenantUsers)
          .where(and(
            eq(tenantUsers.kindeUserId, kindeUser.userId),
            eq(tenantUsers.isActive, true)
          ));
          
        console.log(`🔍 Auth Middleware - Query for kindeUserId ${kindeUser.userId} returned ${userRecords.length} records`);
          
        if (userRecords.length > 0) {
          console.log(`🔍 Auth Middleware - Found ${userRecords.length} existing user record(s)`);
          
          // If user has multiple organizations, use the first active one
          // In a more sophisticated setup, you'd handle org selection
          const activeUser = userRecords.find(u => u.onboardingCompleted) || userRecords[0];
          
          if (activeUser) {
            userRecord = activeUser;
            tenantId = activeUser.tenantId;
            onboardingCompleted = activeUser.onboardingCompleted;
            
            console.log('✅ Auth Middleware - Using existing user record:', {
              userId: activeUser.userId,
              tenantId: activeUser.tenantId,
              email: activeUser.email,
              onboardingCompleted: activeUser.onboardingCompleted,
              isTenantAdmin: activeUser.isTenantAdmin,
              invitedBy: activeUser.invitedBy
            });
          }
        } else {
          console.log('❌ Auth Middleware - No existing user records found for kindeUserId:', kindeUser.userId);
          console.log('🔍 Auth Middleware - User is likely a new admin who needs onboarding.');
        }
      } catch (dbError) {
        console.error('❌ Auth Middleware - Error checking existing user records:', dbError);
      }
    }
    
    // If we didn't find a tenant/user record above, try to find user by kindeUserId across all organizations
    // This handles the case where Kinde assigns user to wrong org during invitation acceptance
    if (!tenantId || !userRecord) {
      console.log('🔍 Auth Middleware - Fallback: Looking for user by kindeUserId across all organizations...');
      
      try {
        const fallbackUsers = await db
          .select({
            userId: tenantUsers.userId,
            tenantId: tenantUsers.tenantId,
            email: tenantUsers.email,
            name: tenantUsers.name,
            onboardingCompleted: tenantUsers.onboardingCompleted,
            isActive: tenantUsers.isActive,
            isTenantAdmin: tenantUsers.isTenantAdmin,
            invitedBy: tenantUsers.invitedBy
          })
          .from(tenantUsers)
          .where(and(
            eq(tenantUsers.kindeUserId, kindeUser.userId),
            eq(tenantUsers.isActive, true)
          ))
          .limit(1);

        console.log(`🔍 Auth Middleware - Found ${fallbackUsers.length} user record(s) by kindeUserId`);
        
        if (fallbackUsers.length > 0) {
          const fallbackUser = fallbackUsers[0];
          userRecord = fallbackUser;
          
          // Get the tenant for this user
          const [fallbackTenant] = await db
            .select({
              tenantId: tenants.tenantId,
              kindeOrgId: tenants.kindeOrgId
            })
            .from(tenants)
            .where(eq(tenants.tenantId, fallbackUser.tenantId))
            .limit(1);
          
          if (fallbackTenant) {
            tenantId = fallbackTenant.tenantId;
            onboardingCompleted = fallbackUser.onboardingCompleted;
            console.log('✅ Auth Middleware - Using user record found by kindeUserId:', {
              userId: userRecord.userId,
              tenantId: userRecord.tenantId,
              email: userRecord.email,
              onboardingCompleted: userRecord.onboardingCompleted,
              isTenantAdmin: userRecord.isTenantAdmin,
              invitedBy: userRecord.invitedBy,
              foundByKindeUserId: true
            });
          }
        }
      } catch (fallbackError) {
        console.error('❌ Auth Middleware - Fallback lookup error:', fallbackError);
      }
    }
    
    // Determine onboarding status with clear logic
    // CRITICAL LOGIC:
    // 1. Tenant Admins: Need onboarding if they haven't completed it (isTenantAdmin=true, onboardingCompleted=false)
    // 2. Invited Users: Should NEVER need onboarding (onboardingCompleted=true when invitation accepted)
    // 3. New Users: Need onboarding if no tenant exists or no user record
    
    const isTenantAdmin = userRecord?.isTenantAdmin || false;
    // Better logic for detecting invited users: they have a user record, are not admin, and were invited by someone
    const isInvitedUser = userRecord && !isTenantAdmin && userRecord.invitedBy && userRecord.onboardingCompleted;
    
    let needsOnboarding = false;
    let onboardingReason = 'none';
    
    if (!tenantId || !userRecord) {
      // No tenant or user record - definitely needs onboarding (new tenant admin)
      needsOnboarding = true;
      onboardingReason = 'no_tenant_or_user_record';
    } else if (isTenantAdmin && !onboardingCompleted) {
      // Tenant admin who hasn't completed onboarding
      needsOnboarding = true;
      onboardingReason = 'tenant_admin_incomplete_onboarding';
    } else if (isInvitedUser) {
      // Invited users should NEVER need onboarding
      needsOnboarding = false;
      onboardingReason = 'invited_user_skip_onboarding';
    } else if (userRecord && !isTenantAdmin && !onboardingCompleted) {
      // Non-admin user without onboarding completed - this might be a legacy user or error case
      console.warn('⚠️ Auth Middleware - Non-admin user has onboardingCompleted=false, treating as needs onboarding', {
        userId: userRecord.userId,
        email: userRecord.email,
        isTenantAdmin,
        onboardingCompleted,
        invitedBy: userRecord.invitedBy
      });
      needsOnboarding = true;
      onboardingReason = 'non_admin_incomplete_onboarding';
    } else {
      // User has tenant, user record, and proper onboarding status
      needsOnboarding = false;
      onboardingReason = 'fully_onboarded';
    }
    
    console.log('🔍 Auth Middleware - Enhanced Onboarding Status:', {
      hasTenant: !!tenantId,
      hasUserRecord: !!userRecord,
      onboardingCompleted,
      isTenantAdmin,
      isInvitedUser,
      needsOnboarding,
      onboardingReason,
      userType: isTenantAdmin ? 'TENANT_ADMIN' : (isInvitedUser ? 'INVITED_USER' : 'UNKNOWN'),
      logic: {
        rule: 'Only tenant admins who haven\'t completed onboarding need it. Invited users NEVER need onboarding.',
        tenantAdminFlow: 'isTenantAdmin=true → needs onboarding if onboardingCompleted=false',
        invitedUserFlow: 'isTenantAdmin=false → onboardingCompleted should always be true, never needs onboarding'
      }
    });
    
    // Set enhanced user context
    request.userContext = {
      userId: kindeUser.userId,
      kindeUserId: kindeUser.userId,
      internalUserId: userRecord?.userId || null, // Add internal user ID for database operations
      tenantId: tenantId, // This will be null if not onboarded
      kindeOrgId: kindeUser.organization?.id, // Keep original org_code for reference
      email: userRecord?.email || kindeUser.email,
      name: userRecord?.name || kindeUser.name,
      given_name: kindeUser.given_name,
      family_name: kindeUser.family_name,
      avatar: kindeUser.avatar,
      socialProvider: kindeUser.socialProvider,
      organization: kindeUser.organization,
      organizations: kindeUser.organizations,
      hasMultipleOrganizations: kindeUser.hasMultipleOrganizations,
      isAuthenticated: true,
      needsOnboarding: needsOnboarding,
      onboardingCompleted: onboardingCompleted,
      isActive: userRecord?.isActive || false,
      // Add admin properties for permission checks
      isAdmin: userRecord?.isTenantAdmin || false,
      isTenantAdmin: userRecord?.isTenantAdmin || false
    };

    // Set legacy user object for backward compatibility
    request.user = {
      id: kindeUser.userId,
      userId: kindeUser.userId,
      internalUserId: userRecord?.userId || null,
      tenantId: tenantId,
      email: userRecord?.email || kindeUser.email,
      name: userRecord?.name || kindeUser.name,
      isAuthenticated: true,
      // Add admin properties for permission checks
      isAdmin: userRecord?.isTenantAdmin || false,
      isTenantAdmin: userRecord?.isTenantAdmin || false
    };

    console.log('✅ User authenticated:', {
      userId: kindeUser.userId,
      internalUserId: userRecord?.userId,
      tenantId: tenantId,
      kindeOrgId: kindeUser.organization?.id,
      email: userRecord?.email || kindeUser.email,
      name: userRecord?.name || kindeUser.name,
      socialProvider: kindeUser.socialProvider,
      needsOnboarding: needsOnboarding,
      onboardingCompleted: onboardingCompleted,
      isActive: userRecord?.isActive,
      isTenantAdmin: userRecord?.isTenantAdmin
    });

    // Log user context for debugging permissions
    console.log('🔑 User context set:', {
      hasUserContext: !!request.userContext,
      isAuthenticated: request.userContext?.isAuthenticated,
      hasInternalUserId: !!request.userContext?.internalUserId,
      hasTenantId: !!request.userContext?.tenantId,
      adminStatus: {
        isAdmin: request.userContext?.isAdmin,
        isTenantAdmin: request.userContext?.isTenantAdmin
      }
    });

  } catch (error) {
    console.error('❌ Auth middleware token validation error:', error);
    console.log('🔍 Token that failed validation:', token.substring(0, 20) + '...');
    
    // If token is expired or invalid, try to refresh it
    const refreshToken = request.cookies?.kinde_refresh_token;
    
    if (refreshToken) {
      try {
        console.log('🔄 Attempting to refresh expired token...');
        
        // Attempt to refresh the token
        const tokens = await kindeService.refreshToken(refreshToken);
        
        // Set new token in response
        reply.setCookie('kinde_token', tokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: tokens.expires_in || 3600,
          path: '/'
        });

        // Update refresh token if a new one was provided
        if (tokens.refresh_token) {
          reply.setCookie('kinde_refresh_token', tokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/'
          });
        }

        // Validate the new token and set user context
        const kindeUser = await kindeService.validateToken(tokens.access_token);
        
        // Validate user context
        if (!kindeUser || !kindeUser.userId) {
          console.error('❌ Auth Middleware - Invalid user context from token validation');
          return reply.code(401).send({ error: 'Invalid token: no user ID found' });
        }

        console.log('🔍 Auth Middleware - Validated kindeUser:', {
          userId: kindeUser.userId,
          organizationId: kindeUser.organization?.id,
          hasOrganization: !!kindeUser.organization?.id
        });

        // Clean up unwanted default organization assignments from Kinde
        if (kindeUser.organizations && kindeUser.organizations.length > 1) {
          console.log('🧹 User assigned to multiple organizations, checking for unwanted defaults...');
          
          // Check if user has a proper organization in our database
          const userTenants = await db
            .select({
              tenantId: tenantUsers.tenantId,
              kindeOrgId: tenants.kindeOrgId
            })
            .from(tenantUsers)
            .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
            .where(eq(tenantUsers.kindeUserId, kindeUser.userId));
          
          const validOrgCodes = userTenants.map(t => t.kindeOrgId);
          console.log('📋 User\'s valid organizations in our system:', validOrgCodes);
          
          // Remove user from any Kinde organizations they shouldn't be in
          for (const org of kindeUser.organizations) {
            if (!validOrgCodes.includes(org.code) && org.code !== kindeUser.organization?.id) {
              console.log(`🗑️ Removing user from unwanted default organization: ${org.code}`);
              try {
                await kindeService.removeUserFromOrganization(kindeUser.userId, org.code);
                console.log(`✅ Removed user from default organization: ${org.code}`);
              } catch (cleanupError) {
                console.warn(`⚠️ Failed to remove user from organization ${org.code}:`, cleanupError.message);
              }
            }
          }
        }

        // Look up tenant in database using Kinde org_code
        let tenantId = null;
        let userRecord = null;
        let onboardingCompleted = false;
        
        if (kindeUser.organization?.id) {
          console.log('🔍 Auth Middleware (Refresh) - Looking up tenant for org_code:', kindeUser.organization.id);
          
          try {
            const [tenant] = await db
              .select({ tenantId: tenants.tenantId })
              .from(tenants)
              .where(eq(tenants.kindeOrgId, kindeUser.organization.id))
              .limit(1);
              
            if (tenant) {
              tenantId = tenant.tenantId;
              console.log('✅ Auth Middleware (Refresh) - Found tenant:', tenantId);
              
              // Now look up the user record to check onboarding completion
              console.log('🔍 Auth Middleware (Refresh) - Looking up user record for Kinde user:', kindeUser.userId);
              const [user] = await db
                .select({ 
                  userId: tenantUsers.userId,
                  onboardingCompleted: tenantUsers.onboardingCompleted,
                  email: tenantUsers.email,
                  name: tenantUsers.name,
                  isActive: tenantUsers.isActive,
                  isTenantAdmin: tenantUsers.isTenantAdmin,
                  invitedBy: tenantUsers.invitedBy
                })
                .from(tenantUsers)
                .where(and(
                  eq(tenantUsers.kindeUserId, kindeUser.userId),
                  eq(tenantUsers.tenantId, tenantId)
                ))
                .limit(1);
                
              if (user) {
                userRecord = user;
                onboardingCompleted = user.onboardingCompleted;
                console.log('✅ Auth Middleware (Refresh) - Found user record:', {
                  userId: user.userId,
                  email: user.email,
                  onboardingCompleted: user.onboardingCompleted,
                  isActive: user.isActive,
                  isTenantAdmin: user.isTenantAdmin,
                  invitedBy: user.invitedBy
                });
              } else {
                console.log('⚠️ Auth Middleware (Refresh) - Tenant exists but user record not found. User may need to complete onboarding.');
              }
            } else {
              console.log('❌ Auth Middleware (Refresh) - No tenant found for org_code. User needs onboarding.');
            }
          } catch (dbError) {
            console.error('❌ Auth Middleware (Refresh) - Database lookup error:', dbError);
          }
        } else {
          console.log('⚠️ Auth Middleware (Refresh) - User has no organization. Checking for existing user records...');
          
          // User has no current organization, but they might have completed onboarding before
          // Let's check if they have any user records in the system
          try {
            const userRecords = await db
              .select({
                userId: tenantUsers.userId,
                tenantId: tenantUsers.tenantId,
                email: tenantUsers.email,
                name: tenantUsers.name,
                onboardingCompleted: tenantUsers.onboardingCompleted,
                isActive: tenantUsers.isActive,
                isTenantAdmin: tenantUsers.isTenantAdmin,
                invitedBy: tenantUsers.invitedBy
              })
              .from(tenantUsers)
              .where(and(
                eq(tenantUsers.kindeUserId, kindeUser.userId),
                eq(tenantUsers.isActive, true)
              ));
              
            if (userRecords.length > 0) {
              console.log(`🔍 Auth Middleware (Refresh) - Found ${userRecords.length} existing user record(s)`);
              
              // If user has multiple organizations, use the first active one
              // In a more sophisticated setup, you'd handle org selection
              const activeUser = userRecords.find(u => u.onboardingCompleted) || userRecords[0];
              
              if (activeUser) {
                userRecord = activeUser;
                tenantId = activeUser.tenantId;
                onboardingCompleted = activeUser.onboardingCompleted;
                
                console.log('✅ Auth Middleware (Refresh) - Using existing user record:', {
                  userId: activeUser.userId,
                  tenantId: activeUser.tenantId,
                  email: activeUser.email,
                  onboardingCompleted: activeUser.onboardingCompleted,
                  isTenantAdmin: activeUser.isTenantAdmin,
                  invitedBy: activeUser.invitedBy
                });
              }
            } else {
              console.log('❌ Auth Middleware (Refresh) - No existing user records found. User is likely a new admin who needs onboarding.');
            }
          } catch (dbError) {
            console.error('❌ Auth Middleware (Refresh) - Error checking existing user records:', dbError);
          }
        }
        
        // Determine onboarding status with clear logic (same as main auth logic)
        const isTenantAdmin = userRecord?.isTenantAdmin || false;
        // Better logic for detecting invited users: they have a user record, are not admin, and were invited by someone
        const isInvitedUser = userRecord && !isTenantAdmin && userRecord.invitedBy && userRecord.onboardingCompleted;
        
        let needsOnboarding = false;
        let onboardingReason = 'none';
        
        if (!tenantId || !userRecord) {
          needsOnboarding = true;
          onboardingReason = 'no_tenant_or_user_record';
        } else if (isTenantAdmin && !onboardingCompleted) {
          needsOnboarding = true;
          onboardingReason = 'tenant_admin_incomplete_onboarding';
        } else if (isInvitedUser) {
          console.warn('⚠️ Auth Middleware (Refresh) - Invited user has onboardingCompleted=false, this should not happen!', {
            userId: userRecord.userId,
            email: userRecord.email,
            isTenantAdmin,
            onboardingCompleted
          });
          needsOnboarding = false;
          onboardingReason = 'invited_user_skip_onboarding';
        } else {
          needsOnboarding = false;
          onboardingReason = 'fully_onboarded';
        }
        
        console.log('🔍 Auth Middleware (Refresh) - Enhanced Onboarding Status:', {
          hasTenant: !!tenantId,
          hasUserRecord: !!userRecord,
          onboardingCompleted,
          isTenantAdmin,
          isInvitedUser,
          needsOnboarding,
          onboardingReason,
          userType: isTenantAdmin ? 'TENANT_ADMIN' : (isInvitedUser ? 'INVITED_USER' : 'UNKNOWN')
        });
        
        request.userContext = {
          userId: kindeUser.userId,
          kindeUserId: kindeUser.userId,
          internalUserId: userRecord?.userId || null, // Add internal user ID for database operations
          tenantId: tenantId, // This will be null if not onboarded
          kindeOrgId: kindeUser.organization?.id, // Keep original org_code for reference
          email: userRecord?.email || kindeUser.email,
          name: userRecord?.name || kindeUser.name,
          given_name: kindeUser.given_name,
          family_name: kindeUser.family_name,
          avatar: kindeUser.avatar,
          socialProvider: kindeUser.socialProvider,
          organization: kindeUser.organization,
          organizations: kindeUser.organizations,
          hasMultipleOrganizations: kindeUser.hasMultipleOrganizations,
          isAuthenticated: true,
          needsOnboarding: needsOnboarding,
          onboardingCompleted: onboardingCompleted,
          isActive: userRecord?.isActive || false,
          // Add admin properties for permission checks
          isAdmin: userRecord?.isTenantAdmin || false,
          isTenantAdmin: userRecord?.isTenantAdmin || false
        };

        // Set legacy user object for backward compatibility
        request.user = {
          id: kindeUser.userId,
          userId: kindeUser.userId,
          internalUserId: userRecord?.userId || null,
          tenantId: tenantId,
          email: userRecord?.email || kindeUser.email,
          name: userRecord?.name || kindeUser.name,
          isAuthenticated: true,
          // Add admin properties for permission checks
          isAdmin: userRecord?.isTenantAdmin || false,
          isTenantAdmin: userRecord?.isTenantAdmin || false
        };

        console.log('✅ Token refreshed and user authenticated');
        return; // Continue with the request
        
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        
        // Clear invalid cookies
        reply
          .clearCookie('kinde_token', { path: '/' })
          .clearCookie('kinde_refresh_token', { path: '/' });
      }
    }
    
    console.log('❌ Auth Middleware - Sending 401 after failed validation');
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
      statusCode: 401,
    });
  }
}

// Alias for backward compatibility
export const authenticateToken = authMiddleware;

// Permission checking middleware
export function requirePermission(permission) {
  return async function(request, reply) {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    // For now, we'll allow all authenticated users
    // In a real implementation, you'd check the user's permissions
    // against their roles and the requested permission
    
    // TODO: Implement actual permission checking logic
    // const hasPermission = await checkUserPermission(
    //   request.userContext.kindeUserId,
    //   permission
    // );
    
    // if (!hasPermission) {
    //   return reply.code(403).send({
    //     error: 'Forbidden',
    //     message: `Insufficient permissions: ${permission}`,
    //     statusCode: 403,
    //   });
    // }
    
    // For now, just log the permission check
    console.log(`Permission check: ${permission} for user ${request.userContext.email}`);
  };
}

function isPublicRoute(url) {
  return PUBLIC_ROUTES.some(route => {
    if (route.endsWith('*')) {
      return url.startsWith(route.slice(0, -1));
    }
    return url.startsWith(route);
  });
}

function extractToken(request) {
  console.log('🔍 extractToken - Starting token extraction...');
  console.log('🔍 extractToken - Raw headers object:', request.headers);
  console.log('🔍 extractToken - Raw authorization header:', request.headers.authorization);
  console.log('🔍 extractToken - All header keys:', Object.keys(request.headers));
  
  // First try to get token from new cookie format
  const cookieToken = request.cookies?.kinde_token;
  if (cookieToken) {
    console.log('🔑 Token found in kinde_token cookie');
    return cookieToken;
  }

  // Fallback to Authorization header (this is what our frontend now sends)
  const authHeader = request.headers.authorization;
  console.log('🔍 extractToken - Authorization header value:', authHeader);
  console.log('🔍 extractToken - Authorization header type:', typeof authHeader);
  console.log('🔍 extractToken - Authorization header starts with Bearer:', authHeader?.startsWith('Bearer '));
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('🔑 Token found in Authorization header');
    console.log('🔍 Token preview:', token.substring(0, 20) + '...');
    console.log('🔍 Token length:', token.length);
    return token;
  }

  // Legacy cookie support (for backwards compatibility)
  const legacyToken = request.cookies?.token;
  if (legacyToken) {
    console.log('🔑 Token found in legacy token cookie');
    return legacyToken;
  }

  console.log('❌ No authentication token found in any location');
  console.log('🔍 Available cookies:', Object.keys(request.cookies || {}));
  console.log('🔍 Available cookie values:', request.cookies);
  console.log('🔍 Authorization header present:', !!request.headers.authorization);
  console.log('🔍 All headers present:', Object.keys(request.headers));
  
  return null;
} 