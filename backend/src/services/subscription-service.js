import Stripe from 'stripe';
import { eq, and, desc, lt, gt, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { 
  subscriptions, 
  payments, 

  tenants,
  subscriptionActions,
  customRoles,
  tenantUsers
} from '../db/schema/index.js';
import { webhookLogs } from '../db/schema/webhook-logs.js';
import { EmailService } from '../utils/email.js';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../utils/logger.js';

// Validate Stripe configuration
const validateStripeConfig = () => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!stripeSecretKey) {
    console.warn('⚠️ STRIPE_SECRET_KEY not configured - payments will use mock mode');
    return false;
  }
  
  if (!webhookSecret) {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured - webhook verification will fail');
  }
  
  // Check if using test keys
  if (stripeSecretKey.startsWith('sk_test_')) {
    console.log('🧪 Using Stripe test mode');
  } else if (stripeSecretKey.startsWith('sk_live_')) {
    console.log('🚀 Using Stripe live mode');
  }
  
  return true;
};

// Initialize Stripe only if properly configured
let stripe = null;
const isStripeConfigured = validateStripeConfig();

if (isStripeConfigured) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
  });
} else {
  console.warn('⚠️ Stripe not initialized - using mock payment system');
}

export class SubscriptionService {
  // Check if Stripe is properly configured
  static isStripeConfigured() {
    return isStripeConfigured && !!stripe;
  }

  // Create trial subscription for new tenant
  static async createTrialSubscription(tenantId, planData = {}) {
    console.log('🚀 Creating trial subscription for tenant:', tenantId);
    console.log('📋 Plan data:', planData);

    // Calculate trial period
    const trialStartDate = new Date();
    const trialPeriodDays = process.env.NODE_ENV === 'production' ? 14 : (1/60/24); // 14 days in prod, 1 minute in dev
    const trialEndDate = new Date(Date.now() + (trialPeriodDays * 24 * 60 * 60 * 1000));

    // Get the plan details for subscription creation
    const planDetails = BUSINESS_PLANS[planData.plan || 'professional'] || BUSINESS_PLANS.professional;

    const subscriptionData = {
      tenantId: tenantId,
      plan: planData.plan || 'professional',
      status: 'trialing',
      isTrialUser: true,
      subscribedTools: planData.subscribedTools || planDetails.subscribedTools,
      usageLimits: planData.usageLimits || planDetails.usageLimits,
      monthlyPrice: planDetails.monthlyPrice,
      yearlyPrice: planDetails.yearlyPrice,
      billingCycle: planData.billingCycle || 'monthly',
      trialStart: trialStartDate,
      trialEnd: trialEndDate,
      currentPeriodStart: trialStartDate,
      currentPeriodEnd: trialEndDate,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('💾 Creating subscription with data:', subscriptionData);

    const [subscription] = await db.insert(subscriptions).values(subscriptionData).returning();

    // Record trial started event in trial_events table (NOT payments table)
    await this.recordTrialEvent(tenantId, subscription.subscriptionId, 'trial_started', {
      planType: planData.plan || 'professional',
      trialStart: trialStartDate,
      trialEnd: trialEndDate,
      trialDurationDays: trialPeriodDays
    });

    console.log('✅ Trial subscription created successfully for tenant:', tenantId);
    return subscription;
  }

  // Record trial events (separate from payments)
  static async recordTrialEvent(tenantId, subscriptionId, eventType, eventData = {}) {
    try {
      // Import trial events schema
      const { trialEvents } = await import('../db/schema/subscriptions.js');
      
      await db.insert(trialEvents).values({
        tenantId: tenantId,
        subscriptionId: subscriptionId,
        eventType: eventType,
        eventData: eventData,
        createdAt: new Date()
      });
      
      console.log(`📝 Recorded trial event: ${eventType} for tenant: ${tenantId}`);
    } catch (error) {
      console.warn('⚠️ Could not record trial event (table may not exist):', error.message);
      // Log trial event if table doesn't exist
      console.log(`📝 Trial event (${eventType}):`, { tenantId, subscriptionId, eventData });
    }
  }

  // No free subscriptions - everything is trial-based
  // Use createTrialSubscription() instead

  // Get current subscription
  static async getCurrentSubscription(tenantId) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    return subscription || null;
  }

  // Get available plans (excluding trial - handled separately)
  static async getAvailablePlans() {
    return [
      {
        id: 'starter',
        name: 'Starter',
        description: 'Perfect for small teams getting started',
        monthlyPrice: 2900, // $29
        yearlyPrice: 29000, // $290 (save $58/year)
        stripePriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_mock_starter_monthly',
        stripeYearlyPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || 'price_mock_starter_yearly',
        features: [
          'Up to 10 users',
          'CRM & HR tools',
          'User Management',
          'Up to 10 custom roles',
          'Basic permissions',
          'Unlimited projects',
          '10GB storage',
          'Email support'
        ],
        limits: {
          users: 10,
          roles: 10,
          apiCalls: 25000,
          storage: 10000000000, // 10GB
          projects: -1 // Unlimited
        },
        applications: ['crm', 'hr'],
        modules: { 
          crm: ['leads', 'contacts', 'accounts', 'opportunities', 'quotations', 'tickets', 'communications', 'dashboard', 'users'],
          hr: ['employees', 'payroll', 'leave', 'documents']
        },
        allowDowngrade: true
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Advanced features for growing businesses',
        monthlyPrice: 4900, // $49 (matching your Stripe)
        yearlyPrice: 49000, // $490
        stripePriceId: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || 'price_mock_professional_monthly',
        stripeYearlyPriceId: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID || 'price_mock_professional_yearly',
        features: [
          'Up to 50 users',
          'All basic tools',
          'Advanced CRM features',
          'HR Management',
          'User & Role Management',
          'Advanced permissions',
          'Up to 25 custom roles',
          '50GB storage',
          'Priority support'
        ],
        limits: {
          users: 50,
          roles: 25,
          apiCalls: 100000,
          storage: 50000000000, // 50GB
          projects: -1 // Unlimited
        },
        applications: ['crm', 'hr', 'affiliate'],
        modules: { 
          crm: ['leads', 'contacts', 'accounts', 'opportunities', 'quotations', 'tickets', 'communications', 'invoices', 'dashboard', 'users', 'roles', 'bulk_operations'],
          hr: ['employees', 'payroll', 'leave', 'documents', 'performance', 'recruitment'],
          affiliate: ['partners', 'commissions']
        },
        popular: true,
        allowDowngrade: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Complete solution for large organizations',
        monthlyPrice: 9900, // $99 (matching your Stripe)
        yearlyPrice: 99000, // $990
        stripePriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_mock_enterprise_monthly',
        stripeYearlyPriceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_mock_enterprise_yearly',
        features: [
          'Unlimited users',
          'All modules included',
          'Complete CRM suite',
          'Advanced HR Management',
          'Full User Management',
          'Advanced Role & Permissions',
          'Affiliate Management',
          'Accounting Integration',
          'Inventory Management',
          'Unlimited custom roles',
          'Unlimited storage',
          'Dedicated support',
          'SSO integration'
        ],
        limits: {
          users: -1, // Unlimited
          roles: -1, // Unlimited
          apiCalls: -1, // Unlimited
          storage: -1, // Unlimited
          projects: -1 // Unlimited
        },
        applications: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'],
        modules: { 
          crm: '*', // All CRM modules
          hr: '*',  // All HR modules  
          affiliate: '*', // All affiliate modules
          accounting: '*', // All accounting modules (when built)
          inventory: '*'  // All inventory modules (when built)
        },
        allowDowngrade: true
      }
    ];
  }

