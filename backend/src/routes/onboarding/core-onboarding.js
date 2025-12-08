/**
 * 🚀 **CLEAN ONBOARDING ROUTES**
 * Simplified routes using UnifiedOnboardingService
 * All redundant code removed - single source of truth
 */

import UnifiedOnboardingService from '../../services/unified-onboarding-service.js';


export default async function coreOnboardingRoutes(fastify, options) {

  // 🚀 **ENHANCED ONBOARDING ENDPOINT**
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

      // ✅ USE UNIFIED ONBOARDING SERVICE
      const result = await UnifiedOnboardingService.completeOnboardingWorkflow({
        type: 'enhanced',
        companyName,
        adminEmail,
        subdomain,
        initialCredits,
        selectedPlan: 'free'
      }, request);

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
          redirectUrl: result.redirectUrl,
          creditAllocated: result.creditAllocated,
          onboardingType: result.onboardingType
        }
      });

    } catch (error) {
      console.error('❌ Enhanced onboarding failed:', error);

      // Handle already onboarded users - this is a success case, just redirect
      if (error.name === 'AlreadyOnboardedError') {
        return reply.code(200).send({
          success: true,
          message: 'You have already completed onboarding',
          data: {
            alreadyOnboarded: true,
            redirectTo: error.redirectTo || '/dashboard',
            tenantId: error.tenantId
          }
        });
      }

      // Handle duplicate registration errors specifically
      if (error.name === 'DuplicateRegistrationError' && error.errors) {
        const duplicateError = error.errors[0];
        return reply.code(409).send({
          success: false,
          error: duplicateError.type || 'duplicate_email',
          message: duplicateError.message || 'This email is already associated with an organization',
          code: 'EMAIL_ALREADY_ASSOCIATED',
          redirectTo: '/dashboard'
        });
      }

      // Handle validation errors with clear messages
      if (error.message?.includes('already associated') || error.message?.includes('already registered')) {
        return reply.code(409).send({
          success: false,
          error: 'duplicate_email',
          message: error.message || 'This email is already associated with an organization',
          code: 'EMAIL_ALREADY_ASSOCIATED',
          redirectTo: '/dashboard'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Onboarding failed',
        message: error.message || 'An unexpected error occurred during onboarding',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // 🌟 **FRONTEND ONBOARDING ENDPOINT**
  fastify.post('/onboard-frontend', {
    schema: {
      body: {
        type: 'object',
        required: ['legalCompanyName', 'companySize', 'businessType', 'firstName', 'lastName', 'email'],
        properties: {
          // Company Information
          legalCompanyName: { type: 'string', minLength: 1, maxLength: 100 },
          companySize: { type: 'string', enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
          businessType: { type: 'string', minLength: 2 },

          // Personal Information
          firstName: { type: 'string', minLength: 2, maxLength: 50 },
          lastName: { type: 'string', minLength: 2, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          hasGstin: { type: 'boolean' },
          gstin: { type: 'string', pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$', minLength: 15, maxLength: 15 },

          // Preferences
          country: { type: 'string', minLength: 2 },
          timezone: { type: 'string', minLength: 2 },
          currency: { type: 'string', minLength: 3 },

          // Terms
          termsAccepted: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🚀 === FRONTEND ONBOARDING START ===');

      const {
        legalCompanyName,
        companySize,
        businessType,
        firstName,
        lastName,
        email,
        hasGstin = false,
        gstin,
        country,
        timezone,
        currency,
        termsAccepted
      } = request.body;

      // ✅ USE UNIFIED ONBOARDING SERVICE
      const result = await UnifiedOnboardingService.completeOnboardingWorkflow({
        type: 'frontend',
        companyName: legalCompanyName,
        adminEmail: email,
        companySize,
        businessType,
        firstName,
        lastName,
        hasGstin,
        gstin,
        country,
        timezone,
        currency,
        termsAccepted,
        selectedPlan: 'free',
        initialCredits: 1000
      }, request);

      console.log('🎉 === FRONTEND ONBOARDING COMPLETE ===');

      return reply.code(201).send({
        success: true,
        message: 'Organization onboarded successfully via frontend flow',
          data: {
          tenantId: result.tenant.tenantId,
          adminUserId: result.adminUser.userId,
          organizationId: result.organization.organizationId,
          adminRoleId: result.adminRole.roleId,
          subdomain: result.tenant.subdomain,
          redirectUrl: result.redirectUrl,
          creditAllocated: result.creditAllocated,
          onboardingType: result.onboardingType
        }
      });

    } catch (error) {
      console.error('❌ Frontend onboarding failed:', error);

      // Handle already onboarded users - this is a success case, just redirect
      if (error.name === 'AlreadyOnboardedError') {
        return reply.code(200).send({
          success: true,
          message: 'You have already completed onboarding',
          data: {
            alreadyOnboarded: true,
            redirectTo: error.redirectTo || '/dashboard',
            tenantId: error.tenantId
          }
        });
      }

      // Handle duplicate registration errors specifically
      if (error.name === 'DuplicateRegistrationError' && error.errors) {
        const duplicateError = error.errors[0];
        return reply.code(409).send({
          success: false,
          error: duplicateError.type || 'duplicate_email',
          message: duplicateError.message || 'This email is already associated with an organization',
          code: 'EMAIL_ALREADY_ASSOCIATED',
          redirectTo: '/dashboard'
        });
      }

      // Handle validation errors with clear messages
      if (error.message?.includes('already associated') || error.message?.includes('already registered')) {
        return reply.code(409).send({
          success: false,
          error: 'duplicate_email',
          message: error.message || 'This email is already associated with an organization',
          code: 'EMAIL_ALREADY_ASSOCIATED',
          redirectTo: '/dashboard'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Onboarding failed',
        message: error.message || 'An unexpected error occurred during onboarding',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // 📋 **LEGACY ONBOARDING ENDPOINT** (Keep for backward compatibility)
  fastify.post('/onboard', {
    schema: {
      body: {
        type: 'object',
        required: ['companyName', 'subdomain', 'adminEmail', 'adminName'],
        properties: {
          companyName: { type: 'string', minLength: 1, maxLength: 100 },
          subdomain: { type: 'string', minLength: 3, maxLength: 50 },
          adminEmail: { type: 'string', format: 'email' },
          adminName: { type: 'string', minLength: 2, maxLength: 100 },
          initialCredits: { type: 'number', minimum: 100, maximum: 10000, default: 1000 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('📋 === LEGACY ONBOARDING START ===');

      const { companyName, subdomain, adminEmail, adminName, initialCredits = 1000 } = request.body;

      // Parse admin name
      const nameParts = adminName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // ✅ USE UNIFIED ONBOARDING SERVICE
      const result = await UnifiedOnboardingService.completeOnboardingWorkflow({
        type: 'legacy',
        companyName,
        adminEmail,
        subdomain,
        firstName,
        lastName,
        initialCredits,
        selectedPlan: 'free'
      }, request);

      console.log('📋 === LEGACY ONBOARDING COMPLETE ===');

      return reply.code(201).send({
        success: true,
        message: 'Organization onboarded successfully via legacy endpoint',
        data: {
          tenantId: result.tenant.tenantId,
          adminUserId: result.adminUser.userId,
          organizationId: result.organization.organizationId,
          adminRoleId: result.adminRole.roleId,
          subdomain: result.tenant.subdomain,
          redirectUrl: result.redirectUrl,
          creditAllocated: result.creditAllocated,
          onboardingType: result.onboardingType
        }
      });

    } catch (error) {
      console.error('❌ Legacy onboarding failed:', error);

      // Handle already onboarded users - this is a success case, just redirect
      if (error.name === 'AlreadyOnboardedError') {
        return reply.code(200).send({
          success: true,
          message: 'You have already completed onboarding',
          data: {
            alreadyOnboarded: true,
            redirectTo: error.redirectTo || '/dashboard',
            tenantId: error.tenantId
          }
        });
      }

      // Handle duplicate registration errors specifically
      if (error.name === 'DuplicateRegistrationError' && error.errors) {
        const duplicateError = error.errors[0];
        return reply.code(409).send({
          success: false,
          error: duplicateError.type || 'duplicate_email',
          message: duplicateError.message || 'This email is already associated with an organization',
          code: 'EMAIL_ALREADY_ASSOCIATED',
          redirectTo: '/dashboard'
        });
      }

      // Handle validation errors with clear messages
      if (error.message?.includes('already associated') || error.message?.includes('already registered')) {
        return reply.code(409).send({
          success: false,
          error: 'duplicate_email',
          message: error.message || 'This email is already associated with an organization',
          code: 'EMAIL_ALREADY_ASSOCIATED',
          redirectTo: '/dashboard'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Onboarding failed',
        message: error.message || 'An unexpected error occurred during onboarding',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
}
