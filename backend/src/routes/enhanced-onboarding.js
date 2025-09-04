import EnhancedOnboardingService from '../services/enhanced-onboarding-service.js';
import { db } from '../db/index.js';
import { tenants } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export default async function enhancedOnboardingRoutes(fastify, options) {

  // Enhanced quick onboarding with full setup
  fastify.post('/enhanced-quick-start', {
    schema: {
      body: {
        type: 'object',
        required: ['organizationName', 'gstin', 'mobile', 'adminEmail', 'adminName'],
        properties: {
          organizationName: {
            type: 'string',
            minLength: 2,
            maxLength: 255,
            description: 'Legal organization name'
          },
          gstin: {
            type: 'string',
            pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
            description: 'GSTIN number (15 digits)'
          },
          mobile: {
            type: 'string',
            pattern: '^[6-9]\\d{9}$',
            description: 'Mobile number (10 digits starting with 6-9)'
          },
          adminEmail: {
            type: 'string',
            format: 'email',
            description: 'Admin email address'
          },
          adminName: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            description: 'Admin full name'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                tenantId: { type: 'string' },
                userId: { type: 'string' },
                kindeOrgId: { type: 'string' },
                subdomain: { type: 'string' },
                trialEndsAt: { type: 'string' },
                freeCredits: { type: 'number' },
                onboardingStatus: { type: 'string' },
                nextStep: { type: 'string' },
                accessToken: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🚀 Starting enhanced quick onboarding...');

      const result = await EnhancedOnboardingService.createEnhancedOrganization(request.body);

      console.log('✅ Enhanced onboarding completed successfully');

      return reply.send(result);

    } catch (error) {
      console.error('❌ Enhanced onboarding failed:', error);

      // Handle specific error types
      if (error.message.includes('GSTIN')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid GSTIN',
          message: error.message
        });
      }

      if (error.message.includes('mobile')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid mobile number',
          message: error.message
        });
      }

      if (error.message.includes('email')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid email',
          message: error.message
        });
      }

      if (error.message.includes('already exists')) {
        return reply.code(409).send({
          success: false,
          error: 'Entity already exists',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Onboarding failed',
        message: 'An unexpected error occurred during onboarding'
      });
    }
  });

  // Get onboarding status
  fastify.get('/status/:tenantId', {
    schema: {
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                tenantId: { type: 'string' },
                onboardingStatus: { type: 'string' },
                completedSteps: { type: 'array' },
                completionRequired: { type: 'array' },
                trialStatus: { type: 'string' },
                trialEndsAt: { type: 'string' },
                daysRemaining: { type: 'number' },
                nextStep: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      const status = await EnhancedOnboardingService.getOnboardingStatus(tenantId);

      return reply.send({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('❌ Status check failed:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found',
          message: 'The specified organization does not exist'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Status check failed',
        message: 'Failed to retrieve onboarding status'
      });
    }
  });


}
