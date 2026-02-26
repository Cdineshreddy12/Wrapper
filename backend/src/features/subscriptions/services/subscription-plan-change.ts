import { randomUUID } from 'crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { subscriptions, payments } from '../../../db/schema/index.js';
import { webhookLogs } from '../../../db/schema/tracking/webhook-logs.js';
import { EmailService } from '../../../utils/email.js';
import { getCurrentSubscription, getAvailablePlans, isStripeConfiguredFn } from './subscription-core.js';
import { getPaymentGateway } from '../adapters/index.js';
import { updateAdministratorRolesForPlan } from './subscription-plan-roles.js';
import { createPaymentRecord, processRefund } from './subscription-payment-records.js';
import { createCheckoutSession, createBillingPortalSession } from './subscription-checkout.js';
import { recordTrialEvent } from './subscription-trial.js';

/**
 * Change subscription plan (upgrade/downgrade).
 */
export async function changePlan(params: { tenantId: string; planId: string; billingCycle?: string }): Promise<Record<string, unknown>> {
  const { tenantId, planId, billingCycle = 'monthly' } = params;
  try {
    console.log('🔄 Changing plan for tenant:', tenantId, 'to plan:', planId);

    const currentSubscription = await getCurrentSubscription(tenantId);
    if (!currentSubscription) {
      throw new Error('No current subscription found');
    }

    const plans = await getAvailablePlans();
    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    const currentPlan = plans.find(p => p.id === currentSubscription.plan);

    const planHierarchy: Record<string, number> = {
      'free': 0,
      'starter': 1,
      'professional': 2,
      'enterprise': 3
    };

    const currentLevel = planHierarchy[currentPlan?.id as string] ?? 0;
    const targetLevel = planHierarchy[targetPlan.id as string] ?? 0;
    const isDowngrade = targetLevel < currentLevel;

    if (isDowngrade && currentSubscription.status === 'active') {
      const now = new Date();
      const currentPeriodEnd = new Date(currentSubscription.currentPeriodEnd as string | Date);
      const billingCycleType = (currentSubscription.billingCycle as string) || 'monthly';
      const endDateStr = currentPeriodEnd.toLocaleDateString();

      const daysRemaining = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining > 7) {
        throw new Error(
          `Plan downgrades are only allowed within 7 days of your billing cycle end. ` +
          `Your current ${billingCycleType} plan renews on ${endDateStr}. ` +
          `You can schedule a plan change to take effect on ${endDateStr}, or wait until then to downgrade. ` +
          `Since you've paid for the full ${billingCycleType} period, you'll continue to have access to all features until ${endDateStr}.`
        );
      }

      return await scheduleDowngrade({ tenantId, planId, effectiveDate: currentPeriodEnd });
    }

    if (currentPlan && !isValidPlanChange(currentPlan, targetPlan)) {
      throw new Error(`Cannot downgrade from ${currentPlan.name} to ${targetPlan.name} — plan restrictions apply`);
    }

    if (planId === 'trial') {
      throw new Error('Trial plans cannot be selected through subscription changes. Trials are only available during account creation.');
    }

    if (!isDowngrade) {
      return (await processImmediatePlanChange({
        tenantId,
        currentSubscription,
        targetPlan,
        planId,
        billingCycle
      })) as unknown as Record<string, unknown>;
    }

    return (await processImmediatePlanChange({
      tenantId,
      currentSubscription,
      targetPlan,
      planId,
      billingCycle
    })) as unknown as Record<string, unknown>;

  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error changing plan:', error);
    throw error;
  }
}

/**
 * Schedule a downgrade for the end of billing period.
 */
