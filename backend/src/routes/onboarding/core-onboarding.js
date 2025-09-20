import { TenantService } from '../../services/tenant-service.js';
import { SubscriptionService } from '../../services/subscription-service.js';
import { OnboardingTrackingService } from '../../services/onboarding-tracking-service.js';
import creditAllocationService from '../../services/credit-allocation-service.js';
import kindeService from '../../services/kinde-service.js';
import EmailService from '../../utils/email.js';
import { db, systemDbConnection } from '../../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, subscriptions, entities, onboardingEvents } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import EnhancedOnboardingService from '../../services/onboarding-service.js';

// Helper function to extract token from request
function extractToken(request) {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Helper function for logging
const Logger = {
  trial: {
    start: (requestId, tenantId, duration) => {
      console.log(`🎯 [${requestId}] Trial started for tenant ${tenantId} (${duration})`);
    }
  }
};

/**
 * Core Onboarding Routes
 * Handles the main onboarding flow and organization setup
 */

// Helper function to ensure system operations use system connection
function ensureSystemConnection(request) {
  // Double-check we're using system connection for critical operations
  if (!request.db || request.db === request.server?.db) {
    console.log('⚠️ WARNING: Not using system connection for system operation!');
    // Force system connection usage
    const { dbManager } = require('../../db/index.js');
    return dbManager.getSystemConnection();
  }
  return request.db;
}

export default async function coreOnboardingRoutes(fastify, options) {

  // 🚀 **ENHANCED ONBOARDING ENDPOINT** (Bypasses RLS Bottleneck)
  fastify.post('/onboard-enhanced', {
    schema: {
      body: {
        type: 'object',
        required: ['companyName', 'adminEmail', 'subdomain'],
        properties: {
          companyName: { type: 'string', minLength: 1, maxLength: 100 },
          adminEmail: { type: 'string', format: 'email' },
          subdomain: { type: 'string', minLength: 3, maxLength: 50 },
          initialCredits: { type: 'number', minimum: 100, maximum: 10000, default: 1000 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🚀 === ENHANCED ONBOARDING START ===');

      const { companyName, adminEmail, subdomain, initialCredits = 1000 } = request.body;

      // Use the enhanced onboarding service with credit allocation
      const result = await EnhancedOnboardingService.completeOnboardingWorkflow(request, {
        companyName,
        adminEmail,
        subdomain,
        initialCredits
      });

      console.log('🎉 === ENHANCED ONBOARDING COMPLETE ===');

      return reply.code(201).send({
        success: true,
        message: 'Organization onboarded successfully',
        data: {
          tenantId: result.tenant.tenantId,
          adminUserId: result.adminUser.userId,
          organizationId: result.organization.organizationId,
          adminRoleId: result.adminRole.roleId,
          subdomain: result.tenant.subdomain,
          redirectUrl: result.redirectUrl
        }
      });

    } catch (error) {
      console.error('❌ Enhanced onboarding failed:', error);

      return reply.code(500).send({
        success: false,
        error: 'Onboarding failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Complete onboarding process (legacy - may have RLS issues)
  fastify.post('/onboard', {
    schema: {
      body: {
        type: 'object',
        required: ['companyName', 'adminEmail', 'adminMobile', 'gstin'],
        properties: {
          companyName: { type: 'string', minLength: 1, maxLength: 100 },
          adminEmail: { type: 'string', format: 'email' },
          adminMobile: { type: 'string', minLength: 10, maxLength: 15 },
          gstin: { type: 'string', minLength: 15, maxLength: 15, pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$' }
        },
        additionalProperties: true // Allow additional properties for flexibility
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🚀 === ONBOARDING COMPLETION START ===');

      const {
        companyName,
        adminEmail,
        adminMobile,
        gstin
      } = request.body;

      // Set defaults for fields moved to payment upgrade
      const selectedPlan = 'trial'; // Default to trial plan
      const planName = 'Trial Plan';
      const planPrice = 0;
      const maxUsers = 2; // Trial limited to 2 users
      const maxProjects = 5; // Trial limited to 5 projects
      const teamEmails = []; // No team invites during basic onboarding

      // Generate subdomain from company name
      const generatedSubdomain = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);

      console.log('📝 Simplified onboarding data received:', {
        companyName,
        generatedSubdomain,
        adminEmail,
        adminMobile,
        gstin,
        selectedPlan: 'trial (default)',
        maxUsers: 2,
        maxProjects: 5
      });

      // Determine admin user name for database (will be refined after Kinde user creation)
      let adminUserName = adminEmail.split('@')[0]; // Default fallback

      // Check if the user making this request is authenticated
      let currentAuthenticatedUser = null;
      let token = null;

      try {
        token = extractToken(request);
        console.log('🔑 Token extraction result:', {
          hasToken: !!token,
          tokenLength: token?.length || 0,
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token'
        });

        if (token && token.trim() !== '' && token.length > 10) {
          console.log('🔍 Attempting token validation...');
          currentAuthenticatedUser = await kindeService.validateToken(token);
          console.log('✅ User is authenticated during onboarding:', {
            kindeUserId: currentAuthenticatedUser.kindeUserId || currentAuthenticatedUser.userId,
            email: currentAuthenticatedUser.email || 'N/A',
            name: currentAuthenticatedUser.name || 'N/A'
          });
        } else {
          console.log('❌ Invalid or missing token provided');
        }
      } catch (authError) {
        console.log('⚠️ Token validation failed:', authError.message);
        console.log('📝 User not authenticated during onboarding - will create user in Kinde');

        // Log more details about the authentication failure
        console.log('🔍 Authentication failure details:', {
          tokenProvided: !!token,
          tokenLength: token?.length || 0,
          errorType: authError.constructor.name,
          errorMessage: authError.message
        });

        // Log the request headers for debugging
        console.log('🔍 Request headers for debugging:', {
          authorization: request.headers.authorization ? 'Present' : 'Missing',
          contentType: request.headers['content-type'],
          userAgent: request.headers['user-agent']
        });
      }

      // 🔍 Check if user already has an organization
      const existingTenant = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          createdAt: tenants.createdAt
        })
        .from(tenants)
        .where(eq(tenants.adminEmail, adminEmail))
        .limit(1);

      if (existingTenant.length > 0) {
        console.log('❌ Organization already exists for email:', adminEmail);
        return reply.code(409).send({
          error: 'Organization already exists',
          message: 'This email is already associated with an organization. Please contact support if you need to create a new organization.',
          data: {
            existingOrganization: {
              id: existingTenant[0].tenantId,
              name: existingTenant[0].companyName,
              subdomain: existingTenant[0].subdomain,
              createdAt: existingTenant[0].createdAt
            }
          }
        });
      }

      // Variable to store the actual org code for use outside transaction
      let actualOrgCode;
      const requestId = `onboard_${Date.now()}`;

      // Start transaction for complete onboarding using system connection (bypasses RLS)
      const result = await systemDbConnection.transaction(async (tx) => {
        // NOTE: Tenant context will be set AFTER tenant creation, not before
        // This is because we're creating a NEW tenant, so tenant_id doesn't exist yet

        // 1. Generate and check subdomain availability
        let finalSubdomain = generatedSubdomain;
        let counter = 1;

        // Keep checking until we find an available subdomain
        while (!(await TenantService.checkSubdomainAvailability(finalSubdomain))) {
          finalSubdomain = `${generatedSubdomain}${counter}`;
          counter++;
          if (counter > 10) {
            throw new Error('Unable to generate unique subdomain after 10 attempts');
          }
        }

        console.log('✅ Final subdomain selected:', finalSubdomain);

        // 2. Create Kinde organization - with fallback
        let kindeOrg;

        try {
          kindeOrg = await kindeService.createOrganization({
            name: companyName,
            external_id: `tenant_${uuidv4()}`,
            feature_flags: {
              theme: {
                button_text_color: '#ffffff'
              }
            }
          });

          console.log('🔍 Kinde Organization Creation Response:', JSON.stringify(kindeOrg, null, 2));

          // Extract the actual organization code from the nested response
          actualOrgCode = kindeOrg.organization?.code;
          if (!actualOrgCode) {
              throw new Error('Failed to get organization code from Kinde response');
          }

          console.log('✅ Extracted organization code:', actualOrgCode);
        } catch (kindeError) {
          console.warn('⚠️ Kinde organization creation failed, using fallback:', kindeError.message);

          // Create a fallback organization code if Kinde fails
          actualOrgCode = `org_${finalSubdomain}_${Date.now()}`;
          kindeOrg = {
            organization: {
              code: actualOrgCode,
              name: companyName,
              is_default: false
            },
            created_with_fallback: true
          };

          console.log('🔄 Using fallback organization code:', actualOrgCode);
        }

        // 3. Handle admin user creation/assignment
        let kindeUser;
        let finalKindeUserId;

        if (currentAuthenticatedUser) {
          // User is already authenticated - use their existing Kinde ID
          finalKindeUserId = currentAuthenticatedUser.kindeUserId || currentAuthenticatedUser.userId;
          console.log('✅ Using authenticated user Kinde ID:', finalKindeUserId);

          // DON'T assign the user during transaction - we'll do this post-transaction
          // This prevents transaction rollbacks due to Kinde API failures
          console.log('🔄 Organization assignment will be handled post-transaction');

          kindeUser = {
            id: finalKindeUserId,
            email: adminEmail,
            given_name: currentAuthenticatedUser.given_name,
            family_name: currentAuthenticatedUser.family_name,
            existing_user: true
          };
        } else {
          // User not authenticated - create new user in Kinde
          // Derive name from email (before @ symbol)
          const emailPrefix = adminEmail.split('@')[0];
          const [firstName, ...lastNameParts] = emailPrefix.split(/[._-]/);
          const lastName = lastNameParts.join(' ') || '';

          try {
              kindeUser = await kindeService.createUser({
              profile: {
                given_name: firstName || 'Admin',
                family_name: lastName || 'User'
              },
              identities: [{
                type: 'email',
                details: {
                  email: adminEmail
                }
              }],
              organization_code: actualOrgCode
            });

            finalKindeUserId = kindeUser?.id;
            console.log('✅ New Kinde user created with organization:', finalKindeUserId);

            // User is automatically assigned to organization via organization_code
            // No need for additional addUserToOrganization call

          } catch (error) {
            console.warn('⚠️ Kinde user creation failed, using fallback:', error.message);

            // Create a fallback user object if Kinde fails
            finalKindeUserId = `user_${adminEmail.replace('@', '_').replace('.', '_')}_${Date.now()}`;
                kindeUser = {
              id: finalKindeUserId,
                  email: adminEmail,
                  given_name: firstName || 'Admin',
              family_name: lastName || 'User',
              created_with_fallback: true
            };

            console.log('🔄 Using fallback user ID:', finalKindeUserId);
          }
        }

        console.log('👤 Final Kinde user ID for database:', finalKindeUserId);

        // Refine admin user name based on Kinde user data
        if (kindeUser?.given_name && kindeUser?.family_name) {
          adminUserName = `${kindeUser.given_name} ${kindeUser.family_name}`.trim();
        } else if (kindeUser?.given_name) {
          adminUserName = kindeUser.given_name;
        }

        console.log('👤 Final admin user name for database:', adminUserName);

        // 4. Create tenant record in our database with comprehensive onboarding tracking
        const currentTime = new Date();
        const [tenant] = await tx
          .insert(tenants)
          .values({
            tenantId: uuidv4(),
            companyName: companyName,
            subdomain: finalSubdomain,
            kindeOrgId: actualOrgCode, // Use the actual org code
            adminEmail: adminEmail,
            gstin: gstin,

            // Onboarding & Setup Tracking
            onboardingCompleted: true, // Mark as completed since they're finishing the flow
            onboardingStep: 'completed',
            onboardingProgress: {
              accountSetup: { completed: true, completedAt: currentTime },
              companyInfo: { completed: true, completedAt: currentTime },
              planSelection: { completed: true, completedAt: currentTime, selectedPlan },
              teamInvites: { completed: teamEmails?.length > 0, completedAt: currentTime }
            },
            onboardedAt: currentTime, // When onboarding was completed
            onboardingStartedAt: currentTime, // When tenant first started onboarding
            setupCompletionRate: 100, // 100% completion

            // Trial & Subscription Tracking
            trialStartedAt: currentTime,
            trialStatus: 'active',
            subscriptionStatus: 'trial',

            // Feature Usage & Adoption
            featuresEnabled: {
              crm: true,
              users: true,
              roles: true,
              dashboard: true
            },
            firstLoginAt: currentTime, // Admin is logging in during onboarding

            // Setup & Configuration
            initialSetupData: {
              selectedPlan: selectedPlan || 'trial',
              planName,
              planPrice,
              maxUsers,
              maxProjects,
              teamInviteCount: teamEmails?.length || 0,
              onboardingCompletedAt: currentTime
            }
          })
          .returning({
            tenantId: tenants.tenantId,
            companyName: tenants.companyName,
            subdomain: tenants.subdomain,
            kindeOrgId: tenants.kindeOrgId,
            adminEmail: tenants.adminEmail,
            onboardingCompleted: tenants.onboardingCompleted,
            onboardedAt: tenants.onboardedAt,
            trialStartedAt: tenants.trialStartedAt
          });

        // Set tenant context for RLS within transaction after tenant creation
        // Use sql template function instead of template literal
        const { sql } = await import('drizzle-orm');
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenant.tenantId}, false)`);
        console.log(`✅ Tenant context set in transaction: ${tenant.tenantId}`);

        console.log('✅ Tenant created in database:', tenant.tenantId);

        // 5. Create parent organization for the tenant
        console.log('🏢 Creating parent organization for tenant...');
        const [organization] = await tx
          .insert(entities)
          .values({
            entityId: uuidv4(),
            tenantId: tenant.tenantId,
            parentEntityId: null, // This is the root organization
            entityLevel: 1,
            hierarchyPath: '/',
            entityName: companyName,
            entityCode: `org_${finalSubdomain}_${Date.now()}`,
            description: 'Parent organization created during onboarding',
            entityType: 'organization',
            organizationType: 'parent',
            isActive: true,
            isDefault: true,
            contactEmail: adminEmail,
            createdBy: null, // Will be updated after user creation
            updatedBy: null  // Will be updated after user creation
          })
          .returning({
            organizationId: entities.entityId,
            organizationName: entities.entityName,
            organizationCode: entities.entityCode
          });

        console.log('✅ Parent organization created:', {
          organizationId: organization.organizationId,
          organizationName: organization.organizationName,
          organizationCode: organization.organizationCode
        });

        // 6. Create admin user record with the correct Kinde user ID
        const [adminUser] = await tx
          .insert(tenantUsers)
          .values({
            userId: uuidv4(),
            tenantId: tenant.tenantId,
            kindeUserId: finalKindeUserId, // Use the correct Kinde user ID
            email: adminEmail,
            name: adminUserName,
            phone: adminMobile,
            isActive: true,
            isVerified: true,
            isTenantAdmin: true,
            onboardingCompleted: true // ✅ CRITICAL: Mark as completed since they just finished onboarding
          })
          .returning();

        console.log('✅ Admin user created in database:', {
          userId: adminUser.userId,
          kindeUserId: adminUser.kindeUserId,
          email: adminUser.email,
          onboardingCompleted: adminUser.onboardingCompleted
        });

        // Update organization with correct user reference
        await tx
          .update(entities)
          .set({
            createdBy: adminUser.userId,
            updatedBy: adminUser.userId
          })
          .where(eq(entities.entityId, organization.organizationId));

        console.log('✅ Organization updated with correct user references');

        // ROLE CREATION MOVED INSIDE TRANSACTION BELOW

        // 9. Create subscription record directly in transaction
        let subscription = null;
        let checkoutUrl = null;
        let creditAllocationData = null;

        try {
          console.log(`📝 [${requestId}] Step 8: Creating subscription and trial setup...`);

          // Create subscription directly within transaction
          const trialDurationMs = process.env.NODE_ENV === 'production'
            ? 14 * 24 * 60 * 60 * 1000  // 14 days for production
            : 5 * 60 * 1000;              // 5 minutes for testing

          const trialStartDate = new Date();
          const trialEndDate = new Date(Date.now() + trialDurationMs);

          // Calculate trial duration in human readable format
          const trialDurationText = process.env.NODE_ENV === 'production'
            ? '14 days'
            : '5 minutes';

          Logger.trial.start(requestId, tenant.tenantId, trialDurationText);

          console.log(`⏰ [${requestId}] Trial Setup:`);
          console.log(`📅 [${requestId}] Trial Start: ${trialStartDate.toISOString()}`);
          console.log(`📅 [${requestId}] Trial End: ${trialEndDate.toISOString()}`);
          console.log(`⏱️ [${requestId}] Trial Duration: ${trialDurationText} (${trialDurationMs}ms)`);
          console.log(`🌍 [${requestId}] Environment: ${process.env.NODE_ENV}`);
          console.log(`📦 [${requestId}] Selected Plan: ${selectedPlan}`);

          const subscriptionId = uuidv4();
          const tools = selectedPlan === 'enterprise' ?
            ['crm', 'hr', 'affiliate', 'accounting', 'inventory'] :
            selectedPlan === 'professional' ?
            ['crm', 'hr', 'affiliate'] :
            selectedPlan === 'starter' ?
            ['crm', 'hr'] :
            ['crm']; // trial plan gets only CRM

          const limits = {
            apiCalls: selectedPlan === 'enterprise' ? 100000 :
                      selectedPlan === 'professional' ? 50000 :
                      selectedPlan === 'starter' ? 25000 : 10000,
            storage: selectedPlan === 'enterprise' ? 100000000000 : // 100GB
                     selectedPlan === 'professional' ? 50000000000 : // 50GB
                     selectedPlan === 'starter' ? 10000000000 : // 10GB
                     1000000000, // 1GB for trial
            users: selectedPlan === 'trial' ? 2 : (maxUsers || 5), // Trial limited to 2 users
            roles: selectedPlan === 'trial' ? 2 : 10, // Trial limited to 2 roles
            projects: maxProjects || 10
          };

          const subscriptionData = {
            subscriptionId,
            tenantId: tenant.tenantId,
            plan: selectedPlan,
            status: 'trialing',
            subscribedTools: tools,
            usageLimits: limits,
            monthlyPrice: planPrice ? planPrice.toString() : '0.00',
            yearlyPrice: '0.00',
            billingCycle: 'monthly',
            trialStart: trialStartDate,
            trialEnd: trialEndDate,
            currentPeriodStart: trialStartDate,
            currentPeriodEnd: trialEndDate,
            addOns: []
          };

          console.log(`📋 [${requestId}] Subscription Configuration:`);
          console.log(`🆔 [${requestId}] Subscription ID: ${subscriptionId}`);
          console.log(`📦 [${requestId}] Plan: ${selectedPlan}`);
          console.log(`📊 [${requestId}] Status: trialing`);
          console.log(`🛠️ [${requestId}] Tools: ${tools.join(', ')}`);
          console.log(`📊 [${requestId}] Usage Limits:`, {
            users: limits.users,
            roles: limits.roles,
            apiCalls: limits.apiCalls,
            storage: `${(limits.storage / 1000000000).toFixed(1)}GB`,
            projects: limits.projects
          });
          console.log(`💰 [${requestId}] Pricing: $${subscriptionData.monthlyPrice}/month`);

          console.log(`💾 [${requestId}] Inserting subscription into database...`);
          [subscription] = await tx.insert(subscriptions).values(subscriptionData).returning();

          console.log(`✅ [${requestId}] Subscription created successfully!`);
          console.log(`📋 [${requestId}] Subscription Details:`);
          console.log(`🆔 [${requestId}] Database ID: ${subscription.subscriptionId}`);
          console.log(`🏢 [${requestId}] Tenant ID: ${subscription.tenantId}`);
          console.log(`📦 [${requestId}] Plan: ${subscription.plan}`);
          console.log(`📊 [${requestId}] Status: ${subscription.status}`);
          console.log(`📅 [${requestId}] Trial Period: ${subscription.trialStart} → ${subscription.trialEnd}`);

          // Calculate and log trial duration
          const trialDurationDays = Math.ceil((new Date(subscription.trialEnd) - new Date(subscription.trialStart)) / (1000 * 60 * 60 * 24));
          const trialDurationHours = Math.ceil((new Date(subscription.trialEnd) - new Date(subscription.trialStart)) / (1000 * 60 * 60));

          // Store trial duration for credit allocation after transaction
          creditAllocationData = {
            tenantId: subscription.tenantId,
            creditAmount: 1000,
            trialDays: trialDurationDays
          };

          if (trialDurationDays >= 1) {
            console.log(`⏰ [${requestId}] Trial Duration: ${trialDurationDays} days`);
          } else {
            console.log(`⏰ [${requestId}] Trial Duration: ${trialDurationHours} hours`);
          }

          // For paid plans, create Stripe checkout session for post-trial payment (outside transaction)
          if (selectedPlan !== 'trial') {
            const plans = await SubscriptionService.getAvailablePlans();
            const plan = plans.find(p => p.id === selectedPlan);

            if (plan) {
              // We'll create this outside the transaction to avoid blocking
              console.log('📝 Stripe checkout will be created post-transaction');
            }
          }
        } catch (subscriptionError) {
          console.error(`❌ [${requestId || 'unknown'}] Failed to create subscription:`);
          console.error(`📋 [${requestId || 'unknown'}] Error Message: ${subscriptionError.message}`);
          console.error(`🔢 [${requestId || 'unknown'}] Error Code: ${subscriptionError.code}`);
          console.error(`📋 [${requestId || 'unknown'}] Stack Trace: ${subscriptionError.stack}`);
          console.log(`⚠️ [${requestId || 'unknown'}] Continuing onboarding without subscription - can be set up later`);
          // Continue without subscription - can be set up later
        }

        // 7. Create SUPER ADMIN role with comprehensive plan-based permissions
        // NOW INSIDE TRANSACTION to satisfy foreign key constraints
        console.log(`🔐 Creating Super Administrator role for ${selectedPlan} plan`);

        // Import the Super Admin permission utility
        const { createSuperAdminRoleConfig, logPermissionSummary } = await import('../../utils/super-admin-permissions.js');

        // Generate comprehensive role configuration
        const roleConfig = createSuperAdminRoleConfig(selectedPlan, tenant.tenantId, adminUser.userId);

        // Log what permissions are being created
        logPermissionSummary(selectedPlan, roleConfig.permissions);

        console.log('🔧 Creating admin role within transaction:', {
          tenantId: tenant.tenantId,
          createdBy: adminUser.userId,
          operation: 'create_admin_role_in_transaction'
        });

        // Create admin role using transaction object (tx)
        const [adminRole] = await tx
          .insert(customRoles)
          .values(roleConfig)
          .returning();

        console.log('✅ Admin role created in database:', {
          roleId: adminRole.roleId,
          roleName: adminRole.roleName,
          tenantId: adminRole.tenantId,
          createdBy: adminRole.createdBy
        });

        // 8. Assign admin role to admin user
        const [roleAssignment] = await tx
          .insert(userRoleAssignments)
          .values({
            userId: adminUser.userId,
            roleId: adminRole.roleId,
            assignedBy: adminUser.userId,
            organizationId: tenant.tenantId // organizationId references tenants.tenantId, not entities.entityId
          })
          .returning();

        console.log('✅ Admin role assigned to user:', {
          assignmentId: roleAssignment.id,
          userId: roleAssignment.userId,
          roleId: roleAssignment.roleId,
          assignedBy: roleAssignment.assignedBy
        });

        // 9. Return the created records
        return {
          tenant,
          organization,
          adminUser,
          adminRole,
          roleAssignment,
          kindeOrg,
          kindeUser,
          selectedPlan,
          subscription,
          checkoutUrl,
          finalKindeUserId,
          actualOrgCode,
          creditAllocationData
        };
      });

      console.log('✅ Database transaction completed successfully');

      // 10. Post-transaction: Credit allocation (using system connection to bypass RLS)
      console.log(`🎁 [${requestId}] Allocating trial credits after transaction...`);

      try {
        const creditResult = await creditAllocationService.allocateTrialCredits(
          result.tenant.tenantId,
          result.organization.organizationId,
          {
            creditAmount: 1000,
            trialDays: 5 // 5 minutes for testing
          }
        );

        console.log(`✅ [${requestId}] Credits allocated successfully!`);
        console.log(`💰 [${requestId}] Credit ID: ${creditResult.creditId}`);
        console.log(`🎯 [${requestId}] Credits Amount: ${creditResult.amount}`);
        console.log(`📅 [${requestId}] Credits Expiry: ${creditResult.expiryDate}`);
      } catch (creditError) {
        console.error(`❌ [${requestId}] Credit allocation failed:`, creditError.message);
        // Don't fail the entire onboarding process for credit allocation failure
        console.warn(`⚠️ [${requestId}] Continuing onboarding despite credit allocation failure`);
      }

      // 11. Post-transaction: Track successful trial onboarding completion
      try {
        await OnboardingTrackingService.trackOnboardingPhase(
          result.tenant.tenantId,
          'trial',
          'completed',
          {
            userId: result.adminUser?.userId,
            sessionId: request.headers['x-session-id'] || null,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            eventData: {
              selectedPlan,
              subdomain: result.tenant.subdomain,
              hasGstin: !!gstin,
              adminEmail
            },
            metadata: {
              source: 'core_onboarding',
              version: '1.0'
            },
            completionRate: 100,
            stepNumber: 1,
            totalSteps: 1
          }
        );
      } catch (trackingError) {
        console.warn('⚠️ Trial onboarding tracking failed, but onboarding completed:', trackingError.message);
        // Don't fail the onboarding process for tracking issues
      }

      // 12. Post-transaction: Enhanced Kinde organization assignment with retries
      console.log('🔧 Post-transaction Kinde organization assignment:', {
        userId: result.finalKindeUserId,
        orgCode: result.actualOrgCode,
        orgName: companyName,
        userType: result.kindeUser?.existing_user ? 'existing' : 'new'
      });

      // Enhanced organization assignment with user creation and correct API usage
      async function assignUserToOrganizationWithRetries(userId, orgCode, userEmail, userName, userMobile, maxRetries = 3) {
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          console.log(`🔄 Organization assignment attempt ${attempt}/${maxRetries}...`);

          // Strategy 1: Create user in Kinde if needed (addresses USER_ID_INVALID errors)
          console.log('📋 Strategy 1: Creating user in Kinde if needed...');
          try {
            const createdUser = await kindeService.createUser({
              email: userEmail,
              given_name: userName.split(' ')[0] || '',
              family_name: userName.split(' ').slice(1).join(' ') || '',
              organization_code: orgCode // Add user directly to organization during creation
            });
            console.log('✅ User created in Kinde:', createdUser.id);

            // Update the userId for subsequent operations
            if (createdUser.id && !createdUser.created_with_fallback) {
              userId = createdUser.id;
            }
          } catch (createError) {
            console.log('⚠️ User creation failed (user might already exist):', createError.message);
            // Continue anyway - user might already exist
          }

          // Strategy 2: Add user to organization using correct API
          console.log('📋 Strategy 2: Adding user to organization...');
          try {
            // Use exclusive mode immediately for cleaner organization assignment
            console.log('🔄 Adding user to organization with exclusive mode...');
            const result = await kindeService.addUserToOrganization(
              userId, // Use the actual user ID
              orgCode,
              { exclusive: true } // Use exclusive mode to ensure clean assignment
            );

            if (result.success) {
              console.log('✅ User successfully added to organization:', result);
              return { success: true, method: 'exclusive_assignment', attempt, details: result };
            } else {
              throw new Error('Assignment returned success=false');
            }
          } catch (addError) {
            console.log(`❌ Failed to add user to organization (attempt ${attempt}):`, addError.message);
            lastError = addError;

           // Wait before retry if not the last attempt
            if (attempt < maxRetries) {
              const waitTime = attempt * 2000; // Progressive backoff: 2s, 4s, 6s
              console.log(`⏳ Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }

        // All strategies failed
        return { success: false, lastError, attempts: maxRetries };
      }

      // Perform the assignment with enhanced retry logic
      const assignmentResult = await assignUserToOrganizationWithRetries(
        result.finalKindeUserId,
        result.actualOrgCode,
        adminEmail,
        adminUserName,
        adminMobile
      );

      if (assignmentResult.success) {
        console.log(`✅ User successfully assigned to organization via ${assignmentResult.method} (attempt ${assignmentResult.attempt})`);

        // Verify the assignment with retry
        try {
          console.log('🔍 Verifying organization assignment...');
          let verificationSuccess = false;

          for (let verifyAttempt = 1; verifyAttempt <= 3; verifyAttempt++) {
            try {
              const userOrgs = await kindeService.getUserOrganizations(result.finalKindeUserId);
              const ourOrg = userOrgs.organizations?.find(org => org.code === result.actualOrgCode);

              if (ourOrg) {
                console.log('✅ Organization assignment verified:', {
                  orgCode: ourOrg.code,
                  orgName: ourOrg.name,
                  verifyAttempt
                });
                verificationSuccess = true;
                break;
              } else {
                console.log(`⚠️ Verification attempt ${verifyAttempt}: Organization not found in user's list`);
                if (verifyAttempt < 3) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            } catch (verifyError) {
              console.log(`⚠️ Verification attempt ${verifyAttempt} failed:`, verifyError.message);
              if (verifyAttempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }

          if (!verificationSuccess) {
            console.warn('⚠️ Could not verify organization assignment, but assignment commands succeeded');
          }

        } catch (verifyError) {
          console.warn('⚠️ Organization assignment verification failed:', verifyError.message);
        }

      } else {
        console.error('❌ Failed to assign user to organization after all retries:', {
          error: assignmentResult.lastError?.message,
          attempts: assignmentResult.attempts,
          userId: result.finalKindeUserId,
          orgCode: result.actualOrgCode,
          recommendation: 'User can be manually assigned later using the fix script'
        });

        // Don't fail the entire onboarding - user is created in database successfully
        console.log('⚠️ Continuing with onboarding despite organization assignment failure');
        console.log('💡 User can be assigned to organization later using: npm run fix:organizations');
      }

      // 11. Create and verify DNS record for subdomain
      console.log('🌐 Creating and verifying DNS record for subdomain:', result.tenant.subdomain);

      let dnsVerificationResult = null;

      try {
        // Import DNS management service
        const DNSManagementService = (await import('../../services/dns-management-service.js')).default;

        // Step 1: Check DNS service health before attempting creation
        console.log('🔍 Checking DNS service health...');
        const healthCheck = await DNSManagementService.healthCheck();

        if (healthCheck.status !== 'healthy') {
          console.warn('⚠️ DNS service health check failed:', healthCheck);
          console.warn('⚠️ DNS record creation may fail, but onboarding will continue');
        } else {
          console.log('✅ DNS service is healthy:', {
            service: healthCheck.service,
            hostedZoneId: healthCheck.hostedZoneId,
            baseDomain: healthCheck.baseDomain
          });
        }

        // Step 2: Create DNS record
        console.log('🏗️ Creating DNS record...');
        const dnsResult = await DNSManagementService.createTenantSubdomain(result.tenant.tenantId);

        console.log('✅ DNS record created successfully:', {
          subdomain: dnsResult.subdomain,
          fullDomain: dnsResult.fullDomain,
          target: dnsResult.target,
          dnsChangeId: dnsResult.dnsChangeId,
          isExisting: dnsResult.isExisting
        });

        // Update tenant with DNS change ID if available
        if (dnsResult.dnsChangeId) {
          console.log('📝 DNS change ID recorded:', dnsResult.dnsChangeId);
        }

        // Step 3: Verify DNS record propagation (attempt resolution)
        console.log('🔍 Verifying DNS A record propagation...');
        const verificationDomain = dnsResult.fullDomain;
        console.log(`Checking A record resolution for: ${verificationDomain}`);

        try {
          // Import DNS module for verification
          const dns = await import('dns');
          const aRecords = await dns.promises.resolve4(verificationDomain);

          console.log('✅ A records verified:', aRecords);

          const expectedIp = '35.171.71.112';
          const matches = aRecords.includes(expectedIp);

          dnsVerificationResult = {
            verified: matches,
            records: aRecords,
            domain: verificationDomain,
            status: matches ? 'operational' : 'mismatch',
            expected: expectedIp
          };

        } catch (resolveError) {
          console.log('⚠️ A record resolution failed (normal for immediate verification):', resolveError.message);
          console.log('📝 This is expected - DNS records typically take 5-60 minutes to propagate globally');
          console.log('⏰ The DNS record has been created and will be operational shortly');

          dnsVerificationResult = {
            verified: false,
            error: resolveError.message,
            domain: verificationDomain,
            status: 'pending_propagation',
            estimatedTime: '5-60 minutes'
          };
        }

        // Step 4: Log comprehensive DNS results
        console.log('📊 DNS Integration Summary:', {
          subdomain: dnsResult.subdomain,
          fullDomain: dnsResult.fullDomain,
          target: dnsResult.target,
          changeId: dnsResult.dnsChangeId,
          verificationStatus: dnsVerificationResult.status,
          propagationEstimated: dnsVerificationResult.estimatedTime || 'immediate'
        });

      } catch (dnsError) {
        console.error('❌ DNS integration failed:', dnsError.message);
        console.error('🔧 Error details:', {
          name: dnsError.name,
          message: dnsError.message,
          stack: dnsError.stack?.substring(0, 200) + '...'
        });

        // Provide comprehensive recovery information
        console.warn('⚠️ DNS record creation failed, but onboarding completed successfully');
        console.log('🔄 Recovery options:');
        console.log('   1. Automatic retry: DNS will be created on next application start');
        console.log('   2. Manual creation: POST /api/dns/subdomains');
        console.log('   3. API command:');
        console.log(`      curl -X POST http://localhost:3000/api/dns/subdomains \\`);
        console.log(`        -H "Content-Type: application/json" \\`);
        console.log(`        -d '{"tenantId": "${result.tenant.tenantId}"}'`);
        console.log('   4. Check DNS health: GET /api/dns/health');

        dnsVerificationResult = {
          verified: false,
          error: dnsError.message,
          status: 'failed',
          recoveryOptions: [
            'automatic_retry',
            'manual_api_call',
            'health_check'
          ]
        };
      }

      // 12. Force refresh the user's authentication state
      console.log('🔄 Force refreshing user authentication state after onboarding...');
      let immediateLoginUrl;
      try {
        // Add a small delay to ensure Kinde has processed the organization assignment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate auth URL for immediate login after onboarding with forced refresh
        immediateLoginUrl = kindeService.generateLoginUrl(
          result.actualOrgCode,
          `${process.env.FRONTEND_URL}/auth/callback?onboarding=complete&subdomain=${result.tenant.subdomain}&refresh=true`
        );

        console.log('✅ Authentication refresh URL generated:', immediateLoginUrl);
      } catch (refreshError) {
        console.warn('⚠️ Could not generate refresh URL, using standard login URL:', refreshError.message);
        try {
          immediateLoginUrl = kindeService.generateLoginUrl(
            result.actualOrgCode,
            `${process.env.FRONTEND_URL}/auth/callback?onboarding=complete&subdomain=${result.tenant.subdomain}`
          );
        } catch (fallbackError) {
          console.warn('⚠️ Could not generate fallback login URL either:', fallbackError.message);
          immediateLoginUrl = null;
        }
      }

      // Still send welcome email for future reference
      await EmailService.sendWelcomeEmail({
        email: adminEmail,
        name: adminUserName,
        companyName,
        subdomain: result.tenant.subdomain,
        kindeOrgCode: result.actualOrgCode,
        loginUrl: `https://${process.env.KINDE_DOMAIN}`
      });

      // Allocate free trial credits AFTER transaction completes

      return {
        success: true,
        data: {
          tenantId: result.tenant.tenantId,
          subdomain: result.tenant.subdomain,
          kindeOrgCode: result.actualOrgCode,
          organization: {
            id: result.organization.organizationId,
            name: result.organization.organizationName,
            code: result.organization.organizationCode,
            type: 'parent'
          },
          // DNS verification results
          dns: dnsVerificationResult ? {
            status: dnsVerificationResult.status,
            verified: dnsVerificationResult.verified,
            domain: dnsVerificationResult.domain,
            target: '35.171.71.112',
            changeId: dnsVerificationResult.changeId,
            estimatedPropagationTime: dnsVerificationResult.estimatedTime,
            records: dnsVerificationResult.records,
            error: dnsVerificationResult.error,
            recoveryOptions: dnsVerificationResult.recoveryOptions
          } : null,
          // Return immediate login URL for seamless SSO
          immediateLoginUrl: immediateLoginUrl || `https://${process.env.KINDE_DOMAIN}`,
          loginUrl: `https://${process.env.KINDE_DOMAIN}`,
          checkoutUrl: result.checkoutUrl,
          redirectToPayment: !!result.checkoutUrl
        }
      };

    } catch (error) {
      console.error('=== ONBOARDING ERROR ===');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      console.error('Request body:', request.body);
      console.error('========================');

      request.log.error('Error during onboarding:', error);
      return reply.code(500).send({
        error: 'Failed to complete onboarding',
        message: error.message
      });
    }
  });
}
