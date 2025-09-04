/**
 * Payment Upgrade Routes - Handle plan upgrades and additional setup
 */

import { authenticateToken } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { tenants, tenantUsers, subscriptions, organizations } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import EmailService from '../utils/email.js';
import { OnboardingTrackingService } from '../services/onboarding-tracking-service.js';

export default async function paymentUpgradeRoutes(fastify, options) {

  // Check if profile is already completed
  fastify.get('/profile-status', {
    preHandler: [authenticateToken],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            profileCompleted: { type: 'boolean' },
            setupCompletionRate: { type: 'number' },
            onboardingCompleted: { type: 'boolean' },
            gstin: { type: 'string' },
            hasRequiredFields: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;

      // Get current tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, userContext.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      // Check if profile has all required fields for upgrade
      const hasRequiredFields = !!(
        tenant.gstin &&
        tenant.legalCompanyName &&
        tenant.industry &&
        tenant.billingStreet &&
        tenant.billingCity &&
        tenant.billingCountry
      );

      const profileCompleted = tenant.onboardingCompleted && tenant.setupCompletionRate >= 100;

      console.log('📋 Profile status check:', {
        profileCompleted,
        setupCompletionRate: tenant.setupCompletionRate,
        onboardingCompleted: tenant.onboardingCompleted,
        gstin: tenant.gstin ? 'present' : 'missing',
        hasRequiredFields
      });

      return {
        success: true,
        profileCompleted,
        setupCompletionRate: tenant.setupCompletionRate || 0,
        onboardingCompleted: tenant.onboardingCompleted || false,
        gstin: tenant.gstin,
        hasRequiredFields
      };

    } catch (error) {
      console.error('❌ Profile status check failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to check profile status',
        error: error.message
      });
    }
  });

  // Complete comprehensive profile data (separate from payment)
  fastify.post('/complete-profile', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['gstin'],
        properties: {
          gstin: { type: 'string', minLength: 15, maxLength: 15 },

          // Company Profile
          legalCompanyName: { type: 'string' },
          industry: { type: 'string' },
          companyType: { type: 'string' },
          ownership: { type: 'string' },
          annualRevenue: { type: 'number' },
          numberOfEmployees: { type: 'number' },
          tickerSymbol: { type: 'string' },
          website: { type: 'string' },
          description: { type: 'string' },
          foundedDate: { type: 'string' },

          // Contact & Address
          billingStreet: { type: 'string' },
          billingCity: { type: 'string' },
          billingState: { type: 'string' },
          billingZip: { type: 'string' },
          billingCountry: { type: 'string' },
          shippingStreet: { type: 'string' },
          shippingCity: { type: 'string' },
          shippingState: { type: 'string' },
          shippingZip: { type: 'string' },
          shippingCountry: { type: 'string' },
          phone: { type: 'string' },
          fax: { type: 'string' },

          // Localization
          defaultLanguage: { type: 'string' },
          defaultLocale: { type: 'string' },
          defaultCurrency: { type: 'string' },
          multiCurrencyEnabled: { type: 'boolean' },
          advancedCurrencyManagement: { type: 'boolean' },
          defaultTimeZone: { type: 'string' },
          firstDayOfWeek: { type: 'number' },

          // Plan selection for validation
          selectedPlan: { type: 'string', enum: ['starter', 'professional', 'enterprise'] },
          maxUsers: { type: 'number', minimum: 1, maximum: 1000 },
          maxProjects: { type: 'number', minimum: 1, maximum: 1000 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            profileCompleted: { type: 'boolean' },
            readyForPayment: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;
      const {
        gstin,
        // Company Profile
        legalCompanyName,
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
        firstDayOfWeek
      } = request.body;

      console.log('📝 Completing comprehensive profile for tenant:', userContext.tenantId);

      // Get current tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, userContext.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      // Check if profile has already been completed during upgrade
      let profileCompleted = false;

      console.log('🔍 Tenant status check:', {
        onboardingCompleted: tenant.onboardingCompleted,
        setupCompletionRate: tenant.setupCompletionRate,
        condition: !tenant.onboardingCompleted || tenant.setupCompletionRate < 100
      });

      if (!tenant.onboardingCompleted || tenant.setupCompletionRate < 100) {
        console.log('📝 Completing comprehensive profile...');

        // Prepare profile update data - only include defined values
        const profileUpdateData = {};

        // GSTIN is required for upgrade
        if (gstin) profileUpdateData.gstin = gstin;

        // Company Profile
        if (legalCompanyName || tenant.companyName) profileUpdateData.legalCompanyName = legalCompanyName || tenant.companyName;
        if (industry || tenant.industry) profileUpdateData.industry = industry || tenant.industry;
        if (companyType) profileUpdateData.companyType = companyType;
        if (ownership) profileUpdateData.ownership = ownership;
        if (annualRevenue) profileUpdateData.annualRevenue = parseFloat(annualRevenue);
        if (numberOfEmployees) profileUpdateData.numberOfEmployees = parseInt(numberOfEmployees);
        if (tickerSymbol) profileUpdateData.tickerSymbol = tickerSymbol;
        if (website) profileUpdateData.website = website;
        if (description) profileUpdateData.companyDescription = description;
        if (foundedDate) profileUpdateData.foundedDate = new Date(foundedDate);

        // Contact & Address
        if (billingStreet) profileUpdateData.billingStreet = billingStreet;
        if (billingCity) profileUpdateData.billingCity = billingCity;
        if (billingState) profileUpdateData.billingState = billingState;
        if (billingZip) profileUpdateData.billingZip = billingZip;
        if (billingCountry) profileUpdateData.billingCountry = billingCountry;
        if (shippingStreet) profileUpdateData.shippingStreet = shippingStreet;
        if (shippingCity) profileUpdateData.shippingCity = shippingCity;
        if (shippingState) profileUpdateData.shippingState = shippingState;
        if (shippingZip) profileUpdateData.shippingZip = shippingZip;
        if (shippingCountry) profileUpdateData.shippingCountry = shippingCountry;
        if (phone) profileUpdateData.phone = phone;
        if (fax) profileUpdateData.fax = fax;

        // Localization
        profileUpdateData.defaultLanguage = defaultLanguage || 'en';
        profileUpdateData.defaultLocale = defaultLocale || 'en-US';
        profileUpdateData.defaultCurrency = defaultCurrency || 'INR';
        profileUpdateData.multiCurrencyEnabled = multiCurrencyEnabled || false;
        profileUpdateData.advancedCurrencyManagement = advancedCurrencyManagement || false;
        profileUpdateData.defaultTimeZone = defaultTimeZone || 'Asia/Kolkata';
        profileUpdateData.firstDayOfWeek = firstDayOfWeek || 1;

        // Mark profile as completed
        profileUpdateData.onboardingCompleted = true;
        profileUpdateData.onboardingStep = 'completed';
        profileUpdateData.setupCompletionRate = 100;
        profileUpdateData.onboardedAt = new Date();

        console.log('🔧 Attempting to update tenant with data:', Object.keys(profileUpdateData));

        // Only update if we have data to update
        if (Object.keys(profileUpdateData).length > 0) {
          // Update tenant with comprehensive profile
          await db
            .update(tenants)
            .set(profileUpdateData)
            .where(eq(tenants.tenantId, userContext.tenantId));

          profileCompleted = true;
          console.log('✅ Comprehensive profile completed');
        } else {
          console.log('⚠️ No profile data to update');
          profileCompleted = false;
        }

        // Track profile onboarding completion only if profile was actually completed
        if (profileCompleted) {
          try {
            await OnboardingTrackingService.trackOnboardingPhase(
              userContext.tenantId,
              'profile',
              'completed',
              {
                userId: userContext.userId,
                sessionId: request.headers['x-session-id'] || null,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
                eventData: {
                  selectedPlan: request.body.selectedPlan,
                  fieldsCompleted: Object.keys(profileUpdateData).length,
                  hasBillingInfo: !!(billingStreet && billingCity),
                  hasCompanyInfo: !!(legalCompanyName && industry),
                  hasLocalization: !!(defaultLanguage && defaultCurrency)
                },
                metadata: {
                  source: 'complete_profile',
                  version: '1.0'
                },
                completionRate: 100,
                stepNumber: 3,
                totalSteps: 3
              }
            );
          } catch (trackingError) {
            console.warn('⚠️ Profile onboarding tracking failed, but profile completed:', trackingError.message);
          }
        }
      } else {
        console.log('ℹ️ Profile already completed previously');
        console.log('📋 Current tenant GSTIN:', tenant.gstin);

        // Still update GSTIN if not already set
        if (!tenant.gstin) {
          console.log('🔧 Updating GSTIN for existing profile...');
          await db
            .update(tenants)
            .set({ gstin: gstin })
            .where(eq(tenants.tenantId, userContext.tenantId));
          console.log('✅ GSTIN updated');
        } else {
          console.log('✅ GSTIN already set, skipping update');
        }
      }

      // Update organization metadata (GSTIN is stored in tenants table, not organizations)
      let organizationUpdateResult = [];
      try {
        organizationUpdateResult = await db
          .update(organizations)
          .set({
            updatedBy: userContext.userId,
            updatedAt: new Date()
          })
          .where(and(
            eq(organizations.tenantId, userContext.tenantId),
            eq(organizations.organizationType, 'parent')
          ))
          .returning();
        console.log('✅ Organization metadata updated');
      } catch (orgError) {
        console.warn('⚠️ Organization update failed (may not exist):', orgError.message);
        // This is not a critical error - organizations table might not have a record for this tenant yet
      }

      console.log('✅ Profile completion successful');

      return {
        success: true,
        message: profileCompleted
          ? 'Profile completed successfully. Ready for payment.'
          : 'Profile was already completed.',
        profileCompleted: profileCompleted,
        readyForPayment: true,
        organizationUpdated: !!organizationUpdateResult.length
      };

    } catch (error) {
      console.error('❌ Profile completion failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to complete profile',
        error: error.message
      });
    }
  });

  // Upgrade from trial to paid plan with comprehensive profile completion (legacy endpoint)
  fastify.post('/upgrade-plan', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['selectedPlan', 'gstin'],
        properties: {
          selectedPlan: { type: 'string', enum: ['starter', 'professional', 'enterprise'] },
          gstin: { type: 'string', minLength: 15, maxLength: 15 },
          maxUsers: { type: 'number', minimum: 1, maximum: 1000 },
          maxProjects: { type: 'number', minimum: 1, maximum: 1000 },

          // Company Profile
          legalCompanyName: { type: 'string' },
          industry: { type: 'string' },
          companyType: { type: 'string' },
          ownership: { type: 'string' },
          annualRevenue: { type: 'number' },
          numberOfEmployees: { type: 'number' },
          tickerSymbol: { type: 'string' },
          website: { type: 'string' },
          description: { type: 'string' },
          foundedDate: { type: 'string' },

          // Contact & Address
          billingStreet: { type: 'string' },
          billingCity: { type: 'string' },
          billingState: { type: 'string' },
          billingZip: { type: 'string' },
          billingCountry: { type: 'string' },
          shippingStreet: { type: 'string' },
          shippingCity: { type: 'string' },
          shippingState: { type: 'string' },
          shippingZip: { type: 'string' },
          shippingCountry: { type: 'string' },
          phone: { type: 'string' },
          fax: { type: 'string' },

          // Localization
          defaultLanguage: { type: 'string' },
          defaultLocale: { type: 'string' },
          defaultCurrency: { type: 'string' },
          multiCurrencyEnabled: { type: 'boolean' },
          advancedCurrencyManagement: { type: 'boolean' },
          defaultTimeZone: { type: 'string' },
          firstDayOfWeek: { type: 'number' },


        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            subscription: { type: 'object' },
            organizationUpdated: { type: 'boolean' },
            profileCompleted: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;
      const {
        selectedPlan,
        gstin,
        maxUsers,
        maxProjects,

        // Company Profile
        legalCompanyName,
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
        firstDayOfWeek
      } = request.body;

      console.log('💰 Processing payment upgrade:', {
        userId: userContext.userId,
        selectedPlan,
        gstin: gstin ? 'provided' : 'not provided'
      });

      // Get current tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, userContext.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      // Check if profile has already been completed during upgrade
      let profileCompleted = false;
      if (!tenant.onboardingCompleted || tenant.setupCompletionRate < 100) {
        console.log('📝 Completing comprehensive profile during upgrade...');

        // Prepare profile update data
        const profileUpdateData = {
          // GSTIN is required for upgrade
          gstin: gstin,

          // Company Profile
          legalCompanyName: legalCompanyName || tenant.companyName,
          industry: industry || tenant.industry,
          companyType: companyType,
          ownership: ownership,
          annualRevenue: annualRevenue ? parseFloat(annualRevenue) : null,
          numberOfEmployees: numberOfEmployees ? parseInt(numberOfEmployees) : null,
          tickerSymbol: tickerSymbol,
          website: website,
          companyDescription: description,
          foundedDate: foundedDate ? new Date(foundedDate) : null,

          // Contact & Address
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

          // Localization
          defaultLanguage: defaultLanguage || 'en',
          defaultLocale: defaultLocale || 'en-US',
          defaultCurrency: defaultCurrency || 'INR',
          multiCurrencyEnabled: multiCurrencyEnabled || false,
          advancedCurrencyManagement: advancedCurrencyManagement || false,
          defaultTimeZone: defaultTimeZone || 'Asia/Kolkata',
          firstDayOfWeek: firstDayOfWeek || 1,

          // Mark profile as completed
          onboardingCompleted: true,
          onboardingStep: 'completed',
          setupCompletionRate: 100,
          onboardedAt: new Date()
        };

        // Update tenant with comprehensive profile
        await db
          .update(tenants)
          .set(profileUpdateData)
          .where(eq(tenants.tenantId, userContext.tenantId));

        profileCompleted = true;
        console.log('✅ Comprehensive profile completed during upgrade');

        // Track profile onboarding completion
        try {
          await OnboardingTrackingService.trackOnboardingPhase(
            userContext.tenantId,
            'profile',
            'completed',
            {
              userId: userContext.userId,
              sessionId: request.headers['x-session-id'] || null,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
              eventData: {
                selectedPlan,
                fieldsCompleted: Object.keys(profileUpdateData).length,
                hasBillingInfo: !!(billingStreet && billingCity),
                hasCompanyInfo: !!(legalCompanyName && industry),
                hasLocalization: !!(defaultLanguage && defaultCurrency)
              },
              metadata: {
                source: 'payment_upgrade',
                version: '1.0'
              },
              completionRate: 100,
              stepNumber: 3,
              totalSteps: 3
            }
          );
        } catch (trackingError) {
          console.warn('⚠️ Profile onboarding tracking failed, but upgrade completed:', trackingError.message);
        }
      } else {
        console.log('ℹ️ Profile already completed previously, skipping profile completion');
        // Still update GSTIN if not already set
        if (!tenant.gstin) {
          await db
            .update(tenants)
            .set({ gstin: gstin })
            .where(eq(tenants.tenantId, userContext.tenantId));
        }
      }

      // Update organization metadata (GSTIN is stored in tenants table, not organizations)
      let organizationUpdateResult = [];
      try {
        organizationUpdateResult = await db
          .update(organizations)
          .set({
            updatedBy: userContext.userId,
            updatedAt: new Date()
          })
          .where(and(
            eq(organizations.tenantId, userContext.tenantId),
            eq(organizations.organizationType, 'parent')
          ))
          .returning();
        console.log('✅ Organization metadata updated');
      } catch (orgError) {
        console.warn('⚠️ Organization update failed (may not exist):', orgError.message);
        // This is not a critical error - organizations table might not have a record for this tenant yet
      }

      // Create new subscription for paid plan
      const subscriptionId = uuidv4();

      // Set plan limits based on selected plan
      const planLimits = {
        starter: {
          tools: ['crm', 'hr'],
          apiCalls: 25000,
          storage: 10000000000, // 10GB
          users: maxUsers || 10,
          roles: 5,
          projects: maxProjects || 25
        },
        professional: {
          tools: ['crm', 'hr', 'affiliate'],
          apiCalls: 50000,
          storage: 50000000000, // 50GB
          users: maxUsers || 25,
          roles: 10,
          projects: maxProjects || 100
        },
        enterprise: {
          tools: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'],
          apiCalls: 100000,
          storage: 100000000000, // 100GB
          users: maxUsers || 100,
          roles: 20,
          projects: maxProjects || 500
        }
      };

      const planConfig = planLimits[selectedPlan];
      const planPrices = {
        starter: 29,
        professional: 79,
        enterprise: 199
      };

      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          subscriptionId,
          tenantId: userContext.tenantId,
          plan: selectedPlan,
          status: 'active',
          subscribedTools: planConfig.tools,
          usageLimits: planConfig,
          monthlyPrice: planPrices[selectedPlan].toString(),
          yearlyPrice: (planPrices[selectedPlan] * 10).toString(), // 2 months free
          billingCycle: 'monthly',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          addOns: [],
          upgradedFromTrial: true,
          upgradeDate: new Date()
        })
        .returning();

      // Update tenant with upgrade information
      await db
        .update(tenants)
        .set({
          subscriptionStatus: 'active',
          planUpgradedAt: new Date(),
          upgradedPlan: selectedPlan,
          gstin: gstin,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, userContext.tenantId));

      // No team invites to send (removed as requested)

      // Track upgrade onboarding completion
      try {
        await OnboardingTrackingService.trackOnboardingPhase(
          userContext.tenantId,
          'upgrade',
          'completed',
          {
            userId: userContext.userId,
            sessionId: request.headers['x-session-id'] || null,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            eventData: {
              selectedPlan,
              subscriptionId,
              gstinUpdated: !!organizationUpdateResult.length,
              profileCompleted,
              teamEmailsCount: teamEmails?.length || 0,
              planLimits: planConfig
            },
            metadata: {
              source: 'payment_upgrade',
              version: '1.0'
            },
            completionRate: 100,
            stepNumber: 1,
            totalSteps: 1
          }
        );
      } catch (trackingError) {
        console.warn('⚠️ Upgrade onboarding tracking failed, but upgrade completed:', trackingError.message);
      }

      console.log('✅ Payment upgrade completed:', {
        subscriptionId,
        selectedPlan,
        gstinUpdated: !!organizationUpdateResult.length
      });

      return {
        success: true,
        message: `Successfully upgraded to ${selectedPlan} plan${profileCompleted ? ' with profile completion' : ''}`,
        subscription: {
          subscriptionId,
          plan: selectedPlan,
          status: 'active',
          tools: planConfig.tools,
          limits: planConfig
        },
        organizationUpdated: !!organizationUpdateResult.length,
        profileCompleted: profileCompleted
      };

    } catch (error) {
      console.error('❌ Payment upgrade failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to process payment upgrade',
        error: error.message
      });
    }
  });

  // Get upgrade options for current tenant
  fastify.get('/upgrade-options', {
    preHandler: [authenticateToken],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            currentPlan: { type: 'string' },
            availableUpgrades: { type: 'array' },
            organizationSetup: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;

      // Get current subscription
      const [currentSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, userContext.tenantId))
        .limit(1);

      // Get organization info
      const [organization] = await db
        .select({
          organizationId: organizations.organizationId,
          organizationName: organizations.organizationName,
          gstin: organizations.gstin
        })
        .from(organizations)
        .where(and(
          eq(organizations.tenantId, userContext.tenantId),
          eq(organizations.organizationType, 'parent')
        ))
        .limit(1);

      const availableUpgrades = [
        {
          plan: 'starter',
          name: 'Starter Plan',
          price: 29,
          features: ['CRM', 'HR Management', 'Up to 10 users', '25 projects', '10GB storage'],
          recommended: currentSubscription?.plan === 'trial'
        },
        {
          plan: 'professional',
          name: 'Professional Plan',
          price: 79,
          features: ['Everything in Starter', 'Affiliate Management', 'Up to 25 users', '100 projects', '50GB storage'],
          recommended: currentSubscription?.plan === 'starter'
        },
        {
          plan: 'enterprise',
          name: 'Enterprise Plan',
          price: 199,
          features: ['Everything in Professional', 'Accounting', 'Inventory', 'Up to 100 users', '500 projects', '100GB storage'],
          recommended: currentSubscription?.plan === 'professional'
        }
      ];

      return {
        success: true,
        currentPlan: currentSubscription?.plan || 'trial',
        availableUpgrades,
        organizationSetup: {
          hasGSTIN: !!organization?.gstin,
          organizationName: organization?.organizationName || 'Not set'
        }
      };

    } catch (error) {
      console.error('❌ Failed to get upgrade options:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get upgrade options'
      });
    }
  });
}
