import { db } from '../db/index.js';
import { tenants, tenantUsers, subscriptions, userRoleAssignments, customRoles } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import kindeService from './kinde-service.js';
import CreditAllocationService from './credit-allocation-service.js';
import DNSManagementService from './dns-management-service.js';
import DomainVerificationService from './domain-verification-service.js';
import { PLAN_ACCESS_MATRIX } from '../data/permission-matrix.js';

class EnhancedOnboardingService {

  /**
   * Complete enhanced onboarding flow
   */
  async createEnhancedOrganization(onboardingData) {
    const {
      organizationName,
      gstin,
      mobile,
      adminEmail,
      adminName
    } = onboardingData;

    console.log('🚀 Starting enhanced onboarding for:', organizationName);

    // Step 1: Validate input data
    await this.validateOnboardingData(onboardingData);

    // Step 2: Check for existing organization/user
    await this.checkExistingEntities(gstin, adminEmail);

    // Step 3: Create Kinde organization
    console.log('🏢 Creating Kinde organization...');
    const kindeOrg = await this.createKindeOrganization({
      name: organizationName,
      gstin,
      adminEmail
    });

    // Step 4: Create database organization
    console.log('💾 Creating database organization...');
    const organization = await this.createDatabaseOrganization({
      ...onboardingData,
      kindeOrgId: kindeOrg.code
    });

    // Step 5: Set up free trial and credits
    console.log('🎁 Setting up free trial and credits...');
    const trialSetup = await this.setupTrialAndCredits(organization.tenantId);

    // Step 6: Create admin user first (needed for role creation)
    console.log('👤 Creating admin user...');
    const userSetup = await this.createAdminUser({
      organization,
      adminEmail,
      adminName
    });

    // Step 7: Create default roles and permissions (now with user ID)
    console.log('🔐 Creating Super Admin role with all permissions...');
    const roleSetup = await this.createDefaultRolesAndPermissions(organization.tenantId, userSetup.user.userId);

    // Step 8: Assign Super Admin role to user
    console.log('🔗 Assigning Super Admin role...');
    const roleAssignment = await this.assignAdminRole(userSetup.user.userId, roleSetup.superAdminRole.roleId, organization.tenantId);

    // Step 9: Create subdomain for tenant
    console.log('🌐 Creating subdomain for tenant...');
    const subdomainSetup = await this.createTenantSubdomain(organization.tenantId, organization.organizationName);

    // Step 10: Finalize onboarding
    console.log('✅ Finalizing onboarding...');
    const finalization = await this.finalizeOnboarding(organization.tenantId);

    return {
      success: true,
      message: 'Enhanced onboarding completed successfully',
      data: {
        tenantId: organization.tenantId,
        userId: userSetup.user.userId,
        kindeOrgId: kindeOrg.code,
        subdomain: subdomainSetup.subdomain,
        fullDomain: subdomainSetup.fullDomain,
        trialEndsAt: trialSetup.trialEnd,
        freeCredits: trialSetup.freeCredits,
        onboardingStatus: 'trial_active',
        nextStep: 'explore_system',
        accessToken: userSetup.accessToken,
        dnsSetup: {
          subdomain: subdomainSetup.subdomain,
          fullDomain: subdomainSetup.fullDomain,
          target: subdomainSetup.target,
          dnsChangeId: subdomainSetup.dnsChangeId
        }
      }
    };
  }

  /**
   * Validate onboarding input data
   */
  async validateOnboardingData(data) {
    const { organizationName, gstin, mobile, adminEmail } = data;

    // Validate GSTIN format
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(gstin)) {
      throw new Error('Invalid GSTIN format');
    }

