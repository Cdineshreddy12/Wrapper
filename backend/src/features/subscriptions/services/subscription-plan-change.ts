import { randomUUID } from 'crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { subscriptions, payments } from '../../../db/schema/index.js';
import { webhookLogs } from '../../../db/schema/tracking/webhook-logs.js';
import { EmailService } from '../../../utils/email.js';
import { getCurrentSubscription, getAvailablePlans, stripe, isStripeConfiguredFn } from './subscription-core.js';
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

    // Get current subscription
    const currentSubscription = await getCurrentSubscription(tenantId);
    if (!currentSubscription) {
      throw new Error('No current subscription found');
    }

    // Get target plan details
    const plans = await getAvailablePlans();
    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    const currentPlan = plans.find(p => p.id === currentSubscription.plan);

    // Check if this is a downgrade and enforce billing cycle restrictions
    const planHierarchy: Record<string, number> = {
      'free': 0,
      'starter': 1,
      'professional': 2,
      'enterprise': 3
    };

    const currentLevel = planHierarchy[currentPlan?.id as string] ?? 0;
    const targetLevel = planHierarchy[targetPlan.id as string] ?? 0;
    const isDowngrade = targetLevel < currentLevel;

    // NEW: Enforce billing cycle restrictions for downgrades
    if (isDowngrade && currentSubscription.status === 'active') {
      const now = new Date();
      const currentPeriodEnd = new Date(currentSubscription.currentPeriodEnd as string | Date);
      const billingCycleType = (currentSubscription.billingCycle as string) || 'monthly';
      const endDateStr = currentPeriodEnd.toLocaleDateString();

      // Calculate days remaining in current billing cycle
      const daysRemaining = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining > 7) { // More than a week remaining
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
      return await scheduleDowngrade({ tenantId, planId, effectiveDate: currentPeriodEnd });
    }

    // Check for other downgrade restrictions (legacy)
    if (currentPlan && !isValidPlanChange(currentPlan, targetPlan)) {
      throw new Error(`Cannot downgrade from ${currentPlan.name} to ${targetPlan.name} - plan restrictions apply`);
    }

    // Trial plans are not available through plan changes - only at account creation
    if (planId === 'trial') {
      throw new Error('Trial plans cannot be selected through subscription changes. Trials are only available during account creation.');
    }

    // Allow upgrades immediately (no billing cycle restrictions)
    if (!isDowngrade) {
      console.log('⬆️ Processing immediate upgrade');
      return (await processImmediatePlanChange({
        tenantId,
        currentSubscription,
        targetPlan,
        planId,
        billingCycle
      })) as unknown as Record<string, unknown>;
    }

    // Process immediate plan change for same-level changes or allowed downgrades
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
    // Record the scheduled change in webhook_logs (subscription_history not in schema)
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
 * Process immediate plan changes (downgrades/same-level only). Upgrades must use Billing Portal or Checkout.
 */
