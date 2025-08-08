import { TenantService } from '../services/tenant-service.js';
import { SubscriptionService } from '../services/subscription-service.js';
import kindeService from '../services/kinde-service.js';
import EmailService from '../utils/email.js';
import { authenticateToken } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, subscriptions, tenantInvitations } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CRM_PERMISSION_MATRIX, CRM_SPECIAL_PERMISSIONS } from '../data/comprehensive-crm-permissions.js';

export default async function onboardingRoutes(fastify, options) {
  
  // Check subdomain availability
  fastify.post('/check-subdomain', {
    schema: {
      body: {
        type: 'object',
        required: ['subdomain'],
        properties: {
          subdomain: { type: 'string', minLength: 2, maxLength: 20 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { subdomain } = request.body;
      
      // Check if subdomain is available
      const available = await TenantService.checkSubdomainAvailability(subdomain);
      
      return {
        success: true,
        available,
        subdomain
      };
    } catch (error) {
      request.log.error('Error checking subdomain availability:', error);
      return reply.code(500).send({ error: 'Failed to check subdomain availability' });
    }
  });

  // Check subdomain availability (GET version for frontend)
  fastify.get('/check-subdomain', {
    schema: {
      querystring: {
        type: 'object',
        required: ['subdomain'],
        properties: {
          subdomain: { type: 'string', minLength: 2, maxLength: 20 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { subdomain } = request.query;
      
      console.log('🔍 Checking subdomain availability:', subdomain);
      
      // Check if subdomain is available
      const available = await TenantService.checkSubdomainAvailability(subdomain);
      
      console.log('✅ Subdomain availability result:', { subdomain, available });
      
      return {
        success: true,
        available,
        subdomain
      };
    } catch (error) {
      console.error('❌ Error checking subdomain availability:', error);
      request.log.error('Error checking subdomain availability:', error);
      return reply.code(500).send({ error: 'Failed to check subdomain availability' });
    }
  });

  // Complete onboarding process
  fastify.post('/onboard', {
    schema: {
      body: {
        type: 'object',
        required: ['companyName', 'subdomain', 'adminEmail', 'adminName', 'selectedPlan'],
        properties: {
          companyName: { type: 'string', minLength: 1, maxLength: 100 },
          subdomain: { type: 'string', minLength: 2, maxLength: 20 },
          industry: { type: 'string' },
          adminEmail: { type: 'string', format: 'email' },
          adminName: { type: 'string', minLength: 1, maxLength: 100 },
          selectedPlan: { type: 'string' },
          planName: { type: 'string' },
          planPrice: { type: 'number' },
          maxUsers: { type: 'number' },
          maxProjects: { type: 'number' },
          teamEmails: { 
            type: 'array',
            items: { type: 'string', format: 'email' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🚀 === ONBOARDING COMPLETION START ===');
      
      const {
        companyName,
        subdomain,
        industry,
        adminEmail,
        adminName,
        selectedPlan,
        planName,
        planPrice,
        maxUsers,
        maxProjects,
        teamEmails
      } = request.body;

      console.log('📝 Onboarding data received:', {
        companyName,
        subdomain,
        adminEmail,
        adminName,
        selectedPlan
      });

      // Check if the user making this request is authenticated
      let currentAuthenticatedUser = null;
      try {
        const token = extractToken(request);
        if (token) {
          currentAuthenticatedUser = await kindeService.validateToken(token);
          console.log('✅ User is authenticated during onboarding:', {
            kindeUserId: currentAuthenticatedUser.kindeUserId || currentAuthenticatedUser.userId,
            email: currentAuthenticatedUser.email || 'N/A'
          });
        }
      } catch (authError) {
        console.log('📝 User not authenticated during onboarding - will create user in Kinde');
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
              createdAt: existingTenant[0].onboardedAt
            }
          }
        });
      }

      // Variable to store the actual org code for use outside transaction
      let actualOrgCode;

      // Start transaction for complete onboarding
      const result = await db.transaction(async (tx) => {
        // 1. Check subdomain availability one more time
        const available = await TenantService.checkSubdomainAvailability(subdomain);
        if (!available) {
          throw new Error('Subdomain is no longer available');
        }

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
          actualOrgCode = `org_${subdomain}_${Date.now()}`;
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
        const [firstName, ...lastNameParts] = adminName.split(' ');
        const lastName = lastNameParts.join(' ') || '';
        
        try {
            kindeUser = await kindeService.createUser({
            profile: {
              given_name: firstName,
              family_name: lastName
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
                  given_name: firstName,
              family_name: lastName,
              created_with_fallback: true
            };
            
            console.log('🔄 Using fallback user ID:', finalKindeUserId);
          }
        }

        console.log('👤 Final Kinde user ID for database:', finalKindeUserId);

        // 4. Create tenant record in our database with comprehensive onboarding tracking
        const currentTime = new Date();
        const [tenant] = await tx
          .insert(tenants)
          .values({
            tenantId: uuidv4(),
            companyName: companyName,
            subdomain,
            kindeOrgId: actualOrgCode, // Use the actual org code
            adminEmail: adminEmail,
            industry: industry || null,
            
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

        console.log('✅ Tenant created in database:', tenant.tenantId);

        // 5. Create admin user record with the correct Kinde user ID
        const [adminUser] = await tx
          .insert(tenantUsers)
          .values({
            userId: uuidv4(),
            tenantId: tenant.tenantId,
            kindeUserId: finalKindeUserId, // Use the correct Kinde user ID
            email: adminEmail,
            name: adminName,
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

        // 6. Create SUPER ADMIN role with comprehensive plan-based permissions
        console.log(`🔐 Creating Super Administrator role for ${selectedPlan} plan`);
        
        // Import the Super Admin permission utility
        const { createSuperAdminRoleConfig, logPermissionSummary } = await import('../utils/super-admin-permissions.js');
        
        // Generate comprehensive role configuration
        const roleConfig = createSuperAdminRoleConfig(selectedPlan, tenant.tenantId, adminUser.userId);
        
        // Log what permissions are being created
        logPermissionSummary(selectedPlan, roleConfig.permissions);
        
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

        // 7. Assign admin role to admin user
        const [roleAssignment] = await tx
          .insert(userRoleAssignments)
          .values({
            userId: adminUser.userId,
            roleId: adminRole.roleId,
            assignedBy: adminUser.userId
          })
          .returning();

        console.log('✅ Admin role assigned to user:', {
          assignmentId: roleAssignment.assignmentId,
          userId: roleAssignment.userId,
          roleId: roleAssignment.roleId,
          assignedBy: roleAssignment.assignedBy
        });

        // 8. Create subscription record directly in transaction
        let subscription = null;
        let checkoutUrl = null;
        
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
          console.error(`❌ [${requestId}] Failed to create subscription:`);
          console.error(`📋 [${requestId}] Error Message: ${subscriptionError.message}`);
          console.error(`🔢 [${requestId}] Error Code: ${subscriptionError.code}`);
          console.error(`📋 [${requestId}] Stack Trace: ${subscriptionError.stack}`);
          console.log(`⚠️ [${requestId}] Continuing onboarding without subscription - can be set up later`);
          // Continue without subscription - can be set up later
        }

        // 9. Return the created records
        return {
          tenant,
          adminUser,
          kindeOrg,
          kindeUser,
          selectedPlan,
          subscription,
          checkoutUrl,
          finalKindeUserId,
          actualOrgCode
        };
      });

      console.log('✅ Database transaction completed successfully');

      // 10. Post-transaction: Enhanced Kinde organization assignment with retries
      console.log('🔧 Post-transaction Kinde organization assignment:', {
        userId: result.finalKindeUserId,
        orgCode: result.actualOrgCode,
        orgName: companyName,
        userType: result.kindeUser?.existing_user ? 'existing' : 'new'
      });

      // Enhanced organization assignment with user creation and correct API usage
      async function assignUserToOrganizationWithRetries(userId, orgCode, userEmail, userName, maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          console.log(`🔄 Organization assignment attempt ${attempt}/${maxRetries}...`);
          
          // Strategy 1: Create user in Kinde if needed (addresses USER_ID_INVALID errors)
          console.log('📋 Strategy 1: Creating user in Kinde if needed...');
          try {
            await kindeService.createKindeUser({
              email: userEmail,
              given_name: userName.split(' ')[0] || '',
              family_name: userName.split(' ').slice(1).join(' ') || '',
              is_create_profile: true,
              is_password_reset_requested: false
            });
            console.log('✅ User created in Kinde');
          } catch (createError) {
            console.log('⚠️ User creation failed (user might already exist):', createError.message);
            // Continue anyway - user might already exist
          }

                     // Strategy 2: Add user to organization using correct API
           console.log('📋 Strategy 2: Adding user to organization...');
           try {
             const result = await kindeService.addUserToOrganization(
               userEmail, // Use email instead of userId for more reliable assignment
               orgCode,
               { exclusive: true }
             );
             console.log('✅ User successfully added to organization:', result);
             return { success: true, method: 'direct_assignment', attempt, details: result };
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
        adminName
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

      // 11. Instead of just sending email, create immediate SSO login
      // Generate auth URL for immediate login after onboarding
      const immediateLoginUrl = kindeService.generateLoginUrl(
        result.actualOrgCode,
        `${process.env.FRONTEND_URL}/auth/callback?onboarding=complete&subdomain=${subdomain}`
      );

      // Still send welcome email for future reference
      await EmailService.sendWelcomeEmail({
        email: adminEmail,
        name: adminName,
        companyName,
        subdomain,
        kindeOrgCode: result.actualOrgCode,
        loginUrl: `https://${process.env.KINDE_DOMAIN}`
      });

      return {
        success: true,
        data: {
          tenantId: result.tenant.tenantId,
          subdomain,
          kindeOrgCode: result.actualOrgCode,
          organization: {
            id: result.tenant.tenantId,
            name: result.tenant.companyName,
            subdomain: result.tenant.subdomain
          },
          // Return immediate login URL for seamless SSO
          immediateLoginUrl,
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

  // Helper function to extract token (need to import this or redefine)
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

  // Get user's organization info after onboarding
  fastify.get('/user-organization', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const userId = request.userContext.userId;

      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, user.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({ error: 'Organization not found' });
      }

      return {
        success: true,
        data: {
          organization: {
            id: tenant.tenantId,
            name: tenant.companyName,
            domain: tenant.domain,
            subdomain: tenant.subdomain,
            createdAt: tenant.createdAt
          },
          user: {
            id: user.userId,
            email: user.email,
            name: user.name,
            isAdmin: user.isTenantAdmin,
            onboardingCompleted: user.onboardingCompleted
          }
        }
      };

    } catch (error) {
      request.log.error('Error getting user organization:', error);
      return reply.code(500).send({ error: 'Failed to get user organization' });
    }
  });

  // Mark onboarding as complete (with organization ID)
  fastify.post('/mark-complete', {
    preHandler: authenticateToken,
    schema: {
      body: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.userContext.userId;
      const { organizationId } = request.body;

      // Verify user belongs to this organization
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      if (user.tenantId !== organizationId) {
        return reply.code(403).send({ error: 'User does not belong to this organization' });
      }

      // Mark onboarding as completed
      await db
        .update(tenantUsers)
        .set({ 
          onboardingCompleted: true,
          onboardingStep: 'completed',
          updatedAt: new Date()
        })
        .where(eq(tenantUsers.userId, userId));

      return {
        success: true,
        message: 'Onboarding marked as completed',
        data: {
          userId,
          organizationId,
          completedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      request.log.error('Error marking onboarding complete:', error);
      return reply.code(500).send({ error: 'Failed to mark onboarding as complete' });
    }
  });

  // Update onboarding step (for step-by-step tracking)
  fastify.post('/update-step', {
    schema: {
      body: {
        type: 'object',
        required: ['step'],
        properties: {
          step: { type: 'string' },
          data: { type: 'object' },
          formData: { type: 'object' }, // Store form data for pre-filling
          email: { type: 'string', format: 'email' } // Optional email for non-authenticated users
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { step, data, formData, email } = request.body;
      let userId = null;

      // Try to get user ID from authenticated context first
      if (request.userContext?.userId) {
        userId = request.userContext.userId;
      } else if (email) {
        // If not authenticated, try to find user by email (for onboarding process)
        const [user] = await db
          .select()
          .from(tenantUsers)
          .where(eq(tenantUsers.email, email))
          .limit(1);
        
        if (user) {
          userId = user.userId;
        } else {
          // If user doesn't exist yet, we can't update step - this is fine during early onboarding
          console.log('User not found for email during onboarding step update:', email);
          return {
            success: true,
            message: 'Step tracking skipped - user not yet created',
            data: {
              step,
              reason: 'user_not_created_yet'
            }
          };
        }
      } else {
        return reply.code(400).send({ 
          error: 'Either authentication token or email is required' 
        });
      }

      // Get current user data to merge with existing preferences
      const [currentUser] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
        .limit(1);

      if (!currentUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Prepare onboarding data to store
      const existingPreferences = currentUser.preferences || {};
      const onboardingData = existingPreferences.onboarding || {};
      
      // Update onboarding progress
      const updatedOnboardingData = {
        ...onboardingData,
        currentStep: step,
        lastUpdated: new Date().toISOString(),
        stepData: {
          ...onboardingData.stepData,
          [step]: {
            ...data,
            completedAt: new Date().toISOString()
          }
        }
      };

      // Store form data if provided (for pre-filling)
      if (formData) {
        updatedOnboardingData.formData = {
          ...onboardingData.formData,
          ...formData
        };
      }

      // Update user's onboarding step and preferences
      await db
        .update(tenantUsers)
        .set({ 
          onboardingStep: step,
          preferences: {
            ...existingPreferences,
            onboarding: updatedOnboardingData
          },
          updatedAt: new Date()
        })
        .where(eq(tenantUsers.userId, userId));

      return {
        success: true,
        message: 'Onboarding step updated',
        data: {
          userId,
          currentStep: step,
          stepData: data,
          formData: formData || null,
          onboardingProgress: updatedOnboardingData
        }
      };

    } catch (error) {
      request.log.error('Error updating onboarding step:', error);
      return reply.code(500).send({ error: 'Failed to update onboarding step' });
    }
  });

  // Reset onboarding status (for testing/admin purposes)
  fastify.post('/reset', {
    preHandler: authenticateToken,
    schema: {
      body: {
        type: 'object',
        properties: {
          targetUserId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const currentUserId = request.userContext.userId;
      const { targetUserId } = request.body;
      const userIdToReset = targetUserId || currentUserId;

      // Check if current user has permission to reset (admin or self)
      const [currentUser] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, currentUserId))
        .limit(1);

      if (!currentUser) {
        return reply.code(404).send({ error: 'Current user not found' });
      }

      // If resetting another user, check admin permission
      if (targetUserId && targetUserId !== currentUserId && !currentUser.isTenantAdmin) {
        return reply.code(403).send({ error: 'Only tenant admins can reset other users onboarding' });
      }

      // Reset onboarding status
      await db
        .update(tenantUsers)
        .set({ 
          onboardingCompleted: false,
          onboardingStep: null,
          updatedAt: new Date()
        })
        .where(eq(tenantUsers.userId, userIdToReset));

      return {
        success: true,
        message: 'Onboarding status reset successfully',
        data: {
          resetUserId: userIdToReset,
          resetBy: currentUserId,
          resetAt: new Date().toISOString()
        }
      };

    } catch (error) {
      request.log.error('Error resetting onboarding status:', error);
      return reply.code(500).send({ error: 'Failed to reset onboarding status' });
    }
  });

  // Removed sync-user endpoint - overly complex, replaced with proper onboarding flow

  // Debug user roles and organization assignment
  fastify.get('/debug-user/:kindeUserId', async (request, reply) => {
    try {
      const { kindeUserId } = request.params;
      
      console.log('🔍 Debug user info for:', kindeUserId);
      
      // Get user from our database
      const [dbUser] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.kindeUserId, kindeUserId))
        .limit(1);
      
      // Get user's tenant
      let tenant = null;
      if (dbUser) {
        [tenant] = await db
          .select({
            tenantId: tenants.tenantId,
            companyName: tenants.companyName,
            subdomain: tenants.subdomain,
            adminEmail: tenants.adminEmail,
            isActive: tenants.isActive
          })
          .from(tenants)
          .where(eq(tenants.tenantId, dbUser.tenantId))
          .limit(1);
      }
      
      // Get user's roles in our database
      const roles = await db
        .select({
          roleId: userRoleAssignments.roleId,
          roleName: customRoles.roleName,
          assignedAt: userRoleAssignments.assignedAt,
          permissions: customRoles.permissions
        })
        .from(userRoleAssignments)
        .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(userRoleAssignments.userId, dbUser?.userId))
        .limit(10);
      
      // Get Kinde organizations
      let kindeOrgs = null;
      try {
        kindeOrgs = await kindeService.getUserOrganizations(kindeUserId);
      } catch (kindeError) {
        console.warn('Could not get Kinde organizations:', kindeError.message);
      }
      
      // Get Kinde user roles
      let kindeRoles = null;
      try {
        kindeRoles = await kindeService.getUserRoles(kindeUserId);
      } catch (kindeError) {
        console.warn('Could not get Kinde roles:', kindeError.message);
      }
      
      return reply.send({
        success: true,
        data: {
          kindeUserId,
          database: {
            user: dbUser,
            tenant: tenant,
            roles: roles
          },
          kinde: {
            organizations: kindeOrgs,
            roles: kindeRoles
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Debug user failed:', error);
      return reply.status(500).send({ 
        error: 'Failed to debug user',
        message: error.message
      });
    }
  });

  // SIMPLE: Create Organization Endpoint
  fastify.post('/create-organization', {
    schema: {
      body: {
        type: 'object',
        required: ['companyName', 'subdomain', 'adminEmail', 'adminName'],
        properties: {
          companyName: { type: 'string', minLength: 1, maxLength: 100 },
          subdomain: { type: 'string', minLength: 2, maxLength: 20 },
          industry: { type: 'string' },
          adminEmail: { type: 'string', format: 'email' },
          adminName: { type: 'string', minLength: 1, maxLength: 100 },
          selectedPlan: { type: 'string' },
          planName: { type: 'string' },
          planPrice: { type: 'number' },
          maxUsers: { type: 'number' },
          maxProjects: { type: 'number' },
          teamEmails: { 
            type: 'array',
            items: { type: 'string', format: 'email' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = `onboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('\n🚀 =================== ONBOARDING STARTED ===================');
      console.log(`📋 Request ID: ${requestId}`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 User IP: ${request.ip}`);
      console.log(`🖥️ User Agent: ${request.headers['user-agent']}`);
      
      const { 
        companyName, 
        subdomain, 
        industry,
        adminEmail, 
        adminName, 
        selectedPlan = 'professional',
        planName,
        planPrice,
        maxUsers,
        maxProjects,
        teamEmails = []
      } = request.body;

      console.log('📦 Onboarding Request Data:', {
        requestId,
        companyName,
        subdomain,
        industry,
        adminEmail,
        adminName,
        selectedPlan,
        planName,
        planPrice,
        maxUsers,
        maxProjects,
        teamEmailsCount: teamEmails.length,
        teamEmails: teamEmails.slice(0, 3) // Log first 3 emails only for privacy
      });

      // Get current user from token
      console.log(`🔐 [${requestId}] Step 1: Extracting authentication token...`);
      const token = extractToken(request);
      
      if (!token) {
        console.error(`❌ [${requestId}] Authentication failed: No token provided`);
        console.log(`⏱️ [${requestId}] Onboarding failed after ${Date.now() - startTime}ms`);
        return reply.code(401).send({ error: 'Authentication required' });
      }

      console.log(`✅ [${requestId}] Token extracted successfully`);
      console.log(`🔍 [${requestId}] Step 2: Validating token with Kinde...`);

      const kindeUser = await kindeService.validateToken(token);
      const kindeUserId = kindeUser.kindeUserId || kindeUser.userId;

      console.log(`✅ [${requestId}] User authenticated successfully:`, {
        kindeUserId,
        email: adminEmail,
        tokenValid: true,
        kindeResponse: {
          id: kindeUser.id,
          email: kindeUser.email,
          given_name: kindeUser.given_name,
          family_name: kindeUser.family_name
        }
      });

      // Check if organization already exists
      console.log(`🔍 [${requestId}] Step 3: Checking if organization already exists...`);
      console.log(`📧 [${requestId}] Checking email: ${adminEmail}`);
      
      const existingTenant = await db
        .select({ tenantId: tenants.tenantId })
        .from(tenants)
        .where(eq(tenants.adminEmail, adminEmail))
        .limit(1);

      if (existingTenant.length > 0) {
        console.error(`❌ [${requestId}] Organization already exists for email: ${adminEmail}`);
        console.log(`⏱️ [${requestId}] Onboarding failed after ${Date.now() - startTime}ms`);
        return reply.code(409).send({
          error: 'Organization already exists',
          message: 'This email is already associated with an organization.'
        });
      }

      console.log(`✅ [${requestId}] Email available for new organization`);

      // Check subdomain availability
      console.log(`🔍 [${requestId}] Step 4: Checking subdomain availability...`);
      console.log(`🏷️ [${requestId}] Checking subdomain: ${subdomain}`);
      
      const available = await TenantService.checkSubdomainAvailability(subdomain);
      
      if (!available) {
        console.error(`❌ [${requestId}] Subdomain unavailable: ${subdomain}`);
        console.log(`⏱️ [${requestId}] Onboarding failed after ${Date.now() - startTime}ms`);
        return reply.code(400).send({
          error: 'Subdomain unavailable',
          message: 'This subdomain is already taken.'
        });
      }

      console.log(`✅ [${requestId}] Subdomain available: ${subdomain}`);

      // 🎯 CRITICAL: Remove user from ALL current organizations first
      console.log(`🧹 [${requestId}] Step 5: Cleaning up user from existing organizations...`);
      console.log(`👤 [${requestId}] User ID: ${kindeUserId}`);
      
      try {
        const userOrgs = await kindeService.getUserOrganizations(kindeUserId);
        console.log(`🔍 [${requestId}] User organizations response:`, {
          organizationsCount: userOrgs.organizations?.length || 0,
          organizations: userOrgs.organizations?.map(org => ({
            code: org.code,
            name: org.name,
            is_default: org.is_default
          }))
        });
        
        if (userOrgs.organizations && userOrgs.organizations.length > 0) {
          console.log(`📋 [${requestId}] User is in ${userOrgs.organizations.length} organizations, removing all...`);
          
          for (const org of userOrgs.organizations) {
            console.log(`🗑️ [${requestId}] Removing user from organization: ${org.code}`);
            try {
              await kindeService.removeUserFromOrganization(kindeUserId, org.code);
              console.log(`✅ [${requestId}] Successfully removed user from organization: ${org.code}`);
            } catch (removeError) {
              console.warn(`⚠️ [${requestId}] Failed to remove from ${org.code}:`, {
                error: removeError.message,
                code: removeError.code,
                statusCode: removeError.statusCode
              });
            }
          }
        } else {
          console.log(`✅ [${requestId}] User is not in any organizations, skipping cleanup`);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ [${requestId}] Organization cleanup failed:`, {
          error: cleanupError.message,
          code: cleanupError.code,
          statusCode: cleanupError.statusCode
        });
      }

      // Create Kinde organization
      console.log(`🏢 [${requestId}] Step 6: Creating Kinde organization...`);
      const externalId = `tenant_${uuidv4()}`;
      console.log(`🆔 [${requestId}] External ID: ${externalId}`);
      console.log(`🏷️ [${requestId}] Organization name: ${companyName}`);
      
      const kindeOrg = await kindeService.createOrganization({
        name: companyName,
        external_id: externalId
      });

      console.log(`📄 [${requestId}] Kinde organization creation response:`, {
        success: !!kindeOrg.organization,
        organizationCode: kindeOrg.organization?.code,
        organizationName: kindeOrg.organization?.name,
        externalId: kindeOrg.organization?.external_id,
        isDefault: kindeOrg.organization?.is_default
      });

      const orgCode = kindeOrg.organization?.code;
      if (!orgCode) {
        console.error(`❌ [${requestId}] Failed to get organization code from Kinde response:`, kindeOrg);
        throw new Error('Failed to get organization code from Kinde');
      }

      console.log(`✅ [${requestId}] Kinde organization created successfully: ${orgCode}`);

      // Add user to the new organization (exclusively)
      console.log(`👤 [${requestId}] Step 7: Adding user to new organization...`);
      console.log(`🔗 [${requestId}] User: ${kindeUserId} → Organization: ${orgCode}`);
      
      await kindeService.addUserToOrganization(kindeUserId, orgCode, { exclusive: true });
      console.log(`✅ [${requestId}] User successfully added to organization: ${orgCode}`);

      // Database transaction
      console.log(`💾 [${requestId}] Step 8: Starting database transaction...`);
      const transactionStartTime = Date.now();
      
      const result = await db.transaction(async (tx) => {
        console.log(`📝 [${requestId}] Transaction started, creating database records...`);
        
        // Create tenant
        console.log(`🏢 [${requestId}] Creating tenant record...`);
        const tenantId = uuidv4();
        const currentTime = new Date();
        const tenantData = {
          tenantId,
          companyName,
          subdomain,
          industry: industry || null,
          kindeOrgId: orgCode,
          adminEmail,
          
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
        };
        console.log(`📄 [${requestId}] Tenant data:`, tenantData);
        
        const [tenant] = await tx
          .insert(tenants)
          .values(tenantData)
          .returning();
          
        console.log(`✅ [${requestId}] Tenant created successfully:`, {
          tenantId: tenant.tenantId,
          companyName: tenant.companyName,
          subdomain: tenant.subdomain,
          kindeOrgId: tenant.kindeOrgId
        });

        // Create admin user
        const [adminUser] = await tx
          .insert(tenantUsers)
          .values({
            userId: uuidv4(),
            tenantId: tenant.tenantId,
            kindeUserId,
            email: adminEmail,
            name: adminName,
            isActive: true,
            isVerified: true,
            isTenantAdmin: true,
            onboardingCompleted: true
          })
          .returning();

        // Create Super Admin role with comprehensive plan-based permissions
        const actualPlan = selectedPlan || 'trial';
        console.log(`🔐 Creating Super Administrator role for ${actualPlan} plan`);
        
        // Import the Super Admin permission utility
        const { createSuperAdminRoleConfig, logPermissionSummary } = await import('../utils/super-admin-permissions.js');
        
        // Generate comprehensive role configuration
        const roleConfig = createSuperAdminRoleConfig(actualPlan, tenant.tenantId, adminUser.userId);
        
        // Log what permissions are being created
        logPermissionSummary(actualPlan, roleConfig.permissions);
        
        const [adminRole] = await tx
          .insert(customRoles)
          .values(roleConfig)
          .returning();

        // Assign role to admin
        await tx
          .insert(userRoleAssignments)
          .values({
            userId: adminUser.userId,
            roleId: adminRole.roleId,
            assignedBy: adminUser.userId
          });

        // Create subscription directly within transaction
        let subscription;
        try {
          const actualPlan = selectedPlan || 'trial';
          const trialDurationMs = process.env.NODE_ENV === 'production' 
            ? 14 * 24 * 60 * 60 * 1000  // 14 days for production
            : 5 * 60 * 1000;              // 5 minutes for testing
          
          const trialEndDate = new Date(Date.now() + trialDurationMs);

          const subscriptionData = {
            subscriptionId: uuidv4(),
            tenantId: tenant.tenantId,
            plan: actualPlan,
            status: 'trialing',
            subscribedTools: actualPlan === 'enterprise' ? 
              ['crm', 'hr', 'affiliate', 'accounting', 'inventory'] :
              actualPlan === 'professional' ? 
              ['crm', 'hr', 'affiliate'] : 
              actualPlan === 'starter' ?
              ['crm', 'hr'] :
              ['crm'], // trial plan gets only CRM
            usageLimits: {
              apiCalls: actualPlan === 'enterprise' ? 100000 : 
                        actualPlan === 'professional' ? 50000 : 
                        actualPlan === 'starter' ? 25000 : 10000,
              storage: actualPlan === 'enterprise' ? 100000000000 : // 100GB
                       actualPlan === 'professional' ? 50000000000 : // 50GB
                       actualPlan === 'starter' ? 10000000000 : // 10GB
                       1000000000, // 1GB for trial
              users: actualPlan === 'trial' ? 2 : (maxUsers || 5), // Trial limited to 2 users
              roles: actualPlan === 'trial' ? 2 : 10, // Trial limited to 2 roles
              projects: maxProjects || 10
            },
            monthlyPrice: planPrice ? planPrice.toString() : '0.00',
            yearlyPrice: '0.00',
            billingCycle: 'monthly',
            trialStart: new Date(),
            trialEnd: trialEndDate,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndDate,
            addOns: []
          };
          
          console.log('🔧 Creating subscription within transaction for plan:', actualPlan);
          
          [subscription] = await tx.insert(subscriptions).values(subscriptionData).returning();
          console.log('✅ Subscription created successfully within transaction');
        } catch (subscriptionError) {
          console.error('❌ Failed to create subscription:', subscriptionError);
          throw subscriptionError; // Re-throw to trigger transaction rollback
        }

        return { tenant, adminUser, subscription };
      });

      // Record trial started event (outside transaction, non-blocking)
      try {
        await SubscriptionService.recordTrialEvent(
          result.tenant.tenantId,
          result.subscription.subscriptionId,
          'trial_started_onboarding',
          {
            planType: selectedPlan || 'professional',
            trialStart: new Date(),
            trialEnd: new Date(Date.now() + (process.env.NODE_ENV === 'production' ? 14 * 24 * 60 * 60 * 1000 : 1 * 60 * 1000)),
            source: 'onboarding',
            selectedPlan: selectedPlan
          }
        );
        console.log('✅ Trial event recorded successfully');
      } catch (eventError) {
        console.warn('⚠️ Failed to record trial event (non-critical):', eventError.message);
        // Don't fail the entire organization creation for trial event tracking
      }

      console.log(`✅ Trial subscription created:`, { 
        plan: result.subscription.plan,
        status: result.subscription.status,
        trialEnd: result.subscription.trialEnd
      });

      // 🎯 SET UP ORGANIZATION APPLICATIONS (CRITICAL ADDITION)
      try {
        console.log('🏢 Setting up organization applications...');
        const { OnboardingOrganizationSetupService } = await import('../services/onboarding-organization-setup.js');
        
        const setupResult = await OnboardingOrganizationSetupService.setupOrganizationApplicationsForNewTenant(
          result.tenant.tenantId, 
          result.subscription.plan
        );
        
        if (setupResult.success) {
          console.log(`✅ Organization applications setup completed: ${setupResult.appsConfigured} apps configured`);
          
          // Verify the setup
          const verification = await OnboardingOrganizationSetupService.verifyOrganizationSetup(result.tenant.tenantId);
          if (verification.success) {
            console.log(`🔍 Verification passed: ${verification.applicationsCount} applications accessible`);
          }
        }
      } catch (orgAppError) {
        console.error('❌ Failed to setup organization applications:', orgAppError.message);
        // Don't fail the entire onboarding process, but log the error for manual intervention
        console.warn('⚠️ Organization applications setup failed - will need manual setup');
      }

      console.log('✅ ORGANIZATION CREATION COMPLETED');

      // Send team invitations if any
      let invitationResults = [];
      if (teamEmails && teamEmails.length > 0) {
        console.log('📧 Sending team invitations to:', teamEmails);
        
        const EmailService = require('../utils/email.js').default;
        
        for (const email of teamEmails) {
          if (email.trim() && email !== adminEmail) {
            try {
              // Create invitation record
              const invitationId = uuidv4();
              const inviteToken = uuidv4();
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

              await db
                .insert(tenantInvitations)
                .values({
                  invitationId,
                  tenantId: result.tenant.tenantId,
                  inviterUserId: result.adminUser.userId,
                  inviteeEmail: email,
                  inviteToken,
                  expiresAt,
                  status: 'pending'
                });

              // Send invitation email
              const inviteUrl = `${process.env.FRONTEND_URL}/invite/accept?token=${inviteToken}`;
              
              await EmailService.sendInvitation({
                to: email,
                inviterName: adminName,
                organizationName: companyName,
                inviteUrl
              });

              invitationResults.push({
                email,
                success: true,
                invitationId
              });

              console.log('✅ Invitation sent to:', email);
            } catch (inviteError) {
              console.error('❌ Failed to send invitation to:', email, inviteError.message);
              invitationResults.push({
                email,
                success: false,
                error: inviteError.message
              });
            }
          }
        }
      }

      return reply.send({
        success: true,
        message: 'Organization created successfully',
        data: {
          tenantId: result.tenant.tenantId,
          subdomain: result.tenant.subdomain,
          kindeOrgCode: orgCode,
          subscription: {
            id: result.subscription.subscriptionId,
            plan: result.subscription.plan,
            status: result.subscription.status,
            trialEnd: result.subscription.trialEnd
          },
          invitations: invitationResults,
          redirectUrl: `${process.env.FRONTEND_URL}/dashboard?onboarding=complete&subdomain=${result.tenant.subdomain}&orgCode=${orgCode}`
        }
      });

    } catch (error) {
      console.error('❌ Error creating organization:', error);
      return reply.code(500).send({
        error: 'Failed to create organization',
        message: error.message
      });
    }
  });

  // Helper function to remove user from default Kinde organizations
  async function removeFromDefaultOrganizations(kindeUserId, targetOrgCode) {
    console.log('🧹 Removing user from default organizations...');
    
    try {
      // Get user's current organizations
      const userOrgs = await kindeService.getUserOrganizations(kindeUserId);
      
      if (userOrgs.organizations && userOrgs.organizations.length > 0) {
        console.log(`📋 User is in ${userOrgs.organizations.length} organizations:`, 
          userOrgs.organizations.map(org => org.code));
        
        // Remove from all organizations except the target one
        for (const org of userOrgs.organizations) {
          if (org.code !== targetOrgCode) {
            console.log(`🗑️ Removing user from unwanted organization: ${org.code}`);
            try {
              await kindeService.removeUserFromOrganization(kindeUserId, org.code);
              console.log(`✅ Removed user from organization: ${org.code}`);
            } catch (removeError) {
              console.warn(`⚠️ Failed to remove user from organization ${org.code}:`, removeError.message);
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to clean up default organizations:', error.message);
    }
  }

  // NEW FLOW 2: Join Existing Tenant/Organization
  fastify.post('/join-tenant', {
    schema: {
      body: {
        type: 'object',
        required: ['orgCode', 'userEmail'],
        properties: {
          orgCode: { type: 'string' },
          userEmail: { type: 'string', format: 'email' },
          userName: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🚀 === JOIN EXISTING TENANT START ===');
      
      const { orgCode, userEmail, userName } = request.body;

      console.log('📝 Join tenant data received:', {
        orgCode,
        userEmail,
        userName
      });

      // Check if user is authenticated
      let currentAuthenticatedUser = null;
      try {
        const token = extractToken(request);
        if (token) {
          currentAuthenticatedUser = await kindeService.validateToken(token);
          console.log('✅ User is authenticated during join:', {
            kindeUserId: currentAuthenticatedUser.kindeUserId || currentAuthenticatedUser.userId,
            email: currentAuthenticatedUser.email || 'N/A'
          });
        }
      } catch (authError) {
        return reply.code(401).send({
          error: 'Authentication required',
          message: 'You must be authenticated to join an organization'
        });
      }

      // Find the target organization
      const [targetTenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!targetTenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: 'The specified organization does not exist'
        });
      }

      const finalKindeUserId = currentAuthenticatedUser.kindeUserId || currentAuthenticatedUser.userId;

      // CRITICAL: Remove user from any default organizations BEFORE adding to target org
      // This ensures users are ONLY in the organization they're supposed to be in
      await removeFromDefaultOrganizations(finalKindeUserId, orgCode);

      // Add user to the target organization with exclusive mode
      try {
        const orgResult = await kindeService.addUserToOrganization(finalKindeUserId, orgCode, { exclusive: true });
        console.log('✅ User added to target organization:', { orgCode, result: orgResult });
      } catch (addError) {
        console.warn('⚠️ Failed to add user to organization:', addError.message);
        // Don't fail the entire flow if organization assignment fails
      }

      // Create user record in database (as invited user initially)
      const [newUser] = await db
        .insert(tenantUsers)
        .values({
          userId: uuidv4(),
          tenantId: targetTenant.tenantId,
          kindeUserId: finalKindeUserId,
          email: userEmail,
          name: userName || userEmail.split('@')[0],
          isActive: true, // Active since they're authenticated
          isVerified: true,
          isTenantAdmin: false, // Regular user, not admin
          onboardingCompleted: true
        })
        .returning();

      console.log('✅ User added to organization:', {
        userId: newUser.userId,
        tenantId: newUser.tenantId,
        email: newUser.email
      });

      console.log('✅ JOIN EXISTING TENANT COMPLETED');

      return reply.send({
        success: true,
        message: 'Successfully joined organization',
        data: {
          tenantId: targetTenant.tenantId,
          organization: {
            name: targetTenant.companyName,
            subdomain: targetTenant.subdomain
          },
          user: {
            userId: newUser.userId,
            email: newUser.email,
            name: newUser.name
          }
        }
      });

    } catch (error) {
      console.error('❌ Error joining tenant:', error);
      return reply.code(500).send({
        error: 'Failed to join organization',
        message: error.message
      });
    }
  });
} 
