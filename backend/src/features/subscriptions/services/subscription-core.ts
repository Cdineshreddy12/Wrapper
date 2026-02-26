import Stripe from 'stripe';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import {
  subscriptions,
  creditPurchases,
  entities
} from '../../../db/schema/index.js';
import { CreditService } from '../../credits/index.js';
import { getPaymentGateway } from '../adapters/index.js';
import { StripePaymentGateway } from '../adapters/stripe.adapter.js';
import type { PaymentGatewayPort } from '../adapters/index.js';

// ---------------------------------------------------------------------------
// Payment Gateway (adapter pattern) — primary API
// ---------------------------------------------------------------------------

export { getPaymentGateway };
export type { PaymentGatewayPort };

/**
 * @deprecated Use `getPaymentGateway()` instead for provider-agnostic code.
 * Kept for backward compatibility during migration.
 */
export function getRawStripeClient(): Stripe | null {
  const gw = getPaymentGateway();
  if (gw instanceof StripePaymentGateway) {
    return gw.getRawClient();
  }
  return null;
}

// Legacy aliases — thin wrappers around the gateway
const gateway = getPaymentGateway();

/** @deprecated Use `getPaymentGateway().isConfigured()` */
export function isStripeConfiguredFn(): boolean {
  return gateway.isConfigured();
}

/** @deprecated Use `getPaymentGateway().getConfigStatus()` */
export function getStripeConfigStatus(): Record<string, unknown> {
  const status = gateway.getConfigStatus();
  return {
    isConfigured: status.isConfigured,
    hasSecretKey: status.hasSecretKey,
    hasWebhookSecret: status.hasWebhookSecret,
    stripeInitialized: status.isConfigured,
    stripeType: status.isConfigured ? 'object' : 'undefined',
    stripeWebhooksAvailable: status.isConfigured,
    environment: status.environment,
    secretKeyStart: status.details?.secretKeyPrefix ?? 'not set',
    webhookSecretStart: status.details?.webhookSecretPrefix ?? 'not set',
    provider: status.provider,
  };
}

/**
 * @deprecated Use `getPaymentGateway()` directly. This is kept so that files
 * still importing `stripe` continue to compile during migration.
 */
export const stripe = getRawStripeClient();
export const isStripeConfigured = gateway.isConfigured();

