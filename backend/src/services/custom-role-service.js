import { db } from '../db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { applications, applicationModules, organizationApplications, userApplicationPermissions } from '../db/schema/suite-schema.js';
import { customRoles } from '../db/schema/index.js';

/**
 * 🏗️ **CUSTOM ROLE SERVICE**
 * Demonstrates how to use applications/modules tables to create custom roles
 * and why we need organization_applications and user_application_permissions
 */
export class CustomRoleService {
  
  /**
   * 1️⃣ **CREATE ROLE FROM APPLICATIONS & MODULES**
   * Shows how applications and modules tables are used for role creation
   */
  static async createRoleFromAppsAndModules({
    tenantId,
    roleName,
    description,
    selectedApps, // ['crm', 'hr']
    selectedModules, // { crm: ['leads', 'contacts'], hr: ['employees'] }
    selectedPermissions, // { 'crm.leads': ['read', 'create'], 'hr.employees': ['read'] }
    restrictions = {},
    metadata = {},
    createdBy = null // Will get a default user if not provided
  }) {
    
    console.log('🏗️ Creating custom role from apps and modules...');
    
    // 0. Get a default user for createdBy if not provided
    if (!createdBy) {
      const { tenantUsers } = await import('../db/schema/index.js');
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId))
        .limit(1);
      