export async function scheduleDowngrade(params: { tenantId: string; planId: string; effectiveDate: Date }): Promise<Record<string, unknown>> {
  const { tenantId, planId, effectiveDate } = params;
  try {
    await db.insert(webhookLogs).values({
      eventId: `scheduled_downgrade_${randomUUID()}`,
      eventType: 'scheduled_downgrade',
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const current = await getCurrentSubscription(tenantId);
    return {
      message: `Downgrade to ${planId} scheduled for ${effectiveDate.toLocaleDateString()}`,
      scheduledFor: effectiveDate,
      currentAccess: 'You will continue to have full access to your current plan features until the scheduled date.',
      subscription: current
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error scheduling downgrade:', error);
    throw error;
  }
}

/**
 * Process immediate plan changes (downgrades/same-level only).
 * Upgrades must go through Billing Portal or Checkout for payment confirmation.
 */
export async function processImmediatePlanChange(params: {
  tenantId: string;
  currentSubscription: Record<string, unknown>;
  targetPlan: Record<string, unknown>;
  planId: string;
  billingCycle: string;
}): Promise<string | Record<string, unknown>> {
  const { tenantId, currentSubscription, targetPlan, planId, billingCycle } = params;
  const gateway = getPaymentGateway();

  try {
    if (currentSubscription.stripeSubscriptionId && gateway.isConfigured()) {
      const returnUrl = `${process.env.FRONTEND_URL || ''}/billing?payment=success&plan=${planId}`;
      const portalUrl = await createBillingPortalSession(tenantId, returnUrl);
      return (portalUrl ?? '') as string;
    } else {
      return await createCheckoutSession({
        tenantId,
        planId,
        customerId: (currentSubscription.stripeCustomerId as string) || undefined,
        successUrl: `${process.env.FRONTEND_URL || ''}/billing?payment=success&plan=${planId}`,
        cancelUrl: `${process.env.FRONTEND_URL || ''}/billing?payment=cancelled`,
        billingCycle
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error processing immediate plan change:', error);
    throw error;
  }
}

/**
 * Helper to check if plan change is valid.
 */
export function isValidPlanChange(currentPlan: Record<string, unknown>, targetPlan: Record<string, unknown>): boolean {
  const planHierarchy: Record<string, number> = {
    'free': 0,
    'starter': 1,
    'professional': 2,
    'enterprise': 3
  };

  const currentLevel = planHierarchy[currentPlan.id as string] ?? 0;
  const targetLevel = planHierarchy[targetPlan.id as string] ?? 0;

  if (targetLevel >= currentLevel) return true;

  return (targetPlan as Record<string, unknown>).allowDowngrade !== false;
}

/**
 * Immediate downgrade with optional refund.
 * Uses the payment gateway adapter for all provider interactions.
 */
export async function immediateDowngrade(params: { tenantId: string; newPlan: string; reason?: string; refundRequested?: boolean }): Promise<Record<string, unknown>> {
  const { tenantId, newPlan, reason = 'customer_request', refundRequested = false } = params;
  const gateway = getPaymentGateway();

  try {
    console.log('🔄 Processing immediate downgrade:', { tenantId, newPlan, refundRequested });

    const currentSubscription = await getCurrentSubscription(tenantId);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    if (currentSubscription.plan === newPlan) {
      throw new Error('Already on the requested plan');
    }

    let refundAmount = 0;
    let prorationAmount = 0;

    if (refundRequested && currentSubscription.stripeSubscriptionId) {
      const periodEnd = currentSubscription.currentPeriodEnd;
      const periodEndTime = periodEnd instanceof Date ? periodEnd.getTime() : new Date(periodEnd as string).getTime();
      const remainingDays = Math.max(0,
        Math.ceil((periodEndTime - Date.now()) / (1000 * 60 * 60 * 24))
      );
      const totalDays = currentSubscription.billingCycle === 'yearly' ? 365 : 30;
      const prorationRatio = remainingDays / totalDays;

      const currentAmount = currentSubscription.billingCycle === 'yearly'
        ? parseFloat(String((currentSubscription as Record<string, unknown>).yearlyPrice || 0))
        : parseFloat(String((currentSubscription as Record<string, unknown>).monthlyPrice || 0));

      prorationAmount = currentAmount * prorationRatio;
      refundAmount = prorationAmount;
    } else if (refundRequested && !currentSubscription.stripeSubscriptionId) {
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
        const paymentDate = new Date((lastPayment.paidAt ?? lastPayment.createdAt) as Date);
        const totalPeriod = (currentSubscription.billingCycle === 'yearly' ? 365 : 30) as number;
        const daysSincePayment = Math.ceil((Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, totalPeriod - daysSincePayment);

        if (remainingDays > 0) {
          const prorationRatio = remainingDays / totalPeriod;
          refundAmount = parseFloat(String(lastPayment.amount)) * prorationRatio;
          prorationAmount = refundAmount;
        }
      }
    }

    console.log(`📝 Subscription downgrade: ${currentSubscription.plan} → ${newPlan} for tenant ${tenantId}`);

    // Use gateway adapter for subscription operations
    if (newPlan === 'trial' && currentSubscription.stripeSubscriptionId && gateway.isConfigured()) {
      await gateway.cancelSubscription(currentSubscription.stripeSubscriptionId as string, {
        prorate: refundRequested,
        invoiceNow: refundRequested,
      });
    } else if (currentSubscription.stripeSubscriptionId && gateway.isConfigured()) {
      const plans = await getAvailablePlans();
      const targetPlan = plans.find((p: Record<string, unknown>) => p.id === newPlan) as Record<string, unknown> | undefined;

      if (targetPlan && (targetPlan as Record<string, unknown>).stripePriceId) {
        const gatewaySub = await gateway.retrieveSubscription(currentSubscription.stripeSubscriptionId as string);
        const subscriptionItemId = gatewaySub.items?.[0]?.id;

        if (subscriptionItemId) {
          await gateway.updateSubscription(currentSubscription.stripeSubscriptionId as string, {
            items: [{ id: subscriptionItemId, priceId: (targetPlan as Record<string, unknown>).stripePriceId as string }],
            prorationBehavior: refundRequested ? 'always_invoice' : 'none',
          });
        }
      }
    }

    const targetPlanDb = (await getAvailablePlans()).find((p: Record<string, unknown>) => p.id === newPlan) as Record<string, unknown> | undefined;
    await db
      .update(subscriptions)
      .set({
        plan: newPlan,
        status: newPlan === 'trial' ? 'trialing' : (currentSubscription.status as string),
        subscribedTools: (targetPlanDb?.applications ?? ['crm']) as Record<string, unknown>,
        usageLimits: (targetPlanDb?.limits ?? { users: 2, apiCalls: 1000, storage: 1000000000, projects: 3 }) as Record<string, unknown>,
        yearlyPrice: targetPlanDb != null ? String((targetPlanDb.yearlyPrice ?? targetPlanDb.price ?? 0) as number) : '0',
        stripeSubscriptionId: newPlan === 'trial' ? undefined : (currentSubscription.stripeSubscriptionId as string | undefined),
        stripeCustomerId: newPlan === 'trial' ? undefined : (currentSubscription.stripeCustomerId as string | undefined),
        updatedAt: new Date()
      })
      .where(eq(subscriptions.tenantId, tenantId));

    await updateAdministratorRolesForPlan(tenantId, newPlan);

    try {
      const onboardingOrgSetup = (await import('../../onboarding/services/onboarding-organization-setup.js')).default;
      await onboardingOrgSetup.updateOrganizationApplicationsForPlanChange(tenantId, newPlan);
    } catch (errOrgApp: unknown) {
      console.error('❌ Failed to update organization applications:', (errOrgApp as Error).message);
    }

    const updatedSubscription = await getCurrentSubscription(tenantId);

    const subIdForEvent = (updatedSubscription as Record<string, unknown>).subscriptionId ?? (updatedSubscription as Record<string, unknown>).id;
    if (newPlan === 'trial') {
      await recordTrialEvent(tenantId, subIdForEvent as string, 'plan_downgraded_to_trial', {
        fromPlan: currentSubscription.plan as string,
        toPlan: newPlan,
        downgradedAt: new Date(),
        refundRequested: refundRequested,
        prorationAmount: prorationAmount,
        refundAmount: refundAmount,
        isImmediate: true
      });
    } else {
      const targetPlanForAmount = (await getAvailablePlans()).find((p: Record<string, unknown>) => p.id === newPlan) as Record<string, unknown> | undefined;
      await createPaymentRecord({
        tenantId: tenantId,
        subscriptionId: subIdForEvent as string,
        amount: (targetPlanForAmount as Record<string, unknown>)?.monthlyPrice ?? 0,
        currency: 'USD',
        status: 'succeeded',
        paymentMethod: 'system',
        paymentType: 'plan_change',
        billingReason: 'plan_downgrade',
        description: `Downgraded from ${currentSubscription.plan} to ${newPlan}`,
        prorationAmount: -prorationAmount,
        metadata: {
          fromPlan: currentSubscription.plan,
          toPlan: newPlan,
          downgradedAt: new Date(),
          refundRequested: refundRequested,
          prorationAmount: prorationAmount,
          refundAmount: refundAmount,
          isImmediate: true,
          provider: gateway.providerName,
        },
        paidAt: new Date()
      } as Record<string, unknown>);
    }

    if (refundRequested && refundAmount > 0) {
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
        await processRefund({
          tenantId,
          paymentId: recentPayment.paymentId,
          amount: refundAmount,
          reason: `Prorated refund for downgrade from ${currentSubscription.plan} to ${newPlan}`
        });
      } else {
        await createPaymentRecord({
          tenantId: tenantId,
          subscriptionId: ((updatedSubscription as Record<string, unknown>).subscriptionId ?? (updatedSubscription as Record<string, unknown>).id) as string,
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
            prorationDays: (() => {
              const end = currentSubscription.currentPeriodEnd;
              const endTime = end instanceof Date ? end.getTime() : new Date(end as string).getTime();
              return Math.ceil((endTime - Date.now()) / (1000 * 60 * 60 * 24));
            })(),
            provider: gateway.providerName,
          },
          paidAt: new Date()
        } as Record<string, unknown>);
      }
    }

    console.log(`✅ Downgrade completed: ${currentSubscription.plan} → ${newPlan} for tenant ${tenantId}`);

    const emailServiceDowngrade = new EmailService();
    await emailServiceDowngrade.sendDowngradeConfirmation({
      tenantId,
      fromPlan: currentSubscription.plan as string,
      toPlan: newPlan,
      refundAmount: refundRequested ? refundAmount : 0,
      effectiveDate: new Date()
    });

    return {
      refundAmount: refundRequested ? refundAmount : 0,
      newSubscription: updatedSubscription
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Immediate downgrade failed:', error);
    throw error;
  }
}

/**
 * Calculate feature loss impact when downgrading.
 */
export function calculateFeatureLoss(fromPlan: string, toPlan: string): string[] {
  const planFeatures: Record<string, string[]> = {
    free: ['crm'],
    starter: ['crm', 'hr'],
    professional: ['crm', 'hr', 'affiliate', 'accounting'],
    enterprise: ['crm', 'hr', 'affiliate', 'accounting', 'inventory']
  };

  const fromFeatures = planFeatures[fromPlan] || [];
  const toFeatures = planFeatures[toPlan] || [];

  return fromFeatures.filter((feature: string) => !toFeatures.includes(feature));
}

/**
 * Calculate data retention impact when downgrading.
 */
export function calculateDataRetention(fromPlan: string, toPlan: string): Record<string, unknown> {
  const retentionPolicies = {
    free: { months: 3, features: ['basic_data'] },
    starter: { months: 12, features: ['basic_data', 'reports'] },
    professional: { months: 24, features: ['basic_data', 'reports', 'analytics'] },
    enterprise: { months: 60, features: ['basic_data', 'reports', 'analytics', 'backups'] }
  };

  return {
    from: retentionPolicies[fromPlan as keyof typeof retentionPolicies],
    to: retentionPolicies[toPlan as keyof typeof retentionPolicies],
    impact: (retentionPolicies[fromPlan as keyof typeof retentionPolicies]?.months ?? 0) > (retentionPolicies[toPlan as keyof typeof retentionPolicies]?.months ?? 0) ? 'data_loss_risk' : 'no_impact'
  };
}

/**
 * Calculate user limits impact when downgrading.
 */
export function calculateUserLimits(fromPlan: string, toPlan: string): Record<string, unknown> {
  const userLimits = {
    free: 1,
    starter: 10,
    professional: 50,
    enterprise: -1
  };

  return {
    from: userLimits[fromPlan as keyof typeof userLimits],
    to: userLimits[toPlan as keyof typeof userLimits],
    reduction: (userLimits[fromPlan as keyof typeof userLimits] ?? 0) - (userLimits[toPlan as keyof typeof userLimits] ?? 0)
  };
}