// Get current subscription (now returns credit-based information)
export async function getCurrentSubscription(tenantId: string): Promise<Record<string, unknown>> {
  try {
    // FIRST: Check for actual subscription record in database
    let actualSubscription: typeof subscriptions.$inferSelect | null = null;
    try {
      const [subscriptionRecord] = await db
        .select()
        .from(subscriptions)
        .where(and(
          eq(subscriptions.tenantId, tenantId),
          eq(subscriptions.status, 'active')
        ))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (subscriptionRecord) {
        actualSubscription = subscriptionRecord;
        console.log('✅ Found active subscription:', {
          plan: subscriptionRecord.plan,
          currentPeriodEnd: subscriptionRecord.currentPeriodEnd,
          status: subscriptionRecord.status
        });
      }
    } catch (err: unknown) {
      const subError = err as Error;
      console.warn('⚠️ Error checking subscription table:', subError.message);
    }

    // Get credit balance for tenant's organization entity (same logic as credits API)
    let creditBalance = null;
    try {
      const orgEntities = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.entityType, 'organization'),
          eq(entities.isActive, true)
        ));
      const defaultEntity = orgEntities.find(e => e.isDefault) || orgEntities[0];
      if (defaultEntity) {
        creditBalance = await CreditService.getCurrentBalance(tenantId, 'organization', defaultEntity.entityId);
      }
      if (!creditBalance) {
        creditBalance = await CreditService.getCurrentBalance(tenantId);
      }
    } catch (balanceError: unknown) {
      const err = balanceError as Error;
      console.warn('⚠️ Error getting credit balance for subscription:', err?.message);
      creditBalance = await CreditService.getCurrentBalance(tenantId);
    }

    const balanceTotal = (creditBalance as Record<string, unknown> | null)?.totalCredits;
    const finalAvailableCredits = creditBalance?.availableCredits ?? 0;
    const finalTotalCredits = creditBalance?.availableCredits ?? (typeof balanceTotal === 'number' ? balanceTotal : Number(balanceTotal ?? 0)) ?? 0;

    // Determine status based on available credits
    const hasCredits = finalAvailableCredits > 0;
    const status = hasCredits ? 'active' : 'insufficient_credits';

    // Use actual subscription plan if available, otherwise default to 'free'
    const plan = actualSubscription?.plan || 'free';

    // Use actual subscription expiry if available, otherwise use credit expiry or subscription expiry from credit balance
    const currentPeriodEnd = actualSubscription?.currentPeriodEnd ||
                             creditBalance?.subscriptionExpiry ||
                             creditBalance?.freeCreditsExpiry ||
                             null;

    // Return subscription information with actual plan name
    return {
      id: actualSubscription?.subscriptionId || `credit_${tenantId}`,
      tenantId,
      plan: plan, // Use actual plan from subscription table or 'free'
      status: actualSubscription?.status || status,
      isTrialUser: actualSubscription?.isTrialUser || false,
      subscribedTools: actualSubscription?.subscribedTools || ['crm', 'hr', 'analytics'],
      usageLimits: actualSubscription?.usageLimits || {
        users: 100
      },
      monthlyPrice: (actualSubscription as any)?.monthlyPrice != null ? parseFloat(String((actualSubscription as any).monthlyPrice)) : 0,
      yearlyPrice: actualSubscription?.yearlyPrice != null ? parseFloat(String(actualSubscription.yearlyPrice)) : 0,
      billingCycle: actualSubscription?.billingCycle || 'yearly',
      trialStart: (actualSubscription as any)?.trialStart || null,
      trialEnd: (actualSubscription as any)?.trialEnd || null,
      currentPeriodStart: actualSubscription?.currentPeriodStart || new Date(),
      currentPeriodEnd: currentPeriodEnd, // Use consistent expiry date
      stripeSubscriptionId: actualSubscription?.stripeSubscriptionId || null,
      stripeCustomerId: actualSubscription?.stripeCustomerId || null,
      hasEverUpgraded: (actualSubscription as any)?.hasEverUpgraded ?? false,
      trialToggledOff: (actualSubscription as any)?.trialToggledOff ?? true,
      availableCredits: finalAvailableCredits,
      totalCredits: finalTotalCredits,
      usageThisPeriod: creditBalance?.usageThisPeriod ?? 0,
      reservedCredits: creditBalance?.reservedCredits || 0,
      creditExpiry: creditBalance?.creditExpiry || null,
      freeCreditsExpiry: creditBalance?.freeCreditsExpiry || currentPeriodEnd,
      paidCreditsExpiry: creditBalance?.paidCreditsExpiry || null,
      seasonalCreditsExpiry: creditBalance?.seasonalCreditsExpiry || null,
      subscriptionExpiry: currentPeriodEnd, // Ensure consistency
      alerts: hasCredits ? (creditBalance?.alerts || []) : [{
        id: 'no_credit_record',
        type: 'no_credit_record',
        severity: 'info',
        title: 'No Credit Record',
        message: 'This entity does not have a credit record yet',
        threshold: 0,
        currentValue: 0,
        actionRequired: 'initialize_credits'
      }],
      createdAt: actualSubscription?.createdAt || new Date(),
      updatedAt: actualSubscription?.updatedAt || new Date()
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error getting current subscription:', error);

    // Fallback: try to get traditional subscription if no credits found
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (subscription) {
        return subscription as unknown as Record<string, unknown>;
      }

      // Final fallback: return free plan
      return {
        plan: 'free',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        tenantId
      };
    } catch (fallbackErr: unknown) {
      const fallbackError = fallbackErr as Error;
      console.error('Error fetching fallback subscription:', fallbackError);
      // Return free plan as final fallback
      return {
        plan: 'free',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        tenantId
      };
    }
  }
}

