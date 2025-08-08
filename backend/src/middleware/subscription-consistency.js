// 🔒 **SUBSCRIPTION CONSISTENCY MIDDLEWARE**
// Prevents race conditions during subscription updates
// Ensures atomic updates across subscriptions and organization_applications tables

import { db } from '../db/index.js';

class SubscriptionConsistencyManager {
  
  /**
   * 🔒 **ATOMIC SUBSCRIPTION UPDATE**
   * Updates subscription and organization applications in a single transaction
   */
  static async updateSubscriptionAtomically(tenantId, newPlan, subscriptionData = {}) {
    console.log(`🔒 Starting atomic subscription update for tenant ${tenantId} to plan ${newPlan}`);
    
    try {
      // Start transaction
      await db.execute('BEGIN');
      
      // 1. Deactivate all existing active subscriptions for this tenant
      await db.execute(`
        UPDATE subscriptions 
        SET status = 'canceled', 
            canceled_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1 
        AND status IN ('active', 'trialing')
      `, [tenantId]);
      
      console.log(`   🗑️ Deactivated existing subscriptions for tenant ${tenantId}`);
      
      // 2. Create new subscription record
      const subscriptionId = await this.createNewSubscription(tenantId, newPlan, subscriptionData);
      
      // 3. Update organization applications to match new plan
      await this.updateOrganizationApplicationsForPlan(tenantId, newPlan);
      
      // 4. Commit transaction
      await db.execute('COMMIT');
      
      console.log(`✅ Atomic subscription update completed successfully`);
      
      return {
        success: true,
        subscriptionId,
        plan: newPlan,
        message: 'Subscription updated atomically'
      };
      
    } catch (error) {
      // Rollback on any error
      await db.execute('ROLLBACK');
      console.error(`❌ Atomic subscription update failed, rolled back:`, error);
      
      throw new Error(`Subscription update failed: ${error.message}`);
    }
  }
  
  /**
   * 📝 **CREATE NEW SUBSCRIPTION**
   */
  static async createNewSubscription(tenantId, plan, subscriptionData) {
    const subscriptionId = this.generateUUID();
    
    await db.execute(`
      INSERT INTO subscriptions (
        subscription_id, tenant_id, plan, status, 
        stripe_subscription_id, stripe_customer_id, stripe_price_id,
        trial_start, trial_end, current_period_start, current_period_end,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      )
    `, [
      subscriptionId,
      tenantId,
      plan,
      subscriptionData.status || 'active',
      subscriptionData.stripeSubscriptionId || null,
      subscriptionData.stripeCustomerId || null,
      subscriptionData.stripePriceId || null,
      subscriptionData.trialStart || null,
      subscriptionData.trialEnd || null,
      subscriptionData.currentPeriodStart || new Date(),
      subscriptionData.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    ]);
    
    console.log(`   ✅ Created new subscription ${subscriptionId} for plan ${plan}`);
    return subscriptionId;
  }
  
  /**
   * 🏢 **UPDATE ORGANIZATION APPLICATIONS**
   */
  static async updateOrganizationApplicationsForPlan(tenantId, plan) {
    // Import plan matrix
    const { PLAN_ACCESS_MATRIX } = await import('../data/permission-matrix.js');
    const planAccess = PLAN_ACCESS_MATRIX[plan];
    
    if (!planAccess) {
      throw new Error(`Plan ${plan} not found in access matrix`);
    }
    
    // Update subscription tier for all organization applications
    await db.execute(`
      UPDATE organization_applications 
      SET subscription_tier = $1,
          max_users = $2,
          updated_at = NOW()
      WHERE tenant_id = $3
    `, [plan, planAccess.limitations.users, tenantId]);
    
    console.log(`   🏢 Updated organization applications to ${plan} plan (max users: ${planAccess.limitations.users})`);
    
    // Update enabled modules based on plan
    for (const appCode of planAccess.applications) {
      const enabledModules = planAccess.modules[appCode] || [];
      
      await db.execute(`
        UPDATE organization_applications 
        SET enabled_modules = $1,
            updated_at = NOW()
        WHERE tenant_id = $2 
        AND app_id = (SELECT app_id FROM applications WHERE app_code = $3)
      `, [JSON.stringify(enabledModules), tenantId, appCode]);
      
      console.log(`   📦 Updated ${appCode} modules: ${enabledModules.join(', ')}`);
    }
  }
  
