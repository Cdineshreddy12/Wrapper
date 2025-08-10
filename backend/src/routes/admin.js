import { db } from '../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, auditLogs, subscriptions } from '../db/schema/index.js';
import { eq, count as dbCount, and, or, like, sql, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import kindeService from '../services/kinde-service.js';
import EmailService from '../utils/email.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { checkUserLimit } from '../middleware/planRestrictions.js';
import { deleteTenantData, deleteTenantsByDomain, getTenantDataSummary } from '../utils/tenant-cleanup.js';
import Logger from '../utils/logger.js';
import trialManager from '../utils/trial-manager.js';
import ErrorResponses from '../utils/error-responses.js';

export default async function adminRoutes(fastify, options) {
  // Debug auth status endpoint
  fastify.get('/auth-status', async (request, reply) => {
    try {
      console.log('🔍 Admin Auth Status Check');
      console.log('📋 Request User Context:', {
        isAuthenticated: request.userContext?.isAuthenticated,
        userId: request.userContext?.userId,
        internalUserId: request.userContext?.internalUserId,
        tenantId: request.userContext?.tenantId,
        email: request.userContext?.email,
        isTenantAdmin: request.userContext?.isTenantAdmin
      });
      
      // If user is not authenticated, return basic status
      if (!request.userContext?.isAuthenticated) {
        console.log('❌ User not authenticated, returning basic status');
        return {
          success: true,
          authStatus: {
            isAuthenticated: false
          }
        };
      }

      // Get user permissions and roles
      let userPermissions = [];
      let userRoles = [];
      let legacyPermissions = []; // Simple permission names - declare at proper scope
      
      console.log('🔍 Fetching user permissions for:', {
        internalUserId: request.userContext.internalUserId,
        tenantId: request.userContext.tenantId
      });
      
      if (request.userContext.internalUserId && request.userContext.tenantId) {
        try {
          // Get user roles
          const roles = await db
            .select({
              roleId: customRoles.roleId,
              roleName: customRoles.roleName,
              description: customRoles.description,
              permissions: customRoles.permissions,
              isSystemRole: customRoles.isSystemRole
            })
            .from(userRoleAssignments)
            .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
            .where(eq(userRoleAssignments.userId, request.userContext.internalUserId));

          userRoles = roles;
          console.log('📝 User roles found:', userRoles.map(r => ({
            roleId: r.roleId,
            roleName: r.roleName,
            isSystemRole: r.isSystemRole,
            hasPermissions: !!r.permissions
          })));

          // Aggregate permissions from all roles
          const aggregatedPermissions = {};
          
          for (const role of roles) {
            console.log(`🔍 Processing role: ${role.roleName} (${role.roleId})`);
            
            if (role.permissions) {
              let rolePermissions;
              try {
                // Handle both object and string data types
                if (typeof role.permissions === 'object' && role.permissions !== null) {
                  rolePermissions = role.permissions;
                } else if (typeof role.permissions === 'string' && role.permissions) {
                  rolePermissions = JSON.parse(role.permissions);
                } else {
                  rolePermissions = {};
                }
                
                console.log(`📋 Raw permissions for role ${role.roleName}:`, Object.keys(rolePermissions));
              } catch (parseError) {
                console.error(`❌ Failed to parse permissions for role ${role.roleName}:`, parseError);
                continue;
              }

              // Merge permissions
              Object.keys(rolePermissions).forEach(resource => {
                if (resource === 'metadata' || resource === 'inheritance' || resource === 'restrictions') {
                  console.log(`⏭️ Skipping non-permission object: ${resource}`);
                  return; // Skip non-permission objects
                }
                
                const permission = rolePermissions[resource];
                console.log(`🔍 Processing resource: ${resource}`, {
                  hasPermission: !!permission,
                  hasOperations: !!(permission && permission.operations),
                  operationsCount: permission?.operations?.length || 0
                });
                
                if (permission && permission.operations) {
                  permission.operations.forEach(operation => {
                    // Create structured permission object
                    const permissionExists = userPermissions.find(p => p.name === operation);
                    if (!permissionExists) {
                      const newPermission = {
                        id: operation,
                        name: operation,
                        description: `${permission.level} access to ${resource}`,
                        resource: resource,
                        level: permission.level
                      };
                      userPermissions.push(newPermission);
                      console.log(`➕ Added permission: ${operation} (${resource})`);
                    } else {
                      console.log(`⏭️ Permission already exists: ${operation}`);
                    }

                    // Extract simple permission names for legacy B2B CRM compatibility
                    const simplePermName = operation.split('.').pop(); // Get last part (e.g., 'view' from 'crm.accounts.view')
                    if (simplePermName && !legacyPermissions.includes(simplePermName)) {
                      legacyPermissions.push(simplePermName);
                      console.log(`➕ Added legacy permission: ${simplePermName}`);
                    }

                    // Add module-based permission format for drag-drop system
                    const parts = operation.split('.');
                    if (parts.length >= 3) {
                      const [app, module, action] = parts;
                      const modulePermName = `${app}.${module}.${action}`;
                      const modulePermExists = userPermissions.find(p => p.name === modulePermName);
                      if (!modulePermExists) {
                        const modulePermission = {
                          id: modulePermName,
                          name: modulePermName,
                          description: `${action} access to ${module} in ${app}`,
                          resource: module,
                          level: permission.level,
                          app: app,
                          module: module,
                          action: action
                        };
                        userPermissions.push(modulePermission);
                        console.log(`➕ Added module permission: ${modulePermName}`);
                      }
                    }
                  });
                }
              });
            }
          }

          console.log(`📊 Total permissions aggregated: ${userPermissions.length}`);
          console.log(`📊 Legacy permissions: ${legacyPermissions.length}`);

        } catch (permissionError) {
          console.error('❌ Error fetching user permissions:', permissionError);
        }
      }

      return {
        success: true,
        authStatus: {
          isAuthenticated: true,
          userId: request.userContext.userId,
          internalUserId: request.userContext.internalUserId,
          tenantId: request.userContext.tenantId,
          email: request.userContext.email,
          isTenantAdmin: request.userContext.isTenantAdmin,
          needsOnboarding: request.userContext.needsOnboarding,
          onboardingCompleted: request.userContext.onboardingCompleted,
          userPermissions,
          userRoles,
          legacyPermissions
        }
      };
    } catch (error) {
      console.error('❌ Error in auth status check:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get auth status',
        message: error.message
      });
    }
  });

  // Invite user endpoint (legacy path)
  fastify.post('/invite-user', {
    preHandler: [authenticateToken, checkUserLimit]
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = Logger.generateRequestId('user-invite');

    try {
      console.log('\n👤 ================ USER INVITATION STARTED ================');
      console.log(`📋 Request ID: ${requestId}`);
      console.log(`⏰ Timestamp: ${Logger.getTimestamp()}`);
      console.log(`👤 Inviting user by: ${request.userContext.email}`);

      const { email, name, roleIds } = request.body;
      const tenantId = request.userContext.tenantId;

      Logger.user.invite(requestId, email, name, roleIds, tenantId);

      console.log(`📧 [${requestId}] Invitation Data:`, {
        email,
        name,
        roleIds,
        tenantId
      });

      console.log(`📧 [${requestId}] Validation: Validating input data`);

      if (!email || !name) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields',
          message: 'Email and name are required'
        });
      }

      if (!tenantId) {
        return reply.code(400).send({
          success: false,
          error: 'No tenant context',
          message: 'Unable to determine tenant for invitation'
        });
      }

      console.log(`✅ [${requestId}] Input validation successful`);

      // Check if user already exists in this tenant
      console.log(`🔍 [${requestId}] Checking if user already exists in tenant`);
      const existingUser = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.email, email)
        ))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`⚠️ [${requestId}] User already exists in tenant`);
        return reply.code(409).send({
          success: false,
          error: 'User already exists',
          message: 'This user is already a member of your organization'
        });
      }

      console.log(`✅ [${requestId}] User does not exist in tenant - proceeding with invitation`);

      // Send invitation email
      console.log(`📧 [${requestId}] Sending invitation email to: ${email}`);
      const emailResult = await EmailService.sendUserInvitation({
        email,
        name,
        tenantId,
        inviterName: request.userContext.email,
        roleIds
      });

      if (emailResult.success) {
        console.log(`✅ [${requestId}] Invitation email sent successfully`);
      } else {
        console.warn(`⚠️ [${requestId}] Failed to send invitation email: ${emailResult.error}`);
      }

      console.log(`🎉 [${requestId}] USER INVITATION COMPLETED SUCCESSFULLY!`);
      console.log(`⏱️ [${requestId}] Total processing time: ${Logger.getDuration(startTime)}`);
      console.log('👤 ================ USER INVITATION ENDED ================\n');

      return {
        success: true,
        message: 'User invitation sent successfully',
        requestId,
        duration: Logger.getDuration(startTime)
      };

    } catch (error) {
      console.error(`❌ [${requestId}] USER INVITATION FAILED!`);
      console.error(`📋 [${requestId}] Error Message: ${error.message}`);
      console.error(`🔢 [${requestId}] Error Code: ${error.code}`);
      console.error(`📋 [${requestId}] Stack Trace: ${error.stack}`);
      console.log(`⏱️ [${requestId}] Failed after: ${Logger.getDuration(startTime)}`);
      console.log('👤 ================ USER INVITATION FAILED ================\n');

      return reply.code(500).send({
        success: false,
        error: 'Failed to invite user',
        message: error.message,
        requestId
      });
    }
  });

  // ================ TRIAL MANAGEMENT ENDPOINTS ================
  
  // Manually trigger trial expiry check (FOR TESTING)
  fastify.post('/trials/check-expired', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = Logger.generateRequestId('manual-trial-check');
    
    try {
      console.log('\n🔧 ================ MANUAL TRIAL EXPIRY CHECK ================');
      console.log(`📋 Request ID: ${requestId}`);
      console.log(`👤 Requested by: ${request.userContext.email}`);
      console.log(`⏰ Timestamp: ${Logger.getTimestamp()}`);
      
      await trialManager.checkExpiredTrials();
      
      console.log(`✅ [${requestId}] Manual trial expiry check completed`);
      console.log(`⏱️ [${requestId}] Duration: ${Logger.getDuration(startTime)}`);
      console.log('🔧 ================ MANUAL TRIAL CHECK ENDED ================\n');

      return {
        success: true,
        message: 'Trial expiry check completed successfully',
        requestId,
        duration: Logger.getDuration(startTime)
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Manual trial expiry check failed:`, error);
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to check expired trials',
        message: error.message,
        requestId
      });
    }
  });

  // Manually trigger trial reminders (FOR TESTING)
  fastify.post('/trials/send-reminders', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = Logger.generateRequestId('manual-trial-reminders');
    
    try {
      console.log('\n📧 ================ MANUAL TRIAL REMINDERS ================');
      console.log(`📋 Request ID: ${requestId}`);
      console.log(`👤 Requested by: ${request.userContext.email}`);
      console.log(`⏰ Timestamp: ${Logger.getTimestamp()}`);
      
      await trialManager.sendTrialReminders();
      
      console.log(`✅ [${requestId}] Manual trial reminders completed`);
      console.log(`⏱️ [${requestId}] Duration: ${Logger.getDuration(startTime)}`);
      console.log('📧 ================ MANUAL REMINDERS ENDED ================\n');

      return {
        success: true,
        message: 'Trial reminders sent successfully',
        requestId,
        duration: Logger.getDuration(startTime)
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Manual trial reminders failed:`, error);
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to send trial reminders',
        message: error.message,
        requestId
      });
    }
  });

  // Manually expire a specific trial (FOR TESTING)
  fastify.post('/trials/:tenantId/expire', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = Logger.generateRequestId('manual-trial-expire');
    const { tenantId } = request.params;
    
    try {
      console.log('\n⏰ ================ MANUAL TRIAL EXPIRY ================');
      console.log(`📋 Request ID: ${requestId}`);
      console.log(`🏢 Target Tenant: ${tenantId}`);
      console.log(`👤 Requested by: ${request.userContext.email}`);
      console.log(`⏰ Timestamp: ${Logger.getTimestamp()}`);
      
      // Additional safety - only allow in development/test environment
      if (process.env.NODE_ENV === 'production') {
        return reply.code(403).send({
          success: false,
          error: 'Operation not allowed in production',
          message: 'Manual trial expiry is only allowed in development/test environments'
        });
      }
      
      await trialManager.manuallyExpireTrial(tenantId);
      
      console.log(`✅ [${requestId}] Manual trial expiry completed for tenant: ${tenantId}`);
      console.log(`⏱️ [${requestId}] Duration: ${Logger.getDuration(startTime)}`);
      console.log('⏰ ================ MANUAL EXPIRY ENDED ================\n');

      return {
        success: true,
        message: `Trial expired successfully for tenant: ${tenantId}`,
        tenantId,
        requestId,
        duration: Logger.getDuration(startTime)
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Manual trial expiry failed for tenant ${tenantId}:`, error);
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to expire trial',
        message: error.message,
        tenantId,
        requestId
      });
    }
  });

  // Get trial status for a specific tenant
  fastify.get('/trials/:tenantId/status', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('trial-status');
    const { tenantId } = request.params;
    
    try {
      console.log(`🔍 [${requestId}] Getting trial status for tenant: ${tenantId}`);
      
      const trialStatus = await trialManager.getTrialStatus(tenantId);
      
      console.log(`✅ [${requestId}] Trial status retrieved for tenant: ${tenantId}`);
      console.log(`📊 [${requestId}] Status:`, trialStatus);

      return {
        success: true,
        data: trialStatus,
        tenantId,
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to get trial status for tenant ${tenantId}:`, error);
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to get trial status',
        message: error.message,
        tenantId,
        requestId
      });
    }
  });

  // Get current tenant's trial status
  fastify.get('/trials/current/status', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('current-trial-status');
    const tenantId = request.userContext.tenantId;
    
    try {
      if (!tenantId) {
        return reply.code(400).send({
          success: false,
          error: 'No tenant context',
          message: 'Unable to determine current tenant'
        });
      }
      
      console.log(`🔍 [${requestId}] Getting current trial status for tenant: ${tenantId}`);
      
      const trialStatus = await trialManager.getTrialStatus(tenantId);
      const expiryCheck = await trialManager.isTrialExpired(tenantId);
      
      console.log(`✅ [${requestId}] Current trial status retrieved`);
      console.log(`📊 [${requestId}] Status:`, trialStatus);
      console.log(`🔒 [${requestId}] Expiry Check:`, expiryCheck);

      return {
        success: true,
        data: {
          ...trialStatus,
          expiryCheck,
          restrictionsActive: expiryCheck.expired
        },
        tenantId,
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to get current trial status:`, error);
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to get current trial status',
        message: error.message,
        requestId
      });
    }
  });

  // Quick test endpoint to set trial to expire in 1 minute (FOR TESTING ONLY)
  fastify.post('/trials/:tenantId/expire-in-one-minute', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const startTime = Date.now();
    const requestId = Logger.generateRequestId('quick-trial-expire');
    const { tenantId } = request.params;
    
    try {
      console.log('\n⚡ ================ QUICK TRIAL EXPIRY TEST ================');
      console.log(`📋 Request ID: ${requestId}`);
      console.log(`🏢 Target Tenant: ${tenantId}`);
      console.log(`👤 Requested by: ${request.userContext.email}`);
      console.log(`⏰ Timestamp: ${Logger.getTimestamp()}`);
      
      // Additional safety - only allow in development/test environment
      if (process.env.NODE_ENV === 'production') {
        return reply.code(403).send({
          success: false,
          error: 'Operation not allowed in production',
          message: 'Quick trial expiry is only allowed in development/test environments'
        });
      }

      // Set trial to expire in 1 minute
      const oneMinuteFromNow = new Date(Date.now() + 60 * 1000);
      
      console.log(`⏰ [${requestId}] Setting trial to expire at: ${oneMinuteFromNow.toISOString()}`);
      
      const result = await db
        .update(subscriptions)
        .set({
          trialEnd: oneMinuteFromNow,
          updatedAt: new Date()
        })
        .where(eq(subscriptions.tenantId, tenantId))
        .returning();

      if (result.length === 0) {
        return ErrorResponses.notFound(reply, 'Subscription', 'No subscription found for tenant', {
          tenantId,
          requestId
        });
      }
      
      console.log(`✅ [${requestId}] Trial expiry set to 1 minute from now`);
      console.log(`📅 [${requestId}] New expiry time: ${oneMinuteFromNow.toISOString()}`);
      console.log(`⏱️ [${requestId}] Processing time: ${Logger.getDuration(startTime)}`);
      console.log(`💡 [${requestId}] Trial will be processed by automatic check within 1 minute`);
      console.log('⚡ ================ QUICK EXPIRY SET ================\n');

      return {
        success: true,
        message: `Trial set to expire in 1 minute for tenant: ${tenantId}`,
        data: {
          tenantId,
          newExpiryTime: oneMinuteFromNow,
          automaticProcessingIn: '1 minute or less',
          subscriptionUpdated: result[0]
        },
        requestId,
        duration: Logger.getDuration(startTime)
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Quick trial expiry failed for tenant ${tenantId}:`, error);
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to set quick trial expiry',
        message: error.message,
        tenantId,
        requestId
      });
    }
  });

  // Frontend initialization endpoint - check trial status before loading app data
  fastify.get('/trials/check-before-load', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('trial-init-check');
    const tenantId = request.userContext.tenantId;
    
    try {
      if (!tenantId) {
        return reply.code(400).send({
          success: false,
          error: 'No tenant context',
          message: 'Unable to determine current tenant'
        });
      }
      
      console.log(`🔍 [${requestId}] Frontend initialization - checking trial status for tenant: ${tenantId}`);
      
      const expiryCheck = await trialManager.isTrialExpired(tenantId);
      const trialStatus = await trialManager.getTrialStatus(tenantId);
      
      console.log(`📊 [${requestId}] Trial check results:`, expiryCheck);

      if (expiryCheck.expired) {
        const now = new Date();
        const trialEndDate = new Date(expiryCheck.trialEnd);
        const daysExpired = Math.floor((now - trialEndDate) / (1000 * 60 * 60 * 24));
        const hoursExpired = Math.floor((now - trialEndDate) / (1000 * 60 * 60));
        const minutesExpired = Math.floor((now - trialEndDate) / (1000 * 60));

        let expiredDuration = '';
        if (daysExpired > 0) {
          expiredDuration = `${daysExpired} day${daysExpired > 1 ? 's' : ''} ago`;
        } else if (hoursExpired > 0) {
          expiredDuration = `${hoursExpired} hour${hoursExpired > 1 ? 's' : ''} ago`;
        } else if (minutesExpired > 0) {
          expiredDuration = `${minutesExpired} minute${minutesExpired > 1 ? 's' : ''} ago`;
        } else {
          expiredDuration = 'just now';
        }

        console.log(`🚫 [${requestId}] TRIAL EXPIRED during initialization - expired ${expiredDuration}`);

        return reply.code(200).send({
          success: false,
          error: 'Trial Expired',
          message: 'Your trial period has ended. Please upgrade your subscription to access your dashboard and data.',
          code: 'TRIAL_EXPIRED',
          operationType: 'app_initialization',
          data: {
            trialEnd: expiryCheck.trialEnd,
            trialEndFormatted: trialEndDate.toLocaleDateString() + ' at ' + trialEndDate.toLocaleTimeString(),
            expiredDuration,
            reason: expiryCheck.reason,
            plan: expiryCheck.plan,
            allowedOperations: ['payments', 'subscriptions'],
            upgradeUrl: '/api/subscriptions/checkout',
            trialInfo: trialStatus
          },
          requestId,
          isTrialExpired: true,
          showUpgradePrompt: true,
          blockAppLoading: true,
          subscriptionExpired: true
        });
      }

      console.log(`✅ [${requestId}] Trial active - frontend can proceed with loading`);
      console.log(`📅 [${requestId}] Trial ends: ${expiryCheck.trialEnd}`);

      return {
        success: true,
        message: 'Trial is active - proceed with app loading',
        data: {
          trialActive: true,
          trialEnd: expiryCheck.trialEnd,
          trialEndFormatted: new Date(expiryCheck.trialEnd).toLocaleDateString() + ' at ' + new Date(expiryCheck.trialEnd).toLocaleTimeString(),
          timeRemaining: trialStatus.timeRemainingHuman,
          plan: expiryCheck.plan,
          trialInfo: trialStatus
        },
        requestId,
        isTrialExpired: false,
        showUpgradePrompt: false,
        blockAppLoading: false
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Error during trial initialization check:`, error);
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to check trial status',
        message: error.message,
        requestId
      });
    }
  });

  // Test endpoint for checking current user's context
  fastify.get('/test-context', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    return {
      success: true,
      userContext: request.userContext,
      timestamp: new Date().toISOString()
    };
  });

  // ================ USER MANAGEMENT ENDPOINTS ================
  
  // Get all users in tenant
  fastify.get('/users', {
    preHandler: [authenticateToken, requirePermission('user.view')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('users-list');
    const tenantId = request.userContext.tenantId;
    
    try {
      console.log(`🔍 [${requestId}] Getting users list for tenant: ${tenantId}`);
      
      const users = await db
        .select({
          userId: tenantUsers.userId,
          email: tenantUsers.email,
          name: tenantUsers.name,
          avatar: tenantUsers.avatar,
          title: tenantUsers.title,
          department: tenantUsers.department,
          isActive: tenantUsers.isActive,
          isTenantAdmin: tenantUsers.isTenantAdmin,
          isVerified: tenantUsers.isVerified,
          onboardingCompleted: tenantUsers.onboardingCompleted,
          createdAt: tenantUsers.createdAt,
          lastActiveAt: tenantUsers.lastActiveAt,
          lastLoginAt: tenantUsers.lastLoginAt,
          loginCount: tenantUsers.loginCount
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      console.log(`✅ [${requestId}] Found ${users.length} users`);

      return {
        success: true,
        data: users,
        count: users.length,
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to get users:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get users',
        message: error.message,
        requestId
      });
    }
  });

  // Update user role
  fastify.put('/users/:userId/role', {
    preHandler: [authenticateToken, requirePermission('user.edit')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('user-role-update');
    const { userId } = request.params;
    const { isTenantAdmin } = request.body;
    const tenantId = request.userContext.tenantId;
    
    try {
      console.log(`✏️ [${requestId}] Updating user admin status:`, { userId, isTenantAdmin, tenantId });
      
      const result = await db
        .update(tenantUsers)
        .set({ 
          isTenantAdmin: isTenantAdmin === true,
          updatedAt: new Date()
        })
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (result.length === 0) {
        return ErrorResponses.notFound(reply, 'User', 'User not found', {
          requestId
        });
      }

      console.log(`✅ [${requestId}] User admin status updated successfully`);

      return {
        success: true,
        message: 'User admin status updated successfully',
        data: result[0],
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to update user admin status:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update user admin status',
        message: error.message,
        requestId
      });
    }
  });

  // Remove user from tenant
  fastify.delete('/users/:userId', {
    preHandler: [authenticateToken, requirePermission('user.delete')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('user-remove');
    const { userId } = request.params;
    const tenantId = request.userContext.tenantId;
    
    try {
      console.log(`🗑️ [${requestId}] Removing user:`, { userId, tenantId });
      
      const result = await db
        .delete(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (result.length === 0) {
        return ErrorResponses.notFound(reply, 'User', 'User not found', {
          requestId
        });
      }

      console.log(`✅ [${requestId}] User removed successfully`);

      return {
        success: true,
        message: 'User removed successfully',
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to remove user:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to remove user',
        message: error.message,
        requestId
      });
    }
  });

  // ================ TENANT MANAGEMENT ENDPOINTS ================
  
  // Get tenant information
  fastify.get('/tenant', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('tenant-info');
    const tenantId = request.userContext.tenantId;
    
    try {
      console.log(`🔍 [${requestId}] Getting tenant info for: ${tenantId}`);
      
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (tenant.length === 0) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found', {
          requestId
        });
      }

      console.log(`✅ [${requestId}] Tenant info retrieved`);

      return {
        success: true,
        data: tenant[0],
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to get tenant info:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get tenant information',
        message: error.message,
        requestId
      });
    }
  });

  // Get comprehensive tenant onboarding status and tracking
  fastify.get('/tenant/onboarding-status', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('tenant-onboarding-status');
    const tenantId = request.userContext.tenantId;
    
    try {
      console.log(`📊 [${requestId}] Getting comprehensive onboarding status for tenant: ${tenantId}`);
      
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found', {
          requestId
        });
      }

      // Get subscription info
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .limit(1);

      // Get user count
      const [userCount] = await db
        .select({ count: dbCount() })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      // Calculate trial status
      const now = new Date();
      const trialEnd = tenant.trialEndsAt || subscription?.trialEnd;
      const trialActive = trialEnd && new Date(trialEnd) > now;
      const trialExpired = trialEnd && new Date(trialEnd) <= now;
      
      let trialTimeRemaining = null;
      if (trialEnd && trialActive) {
        const timeLeft = new Date(trialEnd) - now;
        const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        trialTimeRemaining = `${daysLeft} days, ${hoursLeft} hours`;
      }

      const onboardingStatus = {
        // Basic tenant info
        tenantId: tenant.tenantId,
        companyName: tenant.companyName,
        subdomain: tenant.subdomain,
        adminEmail: tenant.adminEmail,
        industry: tenant.industry,
        
        // Onboarding tracking
        onboardingCompleted: tenant.onboardingCompleted,
        onboardingStep: tenant.onboardingStep,
        onboardingProgress: tenant.onboardingProgress || {},
        onboardedAt: tenant.onboardedAt,
        onboardingStartedAt: tenant.onboardingStartedAt,
        setupCompletionRate: tenant.setupCompletionRate || 0,
        
        // Trial & subscription tracking
        trialStartedAt: tenant.trialStartedAt,
        trialEndsAt: trialEnd,
        trialStatus: tenant.trialStatus,
        trialActive,
        trialExpired,
        trialTimeRemaining,
        subscriptionStatus: tenant.subscriptionStatus,
        
        // Feature adoption
        featuresEnabled: tenant.featuresEnabled || {},
        firstLoginAt: tenant.firstLoginAt,
        lastActivityAt: tenant.lastActivityAt,
        
        // Setup data
        initialSetupData: tenant.initialSetupData || {},
        
        // Current status
        userCount: userCount.count,
        currentPlan: subscription?.plan || 'trial',
        subscriptionId: subscription?.subscriptionId,
        
        // Metadata
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt
      };

      console.log(`✅ [${requestId}] Comprehensive onboarding status retrieved`);
      console.log(`📊 [${requestId}] Onboarding completed: ${onboardingStatus.onboardingCompleted}`);
      console.log(`⏰ [${requestId}] Trial status: ${onboardingStatus.trialStatus} (Active: ${trialActive})`);

      return {
        success: true,
        data: onboardingStatus,
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to get onboarding status:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get onboarding status',
        message: error.message,
        requestId
      });
    }
  });

  // Update tenant settings
  fastify.put('/tenant', {
    preHandler: [authenticateToken, requirePermission('tenant.edit')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('tenant-update');
    const tenantId = request.userContext.tenantId;
    const updateData = request.body;
    
    try {
      console.log(`✏️ [${requestId}] Updating tenant:`, { tenantId, updateData });
      
      const result = await db
        .update(tenants)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId))
        .returning();

      if (result.length === 0) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found', {
          requestId
        });
      }

      console.log(`✅ [${requestId}] Tenant updated successfully`);

      return {
        success: true,
        message: 'Tenant updated successfully',
        data: result[0],
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to update tenant:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update tenant',
        message: error.message,
        requestId
      });
    }
  });

  // ================ ROLE MANAGEMENT ENDPOINTS ================
  
  // Get all custom roles
  fastify.get('/roles', {
    preHandler: [authenticateToken, requirePermission('role.view')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('roles-list');
    const tenantId = request.userContext.tenantId;
    
    try {
      console.log(`🔍 [${requestId}] Getting roles for tenant: ${tenantId}`);
      
      const roles = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.tenantId, tenantId));

      console.log(`✅ [${requestId}] Found ${roles.length} roles`);

      return {
        success: true,
        data: roles,
        count: roles.length,
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to get roles:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get roles',
        message: error.message,
        requestId
      });
    }
  });

  // Create custom role
  fastify.post('/roles', {
    preHandler: [authenticateToken, requirePermission('role.create')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('role-create');
    const tenantId = request.userContext.tenantId;
    const { roleName, description, permissions } = request.body;
    
    try {
      console.log(`➕ [${requestId}] Creating role:`, { roleName, description, tenantId });
      
      const roleId = uuidv4();
      
      const result = await db
        .insert(customRoles)
        .values({
          roleId,
          tenantId,
          roleName,
          description,
          permissions: JSON.stringify(permissions),
          isSystemRole: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`✅ [${requestId}] Role created successfully: ${roleId}`);

      return {
        success: true,
        message: 'Role created successfully',
        data: result[0],
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to create role:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create role',
        message: error.message,
        requestId
      });
    }
  });

  // Update custom role
  fastify.put('/roles/:roleId', {
    preHandler: [authenticateToken, requirePermission('role.edit')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('role-update');
    const { roleId } = request.params;
    const tenantId = request.userContext.tenantId;
    const updateData = request.body;
    
    try {
      console.log(`✏️ [${requestId}] Updating role:`, { roleId, tenantId, updateData });
      
      const result = await db
        .update(customRoles)
        .set({
          ...updateData,
          permissions: updateData.permissions ? JSON.stringify(updateData.permissions) : undefined,
          updatedAt: new Date()
        })
        .where(and(
          eq(customRoles.roleId, roleId),
          eq(customRoles.tenantId, tenantId)
        ))
        .returning();

      if (result.length === 0) {
        return ErrorResponses.notFound(reply, 'Role', 'Role not found', {
          requestId
        });
      }

      console.log(`✅ [${requestId}] Role updated successfully`);

      return {
        success: true,
        message: 'Role updated successfully',
        data: result[0],
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to update role:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update role',
        message: error.message,
        requestId
      });
    }
  });

  // Delete custom role
  fastify.delete('/roles/:roleId', {
    preHandler: [authenticateToken, requirePermission('role.delete')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('role-delete');
    const { roleId } = request.params;
    const tenantId = request.userContext.tenantId;
    
    try {
      console.log(`🗑️ [${requestId}] Deleting role:`, { roleId, tenantId });
      
      const result = await db
        .delete(customRoles)
        .where(and(
          eq(customRoles.roleId, roleId),
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.isSystemRole, false) // Only allow deletion of custom roles
        ))
        .returning();

      if (result.length === 0) {
        return ErrorResponses.notFound(reply, 'Role', 'Role not found or cannot be deleted', {
          requestId
        });
      }

      console.log(`✅ [${requestId}] Role deleted successfully`);

      return {
        success: true,
        message: 'Role deleted successfully',
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to delete role:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete role',
        message: error.message,
        requestId
      });
    }
  });

  // ================ AUDIT LOG ENDPOINTS ================
  
  // Get audit logs
  fastify.get('/audit-logs', {
    preHandler: [authenticateToken, requirePermission('audit.view')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('audit-logs');
    const tenantId = request.userContext.tenantId;
    const { page = 1, limit = 50, action, userId } = request.query;
    
    try {
      console.log(`🔍 [${requestId}] Getting audit logs:`, { tenantId, page, limit, action, userId });
      
      let query = db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId));

      if (action) {
        query = query.where(eq(auditLogs.action, action));
      }

      if (userId) {
        query = query.where(eq(auditLogs.userId, userId));
      }

      const logs = await query
        .orderBy(auditLogs.timestamp)
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit));

      console.log(`✅ [${requestId}] Found ${logs.length} audit logs`);

      return {
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          count: logs.length
        },
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to get audit logs:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get audit logs',
        message: error.message,
        requestId
      });
    }
  });

  // ================ SYSTEM CLEANUP ENDPOINTS ================
  
  // Delete tenant and all associated data (DANGER!)
  fastify.delete('/tenant/complete-deletion/:tenantId', {
    preHandler: [authenticateToken, requirePermission('tenant.delete')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('tenant-deletion');
    const { tenantId } = request.params;
    const { confirmDeletion } = request.body;
    
    try {
      console.log(`🚨 [${requestId}] DANGER: Complete tenant deletion requested:`, { tenantId });
      
      if (!confirmDeletion || confirmDeletion !== 'DELETE_ALL_DATA') {
        return reply.code(400).send({
          success: false,
          error: 'Confirmation required',
          message: 'You must confirm deletion by setting confirmDeletion to "DELETE_ALL_DATA"',
          requestId
        });
      }

      // Only allow in development/test environment
      if (process.env.NODE_ENV === 'production') {
        return reply.code(403).send({
          success: false,
          error: 'Operation not allowed in production',
          message: 'Complete tenant deletion is only allowed in development/test environments',
          requestId
        });
      }

      console.log(`🗑️ [${requestId}] Proceeding with tenant deletion...`);
      
      const summary = await deleteTenantData(tenantId);
      
      console.log(`✅ [${requestId}] Tenant deletion completed:`, summary);

      return {
        success: true,
        message: 'Tenant and all associated data deleted successfully',
        data: summary,
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to delete tenant:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete tenant',
        message: error.message,
        requestId
      });
    }
  });

  // Get tenant data summary
  fastify.get('/tenant/:tenantId/data-summary', {
    preHandler: [authenticateToken, requirePermission('tenant.view')]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('tenant-summary');
    const { tenantId } = request.params;
    
    try {
      console.log(`📊 [${requestId}] Getting data summary for tenant: ${tenantId}`);
      
      const summary = await getTenantDataSummary(tenantId);
      
      console.log(`✅ [${requestId}] Data summary retrieved`);

      return {
        success: true,
        data: summary,
        tenantId,
        requestId
      };
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to get tenant data summary:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get tenant data summary',
        message: error.message,
        requestId
      });
    }
  });

  // ================ ORGANIZATIONS ENDPOINTS ================
  
  // Organizations nested routes
  fastify.register(async function organizationRoutes(fastify) {
    // Current organization routes
    fastify.register(async function currentOrgRoutes(fastify) {
      
      // Invite user to current organization (frontend expects this path)
      fastify.post('/invite-user', {
        preHandler: [authenticateToken, checkUserLimit]
      }, async (request, reply) => {
        const startTime = Date.now();
        const requestId = Logger.generateRequestId('user-invite-org');

        try {
          console.log('\n👤 ================ USER INVITATION (ORG PATH) STARTED ================');
          console.log(`📋 Request ID: ${requestId}`);
          console.log(`⏰ Timestamp: ${Logger.getTimestamp()}`);
          console.log(`👤 Inviting user by: ${request.userContext.email}`);

          const { email, name, roleIds } = request.body;
          const tenantId = request.userContext.tenantId;

          console.log(`📧 [${requestId}] Invitation Data:`, {
            email,
            name,
            roleIds,
            tenantId
          });

          console.log(`📧 [${requestId}] Validation: Validating input data`);

          if (!email || !name) {
            return reply.code(400).send({
              success: false,
              error: 'Missing required fields',
              message: 'Email and name are required'
            });
          }

          if (!tenantId) {
            return reply.code(400).send({
              success: false,
              error: 'No tenant context',
              message: 'Unable to determine tenant for invitation'
            });
          }

          console.log(`✅ [${requestId}] Input validation successful`);

          // Check if user already exists in this tenant
          console.log(`🔍 [${requestId}] Checking if user already exists in tenant`);
          const existingUser = await db
            .select()
            .from(tenantUsers)
            .where(and(
              eq(tenantUsers.tenantId, tenantId),
              eq(tenantUsers.email, email)
            ))
            .limit(1);

          if (existingUser.length > 0) {
            console.log(`⚠️ [${requestId}] User already exists in tenant`);
            return reply.code(409).send({
              success: false,
              error: 'User already exists',
              message: 'This user is already a member of your organization'
            });
          }

          console.log(`✅ [${requestId}] User does not exist in tenant - proceeding with invitation`);

          // Get tenant details for email
          const [tenant] = await db
            .select({
              companyName: tenants.companyName
            })
            .from(tenants)
            .where(eq(tenants.tenantId, tenantId))
            .limit(1);

          // Generate invitation token
          const invitationToken = uuidv4();
          
          // Create user record with invitation token
          const [newUser] = await db
            .insert(tenantUsers)
            .values({
              userId: uuidv4(),
              tenantId,
              email,
              name,
              isActive: false, // Will be activated when they accept the invitation
              invitedBy: request.userContext.internalUserId,
              invitationToken,
              invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
              invitedAt: new Date()
            })
            .returning();

          // Send invitation email
          console.log(`📧 [${requestId}] Sending invitation email to: ${email}`);
          const emailResult = await EmailService.sendUserInvitation({
            email,
            tenantName: tenant?.companyName || 'Your Organization',
            roleName: 'Team Member', // Default role name
            invitationToken,
            invitedByName: request.userContext.name || request.userContext.email,
            message: null
          });

          if (emailResult.success) {
            console.log(`✅ [${requestId}] Invitation email sent successfully`);
          } else {
            console.warn(`⚠️ [${requestId}] Failed to send invitation email: ${emailResult.error}`);
          }

          console.log(`🎉 [${requestId}] USER INVITATION (ORG PATH) COMPLETED SUCCESSFULLY!`);
          console.log(`⏱️ [${requestId}] Total processing time: ${Logger.getDuration(startTime)}`);
          console.log('👤 ================ USER INVITATION (ORG PATH) ENDED ================\n');

          return {
            success: true,
            message: 'User invitation sent successfully',
            requestId,
            duration: Logger.getDuration(startTime)
          };

        } catch (error) {
          console.error(`❌ [${requestId}] Error sending invitation:`, error);
          return reply.code(500).send({
            success: false,
            error: 'Failed to send invitation',
            message: error.message,
            requestId
          });
        }
      });
      
      // Get organization users with status
      fastify.get('/users', {
        preHandler: [authenticateToken]
      }, async (request, reply) => {
        const requestId = Logger.generateRequestId('org-users');
        const tenantId = request.userContext.tenantId;
        
        try {
          console.log(`👥 [${requestId}] Getting organization users for tenant: ${tenantId}`);
          
          const users = await db
            .select({
              userId: tenantUsers.userId,
              email: tenantUsers.email,
              name: tenantUsers.name,
              isActive: tenantUsers.isActive,
              isTenantAdmin: tenantUsers.isTenantAdmin,
              invitedAt: tenantUsers.invitedAt,
              invitationAcceptedAt: tenantUsers.invitationAcceptedAt,
              lastActiveAt: tenantUsers.lastActiveAt,
              createdAt: tenantUsers.createdAt
            })
            .from(tenantUsers)
            .where(eq(tenantUsers.tenantId, tenantId))
            .orderBy(tenantUsers.createdAt);

          const activeUsers = users.filter(u => u.isActive);
          const pendingUsers = users.filter(u => !u.isActive);

          console.log(`✅ [${requestId}] Found ${users.length} total users (${activeUsers.length} active, ${pendingUsers.length} pending)`);

          return {
            success: true,
            data: {
              users,
              summary: {
                total: users.length,
                active: activeUsers.length,
                pending: pendingUsers.length
              }
            },
            requestId
          };
        } catch (error) {
          console.error(`❌ [${requestId}] Failed to get organization users:`, error);
          return reply.code(500).send({
            success: false,
            error: 'Failed to get organization users',
            message: error.message,
            requestId
          });
        }
      });
      
    }, { prefix: '/current' });
  }, { prefix: '/organizations' });

  // Check trial system health and status
  fastify.get('/trials/system-status', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('trial-system-status');
    
    try {
      console.log(`🔍 [${requestId}] Checking trial system status...`);
      
      // Get monitoring status
      const monitoringStatus = trialManager.getMonitoringStatus();
      
      // Get database stats
      const subscriptionStats = await db
        .select({
          plan: subscriptions.plan,
          status: subscriptions.status,
          count: sql`count(*)`.as('count')
        })
        .from(subscriptions)
        .groupBy(subscriptions.plan, subscriptions.status);
      
      // Check for expired trials
      const expiredTrials = await db
        .select({
          tenantId: subscriptions.tenantId,
          plan: subscriptions.plan,
          status: subscriptions.status,
          trialEnd: subscriptions.trialEnd,
          companyName: tenants.companyName
        })
        .from(subscriptions)
        .leftJoin(tenants, eq(subscriptions.tenantId, tenants.tenantId))
        .where(
          and(
            eq(subscriptions.status, 'past_due'),
            or(
              eq(subscriptions.plan, 'trial'),
              lt(subscriptions.trialEnd, new Date())
            )
          )
        )
        .limit(5);
      
      // Check system health
      const systemHealth = {
        isHealthy: monitoringStatus.isRunning && monitoringStatus.activeJobs >= 3,
        issues: []
      };
      
      if (!monitoringStatus.isRunning) {
        systemHealth.issues.push('Trial monitoring system is not running');
      }
      
      if (monitoringStatus.activeJobs < 3) {
        systemHealth.issues.push(`Only ${monitoringStatus.activeJobs} cron jobs active (expected 4)`);
      }
      
      if (monitoringStatus.errorCount > 0) {
        systemHealth.issues.push(`${monitoringStatus.errorCount} recent errors detected`);
      }
      
      const timeSinceLastHealthCheck = monitoringStatus.lastHealthCheck 
        ? Date.now() - new Date(monitoringStatus.lastHealthCheck).getTime()
        : null;
      
      if (timeSinceLastHealthCheck && timeSinceLastHealthCheck > 10 * 60 * 1000) { // 10 minutes
        systemHealth.issues.push('Health check is stale (>10 minutes)');
      }
      
      console.log(`✅ [${requestId}] Trial system status retrieved`);
      
      return {
        success: true,
        data: {
          monitoringStatus,
          subscriptionStats,
          expiredTrials: expiredTrials.map(trial => ({
            tenantId: trial.tenantId,
            companyName: trial.companyName,
            plan: trial.plan,
            status: trial.status,
            trialEnd: trial.trialEnd,
            daysExpired: trial.trialEnd ? Math.floor((Date.now() - new Date(trial.trialEnd).getTime()) / (1000 * 60 * 60 * 24)) : null
          })),
          systemHealth,
          timestamp: new Date().toISOString()
        },
        requestId
      };
      
    } catch (error) {
      console.error(`❌ [${requestId}] Failed to get trial system status:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get trial system status',
        message: error.message,
        requestId
      });
    }
  });

  // Force restart trial monitoring system
  fastify.post('/trials/restart-monitoring', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    const requestId = Logger.generateRequestId('restart-trial-monitoring');
    
    try {
      console.log(`🔄 [${requestId}] Restarting trial monitoring system...`);
      
      // Stop existing monitoring
      trialManager.stopTrialMonitoring();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start monitoring again
      trialManager.startTrialMonitoring();
      
      // Verify it's running
      const status = trialManager.getMonitoringStatus();
      
      if (status.isRunning) {
        console.log(`✅ [${requestId}] Trial monitoring restarted successfully`);
        return {
          success: true,
          message: 'Trial monitoring system restarted successfully',
          data: status,
          requestId
        };
      } else {
        console.error(`❌ [${requestId}] Failed to restart trial monitoring`);
        return reply.code(500).send({
          success: false,
          error: 'Failed to restart trial monitoring',
          message: 'System did not start properly after restart',
          requestId
        });
      }
      
    } catch (error) {
      console.error(`❌ [${requestId}] Error restarting trial monitoring:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to restart trial monitoring',
        message: error.message,
        requestId
      });
    }
  });
}