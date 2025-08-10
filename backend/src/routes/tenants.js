import { TenantService } from '../services/tenant-service.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { db } from '../db/index.js';
import { tenantUsers, userRoleAssignments, customRoles } from '../db/schema/index.js';
import { and, eq, sql, inArray } from 'drizzle-orm';
import ErrorResponses from '../utils/error-responses.js';

export default async function tenantRoutes(fastify, options) {
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
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      const users = await TenantService.getTenantUsers(tenantId);
      
      return {
        success: true,
        data: users
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
  fastify.delete('/current/invitations/:id', {
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

      await TenantService.cancelInvitation(request.params.id, tenantId);
      
      return {
        success: true,
        message: 'Invitation cancelled successfully'
      };
    } catch (error) {
      request.log.error('Error cancelling invitation:', error);
      return reply.code(500).send({ error: 'Failed to cancel invitation' });
    }
  });

  // Update user role/permissions
  fastify.put('/users/:userId/role', {
    preHandler: [authenticateToken, requirePermission('users:manage'), trackUsage],
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
        required: ['role'],
        properties: {
          role: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const { role, permissions } = request.body;
      
      const updatedUser = await TenantService.updateUserRole(
        request.user.tenantId,
        userId,
        role,
        permissions
      );
      
      return {
        success: true,
        data: updatedUser,
        message: 'User role updated successfully'
      };
    } catch (error) {
      fastify.log.error('Error updating user role:', error);
      return reply.code(500).send({ error: 'Failed to update user role' });
    }
  });

  // Remove user from tenant
  fastify.delete('/users/:userId', {
    preHandler: [authenticateToken, requirePermission('users:manage'), trackUsage],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      
      // Prevent self-removal
      if (userId === request.user.id) {
        return reply.code(400).send({ error: 'Cannot remove yourself from tenant' });
      }
      
      await TenantService.removeUser(request.user.tenantId, userId);
      
      return {
        success: true,
        message: 'User removed from tenant successfully'
      };
    } catch (error) {
      fastify.log.error('Error removing user:', error);
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

  // Delete user (permanent removal)
  fastify.delete('/current/users/:userId', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can delete users
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;

      // Prevent self-deletion
      if (userId === request.userContext.internalUserId) {
        return reply.code(400).send({ error: 'Cannot delete yourself' });
      }

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (!existingUser) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      // Delete user from tenant
      await db
        .delete(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ));

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      request.log.error('Error deleting user:', error);
      return reply.code(500).send({ error: 'Failed to delete user' });
    }
  });

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

      // TODO: Implement actual email sending logic here
      // For now, just return success
      
      return {
        success: true,
        message: `Invitation resent to ${user.email}`,
        data: { email: user.email }
      };
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