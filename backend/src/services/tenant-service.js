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
      await EmailService.sendUserInvitation({
        email: data.email,
        tenantName: tenant.companyName,
        roleName: role.roleName,
        invitationToken,
        invitedByName: inviter?.name || 'Team Administrator',
        message: data.message,
      });

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

  // Get tenant users with roles
  static async getTenantUsers(tenantId) {
    return await db
      .select({
        user: tenantUsers,
        role: customRoles,
      })
      .from(tenantUsers)
      .leftJoin(userRoleAssignments, eq(tenantUsers.userId, userRoleAssignments.userId))
      .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
      .where(eq(tenantUsers.tenantId, tenantId))
      .orderBy(tenantUsers.createdAt);
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