// Get available plans (annual billing only)
export async function getAvailablePlans(): Promise<Record<string, unknown>[]> {
  return [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Essential tools for small teams',
      price: 120, // Annual price in USD ($10/month = $120/year)
      monthlyPrice: 10,
      yearlyPrice: 120,
      stripePriceId: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY || process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
      stripeYearlyPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || process.env.STRIPE_PRICE_ID_STARTER,
      credits: 60000, // 60,000 credits annually (5,000/month)
      features: [
        'CRM tools',
        'User Management',
        'Basic permissions',
        'Email support'
      ],
      limits: {
        users: 5,
        roles: 3
      },
      applications: ['crm'],
      modules: {
        crm: ['leads', 'contacts', 'accounts', 'opportunities', 'tickets', 'communications', 'dashboard', 'users']
      },
      allowDowngrade: false
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Comprehensive tools for growing businesses',
      price: 240, // Annual price in USD ($20/month = $240/year)
      monthlyPrice: 20,
      yearlyPrice: 240,
      stripePriceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY || process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
      stripeYearlyPriceId: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID || process.env.STRIPE_PRICE_ID_PROFESSIONAL,
      credits: 300000, // 300,000 credits annually (25,000/month)
      features: [
        'All Starter features',
        'CRM & HR tools',
        'Advanced permissions',
        'Priority support',
        'Affiliate management',
        'Custom integrations'
      ],
      limits: {
        users: 25,
        roles: 10
      },
      applications: ['crm', 'hr'],
      modules: {
        crm: ['leads', 'contacts', 'accounts', 'opportunities', 'quotations', 'tickets', 'communications', 'invoices', 'dashboard', 'users', 'roles'],
        hr: ['employees', 'payroll', 'leave', 'documents']
      },
      popular: true,
      allowDowngrade: false
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Complete solution with all features',
      price: 360, // Annual price in USD ($30/month = $360/year)
      monthlyPrice: 30,
      yearlyPrice: 360,
      stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY || process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
      stripeYearlyPriceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || process.env.STRIPE_PRICE_ID_ENTERPRISE,
      credits: 1200000, // 1,200,000 credits annually (100,000/month)
      features: [
        'All Professional features',
        'Unlimited users',
        'White-label options',
        'Dedicated support',
        'Custom development',
        'Advanced analytics',
        'All integrations'
      ],
      limits: {
        users: -1, // Unlimited
        roles: -1 // Unlimited
      },
      applications: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'],
      modules: {
        crm: '*', // All CRM modules
        hr: '*',  // All HR modules
        affiliate: '*', // All affiliate modules
        accounting: '*', // All accounting modules
        inventory: '*'  // All inventory modules
      },
      allowDowngrade: false
    }
  ];
}

