import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken } from '../../../middleware/auth/auth.js';
import { db } from '../../../db/index.js';
import { tenants, tenantUsers, customRoles, onboardingFormData } from '../../../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { TenantService } from '../../../services/tenant-service.js';
import { kindeService } from '../../../features/auth/index.js';
import { SubscriptionService } from '../../../features/subscriptions/index.js';
import { shouldLogVerbose } from '../../../utils/verbose-log.js';

/**
 * Status Management Routes
 * Handles onboarding status, completion, and related management endpoints
 */

// Helper function to extract token from request
function extractToken(request: FastifyRequest): string | null {
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

export default async function statusManagementRoutes(
  fastify: FastifyInstance,
  _options?: Record<string, unknown>
): Promise<void> {
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
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const { session_id } = query;

      if (session_id) {
        // Handle successful payment
        await SubscriptionService.handleCheckoutCompleted({ id: session_id });
      }

      // Redirect to team invitation or dashboard
      const redirectUrl = `${process.env.FRONTEND_URL}/onboarding/team`;
      return reply.redirect(redirectUrl);

    } catch (err: unknown) {
      request.log.error('Error handling success callback:', err);
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
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const { invitations } = body;
      const userContext = request.userContext as { tenantId: string; userId: string };
      const tenantId = userContext.tenantId;
      const invitedBy = userContext.userId;

      const results = [];

      const invList = invitations as Array<{ email: string; role: string; firstName?: string; lastName?: string }>;
      for (const invitation of invList) {
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
            invitedBy
          });

          results.push({
            email: invitation.email,
            success: true,
            invitationId: invitationResult.invitationId
          });

        } catch (invErr: unknown) {
          results.push({
            email: invitation.email,
            success: false,
            error: (invErr as Error).message
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

    } catch (err: unknown) {
      request.log.error('Error sending team invitations:', err);
      return reply.code(500).send({ error: 'Failed to send invitations' });
    }
  });

  // Complete onboarding (mark as finished)
  fastify.post('/complete', {
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userContext = request.userContext as { userId: string };
      const userId = userContext.userId;

      // Mark onboarding as completed
      await db
        .update(tenantUsers)
        .set({ onboardingCompleted: true })
        .where(eq(tenantUsers.userId, userId));

      return {
        success: true,
        message: 'Onboarding completed successfully'
      };

    } catch (err: unknown) {
      request.log.error('Error completing onboarding:', err);
      return reply.code(500).send({ error: 'Failed to complete onboarding' });
    }
  });

  // Get onboarding status (handles both authenticated and unauthenticated users)
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
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
            hasTenant: !!kindeUser.organization
          });
        }
      } catch (authErr: unknown) {
        console.log('📝 Token validation failed, trying fallback methods:', (authErr as Error).message);
        const q = request.query as Record<string, string | undefined>;
        // Fallback 1: Check if kindeUserId is provided in query (from frontend)
        if (q?.kindeUserId) {
          kindeUserId = q.kindeUserId;
          console.log('🔍 Using kindeUserId from query parameter:', kindeUserId);
        }
        // Fallback 2: Check if email is provided in query
        if (q?.email) {
          email = q.email;
          console.log('🔍 Using email from query parameter:', email);
        }
      }

      const q2 = request.query as Record<string, string | undefined>;
      if (!kindeUserId && !userId && q2?.kindeUserId) {
        kindeUserId = q2.kindeUserId;
        console.log('🔍 Using kindeUserId from query parameter (fallback):', kindeUserId);
      }
      if (!email && q2?.email) {
        email = q2.email;
        console.log('🔍 Using email from query parameter (fallback):', email);
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
        userQuery = userQuery.where(eq(tenantUsers.kindeUserId, kindeUserId as string)) as any;
        lookupType = `Kinde ID: ${kindeUserId}`;
        console.log('🔍 Looking up user by Kinde ID:', kindeUserId);
      } else if (userId) {
        userQuery = userQuery.where(eq(tenantUsers.userId, userId as string)) as any;
        lookupType = `User ID: ${userId}`;
        console.log('🔍 Looking up user by user ID:', userId);
      } else if (email) {
        userQuery = userQuery.where(eq(tenantUsers.email, email as string)) as any;
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

      // IMPORTANT: Existing users with onboardingCompleted=true should NOT be forced to onboard again
      // They will be redirected directly to dashboard
      if (user.onboardingCompleted) {
        console.log('✅ Existing user detected - onboarding already completed, will skip onboarding flow');
      } else {
        console.log('🔄 New user or incomplete onboarding - user needs to complete onboarding');
      }

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
          subdomain: tenant.subdomain,
          hasInitialSetupData: !!(tenant as { initialSetupData?: Record<string, unknown> }).initialSetupData,
          initialSetupDataKeys: (tenant as { initialSetupData?: Record<string, unknown> }).initialSetupData ? Object.keys((tenant as { initialSetupData?: Record<string, unknown> }).initialSetupData!) : []
        });
      } else {
        console.log('⚠️ No tenant found for user');
      }

      // Extract onboarding data from preferences
      const onboardingData = (user.preferences as { onboarding?: { formData?: unknown } })?.onboarding || {};
      let formData: Record<string, unknown> = (onboardingData.formData || {}) as Record<string, unknown>;

      // If no form data exists, try to populate from tenant initial setup data
      if (Object.keys(formData).length === 0 && (tenant as { initialSetupData?: Record<string, unknown> } | null)?.initialSetupData) {
        console.log('🔄 No form data found, populating from tenant initial setup data');
        console.log('📋 Initial setup data:', (tenant as { initialSetupData?: Record<string, unknown> }).initialSetupData);
        const setupData = (tenant as { initialSetupData?: Record<string, unknown> }).initialSetupData!;
        formData = {
          businessType: setupData.businessType || undefined,
          companySize: setupData.companySize || undefined,
          country: setupData.country || undefined,
          timezone: setupData.timezone || undefined,
          currency: setupData.currency || undefined,
          hasGstin: setupData.hasGstin || undefined,
          gstin: setupData.gstin || undefined,
          selectedPlan: setupData.selectedPlan || undefined,
          planName: setupData.planName || undefined,
          maxUsers: setupData.maxUsers || undefined,
          maxProjects: setupData.maxProjects || undefined
        };
        // Remove undefined values
        Object.keys(formData).forEach(key => {
          if ((formData as Record<string, unknown>)[key] === undefined) {
            delete (formData as Record<string, unknown>)[key];
          }
        });
        console.log('📋 Populated form data:', formData);
      } else if (Object.keys(formData).length === 0) {
        if (shouldLogVerbose()) console.log('⚠️ No form data found and no initial setup data available');
      }



      // Determine if user is invited (invited users have onboardingCompleted=true)
      // CRITICAL: Invited users should NEVER be sent to onboarding
      const isInvitedUser = user.onboardingCompleted === true && 
                           ((user.preferences as { userType?: string })?.userType === 'INVITED_USER' || 
                            (user.preferences as { isInvitedUser?: boolean })?.isInvitedUser === true ||
                            (user as { invitedBy?: string | null }).invitedBy !== null || // User was invited if invitedBy is set
                            user.invitedAt !== null); // User was invited if invitedAt is set

      // CRITICAL: Respect existing users' onboarding status
      // - If onboardingCompleted=true → isOnboarded=true, needsOnboarding=false → redirect to dashboard
      // - If onboardingCompleted=false → isOnboarded=false, needsOnboarding=true → show onboarding
      // This ensures existing users NEVER have to onboard again
      // CRITICAL FIX: If onboardingCompleted=true, user should NEVER need onboarding (applies to invited users)
      const isOnboarded = user.onboardingCompleted === true;
      // CRITICAL: If onboardingCompleted is true, needsOnboarding MUST be false (invited users always have this set to true)
      const needsOnboarding = user.onboardingCompleted !== true;

      const result = {
        success: true,
        data: {
          isOnboarded: isOnboarded,
          needsOnboarding: needsOnboarding,
          onboardingStep: user.onboardingStep || (isOnboarded ? 'completed' : '1'),
          savedFormData: formData,
          onboardingProgress: onboardingData,
          tenant: tenant ? {
            id: tenant.tenantId,
            name: tenant.companyName,
            subdomain: tenant.subdomain
          } : null,
          user: {
            id: user.userId,
            email: user.email,
            name: user.name,
            kindeUserId: user.kindeUserId
          }
        },
        // Add authStatus object for frontend compatibility
        authStatus: {
          isAuthenticated: true,
          userId: kindeUserId || userId,
          internalUserId: user.userId,
          tenantId: user.tenantId,
          email: user.email,
          isTenantAdmin: user.isTenantAdmin || false,
          needsOnboarding: needsOnboarding,
          onboardingCompleted: isOnboarded,
          userType: isInvitedUser ? 'INVITED_USER' : (isOnboarded ? 'EXISTING_USER' : 'REGULAR_USER'),
          isInvitedUser: isInvitedUser
        }
      };

      console.log('✅ Final onboarding status result:', {
        isOnboarded: result.data.isOnboarded,
        needsOnboarding: result.data.needsOnboarding,
        hasTenant: !!result.data.tenant,
        userExists: !!result.data.user,
        userType: result.authStatus.userType,
        message: isOnboarded 
          ? '✅ Existing user - will redirect to dashboard (no onboarding required)' 
          : '🔄 User needs to complete onboarding'
      });

      console.log('🔍 === ONBOARDING STATUS CHECK END ===');
      return result;

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error getting onboarding status:', error);
      console.error('❌ Stack trace:', error.stack);
      request.log.error('Error getting onboarding status:', error);
      return reply.code(500).send({ error: 'Failed to get onboarding status' });
    }
  });

  // Get onboarding data by email (for non-authenticated users)
  // Checks both onboarding_form_data table and user preferences
  fastify.post('/get-data', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
          kindeUserId: { type: 'string' } // Optional Kinde user ID
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const { email, kindeUserId } = body;

      // First, try to get data from onboarding_form_data table (for users not yet created)
      let formDataFromTable = null;
      
      if (kindeUserId) {
        const [onboardingData] = await db
          .select()
          .from(onboardingFormData)
          .where(
            and(
              eq(onboardingFormData.kindeUserId, kindeUserId as string),
              eq(onboardingFormData.email, email as string)
            )
          )
          .limit(1);
        
        if (onboardingData) {
          formDataFromTable = onboardingData;
        }
      } else {
        // Try by email only
        const [onboardingData] = await db
          .select()
          .from(onboardingFormData)
          .where(eq(onboardingFormData.email, email as string))
          .orderBy(desc(onboardingFormData.lastSaved))
          .limit(1);
        
        if (onboardingData) {
          formDataFromTable = onboardingData;
        }
      }

      // Also check if user exists in tenantUsers table
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.email, email as string))
        .limit(1);

      // If we have form data from the table, use it (takes precedence)
      if (formDataFromTable) {
        return reply.code(200).send({
          success: true,
          data: {
            isOnboarded: false,
            needsOnboarding: true,
            onboardingStep: formDataFromTable.currentStep,
            savedFormData: formDataFromTable.formData || {},
            onboardingData: {
              currentStep: formDataFromTable.currentStep,
              formData: formDataFromTable.formData,
              stepData: formDataFromTable.stepData,
              flowType: formDataFromTable.flowType,
              lastSaved: formDataFromTable.lastSaved
            },
            source: 'onboarding_form_data_table'
          }
        });
      }

      // Fallback to user preferences if user exists
      if (user) {
        const onboardingData = (user.preferences as { onboarding?: { formData?: unknown } })?.onboarding || {};
        const formData = onboardingData.formData || {};

        return reply.code(200).send({
          success: true,
          data: {
            isOnboarded: user.onboardingCompleted,
            needsOnboarding: !user.onboardingCompleted,
            onboardingStep: user.onboardingStep,
            savedFormData: formData,
            onboardingProgress: onboardingData,
            source: 'user_preferences'
          }
        });
      }

      // No data found
      return reply.code(200).send({
        success: true,
        data: {
          isOnboarded: false,
          needsOnboarding: true,
          onboardingStep: null,
          savedFormData: {},
          message: 'No previous onboarding data found'
        }
      });

    } catch (err: unknown) {
      request.log.error('Error getting onboarding data by email:', err);
      return reply.code(500).send({ error: 'Failed to get onboarding data' });
    }
  });
}
