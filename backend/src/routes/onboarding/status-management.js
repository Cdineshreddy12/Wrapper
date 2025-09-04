import { authenticateToken } from '../../middleware/auth.js';
import { db } from '../../db/index.js';
import { tenants, tenantUsers, customRoles, tenantInvitations } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { TenantService } from '../../services/tenant-service.js';
import { SubscriptionService } from '../../services/subscription-service.js';
import kindeService from '../../services/kinde-service.js';

/**
 * Status Management Routes
 * Handles onboarding status, completion, and related management endpoints
 */

// Helper function to extract token from request
function extractToken(request) {
  // First try to get token from cookie
  const cookieToken = request.cookies?.kinde_token;
  if (cookieToken) {
    return cookieToken;
  }

  // Fallback to Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

export default async function statusManagementRoutes(fastify, options) {

  // Handle successful payment callback
  fastify.get('/success', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          session_id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { session_id } = request.query;

      if (session_id) {
        // Handle successful payment
        await SubscriptionService.handleCheckoutCompleted({ id: session_id });
      }

      // Redirect to team invitation or dashboard
      const redirectUrl = `${process.env.FRONTEND_URL}/onboarding/team`;
      return reply.redirect(redirectUrl);

    } catch (error) {
      request.log.error('Error handling success callback:', error);
      const errorUrl = `${process.env.FRONTEND_URL}/onboarding/error?message=payment_failed`;
      return reply.redirect(errorUrl);
    }
  });

  // Send team invitations
  fastify.post('/invite-team', {
    preHandler: authenticateToken,
    schema: {
      body: {
        type: 'object',
        required: ['invitations'],
        properties: {
          invitations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['email', 'role'],
              properties: {
                email: { type: 'string', format: 'email' },
                role: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { invitations } = request.body;
      const tenantId = request.userContext.tenantId;
      const invitedBy = request.userContext.userId;

      const results = [];

      for (const invitation of invitations) {
        try {
          // Get role ID by name
          const [role] = await db
            .select()
            .from(customRoles)
            .where(eq(customRoles.roleName, invitation.role))
            .limit(1);

          if (!role) {
            results.push({
              email: invitation.email,
              success: false,
              error: 'Role not found'
            });
            continue;
          }

          // Send invitation
          const invitationResult = await TenantService.inviteUser({
            tenantId,
            email: invitation.email,
            roleId: role.roleId,
            invitedBy,
            firstName: invitation.firstName,
            lastName: invitation.lastName
          });

          results.push({
            email: invitation.email,
            success: true,
            invitationId: invitationResult.invitationId
          });

        } catch (error) {
          results.push({
            email: invitation.email,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        data: {
          results,
          totalSent: results.filter(r => r.success).length,
          totalFailed: results.filter(r => !r.success).length
        }
      };

    } catch (error) {
      request.log.error('Error sending team invitations:', error);
      return reply.code(500).send({ error: 'Failed to send invitations' });
    }
  });

  // Complete onboarding (mark as finished)
  fastify.post('/complete', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const userId = request.userContext.userId;

      // Mark onboarding as completed
      await db
        .update(tenantUsers)
        .set({ onboardingCompleted: true })
        .where(eq(tenantUsers.userId, userId));

      return {
        success: true,
        message: 'Onboarding completed successfully'
      };

    } catch (error) {
      request.log.error('Error completing onboarding:', error);
      return reply.code(500).send({ error: 'Failed to complete onboarding' });
    }
  });

  // Get onboarding status (handles both authenticated and unauthenticated users)
  fastify.get('/status', async (request, reply) => {
    try {
      console.log('🔍 === ONBOARDING STATUS CHECK START ===');

      // Try to get authenticated user first
      let userId = null;
      let email = null;
      let kindeUserId = null;

      // Extract token and check if user is authenticated
      try {
        const token = extractToken(request);
        console.log('🔍 Token extraction result:', token ? 'Token found' : 'No token');

        if (token) {
          console.log('🔍 Validating token with Kinde service...');
          const kindeUser = await kindeService.validateToken(token);
          kindeUserId = kindeUser.kindeUserId || kindeUser.userId; // Try both fields
          userId = kindeUser.userId;
          email = kindeUser.email;

          console.log('🔍 Kinde validation successful:', {
            kindeUserId,
            userId,
            email,
            hasOrganization: !!kindeUser.organization
          });
        }
      } catch (authError) {
        console.log('📝 Token validation failed, checking for email in query:', authError.message);
      }

      // If no authenticated user, check if email is provided in query
      if (!userId && request.query?.email) {
        email = request.query.email;
        console.log('🔍 Using email from query parameter:', email);
      }

      if (!userId && !email) {
        console.log('❌ No user information available - returning needs onboarding');
        return {
          success: true,
          data: {
            isOnboarded: false,
            needsOnboarding: true,
            onboardingStep: null,
            message: 'No user information provided'
          }
        };
      }

      // Look up user by kindeUserId (preferred) or email
      let userQuery = db.select().from(tenantUsers);
      let lookupType = '';

      if (kindeUserId) {
        userQuery = userQuery.where(eq(tenantUsers.kindeUserId, kindeUserId));
        lookupType = `Kinde ID: ${kindeUserId}`;
        console.log('🔍 Looking up user by Kinde ID:', kindeUserId);
      } else if (userId) {
        userQuery = userQuery.where(eq(tenantUsers.userId, userId));
        lookupType = `User ID: ${userId}`;
        console.log('🔍 Looking up user by user ID:', userId);
      } else if (email) {
        userQuery = userQuery.where(eq(tenantUsers.email, email));
        lookupType = `Email: ${email}`;
        console.log('🔍 Looking up user by email:', email);
      }

      console.log('🔍 Executing database query...');
      const [user] = await userQuery.limit(1);

      if (!user) {
        console.log('❌ User not found in database for lookup:', lookupType);

        // If we have Kinde user info but no DB record, this means they need to complete onboarding
        if (kindeUserId && email) {
          console.log('🆕 Kinde user exists but no DB record - needs onboarding');
          return {
            success: true,
            data: {
              isOnboarded: false,
              needsOnboarding: true,
              onboardingStep: '1',
              savedFormData: {},
              message: 'User authenticated but needs to complete onboarding',
              kindeUser: {
                id: kindeUserId,
                email: email
              }
            }
          };
        }

        console.log('📝 No user record found - returning needs onboarding');
        return {
          success: true,
          data: {
            isOnboarded: false,
            needsOnboarding: true,
            onboardingStep: null,
            savedFormData: {},
            message: 'User has not started onboarding yet'
          }
        };
      }

      console.log('✅ User found in database:', {
        userId: user.userId,
        email: user.email,
        kindeUserId: user.kindeUserId,
        onboardingCompleted: user.onboardingCompleted,
        tenantId: user.tenantId,
        isActive: user.isActive
      });

      // Get tenant information if user exists
      console.log('🔍 Looking up tenant for user...');
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, user.tenantId))
        .limit(1);

      if (tenant) {
        console.log('✅ Tenant found:', {
          tenantId: tenant.tenantId,
          companyName: tenant.companyName,
          subdomain: tenant.subdomain
        });
      } else {
        console.log('⚠️ No tenant found for user');
      }

      // Extract onboarding data from preferences
      const onboardingData = user.preferences?.onboarding || {};
      const formData = onboardingData.formData || {};

      const result = {
        success: true,
        data: {
          isOnboarded: user.onboardingCompleted,
          needsOnboarding: !user.onboardingCompleted,
          onboardingStep: user.onboardingStep || (user.onboardingCompleted ? 'completed' : '1'),
          savedFormData: formData,
          onboardingProgress: onboardingData,
          organization: tenant ? {
            id: tenant.tenantId,
            name: tenant.companyName,
            domain: tenant.domain,
            subdomain: tenant.subdomain
          } : null,
          user: {
            id: user.userId,
            email: user.email,
            name: user.name,
            kindeUserId: user.kindeUserId
          }
        }
      };

      console.log('✅ Final onboarding status result:', {
        isOnboarded: result.data.isOnboarded,
        needsOnboarding: result.data.needsOnboarding,
        hasOrganization: !!result.data.organization,
        userExists: !!result.data.user
      });

      console.log('🔍 === ONBOARDING STATUS CHECK END ===');
      return result;

    } catch (error) {
      console.error('❌ Error getting onboarding status:', error);
      console.error('❌ Stack trace:', error.stack);
      request.log.error('Error getting onboarding status:', error);
      return reply.code(500).send({ error: 'Failed to get onboarding status' });
    }
  });

  // Get onboarding data by email (for non-authenticated users)
  fastify.post('/get-data', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.body;

      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.email, email))
        .limit(1);

      if (!user) {
        return {
          success: true,
          data: {
            isOnboarded: false,
            needsOnboarding: true,
            onboardingStep: null,
            savedFormData: {},
            message: 'No previous onboarding data found'
          }
        };
      }

      // Extract onboarding data from preferences
      const onboardingData = user.preferences?.onboarding || {};
      const formData = onboardingData.formData || {};

      return {
        success: true,
        data: {
          isOnboarded: user.onboardingCompleted,
          needsOnboarding: !user.onboardingCompleted,
          onboardingStep: user.onboardingStep,
          savedFormData: formData,
          onboardingProgress: onboardingData
        }
      };

    } catch (error) {
      request.log.error('Error getting onboarding data by email:', error);
      return reply.code(500).send({ error: 'Failed to get onboarding data' });
    }
  });
}
