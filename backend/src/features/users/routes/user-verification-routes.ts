import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../../db/index.js';
import { tenants, tenantUsers } from '../../../db/schema/index.js';
import { eq } from 'drizzle-orm';

/**
 * User Verification Routes
 * Handles user tenant verification and other user-related operations
 */
export default async function userVerificationRoutes(
  fastify: FastifyInstance,
  _options?: Record<string, unknown>
): Promise<void> {
  fastify.get('/user/test', async (request: FastifyRequest, reply: FastifyReply) => {
    console.log('🎯 Test endpoint hit!');
    return {
      success: true,
      message: 'User verification routes are working',
      timestamp: new Date().toISOString()
    };
  });

  // ===============================
  // USER TENANT VERIFICATION ENDPOINT
  // ===============================

  // Verify user tenant access for CRM login
  fastify.get('/user/tenant/:email', {
    schema: {
      description: 'Verify if a user has tenant access and retrieve tenant information'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const { email } = params;
      const requestSource = request.headers['x-request-source'] as string | undefined;

      console.log(`🔍 User Tenant Verification - Email: ${email}, Request Source: ${requestSource}`);

      const allowedSources = ['crm-backend', 'operations-backend', 'operations-tenant-sync'];
      if (!requestSource || !allowedSources.includes(requestSource)) {
        console.log(`❌ Invalid request source: ${requestSource}`);
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized access - Invalid X-Request-Source header',
          statusCode: 401
        });
      }

      // Decode URL-encoded email
      const decodedEmail = decodeURIComponent(email);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(decodedEmail)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid email format',
          statusCode: 400
        });
      }

      console.log(`🔍 Verifying tenant access for user: ${decodedEmail}`);

      // Check if user exists in database
      let userTenantInfo;
      try {
        const results = await db
          .select({
            userId: tenantUsers.userId,
            userIsActive: tenantUsers.isActive,
            tenantId: tenantUsers.tenantId,
            tenantIsActive: tenants.isActive,
            entityId: tenantUsers.primaryOrganizationId
          })
          .from(tenantUsers)
          .leftJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
          .where(eq(tenantUsers.email, decodedEmail))
          .limit(1);

        userTenantInfo = results[0];
        console.log(`📊 User lookup result:`, userTenantInfo ? 'Found' : 'Not found');
      } catch (dbErr: unknown) {
        console.error('❌ Database query failed:', dbErr);
        return reply.code(500).send({
          success: false,
          error: 'Database error',
          statusCode: 500
        });
      }

      // User not found
      if (!userTenantInfo) {
        console.log(`❌ User not found: ${decodedEmail}`);
        return reply.code(404).send({
          success: false,
          error: 'User not found',
          statusCode: 404
        });
      }

      // User exists but is inactive
      if (!userTenantInfo.userIsActive) {
        console.log(`❌ User inactive: ${decodedEmail}`);
        return reply.code(404).send({
          success: false,
          error: 'User not found',
          statusCode: 404
        });
      }

      // User exists but has no tenant
      if (!userTenantInfo.tenantId) {
        console.log(`ℹ️ User has no tenant: ${decodedEmail}`);
        return {
          success: true,
          data: null,
          message: 'User has no tenant assigned'
        };
      }

      // Check if tenant is active
      if (!userTenantInfo.tenantIsActive) {
        console.log(`❌ Tenant inactive: ${decodedEmail} → ${userTenantInfo.tenantId}`);
        return reply.code(404).send({
          success: false,
          error: 'User not found',
          statusCode: 404
        });
      }

      console.log(`✅ User has active tenant access: ${decodedEmail} → ${userTenantInfo.tenantId}`);

      return {
        success: true,
        data: {
          tenantId: userTenantInfo.tenantId,
          tenantIsActive: userTenantInfo.tenantIsActive,
          userId: userTenantInfo.userId,
          userIsActive: userTenantInfo.userIsActive,
          entityId: userTenantInfo.entityId
        }
      };

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ User tenant verification error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      });
    }
  });
}
