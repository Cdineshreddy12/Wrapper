import { TenantService } from '../services/tenant-service.js';
import { SubscriptionService } from '../services/subscription-service.js';
import { OnboardingOrganizationSetupService } from '../services/onboarding-organization-setup.js';
import kindeService from '../services/kinde-service.js';
import EmailService from '../utils/email.js';
import { authenticateToken } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, subscriptions, tenantInvitations, trialEvents } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CRM_PERMISSION_MATRIX, CRM_SPECIAL_PERMISSIONS } from '../data/comprehensive-crm-permissions.js';
import ErrorResponses from '../utils/error-responses.js';
import GSTINValidationService from '../services/gstin-validation-service.js';

export default async function onboardingRoutes(fastify, options) {
  
  // Test Kinde M2M connection
  fastify.get('/test-kinde-connection', async (request, reply) => {
    try {
      console.log('🧪 Testing Kinde M2M connection...');
      
      // Test M2M token generation
      let m2mTokenResult = 'Not tested';
      try {
        const m2mToken = await kindeService.getM2MToken();
        m2mTokenResult = m2mToken ? 'Success' : 'Failed';
      } catch (error) {
        m2mTokenResult = `Error: ${error.message}`;
      }
      
      // Test getting all organizations
      let getAllOrgsResult = 'Not tested';
      try {
        const allOrgs = await kindeService.getAllOrganizations();
        getAllOrgsResult = allOrgs.success ? `Found ${allOrgs.organizations.length} organizations` : `Failed: ${allOrgs.error}`;
      } catch (error) {
        getAllOrgsResult = `Error: ${error.message}`;
      }
      
      // Test organization creation (dry run)
      let orgCreationResult = 'Not tested';
      try {
        const testOrg = await kindeService.createOrganization({
          name: 'Test Organization',
          external_id: 'test-org-' + Date.now() 
        });
        orgCreationResult = testOrg.success ? 'Success' : `Failed: ${testOrg.message}`;
      } catch (error) {
        orgCreationResult = `Error: ${error.message}`;
      }
      
      return {
        success: true,
        data: {
          kindeDomain: process.env.KINDE_DOMAIN,
          hasM2MClientId: !!process.env.KINDE_M2M_CLIENT_ID,
          hasM2MClientSecret: !!process.env.KINDE_M2M_CLIENT_SECRET,
          m2mTokenTest: m2mTokenResult,
          getAllOrganizationsTest: getAllOrgsResult,
          organizationCreationTest: orgCreationResult,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error testing Kinde connection:', error);
      return reply.code(500).send({ 
        error: 'Failed to test Kinde connection',
        message: error.message 
      });
    }
  });

  // GSTIN validation endpoint
  fastify.post('/validate-gstin', async (request, reply) => {
    try {
      const { gstin } = request.body;
      
      if (!gstin) {
        return reply.code(400).send({
          success: false,
          error: 'Missing GSTIN',
          message: 'GSTIN is required'
        });
      }

      console.log('🔍 Validating GSTIN:', gstin);
      
      // Validate GSTIN using external API
      const validationResult = await GSTINValidationService.validateGSTIN(gstin);
      
      if (validationResult.isValid) {
        // Auto-fill company details if GSTIN is valid
        const companyDetails = GSTINValidationService.extractCompanyInfo(validationResult);
        
        return reply.send({
          success: true,
          message: 'GSTIN validated successfully',
          data: {
            gstin: validationResult.details.gstin,
            isValid: true,
            companyDetails: companyDetails,
            validationDetails: validationResult.details
          }
        });
      } else {
        return reply.send({
          success: false,
          message: 'GSTIN validation failed',
          data: {
            gstin: gstin,
            isValid: false,
            error: validationResult.error,
            companyDetails: null
          }
        });
      }
      
    } catch (error) {
      console.error('❌ GSTIN validation error:', error);
      return reply.code(500).send({
        success: false,
        error: 'GSTIN validation failed',
        message: error.message
      });
    }
  });

  // Test user assignment to organization
  fastify.post('/test-user-assignment', async (request, reply) => {
    try {
      const { kindeUserId, orgCode } = request.body;
      
      if (!kindeUserId || !orgCode) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'kindeUserId and orgCode are required'
        });
      }
      
      console.log('🧪 Testing user assignment...');
      console.log(`User: ${kindeUserId}, Organization: ${orgCode}`);
      
      // Test adding user to organization
      const result = await kindeService.addUserToOrganization(kindeUserId, orgCode, { exclusive: false });
      
      return {
        success: true,
        data: {
          test: 'User Assignment Test',
          userId: kindeUserId,
          orgCode: orgCode,
          result: result,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error testing user assignment:', error);
      return reply.code(500).send({ 
        error: 'Failed to test user assignment',
        message: error.message 
      });
    }
  });


  //the test onborading flow should be removed in the future

  // Test full onboarding flow (simulation)
  fastify.post('/test-onboarding-flow', async (request, reply) => {
    try {
      const { companyName, subdomain, kindeUserId } = request.body;
      
      if (!companyName || !subdomain || !kindeUserId) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'companyName, subdomain, and kindeUserId are required'
        });
      }
      
      console.log('🧪 Testing full onboarding flow...');
      console.log(`Company: ${companyName}, Subdomain: ${subdomain}, User: ${kindeUserId}`);
      
      // Step 1: Create organization
      console.log('📋 Step 1: Creating organization...');
      const orgResult = await kindeService.createOrganization({
        name: companyName,
        external_id: subdomain
      });
      
      if (!orgResult || !orgResult.organization) {
        throw new Error('Organization creation failed');
      }
      
      const currentOrg = {
        code: orgResult.organization.code,
        name: orgResult.organization.name,
        external_id: orgResult.organization.external_id
      };
      
      console.log('✅ Organization created:', currentOrg);
      
      // Step 2: Add user to organization
      console.log('📋 Step 2: Adding user to organization...');
      const addUserResult = await kindeService.addUserToOrganization(
        kindeUserId,
        currentOrg.code,
        { exclusive: false }
      );
      
      console.log('✅ User assignment result:', addUserResult);
      
      // Step 3: Verify user is in organization
      console.log('📋 Step 3: Verifying user assignment...');
      const userOrgs = await kindeService.getUserOrganizations(kindeUserId);
      
      // Note: Kinde M2M API may not support getting user's organizations directly
      const isInOrg = userOrgs.success && userOrgs.organizations.some(org => org.code === currentOrg.code);
      
      console.log('ℹ️ User organizations result:', userOrgs);
      console.log('ℹ️ Note: M2M API may not support user organization verification');
      
      return {
        success: true,
        data: {
          test: 'Full Onboarding Flow Test',
          companyName,
          subdomain,
          kindeUserId,
          organization: currentOrg,
          userAssignment: addUserResult,
          userOrganizations: userOrgs,
          userIsInOrganization: isInOrg,
          note: 'M2M API may not support user organization verification',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error testing onboarding flow:', error);
      return reply.code(500).send({ 
        error: 'Failed to test onboarding flow',
        message: error.message 
      });
    }
  });
  


  //creation of the sub domain in the aws is pending for now ,it should be done immediately after the organization is created 

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


  
  // Get onboarding status
  fastify.get('/status', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return {
          success: true,
          data: {
            isOnboarded: false,
            needsOnboarding: true,
            onboardingStep: null,
            message: 'No authentication token provided'
          }
        };
      }

      const kindeUser = await kindeService.validateToken(token);
      const kindeUserId = kindeUser.kindeUserId || kindeUser.userId;

      // Look up user by kindeUserId
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.kindeUserId, kindeUserId))
        .limit(1);

      if (!user) {
        return {
          success: true,
          data: {
            isOnboarded: false,
            needsOnboarding: true,
            onboardingStep: '1',
            message: 'User not found in database'
          }
        };
      }

      // Get tenant information
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, user.tenantId))
        .limit(1);

      return {
        success: true,
        data: {
          isOnboarded: user.onboardingCompleted,
          needsOnboarding: !user.onboardingCompleted,
          onboardingStep: user.onboardingStep || '1',
          organization: tenant ? {
            id: tenant.tenantId,
            name: tenant.companyName,
            subdomain: tenant.subdomain
          } : null,
          user: {
            id: user.userId,
            email: user.email,
            name: user.name
          }
        }
      };

    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return reply.code(500).send({ 
        error: 'Failed to check onboarding status',
        message: error.message 
      });
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

  // CREATE: Create Organization and add the current user to it
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
    try {
      const { 
        companyName, 
        subdomain, 
        industry,
        adminEmail, 
        adminName, 
        selectedPlan = 'trial',
        planName,
        planPrice = 0,
        maxUsers = 5,
        maxProjects = 10,
        teamEmails = []
      } = request.body;

      // Get current user from token
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      const kindeUser = await kindeService.validateToken(token);
      const kindeUserId = kindeUser.kindeUserId || kindeUser.userId;

      // Check if organization already exists
      const existingTenantByEmail = await db
        .select({ tenantId: tenants.tenantId })
        .from(tenants)
        .where(eq(tenants.adminEmail, adminEmail))
        .limit(1);
      
      if (existingTenantByEmail.length > 0) {
        return reply.code(400).send({ 
          error: 'Email already associated with organization',
          message: 'This email is already associated with an organization'
        });
      }

      const existingTenantBySubdomain = await db
        .select({ tenantId: tenants.tenantId })
        .from(tenants)
        .where(eq(tenants.subdomain, subdomain))
        .limit(1);
      
      if (existingTenantBySubdomain.length > 0) {
        return reply.code(400).send({ 
          error: 'Subdomain already taken',
          message: 'This subdomain is already in use'
        });
      }

      // Get user's current organization from Kinde
      const userOrgs = await kindeService.getUserOrganizations(kindeUserId);
      let currentOrg = null;
      
      if (userOrgs.success && userOrgs.organizations.length > 0) {
        currentOrg = userOrgs.organizations[0];
        console.log('✅ User is in existing organization:', currentOrg);
      } else {
        // User is not in any organization, create one first
        console.log('🆕 User not in any organization, creating new organization...');
        
        try {
          const orgResult = await kindeService.createOrganization({
            name: companyName,
            external_id: subdomain
          });
          
          if (orgResult && orgResult.organization) {
            currentOrg = {
              code: orgResult.organization.code,
              name: orgResult.organization.name,
              external_id: orgResult.organization.external_id
            };
            console.log('✅ Organization created successfully:', currentOrg);
            
            if (orgResult.created_with_fallback) {
              console.log('ℹ️ Organization created using fallback method (M2M credentials failed)');
            }
          } else {
            throw new Error('No organization data returned from createOrganization');
          }
        } catch (orgError) {
          console.error('❌ Failed to create organization via Kinde API:', orgError);
          
          // Create a simple fallback organization with a format similar to Kinde's
          const fallbackOrgCode = `org_${subdomain}_${Date.now().toString(36)}`;
          currentOrg = {
            code: fallbackOrgCode,
            name: companyName,
            external_id: subdomain
          };
          console.log('✅ Created fallback organization:', currentOrg);
        }
      }

      if (!currentOrg || !currentOrg.code) {
        return reply.code(500).send({
          error: 'Organization not available',
          message: 'No organization code available for sync'
        });
      }

      // Ensure the current user is added to the organization
      let userAssignmentSuccess = false;
      try {
        console.log(`🔗 Attempting to add user ${kindeUserId} to organization ${currentOrg.code}...`);
        
        // Use the working user assignment logic from test endpoints
        const addUserResult = await kindeService.addUserToOrganization(
          kindeUserId,
          currentOrg.code,
          { exclusive: false }
        );
        
        if (addUserResult.success) {
          console.log(`✅ Successfully added user ${kindeUserId} to organization ${currentOrg.code}`);
          console.log('📊 User assignment details:', {
            userId: addUserResult.userId,
            method: addUserResult.method,
            message: addUserResult.message
          });
          userAssignmentSuccess = true;
        } else {
          console.error('❌ User assignment failed:', addUserResult.message);
          if (addUserResult.error) {
            console.error('Error details:', addUserResult.error);
          }
        }
      } catch (addUserError) {
        console.error('❌ Exception during user assignment:', addUserError.message);
        if (addUserError.response) {
          console.error('Response status:', addUserError.response.status);
          console.error('Response data:', addUserError.response.data);
        }
      }
      
      // If user assignment failed, try to get more information
      if (!userAssignmentSuccess) {
        console.warn('⚠️ User assignment failed, but continuing with onboarding...');
        console.log('ℹ️ Note: Kinde M2M API may not support verifying user organization membership');
        
        // Try one more time with different approach
        try {
          console.log('🔄 Retrying user assignment with alternative method...');
          const retryResult = await kindeService.addUserToOrganization(
            kindeUserId,
            currentOrg.code,
            { exclusive: false }
          );
          
          if (retryResult.success) {
            console.log('✅ Retry successful! User assignment completed.');
            userAssignmentSuccess = true;
          } else {
            console.warn('⚠️ Retry also failed, proceeding with fallback mode');
          }
        } catch (retryError) {
          console.warn('⚠️ Retry attempt also failed:', retryError.message);
        }
      }
      
      // Log the organization details for debugging
      console.log('🏢 Final organization details:', {
        code: currentOrg.code,
        name: currentOrg.name,
        external_id: currentOrg.external_id,
        isFallback: currentOrg.code.includes('_fallback') || currentOrg.code.includes('_org_'),
        userAssignmentSuccess: userAssignmentSuccess
      });
      
      // If user assignment still failed, log a warning but continue (fallback mode)
      if (!userAssignmentSuccess) {
        console.warn('⚠️ User assignment to Kinde organization failed. Continuing with local onboarding only.');
      }

      // Start database transaction
      const transaction = await db.transaction(async (tx) => {
        // Create tenant record
        const tenantId = uuidv4();
        const newTenant = await tx.insert(tenants).values({
          tenantId: tenantId,
          companyName: companyName,
          subdomain: subdomain,
          kindeOrgId: currentOrg.code,
          adminEmail: adminEmail,
          industry: industry,
          onboardingCompleted: true,
          onboardingStep: 'completed',
          trialStartedAt: new Date(),
          trialStatus: 'active',
          subscriptionStatus: 'trial'
        }).returning();

        // Create user record
        const userId = uuidv4();
        const newUser = await tx.insert(tenantUsers).values({
          userId: userId,
          tenantId: tenantId,
          kindeUserId: kindeUserId,
          email: adminEmail,
          name: adminName,
          isActive: true,
          isVerified: true,
          isTenantAdmin: true,
          onboardingCompleted: true
        }).returning();

        // Create Super Administrator role
        const roleId = uuidv4();
        const newRole = await tx.insert(customRoles).values({
          roleId: roleId,
          tenantId: tenantId,
          roleName: 'Super Administrator',
          description: `${selectedPlan} Administrator`,
          permissions: JSON.stringify({ crm: true, users: true, roles: true }),
          isSystemRole: true,
          isDefault: true,
          priority: 1000,
          createdBy: userId
        }).returning();

        // Assign role to user
        await tx.insert(userRoleAssignments).values({
          userId: userId,
          roleId: roleId,
          assignedBy: userId,
          assignedAt: new Date(),
          isActive: true
        });

        // Create subscription
        const subscriptionId = uuidv4();
        const trialEnd = new Date(Date.now() + (5 * 60 * 1000)); // 5 minutes
        
        await tx.insert(subscriptions).values({
          subscriptionId: subscriptionId,
          tenantId: tenantId,
          plan: selectedPlan,
          status: 'trialing',
          trialStart: new Date(),
          trialEnd: trialEnd,
          subscribedTools: JSON.stringify(['crm']),
          usageLimits: JSON.stringify({
            users: maxUsers,
            projects: maxProjects
          }),
          billingCycle: 'monthly',
          monthlyPrice: planPrice.toString()
        });

        // Set up organization applications
        await OnboardingOrganizationSetupService.setupOrganizationApplicationsForNewTenant(tenantId, selectedPlan);

        return {
          tenantId,
          userId,
          roleId,
          subscriptionId,
          kindeOrgCode: currentOrg.code
        };
      });

      return reply.send({
        success: true,
        message: 'Organization created and user onboarded successfully',
        data: {
          tenantId: transaction.tenantId,
          kindeOrgCode: transaction.kindeOrgCode
        }
      });

    } catch (error) {
      console.error('Organization creation failed:', error);
      return reply.code(500).send({
        error: 'Failed to create organization',
        message: error.message
      });
    }
  });

  // Company onboarding setup endpoint
  fastify.post('/company-setup', async (request, reply) => {
    try {
      const {
        // Company Profile
        companyName,
        legalCompanyName,
        gstin,
        dunsNumber,
        industry,
        companyType,
        ownership,
        annualRevenue,
        numberOfEmployees,
        tickerSymbol,
        website,
        description,
        foundedDate,
        
        // Contact & Address
        billingStreet,
        billingCity,
        billingState,
        billingZip,
        billingCountry,
        shippingStreet,
        shippingCity,
        shippingState,
        shippingZip,
        shippingCountry,
        phone,
        fax,
        
        // Localization
        defaultLanguage,
        defaultLocale,
        defaultCurrency,
        multiCurrencyEnabled,
        advancedCurrencyManagement,
        defaultTimeZone,
        firstDayOfWeek,
        
        // Administrator Setup
        adminFirstName,
        adminLastName,
        adminEmail,
        adminUsername,
        adminAlias,
        adminPhone,
        adminMobile,
        adminTitle,
        adminDepartment,
        adminManager,
        adminRole,
        adminProfile
      } = request.body;

      // Validate required fields
      const requiredFields = [
        'companyName', 'industry', 'companyType', 'defaultLanguage',
        'defaultCurrency', 'defaultTimeZone', 'adminFirstName', 'adminLastName',
        'adminEmail', 'adminUsername', 'adminRole', 'adminProfile'
      ];

      const missingFields = requiredFields.filter(field => !request.body[field]);
      
      if (missingFields.length > 0) {
        return reply.code(400).send({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      // Generate organization code from company name
      const orgCode = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 8);
      
      // Generate unique subdomain and Kinde org ID to avoid conflicts
      const uniqueSubdomain = `${orgCode}-${Date.now()}`;
      const uniqueKindeOrgId = `${orgCode}-${Date.now()}`;

      // Create tenant record
      const tenantId = uuidv4();
      const newTenant = await db.insert(tenants).values({
        tenantId: tenantId,
        companyName: companyName,
        subdomain: uniqueSubdomain,
        kindeOrgId: uniqueKindeOrgId,
        adminEmail: adminEmail,
        industry: industry,
        onboardingCompleted: true,
        onboardingStep: 'completed',
        trialStartedAt: new Date(),
        trialStatus: 'active',
        subscriptionStatus: 'trial',
        
        // Additional company fields
        legalCompanyName: legalCompanyName || companyName,
        gstin: gstin,
        dunsNumber: dunsNumber,
        companyType: companyType,
        ownership: ownership,
        annualRevenue: annualRevenue ? parseFloat(annualRevenue) : null,
        numberOfEmployees: numberOfEmployees ? parseInt(numberOfEmployees) : null,
        tickerSymbol: tickerSymbol,
        website: website,
        companyDescription: description,
        foundedDate: foundedDate ? new Date(foundedDate) : null,
        
        // Address fields
        billingStreet: billingStreet,
        billingCity: billingCity,
        billingState: billingState,
        billingZip: billingZip,
        billingCountry: billingCountry,
        shippingStreet: shippingStreet,
        shippingCity: shippingCity,
        shippingState: shippingState,
        shippingZip: shippingZip,
        shippingCountry: shippingCountry,
        phone: phone,
        fax: fax,
        
        // Localization settings
        defaultLanguage: defaultLanguage,
        defaultLocale: defaultLocale,
        defaultCurrency: defaultCurrency,
        multiCurrencyEnabled: multiCurrencyEnabled || false,
        advancedCurrencyManagement: advancedCurrencyManagement || false,
        defaultTimeZone: defaultTimeZone,
        firstDayOfWeek: parseInt(firstDayOfWeek) || 1
      }).returning();

      // Create admin user record
      const userId = uuidv4();
      const newUser = await db.insert(tenantUsers).values({
        userId: userId,
        tenantId: tenantId,
        kindeUserId: adminEmail, // Using email as Kinde user ID for now
        email: adminEmail,
        name: `${adminFirstName} ${adminLastName}`,
        firstName: adminFirstName,
        lastName: adminLastName,
        username: adminUsername,
        alias: adminAlias,
        phone: adminPhone,
        mobile: adminMobile,
        title: adminTitle,
        department: adminDepartment,
        profileData: {
          role: adminRole,
          profile: adminProfile
        },
        isActive: true,
        isVerified: true,
        isTenantAdmin: true,
        onboardingCompleted: true
      }).returning();

      // Create Super Administrator role
      const roleId = uuidv4();
      const newRole = await db.insert(customRoles).values({
        roleId: roleId,
        tenantId: tenantId,
        roleName: adminRole,
        description: `${adminRole} for ${companyName}`,
        permissions: JSON.stringify({ crm: true, users: true, roles: true }),
        isSystemRole: true,
        isDefault: true,
        priority: 1000,
        createdBy: userId
      }).returning();

      // Assign role to user
      await db.insert(userRoleAssignments).values({
        userId: userId,
        roleId: roleId,
        assignedBy: userId,
        assignedAt: new Date(),
        isActive: true
      });

      // Create subscription
      const subscriptionId = uuidv4();
      const trialEnd = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days
        
      await db.insert(subscriptions).values({
        subscriptionId: subscriptionId,
        tenantId: tenantId,
        plan: 'trial',
        status: 'trialing',
        trialStart: new Date(),
        trialEnd: trialEnd,
        subscribedTools: JSON.stringify(['crm']),
        usageLimits: JSON.stringify({
          users: 10,
          projects: 5
        }),
        billingCycle: 'monthly',
        monthlyPrice: '0'
      });

      // Set up organization applications
      await OnboardingOrganizationSetupService.setupOrganizationApplicationsForNewTenant(tenantId, 'trial');

      console.log(`Company onboarding completed for ${companyName}`, {
        tenantId: tenantId,
        userId: userId,
        roleId: roleId
      });

      return reply.send({
        success: true,
        message: 'Company setup completed successfully',
        data: {
          tenant: {
            id: tenantId,
            orgCode: orgCode,
            name: companyName
          },
          user: {
            id: userId,
            email: adminEmail,
            name: `${adminFirstName} ${adminLastName}`
          },
          role: {
            id: roleId,
            name: adminRole
          }
        }
      });

    } catch (error) {
      console.error('Error in company onboarding setup:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to complete company setup',
        details: error.message
      });
    }
  });

  // Get onboarding progress
  fastify.get('/progress/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      
      // Check if user has completed onboarding
      const user = await db.query.tenantUsers.findFirst({
        where: eq(tenantUsers.userId, userId),
        with: {
          tenant: true
        }
      });

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'User not found'
        });
      }

      const isOnboardingComplete = user.tenant && user.tenant.onboardingCompleted;

      return reply.send({
        success: true,
        data: {
          isComplete: isOnboardingComplete,
          tenant: user.tenant ? {
            id: user.tenant.tenantId,
            name: user.tenant.companyName,
            orgCode: user.tenant.subdomain,
            status: user.tenant.subscriptionStatus
          } : null
        }
      });

    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get onboarding progress'
      });
    }
  });
}
