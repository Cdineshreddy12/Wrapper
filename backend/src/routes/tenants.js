import { TenantService } from '../services/tenant-service.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { db } from '../db/index.js';
import { tenants, tenantUsers, userRoleAssignments, customRoles, tenantInvitations } from '../db/schema/index.js';
import { and, eq, sql, inArray } from 'drizzle-orm';
import ErrorResponses from '../utils/error-responses.js';
import { randomUUID } from 'crypto';
import ActivityLogger, { ACTIVITY_TYPES, RESOURCE_TYPES } from '../services/activityLogger.js';

export default async function tenantRoutes(fastify, options) {
  // List all tenants (Authenticated users only)
  fastify.get('/', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const tenantsList = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          isActive: tenants.isActive,
          createdAt: tenants.createdAt,
          adminEmail: tenants.adminEmail,
          trialStatus: tenants.trialStatus,
          subscriptionStatus: tenants.subscriptionStatus
        })
        .from(tenants)
        .orderBy(tenants.createdAt);

      return {
        success: true,
        tenants: tenantsList
      };
    } catch (error) {
      request.log.error('Error fetching tenants:', error);
      return reply.code(500).send({ error: 'Failed to fetch tenants' });
    }
  });

  // Get current tenant info
  fastify.get('/current', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      // Use tenantId directly from userContext
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }
      
      const details = await TenantService.getTenantDetails(tenantId);
      
      return {
        success: true,
        data: details
      };
    } catch (error) {
      request.log.error('Error fetching current tenant:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update tenant settings
  fastify.put('/current/settings', {
    schema: {
      body: {
        type: 'object',
        properties: {
          companyName: { type: 'string', minLength: 1, maxLength: 255 },
          primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          logoUrl: { type: 'string', format: 'uri' },
          timezone: { type: 'string' },
          country: { type: 'string' },
          settings: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      const updatedTenant = await TenantService.updateTenant(
        tenantId,
        request.body
      );

      // Log tenant settings update activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        null,
        ACTIVITY_TYPES.TENANT_SETTINGS_UPDATED,
        {
          updatedFields: Object.keys(request.body),
          tenantId: tenantId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        data: updatedTenant,
        message: 'Tenant settings updated successfully'
      };
    } catch (error) {
      request.log.error('Error updating tenant settings:', error);
      return reply.code(500).send({ error: 'Failed to update tenant settings' });
    }
  });

  // Get tenant users
  fastify.get('/current/users', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      // Use tenantId directly from userContext since auth middleware already resolved it
      const tenantId = request.userContext.tenantId;
      const { entityId } = request.query;

      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      // If entityId is provided, filter users by entity
      const users = entityId
        ? await TenantService.getTenantUsersByEntity(tenantId, entityId)
        : await TenantService.getTenantUsers(tenantId);

      return {
        success: true,
        data: users,
        filteredByEntity: !!entityId,
        entityId: entityId || null
      };
    } catch (error) {
      request.log.error('Error fetching tenant users:', error);
      return reply.code(500).send({ error: 'Failed to fetch users' });
    }
  });

  // Invite user to tenant
  fastify.post('/current/users/invite', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'roleId'],
        properties: {
          email: { type: 'string', format: 'email' },
          roleId: { type: 'string' },
          message: { type: 'string', maxLength: 500 }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      const { email, roleId, message } = request.body;
      
      const invitation = await TenantService.inviteUser({
        tenantId: tenantId,
        email,
        roleId,
        invitedBy: request.userContext.internalUserId,
        message
      });

      // Log user invitation activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        null,
        ACTIVITY_TYPES.TENANT_USER_INVITED,
        {
          invitedEmail: email,
          roleId: roleId,
          invitationId: invitation?.invitationId,
          tenantId: tenantId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        data: invitation,
        message: 'User invitation sent successfully'
      };
    } catch (error) {
      request.log.error('Error inviting user:', error);
      if (error.message.includes('already exists')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to send invitation' });
    }
  });

  // Accept invitation
  fastify.post('/invite/:token/accept', {
    schema: {
      params: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const { token } = request.params;
      
      const result = await TenantService.acceptInvitation(
        token,
        request.userContext.kindeUserId,
        {
          email: request.userContext.email,
          name: request.userContext.name,
          avatar: request.userContext.avatar
        }
      );
      
      return {
        success: true,
        data: result,
        message: 'Invitation accepted successfully'
      };
    } catch (error) {
      request.log.error('Error accepting invitation:', error);
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to accept invitation' });
    }
  });

  // Get pending invitations
  fastify.get('/current/invitations', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      const invitations = await TenantService.getPendingInvitations(tenantId);
      
      return {
        success: true,
        data: invitations
      };
    } catch (error) {
      request.log.error('Error fetching invitations:', error);
      return reply.code(500).send({ error: 'Failed to fetch invitations' });
    }
  });

  // Cancel invitation
  fastify.delete('/current/invitations/:invitationId', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { invitationId } = request.params;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      // Check if user has permission to cancel invitations
      if (!request.userContext.isTenantAdmin) {
        return reply.code(403).send({ 
          error: 'Forbidden',
          message: 'Only tenant administrators can cancel invitations'
        });
      }

      const result = await TenantService.cancelInvitation(
        tenantId, 
        invitationId, 
        request.userContext.internalUserId
      );
      
      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      request.log.error('Error cancelling invitation:', error);
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({ 
          error: 'Invitation not found',
          message: error.message
        });
      }
      
      if (error.message.includes('pending')) {
        return reply.code(400).send({ 
          error: 'Invalid invitation status',
          message: error.message
        });
      }
      
      return reply.code(500).send({ error: 'Failed to cancel invitation' });
    }
  });

  // Resend invitation email
  fastify.post('/current/invitations/:id/resend', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      const result = await TenantService.resendInvitationEmail(request.params.id, tenantId);
      
      return {
        success: true,
        data: result,
        message: 'Invitation email resent successfully'
      };
    } catch (error) {
      request.log.error('Error resending invitation:', error);
      if (error.message.includes('not found') || error.message.includes('expired')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to resend invitation' });
    }
  });

  // Update user role/permissions
  fastify.put('/current/users/:userId/role', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { userId } = request.params;
      const { role } = request.body;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      if (!role) {
        return reply.code(400).send({ error: 'Role is required' });
      }

      // Get role ID from role name
      const [roleRecord] = await db
        .select()
        .from(customRoles)
        .where(and(
          eq(customRoles.roleName, role),
          eq(customRoles.tenantId, tenantId)
        ))
        .limit(1);

      if (!roleRecord) {
        return reply.code(404).send({ error: 'Role not found' });
      }

      const result = await TenantService.updateUserRole(userId, roleRecord.roleId, tenantId);

      // Log user role update activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        null,
        ACTIVITY_TYPES.USER_PROMOTED,
        {
          targetUserId: userId,
          newRoleId: roleRecord.roleId,
          newRoleName: role,
          tenantId: tenantId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      request.log.error('Error updating user role:', error);
      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to update user role' });
    }
  });

  // Test Kinde organization assignment
  fastify.post('/test/kinde-organization', {
    preHandler: [authenticateToken, requirePermission('users:read'), trackUsage]
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;

      console.log('🧪 Testing Kinde organization assignment for tenant:', tenantId);

      // Get a test user
      const [testUser] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isActive, true)
        ))
        .limit(1);

      if (!testUser) {
        return reply.code(404).send({
          success: false,
          message: 'No active users found for testing'
        });
      }

      // Get tenant info
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      // Test M2M token
      let m2mTokenTest = { success: false, error: 'Not tested' };
      try {
        const kindeService = require('../services/kinde-service.js').default;
        const token = await kindeService.getM2MToken();
        m2mTokenTest = { success: true, tokenLength: token.length };
      } catch (error) {
        m2mTokenTest = { success: false, error: error.message };
      }

      // Test organization assignment
      let orgAssignmentTest = { success: false, error: 'Not tested' };
      try {
        const kindeService = require('../services/kinde-service.js').default;
        const result = await kindeService.addUserToOrganization(
          testUser.kindeUserId || testUser.userId,
          tenant.kindeOrgId,
          { exclusive: false }
        );
        orgAssignmentTest = result;
      } catch (error) {
        orgAssignmentTest = { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Kinde organization assignment test completed',
        data: {
          tenant: {
            tenantId: tenant.tenantId,
            companyName: tenant.companyName,
            kindeOrgId: tenant.kindeOrgId
          },
          testUser: {
            userId: testUser.userId,
            email: testUser.email,
            kindeUserId: testUser.kindeUserId
          },
          m2mTokenTest,
          orgAssignmentTest,
          recommendations: {
            m2mConfigured: m2mTokenTest.success,
            orgAssignmentWorking: orgAssignmentTest.success,
            nextSteps: m2mTokenTest.success && orgAssignmentTest.success
              ? ['✅ All tests passed! Kinde organization assignment is working correctly.']
              : [
                  m2mTokenTest.success ? null : 'Configure M2M client with proper scopes (admin, organizations:read, organizations:write)',
                  orgAssignmentTest.success ? null : 'Ensure organization allows M2M management and M2M client has Organization Admin role'
                ].filter(Boolean)
          }
        }
      };

    } catch (error) {
      console.error('Error testing Kinde organization:', error);
      return reply.code(500).send({
        success: false,
        message: 'Test failed',
        error: error.message
      });
    }
  });

  // Remove user from tenant
  fastify.delete('/current/users/:userId', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { userId } = request.params;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      // Check if user has permission to remove users
      if (!request.userContext.isTenantAdmin) {
        return reply.code(403).send({ 
          error: 'Forbidden',
          message: 'Only tenant administrators can remove users'
        });
      }

      const result = await TenantService.removeUser(
        tenantId, 
        userId, 
        request.userContext.internalUserId
      );
      
      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      request.log.error('Error removing user:', error);
      
      if (error.message.includes('last admin')) {
        return reply.code(400).send({ 
          error: 'Cannot remove last admin',
          message: error.message
        });
      }
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({ 
          error: 'User not found',
          message: error.message
        });
      }
      
      return reply.code(500).send({ error: 'Failed to remove user' });
    }
  });

  // Get tenant usage statistics
  fastify.get('/usage', {
    preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'month' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { period, startDate, endDate } = request.query;
      const usage = await TenantService.getTenantUsage(request.user.tenantId, {
        period,
        startDate,
        endDate
      });
      
      return {
        success: true,
        data: usage
      };
    } catch (error) {
      fastify.log.error('Error fetching tenant usage:', error);
      return reply.code(500).send({ error: 'Failed to fetch usage statistics' });
    }
  });

  // Promote user to admin
  fastify.post('/current/users/:userId/promote', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can promote users
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;

      // Update user to admin
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({ 
          isTenantAdmin: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (!updatedUser) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      return {
        success: true,
        message: 'User promoted to admin successfully',
        data: updatedUser
      };
    } catch (error) {
      request.log.error('Error promoting user:', error);
      return reply.code(500).send({ error: 'Failed to promote user' });
    }
  });

  // Deactivate user
  fastify.post('/current/users/:userId/deactivate', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can deactivate users
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;

      // Prevent self-deactivation
      if (userId === request.userContext.internalUserId) {
        return reply.code(400).send({ error: 'Cannot deactivate yourself' });
      }

      // Update user to inactive
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (!updatedUser) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      return {
        success: true,
        message: 'User deactivated successfully',
        data: updatedUser
      };
    } catch (error) {
      request.log.error('Error deactivating user:', error);
      return reply.code(500).send({ error: 'Failed to deactivate user' });
    }
  });

  // Reactivate user
  fastify.post('/current/users/:userId/reactivate', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can reactivate users
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;

      // Update user to active
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({ 
          isActive: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (!updatedUser) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      return {
        success: true,
        message: 'User reactivated successfully',
        data: updatedUser
      };
    } catch (error) {
      request.log.error('Error reactivating user:', error);
      return reply.code(500).send({ error: 'Failed to reactivate user' });
    }
  });

  // Update user details
  fastify.put('/current/users/:userId', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can update other users, users can update themselves
    const { userId } = request.params;
    const isUpdatingSelf = userId === request.userContext.internalUserId;
    const isAdmin = request.userContext?.isAdmin || request.userContext?.isTenantAdmin;

    if (!isUpdatingSelf && !isAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { name, email, title, department, isActive, isTenantAdmin } = request.body;

      // Build update object - only include provided fields
      const updateData = {
        updatedAt: new Date()
      };

      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (title !== undefined) updateData.title = title;
      if (department !== undefined) updateData.department = department;
      
      // Only admins can change these fields
      if (isAdmin && !isUpdatingSelf) {
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isTenantAdmin !== undefined) updateData.isTenantAdmin = isTenantAdmin;
      }

      // Update user
      const [updatedUser] = await db
        .update(tenantUsers)
        .set(updateData)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (!updatedUser) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      };
    } catch (error) {
      request.log.error('Error updating user:', error);
      return reply.code(500).send({ error: 'Failed to update user' });
    }
  });

  // Note: User deletion is now handled by the unified TenantService.deleteUser() method above

  // Resend invitation
  fastify.post('/current/users/:userId/resend-invite', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;

      // Get user details
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (!user) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      // Check if user has already completed onboarding
      if (user.onboardingCompleted) {
        return reply.code(400).send({ 
          error: 'User has already completed onboarding',
          message: 'Cannot resend invitation to users who have already joined'
        });
      }

      // Import EmailService
      const { default: EmailService } = await import('../utils/email.js');
      
      // Get tenant details for email
      const tenantDetails = await TenantService.getTenantDetails(tenantId);
      
      // Check for existing pending invitation
      const [existingInvitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenantId),
          eq(tenantInvitations.email, user.email),
          eq(tenantInvitations.status, 'pending')
        ))
        .limit(1);

      let invitationToken;
      let invitationId;

      if (existingInvitation) {
        // Use existing invitation
        invitationToken = existingInvitation.invitationToken;
        invitationId = existingInvitation.invitationId;
        
        // Update expiry to 7 days from now
        await db
          .update(tenantInvitations)
          .set({ 
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          })
          .where(eq(tenantInvitations.invitationId, invitationId));
          
        console.log(`🔄 Resending existing invitation ${invitationId} to ${user.email}`);
      } else {
        // Create new invitation
        invitationToken = randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        const [newInvitation] = await db
          .insert(tenantInvitations)
          .values({
            tenantId,
            email: user.email,
            invitedBy: request.userContext.internalUserId,
            invitationToken,
            expiresAt,
            status: 'pending'
          })
          .returning();
          
        invitationId = newInvitation.invitationId;
        console.log(`📧 Created new invitation ${invitationId} for ${user.email}`);
      }

      // Get inviter's name
      const inviterName = request.userContext.name || request.userContext.email || 'Team Administrator';
      
      // Send invitation email
      try {
        const emailResult = await EmailService.sendUserInvitation({
          email: user.email,
          tenantName: tenantDetails.companyName,
          roleName: 'Team Member', // Default role for invited users
          invitationToken,
          invitedByName: inviterName,
          message: `You're invited to join ${tenantDetails.companyName} on Wrapper. Please accept this invitation to get started.`
        });

        if (emailResult.success) {
          console.log(`✅ Invitation email sent successfully to ${user.email}`);
          
          return {
            success: true,
            message: `Invitation resent to ${user.email}`,
            data: { 
              email: user.email,
              invitationId,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          };
        } else {
          console.error(`❌ Failed to send invitation email to ${user.email}:`, emailResult.error);
          return reply.code(500).send({ 
            error: 'Failed to send invitation email',
            message: 'Email service error occurred'
          });
        }
      } catch (emailError) {
        console.error(`❌ Error sending invitation email to ${user.email}:`, emailError);
        return reply.code(500).send({ 
          error: 'Failed to send invitation email',
          message: 'Email service error occurred'
        });
      }
    } catch (error) {
      request.log.error('Error resending invitation:', error);
      return reply.code(500).send({ error: 'Failed to resend invitation' });
    }
  });

  // Assign roles to user
  fastify.post('/current/users/:userId/assign-roles', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['roleIds'],
        properties: {
          roleIds: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Array of role IDs to assign to the user'
          }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can assign roles
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const { userId } = request.params;
      const { roleIds } = request.body;
      const tenantId = request.userContext.tenantId;

      console.log(`🔄 Role assignment request:`, {
        userId,
        roleIds,
        tenantId,
        assignedBy: request.userContext.internalUserId
      });

      if (!Array.isArray(roleIds)) {
        return reply.code(400).send({ error: 'roleIds must be an array' });
      }

      // Verify user exists in this tenant
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (!user) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      // Verify all roles exist and belong to this tenant
      if (roleIds.length > 0) {
        const roles = await db
          .select()
          .from(customRoles)
          .where(and(
            eq(customRoles.tenantId, tenantId),
            inArray(customRoles.roleId, roleIds)
          ));

        if (roles.length !== roleIds.length) {
          const foundRoleIds = roles.map(r => r.roleId);
          const missingRoleIds = roleIds.filter(id => !foundRoleIds.includes(id));
          console.log(`❌ Missing roles: ${missingRoleIds.join(', ')}`);
          return reply.code(400).send({ 
            error: 'One or more roles not found',
            missingRoles: missingRoleIds
          });
        }
      }

      // Use transaction for atomic operation
      await db.transaction(async (tx) => {
        console.log(`🔄 Removing existing role assignments for user ${userId}`);
        // Remove existing role assignments for this user
        await tx
          .delete(userRoleAssignments)
          .where(eq(userRoleAssignments.userId, userId));

        // Add new role assignments
        if (roleIds.length > 0) {
          console.log(`➕ Adding ${roleIds.length} new role assignments for user ${userId}`);
          const assignments = roleIds.map(roleId => ({
            userId,
            roleId,
            assignedBy: request.userContext.internalUserId,
            assignedAt: new Date(),
            isActive: true
          }));

          console.log(`📝 Assignment data:`, assignments);
          await tx
            .insert(userRoleAssignments)
            .values(assignments);
          console.log(`✅ Successfully inserted role assignments`);
        }
      });

      return {
        success: true,
        message: `Roles updated successfully for user`,
        data: { userId, assignedRoles: roleIds.length }
      };
    } catch (error) {
      request.log.error('Error assigning roles:', error);
      return reply.code(500).send({ error: 'Failed to assign roles' });
    }
  });

  // Export users
  fastify.get('/current/users/export', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can export users
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const tenantId = request.userContext.tenantId;

      const users = await db
        .select({
          name: tenantUsers.name,
          email: tenantUsers.email,
          role: sql`CASE WHEN ${tenantUsers.isTenantAdmin} THEN 'Admin' ELSE 'User' END`,
          status: sql`CASE WHEN ${tenantUsers.isActive} THEN 'Active' ELSE 'Inactive' END`,
          onboardingCompleted: tenantUsers.onboardingCompleted,
          createdAt: tenantUsers.createdAt
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      // Generate CSV content
      const headers = ['Name', 'Email', 'Role', 'Status', 'Onboarding Completed', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...users.map(user => [
          user.name || '',
          user.email,
          user.role,
          user.status,
          user.onboardingCompleted ? 'Yes' : 'No',
          user.createdAt.toISOString().split('T')[0]
        ].join(','))
      ].join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="users-export.csv"');
      
      return csvContent;
    } catch (error) {
      request.log.error('Error exporting users:', error);
      return reply.code(500).send({ error: 'Failed to export users' });
    }
  });
} 