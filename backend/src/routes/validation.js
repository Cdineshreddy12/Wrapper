import OnboardingValidationService from '../services/onboarding-validation-service.js';

/**
 * General Validation Routes
 * Handles real-time validation endpoints used by forms
 */
export default async function validationRoutes(fastify, options) {

  // 🔍 **EMAIL UNIQUENESS VALIDATION ENDPOINT**
  fastify.get('/check-email', {
    schema: {
      querystring: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.query;

      console.log('🔍 Checking email availability:', email);

      // Use OnboardingValidationService to check for duplicates
      await OnboardingValidationService.checkForDuplicates({ adminEmail: email });

      // If no error thrown, email is available
      console.log('✅ Email is available:', email);
      return reply.code(200).send({ available: true });

    } catch (error) {
      console.log('❌ Email already taken:', email);
      return reply.code(409).send({ available: false, message: 'Email already registered' });
    }
  });

  // 🔍 **USERNAME AVAILABILITY VALIDATION ENDPOINT**
  fastify.get('/check-username', {
    schema: {
      querystring: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { username } = request.query;

      console.log('🔍 Checking username availability:', username);

      // For now, we'll consider all usernames available since we don't have username-based auth
      // In the future, if you implement username-based authentication, you can add actual checking here
      console.log('✅ Username is available:', username);
      return reply.code(200).send({ available: true });

    } catch (error) {
      console.log('❌ Username validation error:', username, error.message);
      return reply.code(500).send({ available: false, message: 'Error checking username availability' });
    }
  });
}