  // Create Stripe checkout session
  static async createCheckoutSession({ tenantId, planId, customerId, successUrl, cancelUrl, billingCycle = 'monthly' }) {
    const startTime = Date.now();
    const requestId = Logger.generateRequestId('stripe-checkout');
    
    Logger.billing.start(requestId, 'STRIPE CHECKOUT SESSION', {
      tenantId,
      planId,
      customerId,
      billingCycle,
      stripeConfigured: this.isStripeConfigured(),
      environment: process.env.NODE_ENV
    });

    const plans = await this.getAvailablePlans();
    const plan = plans.find(p => p.id === planId);
    
    console.log('🔍 createCheckoutSession - Found plan:', plan ? plan.name : 'NOT FOUND');
    
    if (!plan || plan.id === 'free') {
      throw new Error('Invalid plan for checkout');
    }

    const priceId = billingCycle === 'yearly' ? plan.stripeYearlyPriceId : plan.stripePriceId;
    
    console.log('🔍 createCheckoutSession - Stripe price IDs:', {
      monthly: plan.stripePriceId,
      yearly: plan.stripeYearlyPriceId,
      selected: priceId,
      billingCycle
    });
    
    // Check if we should use mock mode
    const isMockMode = !this.isStripeConfigured() || (priceId && priceId.startsWith('price_mock_'));
    
    if (isMockMode) {
      console.log('🧪 createCheckoutSession - Using mock mode');
      const mockSessionId = `mock_session_${Date.now()}`;
      const mockCheckoutUrl = `${successUrl}?session_id=${mockSessionId}&mock=true&plan=${planId}&billing_cycle=${billingCycle}`;
      console.log('✅ createCheckoutSession - Mock success! URL:', mockCheckoutUrl);
      
      // Simulate successful checkout by immediately processing the "payment"
      setTimeout(async () => {
        try {
          console.log('🧪 Processing mock checkout completion...');
          await this.handleMockCheckoutCompleted({
            tenantId,
            planId,
            billingCycle,
            sessionId: mockSessionId
          });
        } catch (error) {
          console.error('❌ Mock checkout processing error:', error);
        }
      }, 2000); // 2 second delay to simulate processing
      
      return mockCheckoutUrl;
    }
    
    if (!priceId) {
      console.error('❌ createCheckoutSession - Missing Stripe price ID for plan:', planId);
      console.error('❌ Available environment variables:', {
        STRIPE_STARTER_MONTHLY: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ? 'SET' : 'NOT SET',
        STRIPE_STARTER_YEARLY: process.env.STRIPE_STARTER_YEARLY_PRICE_ID ? 'SET' : 'NOT SET',
        STRIPE_PROFESSIONAL_MONTHLY: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID ? 'SET' : 'NOT SET',
        STRIPE_PROFESSIONAL_YEARLY: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID ? 'SET' : 'NOT SET',
        STRIPE_ENTERPRISE_MONTHLY: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ? 'SET' : 'NOT SET',
        STRIPE_ENTERPRISE_YEARLY: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID ? 'SET' : 'NOT SET'
      });
      throw new Error(`Stripe price ID not configured for ${planId} plan (${billingCycle})`);
    }

    console.log('🔍 createCheckoutSession - Creating session config...');

    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tenantId,
        planId,
        billingCycle
      },
    };

    // Add customer if provided, otherwise Stripe will create one automatically
    if (customerId) {
      sessionConfig.customer = customerId;
      console.log('🔍 createCheckoutSession - Using existing customer:', customerId);
    } else {
      // For subscription mode, don't use customer_creation parameter
      // Stripe will automatically create a customer during the checkout process
      console.log('🔍 createCheckoutSession - Stripe will create new customer automatically');
    }

    Logger.billing.stripe.request(requestId, 'POST', '/checkout/sessions', sessionConfig);
    
    try {
      const session = await stripe.checkout.sessions.create(sessionConfig);
      
      Logger.billing.stripe.response(requestId, 'success', {
        sessionId: session.id,
        url: session.url,
        mode: session.mode,
        status: session.status
      });
      
      Logger.billing.success(requestId, 'STRIPE CHECKOUT SESSION', startTime, {
        sessionId: session.id,
        checkoutUrl: session.url
      });
      
      return session.url;
    } catch (stripeError) {
      Logger.billing.stripe.error(requestId, stripeError);
      throw stripeError;
    }
  }

  // Handle mock checkout completion for development/testing
  static async handleMockCheckoutCompleted({ tenantId, planId, billingCycle, sessionId }) {
    try {
      console.log('🧪 Processing mock checkout completion for tenant:', tenantId);
      
      const plans = await this.getAvailablePlans();
      const plan = plans.find(p => p.id === planId);
      
      if (!plan) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }

      // Check if subscription already exists
      const existingSubscription = await this.getCurrentSubscription(tenantId);
      
      let subscriptionRecord;
      
      if (existingSubscription) {
        console.log('🔄 Updating existing subscription for tenant:', tenantId);
        
        // Update existing subscription
        await db
          .update(subscriptions)
          .set({
            plan: planId,
            status: 'active',
            stripeSubscriptionId: `mock_sub_${Date.now()}`,
            stripeCustomerId: `mock_cus_${Date.now()}`,
            subscribedTools: plan.tools,
            usageLimits: plan.limits,
            monthlyPrice: plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice,
            billingCycle: billingCycle,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
            updatedAt: new Date()
          })
          .where(eq(subscriptions.tenantId, tenantId));
          
        subscriptionRecord = existingSubscription;
      } else {
        console.log('🆕 Creating new subscription for tenant:', tenantId);
        
        // Create new subscription
        const [newSubscription] = await db.insert(subscriptions).values({
          subscriptionId: uuidv4(),
          tenantId,
          plan: planId,
          status: 'active',
          stripeSubscriptionId: `mock_sub_${Date.now()}`,
          stripeCustomerId: `mock_cus_${Date.now()}`,
          subscribedTools: plan.tools,
          usageLimits: plan.limits,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          billingCycle: billingCycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        subscriptionRecord = newSubscription;
      }

      // Record mock payment
      const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
      
      await this.createPaymentRecord({
        tenantId: tenantId,
        subscriptionId: subscriptionRecord.subscriptionId,
        stripePaymentIntentId: `mock_pi_${Date.now()}`,
        stripeChargeId: `mock_ch_${Date.now()}`,
        amount: amount / 100, // Convert from cents
        currency: 'USD',
        status: 'succeeded',
        paymentMethod: 'card',
        paymentType: 'subscription',
        billingReason: 'subscription_create',
        invoiceNumber: `MOCK-${Date.now()}`,
        description: `Mock payment for ${plan.name} plan (${billingCycle})`,
        
        // Metadata
        metadata: {
          checkoutSessionId: sessionId,
          planId: planId,
          billingCycle: billingCycle,
          isInitialPayment: true,
          isMockPayment: true
        },
        
        paidAt: new Date()
      });

      console.log('✅ Mock checkout completed successfully for tenant:', tenantId, 'plan:', planId);
      
    } catch (error) {
      console.error('Error handling mock checkout completed:', error);
      throw error;
    }
  }

  // Get usage metrics for a tenant
  static async getUsageMetrics(tenantId) {
    try {
      // Get current subscription to check limits
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .limit(1);

      if (!subscription) {
        throw new Error('No subscription found');
      }

      // Mock usage data - in a real app, you'd calculate these from actual usage
      const mockUsage = {
        users: 2,
        projects: 1,
        storage: 500000000, // 500MB
        apiCalls: 500
      };

      return {
        current: mockUsage,
        limits: subscription.usageLimits,
        plan: subscription.plan,
        percentUsed: {
          users: subscription.usageLimits.users > 0 ? 
            Math.round((mockUsage.users / subscription.usageLimits.users) * 100) : 0,
          projects: subscription.usageLimits.projects > 0 ? 
            Math.round((mockUsage.projects / subscription.usageLimits.projects) * 100) : 0,
          storage: subscription.usageLimits.storage > 0 ? 
            Math.round((mockUsage.storage / subscription.usageLimits.storage) * 100) : 0,
          apiCalls: subscription.usageLimits.apiCalls > 0 ? 
            Math.round((mockUsage.apiCalls / subscription.usageLimits.apiCalls) * 100) : 0
        }
      };
    } catch (error) {
      console.error('Error getting usage metrics:', error);
      throw error;
    }
  }

  // Get billing history for a tenant
  static async getBillingHistory(tenantId) {
    try {
      const paymentRecords = await db
        .select()
        .from(payments)
        .where(eq(payments.tenantId, tenantId))
        .orderBy(desc(payments.createdAt));

      return paymentRecords.map(payment => ({
        id: payment.paymentId,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        invoiceNumber: payment.invoiceNumber,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt
      }));
    } catch (error) {
      console.error('Error getting billing history:', error);
      throw error;
    }
  }

  // Cancel subscription
  static async cancelSubscription(tenantId, reason = 'User requested cancellation') {
    try {
      const currentSubscription = await this.getCurrentSubscription(tenantId);
      
      if (!currentSubscription) {
        throw new Error('No subscription found to cancel');
      }

      if (currentSubscription.plan === 'trial') {
        throw new Error('Cannot cancel trial plan');
      }

      // If it's a Stripe subscription, cancel it
      if (currentSubscription.stripeSubscriptionId) {
        const canceledSubscription = await stripe.subscriptions.cancel(
          currentSubscription.stripeSubscriptionId
        );

        // Update our database
        await db
          .update(subscriptions)
          .set({
            status: 'canceled',
            canceledAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(subscriptions.subscriptionId, currentSubscription.subscriptionId));

        // Record cancellation payment entry (for refunds if applicable)
        await db.insert(payments).values({
          paymentId: uuidv4(),
          tenantId: tenantId,
          subscriptionId: currentSubscription.subscriptionId,
          stripeInvoiceId: null,
          amount: '0.00',
          currency: 'USD',
          status: 'canceled',
          paymentMethod: 'subscription_cancel',
          description: `Subscription canceled for ${currentSubscription.plan} plan`,
          metadata: {
            canceledStripeSubscriptionId: currentSubscription.stripeSubscriptionId,
            cancelReason: reason,
            refundEligible: false
          },
          createdAt: new Date()
        });

      return {
          subscriptionId: currentSubscription.subscriptionId,
          stripeSubscriptionId: currentSubscription.stripeSubscriptionId,
          status: 'canceled',
          canceledAt: new Date()
        };
      } else {
        // For non-Stripe subscriptions, just update status
        await db
          .update(subscriptions)
          .set({
            status: 'canceled',
            canceledAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(subscriptions.subscriptionId, currentSubscription.subscriptionId));

        return {
          subscriptionId: currentSubscription.subscriptionId,
          status: 'canceled',
          canceledAt: new Date()
        };
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  // Change subscription plan (upgrade/downgrade)
  static async changePlan({ tenantId, planId, billingCycle = 'monthly' }) {
    try {
      console.log('🔄 Changing plan for tenant:', tenantId, 'to plan:', planId);

      // Get current subscription
      const currentSubscription = await this.getCurrentSubscription(tenantId);
      if (!currentSubscription) {
        throw new Error('No current subscription found');
      }

      // Get target plan details
      const plans = await this.getAvailablePlans();
      const targetPlan = plans.find(p => p.id === planId);
      if (!targetPlan) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }

      const currentPlan = plans.find(p => p.id === currentSubscription.plan);

      // Check if this is a downgrade and enforce billing cycle restrictions
      const planHierarchy = {
        'free': 0,
        'trial': 1,
        'starter': 2,
        'professional': 3,
        'enterprise': 4
      };

      const currentLevel = planHierarchy[currentPlan?.id] || 0;
      const targetLevel = planHierarchy[targetPlan.id] || 0;
      const isDowngrade = targetLevel < currentLevel;

      // NEW: Enforce billing cycle restrictions for downgrades
      if (isDowngrade && currentSubscription.status === 'active') {
        const now = new Date();
        const currentPeriodEnd = new Date(currentSubscription.currentPeriodEnd);
        const billingCycleType = currentSubscription.billingCycle || 'monthly';
        
        // Calculate days remaining in current billing cycle
        const daysRemaining = Math.ceil((currentPeriodEnd - now) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 7) { // More than a week remaining
          const endDateStr = currentPeriodEnd.toLocaleDateString();
          throw new Error(
            `Plan downgrades are only allowed within 7 days of your billing cycle end. ` +
            `Your current ${billingCycleType} plan renews on ${endDateStr}. ` +
            `You can schedule a plan change to take effect on ${endDateStr}, or wait until then to downgrade. ` +
            `Since you've paid for the full ${billingCycleType} period, you'll continue to have access to all features until ${endDateStr}.`
          );
        }

        // If within 7 days of renewal, allow but schedule for end of period
        console.log(`⏰ Downgrade scheduled for end of billing period: ${endDateStr}`);
        
        // Schedule the downgrade instead of processing immediately
        return await this.scheduleDowngrade({ tenantId, planId, effectiveDate: currentPeriodEnd });
      }

      // Check for other downgrade restrictions (legacy)
      if (currentPlan && !this.isValidPlanChange(currentPlan, targetPlan)) {
        throw new Error(`Cannot downgrade from ${currentPlan.name} to ${targetPlan.name} - plan restrictions apply`);
      }

      // Trial plans are not available through plan changes - only at account creation
      if (planId === 'trial') {
        throw new Error('Trial plans cannot be selected through subscription changes. Trials are only available during account creation.');
      }

      // Allow upgrades immediately (no billing cycle restrictions)
      if (!isDowngrade) {
        console.log('⬆️ Processing immediate upgrade');
        return await this.processImmediatePlanChange({ 
          tenantId, 
          currentSubscription, 
          targetPlan, 
          planId, 
          billingCycle 
        });
      }

      // Process immediate plan change for same-level changes or allowed downgrades
      return await this.processImmediatePlanChange({ 
        tenantId, 
        currentSubscription, 
        targetPlan, 
        planId, 
        billingCycle 
      });

    } catch (error) {
      console.error('Error changing plan:', error);
      throw error;
    }
  }

  // NEW: Schedule a downgrade for the end of billing period
  static async scheduleDowngrade({ tenantId, planId, effectiveDate }) {
    try {
      // Record the scheduled change in subscription_history
      await db.insert(subscriptionHistory).values({
        subscriptionHistoryId: randomUUID(),
        tenantId: tenantId,
        actionType: 'scheduled_downgrade',
        fromPlan: (await this.getCurrentSubscription(tenantId)).plan,
        toPlan: planId,
        effectiveDate: effectiveDate,
        scheduledAt: new Date(),
        notes: `Downgrade scheduled for end of current billing period`,
        createdAt: new Date()
      });

      return {
        message: `Downgrade to ${planId} scheduled for ${effectiveDate.toLocaleDateString()}`,
        scheduledFor: effectiveDate,
        currentAccess: 'You will continue to have full access to your current plan features until the scheduled date.',
        subscription: await this.getCurrentSubscription(tenantId)
      };
    } catch (error) {
      console.error('Error scheduling downgrade:', error);
      throw error;
    }
  }

  // NEW: Process immediate plan changes (upgrades and allowed changes)
  static async processImmediatePlanChange({ tenantId, currentSubscription, targetPlan, planId, billingCycle }) {
    try {
      // Handle upgrade/change to paid plan
      if (currentSubscription.stripeSubscriptionId && this.isStripeConfigured()) {
        // Update existing Stripe subscription
        const priceId = billingCycle === 'yearly' ? targetPlan.stripeYearlyPriceId : targetPlan.stripePriceId;
        
        if (!priceId) {
          throw new Error(`Stripe price ID not configured for ${planId} plan (${billingCycle})`);
        }

        const updatedSubscription = await stripe.subscriptions.update(
          currentSubscription.stripeSubscriptionId,
          {
            items: [{
              id: currentSubscription.stripeSubscriptionId,
              price: priceId,
            }],
            proration_behavior: 'always_invoice',
          }
        );

        // Update our database
        await db
          .update(subscriptions)
          .set({
            plan: planId,
            status: updatedSubscription.status,
            subscribedTools: targetPlan.tools || targetPlan.modules,
            usageLimits: targetPlan.limits,
            monthlyPrice: targetPlan.monthlyPrice,
            yearlyPrice: targetPlan.yearlyPrice,
            billingCycle: billingCycle,
            trialEnd: null, // Clear trial data for paid plans
            updatedAt: new Date()
          })
          .where(eq(subscriptions.tenantId, tenantId));

        // Update Administrator roles when plan changes - Enhanced version
        await this.updateAdministratorRolesForPlan(tenantId, planId);

        // 🎯 UPDATE ORGANIZATION APPLICATIONS FOR NEW PLAN (CRITICAL ADDITION)
        try {
          console.log('🏢 Updating organization applications for plan change...');
          const { OnboardingOrganizationSetupService } = await import('./onboarding-organization-setup.js');
          await OnboardingOrganizationSetupService.updateOrganizationApplicationsForPlanChange(tenantId, planId);
          console.log('✅ Organization applications updated for new plan');
        } catch (orgAppError) {
          console.error('❌ Failed to update organization applications:', orgAppError.message);
          // Don't fail the plan change, but log for manual intervention
        }

        return {
          message: 'Plan changed successfully',
          subscription: await this.getCurrentSubscription(tenantId)
        };
      } else {
        // Create new Stripe subscription for plan change
        return await this.createCheckoutSession({
          tenantId,
          planId,
          billingCycle,
          successUrl: `${process.env.FRONTEND_URL}/billing?payment=success&plan=${planId}`,
          cancelUrl: `${process.env.FRONTEND_URL}/billing?payment=cancelled`
        });
      }
    } catch (error) {
      console.error('Error processing immediate plan change:', error);
      throw error;
    }
  }

  // Helper method to check if plan change is valid
  static isValidPlanChange(currentPlan, targetPlan) {
    // Can always upgrade to higher plans
    const planHierarchy = {
      'free': 0,
      'trial': 1,
      'starter': 2,
      'professional': 3,
      'enterprise': 4
    };

    const currentLevel = planHierarchy[currentPlan.id] || 0;
    const targetLevel = planHierarchy[targetPlan.id] || 0;

    // Allow upgrades or same level changes
    if (targetLevel >= currentLevel) return true;

    // Allow downgrade if target plan allows it
    return targetPlan.allowDowngrade !== false;
  }

  // Update Administrator roles when plan changes - Enhanced version
  static async updateAdministratorRolesForPlan(tenantId, newPlanId) {
    try {
      console.log(`🔐 Updating Administrator roles for tenant ${tenantId} to ${newPlanId} plan`);
      
      // Import required utilities
      const { createSuperAdminRoleConfig, generateSuperAdminPermissions, getSuperAdminRestrictions } = await import('../utils/super-admin-permissions.js');
      const { PLAN_ACCESS_MATRIX } = await import('../data/permission-matrix.js');
      
      // Get plan details
      const planAccess = PLAN_ACCESS_MATRIX[newPlanId];
      if (!planAccess) {
        throw new Error(`Plan ${newPlanId} not found in access matrix`);
      }
      
      // Find all administrator roles for this tenant (both system and custom admin roles)
      const adminRoles = await db
        .select()
        .from(customRoles)
        .where(and(
          eq(customRoles.tenantId, tenantId),
          or(
            // System Super Administrator role
            and(
              eq(customRoles.roleName, 'Super Administrator'),
              eq(customRoles.isSystemRole, true)
            ),
            // Custom roles that contain admin-like permissions
            and(
              eq(customRoles.isSystemRole, false),
              sql`${customRoles.permissions}::text ILIKE '%"system"%'`
            ),
            // Roles with "Administrator" or "Admin" in the name
            or(
              sql`${customRoles.roleName} ILIKE '%administrator%'`,
              sql`${customRoles.roleName} ILIKE '%admin%'`
            )
          )
        ));
      
      console.log(`📋 Found ${adminRoles.length} administrator role(s) to update`);
      
      // Update each administrator role
      for (const role of adminRoles) {
        try {
          let updatedPermissions, updatedRestrictions, updatedDescription;
          
          if (role.roleName === 'Super Administrator' && role.isSystemRole) {
            // Use comprehensive Super Admin configuration
            const newRoleConfig = createSuperAdminRoleConfig(newPlanId, tenantId, role.createdBy);
            updatedPermissions = newRoleConfig.permissions;
            updatedRestrictions = newRoleConfig.restrictions;
            updatedDescription = newRoleConfig.description;
            
            console.log(`   🎯 Updating Super Administrator with full ${newPlanId} plan access`);
          } else {
            // For custom admin roles, enhance their existing permissions with new plan features
            updatedPermissions = await this.enhanceAdminPermissionsForPlan(role.permissions, newPlanId, planAccess);
            updatedRestrictions = await this.updateAdminRestrictionsForPlan(role.restrictions, newPlanId, planAccess);
            updatedDescription = `${role.description} (Updated for ${newPlanId.charAt(0).toUpperCase() + newPlanId.slice(1)} Plan)`;
            
            console.log(`   🔧 Enhancing custom admin role: ${role.roleName}`);
          }
          
          // Update the role in database
          await db
            .update(customRoles)
            .set({
              description: updatedDescription,
              permissions: updatedPermissions,
              restrictions: updatedRestrictions,
              updatedAt: new Date()
            })
            .where(eq(customRoles.roleId, role.roleId));
          
          console.log(`   ✅ Updated role: ${role.roleName}`);
          
        } catch (roleError) {
          console.error(`   ❌ Failed to update role ${role.roleName}:`, roleError.message);
          // Continue with other roles
        }
      }
      
      // Also update any tenant admin users to ensure they get new permissions
      await this.updateTenantAdminUsersForPlan(tenantId, newPlanId);
      
      console.log(`✅ Completed administrator role updates for tenant ${tenantId} with ${newPlanId} plan`);
      
    } catch (error) {
      console.error(`❌ Failed to update administrator roles for tenant ${tenantId}:`, error);
      // Don't throw error - this shouldn't break the subscription update
    }
  }

  // Helper method to enhance existing admin permissions with new plan features
  static async enhanceAdminPermissionsForPlan(existingPermissions, newPlanId, planAccess) {
    try {
      const { generateSuperAdminPermissions } = await import('../utils/super-admin-permissions.js');
      
      // Get new plan permissions
      const newPlanPermissions = generateSuperAdminPermissions(newPlanId);
      
      // Merge existing permissions with new plan permissions
      const enhancedPermissions = { ...existingPermissions };
      
      // Add new applications that are now available
      planAccess.applications.forEach(appCode => {
        if (!enhancedPermissions[appCode]) {
          enhancedPermissions[appCode] = {};
        }
        
        // Add new modules for this application
        const appModules = planAccess.modules[appCode];
        if (appModules === '*') {
          // Full access - copy from new plan permissions
          enhancedPermissions[appCode] = newPlanPermissions[appCode] || {};
        } else if (Array.isArray(appModules)) {
          // Specific modules - add them if not already present
          appModules.forEach(moduleCode => {
            if (!enhancedPermissions[appCode][moduleCode] && newPlanPermissions[appCode]?.[moduleCode]) {
              enhancedPermissions[appCode][moduleCode] = newPlanPermissions[appCode][moduleCode];
            }
          });
        }
      });
      
      // Enhance system-level permissions
      if (newPlanPermissions.system) {
        enhancedPermissions.system = {
          ...enhancedPermissions.system,
          ...newPlanPermissions.system
        };
      }
      
      return enhancedPermissions;
    } catch (error) {
      console.error('Failed to enhance admin permissions:', error);
      return existingPermissions; // Return original on error
    }
  }

  // Helper method to update admin restrictions for new plan
  static async updateAdminRestrictionsForPlan(existingRestrictions, newPlanId, planAccess) {
    try {
      const { getSuperAdminRestrictions } = await import('../utils/super-admin-permissions.js');
      
      // Get new plan restrictions
      const newPlanRestrictions = getSuperAdminRestrictions(newPlanId);
      
      // Update restrictions with new plan limits
      const updatedRestrictions = {
        ...existingRestrictions,
        ...newPlanRestrictions,
        planType: newPlanId,
        lastUpgraded: new Date().toISOString()
      };
      
      // Remove restrictions that are no longer applicable
      if (planAccess.limitations.users === -1) {
        delete updatedRestrictions.maxUsers;
      }
      if (planAccess.limitations.roles === -1) {
        delete updatedRestrictions.maxRoles;
      }
      if (planAccess.limitations.storage === 'unlimited') {
        delete updatedRestrictions.storageLimit;
      }
      if (planAccess.limitations.apiCalls === -1) {
        delete updatedRestrictions.apiCallLimit;
      }
      
      return updatedRestrictions;
    } catch (error) {
      console.error('Failed to update admin restrictions:', error);
      return existingRestrictions; // Return original on error
    }
  }

  // Helper method to update tenant admin users for new plan
  static async updateTenantAdminUsersForPlan(tenantId, newPlanId) {
    try {
      console.log(`👥 Checking tenant admin users for plan update...`);
      
      // Find users with tenant admin privileges
      const tenantAdminUsers = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isTenantAdmin, true)
        ));
      
      if (tenantAdminUsers.length > 0) {
        console.log(`   📝 Found ${tenantAdminUsers.length} tenant admin user(s) - permissions will be refreshed on next login`);
        
        // Update their last updated timestamp to trigger permission refresh
        await db
          .update(tenantUsers)
          .set({
            updatedAt: new Date()
          })
          .where(and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.isTenantAdmin, true)
          ));
      }
      
    } catch (error) {
      console.error('Failed to update tenant admin users:', error);
    }
  }

  // Keep the original method for backward compatibility but make it call the enhanced version
  static async updateSuperAdminRoleForPlan(tenantId, newPlanId) {
    return await this.updateAdministratorRolesForPlan(tenantId, newPlanId);
  }

  // Helper method to get plan ID from Stripe price ID
  static async getPlanIdFromPriceId(priceId) {
    try {
      const plans = await this.getAvailablePlans();
      
      for (const plan of plans) {
        if (plan.stripePriceId === priceId || plan.stripeYearlyPriceId === priceId) {
          return plan.id;
        }
      }
      
      console.warn(`⚠️ Plan not found for price ID: ${priceId}`);
      return null;
    } catch (error) {
      console.error('Error getting plan ID from price ID:', error);
      return null;
    }
  }

  // Check if tenant has used trial before
  static async checkTrialHistory(tenantId) {
    const [trialHistory] = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.tenantId, tenantId),
        eq(subscriptions.plan, 'trial')
      ))
      .limit(1);

    return !!trialHistory;
  }

  // Handle Stripe webhooks
  static async handleWebhook(rawBody, signature) {
    try {
      if (!this.isStripeConfigured()) {
        throw new Error('Stripe not properly configured');
      }

      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!endpointSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
      
      console.log('🎣 Stripe webhook received:', event.type);

      // Check for webhook idempotency
      const existingWebhook = await db.select()
        .from(webhookLogs)
        .where(eq(webhookLogs.eventId, event.id))
        .limit(1);

      if (existingWebhook.length > 0) {
        const webhook = existingWebhook[0];
        console.log(`🔄 Webhook ${event.id} already processed with status: ${webhook.status}`);
        
        if (webhook.status === 'completed') {
          return { processed: true, eventType: event.type, skipped: true, reason: 'already_processed' };
        } else if (webhook.status === 'processing') {
          // If still processing, wait a bit and check again
          console.log('⏳ Webhook still processing, returning success to prevent retry');
          return { processed: true, eventType: event.type, skipped: true, reason: 'still_processing' };
        }
        // If failed before, we'll retry by continuing
      }

      // Log webhook processing start
      await db.insert(webhookLogs).values({
        eventId: event.id,
        eventType: event.type,
        status: 'processing'
      }).onConflictDoUpdate({
        target: webhookLogs.eventId,
        set: {
          status: 'processing',
          updatedAt: new Date()
        }
      });

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
          
        case 'invoice.paid':
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
          
        case 'invoice_payment.paid':
          await this.handleInvoicePaymentPaid(event.data.object);
          break;
          
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
          
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
          
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
          
        case 'charge.dispute.created':
          await this.handleChargeDispute(event.data.object);
          break;
          
        case 'charge.succeeded':
          await this.handleChargeSucceeded(event.data.object);
          break;
          
        case 'refund.created':
          await this.handleRefund(event.data.object);
          break;
          
        default:
          console.log(`⚠️ Unhandled webhook event type: ${event.type}`);
      }

      // Mark webhook as completed
      await db.update(webhookLogs)
        .set({ 
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(webhookLogs.eventId, event.id));

      return { processed: true, eventType: event.type };
    } catch (error) {
      // Mark webhook as failed
      try {
        await db.update(webhookLogs)
          .set({ 
            status: 'failed',
            errorMessage: error.message,
            updatedAt: new Date()
          })
          .where(eq(webhookLogs.eventId, event?.id || 'unknown'));
      } catch (logError) {
        console.error('Failed to log webhook error:', logError);
      }
      const errorEventType = event?.type || 'unknown';
      const errorEventId = event?.id || 'unknown';
      
      console.error('❌ Webhook processing error for event type:', errorEventType, error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        eventType: errorEventType,
        eventId: errorEventId
      });
      
      // Don't throw error for test webhooks or missing metadata
      if (error.message.includes('Missing tenantId or planId') || error.message.includes('test webhook')) {
        console.log('🔄 Returning success for test webhook to prevent 500 error');
        return { processed: true, eventType: event.type, skipped: true, reason: error.message };
      }
      
      throw error;
    }
  }

  // Handle checkout session completed webhook
  static async handleCheckoutCompleted(session) {
    try {
      console.log('🛒 Processing checkout completion:', session.id);
      
      const tenantId = session.metadata?.tenantId;
      const planId = session.metadata?.planId;
      const billingCycle = session.metadata?.billingCycle || 'monthly';

    if (!tenantId || !planId) {
        console.warn('⚠️ Missing metadata in checkout session (likely test webhook):', { tenantId, planId });
        console.log('📝 Session details:', {
          id: session.id,
          mode: session.mode,
          metadata: session.metadata,
          customer: session.customer,
          subscription: session.subscription
        });
        
        // For test webhooks or sessions without metadata, skip processing
        if (session.mode === 'payment' || !session.subscription) {
          console.log('⏭️ Skipping test webhook or non-subscription session');
          return;
        }
        
        throw new Error('Missing tenantId or planId in checkout session metadata');
    }

      // Get the plan details
    const plans = await this.getAvailablePlans();
    const plan = plans.find(p => p.id === planId);

      if (!plan) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }

      // Check if subscription already exists
      const existingSubscription = await this.getCurrentSubscription(tenantId);
      
      let subscriptionRecord;
      
      if (existingSubscription) {
        console.log('🔄 Updating existing subscription for tenant:', tenantId);
        
        // Update existing subscription with upgrade tracking
        const updateData = {
          plan: planId,
          status: 'active',
          stripeSubscriptionId: session.subscription,
          stripeCustomerId: session.customer,
          subscribedTools: plan.tools,
          usageLimits: plan.limits,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          billingCycle: billingCycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
          trialToggledOff: true, // Disable trial restrictions after upgrade
          updatedAt: new Date()
        };
        
        // Track if this is their first upgrade from trial
        if (existingSubscription.plan === 'trial' || existingSubscription.isTrialUser) {
          updateData.hasEverUpgraded = true;
          updateData.firstUpgradeAt = new Date();
          updateData.isTrialUser = false;
        }
        
        const [updatedSubscription] = await db
          .update(subscriptions)
          .set(updateData)
          .where(eq(subscriptions.tenantId, tenantId))
          .returning();
          
        if (!updatedSubscription) {
          throw new Error(`Failed to update subscription for tenant: ${tenantId}`);
        }
        
        console.log('✅ Subscription updated successfully:', updatedSubscription.subscriptionId);
          
        // Update administrator roles for the new plan
        await this.updateAdministratorRolesForPlan(tenantId, planId);
        
        // Update organization applications for the new plan
        try {
          const { OnboardingOrganizationSetupService } = await import('./onboarding-organization-setup.js');
          await OnboardingOrganizationSetupService.updateOrganizationApplicationsForPlanChange(
            tenantId, 
            planId,
            { skipIfRecentlyUpdated: true } // Enable idempotency
          );
          console.log('✅ Organization applications updated for new plan');
        } catch (orgAppError) {
          console.error('❌ Failed to update organization applications:', orgAppError.message);
          // Don't fail the checkout, but log for manual intervention
        }
          
        subscriptionRecord = existingSubscription;
      } else {
        console.log('🆕 Creating new subscription for tenant:', tenantId);
        
        // Create new subscription with upgrade tracking
        const [newSubscription] = await db.insert(subscriptions).values({
          subscriptionId: uuidv4(),
          tenantId,
          plan: planId,
          status: 'active',
          stripeSubscriptionId: session.subscription,
          stripeCustomerId: session.customer,
          subscribedTools: plan.tools,
          usageLimits: plan.limits,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          billingCycle: billingCycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
          hasEverUpgraded: true, // New subscription is automatically an upgrade
          firstUpgradeAt: new Date(),
          trialToggledOff: true, // Disable trial restrictions for new paid subscriptions
          isTrialUser: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        subscriptionRecord = newSubscription;
      }

      // Don't create payment record here - it will be created by handlePaymentSucceeded webhook
      // This prevents duplicate payment records for the same transaction
      console.log('💰 Checkout completed - payment will be recorded by invoice.payment_succeeded webhook');

      // Update tenant with Stripe customer ID if not already set
      const [updatedTenant] = await db
        .update(tenants)
        .set({
          stripeCustomerId: session.customer,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId))
        .returning();
        
      if (!updatedTenant) {
        console.warn('⚠️ Failed to update tenant with Stripe customer ID:', tenantId);
      } else {
        console.log('✅ Tenant updated with Stripe customer ID:', updatedTenant.tenantId);
      }

      console.log('✅ Checkout completed successfully for tenant:', tenantId, 'plan:', planId);
      
    } catch (error) {
      console.error('Error handling checkout completed:', error);
      throw error;
    }
  }

  // Handle payment succeeded webhook
  static async handlePaymentSucceeded(invoice) {
    try {
      console.log('💰 Processing payment succeeded for invoice:', invoice.id);
      console.log('📋 Invoice details:', {
        id: invoice.id,
        customer: invoice.customer,
        subscription: invoice.subscription,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status
      });
      
      const subscriptionId = invoice.subscription;
      
      if (subscriptionId) {
        // Get subscription to find tenantId
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (!subscription) {
          console.error('❌ Subscription not found for payment:', subscriptionId);
          
          // Try to find by customer ID as fallback
          const [fallbackSubscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeCustomerId, invoice.customer))
            .limit(1);
            
          if (fallbackSubscription) {
            console.log('✅ Found subscription by customer ID:', invoice.customer);
            
            // Update with the subscription ID
            await db
              .update(subscriptions)
              .set({
                stripeSubscriptionId: subscriptionId,
                status: 'active',
                updatedAt: new Date()
              })
              .where(eq(subscriptions.subscriptionId, fallbackSubscription.subscriptionId));
              
            // Trigger role upgrade for the new plan
            if (invoice.lines?.data?.[0]?.price?.id) {
              const planId = await this.getPlanIdFromPriceId(invoice.lines.data[0].price.id);
              if (planId) {
                console.log(`🔄 Triggering role upgrade for plan: ${planId}`);
                await this.updateAdministratorRolesForPlan(fallbackSubscription.tenantId, planId);
                
                // Also update organization applications
                try {
                  const { OnboardingOrganizationSetupService } = await import('./onboarding-organization-setup.js');
                  await OnboardingOrganizationSetupService.updateOrganizationApplicationsForPlanChange(fallbackSubscription.tenantId, planId);
                  console.log('✅ Organization applications updated for new plan');
                } catch (orgAppError) {
                  console.error('❌ Failed to update organization applications:', orgAppError.message);
                }
              }
            }
            
            return;
          }
          
          throw new Error(`Subscription not found: ${subscriptionId}`);
        }

        // Update subscription status
        await db
          .update(subscriptions)
          .set({
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
          
        // Trigger role upgrade for the active plan
        if (invoice.lines?.data?.[0]?.price?.id) {
          const planId = await this.getPlanIdFromPriceId(invoice.lines.data[0].price.id);
          if (planId) {
            console.log(`🔄 Triggering role upgrade for plan: ${planId}`);
            await this.updateAdministratorRolesForPlan(subscription.tenantId, planId);
            
            // Also update organization applications (with idempotency)
            try {
              const { OnboardingOrganizationSetupService } = await import('./onboarding-organization-setup.js');
              const result = await OnboardingOrganizationSetupService.updateOrganizationApplicationsForPlanChange(
                subscription.tenantId, 
                planId,
                { skipIfRecentlyUpdated: true } // Enable idempotency
              );
              
              if (result.skipped) {
                console.log('⏭️ Organization applications update skipped - recently updated');
              } else {
                console.log('✅ Organization applications updated for new plan');
              }
            } catch (orgAppError) {
              console.error('❌ Failed to update organization applications:', orgAppError.message);
            }
          }
        }

        // Record comprehensive payment details
        await this.createPaymentRecord({
          tenantId: subscription.tenantId,
          subscriptionId: subscription.subscriptionId,
        stripePaymentIntentId: invoice.payment_intent,
        stripeInvoiceId: invoice.id,
          stripeChargeId: invoice.charge,
          amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency.toUpperCase(),
        status: 'succeeded',
          paymentMethod: 'card',
          paymentType: 'subscription',
          billingReason: invoice.billing_reason,
          invoiceNumber: invoice.number,
          description: `Subscription payment for ${subscription.plan} plan`,
          
          // Enhanced financial breakdown
          taxAmount: (invoice.tax || 0) / 100,
          processingFees: 0, // Stripe doesn't provide this in invoice, would need to calculate
          netAmount: (invoice.amount_paid - (invoice.tax || 0)) / 100,
          
          // Payment method details (if available)
          paymentMethodDetails: invoice.payment_intent ? {} : {}, // Would need to fetch from payment_intent
          
          // Risk assessment (if available)
          riskLevel: 'normal', // Would need to assess based on invoice details
          
          // Comprehensive metadata
          metadata: {
            stripeCustomerId: invoice.customer,
            billingReason: invoice.billing_reason,
            subscriptionPeriod: {
              start: new Date(invoice.period_start * 1000),
              end: new Date(invoice.period_end * 1000)
            },
            attempt_count: invoice.attempt_count,
            nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null
          },
          stripeRawData: invoice,
          
          paidAt: new Date(invoice.status_transitions.paid_at * 1000)
        });

        console.log('✅ Payment succeeded and recorded for tenant:', subscription.tenantId, 'amount:', invoice.amount_paid / 100);
      } else {
        console.log('⚠️ Payment succeeded but no subscription ID found in invoice:', invoice.id);
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  // Handle invoice payment paid webhook (different from invoice.payment_succeeded)
  static async handleInvoicePaymentPaid(invoicePayment) {
    try {
      console.log('💰 Processing invoice payment paid:', invoicePayment.id);
      console.log('📋 Invoice Payment details:', {
        id: invoicePayment.id,
        invoice: invoicePayment.invoice,
        amount_paid: invoicePayment.amount_paid,
        currency: invoicePayment.currency,
        status: invoicePayment.status,
        payment_intent: invoicePayment.payment?.payment_intent
      });
      
      // Get the invoice to find subscription and customer details
      if (!this.isStripeConfigured()) {
        console.log('⚠️ Stripe not configured - skipping invoice payment processing');
        return;
      }
      
      try {
        const invoice = await stripe.invoices.retrieve(invoicePayment.invoice);
        console.log('📄 Retrieved invoice:', {
          id: invoice.id,
          customer: invoice.customer,
          subscription: invoice.subscription,
          status: invoice.status
        });
        
        // Process this like a regular invoice payment
        await this.handlePaymentSucceeded(invoice);
        
      } catch (stripeError) {
        console.error('❌ Failed to retrieve invoice from Stripe:', stripeError);
        
        // Fallback: try to find subscription by invoice payment details
        if (invoicePayment.payment?.payment_intent) {
          const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.stripePaymentIntentId, invoicePayment.payment.payment_intent))
            .limit(1);
            
          if (payment) {
            console.log('✅ Found payment record, updating status');
            await db
              .update(payments)
              .set({
                status: 'succeeded',
                paidAt: new Date(invoicePayment.status_transitions.paid_at * 1000),
                updatedAt: new Date()
              })
              .where(eq(payments.paymentId, payment.paymentId));
          }
        }
      }
      
    } catch (error) {
      console.error('Error handling invoice payment paid:', error);
      throw error;
    }
  }

  // Handle payment failed webhook
  static async handlePaymentFailed(invoice) {
    try {
      console.log('❌ Processing payment failed for invoice:', invoice.id);
      
      const subscriptionId = invoice.subscription;
      
      if (subscriptionId) {
        // Get subscription to find tenantId
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (!subscription) {
          console.error('❌ Subscription not found for failed payment:', subscriptionId);
          return;
        }

      // Update subscription status
      await db
        .update(subscriptions)
          .set({
            status: 'past_due',
            updatedAt: new Date()
          })
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

        // Record comprehensive failed payment
        await this.createPaymentRecord({
          tenantId: subscription.tenantId,
          subscriptionId: subscription.subscriptionId,
          stripePaymentIntentId: invoice.payment_intent,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_due / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'failed',
          paymentMethod: 'card',
          paymentType: 'subscription',
          billingReason: invoice.billing_reason,
          invoiceNumber: invoice.number,
          description: `Failed subscription payment for ${subscription.plan} plan`,
          
          // Failure details
          metadata: {
            stripeCustomerId: invoice.customer,
            failureReason: invoice.last_finalization_error?.message || 'Payment failed',
            failureCode: invoice.last_finalization_error?.code,
            attemptCount: invoice.attempt_count,
            nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
            billingReason: invoice.billing_reason
          },
          stripeRawData: invoice,
          
          failedAt: new Date()
        });

        console.log('❌ Payment failed and recorded for tenant:', subscription.tenantId);
        
        // Send payment failure notification email
        await EmailService.sendPaymentFailedNotification({
          tenantId: subscription.tenantId,
          amount: invoice.amount_due / 100,
          currency: invoice.currency.toUpperCase(),
          nextAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
          failureReason: invoice.last_finalization_error?.message || 'Payment failed'
        });
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
      throw error;
    }
  }

  // Handle charge dispute webhook
  static async handleChargeDispute(dispute) {
    try {
      console.log('⚖️ Processing charge dispute:', dispute.id);
      
      // Find the payment record
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.stripeChargeId, dispute.charge))
        .limit(1);

      if (!payment) {
        console.error('❌ Payment not found for dispute:', dispute.charge);
        return;
      }

      // Update payment record with dispute information
      await db
        .update(payments)
        .set({
          status: 'disputed',
          stripeDisputeId: dispute.id,
          amountDisputed: (dispute.amount / 100).toString(),
          disputeReason: dispute.reason,
          disputeStatus: dispute.status,
          disputedAt: new Date(dispute.created * 1000),
          updatedAt: new Date(),
          metadata: {
            ...payment.metadata,
            dispute: {
              id: dispute.id,
              reason: dispute.reason,
              status: dispute.status,
              amount: dispute.amount / 100,
              currency: dispute.currency,
              evidence_due_by: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : null,
              has_evidence: dispute.evidence_details?.has_evidence || false
            }
          },
          stripeRawData: {
            ...payment.stripeRawData,
            dispute: dispute
          }
        })
        .where(eq(payments.paymentId, payment.paymentId));

      // Send dispute notification
      await EmailService.sendDisputeNotification({
        tenantId: payment.tenantId,
        disputeId: dispute.id,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        reason: dispute.reason,
        evidenceDueBy: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : null
      });

      console.log('⚖️ Dispute recorded for payment:', payment.paymentId);
    } catch (error) {
      console.error('Error handling charge dispute:', error);
      throw error;
    }
  }

  // Handle refund webhook
  static async handleRefund(refund) {
    try {
      console.log('💸 Processing refund:', refund.id);
      
      // Find the original payment
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.stripeChargeId, refund.charge))
        .limit(1);

      if (!payment) {
        console.error('❌ Payment not found for refund:', refund.charge);
        return;
      }

      const refundAmount = refund.amount / 100;
      const isPartialRefund = refundAmount < parseFloat(payment.amount);

      // Update original payment record
    await db
        .update(payments)
      .set({
          amountRefunded: refundAmount.toString(),
          status: isPartialRefund ? 'partially_refunded' : 'refunded',
          stripeRefundId: refund.id,
          isPartialRefund,
          refundedAt: new Date(refund.created * 1000),
        updatedAt: new Date(),
          metadata: {
            ...payment.metadata,
            refund: {
              id: refund.id,
              amount: refundAmount,
              reason: refund.reason,
              status: refund.status,
              created: new Date(refund.created * 1000)
            }
          }
        })
        .where(eq(payments.paymentId, payment.paymentId));

      // Create refund payment record
      await this.createPaymentRecord({
        tenantId: payment.tenantId,
        subscriptionId: payment.subscriptionId,
        stripeChargeId: refund.charge,
        stripeRefundId: refund.id,
        amount: -refundAmount, // Negative for refund
        currency: refund.currency.toUpperCase(),
        status: refund.status,
        paymentType: 'refund',
        billingReason: 'refund',
        description: `Refund for ${refund.reason || 'customer request'}`,
        metadata: {
          originalPaymentId: payment.paymentId,
          refundReason: refund.reason,
          isPartialRefund
        },
        stripeRawData: refund,
        paidAt: new Date(refund.created * 1000)
      });

      console.log('💸 Refund recorded:', refund.id, 'amount:', refundAmount);
    } catch (error) {
      console.error('Error handling refund:', error);
      throw error;
    }
  }

  // Handle subscription updated webhook
  static async handleSubscriptionUpdated(subscription) {
    try {
      await db
        .update(subscriptions)
        .set({
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date()
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

      console.log('🔄 Subscription updated:', subscription.id);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  // Handle subscription created webhook
  static async handleSubscriptionCreated(subscription) {
    try {
      console.log('🆕 Processing subscription created:', subscription.id);
      
      // Find existing subscription by customer ID
      const [existingSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeCustomerId, subscription.customer))
        .limit(1);

      if (existingSubscription) {
        // Update existing subscription
        await db
          .update(subscriptions)
          .set({
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            updatedAt: new Date()
          })
          .where(eq(subscriptions.subscriptionId, existingSubscription.subscriptionId));
        
        console.log('✅ Updated existing subscription with Stripe subscription ID');
      }
    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  // Handle charge succeeded webhook
  static async handleChargeSucceeded(charge) {
    try {
      console.log('💳 Processing charge succeeded:', charge.id);
      
      // Find subscription by customer
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeCustomerId, charge.customer))
        .limit(1);

      if (subscription) {
        // Record payment
        await this.createPaymentRecord({
          tenantId: subscription.tenantId,
          subscriptionId: subscription.subscriptionId,
          stripeChargeId: charge.id,
          stripePaymentIntentId: charge.payment_intent,
          stripeCustomerId: charge.customer,
          amount: (charge.amount / 100).toString(),
          currency: charge.currency.toUpperCase(),
          status: 'succeeded',
          paymentMethod: charge.payment_method_details?.type || 'card',
          paymentType: 'subscription',
          description: charge.description || 'Subscription payment',
          metadata: charge.metadata || {},
          stripeRawData: charge,
          paidAt: new Date(charge.created * 1000)
        });
      }
    } catch (error) {
      console.error('Error handling charge succeeded:', error);
      throw error;
    }
  }

  // Handle subscription deleted webhook
  static async handleSubscriptionDeleted(subscription) {
    try {
    await db
      .update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

      console.log('🗑️ Subscription deleted:', subscription.id);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  // Create comprehensive payment record
  static async createPaymentRecord(paymentData) {
    try {
      const paymentRecord = {
        paymentId: uuidv4(),
        tenantId: paymentData.tenantId,
        subscriptionId: paymentData.subscriptionId,
        
        // Stripe IDs
        stripePaymentIntentId: paymentData.stripePaymentIntentId,
        stripeInvoiceId: paymentData.stripeInvoiceId,
        stripeChargeId: paymentData.stripeChargeId,
        
        // Payment amounts
        amount: paymentData.amount.toString(),
        currency: paymentData.currency?.toUpperCase() || 'USD',
        status: paymentData.status,
        
        // Payment details
        paymentMethod: paymentData.paymentMethod || 'card',
        paymentMethodDetails: paymentData.paymentMethodDetails || {},
        paymentType: paymentData.paymentType || 'subscription',
        billingReason: paymentData.billingReason,
        
        // Invoice info
        invoiceNumber: paymentData.invoiceNumber,
        description: paymentData.description,
        
        // Financial breakdown
        prorationAmount: paymentData.prorationAmount?.toString() || '0',
        taxAmount: paymentData.taxAmount?.toString() || '0',
        taxRate: paymentData.taxRate?.toString() || '0',
        taxRegion: paymentData.taxRegion,
        processingFees: paymentData.processingFees?.toString() || '0',
        netAmount: paymentData.netAmount?.toString(),
        
        // Risk assessment
        riskLevel: paymentData.riskLevel || 'normal',
        riskScore: paymentData.riskScore,
        fraudDetails: paymentData.fraudDetails || {},
        
        // Metadata
        metadata: paymentData.metadata || {},
        stripeRawData: paymentData.stripeRawData || {},
        
        // Timestamps
        paidAt: paymentData.paidAt || new Date(),
        createdAt: new Date()
      };

      const [payment] = await db.insert(payments).values(paymentRecord).returning();
      
      console.log('✅ Payment record created:', payment.paymentId);
      return payment;
    } catch (error) {
      console.error('❌ Failed to create payment record:', error);
      throw error;
    }
  }

  // Process immediate refund
  static async processRefund({ tenantId, paymentId, amount = null, reason = 'customer_request' }) {
    try {
      console.log('🔄 Processing refund for payment:', paymentId);

      // Get the payment record
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.paymentId, paymentId))
        .limit(1);

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.tenantId !== tenantId) {
        throw new Error('Payment does not belong to this tenant');
      }

      // Determine refund amount
      const refundAmount = amount || parseFloat(payment.amount);
      const isPartialRefund = amount && amount < parseFloat(payment.amount);

      // Process refund with Stripe
      let stripeRefund = null;
      if (payment.stripePaymentIntentId || payment.stripeChargeId) {
        const refundData = {
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: reason,
          metadata: {
            tenantId,
            paymentId,
            reason
          }
        };

        if (payment.stripePaymentIntentId) {
          refundData.payment_intent = payment.stripePaymentIntentId;
        } else if (payment.stripeChargeId) {
          refundData.charge = payment.stripeChargeId;
        }

        stripeRefund = await stripe.refunds.create(refundData);
        console.log('✅ Stripe refund created:', stripeRefund.id);
      }

      // Update payment record
      await db
        .update(payments)
        .set({
          amountRefunded: refundAmount.toString(),
          status: isPartialRefund ? 'partially_refunded' : 'refunded',
          refundReason: reason,
          refundRequestedBy: tenantId,
          isPartialRefund,
          stripeRefundId: stripeRefund?.id,
          refundedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(payments.paymentId, paymentId));

      // Create refund payment record
      await this.createPaymentRecord({
        tenantId,
        subscriptionId: payment.subscriptionId,
        stripePaymentIntentId: stripeRefund?.payment_intent,
        stripeChargeId: stripeRefund?.charge,
        amount: -refundAmount, // Negative amount for refund
        currency: payment.currency,
        status: 'succeeded',
        paymentType: 'refund',
        billingReason: 'refund_request',
        description: `Refund for ${reason}`,
        metadata: {
          originalPaymentId: paymentId,
          refundReason: reason,
          isPartialRefund
        },
        stripeRawData: stripeRefund || {}
      });

      console.log('✅ Refund processed successfully');
      return {
        refundId: stripeRefund?.id,
        amount: refundAmount,
        currency: payment.currency,
        status: 'succeeded',
        isPartialRefund
      };
    } catch (error) {
      console.error('❌ Refund processing failed:', error);
      throw error;
    }
  }

  // Immediate downgrade with optional refund
  static async immediateDowngrade({ tenantId, newPlan, reason = 'customer_request', refundRequested = false }) {
    try {
      console.log('🔄 Processing immediate downgrade:', { tenantId, newPlan, refundRequested });

      // Get current subscription
      const currentSubscription = await this.getCurrentSubscription(tenantId);
      if (!currentSubscription) {
        throw new Error('No active subscription found');
      }

      // Validate downgrade
      if (currentSubscription.plan === newPlan) {
        throw new Error('Already on the requested plan');
      }

      // Calculate proration and refund
      let refundAmount = 0;
      let prorationAmount = 0;

      if (refundRequested && currentSubscription.stripeSubscriptionId) {
        // Calculate prorated refund amount
        const remainingDays = Math.max(0, 
          Math.ceil((new Date(currentSubscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))
        );
        const totalDays = currentSubscription.billingCycle === 'yearly' ? 365 : 30;
        const prorationRatio = remainingDays / totalDays;
        
        const currentAmount = currentSubscription.billingCycle === 'yearly' 
          ? parseFloat(currentSubscription.yearlyPrice || 0)
          : parseFloat(currentSubscription.monthlyPrice || 0);
          
        prorationAmount = currentAmount * prorationRatio;
        refundAmount = prorationAmount;
      } else if (refundRequested && !currentSubscription.stripeSubscriptionId) {
        // For non-Stripe subscriptions, calculate based on last payment
        const [lastPayment] = await db
      .select()
      .from(payments)
          .where(and(
            eq(payments.tenantId, tenantId),
            eq(payments.status, 'succeeded'),
            eq(payments.paymentType, 'subscription')
          ))
      .orderBy(desc(payments.createdAt))
          .limit(1);

        if (lastPayment) {
          const paymentDate = new Date(lastPayment.paidAt || lastPayment.createdAt);
          const periodEnd = new Date(currentSubscription.currentPeriodEnd);
          const totalPeriod = currentSubscription.billingCycle === 'yearly' ? 365 : 30;
          const daysSincePayment = Math.ceil((new Date() - paymentDate) / (1000 * 60 * 60 * 24));
          const remainingDays = Math.max(0, totalPeriod - daysSincePayment);
          
          if (remainingDays > 0) {
            const prorationRatio = remainingDays / totalPeriod;
            refundAmount = parseFloat(lastPayment.amount) * prorationRatio;
            prorationAmount = refundAmount;
          }
        }
      }

      // Record subscription action
      const [subscriptionAction] = await db.insert(subscriptionActions).values({
        tenantId,
        subscriptionId: currentSubscription.subscriptionId,
        actionType: 'downgrade',
        fromPlan: currentSubscription.plan,
        toPlan: newPlan,
        fromBillingCycle: currentSubscription.billingCycle,
        toBillingCycle: currentSubscription.billingCycle,
        prorationAmount: prorationAmount.toString(),
        refundAmount: refundAmount.toString(),
        effectiveDate: new Date(),
        initiatedBy: tenantId,
        reason,
        status: 'processing',
        stripeSubscriptionId: currentSubscription.stripeSubscriptionId,
        impactAssessment: this.calculateFeatureLoss(currentSubscription.plan, newPlan),
      }).returning();

      // Cancel Stripe subscription if moving to trial
      if (newPlan === 'trial' && currentSubscription.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId, {
          prorate: refundRequested,
          invoice_now: refundRequested
        });
      } else if (currentSubscription.stripeSubscriptionId) {
        // Update Stripe subscription to new plan
        const plans = await this.getAvailablePlans();
        const targetPlan = plans.find(p => p.id === newPlan);
        
        if (targetPlan && targetPlan.stripePriceId) {
          await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
            items: [{
              id: currentSubscription.stripeSubscriptionId,
              price: targetPlan.stripePriceId,
            }],
            proration_behavior: refundRequested ? 'always_invoice' : 'none',
          });
        }
      }

      // Update subscription in database
      const targetPlan = (await this.getAvailablePlans()).find(p => p.id === newPlan);
      await db
        .update(subscriptions)
        .set({
          plan: newPlan,
          status: newPlan === 'trial' ? 'trialing' : currentSubscription.status,
          subscribedTools: targetPlan?.tools || ['crm'],
          usageLimits: targetPlan?.limits || { users: 2, apiCalls: 1000, storage: 1000000000, projects: 3 },
          monthlyPrice: targetPlan?.monthlyPrice || 0,
          yearlyPrice: targetPlan?.yearlyPrice || 0,
          stripeSubscriptionId: newPlan === 'trial' ? null : currentSubscription.stripeSubscriptionId,
          stripeCustomerId: newPlan === 'trial' ? null : currentSubscription.stripeCustomerId,
          trialEnd: newPlan === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
          updatedAt: new Date()
        })
        .where(eq(subscriptions.tenantId, tenantId));

      // Update administrator roles for the downgraded plan
      await this.updateAdministratorRolesForPlan(tenantId, newPlan);
      
      // Update organization applications for the downgraded plan
      try {
        const { OnboardingOrganizationSetupService } = await import('./onboarding-organization-setup.js');
        await OnboardingOrganizationSetupService.updateOrganizationApplicationsForPlanChange(tenantId, newPlan);
        console.log('✅ Organization applications updated for downgraded plan');
      } catch (orgAppError) {
        console.error('❌ Failed to update organization applications:', orgAppError.message);
        // Don't fail the downgrade, but log for manual intervention
      }
      
      // Get the updated subscription
      const updatedSubscription = await this.getCurrentSubscription(tenantId);

      // Record downgrade event appropriately
      if (newPlan === 'trial') {
        // If downgrading to trial, record as trial event
        await this.recordTrialEvent(tenantId, updatedSubscription.subscriptionId, 'plan_downgraded_to_trial', {
          fromPlan: currentSubscription.plan,
          toPlan: newPlan,
          downgradedAt: new Date(),
          refundRequested: refundRequested,
          prorationAmount: prorationAmount,
          refundAmount: refundAmount,
          isImmediate: true
        });
      } else {
        // Regular paid plan downgrade - create payment record
        const downgradePaymentRecord = await this.createPaymentRecord({
          tenantId: tenantId,
          subscriptionId: updatedSubscription.subscriptionId,
          amount: targetPlan.monthlyPrice,
          currency: 'USD',
          status: 'succeeded',
          paymentMethod: 'system',
          paymentType: 'plan_change',
          billingReason: 'plan_downgrade',
          description: `Downgraded from ${currentSubscription.plan} to ${newPlan}`,
          prorationAmount: -prorationAmount, // Negative because it's a credit
          metadata: {
            fromPlan: currentSubscription.plan,
            toPlan: newPlan,
            downgradedAt: new Date(),
            refundRequested: refundRequested,
            prorationAmount: prorationAmount,
            refundAmount: refundAmount,
            isImmediate: true
          },
          paidAt: new Date()
        });
      }

      // Process refund if requested and amount > 0
      if (refundRequested && refundAmount > 0) {
        // Find the most recent payment to refund
        const [recentPayment] = await db
          .select()
      .from(payments)
          .where(and(
            eq(payments.tenantId, tenantId),
            eq(payments.status, 'succeeded'),
            eq(payments.paymentType, 'subscription')
          ))
          .orderBy(desc(payments.createdAt))
          .limit(1);

        if (recentPayment) {
          await this.processRefund({
            tenantId,
            paymentId: recentPayment.paymentId,
            amount: refundAmount,
            reason: `Prorated refund for downgrade from ${currentSubscription.plan} to ${newPlan}`
          });
        } else {
          // Create refund record even without original payment for tracking
          await this.createPaymentRecord({
            tenantId: tenantId,
            subscriptionId: updatedSubscription.subscriptionId,
            amount: refundAmount,
            currency: 'USD',
            status: 'pending',
            paymentMethod: 'refund',
            paymentType: 'refund',
            billingReason: 'downgrade_refund',
            description: `Prorated refund for downgrade to ${newPlan}`,
            metadata: {
              refundReason: 'plan_downgrade',
              originalPlan: currentSubscription.plan,
              newPlan: newPlan,
              prorationDays: Math.ceil((new Date(currentSubscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))
            },
            paidAt: new Date()
          });
        }
      }

      // Update action status
      await db
        .update(subscriptionActions)
        .set({
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(subscriptionActions.actionId, subscriptionAction.actionId));

      // Send confirmation email
      await EmailService.sendDowngradeConfirmation({
        tenantId,
        fromPlan: currentSubscription.plan,
        toPlan: newPlan,
        refundAmount: refundRequested ? refundAmount : 0,
        effectiveDate: new Date()
      });

      console.log('✅ Immediate downgrade completed');
      return {
        subscriptionAction,
        refundAmount: refundRequested ? refundAmount : 0,
        newSubscription: updatedSubscription
      };
    } catch (error) {
      console.error('❌ Immediate downgrade failed:', error);
      throw error;
    }
  }

  // Calculate feature loss impact
  static calculateFeatureLoss(fromPlan, toPlan) {
    const planFeatures = {
      trial: ['crm'],
      starter: ['crm', 'hr'],
      professional: ['crm', 'hr', 'affiliate', 'accounting'],
      enterprise: ['crm', 'hr', 'affiliate', 'accounting', 'inventory']
    };

    const fromFeatures = planFeatures[fromPlan] || [];
    const toFeatures = planFeatures[toPlan] || [];
    
    return fromFeatures.filter(feature => !toFeatures.includes(feature));
  }

  // Calculate data retention impact
  static calculateDataRetention(fromPlan, toPlan) {
    const retentionPolicies = {
      trial: { months: 1, features: ['basic_data'] },
      starter: { months: 12, features: ['basic_data', 'reports'] },
      professional: { months: 24, features: ['basic_data', 'reports', 'analytics'] },
      enterprise: { months: 60, features: ['basic_data', 'reports', 'analytics', 'backups'] }
    };

    return {
      from: retentionPolicies[fromPlan],
      to: retentionPolicies[toPlan],
      impact: retentionPolicies[fromPlan]?.months > retentionPolicies[toPlan]?.months ? 'data_loss_risk' : 'no_impact'
    };
  }

  // Calculate user limits impact
  static calculateUserLimits(fromPlan, toPlan) {
    const userLimits = {
      trial: 2,
      starter: 10,
      professional: 50,
      enterprise: -1 // unlimited
    };

    return {
      from: userLimits[fromPlan],
      to: userLimits[toPlan],
      reduction: userLimits[fromPlan] - userLimits[toPlan]
    };
  }

  // Handle trial expiration - suspend accounts that haven't upgraded
  static async handleExpiredTrials() {
    const expiredTrials = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.status, 'trialing'),
        lt(subscriptions.trialEnd, new Date())
      ));

    for (const subscription of expiredTrials) {
      console.log(`🚨 Trial expired for tenant: ${subscription.tenantId}`);
      
      // Suspend the subscription
      await db
        .update(subscriptions)
        .set({
          status: 'suspended',
          suspendedAt: new Date(),
          suspendedReason: 'Trial expired - upgrade required'
        })
        .where(eq(subscriptions.subscriptionId, subscription.subscriptionId));

      // Record trial expiration event (NOT as payment)
      await SubscriptionService.recordTrialEvent(subscription.tenantId, subscription.subscriptionId, 'trial_expired', {
        trialExpired: true,
        suspendedAt: new Date(),
        upgradeRequired: true,
        originalTrialEnd: subscription.trialEnd
      });

      // Send trial expiration email (would get tenant admin email in production)
      console.log(`📧 Sending trial expiration notice to tenant: ${subscription.tenantId}`);
    }

    return expiredTrials.length;
  }

  // Send trial reminder emails
  static async sendTrialReminders() {
    // Find trials expiring in 3 days
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    
    const expiringTrials = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.status, 'trialing'),
        lt(subscriptions.trialEnd, threeDaysFromNow),
        gt(subscriptions.trialEnd, new Date())
      ));

    for (const subscription of expiringTrials) {
      const daysRemaining = Math.ceil(
        (new Date(subscription.trialEnd) - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      console.log(`📧 Sending ${daysRemaining}-day trial reminder to tenant: ${subscription.tenantId}`);
      
      // Record trial reminder event (NOT as payment)
      await SubscriptionService.recordTrialEvent(subscription.tenantId, subscription.subscriptionId, 'reminder_sent', {
        reminderType: 'trial_expiring',
        daysRemaining: daysRemaining,
        trialEnd: subscription.trialEnd
      });
    }

    return expiringTrials.length;
  }
} 