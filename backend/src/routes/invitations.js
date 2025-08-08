import { db } from '../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import kindeService from '../services/kinde-service.js';

// Enhanced function to ensure user is in correct Kinde organization
async function ensureUserInCorrectOrganization(kindeUserId, email, targetOrgCode, maxRetries = 5) {
  console.log(`🔗 Starting organization assignment for user:`, {
    kindeUserId,
    email,
    targetOrgCode,
    maxRetries
  });

  try {
    // Step 1: Get user's current organizations
    console.log(`📋 Checking current organizations for user: ${kindeUserId}`);
    const userOrgs = await kindeService.getUserOrganizations(kindeUserId);
    console.log(`📋 User is currently in organizations:`, userOrgs.organizations?.map(org => ({
      code: org.code,
      name: org.name
    })) || []);

    // Step 2: Check if user is already in target organization
    const isAlreadyInTarget = userOrgs.organizations?.some(org => org.code === targetOrgCode);
    console.log(`🎯 Is user already in target organization ${targetOrgCode}:`, isAlreadyInTarget);

    // Step 3: If not in target organization, add them with retry logic
    if (!isAlreadyInTarget) {
      console.log(`🔄 Adding user to target organization: ${targetOrgCode}`);
      
      let lastError = null;
      let success = false;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Organization assignment attempt ${attempt}/${maxRetries}`);
          
          // Use the enhanced addUserToOrganization method with exclusive mode
          const result = await kindeService.addUserToOrganization(
            kindeUserId,
            targetOrgCode,
            { exclusive: true } // This ensures user is ONLY in the target organization
          );
          
          console.log(`✅ User successfully added to organization (attempt ${attempt}):`, {
            userId: result.userId,
            method: result.method,
            success: result.success
          });
          
          success = true;
          break;
          
        } catch (error) {
          console.log(`❌ Organization assignment attempt ${attempt} failed:`, error.message);
          lastError = error;
          
          // If it's the last attempt, don't wait
          if (attempt < maxRetries) {
            const waitTime = Math.min(attempt * 2000, 10000); // Exponential backoff, max 10 seconds
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      if (!success) {
        console.error('❌ Failed to add user to organization after all retries:', lastError?.message);
        return { 
          success: false, 
          error: lastError?.message || 'Unknown error',
          message: 'Failed to assign user to organization after multiple attempts',
          attempts: maxRetries
        };
      }
      
    } else {
      console.log('✅ User already in target organization');
      
      // Still run exclusive mode to ensure they're not in other organizations
      try {
        console.log('🧹 Cleaning up user from other organizations...');
        const result = await kindeService.addUserToOrganization(
          kindeUserId,
          targetOrgCode,
          { exclusive: true }
        );
        console.log('✅ Organization cleanup completed:', result.method);
      } catch (cleanupError) {
        console.warn('⚠️ Organization cleanup failed but user is in target org:', cleanupError.message);
      }
    }

    // Step 4: Verify final state
    console.log('🔍 Verifying final organization state...');
    try {
      const finalOrgs = await kindeService.getUserOrganizations(kindeUserId);
      const finalOrgCodes = finalOrgs.organizations?.map(org => org.code) || [];
      
      console.log('📊 Final organization state:', {
        totalOrganizations: finalOrgCodes.length,
        organizations: finalOrgCodes,
        isInTargetOrg: finalOrgCodes.includes(targetOrgCode),
        isInOnlyTargetOrg: finalOrgCodes.length === 1 && finalOrgCodes[0] === targetOrgCode
      });
      
      if (!finalOrgCodes.includes(targetOrgCode)) {
        return {
          success: false,
          error: 'User not found in target organization after assignment',
          message: 'Assignment appeared to succeed but verification failed'
        };
      }
      
    } catch (verifyError) {
      console.warn('⚠️ Could not verify final organization state:', verifyError.message);
    }

    return { 
      success: true, 
      message: 'User successfully assigned to organization',
      targetOrg: targetOrgCode
    };
    
  } catch (error) {
    console.error('❌ Error ensuring user in correct organization:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Organization assignment failed due to unexpected error' 
    };
  }
}

export default async function invitationRoutes(fastify, options) {
  
  // Get invitation details for acceptance page - PUBLIC ENDPOINT
  fastify.get('/details', async (request, reply) => {
    try {
      const { org, email } = request.query;
      
      if (!org || !email) {
        return reply.code(400).send({
          error: 'Missing required parameters',
          message: 'org and email parameters are required'
        });
      }

      console.log('🔍 Getting invitation details (public):', { org, email });
      console.log('🔍 Raw query params:', request.query);
      
      // Decode email in case it's URL encoded
      const decodedEmail = decodeURIComponent(email);
      console.log('🔍 Email comparison:', { 
        original: email, 
        decoded: decodedEmail,
        areDifferent: email !== decodedEmail 
      });

      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId,
          subdomain: tenants.subdomain,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          brandingConfig: tenants.brandingConfig
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, org))
        .limit(1);

      if (!tenant) {
        console.log('❌ Organization not found for org:', org);
        return reply.code(404).send({
          error: 'Organization not found'
        });
      }

      console.log('✅ Found organization:', {
        tenantId: tenant.tenantId,
        companyName: tenant.companyName,
        kindeOrgId: tenant.kindeOrgId
      });

      // Get invited user details
      const [invitedUser] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.email, decodedEmail),
          eq(tenantUsers.tenantId, tenant.tenantId)
        ))
        .limit(1);

      if (!invitedUser) {
        console.log('❌ Invitation not found for email:', decodedEmail);
        return reply.code(404).send({
          error: 'Invitation not found'
        });
      }

      if (invitedUser.isActive) {
        return reply.code(409).send({
          error: 'Invitation already accepted',
          message: 'This invitation has already been accepted'
        });
      }

      // Get inviter details
      const [inviter] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, invitedUser.invitedBy))
        .limit(1);

      // Get assigned roles (if any)
      const userRoles = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          description: customRoles.description
        })
        .from(userRoleAssignments)
        .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(userRoleAssignments.userId, invitedUser.userId));

      console.log('✅ Found invitation details');

      return {
        success: true,
        invitation: {
          email: invitedUser.email,
          name: invitedUser.name,
          organizationName: tenant.companyName,
          orgCode: tenant.kindeOrgId,
          inviterName: inviter?.name || 'Team Administrator',
          roles: userRoles.map(r => r.roleName).filter(Boolean),
          isActive: invitedUser.isActive,
          invitedAt: invitedUser.invitedAt,
          message: 'Welcome to our team!'
        }
      };
    } catch (error) {
      console.error('❌ Error getting invitation details:', error);
      return reply.code(500).send({
        error: 'Failed to get invitation details',
        message: error.message
      });
    }
  });

  // Accept invitation endpoint - PUBLIC ENDPOINT
  fastify.post('/accept', async (request, reply) => {
    try {
      const { org, email, kindeUserId } = request.body;
      
      if (!org || !email || !kindeUserId) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'org, email, and kindeUserId are required'
        });
      }

      console.log('✅ Accepting invitation (public):', { org, email, kindeUserId });

      // Get organization details for the INVITED organization (not user's current org)
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId,
          subdomain: tenants.subdomain,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          brandingConfig: tenants.brandingConfig
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, org))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found'
        });
      }

      // Get invited user details using the INVITED organization
      const [invitedUser] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.email, email),
          eq(tenantUsers.tenantId, tenant.tenantId)
        ))
        .limit(1);

      if (!invitedUser) {
        return reply.code(404).send({
          error: 'Invitation not found'
        });
      }

      if (invitedUser.isActive) {
        return reply.code(409).send({
          error: 'Invitation already accepted',
          message: 'This invitation has already been accepted'
        });
      }

      // CRITICAL: Ensure user is in the correct organization and removed from default ones
      console.log('🔗 Ensuring user is in correct Kinde organization...');
      const orgResult = await ensureUserInCorrectOrganization(
        kindeUserId,
        invitedUser.email,
        org // This is the org code from the invitation URL
      );
      
      if (orgResult.success) {
        console.log('✅ User organization assignment completed:', orgResult);
      } else {
        console.error('❌ Failed to ensure user organization assignment:', orgResult);
        // For invitation acceptance, we should fail if organization assignment fails
        return reply.code(500).send({
          error: 'Organization assignment failed',
          message: `Failed to add user to organization: ${orgResult.message}`,
          details: orgResult
        });
      }

      // Activate the invited user and link them to their kindeUserId
      // CRITICAL: Invited users should have onboardingCompleted=true (they skip onboarding)
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({
          kindeUserId: kindeUserId,
          isActive: true,
          onboardingCompleted: true, // ✅ INVITED USERS SKIP ONBOARDING
          invitationAcceptedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(tenantUsers.userId, invitedUser.userId))
        .returning();

      console.log('✅ Invitation accepted successfully (public) - User activated:', {
        userId: updatedUser.userId,
        email: updatedUser.email,
        tenantId: updatedUser.tenantId,
        kindeUserId: updatedUser.kindeUserId,
        invitedOrg: org,
        isActive: updatedUser.isActive,
        onboardingCompleted: updatedUser.onboardingCompleted, // Should be true
        isTenantAdmin: updatedUser.isTenantAdmin // Should be false for invited users
      });

      return {
        success: true,
        message: 'Invitation accepted successfully',
        user: {
          userId: updatedUser.userId,
          email: updatedUser.email,
          name: updatedUser.name,
          isActive: updatedUser.isActive,
          tenantId: updatedUser.tenantId,
          onboardingCompleted: updatedUser.onboardingCompleted,
          isTenantAdmin: updatedUser.isTenantAdmin
        }
      };
    } catch (error) {
      console.error('❌ Error accepting invitation (public):', error);
      return reply.code(500).send({
        error: 'Failed to accept invitation',
        message: error.message
      });
    }
  });

  // Debug endpoint to troubleshoot invitation issues
  fastify.get('/debug/:org/:email', async (request, reply) => {
    try {
      const { org, email } = request.params;
      const decodedEmail = decodeURIComponent(email);
      
      console.log('🔍 Debug invitation lookup:', { org, email, decodedEmail });
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId,
          subdomain: tenants.subdomain,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          brandingConfig: tenants.brandingConfig
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, org))
        .limit(1);

      if (!tenant) {
        return reply.send({
          error: 'Organization not found',
          org,
          searched: 'tenants.kindeOrgId'
        });
      }

      // Get all users in organization
      const allUsers = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenant.tenantId));

      // Find exact matches
      const exactMatches = allUsers.filter(u => u.email === decodedEmail);
      const originalMatches = allUsers.filter(u => u.email === email);

      return reply.send({
        success: true,
        debug: {
          organization: {
            found: true,
            tenantId: tenant.tenantId,
            companyName: tenant.companyName,
            kindeOrgId: tenant.kindeOrgId
          },
          email: {
            original: email,
            decoded: decodedEmail,
            isDifferent: email !== decodedEmail
          },
          users: {
            totalInOrg: allUsers.length,
            exactMatches: exactMatches.length,
            originalMatches: originalMatches.length,
            exactMatchUsers: exactMatches.map(u => ({
              userId: u.userId,
              email: u.email,
              isActive: u.isActive,
              invitedAt: u.invitedAt
            })),
            originalMatchUsers: originalMatches.map(u => ({
              userId: u.userId,
              email: u.email,
              isActive: u.isActive,
              invitedAt: u.invitedAt
            })),
            allEmails: allUsers.map(u => u.email)
          }
        }
      });
    } catch (error) {
      console.error('❌ Debug invitation error:', error);
      return reply.send({
        error: 'Debug failed',
        message: error.message
      });
    }
  });

  // Get invitation details by token - PUBLIC ENDPOINT
  fastify.get('/details-by-token', async (request, reply) => {
    try {
      const { token } = request.query;
      
      if (!token) {
        return reply.code(400).send({
          error: 'Missing required parameter',
          message: 'token parameter is required'
        });
      }

      console.log('🔍 Getting invitation details by token:', { token });

      // Find user by invitation token
      const [invitedUser] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.invitationToken, token))
        .limit(1);

      if (!invitedUser) {
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      if (invitedUser.invitationExpiresAt && new Date() > new Date(invitedUser.invitationExpiresAt)) {
        return reply.code(410).send({
          error: 'Invitation expired',
          message: 'This invitation has expired'
        });
      }

      if (invitedUser.isActive) {
        return reply.code(409).send({
          error: 'Invitation already accepted',
          message: 'This invitation has already been accepted'
        });
      }

      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId,
          subdomain: tenants.subdomain,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          brandingConfig: tenants.brandingConfig
        })
        .from(tenants)
        .where(eq(tenants.tenantId, invitedUser.tenantId))
        .limit(1);

      if (!tenant) {
        console.log('❌ Organization not found for tenant:', invitedUser.tenantId);
        return reply.code(404).send({
          error: 'Organization not found'
        });
      }

      // Get inviter details
      const [inviter] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, invitedUser.invitedBy))
        .limit(1);

      // Get assigned roles (if any)
      const userRoles = await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          description: customRoles.description
        })
        .from(userRoleAssignments)
        .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(userRoleAssignments.userId, invitedUser.userId));

      console.log('✅ Found invitation details by token');

      return {
        success: true,
        invitation: {
          email: invitedUser.email,
          name: invitedUser.name,
          organizationName: tenant.companyName,
          orgCode: tenant.kindeOrgId,
          inviterName: inviter?.name || 'Team Administrator',
          roles: userRoles.map(r => r.roleName).filter(Boolean),
          isActive: invitedUser.isActive,
          invitedAt: invitedUser.invitedAt,
          message: 'Welcome to our team!',
          token: token
        }
      };
    } catch (error) {
      console.error('❌ Error getting invitation details by token:', error);
      return reply.code(500).send({
        error: 'Failed to get invitation details',
        message: error.message
      });
    }
  });

  // Accept invitation by token - PUBLIC ENDPOINT
  fastify.post('/accept-by-token', async (request, reply) => {
    try {
      const { token, kindeUserId } = request.body;
      
      if (!token || !kindeUserId) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'token and kindeUserId are required'
        });
      }

      console.log('✅ Accepting invitation by token:', { token, kindeUserId });

      // Find user by invitation token
      const [invitedUser] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.invitationToken, token))
        .limit(1);

      if (!invitedUser) {
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      if (invitedUser.invitationExpiresAt && new Date() > new Date(invitedUser.invitationExpiresAt)) {
        return reply.code(410).send({
          error: 'Invitation expired',
          message: 'This invitation has expired'
        });
      }

      if (invitedUser.isActive) {
        return reply.code(409).send({
          error: 'Invitation already accepted',
          message: 'This invitation has already been accepted'
        });
      }

      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, invitedUser.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found'
        });
      }

      // CRITICAL: Ensure user is in the correct organization and removed from default ones
      console.log('🔗 Ensuring user is in correct Kinde organization for token-based invitation...');
      const orgResult = await ensureUserInCorrectOrganization(
        kindeUserId,
        invitedUser.email,
        tenant.kindeOrgId // Use the organization's Kinde org ID
      );
      
      if (orgResult.success) {
        console.log('✅ User organization assignment completed:', orgResult);
      } else {
        console.error('❌ Failed to ensure user organization assignment:', orgResult);
        // For invitation acceptance, we should fail if organization assignment fails
        return reply.code(500).send({
          error: 'Organization assignment failed',
          message: `Failed to add user to organization: ${orgResult.message}`,
          details: orgResult
        });
      }

      // Activate the invited user and link them to their kindeUserId
      // CRITICAL: Invited users should have onboardingCompleted=true (they skip onboarding)
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({
          kindeUserId: kindeUserId,
          isActive: true,
          onboardingCompleted: true, // ✅ INVITED USERS SKIP ONBOARDING
          invitationAcceptedAt: new Date(),
          invitationToken: null, // Clear the token
          updatedAt: new Date()
        })
        .where(eq(tenantUsers.userId, invitedUser.userId))
        .returning();

      console.log('✅ Invitation accepted successfully by token:', {
        userId: updatedUser.userId,
        email: updatedUser.email,
        tenantId: updatedUser.tenantId,
        organizationName: tenant.companyName,
        kindeOrgId: tenant.kindeOrgId,
        kindeUserId: updatedUser.kindeUserId,
        isActive: updatedUser.isActive,
        onboardingCompleted: updatedUser.onboardingCompleted, // Should be true
        isTenantAdmin: updatedUser.isTenantAdmin // Should be false for invited users
      });

      return {
        success: true,
        message: 'Invitation accepted successfully',
        user: {
          userId: updatedUser.userId,
          email: updatedUser.email,
          name: updatedUser.name,
          isActive: updatedUser.isActive,
          tenantId: updatedUser.tenantId,
          organizationName: tenant.companyName,
          onboardingCompleted: updatedUser.onboardingCompleted,
          isTenantAdmin: updatedUser.isTenantAdmin
        }
      };
    } catch (error) {
      console.error('❌ Error accepting invitation by token:', error);
      return reply.code(500).send({
        error: 'Failed to accept invitation',
        message: error.message
      });
    }
  });
} 