      if (!user) {
        throw new Error(`No users found for tenant ${tenantId}. Cannot create role without a creator.`);
      }
      createdBy = user.userId;
      console.log(`📤 Using user ${user.email} as role creator`);
    }
    
    // 1. Get applications from database
    if (!selectedApps || selectedApps.length === 0) {
      throw new Error('No applications selected. Please select at least one application.');
    }
    
    const apps = await db
      .select()
      .from(applications)
      .where(inArray(applications.appCode, selectedApps));
    
    console.log(`📱 Found ${apps.length} applications:`, apps.map(a => a.appCode));
    
    // 2. Build permission list by iterating through apps and modules
    const permissions = [];
    const roleMetadata = {
      ...metadata,
      selectedApps,
      selectedModules,
      selectedPermissions,
      createdFrom: 'applications_modules',
      createdAt: new Date().toISOString()
    };
    
    for (const app of apps) {
      const appSelectedModules = selectedModules[app.appCode] || [];
      
      // Skip this app if no modules are selected
      if (appSelectedModules.length === 0) {
        console.log(`⚠️ App ${app.appCode} has no selected modules, skipping`);
        continue;
      }
      
      const appModules = await db
        .select()
        .from(applicationModules)
        .where(and(
          eq(applicationModules.appId, app.appId),
          inArray(applicationModules.moduleCode, appSelectedModules)
        ));
      
      console.log(`🧩 App ${app.appCode} has ${appModules.length} selected modules`);
      
      for (const module of appModules) {
        const moduleKey = `${app.appCode}.${module.moduleCode}`;
        const allowedPermissions = selectedPermissions[moduleKey] || [];
        
        // Add permissions for this module
        (module.permissions || []).forEach(permission => {
          if (allowedPermissions.includes(permission.code)) {
            const fullCode = `${app.appCode}.${module.moduleCode}.${permission.code}`;
            permissions.push(fullCode);
            console.log(`  ✅ Added permission: ${fullCode}`);
          }
        });
      }
    }
    
    // 3. Create custom role
    console.log('🔧 Processing restrictions for database (create):', {
      restrictionsType: typeof restrictions,
      restrictionsValue: restrictions,
      isString: typeof restrictions === 'string',
      isObject: typeof restrictions === 'object'
    });
    
    // Handle restrictions properly - avoid double-stringification
    let processedRestrictions;
    if (typeof restrictions === 'string') {
      console.log('🚨 Restrictions already a string, using as-is');
      processedRestrictions = restrictions;
    } else {
      console.log('📦 Restrictions is object, stringifying');
      processedRestrictions = JSON.stringify(restrictions);
    }
    
    const [role] = await db.insert(customRoles).values({
      tenantId,
      roleName,
      description,
      permissions: JSON.stringify(permissions), // Convert array to JSON string
      restrictions: processedRestrictions, // Handle restrictions properly
      isSystemRole: false, // This is a custom role
      createdBy,
      lastModifiedBy: createdBy
    }).returning();
    
    console.log(`🎉 Created role "${roleName}" with ${permissions.length} permissions`);
    return role;
  }
  
  /**
   * 1.5️⃣ **UPDATE ROLE FROM APPLICATIONS & MODULES**
   * Updates existing role using applications and modules selection
   */
  static async updateRoleFromAppsAndModules({
    tenantId,
    roleId,
    roleName,
    description,
    selectedApps, // ['crm', 'hr']
    selectedModules, // { crm: ['leads', 'contacts'], hr: ['employees'] }
    selectedPermissions, // { 'crm.leads': ['read', 'create'], 'hr.employees': ['read'] }
    restrictions = {},
    metadata = {},
    updatedBy = null // Will get a default user if not provided
  }) {
    
    console.log('🔄 Updating custom role from apps and modules...');
    
    // 0. Check if role exists and is not a system role
    const [existingRole] = await db
      .select()
      .from(customRoles)
      .where(and(
        eq(customRoles.roleId, roleId),
        eq(customRoles.tenantId, tenantId)
      ));
    
    if (!existingRole) {
      throw new Error('Role not found');
    }
    
    if (existingRole.isSystemRole) {
      throw new Error('Cannot modify system roles');
    }
    
    // 1. Get a default user for updatedBy if not provided
    if (!updatedBy) {
      const { tenantUsers } = await import('../db/schema/index.js');
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId))
        .limit(1);
      
      if (!user) {
        throw new Error(`No users found for tenant ${tenantId}. Cannot update role without an updater.`);
      }
      updatedBy = user.userId;
      console.log(`📤 Using user ${user.email} as role updater`);
    }
    
    // 2. Get applications from database
    if (!selectedApps || selectedApps.length === 0) {
      throw new Error('No applications selected. Please select at least one application.');
    }
    
    const apps = await db
      .select()
      .from(applications)
      .where(inArray(applications.appCode, selectedApps));
    
    console.log(`📱 Found ${apps.length} applications:`, apps.map(a => a.appCode));
    
    // 3. Build permission list by iterating through apps and modules
    const permissions = [];
    const roleMetadata = {
      ...metadata,
      selectedApps,
      selectedModules,
      selectedPermissions,
      updatedFrom: 'applications_modules',
      updatedAt: new Date().toISOString()
    };
    
    for (const app of apps) {
      const appSelectedModules = selectedModules[app.appCode] || [];
      
      // Skip this app if no modules are selected
      if (appSelectedModules.length === 0) {
        console.log(`⚠️ App ${app.appCode} has no selected modules, skipping`);
        continue;
      }
      
      const appModules = await db
        .select()
        .from(applicationModules)
        .where(and(
          eq(applicationModules.appId, app.appId),
          inArray(applicationModules.moduleCode, appSelectedModules)
        ));
      
      console.log(`🧩 App ${app.appCode} has ${appModules.length} selected modules`);
      
      for (const module of appModules) {
        const moduleKey = `${app.appCode}.${module.moduleCode}`;
        const allowedPermissions = selectedPermissions[moduleKey] || [];
        
        // Add permissions for this module
        (module.permissions || []).forEach(permission => {
          if (allowedPermissions.includes(permission.code)) {
            const fullCode = `${app.appCode}.${module.moduleCode}.${permission.code}`;
            permissions.push(fullCode);
            console.log(`  ✅ Updated permission: ${fullCode}`);
          }
        });
      }
    }
    
    // 4. Update custom role
    console.log('🔧 Processing restrictions for database:', {
      restrictionsType: typeof restrictions,
      restrictionsValue: restrictions,
      isString: typeof restrictions === 'string',
      isObject: typeof restrictions === 'object'
    });
    
    // Handle restrictions properly - avoid double-stringification
    let processedRestrictions;
    if (typeof restrictions === 'string') {
      console.log('🚨 Restrictions already a string, using as-is');
      processedRestrictions = restrictions;
    } else {
      console.log('📦 Restrictions is object, stringifying');
      processedRestrictions = JSON.stringify(restrictions);
    }
    
    const [updatedRole] = await db
      .update(customRoles)
      .set({
        roleName,
        description,
        permissions: JSON.stringify(permissions), // Convert array to JSON string
        restrictions: processedRestrictions, // Handle restrictions properly
        lastModifiedBy: updatedBy,
        updatedAt: new Date()
      })
      .where(and(
        eq(customRoles.roleId, roleId),
        eq(customRoles.tenantId, tenantId)
      ))
      .returning();
    
    console.log(`🎉 Updated role "${roleName}" with ${permissions.length} permissions`);
    return updatedRole;
  }
  
  /**
   * 2️⃣ **GET ROLE CREATION OPTIONS**
   * Shows why organization_applications table is needed - different orgs have different access
   */
  static async getRoleCreationOptions(tenantId) {
    console.log(`🔍 Getting role creation options for tenant: ${tenantId}`);
    
    // Get organization's available applications (WHY WE NEED ORGANIZATION_APPLICATIONS)
    // Different organizations may have access to different apps/modules even on same plan
    const orgApps = await db
      .select({
        appId: applications.appId,
        appCode: applications.appCode,
        appName: applications.appName,
        description: applications.description,
        enabledModules: organizationApplications.enabledModules,
        subscriptionTier: organizationApplications.subscriptionTier,
        isEnabled: organizationApplications.isEnabled
      })
      .from(applications)
      .innerJoin(organizationApplications, and(
        eq(organizationApplications.appId, applications.appId),
        eq(organizationApplications.tenantId, tenantId),
        eq(organizationApplications.isEnabled, true)
      ));
    
    console.log(`🏢 Organization has access to ${orgApps.length} applications`);
    
    // Get modules and permissions for each app
    const appsWithModules = await Promise.all(
      orgApps.map(async (app) => {
        const allModules = await db
          .select()
          .from(applicationModules)
          .where(eq(applicationModules.appId, app.appId));
        
        // Filter modules based on what organization has enabled
        const enabledModuleCodes = app.enabledModules || [];
        const availableModules = allModules.filter(module => 
          enabledModuleCodes.includes(module.moduleCode)
        );
        
        console.log(`  📦 ${app.appCode}: ${availableModules.length}/${allModules.length} modules available`);
        
        return {
          appId: app.appId,
          appCode: app.appCode,
          appName: app.appName,
          description: app.description,
          subscriptionTier: app.subscriptionTier,
          modules: availableModules.map(module => ({
            moduleId: module.moduleId,
            moduleCode: module.moduleCode,
            moduleName: module.moduleName,
            description: module.description,
            isCore: module.isCore,
            permissions: module.permissions || []
          }))
        };
      })
    );
    
    return appsWithModules;
  }
  
  /**
   * 3️⃣ **ASSIGN USER-SPECIFIC PERMISSIONS**
   * Shows why user_application_permissions table is needed - granular user-level control
   */
  static async assignUserSpecificPermissions({
    userId,
    tenantId,
    appCode,
    moduleCode,
    permissions, // ['delete', 'bulk_import'] - extra permissions beyond role
    reason = 'Custom access granted',
    expiresAt = null
  }) {
    console.log(`👤 Assigning user-specific permissions to user ${userId}`);
    
    // Get app and module IDs
    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.appCode, appCode));
    
    const [module] = await db
      .select()
      .from(applicationModules)
      .where(and(
        eq(applicationModules.appId, app.appId),
        eq(applicationModules.moduleCode, moduleCode)
      ));
    
    // Create or update user-specific permissions
    const [userPerm] = await db.insert(userApplicationPermissions).values({
      userId,
      tenantId,
      appId: app.appId,
      moduleId: module.moduleId,
      permissions,
      isActive: true,
      metadata: {
        reason,
        grantedAt: new Date().toISOString(),
        expiresAt
      }
    }).returning();
    
    console.log(`✅ Granted ${permissions.length} extra permissions to user`);
    return userPerm;
  }
  
  /**
   * 4️⃣ **COMPLETE PERMISSION RESOLUTION**
   * Shows how all tables work together to resolve final permissions
   */
  static async resolveUserPermissions({ userId, tenantId }) {
    console.log(`🔍 Resolving complete permissions for user ${userId}`);
    
    const allPermissions = new Set();
    const permissionSources = [];
    
    // 1. Get user's roles and their permissions
    const userRoles = await db
      .select()
      .from(customRoles)
      .where(and(
        eq(customRoles.tenantId, tenantId),
        eq(customRoles.isActive, true)
      ));
    
    userRoles.forEach(role => {
      if (role.permissions) {
        role.permissions.forEach(permission => {
          allPermissions.add(permission);
          permissionSources.push({
            source: 'role',
            roleName: role.roleName,
            permission
          });
        });
      }
    });
    
    // 2. Get organization applications (filter what's available)
    const orgApps = await db
      .select()
      .from(organizationApplications)
      .where(and(
        eq(organizationApplications.tenantId, tenantId),
        eq(organizationApplications.isEnabled, true)
      ));
    
    // 3. Get user-specific permissions (overrides)
    const userPerms = await db
      .select({
        permissions: userApplicationPermissions.permissions,
        appCode: applications.appCode,
        moduleCode: applicationModules.moduleCode,
        metadata: userApplicationPermissions.metadata
      })
      .from(userApplicationPermissions)
      .innerJoin(applications, eq(applications.appId, userApplicationPermissions.appId))
      .innerJoin(applicationModules, eq(applicationModules.moduleId, userApplicationPermissions.moduleId))
      .where(and(
        eq(userApplicationPermissions.userId, userId),
        eq(userApplicationPermissions.tenantId, tenantId),
        eq(userApplicationPermissions.isActive, true)
      ));
    
    userPerms.forEach(userPerm => {
      if (userPerm.permissions) {
        userPerm.permissions.forEach(permission => {
          const fullCode = `${userPerm.appCode}.${userPerm.moduleCode}.${permission}`;
          allPermissions.add(fullCode);
          permissionSources.push({
            source: 'user_override',
            reason: userPerm.metadata?.reason || 'Individual access',
            permission: fullCode
          });
        });
      }
    });
    
    console.log(`🎯 Resolved ${allPermissions.size} total permissions from ${permissionSources.length} sources`);
    
    return {
      permissions: Array.from(allPermissions),
      sources: permissionSources,
      summary: {
        totalPermissions: allPermissions.size,
        rolePermissions: permissionSources.filter(s => s.source === 'role').length,
        userOverrides: permissionSources.filter(s => s.source === 'user_override').length,
        organizationApps: orgApps.length
      }
    };
  }
  
  /**
   * 5️⃣ **PRACTICAL EXAMPLES - Why We Need Each Table**
   */
  static async demonstrateTableUsage() {
    console.log('\n🎯 **DEMONSTRATING WHY WE NEED EACH TABLE**\n');
    
    console.log('1️⃣ **APPLICATIONS & MODULES TABLES**');
    console.log('   → Define what exists in the system');
    console.log('   → Used to build role creation interfaces');
    console.log('   → Single source of truth for features\n');
    
    console.log('2️⃣ **ORGANIZATION_APPLICATIONS TABLE**');
    console.log('   → Controls what each tenant can access');
    console.log('   → Enables custom packages beyond standard plans');
    console.log('   → Example: Org A gets CRM+HR, Org B gets CRM+HR+Affiliate\n');
    
    console.log('3️⃣ **USER_APPLICATION_PERMISSIONS TABLE**');
    console.log('   → Individual user-level overrides');
    console.log('   → Temporary access for projects');
    console.log('   → Training restrictions for new users');
    console.log('   → Example: Senior manager gets extra "delete" permission\n');
    
    console.log('🔥 **TOGETHER THEY ENABLE:**');
    console.log('   ✅ Standard Plans (Starter, Pro, Enterprise)');
    console.log('   ✅ Custom Packages (Extra modules for specific orgs)');
    console.log('   ✅ Role-Based Access (Sales Manager, HR Specialist)');
    console.log('   ✅ Individual Overrides (Power users, temporary access)');
    console.log('   ✅ Compliance & Security (Restrictions and denials)');
  }
}

// Export helper functions for API routes
export default CustomRoleService; 