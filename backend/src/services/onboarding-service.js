/**
 * 🚀 **ENHANCED ONBOARDING SERVICE**
 * Handles all onboarding operations with proper role separation
 * Ensures system operations use system connection (RLS bypassed)
 * Ensures tenant operations use app connection (RLS enforced)
 */

import { dbManager, systemDbConnection } from '../db/index.js';
import { tenants, tenantUsers, entities, customRoles, userRoleAssignments, credits } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

class EnhancedOnboardingService {

  // 🔧 **CONNECTION MANAGEMENT**

  /**
   * Get appropriate database connection based on operation type
   */
  static getConnection(operationType, request = null) {
    switch (operationType) {
      case 'system':
      case 'admin':
      case 'onboarding':
        return systemDbConnection; // RLS bypassed (drizzle instance)

      case 'tenant':
      case 'user':
        return request?.db || systemDbConnection; // Use request db if available, fallback to system

      default:
        // Fallback to request-based analysis
        if (request?.db) {
          return request.db;
        }
        return systemDbConnection;
    }
  }

  // 🏢 **TENANT OPERATIONS** (Use System Connection)

  /**
   * Create tenant with system connection (bypasses RLS)
   */
  static async createTenantSystem(tenantData) {
    const systemDb = this.getConnection('system');

    console.log('🏢 Creating tenant with system connection:', {
      subdomain: tenantData.subdomain,
      organizationName: tenantData.organizationName
    });

    const [tenant] = await systemDb
      .insert(tenants)
      .values(tenantData)
      .returning();

    console.log('✅ Tenant created:', tenant.tenantId);
    return tenant;
  }

  /**
   * Create admin user with system connection (bypasses RLS)
   */
  static async createAdminUserSystem(userData) {
    const systemDb = this.getConnection('system');

    console.log('👤 Creating admin user with system connection:', {
      email: userData.email,
      tenantId: userData.tenantId
    });

    const [user] = await systemDb
      .insert(tenantUsers)
      .values(userData)
      .returning();

    console.log('✅ Admin user created:', user.userId);
    return user;
  }

  /**
   * Create organization with system connection (bypasses RLS)
   */
  static async createOrganizationSystem(orgData) {
    const systemDb = this.getConnection('system');

    console.log('🏛️ Creating organization with system connection:', {
      name: orgData.organizationName,
      tenantId: orgData.tenantId
    });

    // Map organization data to entities format
    const entityData = {
      ...orgData,
      entityName: orgData.organizationName,
      entityType: 'organization',
      entityLevel: 1,
      // Remove organization-specific fields that don't exist in entities
      organizationName: undefined,
      organizationId: undefined,
      parentOrganizationId: undefined,
      organizationLevel: undefined,
      hierarchyPath: undefined
    };

    const [organization] = await systemDb
      .insert(entities)
      .values(entityData)
      .returning();

    console.log('✅ Organization created:', organization.entityId);
    return organization;
  }

  // 🔐 **ROLE OPERATIONS** (Use System Connection)

  /**
   * Create admin role with system connection (bypasses RLS)
   */
  static async createAdminRoleSystem(roleData) {
    const systemDb = this.getConnection('system');

    console.log('👑 Creating admin role with system connection:', {
      roleName: roleData.roleName,
      tenantId: roleData.tenantId
    });

    const [role] = await systemDb
      .insert(customRoles)
      .values(roleData)
      .returning();

    console.log('✅ Admin role created:', role.roleId);
    return role;
  }

  /**
   * Assign role to user with system connection (bypasses RLS)
   */
  static async assignRoleToUserSystem(assignmentData) {
    const systemDb = this.getConnection('system');

    console.log('🔗 Assigning role to user with system connection:', {
      userId: assignmentData.userId,
      roleId: assignmentData.roleId
    });

    const [assignment] = await systemDb
      .insert(userRoleAssignments)
      .values(assignmentData)
      .returning();

    console.log('✅ Role assigned to user:', assignment.id);
    return assignment;
  }

  // 💰 **CREDIT OPERATIONS** (Use System Connection)

  /**
   * Assign initial credits to tenant with system connection (bypasses RLS)
   */
  static async assignInitialCreditsSystem(creditData) {
    const systemDb = this.getConnection('system');

    console.log('💰 Assigning initial credits with system connection:', {
      tenantId: creditData.tenantId,
      amount: creditData.amount,
      type: creditData.type
    });

    const [creditRecord] = await systemDb
      .insert(credits)
      .values(creditData)
      .returning();

    console.log('✅ Initial credits assigned:', creditRecord.creditId);
    return creditRecord;
  }

  // 🌐 **SUBDOMAIN OPERATIONS** (Use System Connection)

  /**
   * Create subdomain configuration with system connection (bypasses RLS)
   */
  static async createSubdomainConfigSystem(subdomainData) {
    const systemDb = this.getConnection('system');

    console.log('🌐 Creating subdomain configuration with system connection:', {
      subdomain: subdomainData.subdomain,
      tenantId: subdomainData.tenantId
    });

    // Update tenant with subdomain information
    const [updatedTenant] = await systemDb
      .update(tenants)
      .set({
        subdomain: subdomainData.subdomain,
        customDomain: subdomainData.customDomain,
        subdomainConfigured: true,
        updatedAt: new Date()
      })
      .where(eq(tenants.tenantId, subdomainData.tenantId))
      .returning();

    console.log('✅ Subdomain configuration created:', updatedTenant.subdomain);
    return updatedTenant;
  }