export async function processImmediatePlanChange(params: {
  tenantId: string;
  currentSubscription: Record<string, unknown>;
  targetPlan: Record<string, unknown>;
  planId: string;
  billingCycle: string;
}): Promise<string | Record<string, unknown>> {
  const { tenantId, currentSubscription, targetPlan, planId, billingCycle } = params;
  try {
    // Handle upgrade/change to paid plan: require Stripe session (Billing Portal), do NOT update plan without payment
    if (currentSubscription.stripeSubscriptionId && isStripeConfiguredFn()) {
      // Plan upgrades must go through Stripe Billing Portal so the customer completes payment there
      const returnUrl = `${process.env.FRONTEND_URL || ''}/billing?payment=success&plan=${planId}`;
      const portalUrl = await createBillingPortalSession(tenantId, returnUrl);
      return (portalUrl ?? '') as string;
    } else {
      // No existing Stripe subscription - create new subscription via Checkout
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
  // Can always upgrade to higher plans
  const planHierarchy: Record<string, number> = {
    'free': 0,
    'starter': 1,
    'professional': 2,
    'enterprise': 3
  };

  const currentLevel = planHierarchy[currentPlan.id as string] ?? 0;
  const targetLevel = planHierarchy[targetPlan.id as string] ?? 0;

  // Allow upgrades or same level changes
  if (targetLevel >= currentLevel) return true;

  // Allow downgrade if target plan allows it
  return (targetPlan as Record<string, unknown>).allowDowngrade !== false;
}

/**
 * Immediate downgrade with optional refund.
 */
export async function immediateDowngrade(params: { tenantId: string; newPlan: string; reason?: string; refundRequested?: boolean }): Promise<Record<string, unknown>> {
  const { tenantId, newPlan, reason = 'customer_request', refundRequested = false } = params;
  try {
    console.log('🔄 Processing immediate downgrade:', { tenantId, newPlan, refundRequested });

    // Get current subscription
    const currentSubscription = await getCurrentSubscription(tenantId);
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
        const paymentDate = new Date((lastPayment.paidAt ?? lastPayment.createdAt) as Date);
        const periodEnd = currentSubscription.currentPeriodEnd;
        const periodEndDate = periodEnd instanceof Date ? periodEnd : new Date(periodEnd as string);
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

    // Log subscription change (using audit logs instead of subscriptionActions)
    console.log(`📝 Subscription downgrade initiated: ${currentSubscription.plan} → ${newPlan} for tenant ${tenantId}`);

    // Cancel Stripe subscription if moving to trial
    if (newPlan === 'trial' && currentSubscription.stripeSubscriptionId && stripe) {
      await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId as string, {
        prorate: refundRequested,
        invoice_now: refundRequested
      });
    } else if (currentSubscription.stripeSubscriptionId && stripe) {
      // Update Stripe subscription to new plan (use subscription ITEM id si_xxx, not subscription id sub_xxx)
      const plans = await getAvailablePlans();
      const targetPlan = plans.find((p: Record<string, unknown>) => p.id === newPlan) as Record<string, unknown> | undefined;

      if (targetPlan && (targetPlan as Record<string, unknown>).stripePriceId) {
        const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripeSubscriptionId as string, { expand: ['items.data'] });
        const subscriptionItemId = stripeSubscription?.items?.data?.[0]?.id;
        if (subscriptionItemId) {
          await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId as string, {
            items: [{
              id: subscriptionItemId,
              price: (targetPlan as Record<string, unknown>).stripePriceId as string,
            }],
            proration_behavior: refundRequested ? 'always_invoice' : 'none',
          });
        }
      }
    }

    // Update subscription in database (plans use applications and limits)
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

    // Update administrator roles for the downgraded plan
    await updateAdministratorRolesForPlan(tenantId, newPlan);

    // Update organization applications for the downgraded plan
    try {
      const onboardingOrgSetup = (await import('../../onboarding/services/onboarding-organization-setup.js')).default;
      await onboardingOrgSetup.updateOrganizationApplicationsForPlanChange(tenantId, newPlan);
      console.log('✅ Organization applications updated for downgraded plan');
    } catch (errOrgApp: unknown) {
      const orgAppError = errOrgApp as Error;
      console.error('❌ Failed to update organization applications:', orgAppError.message);
      // Don't fail the downgrade, but log for manual intervention
    }

    // Get the updated subscription
    const updatedSubscription = await getCurrentSubscription(tenantId);

    // Record downgrade event appropriately
    const subIdForEvent = (updatedSubscription as Record<string, unknown>).subscriptionId ?? (updatedSubscription as Record<string, unknown>).id;
    if (newPlan === 'trial') {
      // If downgrading to trial, record as trial event
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
      // Regular paid plan downgrade - create payment record
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
      } as Record<string, unknown>);
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
        await processRefund({
          tenantId,
          paymentId: recentPayment.paymentId,
          amount: refundAmount,
          reason: `Prorated refund for downgrade from ${currentSubscription.plan} to ${newPlan}`
        });
      } else {
        // Create refund record even without original payment for tracking
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
            })()
          },
          paidAt: new Date()
        } as Record<string, unknown>);
      }
    }

    // Log completion (using audit logs instead of subscriptionActions)
    console.log(`✅ Subscription downgrade completed: ${currentSubscription.plan} → ${newPlan} for tenant ${tenantId}`);

    // Send confirmation email
    const emailServiceDowngrade = new EmailService();
    await emailServiceDowngrade.sendDowngradeConfirmation({
      tenantId,
      fromPlan: currentSubscription.plan as string,
      toPlan: newPlan,
      refundAmount: refundRequested ? refundAmount : 0,
      effectiveDate: new Date()
    });

    console.log('✅ Immediate downgrade completed');
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
    enterprise: -1 // unlimited
  };

  return {
    from: userLimits[fromPlan as keyof typeof userLimits],
    to: userLimits[toPlan as keyof typeof userLimits],
    reduction: (userLimits[fromPlan as keyof typeof userLimits] ?? 0) - (userLimits[toPlan as keyof typeof userLimits] ?? 0)
  };
}
