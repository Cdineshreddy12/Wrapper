import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { 
  tenants, 
  tenantInvitations, 
  subscriptions,
  tenantUsers,
  customRoles,
  userRoleAssignments
} from '../db/schema/index.js';
import { v4 as uuidv4 } from 'uuid';
import { KindeService } from './kinde-service.js';
import { EmailService } from '../utils/email.js';
import { SubscriptionService } from './subscription-service.js';
import { sql } from 'drizzle-orm';
import { inArray } from 'drizzle-orm';

export class TenantService {
  // Create a new tenant
  static async createTenant(data) {
    const tenantId = uuidv4();
    const adminUserId = uuidv4();
    
    try {
      const result = await db.transaction(async (tx) => {
        // 1. Create tenant
        const [tenant] = await tx.insert(tenants).values({
          tenantId,
          companyName: data.companyName,
          subdomain: data.subdomain,
          kindeOrgId: data.kindeOrgId,
          adminEmail: data.adminEmail,
          companySize: data.companySize,
          industry: data.industry,
          timezone: data.timezone || 'UTC',
          country: data.country,
          onboardedAt: new Date(),
        }).returning();

        // 2. Create admin user with Kinde ID (must be provided)
        if (!data.kindeUserId) {
          throw new Error('kindeUserId is required for tenant creation');
        }

        const [adminUser] = await tx.insert(tenantUsers).values({
          userId: adminUserId,
          tenantId,
          kindeUserId: data.kindeUserId,
          email: data.adminEmail,
          name: `${data.adminFirstName} ${data.adminLastName}`,
          isVerified: true,
          isActive: true,
          isTenantAdmin: true,
          onboardingCompleted: false,
        }).returning();

        // 3. Create default admin role with proper createdBy reference
        const [adminRole] = await tx.insert(customRoles).values({
          tenantId,
          roleName: 'Administrator',
          description: 'Full access to all features and settings',
          permissions: this.getDefaultAdminPermissions(),
          restrictions: {},
          isSystemRole: true,
          isDefault: true,
          priority: 100,
          createdBy: adminUserId,
        }).returning();

        // 4. Assign admin role to admin user
        await tx.insert(userRoleAssignments).values({
          userId: adminUserId,
          roleId: adminRole.roleId,
          assignedBy: adminUserId, // Self-assigned during setup
        });

        return { tenant, adminRole, adminUser };
      });

      // 5. Create default subscription (trial) after transaction commits
      await SubscriptionService.createTrialSubscription(tenantId);

      return result;
    } catch (error) {
      console.error('Failed to create tenant:', error);
      throw new Error('Tenant creation failed');
    }
  }