  /**
   * 🔍 **GET CURRENT SUBSCRIPTION STATUS**
   */
  static async getCurrentSubscriptionStatus(tenantId) {
    const result = await db.execute(`
      SELECT subscription_id, plan, status, created_at, trial_end, current_period_end
      FROM subscriptions 
      WHERE tenant_id = $1 
      AND status IN ('active', 'trialing')
      ORDER BY created_at DESC
      LIMIT 1
    `, [tenantId]);
    
    return result.rows[0] || null;
  }
  
  /**
   * 🚨 **CHECK FOR RACE CONDITIONS**
   */
  static async checkForRaceConditions(tenantId) {
    const result = await db.execute(`
      SELECT COUNT(*) as active_count
      FROM subscriptions 
      WHERE tenant_id = $1 
      AND status IN ('active', 'trialing')
    `, [tenantId]);
    
    const activeCount = parseInt(result.rows[0]?.active_count || 0);
    
    return {
      hasRaceCondition: activeCount > 1,
      activeSubscriptionCount: activeCount
    };
  }
  
  /**
   * 🛡️ **SUBSCRIPTION UPDATE MIDDLEWARE**
   */
  static async subscriptionUpdateMiddleware(request, reply, next) {
    // Only apply to subscription update routes
    if (!request.url.includes('/subscription') && !request.url.includes('/upgrade')) {
      return next();
    }
    
    const tenantId = request.userContext?.tenantId;
    if (!tenantId) {
      return next();
    }
    
    // Check for existing race conditions before processing
    const raceCheck = await SubscriptionConsistencyManager.checkForRaceConditions(tenantId);
    
    if (raceCheck.hasRaceCondition) {
      console.log(`⚠️ Race condition detected for tenant ${tenantId}, fixing...`);
      
      // Auto-fix race condition
      await SubscriptionConsistencyManager.fixRaceConditionForTenant(tenantId);
    }
    
    return next();
  }
  
  /**
   * 🔧 **FIX RACE CONDITION FOR SINGLE TENANT**
   */
  static async fixRaceConditionForTenant(tenantId) {
    try {
      await db.execute('BEGIN');
      
      // Get all active subscriptions
      const result = await db.execute(`
        SELECT subscription_id, plan, created_at
        FROM subscriptions 
        WHERE tenant_id = $1 
        AND status IN ('active', 'trialing')
        ORDER BY created_at DESC
      `, [tenantId]);
      
      const activeSubscriptions = result.rows;
      
      if (activeSubscriptions.length > 1) {
        // Keep the most recent, cancel others
        const keepSubscription = activeSubscriptions[0];
        const cancelSubscriptions = activeSubscriptions.slice(1);
        
        for (const subscription of cancelSubscriptions) {
          await db.execute(`
            UPDATE subscriptions 
            SET status = 'canceled', 
                canceled_at = NOW(),
                updated_at = NOW()
            WHERE subscription_id = $1
          `, [subscription.subscription_id]);
        }
        
        // Update org apps to match the kept subscription
        await this.updateOrganizationApplicationsForPlan(tenantId, keepSubscription.plan);
        
        console.log(`✅ Fixed race condition for tenant ${tenantId}, kept plan: ${keepSubscription.plan}`);
      }
      
      await db.execute('COMMIT');
      
    } catch (error) {
      await db.execute('ROLLBACK');
      console.error(`❌ Failed to fix race condition for tenant ${tenantId}:`, error);
      throw error;
    }
  }
  
  /**
   * 🔧 **UTILITY: GENERATE UUID**
   */
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default SubscriptionConsistencyManager; 