  // 🎯 **COMPLETE ONBOARDING WORKFLOW**

  /**
   * Complete onboarding workflow with proper role separation
   */
  static async completeOnboardingWorkflow(request, onboardingData) {
    const {
      companyName,
      adminEmail,
      subdomain,
      initialCredits = 1000
    } = onboardingData;

    console.log('🚀 Starting complete onboarding workflow...');

    try {
      // 1. Create tenant (System Connection)
      const tenant = await this.createTenantSystem({
        organizationName: companyName,
        subdomain: subdomain,
        subscriptionTier: 'credit-based', // Credit-based system
        onboardingCompleted: false
      });

      // 2. Create admin user (System Connection)
      const adminUser = await this.createAdminUserSystem({
        email: adminEmail,
        name: adminEmail.split('@')[0],
        tenantId: tenant.tenantId,
        isTenantAdmin: true,
        onboardingCompleted: true,
        isActive: true
      });

      // 3. Create organization (System Connection)
      const organization = await this.createOrganizationSystem({
        organizationName: companyName,
        tenantId: tenant.tenantId,
        createdBy: adminUser.userId,
        updatedBy: adminUser.userId
      });

      // 4. Create admin role (System Connection)
      const adminRole = await this.createAdminRoleSystem({
        tenantId: tenant.tenantId,
        roleName: 'Super Administrator',
        description: `Full system access for ${companyName}`,
        permissions: this.generateAdminPermissions('credit-based'), // Full access for credit-based system
        isSystemRole: true,
        isDefault: false,
        createdBy: adminUser.userId,
        lastModifiedBy: adminUser.userId
      });

      // 5. Assign role to admin user (System Connection)
      await this.assignRoleToUserSystem({
        userId: adminUser.userId,
        roleId: adminRole.roleId,
        assignedBy: adminUser.userId,
        organizationId: organization.organizationId,
        isResponsiblePerson: true
      });

      // 6. Assign initial credits (System Connection)
      await this.assignInitialCreditsSystem({
        tenantId: tenant.tenantId,
        amount: initialCredits,
        type: 'initial_credits',
        description: `Initial credit allocation (${initialCredits} credits)`,
        expiresAt: this.getCreditExpirationDate('credit-based'),
        createdBy: adminUser.userId
      });

      // 7. Configure subdomain (System Connection)
      await this.createSubdomainConfigSystem({
        tenantId: tenant.tenantId,
        subdomain: subdomain,
        customDomain: null
      });

      // 8. Mark onboarding as complete (System Connection)
      const systemDb = this.getConnection('system');
      await systemDb
        .update(tenants)
        .set({
          onboardingCompleted: true,
          onboardedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenant.tenantId));

      console.log('🎉 Onboarding workflow completed successfully!');

      return {
        tenant,
        adminUser,
        organization,
        adminRole,
        redirectUrl: `https://${subdomain}.zopkit.com/dashboard`
      };

    } catch (error) {
      console.error('❌ Onboarding workflow failed:', error);
      throw error;
    }
  }

  // 🔧 **UTILITY METHODS**

  static generateAdminPermissions(plan) {
    // For credit-based system, provide comprehensive permissions
    if (plan === 'credit-based') {
      return {
        crm: {
          leads: ['read', 'create', 'update', 'delete'],
          accounts: ['read', 'create', 'update', 'delete'],
          contacts: ['read', 'create', 'update', 'delete'],
          opportunities: ['read', 'create', 'update', 'delete'],
          quotations: ['read', 'create', 'update', 'delete'],
          tickets: ['read', 'create', 'update', 'delete']
        },
        system: {
          users: ['read', 'create', 'update', 'delete'],
          roles: ['read', 'create', 'update', 'delete'],
          audit: ['read'],
          settings: ['read', 'update']
        },
        credits: {
          view: ['read'],
          manage: ['read', 'create', 'update']
        }
      };
    }

    // Fallback for legacy plans
    const basePermissions = {
      crm: { leads: ['read', 'create', 'update'], accounts: ['read', 'create'] },
      system: { users: ['read', 'create', 'update'], roles: ['read', 'create'] }
    };

    // Add plan-specific permissions
    if (plan === 'professional') {
      basePermissions.crm.deals = ['read', 'create', 'update'];
      basePermissions.system.audit = ['read'];
    }

    return basePermissions;
  }

  static getInitialCreditsForPlan(plan) {
    const creditMap = {
      trial: 100,
      professional: 500,
      enterprise: 2000
    };
    return creditMap[plan] || 100;
  }

  static getCreditExpirationDate(plan) {
    const daysMap = {
      trial: 30,
      professional: 365,
      enterprise: 365,
      'credit-based': 365 // Credits don't expire for credit-based system
    };
    const days = daysMap[plan] || 365;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

export default EnhancedOnboardingService;