    // Validate mobile number
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      throw new Error('Invalid mobile number format');
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      throw new Error('Invalid email format');
    }

    // Validate organization name
    if (!organizationName || organizationName.trim().length < 2) {
      throw new Error('Organization name must be at least 2 characters');
    }
  }

  /**
   * Check for existing organizations/users
   */
  async checkExistingEntities(gstin, adminEmail) {
    // Check GSTIN
    const existingOrg = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.gstin, gstin))
      .limit(1);

    if (existingOrg.length > 0) {
      throw new Error('Organization with this GSTIN already exists');
    }

    // Check admin email
    const existingUser = await db
      .select({ userId: tenantUsers.userId })
      .from(tenantUsers)
      .where(eq(tenantUsers.email, adminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }
  }

  /**
   * Create organization in Kinde
   */
  async createKindeOrganization(orgData) {
    try {
      const orgResult = await kindeService.createOrganization({
        name: orgData.name,
        external_id: `gstin_${orgData.gstin}`,
        // Add any additional Kinde-specific configuration
      });

      if (!orgResult.success) {
        throw new Error(`Kinde organization creation failed: ${orgResult.message}`);
      }

      console.log('✅ Kinde organization created:', orgResult.organization.code);
      return orgResult.organization;

    } catch (error) {
      console.error('❌ Kinde organization creation failed:', error);
      throw new Error(`Failed to create Kinde organization: ${error.message}`);
    }
  }

  /**
   * Create organization in database
   */
  async createDatabaseOrganization(orgData) {
    const tenantId = uuidv4();
    const subdomain = this.generateSubdomain(orgData.organizationName);

    const organization = await db.insert(tenants).values({
      tenantId,
      companyName: orgData.organizationName,
      gstin: orgData.gstin,
      mobile: orgData.mobile,
      adminEmail: orgData.adminEmail,
      subdomain,
      kindeOrgId: orgData.kindeOrgId,

      // Onboarding status
      onboardingStatus: 'trial_active',
      completedSteps: ['basic_info', 'organization_setup'],
      completionRequired: ['business_details', 'billing_info', 'payment_method'],

      // Trial and credit status
      trialStatus: 'active',
      trialStartedAt: new Date(),
      subscriptionStatus: 'trial',

      // Flags
      isActive: true,
      isVerified: false, // Will be verified during payment

      createdAt: new Date()
    }).returning();

    console.log('✅ Database organization created:', tenantId);
    return organization[0];
  }

  /**
   * Set up free trial and credits
   */
  async setupTrialAndCredits(tenantId) {
    const trialDays = 30;
    const freeCredits = 1000; // Configurable free credits
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    // Create trial subscription
    const subscription = await db.insert(subscriptions).values({
      tenantId,
      plan: 'trial',
      status: 'trialing',
      trialStart: new Date(),
      trialEnd,
      isTrialUser: true,
      trialStatus: 'active',
      subscribedTools: ['crm'], // Basic CRM access
      usageLimits: {
        apiCalls: 10000,
        storage: '5GB',
        users: 5
      },
      billingCycle: 'monthly',
      createdAt: new Date()
    }).returning();

    console.log('✅ Trial subscription created:', subscription[0].subscriptionId);

    // Allocate free credits using the credit allocation service
    const creditResult = await CreditAllocationService.allocateTrialCredits(tenantId, {
      creditAmount: freeCredits,
      trialDays
    });

    return {
      trialEnd,
      freeCredits,
      subscriptionId: subscription[0].subscriptionId,
      creditAllocation: creditResult
    };
  }

  /**
   * Create default roles and permissions
   * Creates only one Super Admin role with ALL permissions
   */
  async createDefaultRolesAndPermissions(tenantId, createdByUserId) {
    // Create one Super Admin role with ALL permissions
    const superAdminRole = {
      name: 'Super Admin',
      code: 'super_admin',
      permissions: [
        // CRM Application - All permissions
        'crm.*',
        'crm.leads.*',
        'crm.accounts.*',
        'crm.contacts.*',
        'crm.opportunities.*',
        'crm.quotations.*',
        'crm.invoices.*',
        'crm.inventory.*',
        'crm.product_orders.*',
        'crm.tickets.*',
        'crm.communications.*',
        'crm.calendar.*',
        'crm.ai_insights.*',
        'crm.dashboard.*',
        'crm.system.*',

        // HR Application - All permissions
        'hr.*',
        'hr.employees.*',
        'hr.payroll.*',
        'hr.leave.*',
        'hr.dashboard.*',

        // Affiliate Application - All permissions
        'affiliate.*',
        'affiliate.partners.*',
        'affiliate.commissions.*',

        // System-wide permissions
        'users.*',
        'settings.*',
        'reports.*',
        'system.*'
      ],
      isSystemRole: true,
      isDefault: true,
      priority: 1000 // Highest priority for super admin
    };

    const role = await db.insert(customRoles).values({
      tenantId,
      roleName: superAdminRole.name,
      roleCode: superAdminRole.code,
      description: 'Super Administrator with full access to all applications and features',
      permissions: this.mapPermissionsToCodes(superAdminRole.permissions),
      isSystemRole: superAdminRole.isSystemRole,
      isDefault: superAdminRole.isDefault,
      priority: superAdminRole.priority,
      scope: 'organization',
      isInheritable: true,
      createdBy: createdByUserId, // Created by the admin user
      createdAt: new Date()
    }).returning();

    const createdRole = {
      name: superAdminRole.name,
      roleId: role[0].roleId,
      permissions: superAdminRole.permissions
    };

    console.log('✅ Super Admin role created with all permissions');

    return {
      superAdminRole: createdRole,
      allRoles: [createdRole]
    };
  }

  /**
   * Create admin user
   */
  async createAdminUser({ organization, adminEmail, adminName }) {
    const userId = uuidv4();

    // Create user
    const user = await db.insert(tenantUsers).values({
      userId,
      tenantId: organization.tenantId,
      email: adminEmail,
      name: adminName,
      firstName: adminName.split(' ')[0],
      lastName: adminName.split(' ').slice(1).join(' ') || '',
      isTenantAdmin: true,
      isActive: true,
      onboardingCompleted: false, // Will complete during payment
      loginCount: 0,
      createdAt: new Date()
    }).returning();

    // Generate access token
    const accessToken = this.generateAccessToken(user[0]);

    console.log('✅ Admin user created:', userId);

    return {
      user: user[0],
      accessToken
    };
  }

  /**
   * Assign admin role to user
   */
  async assignAdminRole(userId, roleId, tenantId) {
    const roleAssignment = await db.insert(userRoleAssignments).values({
      userId,
      roleId,
      organizationId: tenantId,
      scope: 'organization',
      isResponsiblePerson: true,
      assignedBy: userId, // Self-assigned
      assignedAt: new Date(),
      isActive: true
    }).returning();

    console.log('✅ Admin role assigned to user:', userId);

    return roleAssignment[0];
  }

  /**
   * Finalize onboarding setup
   */
  async finalizeOnboarding(tenantId) {
    // Update organization with final setup details
    await db.update(tenants)
      .set({
        onboardingCompleted: false, // Will be completed during payment
        onboardingStep: 'trial_active',
        firstLoginAt: null, // Will be set on first login
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tenants.tenantId, tenantId));

    console.log('✅ Onboarding finalized for tenant:', tenantId);

    return {
      onboardingStatus: 'trial_active',
      setupCompleted: true
    };
  }

  /**
   * Generate subdomain from organization name
   */
  generateSubdomain(organizationName) {
    return organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20) +
      '-' +
      Date.now().toString(36).substring(0, 4);
  }

  /**
   * Map permission strings to codes
   */
  mapPermissionsToCodes(permissions) {
    // This would map the permission strings to actual permission codes
    // For now, return the permissions as-is
    return permissions;
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.userId,
        tenantId: user.tenantId,
        email: user.email,
        isTenantAdmin: user.isTenantAdmin,
        type: 'enhanced_onboarding'
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' } // 7 days for trial period
    );
  }

  /**
   * Create subdomain for tenant
   */
  async createTenantSubdomain(tenantId, organizationName) {
    try {
      // Check if AWS credentials are available
      const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID &&
                               process.env.AWS_SECRET_ACCESS_KEY &&
                               process.env.AWS_REGION &&
                               process.env.AWS_HOSTED_ZONE_ID;

      if (!hasAWSCredentials) {
        console.warn('⚠️ AWS credentials not configured, skipping subdomain creation');
        // Return mock data for testing
        const mockSubdomain = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '') + '-test';

        return {
          subdomain: mockSubdomain,
          fullDomain: `${mockSubdomain}.myapp.com`,
          target: 'myapp.com',
          dnsChangeId: 'mock-dns-change-id',
          isMock: true
        };
      }

      const subdomainResult = await DNSManagementService.createTenantSubdomain(tenantId);

      return {
        subdomain: subdomainResult.subdomain,
        fullDomain: subdomainResult.fullDomain,
        target: subdomainResult.target,
        dnsChangeId: subdomainResult.dnsChangeId,
        isMock: false
      };

    } catch (error) {
      console.error('❌ Subdomain creation failed in onboarding:', error);
      // Don't fail the entire onboarding if subdomain creation fails
      // Just log the error and continue
      return {
        subdomain: null,
        fullDomain: null,
        target: null,
        dnsChangeId: null,
        error: error.message,
        isMock: false
      };
    }
  }

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(tenantId) {
    const organization = await db
      .select({
        tenantId: tenants.tenantId,
        onboardingStatus: tenants.onboardingStatus,
        completedSteps: tenants.completedSteps,
        completionRequired: tenants.completionRequired,
        trialStatus: tenants.trialStatus,
        trialStartedAt: tenants.trialStartedAt,
        subscriptionStatus: tenants.subscriptionStatus
      })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    if (organization.length === 0) {
      throw new Error('Organization not found');
    }

    const org = organization[0];
    const trialEnd = new Date(org.trialStartedAt);
    trialEnd.setDate(trialEnd.getDate() + 30);

    return {
      ...org,
      trialEndsAt: trialEnd,
      daysRemaining: Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24))),
      nextStep: this.determineNextStep(org)
    };
  }

  /**
   * Determine next step in onboarding
   */
  determineNextStep(organization) {
    if (organization.onboardingStatus === 'trial_active') {
      if (organization.trialStatus === 'expired') {
        return 'upgrade_required';
      }
      return 'explore_system';
    }

    if (organization.onboardingStatus === 'payment_pending') {
      return 'complete_payment';
    }

    if (organization.onboardingStatus === 'completed') {
      return 'dashboard';
    }

    return 'unknown';
  }
}

export default new EnhancedOnboardingService();