  // Get tenant by subdomain
  static async getBySubdomain(subdomain) {
    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        kindeOrgId: tenants.kindeOrgId,
        adminEmail: tenants.adminEmail,
        isActive: tenants.isActive,
        isVerified: tenants.isVerified,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt
      })
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);
    
    return tenant || null;
  }

  // Get tenant by Kinde org ID
  static async getByKindeOrgId(kindeOrgId) {
    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        kindeOrgId: tenants.kindeOrgId,
        adminEmail: tenants.adminEmail,
        isActive: tenants.isActive,
        isVerified: tenants.isVerified,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt
      })
      .from(tenants)
      .where(eq(tenants.kindeOrgId, kindeOrgId))
      .limit(1);
    
    return tenant || null;
  }

  // Get tenant details with subscription info
  static async getTenantDetails(tenantId) {
    try {
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          kindeOrgId: tenants.kindeOrgId,
          adminEmail: tenants.adminEmail,
          isActive: tenants.isActive,
          isVerified: tenants.isVerified,
          createdAt: tenants.createdAt,
          updatedAt: tenants.updatedAt
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get subscription info
      let subscription = null;
      try {
        subscription = await SubscriptionService.getCurrentSubscription(tenantId);
      } catch (error) {
        console.warn('Could not fetch subscription for tenant:', tenantId);
      }

      // Get user count
      const userCount = await db
        .select({ count: count() })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      // Get admin user
      const [adminUser] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isTenantAdmin, true)
        ))
        .limit(1);

      return {
        ...tenant,
        subscription,
        userCount: userCount[0]?.count || 0,
        adminUser: adminUser || null,
        isFullyOnboarded: tenant.onboardedAt && adminUser?.onboardingCompleted,
        subscriptionStatus: subscription?.status || 'none'
      };
    } catch (error) {
      console.error('Error getting tenant details:', error);
      throw error;
    }
  }

  // Check if organization needs onboarding completion
  static async getOnboardingStatus(tenantId) {
    try {
      const tenant = await this.getTenantDetails(tenantId);
      
      const needsOnboarding = !tenant.isFullyOnboarded;
      const hasSubscription = tenant.subscription && tenant.subscription.status !== 'none';
      
      return {
        needsOnboarding,
        hasSubscription,
        onboardedAt: tenant.onboardedAt,
        subscriptionStatus: tenant.subscriptionStatus,
        currentPlan: tenant.subscription?.plan || 'none',
        userCount: tenant.userCount,
        canCreateSubscription: !needsOnboarding,
        adminUser: tenant.adminUser
      };
    } catch (error) {
      console.error('Error getting onboarding status:', error);
      throw error;
    }
  }

  // Update tenant onboarding completion
  static async markOnboardingComplete(tenantId, userId) {
    try {
      // Mark tenant as onboarded
      await db
        .update(tenants)
        .set({
          onboardedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      // Mark user onboarding as complete
      await db
        .update(tenantUsers)
        .set({
          onboardingCompleted: true,
          onboardingStep: 'completed',
          updatedAt: new Date()
        })
        .where(eq(tenantUsers.userId, userId));

      return {
        success: true,
        completedAt: new Date(),
        message: 'Onboarding completed successfully'
      };
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
      throw error;
    }
  }

  // Update tenant settings
  static async updateTenant(tenantId, updates) {
    const [updated] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.tenantId, tenantId))
      .returning();

    return updated;
  }

  // Invite user to tenant
  static async inviteUser(data) {
    const invitationToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, data.tenantId),
          eq(tenantUsers.email, data.email)
        ))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error('User is already a member of this organization');
      }

      // Create invitation
      const [invitation] = await db.insert(tenantInvitations).values({
        tenantId: data.tenantId,
        email: data.email,
        roleId: data.roleId,
        invitedBy: data.invitedBy,
        invitationToken,
        expiresAt,
      }).returning();

      // Get tenant and role details for email
      const tenant = await this.getTenantDetails(data.tenantId);
      const [role] = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.roleId, data.roleId))
        .limit(1);

      // Get inviter's name
      const [inviter] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, data.invitedBy))
        .limit(1);

      // Send invitation email
      try {
        await EmailService.sendUserInvitation({
          email: data.email,
          tenantName: tenant.companyName,
          roleName: role.roleName,
          invitationToken,
          invitedByName: inviter?.name || 'Team Administrator',
          message: data.message,
        });
        
        console.log(`✅ Invitation email sent successfully to ${data.email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send invitation email to ${data.email}:`, emailError.message);
        
        // Don't fail the entire invitation process if email fails
        // The invitation is still created and can be resent later
        console.log(`⚠️ Invitation created but email failed. Token: ${invitationToken}`);
        
        // You might want to queue this for retry or notify admins
        // For now, we'll continue with the invitation creation
      }

      return invitation;
    } catch (error) {
      console.error('Failed to invite user:', error);
      throw error;
    }
  }

  // Accept invitation
  static async acceptInvitation(invitationToken, kindeUserId, userData) {
    try {
      return await db.transaction(async (tx) => {
        // Get invitation
        const [invitation] = await tx
          .select()
          .from(tenantInvitations)
          .where(and(
            eq(tenantInvitations.invitationToken, invitationToken),
            eq(tenantInvitations.status, 'pending')
          ))
          .limit(1);

        if (!invitation) {
          throw new Error('Invalid or expired invitation');
        }

        if (invitation.expiresAt < new Date()) {
          throw new Error('Invitation has expired');
        }

        // Create user
        const [user] = await tx.insert(tenantUsers).values({
          tenantId: invitation.tenantId,
          kindeUserId,
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar,
          isVerified: true,
        }).returning();

        // Assign role
        await tx.insert(userRoleAssignments).values({
          userId: user.userId,
          roleId: invitation.roleId,
          assignedBy: invitation.invitedBy,
        });

        // Update invitation status
        await tx
          .update(tenantInvitations)
          .set({
            status: 'accepted',
            acceptedAt: new Date(),
          })
          .where(eq(tenantInvitations.invitationId, invitation.invitationId));

        return user;
      });
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  }

  // Get pending invitations
  static async getPendingInvitations(tenantId) {
    return await db
      .select({
        invitation: tenantInvitations,
        role: customRoles,
      })
      .from(tenantInvitations)
      .leftJoin(customRoles, eq(tenantInvitations.roleId, customRoles.roleId))
      .where(and(
        eq(tenantInvitations.tenantId, tenantId),
        eq(tenantInvitations.status, 'pending')
      ))
      .orderBy(desc(tenantInvitations.createdAt));
  }

  // Cancel invitation
  static async cancelInvitation(invitationId, tenantId) {
    const [updated] = await db
      .update(tenantInvitations)
      .set({ status: 'cancelled' })
      .where(and(
        eq(tenantInvitations.invitationId, invitationId),
        eq(tenantInvitations.tenantId, tenantId)
      ))
      .returning();

    return updated;
  }

  // Resend invitation email
  static async resendInvitationEmail(invitationId, tenantId) {
    try {
      // Get invitation details
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.invitationId, invitationId),
          eq(tenantInvitations.tenantId, tenantId),
          eq(tenantInvitations.status, 'pending')
        ))
        .limit(1);

      if (!invitation) {
        throw new Error('Invitation not found or not pending');
      }

      // Check if invitation has expired
      if (invitation.expiresAt < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Get tenant and role details
      const tenant = await this.getTenantDetails(tenantId);
      const [role] = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.roleId, invitation.roleId))
        .limit(1);

      // Get inviter's name
      const [inviter] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, invitation.invitedBy))
        .limit(1);

      // Send invitation email
      await EmailService.sendUserInvitation({
        email: invitation.email,
        tenantName: tenant.companyName,
        roleName: role.roleName,
        invitationToken: invitation.invitationToken,
        invitedByName: inviter?.name || 'Team Administrator',
        message: invitation.message || '',
      });

      // Update invitation with new expiry (extend by 7 days)
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db
        .update(tenantInvitations)
        .set({ 
          expiresAt: newExpiresAt,
          updatedAt: new Date()
        })
        .where(eq(tenantInvitations.invitationId, invitationId));

      console.log(`✅ Invitation email resent successfully to ${invitation.email}`);
      return { success: true, message: 'Invitation email resent successfully' };

    } catch (error) {
      console.error('Failed to resend invitation email:', error);
      throw error;
    }
  }

  // Get default admin permissions
  static getDefaultAdminPermissions() {
    return {
      crm: {
        contacts: ['view', 'create', 'edit', 'delete', 'export', 'import'],
        deals: ['view', 'create', 'edit', 'delete', 'approve', 'reject'],
        reports: ['view', 'create', 'export', 'share', 'schedule'],
        settings: ['view', 'edit', 'manage_users'],
        dashboard: ['view', 'customize']
      },
      hr: {
        employees: ['view', 'create', 'edit', 'delete', 'view_salary'],
        payroll: ['view', 'process', 'approve', 'export'],
        documents: ['view', 'upload', 'delete', 'approve'],
        reports: ['view', 'create', 'export'],
        settings: ['view', 'edit']
      },
      affiliate: {
        partners: ['view', 'create', 'edit', 'delete', 'approve'],
        commissions: ['view', 'calculate', 'approve', 'pay', 'dispute'],
        analytics: ['view', 'export', 'create_reports'],
        settings: ['view', 'edit']
      },
      admin: {
        users: ['view', 'create', 'edit', 'delete', 'invite'],
        roles: ['view', 'create', 'edit', 'delete'],
        billing: ['view', 'manage'],
        settings: ['view', 'edit'],
        audit: ['view', 'export']
      }
    };
  }

  // Deactivate tenant
  static async deactivateTenant(tenantId, reason) {
    const [updated] = await db
      .update(tenants)
      .set({
        isActive: false,
        updatedAt: new Date(),
        settings: { deactivationReason: reason }
      })
      .where(eq(tenants.tenantId, tenantId))
      .returning();

    // Also deactivate all users
    await db
      .update(tenantUsers)
      .set({ isActive: false })
      .where(eq(tenantUsers.tenantId, tenantId));

    return updated;
  }

  // Reactivate tenant
  static async reactivateTenant(tenantId) {
    const [updated] = await db
      .update(tenants)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, tenantId))
      .returning();

    return updated;
  }

  // Get tenant users with consolidated invitation data
  static async getTenantUsers(tenantId) {
    try {
      console.log('🔍 Getting users for tenant:', tenantId);
      
      // Get active users
      const activeUsers = await db
        .select({
          userId: tenantUsers.userId,
          tenantId: tenantUsers.tenantId,
          kindeUserId: tenantUsers.kindeUserId,
          email: tenantUsers.email,
          name: tenantUsers.name,
          avatar: tenantUsers.avatar,
          title: tenantUsers.title,
          department: tenantUsers.department,
          isActive: tenantUsers.isActive,
          isVerified: tenantUsers.isVerified,
          isTenantAdmin: tenantUsers.isTenantAdmin,
          invitedAt: tenantUsers.invitedAt,
          lastActiveAt: tenantUsers.lastActiveAt,
          lastLoginAt: tenantUsers.lastLoginAt,
          loginCount: tenantUsers.loginCount,
          preferences: tenantUsers.preferences,
          onboardingCompleted: tenantUsers.onboardingCompleted,
          onboardingStep: tenantUsers.onboardingStep,
          createdAt: tenantUsers.createdAt,
          updatedAt: tenantUsers.updatedAt
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId))
        .orderBy(desc(tenantUsers.createdAt));

      // Get pending invitations
      const pendingInvitations = await db
        .select({
          invitationId: tenantInvitations.invitationId,
          tenantId: tenantInvitations.tenantId,
          email: tenantInvitations.email,
          roleId: tenantInvitations.roleId,
          invitedBy: tenantInvitations.invitedBy,
          invitationToken: tenantInvitations.invitationToken,
          invitationUrl: tenantInvitations.invitationUrl,
          status: tenantInvitations.status,
          expiresAt: tenantInvitations.expiresAt,
          acceptedAt: tenantInvitations.acceptedAt,
          cancelledAt: tenantInvitations.cancelledAt,
          cancelledBy: tenantInvitations.cancelledBy,
          createdAt: tenantInvitations.createdAt,
          updatedAt: tenantInvitations.updatedAt
        })
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenantId),
          eq(tenantInvitations.status, 'pending')
        ))
        .orderBy(desc(tenantInvitations.createdAt));

      // Get user role assignments
      const userIds = activeUsers.map(u => u.userId).filter(Boolean);
      const userRoleData = userIds.length > 0 ? await db
        .select({
          userId: userRoleAssignments.userId,
          roleId: userRoleAssignments.roleId,
          assignedAt: userRoleAssignments.assignedAt
        })
        .from(userRoleAssignments)
        .where(and(
          inArray(userRoleAssignments.userId, userIds),
          eq(userRoleAssignments.isActive, true)
        )) : [];

      // Get roles for users and invitations
      const roleIds = [
        ...(userRoleData || []).map(ur => ur.roleId),
        ...(pendingInvitations || []).map(i => i.roleId).filter(Boolean)
      ].filter(Boolean);

      const roles = roleIds.length > 0 ? await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          description: customRoles.description,
          color: customRoles.color
        })
        .from(customRoles)
        .where(inArray(customRoles.roleId, roleIds)) : [];

      const roleMap = new Map((roles || []).map(r => [r.roleId, r]));
      const userRoleMap = new Map((userRoleData || []).map(ur => [ur.userId, ur.roleId]));

      // Format active users
      const formattedUsers = activeUsers.map(user => {
        const userRoleId = userRoleMap.get(user.userId);
        const role = userRoleId ? roleMap.get(userRoleId) : null;
        return {
          id: user.userId,
          email: user.email,
          firstName: user.name.split(' ')[0] || user.email.split('@')[0],
          lastName: user.name.split(' ').slice(1).join(' ') || '',
          role: role?.roleName || 'No role assigned',
          isActive: user.isActive,
          invitationStatus: 'active',
          invitedAt: user.invitedAt || user.createdAt,
          expiresAt: null,
          lastActiveAt: user.lastActiveAt,
          invitationId: null,
          status: 'active',
          userType: 'active',
          originalData: {
            user: {
              userId: user.userId,
              tenantId: user.tenantId,
              kindeUserId: user.kindeUserId,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
              title: user.title,
              department: user.department,
              isActive: user.isActive,
              isVerified: user.isVerified,
              isTenantAdmin: user.isTenantAdmin,
              invitedAt: user.invitedAt,
              lastActiveAt: user.lastActiveAt,
              lastLoginAt: user.lastLoginAt,
              loginCount: user.loginCount,
              preferences: user.preferences,
              onboardingCompleted: user.onboardingCompleted,
              onboardingStep: user.onboardingStep,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            },
            role: role
          }
        };
      });

      // Format pending invitations
      const formattedInvitations = pendingInvitations.map(invitation => {
        const role = invitation.roleId ? roleMap.get(invitation.roleId) : null;
        return {
          id: `inv_${invitation.invitationId}`,
          email: invitation.email,
          firstName: invitation.email.split('@')[0],
          lastName: '',
          role: role?.roleName || 'No role assigned',
          isActive: false,
          invitationStatus: 'pending',
          invitedAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
          lastActiveAt: null,
          invitationId: invitation.invitationId,
          status: 'pending',
          userType: 'invited',
          originalData: {
            user: {
              invitationId: invitation.invitationId,
              tenantId: invitation.tenantId,
              email: invitation.email,
              roleId: invitation.roleId,
              invitedBy: invitation.invitedBy,
              invitationToken: invitation.invitationToken,
              invitationUrl: invitation.invitationUrl,
              status: invitation.status,
              expiresAt: invitation.expiresAt,
              acceptedAt: invitation.acceptedAt,
              cancelledAt: invitation.cancelledAt,
              cancelledBy: invitation.cancelledBy,
              createdAt: invitation.createdAt,
              updatedAt: invitation.updatedAt
            },
            role: role
          }
        };
      });

      // Combine and return
      const allUsers = [...formattedUsers, ...formattedInvitations];
      
      console.log(`✅ Found ${formattedUsers.length} active users and ${formattedInvitations.length} pending invitations`);
      
      return allUsers;
    } catch (error) {
      console.error('❌ Error getting tenant users:', error);
      throw error;
    }
  }

  // Unified user operations
  static async deleteUser(userId, tenantId) {
    // Check if this is an invited user (starts with 'inv_')
    if (userId.startsWith('inv_')) {
      const invitationId = userId.replace('inv_', '');
      return await this.cancelInvitation(tenantId, invitationId);
    } else {
      return await this.removeActiveUser(userId, tenantId);
    }
  }

  // Remove user from tenant (including invitation cancellation)
  static async removeUser(tenantId, userId, removedBy) {
    try {
      console.log('🗑️ Removing user from tenant:', { tenantId, userId, removedBy });
      
      // Check if this is an invitation ID (prefixed with 'inv_')
      if (typeof userId === 'string' && userId.startsWith('inv_')) {
        // This is an invitation ID, cancel the invitation instead
        const invitationId = userId.substring(4); // Remove 'inv_' prefix
        console.log('📧 Detected invitation ID, cancelling invitation:', invitationId);
        
        return await this.cancelInvitation(tenantId, invitationId, removedBy);
      }
      
      // Check if user exists in tenant
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (!user) {
        throw new Error('User not found in this tenant');
      }

      // Check if user is the last admin
      if (user.isTenantAdmin) {
        const adminCount = await db
          .select({ count: count() })
          .from(tenantUsers)
          .where(and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.isTenantAdmin, true),
            eq(tenantUsers.isActive, true)
          ));
        
        if (adminCount[0].count <= 1) {
          throw new Error('Cannot remove the last admin user from the tenant');
        }
      }

      // Start transaction
      const result = await db.transaction(async (tx) => {
        // 1. Remove user role assignments
        await tx
          .delete(userRoleAssignments)
          .where(and(
            eq(userRoleAssignments.userId, userId),
            eq(userRoleAssignments.roleId, sql`(
              SELECT role_id FROM custom_roles 
              WHERE tenant_id = ${tenantId}
            )`)
          ));

        // 2. Cancel any pending invitations for this user
        await tx
          .update(tenantInvitations)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: removedBy
          })
          .where(and(
            eq(tenantInvitations.tenantId, tenantId),
            eq(tenantInvitations.email, user.email),
            eq(tenantInvitations.status, 'pending')
          ));

        // 3. Remove the user from tenant_users
        await tx
          .delete(tenantUsers)
          .where(and(
            eq(tenantUsers.userId, userId),
            eq(tenantUsers.tenantId, tenantId)
          ));

        return { success: true, message: 'User removed successfully' };
      });

      console.log('✅ User removed successfully:', { userId, tenantId });
      return result;
    } catch (error) {
      console.error('❌ Error removing user:', error);
      throw error;
    }
  }

  // Cancel invitation
  static async cancelInvitation(tenantId, invitationId, cancelledBy) {
    try {
      console.log('❌ Cancelling invitation:', { tenantId, invitationId, cancelledBy });
      
      // Check if invitation exists and belongs to tenant
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.invitationId, invitationId),
          eq(tenantInvitations.tenantId, tenantId)
        ))
        .limit(1);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Can only cancel pending invitations');
      }

      // Cancel the invitation
      await db
        .update(tenantInvitations)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: cancelledBy
        })
        .where(eq(tenantInvitations.invitationId, invitationId));

      console.log('✅ Invitation cancelled successfully:', { invitationId, tenantId });
      return { success: true, message: 'Invitation cancelled successfully' };
    } catch (error) {
      console.error('❌ Error cancelling invitation:', error);
      throw error;
    }
  }

  // Remove active user
  static async removeActiveUser(userId, tenantId) {
    try {
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
        throw new Error('User not found');
      }

      return {
        success: true,
        message: 'User removed successfully',
        data: updatedUser
      };
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  // Update user role (works for both user types)
  static async updateUserRole(userId, roleId, tenantId) {
    try {
      if (userId.startsWith('inv_')) {
        // Update invitation role
        const invitationId = userId.replace('inv_', '');
        const [updatedInvitation] = await db
          .update(tenantInvitations)
          .set({ 
            roleId: roleId,
            updatedAt: new Date()
          })
          .where(and(
            eq(tenantInvitations.invitationId, invitationId),
            eq(tenantInvitations.tenantId, tenantId)
          ))
          .returning();

        if (!updatedInvitation) {
          throw new Error('Invitation not found');
        }

        return {
          success: true,
          message: 'Invitation role updated successfully',
          data: updatedInvitation
        };
      } else {
        // Update active user role
        // First remove existing role assignments
        await db
          .delete(userRoleAssignments)
          .where(and(
            eq(userRoleAssignments.userId, userId),
            eq(userRoleAssignments.tenantId, tenantId)
          ));

        // Add new role assignment
        const [newRoleAssignment] = await db
          .insert(userRoleAssignments)
          .values({
            userId: userId,
            roleId: roleId,
            tenantId: tenantId,
            assignedAt: new Date()
          })
          .returning();

        return {
          success: true,
          message: 'User role updated successfully',
          data: newRoleAssignment
        };
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  // Check subdomain availability
  static async checkSubdomainAvailability(subdomain) {
    const existing = await this.getBySubdomain(subdomain);
    return !existing;
  }

  // Get user by email in tenant - includes both active and invited users
  static async getUserByEmailInTenant(tenantId, email) {
    const [user] = await db
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.email, email)
      ))
      .limit(1);
    
    return user;
  }
}

export default TenantService; 