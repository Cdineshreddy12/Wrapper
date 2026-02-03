/**
 * 🚀 **CLEAN ONBOARDING ROUTES**
 * Simplified routes using UnifiedOnboardingService
 * Single source of truth - only /onboard-frontend endpoint
 */

import UnifiedOnboardingService from '../services/unified-onboarding-service.js';
import OnboardingValidationService from '../services/onboarding-validation-service.js';

export default async function coreOnboardingRoutes(fastify, options) {

  // ✅ STEP-BY-STEP VALIDATION ENDPOINT
  // Allows frontend to validate each step before proceeding to next step
  fastify.post('/onboard-frontend/validate-step', {
    schema: {
      body: {
        type: 'object',
        required: ['step', 'data'],
        properties: {
          step: { 
            type: 'number', 
            minimum: 1, 
            maximum: 5,
            description: 'Step number to validate (1-5)'
          },
          data: { 
            type: 'object',
            description: 'Form data for the current step'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { step, data } = request.body;
      
      console.log(`🔍 Validating onboarding step ${step}...`);

      const errors = [];
      let isValid = true;

      // Step 1: Company Information
      if (step === 1) {
        if (!data.legalCompanyName || data.legalCompanyName.trim().length === 0) {
          errors.push({ field: 'legalCompanyName', message: 'Company name is required' });
          isValid = false;
        }
        if (!data.companySize) {
          errors.push({ field: 'companySize', message: 'Company size is required' });
          isValid = false;
        }
        if (!data.businessType || data.businessType.trim().length === 0) {
          errors.push({ field: 'businessType', message: 'Business type is required' });
          isValid = false;
        }
      }

      // Step 2: Personal/Admin Information
      if (step === 2) {
        if (!data.firstName || data.firstName.trim().length === 0) {
          errors.push({ field: 'firstName', message: 'First name is required' });
          isValid = false;
        }
        if (!data.lastName || data.lastName.trim().length === 0) {
          errors.push({ field: 'lastName', message: 'Last name is required' });
          isValid = false;
        }
        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.push({ field: 'email', message: 'Valid email address is required' });
          isValid = false;
        } else {
          // Check for duplicate email
          try {
            const duplicateCheck = await OnboardingValidationService.checkForDuplicates({ adminEmail: data.email });
            if (!duplicateCheck.available) {
              if (duplicateCheck.alreadyOnboarded) {
                errors.push({ 
                  field: 'email', 
                  message: 'This email is already associated with an organization',
                  code: 'EMAIL_ALREADY_ONBOARDED',
                  redirectTo: '/dashboard'
                });
              } else {
                errors.push({ field: 'email', message: 'This email is already registered' });
              }
              isValid = false;
            }
          } catch (dupError) {
            errors.push({ field: 'email', message: dupError.message });
            isValid = false;
          }
        }

        // Validate PAN if provided (moved from Tax step)
        const panNumber = data.panNumber || data.taxRegistrationDetails?.pan;
        if (panNumber) {
          const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
          if (!panRegex.test(panNumber) || panNumber.length !== 10) {
            errors.push({ field: 'panNumber', message: 'PAN must be 10 characters in valid format' });
            isValid = false;
          } else {
            // Verify PAN if provided (don't block on API/auth failures - same as full onboarding)
            try {
              const VerificationService = (await import('../../../services/verification-service.js')).default;
              const panVerification = await VerificationService.verifyPAN(
                panNumber,
                data.legalCompanyName || data.companyName
              );
              
              if (!panVerification.verified) {
                const skipVerificationError = panVerification.configurationError ||
                  panVerification.retryable === false ||
                  panVerification.requiresWhitelist;
                if (!skipVerificationError) {
                  errors.push({
                    field: 'panNumber',
                    message: panVerification.error || 'PAN verification failed',
                    code: 'PAN_VERIFICATION_FAILED'
                  });
                  isValid = false;
                } else {
                  console.warn('⚠️ PAN verification skipped (API/config). Step validation allows proceed.');
                }
              }
            } catch (verifyError) {
              console.warn('PAN verification error (non-blocking):', verifyError?.message);
            }
          }
        }
      }

      // Step 3: Tax Information - GSTIN only (PAN moved to Admin step)
      if (step === 3) {
        if (data.hasGstin && data.gstin) {
          // Validate GSTIN format
          const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          if (!gstinRegex.test(data.gstin) || data.gstin.length !== 15) {
            errors.push({ field: 'gstin', message: 'GSTIN must be 15 characters in valid format' });
            isValid = false;
          } else {
            // Verify GSTIN if provided (don't block on API/auth failures - same as full onboarding)
            try {
              const VerificationService = (await import('../../../services/verification-service.js')).default;
              const gstinVerification = await VerificationService.verifyGSTIN(
                data.gstin, 
                data.legalCompanyName || data.companyName
              );
              
              if (!gstinVerification.verified) {
                const skipVerificationError = gstinVerification.configurationError ||
                  gstinVerification.retryable === false ||
                  gstinVerification.requiresWhitelist;
                if (!skipVerificationError) {
                  errors.push({
                    field: 'gstin',
                    message: gstinVerification.error || 'GSTIN verification failed',
                    code: 'GSTIN_VERIFICATION_FAILED'
                  });
                  isValid = false;
                } else {
                  console.warn('⚠️ GSTIN verification skipped (API/config). Step validation allows proceed.');
                }
              }
            } catch (verifyError) {
              console.warn('GSTIN verification error (non-blocking):', verifyError?.message);
            }
          }
        }
      }

      // Step 4: Preferences
      if (step === 4) {
        if (!data.country || data.country.trim().length === 0) {
          errors.push({ field: 'country', message: 'Country is required' });
          isValid = false;
        }
        if (!data.timezone || data.timezone.trim().length === 0) {
          errors.push({ field: 'timezone', message: 'Timezone is required' });
          isValid = false;
        }
        if (!data.currency || data.currency.trim().length === 0) {
          errors.push({ field: 'currency', message: 'Currency is required' });
          isValid = false;
        }
      }

      // Step 5: Terms & Review
      if (step === 5) {
        if (!data.termsAccepted) {
          errors.push({ field: 'termsAccepted', message: 'You must accept the terms and conditions' });
          isValid = false;
        }
      }

      if (!isValid) {
        return reply.code(400).send({
          success: false,
          valid: false,
          errors,
          message: errors.length === 1 
            ? errors[0].message 
            : `Please fix ${errors.length} validation errors`
        });
      }

      return reply.code(200).send({
        success: true,
        valid: true,
        message: `Step ${step} validation passed`
      });

    } catch (error) {
      console.error('❌ Step validation error:', error);
      return reply.code(500).send({
        success: false,
        valid: false,
        error: 'Validation failed',
        message: error.message || 'An error occurred during validation'
      });
    }
  });

  // 🌟 **FRONTEND ONBOARDING ENDPOINT** (Only active endpoint)
  fastify.post('/onboard-frontend', {
    preValidation: async (request, reply) => {
      // Clean up empty strings for optional fields - remove them entirely so they're not validated
      const body = request.body || {};
      const optionalFields = [
        'panNumber', 'gstin', 'einNumber', 'vatNumber', 'cinNumber',
        'companyType', 'website', 'adminEmail', 'adminMobile',
        'supportEmail', 'billingEmail', 'contactJobTitle', 'preferredContactMethod',
        'contactSalutation', 'contactMiddleName', 'contactDepartment', 'contactAuthorityLevel',
        'contactDirectPhone', 'contactMobilePhone', 'contactPreferredContactMethod',
        'state', 'billingStreet', 'billingCity', 'billingState', 'billingZip', 'billingCountry',
        'defaultLanguage', 'defaultLocale',
        'businessType', 'companySize' // optional so frontend can omit; backend will default
      ];
      
      optionalFields.forEach(field => {
        if (body[field] === '' || body[field] === null || body[field] === undefined) {
          delete body[field]; // Remove empty/null/undefined fields entirely
        }
      });
      
      // Clean taxRegistrationDetails object
      if (body.taxRegistrationDetails && typeof body.taxRegistrationDetails === 'object') {
        Object.keys(body.taxRegistrationDetails).forEach(key => {
          if (body.taxRegistrationDetails[key] === '' || 
              body.taxRegistrationDetails[key] === null || 
              body.taxRegistrationDetails[key] === undefined) {
            delete body.taxRegistrationDetails[key];
          }
        });
        // If taxRegistrationDetails is now empty, remove it
        if (Object.keys(body.taxRegistrationDetails).length === 0) {
          delete body.taxRegistrationDetails;
        }
      }
    },
    schema: {
      body: {
        type: 'object',
        required: ['legalCompanyName', 'firstName', 'lastName', 'email'],
        properties: {
          // Company Information
          legalCompanyName: { type: 'string', minLength: 1, maxLength: 100 },
          companyType: { type: 'string' },
          companySize: { type: 'string', enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
          businessType: { type: 'string', minLength: 1 },
          website: { type: 'string' },

          // Personal Information
          firstName: { type: 'string', minLength: 2, maxLength: 50 },
          lastName: { type: 'string', minLength: 2, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          adminEmail: { type: 'string', format: 'email' },
          adminMobile: { type: 'string' },
          supportEmail: { type: 'string', format: 'email' },
          billingEmail: { type: 'string', format: 'email' },
          
          // Contact Details
          contactJobTitle: { type: 'string' },
          preferredContactMethod: { type: 'string' },
          contactSalutation: { type: 'string', maxLength: 20 },
          contactMiddleName: { type: 'string', maxLength: 100 },
          contactDepartment: { type: 'string', maxLength: 100 },
          contactAuthorityLevel: { type: 'string', maxLength: 50 },
          contactDirectPhone: { type: 'string', maxLength: 50 },
          contactMobilePhone: { type: 'string', maxLength: 50 },
          contactPreferredContactMethod: { type: 'string', maxLength: 20 },

          // Tax & Compliance
          hasGstin: { type: 'boolean' },
          taxRegistered: { type: 'boolean' },
          vatGstRegistered: { type: 'boolean' },
          // Optional tax fields - only validate if present (empty strings removed in preValidation)
          gstin: { 
            type: 'string', 
            pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
            minLength: 15,
            maxLength: 15
          },
          panNumber: { 
            type: 'string', 
            pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
            minLength: 10,
            maxLength: 10
          },
          einNumber: { type: 'string' },
          vatNumber: { type: 'string' },
          cinNumber: { type: 'string' },
          taxRegistrationDetails: { 
            type: 'object',
            properties: {
              pan: { 
                type: 'string', 
                pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
                minLength: 10,
                maxLength: 10
              },
              gstin: { 
                type: 'string', 
                pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
                minLength: 15,
                maxLength: 15
              },
              country: { type: 'string' }
            }
          },

          // Address Information
          country: { type: 'string', minLength: 2 },
          state: { type: 'string' },
          billingStreet: { type: 'string' },
          billingCity: { type: 'string' },
          billingState: { type: 'string' },
          billingZip: { type: 'string' },
          billingCountry: { type: 'string' },

          // Preferences
          timezone: { type: 'string', minLength: 2 },
          currency: { type: 'string', minLength: 3 },
          defaultLanguage: { type: 'string' },
          defaultLocale: { type: 'string' },

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
        companyType,
        companySize: companySizeRaw,
        businessType,
        website,
        firstName,
        lastName,
        email,
        adminEmail,
        adminMobile,
        supportEmail,
        billingEmail,
        contactJobTitle,
        preferredContactMethod,
        contactSalutation,
        contactMiddleName,
        contactDepartment,
        contactAuthorityLevel,
        contactDirectPhone,
        contactMobilePhone,
        contactPreferredContactMethod,
        taxRegistered = false,
        vatGstRegistered = false,
        hasGstin = false,
        gstin,
        panNumber,
        einNumber,
        vatNumber,
        cinNumber,
        taxRegistrationDetails,
        country,
        state,
        billingStreet,
        billingCity,
        billingState,
        billingZip,
        billingCountry,
        timezone,
        currency,
        defaultLanguage,
        defaultLocale,
        termsAccepted
      } = request.body;

      const companySize = companySizeRaw && ['1-10', '11-50', '51-200', '201-1000', '1000+'].includes(companySizeRaw)
        ? companySizeRaw
        : '1-10';

      const businessTypeFinal = (businessType && String(businessType).trim()) || 'Other';

      // ✅ USE UNIFIED ONBOARDING SERVICE
      const result = await UnifiedOnboardingService.completeOnboardingWorkflow({
        type: 'frontend',
        companyName: legalCompanyName,
        adminEmail: adminEmail || email,
        companySize,
        businessType: businessTypeFinal,
        firstName,
        lastName,
        hasGstin,
        gstin,
        panNumber,
        taxRegistrationDetails: taxRegistrationDetails || (panNumber ? { pan: panNumber, country: country || 'IN' } : {}),
        country,
        timezone,
        currency,
        termsAccepted,
        // Additional fields from frontend
        companyType,
        industry: businessTypeFinal || null, // Use businessType for backward compatibility
        website,
        adminMobile,
        supportEmail,
        billingEmail,
        contactJobTitle,
        preferredContactMethod,
        // Primary contact details (for tenant dashboard settings)
        contactSalutation,
        contactMiddleName,
        contactDepartment,
        contactAuthorityLevel,
        contactDirectPhone,
        contactMobilePhone,
        contactPreferredContactMethod,
        taxRegistered,
        vatGstRegistered,
        state,
        billingStreet,
        billingCity,
        billingState,
        billingZip,
        billingCountry,
        defaultLanguage,
        defaultLocale,
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

      // Handle Fastify schema validation errors
      if (error.validation) {
        const validationErrors = error.validation.map(v => {
          const fieldName = v.instancePath?.replace('/', '') || v.params?.missingProperty || 'unknown';
          let message = v.message || 'Invalid value';
          
          // Make error messages more user-friendly
          if (v.keyword === 'required') {
            message = `${fieldName} is required`;
          } else if (v.keyword === 'minLength') {
            message = `${fieldName} must be at least ${v.params.limit} characters`;
          } else if (v.keyword === 'maxLength') {
            message = `${fieldName} must not exceed ${v.params.limit} characters`;
          } else if (v.keyword === 'format') {
            if (v.params.format === 'email') {
              message = `${fieldName} must be a valid email address`;
            } else {
              message = `${fieldName} format is invalid`;
            }
          } else if (v.keyword === 'enum') {
            message = `${fieldName} must be one of: ${v.params.allowedValues.join(', ')}`;
          } else if (v.keyword === 'pattern') {
            message = `${fieldName} format is invalid`;
          }
          
          return {
            field: fieldName,
            message: message,
            code: v.keyword?.toUpperCase() || 'VALIDATION_ERROR'
          };
        });

        return reply.code(400).send({
          success: false,
          error: 'Validation Error',
          message: validationErrors.length === 1 
            ? validationErrors[0].message 
            : `Please fix the following errors: ${validationErrors.map(e => e.message).join(', ')}`,
          errors: validationErrors,
          statusCode: 400
        });
      }

      // Handle validation errors from OnboardingValidationService
      if (error.name === 'ValidationError' && error.errors) {
        const validationErrors = Array.isArray(error.errors) ? error.errors.map(e => ({
          field: e.field || 'unknown',
          message: e.message || 'Validation failed',
          code: e.code || 'VALIDATION_ERROR'
        })) : [{
          field: 'unknown',
          message: error.message || 'Validation failed',
          code: 'VALIDATION_ERROR'
        }];

        // Check if any errors are verification-related
        const verificationErrors = validationErrors.filter(e => 
          e.code === 'PAN_VERIFICATION_FAILED' || 
          e.code === 'GSTIN_VERIFICATION_FAILED' || 
          e.code === 'GSTIN_NOT_ACTIVE'
        );

        return reply.code(400).send({
          success: false,
          error: verificationErrors.length > 0 ? 'Verification Error' : 'Validation Error',
          message: validationErrors.length === 1 
            ? validationErrors[0].message 
            : `Please fix the following errors: ${validationErrors.map(e => e.message).join(', ')}`,
          errors: validationErrors,
          statusCode: 400
        });
      }

      // Handle validation errors with message containing "Validation failed"
      if (error.message && error.message.includes('Validation failed') && error.errors) {
        const validationErrors = Array.isArray(error.errors) ? error.errors.map(e => ({
          field: e.field || 'unknown',
          message: e.message || 'Validation failed',
          code: 'VALIDATION_ERROR'
        })) : [{
          field: 'unknown',
          message: error.message,
          code: 'VALIDATION_ERROR'
        }];

        return reply.code(400).send({
          success: false,
          error: 'Validation Error',
          message: validationErrors.length === 1 
            ? validationErrors[0].message 
            : `Please fix the following errors: ${validationErrors.map(e => e.message).join(', ')}`,
          errors: validationErrors,
          statusCode: 400
        });
      }

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

      const isDbError = error.code === '23505' || error.code === '23503' || error.code === '23502';
      const userMessage = isDbError
        ? (error.code === '23505' ? 'This organization or subdomain may already exist. Try a different company name or contact support.' : 'A database constraint was not met. Please check your details and try again.')
        : (error.message || 'An unexpected error occurred during onboarding');

      return reply.code(500).send({
        success: false,
        error: 'Onboarding failed',
        message: userMessage,
        code: error.code || undefined,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        canRetry: true
      });
    }
  });

  // 📥 GET STORED ONBOARDING FORM DATA FOR RETRY
  fastify.get('/onboard-frontend/retry-data', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' }
        },
        required: ['email']
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.query;
      
      // Extract authentication to get kindeUserId
      const authHeader = request.headers.authorization;
      let kindeUserId = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const { kindeService } = await import('../../auth/index.js');
          const token = authHeader.substring(7);
          const user = await kindeService.validateToken(token);
          kindeUserId = user.kindeUserId || user.userId;
        } catch (authError) {
          console.warn('Could not validate token for retry data:', authError.message);
        }
      }

      if (!kindeUserId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
          message: 'Please authenticate to retrieve your saved form data'
        });
      }

      const UnifiedOnboardingService = (await import('../services/unified-onboarding-service.js')).default;
      const storedData = await UnifiedOnboardingService.getStoredOnboardingFormData(kindeUserId, email);

      if (!storedData) {
        return reply.code(404).send({
          success: false,
          error: 'No saved data found',
          message: 'No saved onboarding data found for this email'
        });
      }

      return reply.code(200).send({
        success: true,
        data: {
          formData: storedData.formData,
          stepData: storedData.stepData,
          currentStep: storedData.currentStep,
          flowType: storedData.flowType,
          lastSaved: storedData.lastSaved
        }
      });

    } catch (error) {
      console.error('❌ Error retrieving retry data:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve saved data',
        message: error.message || 'An error occurred while retrieving saved form data'
      });
    }
  });

  // 🔄 RETRY ONBOARDING WITH STORED DATA
  fastify.post('/onboard-frontend/retry', {
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          useStoredData: { type: 'boolean', default: true }
        },
        required: ['email']
      }
    }
  }, async (request, reply) => {
    try {
      const { email, useStoredData = true } = request.body;

      // Extract authentication
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
          message: 'Please authenticate to retry onboarding'
        });
      }

      const { kindeService } = await import('../../auth/index.js');
      const token = authHeader.substring(7);
      const user = await kindeService.validateToken(token);
      const kindeUserId = user.kindeUserId || user.userId;

      const UnifiedOnboardingService = (await import('../services/unified-onboarding-service.js')).default;

      // Get stored form data if requested
      let onboardingData = request.body.formData || {};
      if (useStoredData) {
        const storedData = await UnifiedOnboardingService.getStoredOnboardingFormData(kindeUserId, email);
        if (storedData && storedData.formData) {
          // Merge stored data with any new data provided
          onboardingData = {
            ...storedData.formData,
            ...onboardingData // New data overrides stored data
          };
        }
      }

      // Retry onboarding with the data
      const result = await UnifiedOnboardingService.completeOnboardingWorkflow(
        {
          ...onboardingData,
          type: onboardingData.type || 'frontend'
        },
        request
      );

      // Delete stored form data after successful retry
      if (useStoredData) {
        try {
          await UnifiedOnboardingService.deleteStoredOnboardingFormData(kindeUserId, email);
        } catch (deleteError) {
          console.warn('⚠️ Failed to delete stored form data (non-critical):', deleteError.message);
        }
      }

      return reply.code(201).send({
        success: true,
        message: 'Onboarding completed successfully via retry',
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
      console.error('❌ Retry onboarding failed:', error);

      // Handle validation errors
      if (error.name === 'ValidationError' && error.errors) {
        const validationErrors = Array.isArray(error.errors) ? error.errors.map(e => ({
          field: e.field || 'unknown',
          message: e.message || 'Validation failed',
          code: e.code || 'VALIDATION_ERROR'
        })) : [{
          field: 'unknown',
          message: error.message || 'Validation failed',
          code: 'VALIDATION_ERROR'
        }];

        return reply.code(400).send({
          success: false,
          error: 'Validation Error',
          message: validationErrors.length === 1 
            ? validationErrors[0].message 
            : `Please fix ${validationErrors.length} validation errors`,
          errors: validationErrors,
          statusCode: 400
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Retry failed',
        message: error.message || 'An unexpected error occurred during retry',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
}
