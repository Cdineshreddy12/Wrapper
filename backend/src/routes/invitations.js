import { db } from '../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, tenantInvitations } from '../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import kindeService from '../services/kinde-service.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';

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
          
          console.log(`✅ User assignment result (attempt ${attempt}):`, {
            userId: result.userId,
            method: result.method,
            success: result.success,
            message: result.message,
            error: result.error
          });
          
          // Check if the assignment was successful
          if (result.success && result.userId) {
            // Wait a moment for the assignment to propagate
            console.log(`⏳ Waiting for assignment to propagate...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify the assignment immediately
            const verifyResult = await kindeService.getUserOrganizations(kindeUserId);
            const isNowInTarget = verifyResult.organizations?.some(org => org.code === targetOrgCode);
            
            console.log(`🔍 Immediate verification result:`, {
              isNowInTarget,
              totalOrgs: verifyResult.organizations?.length || 0,
              orgCodes: verifyResult.organizations?.map(org => org.code) || []
            });
            
            if (isNowInTarget) {
              success = true;
              console.log(`✅ Assignment verified successfully on attempt ${attempt}`);
              break;
            } else {
              console.warn(`⚠️ Assignment reported success but verification failed on attempt ${attempt}`);
              lastError = new Error(`Assignment verification failed on attempt ${attempt}`);
            }
          } else {
            console.warn(`⚠️ User assignment reported failure on attempt ${attempt}:`, result.error || result.message);
            lastError = new Error(result.error || result.message || 'Unknown assignment error');
          }
          
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
          attempts: maxRetries,
          lastError: lastError?.message
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

    // Step 4: Final verification with multiple attempts
    console.log('🔍 Performing final organization state verification...');
    let finalVerificationSuccess = false;
    let verificationAttempts = 0;
    const maxVerificationAttempts = 3;
    
    while (!finalVerificationSuccess && verificationAttempts < maxVerificationAttempts) {
      try {
        verificationAttempts++;
        console.log(`🔍 Final verification attempt ${verificationAttempts}/${maxVerificationAttempts}`);
        
        const finalOrgs = await kindeService.getUserOrganizations(kindeUserId);
        const finalOrgCodes = finalOrgs.organizations?.map(org => org.code) || [];
        
        console.log('📊 Final organization state:', {
          totalOrganizations: finalOrgCodes.length,
          organizations: finalOrgCodes,
          isInTargetOrg: finalOrgCodes.includes(targetOrgCode),
          isInOnlyTargetOrg: finalOrgCodes.length === 1 && finalOrgCodes[0] === targetOrgCode
        });
        
        if (finalOrgCodes.includes(targetOrgCode)) {
          finalVerificationSuccess = true;
          console.log('✅ Final verification successful');
        } else {
          console.warn(`⚠️ Final verification attempt ${verificationAttempts} failed - user not in target org`);
          if (verificationAttempts < maxVerificationAttempts) {
            console.log(`⏳ Waiting before next verification attempt...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
        
      } catch (verifyError) {
        console.warn(`⚠️ Final verification attempt ${verificationAttempts} error:`, verifyError.message);
        if (verificationAttempts < maxVerificationAttempts) {
          console.log(`⏳ Waiting before next verification attempt...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    if (!finalVerificationSuccess) {
      return {
        success: false,
        error: 'User not found in target organization after assignment',
        message: 'Assignment appeared to succeed but verification failed after multiple attempts',
        verificationAttempts,
        targetOrgCode
      };
    }

    return { 
      success: true, 
      message: 'User successfully assigned to organization',
      targetOrg: targetOrgCode,
      verificationAttempts
    };
    
  } catch (error) {
    console.error('❌ Error ensuring user in correct organization:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Organization assignment failed due to unexpected error',
      stack: error.stack
    };
  }
}

// Helper function to generate proper invitation URLs
function generateInvitationUrl(invitationToken, request) {
  // Priority 1: Use INVITATION_BASE_URL if set (for production)
  let baseUrl = process.env.INVITATION_BASE_URL;
  
  // Priority 2: Use FRONTEND_URL if INVITATION_BASE_URL not set
  if (!baseUrl) {
    baseUrl = process.env.FRONTEND_URL;
  }
  
  // Priority 3: Use request origin if environment variables are localhost
  if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    // Get the origin from the request headers
    const origin = request.headers.origin || request.headers.referer;
    if (origin) {
      // Extract the base URL from origin (remove path and query)
      const url = new URL(origin);
      baseUrl = `${url.protocol}//${url.host}`;
      console.log('🔗 Using request origin for invitation URL:', baseUrl);
    } else {
      // Priority 4: Use a sensible default based on environment
      if (process.env.NODE_ENV === 'production') {
        baseUrl = 'https://yourdomain.com'; // Replace with your actual domain
        console.log('⚠️ No origin found, using production default:', baseUrl);
      } else {
        baseUrl = 'http://localhost:3001';
        console.log('⚠️ No origin found, using localhost default:', baseUrl);
      }
    }
  }
  
  // Generate the full invitation URL
  const invitationUrl = `${baseUrl}/invite/accept?token=${invitationToken}`;
  console.log('🔗 Generated invitation URL:', invitationUrl);
  
  return invitationUrl;
}

export default async function invitationRoutes(fastify, options) {
  
  // Debug endpoint to test invitation URL generation
  fastify.get('/debug/url-generation', async (request, reply) => {
    try {
      const testToken = 'test-token-123';
      const generatedUrl = generateInvitationUrl(testToken, request);
      
      return {
        success: true,
        debug: {
          env: {
            INVITATION_BASE_URL: process.env.INVITATION_BASE_URL,
            FRONTEND_URL: process.env.FRONTEND_URL,
            NODE_ENV: process.env.NODE_ENV
          },
          request: {
            origin: request.headers.origin,
            referer: request.headers.referer,
            host: request.headers.host
          },
          generatedUrl,
          functionCalled: true
        }
      };
    } catch (error) {
      console.error('❌ Error in debug endpoint:', error);
      return reply.code(500).send({
        error: 'Debug endpoint failed',
        message: error.message
      });
    }
  });

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
          error: 'Invitation not found',
          message: 'No invitation found for this email address'
        });
      }

      // Check if user is already active
      if (invitedUser.isActive) {
        return reply.code(409).send({
          error: 'Invitation already accepted',
          message: 'This invitation has already been accepted'
        });
      }

      // Get inviter details
      const [inviter] = await db
        .select({
          name: tenantUsers.name,
          email: tenantUsers.email
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, invitedUser.invitedBy))
        .limit(1);

      // Get user's assigned roles
      const userRoles = await db
        .select({
          roleName: customRoles.roleName
        })
        .from(userRoleAssignments)
        .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(userRoleAssignments.userId, invitedUser.userId));

      return {
        success: true,
        invitation: {
          email: invitedUser.email,
          organizationName: tenant.companyName,
          inviterName: inviter?.name || 'Team Member',
          roles: userRoles.map(r => r.roleName),
          orgCode: tenant.kindeOrgId
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

  // Accept invitation (public endpoint)
  fastify.post('/accept', async (request, reply) => {
    try {
      const { token } = request.body;
      
      if (!token) {
        return reply.code(400).send({
          error: 'Missing required field',
          message: 'token is required'
        });
      }

      console.log('🔓 Accepting invitation with token:', token);

      // Find invitation by token
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.invitationToken, token),
          eq(tenantInvitations.status, 'pending')
        ))
        .limit(1);

      if (!invitation) {
        console.log('❌ Invitation not found for token:', token);
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
        console.log('❌ Invitation expired for token:', token);
        return reply.code(410).send({
          error: 'Invitation expired',
          message: 'This invitation has expired'
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
        .where(eq(tenants.tenantId, invitation.tenantId))
        .limit(1);

      if (!tenant) {
        console.log('❌ Organization not found for tenant:', invitation.tenantId);
        return reply.code(404).send({
          error: 'Organization not found'
        });
      }

      // Get role details
      let roleName = 'Team Member';
      if (invitation.roleId) {
        const [role] = await db
          .select()
          .from(customRoles)
          .where(eq(customRoles.roleId, invitation.roleId))
          .limit(1);
        if (role) {
          roleName = role.roleName;
        }
      }

      // Get inviter details
      const [inviter] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, invitation.invitedBy))
        .limit(1);

      console.log('✅ Found invitation details:', {
        invitationId: invitation.invitationId,
        email: invitation.email,
        tenantId: invitation.tenantId,
        companyName: tenant.companyName,
        roleName: roleName
      });

      return {
        success: true,
        invitation: {
          email: invitation.email,
          name: invitation.email.split('@')[0],
          organizationName: tenant.companyName,
          orgCode: tenant.kindeOrgId,
          invitationToken: invitation.invitationToken,
          invitationUrl: invitation.invitationUrl,
          expiresAt: invitation.expiresAt,
          status: invitation.status,
          roleName: roleName,
          inviterName: inviter?.name || 'Team Administrator',
          tenantId: invitation.tenantId,
          invitationId: invitation.invitationId
        }
      };
    } catch (error) {
      console.error('❌ Error getting invitation details:', error);
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to get invitation details'
      });
    }
  });

  // Admin endpoint to get all invitations for an organization
  fastify.get('/admin/:orgCode', async (request, reply) => {
    try {
      const { orgCode } = request.params;
      
      console.log('🔍 Admin getting invitations for organization:', orgCode);
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: `No organization found with orgCode: ${orgCode}`
        });
      }

      // Get all invitations for this organization
      const invitations = await db
        .select({
          invitation: tenantInvitations,
          role: customRoles,
          inviter: tenantUsers
        })
        .from(tenantInvitations)
        .leftJoin(customRoles, eq(tenantInvitations.roleId, customRoles.roleId))
        .leftJoin(tenantUsers, eq(tenantInvitations.invitedBy, tenantUsers.userId))
        .where(eq(tenantInvitations.tenantId, tenant.tenantId))
        .orderBy(desc(tenantInvitations.createdAt));

      // Format invitations with invitation URLs
      const formattedInvitations = invitations.map(({ invitation, role, inviter }) => {
        const invitationUrl = generateInvitationUrl(invitation.invitationToken, request);
        
        return {
          invitationId: invitation.invitationId,
          email: invitation.email,
          roleName: role?.roleName || 'No role assigned',
          status: invitation.status,
          invitedBy: inviter?.name || 'Unknown',
          invitedAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
          acceptedAt: invitation.acceptedAt,
          invitationUrl: invitationUrl,
          isExpired: invitation.expiresAt < new Date(),
          daysUntilExpiry: Math.ceil((new Date(invitation.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        };
      });

      console.log(`✅ Found ${formattedInvitations.length} invitations for organization ${tenant.companyName}`);

      return {
        success: true,
        organization: {
          tenantId: tenant.tenantId,
          companyName: tenant.companyName,
          kindeOrgId: tenant.kindeOrgId
        },
        invitations: formattedInvitations,
        summary: {
          total: formattedInvitations.length,
          pending: formattedInvitations.filter(inv => inv.status === 'pending' && !inv.isExpired).length,
          accepted: formattedInvitations.filter(inv => inv.status === 'accepted').length,
          expired: formattedInvitations.filter(inv => inv.isExpired).length
        }
      };
    } catch (error) {
      console.error('❌ Error getting admin invitations:', error);
      return reply.code(500).send({
        error: 'Failed to get invitations',
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Admin endpoint to resend invitation email
  fastify.post('/admin/:orgCode/:invitationId/resend', async (request, reply) => {
    try {
      const { orgCode, invitationId } = request.params;
      
      console.log('📧 Admin resending invitation:', { orgCode, invitationId });
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: `No organization found with orgCode: ${orgCode}`
        });
      }

      // Get invitation details
      const [invitation] = await db
        .select({
          invitation: tenantInvitations,
          role: customRoles,
          inviter: tenantUsers
        })
        .from(tenantInvitations)
        .leftJoin(customRoles, eq(tenantInvitations.roleId, customRoles.roleId))
        .leftJoin(tenantUsers, eq(tenantInvitations.invitedBy, tenantUsers.userId))
        .where(and(
          eq(tenantInvitations.invitationId, invitationId),
          eq(tenantInvitations.tenantId, tenant.tenantId)
        ))
        .limit(1);

      if (!invitation) {
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invitation not found in this organization'
        });
      }

      if (invitation.invitation.status === 'accepted') {
        return reply.code(400).send({
          error: 'Invitation already accepted',
          message: 'Cannot resend an accepted invitation'
        });
      }

      if (invitation.invitation.expiresAt < new Date()) {
        return reply.code(400).send({
          error: 'Invitation expired',
          message: 'Cannot resend an expired invitation'
        });
      }

      // Resend invitation email
      try {
        // Import EmailService dynamically to avoid circular dependencies
        const { EmailService } = await import('../utils/email.js');
        
        await EmailService.sendUserInvitation({
          email: invitation.invitation.email,
          tenantName: tenant.companyName,
          roleName: invitation.role?.roleName || 'Member',
          invitationToken: invitation.invitation.invitationToken,
          invitedByName: invitation.inviter?.name || 'Team Administrator',
          message: 'Your invitation has been resent by an administrator.'
        });
        
        console.log(`✅ Invitation email resent successfully to ${invitation.invitation.email}`);
        
        return {
          success: true,
          message: 'Invitation email resent successfully',
          email: invitation.invitation.email
        };
      } catch (emailError) {
        console.error(`❌ Failed to resend invitation email to ${invitation.invitation.email}:`, emailError.message);
        
        return reply.code(500).send({
          error: 'Failed to resend invitation email',
          message: emailError.message,
          invitationUrl: generateInvitationUrl(invitation.invitation.invitationToken, request)
        });
      }
    } catch (error) {
      console.error('❌ Error resending invitation:', error);
      return reply.code(500).send({
        error: 'Failed to resend invitation',
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Admin endpoint to cancel invitation
  fastify.delete('/admin/:orgCode/:invitationId', async (request, reply) => {
    try {
      const { orgCode, invitationId } = request.params;
      
      console.log('❌ Admin canceling invitation:', { orgCode, invitationId });
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: `No organization found with orgCode: ${orgCode}`
        });
      }

      // Cancel invitation
      const [updatedInvitation] = await db
        .update(tenantInvitations)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(and(
          eq(tenantInvitations.invitationId, invitationId),
          eq(tenantInvitations.tenantId, tenant.tenantId)
        ))
        .returning();

      if (!updatedInvitation) {
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invitation not found in this organization'
        });
      }

      console.log(`✅ Invitation ${invitationId} cancelled successfully`);

      return {
        success: true,
        message: 'Invitation cancelled successfully',
        invitation: {
          invitationId: updatedInvitation.invitationId,
          email: updatedInvitation.email,
          status: updatedInvitation.status
        }
      };
    } catch (error) {
      console.error('❌ Error cancelling invitation:', error);
      return reply.code(500).send({
        error: 'Failed to cancel invitation',
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Create test invitation for testing purposes
  fastify.post('/create-test-invitation', async (request, reply) => {
    try {
      const { orgCode, email, roleName = 'Member' } = request.body;
      
      if (!orgCode || !email) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'orgCode and email are required'
        });
      }
      
      console.log('🧪 Creating test invitation...', { orgCode, email, roleName });
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: `No organization found with orgCode: ${orgCode}`
        });
      }

      // Get a user to be the inviter (use the first admin user)
      const [inviter] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenant.tenantId),
          eq(tenantUsers.isTenantAdmin, true)
        ))
        .limit(1);

      if (!inviter) {
        return reply.code(404).send({
          error: 'No admin user found',
          message: 'Cannot create invitation without an admin user in the organization'
        });
      }

      // Get or create a default role
      let [role] = await db
        .select()
        .from(customRoles)
        .where(and(
          eq(customRoles.tenantId, tenant.tenantId),
          eq(customRoles.roleName, roleName)
        ))
        .limit(1);

      if (!role) {
        // Create a default role if it doesn't exist
        const [newRole] = await db.insert(customRoles).values({
          tenantId: tenant.tenantId,
          roleName: roleName,
          description: `Default ${roleName} role`,
          permissions: { read: true, write: false, admin: false },
          restrictions: {},
          isSystemRole: false,
          isDefault: false,
          priority: 50
        }).returning();
        role = newRole;
      }

      // Check if invitation already exists
      const [existingInvitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenant.tenantId),
          eq(tenantInvitations.email, email)
        ))
        .limit(1);

      if (existingInvitation) {
        return reply.code(409).send({
          error: 'Invitation already exists',
          message: `An invitation for ${email} already exists in this organization`,
          invitation: existingInvitation
        });
      }

      // Create the invitation
      const invitationToken = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Generate the full invitation URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const invitationUrl = `${baseUrl}/invite/accept?token=${invitationToken}`;
      
      const [newInvitation] = await db.insert(tenantInvitations).values({
        tenantId: tenant.tenantId,
        email: email,
        invitationToken: invitationToken,
        invitationUrl: invitationUrl,
        status: 'pending',
        expiresAt: expiresAt,
        invitedBy: inviter.userId,
        roleId: role.roleId
      }).returning();

      console.log('✅ Test invitation created successfully:', {
        invitationId: newInvitation.invitationId,
        email: newInvitation.email,
        token: newInvitation.invitationToken,
        url: newInvitation.invitationUrl
      });

      return {
        success: true,
        message: 'Test invitation created successfully',
        invitation: {
          invitationId: newInvitation.invitationId,
          email: newInvitation.email,
          token: newInvitation.invitationToken,
          url: newInvitation.invitationUrl,
          expiresAt: newInvitation.expiresAt,
          roleName: role.roleName
        }
      };
    } catch (error) {
      console.error('❌ Error creating test invitation:', error);
      return reply.code(500).send({
        error: 'Failed to create test invitation',
        message: error.message
      });
    }
  });

  // Create invitation for current tenant (authenticated endpoint)
  fastify.post('/create', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { email, roleName = 'Member' } = request.body;
      
      if (!email) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'email is required'
        });
      }
      
      if (!request.userContext?.isAuthenticated) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const tenantId = request.userContext.tenantId;
      if (!tenantId) {
        return reply.code(400).send({
          error: 'Tenant context required',
          message: 'User must be associated with a tenant'
        });
      }
      
      console.log('📧 Creating invitation for current tenant...', { email, roleName, tenantId });
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: 'Current user\'s organization not found'
        });
      }

      // Get the current user as inviter
      const inviter = request.userContext;

      // Get or create a default role
      let [role] = await db
        .select()
        .from(customRoles)
        .where(and(
          eq(customRoles.tenantId, tenant.tenantId),
          eq(customRoles.roleName, roleName)
        ))
        .limit(1);

      if (!role) {
        // Create a default role if it doesn't exist
        const [newRole] = await db.insert(customRoles).values({
          tenantId: tenant.tenantId,
          roleName: roleName,
          description: `Default ${roleName} role`,
          permissions: { read: true, write: false, admin: false },
          restrictions: {},
          isSystemRole: false,
          isDefault: false,
          priority: 50
        }).returning();
        role = newRole;
      }

      // Check if invitation already exists
      const [existingInvitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenant.tenantId),
          eq(tenantInvitations.email, email)
        ))
        .limit(1);

      if (existingInvitation) {
        return reply.code(409).send({
          error: 'Invitation already exists',
          message: `An invitation for ${email} already exists in this organization`,
          invitation: existingInvitation
        });
      }

      // Create the invitation
      const invitationToken = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Generate the full invitation URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const invitationUrl = `${baseUrl}/invite/accept?token=${invitationToken}`;
      
      const [newInvitation] = await db.insert(tenantInvitations).values({
        tenantId: tenant.tenantId,
        email: email,
        invitationToken: invitationToken,
        invitationUrl: invitationUrl,
        status: 'pending',
        expiresAt: expiresAt,
        invitedBy: inviter.kindeUserId,
        roleId: role.roleId
      }).returning();

      console.log('✅ Invitation created successfully:', {
        invitationId: newInvitation.invitationId,
        email: newInvitation.email,
        token: newInvitation.invitationToken,
        url: newInvitation.invitationUrl
      });

      return {
        success: true,
        message: 'Invitation created successfully',
        invitation: {
          invitationId: newInvitation.invitationId,
          email: newInvitation.email,
          token: newInvitation.invitationToken,
          url: newInvitation.invitationUrl,
          expiresAt: newInvitation.expiresAt,
          roleName: role.roleName
        }
      };
    } catch (error) {
      console.error('❌ Error creating invitation:', error);
      return reply.code(500).send({
        error: 'Failed to create invitation',
        message: error.message
      });
    }
  });

  // Test endpoint to verify invitation system with working user assignment
  fastify.post('/test-invitation-flow', async (request, reply) => {
    try {
      const { orgCode, kindeUserId, email } = request.body;
      
      if (!orgCode || !kindeUserId || !email) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'orgCode, kindeUserId, and email are required'
        });
      }
      
      console.log('🧪 Testing invitation flow with user assignment...');
      
      // Test 1: Check if organization exists
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: `No organization found with orgCode: ${orgCode}`
        });
      }

      // Test 2: Check if invitation exists
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenant.tenantId),
          eq(tenantInvitations.email, email)
        ))
        .limit(1);

      if (!invitation) {
        return reply.code(404).send({
          error: 'Invitation not found',
          message: `No invitation found for email: ${email} in organization: ${tenant.companyName}`
        });
      }

      // Test 3: Test organization assignment
      console.log('🔗 Testing organization assignment...');
      const orgResult = await ensureUserInCorrectOrganization(
        kindeUserId,
        email,
        orgCode
      );

      // Test 4: Test invitation acceptance simulation
      let acceptanceResult = null;
      if (orgResult.success) {
        console.log('✅ Organization assignment successful, testing invitation acceptance...');
        
        try {
          // Simulate the invitation acceptance process
          const [updatedUser] = await db
            .update(tenantUsers)
            .set({
              kindeUserId: kindeUserId,
              isActive: true,
              onboardingCompleted: true,
              invitationAcceptedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(tenantUsers.userId, invitation.invitedBy))
            .returning();

          acceptanceResult = {
            success: true,
            userId: updatedUser.userId,
            email: updatedUser.email,
            isActive: updatedUser.isActive
          };
        } catch (acceptanceError) {
          acceptanceResult = {
            success: false,
            error: acceptanceError.message
          };
        }
      }

      return {
        success: true,
        data: {
          test: 'Invitation Flow Test',
          orgCode,
          kindeUserId,
          email,
          organization: {
            tenantId: tenant.tenantId,
            companyName: tenant.companyName,
            kindeOrgId: tenant.kindeOrgId
          },
          invitation: {
            invitationId: invitation.invitationId,
            status: invitation.status,
            expiresAt: invitation.expiresAt
          },
          organizationAssignment: orgResult,
          invitationAcceptance: acceptanceResult,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error testing invitation flow:', error);
      return reply.code(500).send({
        error: 'Failed to test invitation flow',
        message: error.message,
        stack: error.stack
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
          error: 'Missing required parameters',
          message: 'token parameter is required'
        });
      }

      console.log('🔍 Getting invitation details by token:', { token });

      // Find invitation by token
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.invitationToken, token),
          eq(tenantInvitations.status, 'pending')
        ))
        .limit(1);

      if (!invitation) {
        console.log('❌ Invitation not found for token:', token);
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
        console.log('❌ Invitation expired for token:', token);
        return reply.code(410).send({
          error: 'Invitation expired',
          message: 'This invitation has expired'
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
        .where(eq(tenants.tenantId, invitation.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found'
        });
      }

      // Get inviter details
      const [inviter] = await db
        .select({
          name: tenantUsers.name,
          email: tenantUsers.email
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, invitation.invitedBy))
        .limit(1);

      // Get role details
      const [role] = await db
        .select({
          roleName: customRoles.roleName,
          description: customRoles.description
        })
        .from(customRoles)
        .where(eq(customRoles.roleId, invitation.roleId))
        .limit(1);

      return {
        success: true,
        invitation: {
          email: invitation.email,
          organizationName: tenant.companyName,
          inviterName: inviter?.name || 'Team Member',
          roles: role ? [role.roleName] : ['Member'],
          orgCode: tenant.kindeOrgId,
          roleName: role?.roleName || 'Member',
          expiresAt: invitation.expiresAt
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

      // Find invitation by token in tenantInvitations table
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.invitationToken, token),
          eq(tenantInvitations.status, 'pending')
        ))
        .limit(1);

      if (!invitation) {
        console.log('❌ Invitation not found for token:', token);
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
        console.log('❌ Invitation expired for token:', token);
        return reply.code(410).send({
          error: 'Invitation expired',
          message: 'This invitation has expired'
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
        .where(eq(tenants.tenantId, invitation.tenantId))
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
        invitation.email,
        tenant.kindeOrgId // Use the organization's Kinde org ID
      );
      
      if (orgResult.success) {
        console.log('✅ User organization assignment completed:', orgResult);
      } else {
        console.error('❌ Failed to ensure user organization assignment:', orgResult);
        // In development, we'll log the error but continue with invitation acceptance
        // In production, this should be a hard failure
        const isDevelopment = process.env.NODE_ENV !== 'production';
        if (!isDevelopment) {
          return reply.code(500).send({
            error: 'Organization assignment failed',
            message: `Failed to add user to organization: ${orgResult.message}`,
            details: orgResult
          });
        } else {
          console.log('⚠️ Development mode: Continuing with invitation acceptance despite org assignment failure');
        }
      }

      // Check if user already exists (from legacy invitation system)
      const [existingUser] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.email, invitation.email),
          eq(tenantUsers.tenantId, invitation.tenantId)
        ))
        .limit(1);

      let newUser;
      if (existingUser) {
        // Update existing user record (from legacy invitation)
        console.log('✅ Updating existing user record:', existingUser.userId);
        [newUser] = await db
          .update(tenantUsers)
          .set({
            kindeUserId: kindeUserId,
            isActive: true,
            onboardingCompleted: true, // ✅ INVITED USERS SKIP ONBOARDING
            invitationAcceptedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(tenantUsers.userId, existingUser.userId))
          .returning();
      } else {
        // Create new user record
        console.log('✅ Creating new user record');
        [newUser] = await db
          .insert(tenantUsers)
          .values({
            tenantId: invitation.tenantId,
            kindeUserId: kindeUserId,
            email: invitation.email,
            name: invitation.email.split('@')[0], // Use email prefix as name
            isActive: true,
            onboardingCompleted: true, // ✅ INVITED USERS SKIP ONBOARDING
            isTenantAdmin: false, // Invited users are never admins
            invitedBy: invitation.invitedBy,
            invitedAt: invitation.createdAt,
            invitationAcceptedAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
      }

      // Assign role if roleId is set
      if (invitation.roleId) {
        await db
          .insert(userRoleAssignments)
          .values({
            userId: newUser.userId,
            roleId: invitation.roleId,
            assignedBy: invitation.invitedBy,
            assignedAt: new Date()
          });
      }

      // Update invitation status to accepted
      await db
        .update(tenantInvitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date()
        })
        .where(eq(tenantInvitations.invitationId, invitation.invitationId));

      console.log('✅ Invitation accepted successfully by token:', {
        userId: newUser.userId,
        email: newUser.email,
        tenantId: newUser.tenantId,
        kindeUserId: newUser.kindeUserId,
        invitedOrg: tenant.kindeOrgId,
        isActive: newUser.isActive,
        onboardingCompleted: newUser.onboardingCompleted, // Should be true
        isTenantAdmin: newUser.isTenantAdmin // Should be false for invited users
      });

      return {
        success: true,
        message: 'Invitation accepted successfully',
        user: {
          userId: newUser.userId,
          email: newUser.email,
          name: newUser.name,
          isActive: newUser.isActive,
          tenantId: newUser.tenantId,
          onboardingCompleted: newUser.onboardingCompleted,
          isTenantAdmin: newUser.isTenantAdmin
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