// Get usage metrics for a tenant (now credit-based)
export async function getUsageMetrics(tenantId: string): Promise<Record<string, unknown>> {
  try {
    // Get credit balance and usage data
    const creditData = await CreditService.getCurrentBalance(tenantId);
    const usageSummary = await CreditService.getUsageSummary(tenantId);

    const totalCredits = (creditData as Record<string, unknown> | null)?.totalCredits;
    const totalCreditsNum = typeof totalCredits === 'number' ? totalCredits : Number(totalCredits ?? 1000);
    const totalConsumed = (usageSummary as Record<string, unknown> | null)?.totalConsumed;
    const totalConsumedNum = typeof totalConsumed === 'number' ? totalConsumed : Number(totalConsumed ?? 0);

    // Default limits for credit-based system
    const defaultLimits = {
      users: 100,
      projects: -1, // Unlimited
      credits: totalCreditsNum || 1000
    };

    // Mock usage data - credit-based plan: only credits consumed
    const mockUsage = {
      users: 2,
      projects: 1,
      creditsConsumed: totalConsumedNum
    };

    return {
      current: mockUsage,
      limits: defaultLimits,
      plan: 'credit_based',
      percentUsed: {
        users: Math.round((mockUsage.users / defaultLimits.users) * 100),
        projects: defaultLimits.projects > 0 ?
          Math.round((mockUsage.projects / defaultLimits.projects) * 100) : 0,
        credits: totalCreditsNum ?
          Math.round((totalConsumedNum / totalCreditsNum) * 100) : 0
      }
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error getting usage metrics:', error);
    throw error;
  }
}

// Get billing history for a tenant (credit purchases + plan upgrade entries)
export async function getBillingHistory(tenantId: string): Promise<Record<string, unknown>[]> {
  try {
    console.log('📋 Fetching billing history for tenant:', tenantId);

    const creditPurchaseRecords = await db
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.tenantId, tenantId))
      .orderBy(desc(creditPurchases.createdAt));

    const purchaseEntries = creditPurchaseRecords.map(purchase => ({
      id: purchase.purchaseId,
      amount: parseFloat(String(purchase.totalAmount ?? 0)),
      currency: 'USD',
      status: purchase.status,
      description: `Credit purchase: ${String(purchase.creditAmount ?? 0)} credits`,
      invoiceNumber: null,
      paidAt: purchase.paidAt,
      createdAt: purchase.createdAt,
      creditsPurchased: parseFloat(String(purchase.creditAmount ?? 0)),
      expiryDate: purchase.expiryDate,
      paymentMethod: purchase.paymentMethod,
      stripePaymentIntentId: purchase.stripePaymentIntentId,
      paymentStatus: purchase.paymentStatus,
      unitPrice: purchase.unitPrice ? parseFloat(purchase.unitPrice) : null,
      batchId: purchase.batchId,
      requestedAt: purchase.requestedAt,
      creditedAt: purchase.creditedAt,
      type: 'credit_purchase'
    }));

    // Include plan upgrade / subscription entry from current subscription
    const planUpgradeEntries = [];
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (subscription && subscription.plan && subscription.plan !== 'free') {
        const planDisplayName = subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
        const dateForSort = subscription.currentPeriodStart || subscription.createdAt || new Date();
        planUpgradeEntries.push({
          id: `plan-${subscription.subscriptionId}`,
          type: 'plan_upgrade',
          status: subscription.status === 'active' || subscription.status === 'trialing' ? 'succeeded' : subscription.status,
          description: `Plan: ${planDisplayName}`,
          plan: subscription.plan,
          planDisplayName,
          createdAt: subscription.createdAt,
          paidAt: subscription.currentPeriodStart || subscription.createdAt,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          billingCycle: subscription.billingCycle || 'yearly',
          yearlyPrice: subscription.yearlyPrice ? parseFloat(String(subscription.yearlyPrice)) : null,
          amount: subscription.yearlyPrice ? parseFloat(String(subscription.yearlyPrice)) : 0,
          currency: 'USD',
          invoiceNumber: null
        });
      }
    } catch (errSub: unknown) {
      const subErr = errSub as Error;
      console.warn('⚠️ Could not fetch subscription for billing history:', subErr.message);
    }

    const combined = [...purchaseEntries, ...planUpgradeEntries].sort((a, b) => {
      const dateA = (a.paidAt || a.createdAt) ? new Date(a.paidAt as Date || a.createdAt as Date).getTime() : 0;
      const dateB = (b.paidAt || b.createdAt) ? new Date(b.paidAt as Date || b.createdAt as Date).getTime() : 0;
      return dateB - dateA; // Most recent first
    });

    console.log('✅ Billing history (purchases + plan):', purchaseEntries.length, 'purchases,', planUpgradeEntries.length, 'plan entries');
    return combined;
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    console.error('❌ Error getting billing history:', {
      message: error.message,
      name: error.name,
      code: (error as any).code
    });

    if (error.message?.includes('relation "credit_purchases" does not exist') ||
      (error as any).code === '42P01') {
      console.log('⚠️ Credit purchases table not found, returning empty history');
      return [];
    }

    throw error;
  }
}

// Helper: get plan ID from Stripe price ID
export async function getPlanIdFromPriceId(priceId: string): Promise<string | null> {
  try {
    const plans = await getAvailablePlans();

    for (const plan of plans) {
      if (plan.stripePriceId === priceId || plan.stripeYearlyPriceId === priceId) {
        return plan.id as string;
      }
    }

    console.warn(`⚠️ Plan not found for price ID: ${priceId}`);
    return null;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error getting plan ID from price ID:', error);
    return null;
  }
}
