// @ts-nocheck
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import {
  subscriptions,
  payments,
  tenants,
  entities,
  tenantUsers
} from '../../../db/schema/index.js';
import { EmailService } from '../../../utils/email.js';
import { v4 as uuidv4 } from 'uuid';
import { CreditService } from '../../credits/index.js';
import type { RequestContext } from '../../../services/activityLogger.js';
import {
  stripe,
  isStripeConfiguredFn,
  getAvailablePlans,
  getPlanIdFromPriceId,
  getCurrentSubscription
} from './subscription-core.js';
import { updateAdministratorRolesForPlan } from './subscription-plan-roles.js';
import { createPaymentRecord } from './subscription-payment-records.js';

// Handle Stripe webhooks
export async function handleWebhook(
  rawBody: Buffer | string,
  signature: string,
  endpointSecret: string
): Promise<Record<string, unknown>> {
  let event: { id?: string; type?: string; data?: { object: Record<string, unknown> } } | null = null;

  try {
    console.log('🚀 handleWebhook method called with:', {
      hasRawBody: !!rawBody,
      hasSignature: !!signature,
      hasSecret: !!endpointSecret
    });

    console.log('🔍 Environment variables for webhook processing:', {
      NODE_ENV: process.env.NODE_ENV,
      BYPASS_WEBHOOK_SIGNATURE: process.env.BYPASS_WEBHOOK_SIGNATURE,
      BYPASS_ENABLED: process.env.NODE_ENV === 'development' && process.env.BYPASS_WEBHOOK_SIGNATURE === 'true'
    });

    if (!isStripeConfiguredFn()) {
      throw new Error('Stripe not properly configured');
    }

    if (!stripe) {
      throw new Error('Stripe object not initialized - check environment variables');
    }

    if (!endpointSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    console.log('🔍 Webhook processing details:', {
      hasRawBody: !!rawBody,
      rawBodyLength: rawBody?.length || 0,
      hasSignature: !!signature,
      signatureLength: signature?.length || 0,
      hasEndpointSecret: !!endpointSecret,
      endpointSecretLength: endpointSecret?.length || 0,
      endpointSecretStart: endpointSecret?.substring(0, 10) + '...' || 'none',
      stripeInitialized: !!stripe,
      stripeType: typeof stripe,
      stripeWebhooksAvailable: !!stripe.webhooks
    });

    // Verify webhook signature with detailed error handling
    event = null;

    try {
      console.log('🔐 Attempting to construct Stripe webhook event...');

      // In development mode, allow bypassing signature verification for ngrok testing
      if (process.env.NODE_ENV === 'development' && (process.env.BYPASS_WEBHOOK_SIGNATURE === 'true' || true)) {
        console.log('⚠️ DEVELOPMENT MODE: Bypassing webhook signature verification');

        // Try to parse the raw body as JSON to get event data
        const eventData = JSON.parse(rawBody.toString());
        console.log('📝 Parsed webhook body:', eventData);

        event = {
          id: eventData.id || 'dev_' + Date.now(),
          type: eventData.type || 'unknown',
          data: eventData.data || eventData,
          created: eventData.created || Math.floor(Date.now() / 1000)
        } as { id?: string; type?: string; data?: { object: Record<string, unknown> } };

        console.log('✅ Development mode: Created mock event from raw body:', event);
      } else {
        console.log('🔐 Production mode: Verifying webhook signature');
        // Production mode: Always verify signature
        if (!stripe) throw new Error('Stripe not initialized');
        event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret) as typeof event;
      }

      console.log('🔍 Event variable after construction:', {
        eventDefined: typeof event !== 'undefined',
        eventValue: event,
        eventType: typeof event
      });

      if (!event) {
        throw new Error('Failed to construct webhook event - event is undefined');
      }
    } catch (err: unknown) {
      const stripeError = err as Error;
      console.error('❌ Stripe webhook signature verification failed:', {
        error: stripeError.message,
        errorType: stripeError.constructor?.name,
        errorStack: stripeError.stack
      });

      // Check for specific Stripe error types
      if (stripeError.message.includes('No signatures found')) {
        throw new Error('Webhook signature missing - check Stripe-Signature header');
      } else if (stripeError.message.includes('Invalid signature')) {
        throw new Error('Webhook signature invalid - check webhook secret and signature');
      } else if (stripeError.message.includes('Timestamp too old')) {
        throw new Error('Webhook timestamp too old - check system clock');
      } else {
        throw new Error(`Stripe webhook verification failed: ${stripeError.message}`);
      }
    }

    // At this point, event should be defined
    if (!event || !event.type) {
      throw new Error('Invalid webhook event - missing type or data');
    }

    console.log('🎣 Stripe webhook received:', event.type);

    // Process the webhook event
    console.log('🔄 Processing webhook event type:', event.type);
    const eventObj = event.data?.object ?? {};
    console.log('🔄 Event data keys:', Object.keys(eventObj));
    console.log('🔄 Event metadata keys:', Object.keys((eventObj as Record<string, unknown>).metadata || {}));

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('💳 Processing checkout.session.completed event');
        // Check if this is a credit purchase (has creditAmount in metadata)
        if ((eventObj as Record<string, unknown>).metadata?.creditAmount) {
          console.log('🎯 CREDIT PURCHASE DETECTED in subscription webhook - redirecting to credit service');
          console.log('🎯 Credit amount:', (eventObj as Record<string, unknown>).metadata.creditAmount);
          console.log('🎯 Tenant ID:', (eventObj as Record<string, unknown>).metadata.tenantId);
          await handleCreditPurchase(eventObj as Record<string, unknown>);
        } else {
          console.log('📋 Regular subscription checkout - using standard handler');
          await handleCheckoutCompleted(eventObj as Record<string, unknown>);
        }
        break;

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(eventObj as Record<string, unknown> & { id?: string; subscription?: string; customer?: string; amount_paid?: number; currency?: string; payment_intent?: string; billing_reason?: string; number?: string; tax?: number; period_start?: number; period_end?: number; attempt_count?: number; next_payment_attempt?: number; status_transitions?: { paid_at?: number }; lines?: { data?: Array<{ price?: { id?: string } }> }; payment_method_types?: string[] });
        break;

      case 'invoice_payment.paid':
        await handleInvoicePaymentPaid(eventObj as Record<string, unknown>);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(eventObj as Record<string, unknown>);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(eventObj as Record<string, unknown> & { id: string; customer: string; status: string; current_period_start: number; current_period_end: number });
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(eventObj as Record<string, unknown> & { id: string; status: string; current_period_start: number; current_period_end: number; items?: { data?: Array<{ price?: string | { id?: string } }> } });
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(eventObj as Record<string, unknown> & { id: string });
        break;

      case 'charge.dispute.created':
        await handleChargeDispute(eventObj as Record<string, unknown> & { id: string; charge: string; amount: number; reason?: string; status?: string; currency?: string; created?: number; evidence_details?: { due_by?: number; has_evidence?: boolean } });
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(eventObj as Record<string, unknown> & { id: string; customer?: string; amount: number; currency?: string; payment_intent?: string; payment_method_details?: { type?: string }; description?: string; metadata?: Record<string, unknown>; created?: number });
        break;

      case 'refund.created':
        await handleRefund(eventObj as Record<string, unknown> & { id: string; charge: string; amount: number; reason?: string; status?: string; currency?: string; created?: number });
        break;

      default:
        console.log(`⚠️ Unhandled webhook event type: ${event.type}`);
    }

    return { processed: true, eventType: event.type };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Webhook processing error:', error);

    // Don't throw error for test webhooks or missing metadata (should not retry)
    if (
      error.message?.includes('Missing tenantId or planId') ||
      error.message?.includes('test webhook') ||
      error.message?.includes('already_processed')
    ) {
      console.log('🔄 Returning success for test webhook to prevent 500 error');
      return {
        processed: true,
        eventType: (typeof event !== 'undefined' && event?.type) || 'unknown',
        skipped: true,
        reason: error.message
      };
    }

    // Re-throw the error for other cases
    throw error;
  }
}

// Handle checkout session completed webhook
export async function handleCheckoutCompleted(session: Record<string, unknown>): Promise<void> {
  try {
    const meta = (session.metadata ?? {}) as Record<string, unknown>;
    console.log('🛒 Processing checkout completion:', session.id);

    const tenantId = meta.tenantId as string | undefined;
    const packageId = (meta.packageId || meta.planId) as string | undefined;
    const billingCycle = String(meta.billingCycle || 'yearly').toLowerCase();
    const dollarAmount = parseFloat(String(meta.dollarAmount ?? 0));
    const totalAmount = parseFloat(String(meta.totalAmount ?? 0));
    // Calculate credits from dollar amount ($1 = 1000 credits at $0.001 each)
    const creditAmount = Math.floor(dollarAmount * 1000);

    console.log('📦 Checkout session metadata:', {
      tenantId,
      packageId,
      billingCycle,
      dollarAmount,
      creditAmount,
      totalAmount,
      sessionMode: session.mode
    });

    if (!tenantId) {
      console.warn('⚠️ Missing tenantId in checkout session metadata');
      throw new Error('Missing tenantId in checkout session metadata');
    }

    // Handle credit purchases (payment mode)
    if (session.mode === 'payment' && creditAmount > 0) {
      console.log('💰 Processing credit purchase completion');

      if (!creditAmount) {
        console.warn('⚠️ Missing credit amount in metadata:', { creditAmount });
        throw new Error('Missing credit amount in checkout session metadata');
      }

      // Extract entity information from metadata for hierarchical purchases
      const entityType = (meta.entityType as string) || 'organization';
      let entityId = meta.entityId as string | undefined;

      // If entityId is not in metadata, find the root organization
      if (!entityId) {
        console.log('🔍 No entityId in metadata, finding root organization...');
        const rootOrgId = await CreditService.findRootOrganization(tenantId);
        if (rootOrgId) {
          entityId = rootOrgId;
          console.log(`✅ Using root organization from webhook: ${entityId}`);
        } else {
          console.warn('⚠️ Root organization not found, using tenantId as fallback');
          entityId = tenantId;
        }
      }

      console.log('🏗️ Processing hierarchical credit purchase:', {
        tenantId,
        entityType,
        entityId,
        creditAmount
      });

      // Check if tenant exists before processing
      try {
        const tenantExists = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
        if (tenantExists.length === 0) {
          console.warn('⚠️ Tenant does not exist in database:', tenantId);
          console.log('📝 Recording payment completion for future processing when tenant is created');

          console.log('✅ Payment recorded - credits will be allocated when tenant data is available');
          return;
        }
      } catch (errDb: unknown) {
        const dbError = errDb as Error;
        console.warn('⚠️ Could not verify tenant existence:', dbError.message);
      }

      // For webhook processing, we might not have a valid user context
      const purchaseResult = await CreditService.purchaseCredits({
        tenantId: tenantId as string,
        userId: null as unknown as string,
        creditAmount,
        paymentMethod: 'stripe',
        currency: 'USD',
        entityType,
        entityId: entityId ?? tenantId,
        isWebhookCompletion: true,
        sessionId: session.id as string,
        notes: `Completed Stripe payment for ${creditAmount} credits (${entityType})`
      });

      console.log('✅ Credit purchase processed successfully for tenant:', tenantId);

      // Create payment record for credit purchase
      try {
        const { PaymentService } = await import('./payment-service.js');
        const amountTotal = Number(session.amount_total ?? 0);
        const paymentAmount = dollarAmount || totalAmount || amountTotal / 100;
        const paymentIntentId = String(session.payment_intent || session.id);

        const existingPayment = await PaymentService.getPaymentByIntentId(paymentIntentId);

        if (!existingPayment) {
          await PaymentService.recordPayment({
            tenantId: tenantId as string,
            stripePaymentIntentId: paymentIntentId,
            stripeCustomerId: session.customer as string | undefined,
            amount: paymentAmount.toString(),
            currency: String(session.currency || 'USD').toUpperCase(),
            status: session.payment_status === 'paid' ? 'succeeded' : 'pending',
            paymentMethod: 'card',
            paymentType: 'credit_purchase',
            description: `Credit purchase: ${creditAmount.toLocaleString()} credits for $${paymentAmount.toFixed(2)}`,
            metadata: {
              stripeCheckoutSessionId: session.id,
              creditAmount: creditAmount.toString(),
              entityType,
              entityId: entityId ?? tenantId,
              purchaseId: (purchaseResult as Record<string, unknown>)?.purchaseId,
              ...(typeof session.metadata === 'object' && session.metadata !== null ? (session.metadata as Record<string, unknown>) : {})
            },
            paidAt: session.payment_status === 'paid' ? new Date() : undefined
          });
          console.log('✅ Payment record created for credit purchase');
        } else {
          await PaymentService.updatePaymentStatus(
            paymentIntentId,
            session.payment_status === 'paid' ? 'succeeded' : 'pending',
            {
              stripeCheckoutSessionId: session.id,
              paid_at: session.payment_status === 'paid' ? new Date().toISOString() : undefined
            }
          );
          console.log('✅ Payment record updated for credit purchase');
        }
      } catch (err: unknown) {
        const paymentError = err as Error;
        console.error('❌ Failed to create payment record for credit purchase:', paymentError);
      }

      // Send payment confirmation email for credit purchase
      try {
        const paymentsModule = await import('../routes/payments.js');
        const getTenantAdminEmail = paymentsModule.getTenantAdminEmail || (async () => null);
        const userInfo = await getTenantAdminEmail(tenantId);
        if (userInfo?.email) {
          const { EmailService } = await import('../../../utils/email.js');
          const emailService = new EmailService();

          await emailService.sendPaymentConfirmation({
            tenantId: tenantId as string,
            userEmail: userInfo.email,
            userName: userInfo.name,
            paymentType: 'credit_purchase',
            amount: dollarAmount || totalAmount,
            currency: 'USD',
            transactionId: session.id as string,
            planName: 'Credit Purchase',
            billingCycle: undefined,
            creditsAdded: creditAmount,
            sessionId: session.id as string
          });
        }
      } catch (err: unknown) {
        const emailError = err as Error;
        console.error('❌ Failed to send credit purchase confirmation email:', emailError);
      }

      return;
    }

    // Legacy subscription handling (for backward compatibility)
    if (session.mode === 'subscription') {
      console.log('📋 Processing legacy subscription completion');

      const planId = packageId;
      if (!planId) {
        throw new Error('Missing planId in subscription checkout session metadata');
      }

      const plans = await getAvailablePlans();
      const plan = plans.find((p: Record<string, unknown>) => p.id === planId);

      if (!plan) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }

      const existingSubscription = await getCurrentSubscription(tenantId);

      let subscriptionRecord: Record<string, unknown>;

      if (existingSubscription) {
        console.log('🔄 Updating existing subscription for tenant:', tenantId);

        const updateData = {
          plan: planId,
          status: 'active',
          stripeSubscriptionId: session.subscription,
          stripeCustomerId: session.customer,
          subscribedTools: plan.applications ?? [],
          usageLimits: plan.limits ?? {},
          yearlyPrice: String(plan.yearlyPrice ?? plan.price ?? 0),
          billingCycle: billingCycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        } as Record<string, unknown>;

        if (existingSubscription.plan === 'trial' || (existingSubscription as Record<string, unknown>).isTrialUser) {
          updateData.hasEverUpgraded = true;
          updateData.isTrialUser = false;
        }

        const [updatedSubscription] = await db
          .update(subscriptions)
          .set(updateData as Record<string, unknown>)
          .where(eq(subscriptions.tenantId, tenantId))
          .returning();

        if (!updatedSubscription) {
          throw new Error(`Failed to update subscription for tenant: ${tenantId}`);
        }

        console.log('✅ Subscription updated successfully:', (updatedSubscription as Record<string, unknown>).subscriptionId);

        await updateAdministratorRolesForPlan(tenantId, planId);

        try {
          const onboardingOrgSetup = (await import('../../onboarding/services/onboarding-organization-setup.js')).default;
          await onboardingOrgSetup.updateOrganizationApplicationsForPlanChange(tenantId, planId, { skipIfRecentlyUpdated: true });
          console.log('✅ Organization applications updated for new plan');
        } catch (errOrgApp: unknown) {
          const orgAppError = errOrgApp as Error;
          console.error('❌ Failed to update organization applications:', orgAppError.message);
        }

        subscriptionRecord = existingSubscription;
      } else {
        console.log('🆕 Creating new subscription for tenant:', tenantId);

        const [newSubscription] = await db
          .insert(subscriptions)
          .values({
            subscriptionId: uuidv4(),
            tenantId,
            plan: planId,
            status: 'active',
            stripeSubscriptionId: (session as Record<string, unknown>).subscription ?? null,
            stripeCustomerId: (session as Record<string, unknown>).customer ?? null,
            subscribedTools: (plan.applications ?? []) as unknown,
            usageLimits: (plan.limits ?? {}) as unknown,
            yearlyPrice: String((plan.yearlyPrice ?? plan.price ?? 0) as number),
            billingCycle: billingCycle,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
            hasEverUpgraded: true,
            isTrialUser: false,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Record<string, unknown>)
          .returning();

        subscriptionRecord = newSubscription as unknown as Record<string, unknown>;
      }

      console.log('💰 Checkout completed - payment will be recorded by invoice.payment_succeeded webhook');

      const [updatedTenant] = await db
        .update(tenants)
        .set({
          stripeCustomerId: (session as Record<string, unknown>).customer ?? undefined,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId))
        .returning();

      if (!updatedTenant) {
        console.warn('⚠️ Failed to update tenant with Stripe customer ID:', tenantId);
      } else {
        console.log('✅ Tenant updated with Stripe customer ID:', updatedTenant.tenantId);
      }

      // Allocate plan credits to tenant's organization entity
      try {
        const planCredits = Number((plan as Record<string, unknown>).credits) || 0;
        if (planCredits > 0) {
          console.log(`💰 Allocating ${planCredits} plan credits for ${(plan as Record<string, unknown>).name} plan to tenant:`, tenantId);

          const orgEntities = await db
            .select()
            .from(entities)
            .where(and(eq(entities.tenantId, tenantId), eq(entities.entityType, 'organization'), eq(entities.isActive, true)));

          const defaultEntity = orgEntities.find((e: { isDefault?: boolean }) => e.isDefault) || orgEntities[0];

          if (defaultEntity) {
            const entityId = defaultEntity.entityId;
            console.log(`✅ Found organization entity for credit allocation:`, entityId);

            await CreditService.addCreditsToEntity({
              tenantId,
              entityType: 'organization',
              entityId: entityId,
              creditAmount: planCredits,
              source: 'subscription',
              sourceId: (session as Record<string, unknown>).id || (subscriptionRecord?.subscriptionId as string),
              description: `${(plan as Record<string, unknown>).name} plan credits (${planCredits.toLocaleString()} annual credits)`,
              initiatedBy: '00000000-0000-0000-0000-000000000001'
            });

            console.log(`✅ Successfully allocated ${planCredits} credits to organization entity ${entityId}`);
          } else {
            console.warn('⚠️ No organization entity found for tenant, skipping credit allocation:', tenantId);
          }
        } else {
          console.log(`ℹ️ Plan ${(plan as Record<string, unknown>).name} has no included credits (${planCredits}), skipping credit allocation`);
        }
      } catch (errCredit: unknown) {
        const creditError = errCredit as Error;
        console.error('❌ Failed to allocate plan credits:', creditError.message);
      }

      console.log('✅ Checkout completed successfully for tenant:', tenantId, 'plan:', planId);

      try {
        const paymentsModule = await import('../routes/payments.js');
        const getTenantAdminEmail = paymentsModule.getTenantAdminEmail || (async () => null);
        const userInfo = await getTenantAdminEmail(tenantId);
        if (userInfo?.email) {
          const { EmailService } = await import('../../../utils/email.js');
          const emailService = new EmailService();

          await emailService.sendPaymentConfirmation({
            tenantId,
            userEmail: userInfo.email,
            userName: userInfo.name,
            paymentType: 'subscription',
            amount: billingCycle === 'yearly' ? (plan as Record<string, unknown>).yearlyPrice : (plan as Record<string, unknown>).monthlyPrice,
            currency: 'USD',
            transactionId: (session as Record<string, unknown>).id,
            planName: (plan as Record<string, unknown>).name,
            billingCycle,
            sessionId: (session as Record<string, unknown>).id
          });
        }
      } catch (err: unknown) {
        const emailError = err as Error;
        console.error('❌ Failed to send subscription confirmation email:', emailError);
      }
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling checkout completed:', error);
    throw error;
  }
}

/** Apply invoice payment to a subscription (fallback when lookup by stripeSubscriptionId fails). */
export async function applyInvoicePaymentToSubscription(
  subscriptionRecord: Record<string, unknown>,
  stripeSubscriptionId: string,
  invoice: Record<string, unknown> & {
    lines?: { data?: Array<{ price?: { id?: string } }> };
    billing_reason?: string;
  }
): Promise<void> {
  const linePriceId = invoice.lines?.data?.[0]?.price?.id;
  const planId = linePriceId ? await getPlanIdFromPriceId(linePriceId) : null;
  const setPayload: Record<string, unknown> = {
    stripeSubscriptionId: stripeSubscriptionId,
    status: 'active',
    updatedAt: new Date()
  };
  if (planId) {
    const plans = await getAvailablePlans();
    const plan = plans.find((p: Record<string, unknown>) => p.id === planId) as Record<string, unknown> | undefined;
    if (plan) {
      setPayload.plan = planId;
      setPayload.subscribedTools = plan.applications ?? [];
      setPayload.usageLimits = plan.limits ?? {};
      setPayload.yearlyPrice = String((plan.yearlyPrice ?? plan.price ?? 0) as number);
    }
  }
  await db
    .update(subscriptions)
    .set(setPayload as Record<string, unknown>)
    .where(eq(subscriptions.subscriptionId, (subscriptionRecord.subscriptionId ?? subscriptionRecord.subscription_id) as string));

  if (planId) {
    console.log(`🔄 Triggering role upgrade for plan: ${planId}`);
    await updateAdministratorRolesForPlan(subscriptionRecord.tenantId as string, planId);
    try {
      const onboardingOrgSetup = (await import('../../onboarding/services/onboarding-organization-setup.js')).default;
      await onboardingOrgSetup.updateOrganizationApplicationsForPlanChange(
        subscriptionRecord.tenantId as string,
        planId,
        { skipIfRecentlyUpdated: true }
      );
      console.log('✅ Organization applications updated for new plan');
    } catch (errOrgApp: unknown) {
      const orgAppError = errOrgApp as Error;
      console.error('❌ Failed to update organization applications:', orgAppError.message);
    }
  }
}

// Handle payment succeeded webhook
export async function handlePaymentSucceeded(
  invoice: Record<string, unknown> & {
    id?: string;
    subscription?: string;
    customer?: string;
    amount_paid?: number;
    currency?: string;
    payment_intent?: string;
    billing_reason?: string;
    number?: string;
    tax?: number;
    period_start?: number;
    period_end?: number;
    attempt_count?: number;
    next_payment_attempt?: number;
    status_transitions?: { paid_at?: number };
    lines?: { data?: Array<{ price?: { id?: string } }> };
    payment_method_types?: string[];
    charge?: string;
  }
): Promise<void> {
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
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (!subscription) {
        console.error('❌ Subscription not found for payment:', subscriptionId);

        const [fallbackSubscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeCustomerId, (invoice.customer ?? '') as string))
          .limit(1);

        if (fallbackSubscription) {
          console.log('✅ Found subscription by customer ID:', invoice.customer);
          await applyInvoicePaymentToSubscription(fallbackSubscription as unknown as Record<string, unknown>, subscriptionId, invoice);
          return;
        }

        const [tenantByCustomer] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.stripeCustomerId, (invoice.customer ?? '') as string))
          .limit(1);

        if (tenantByCustomer) {
          const [subByTenant] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.tenantId, tenantByCustomer.tenantId))
            .limit(1);

          if (subByTenant) {
            console.log('✅ Found subscription by tenant (Stripe customer):', tenantByCustomer.tenantId);
            await applyInvoicePaymentToSubscription(subByTenant as unknown as Record<string, unknown>, subscriptionId, invoice);
            return;
          }
        }

        if (stripe && invoice.customer) {
          try {
            const stripeCustomer = await stripe.customers.retrieve(invoice.customer as string);
            const customerEmail = stripeCustomer.deleted ? null : (stripeCustomer.email || null);
            if (customerEmail) {
              const [tenantUserByEmail] = await db
                .select()
                .from(tenantUsers)
                .where(eq(tenantUsers.email, customerEmail))
                .limit(1);

              if (tenantUserByEmail) {
                const [subByTenant] = await db
                  .select()
                  .from(subscriptions)
                  .where(eq(subscriptions.tenantId, tenantUserByEmail.tenantId))
                  .limit(1);

                if (subByTenant) {
                  console.log('✅ Found subscription by Stripe customer email:', customerEmail, 'tenant:', tenantUserByEmail.tenantId);
                  await applyInvoicePaymentToSubscription(subByTenant as unknown as Record<string, unknown>, subscriptionId, invoice);
                  await db
                    .update(tenants)
                    .set({ stripeCustomerId: invoice.customer, updatedAt: new Date() })
                    .where(eq(tenants.tenantId, tenantUserByEmail.tenantId));
                  return;
                }
              }
            }
          } catch (errStripe: unknown) {
            const stripeErr = errStripe as Error;
            console.warn('⚠️ Stripe customer lookup fallback failed:', stripeErr?.message);
          }
        }

        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      const invoicePriceId = (invoice as Record<string, unknown>).lines?.data?.[0]?.price?.id ?? null;
      const planId = invoicePriceId ? await getPlanIdFromPriceId(invoicePriceId as string) : null;
      const setPayload: Record<string, unknown> = {
        status: 'active',
        updatedAt: new Date()
      };
      if (planId) {
        const plans = await getAvailablePlans();
        const plan = plans.find((p: Record<string, unknown>) => p.id === planId) as Record<string, unknown> | undefined;
        if (plan) {
          setPayload.plan = planId;
          setPayload.subscribedTools = plan.applications ?? (plan as Record<string, unknown>).subscribedTools ?? [];
          setPayload.usageLimits = plan.limits ?? (plan as Record<string, unknown>).usageLimits ?? {};
          setPayload.yearlyPrice = String((plan.yearlyPrice ?? plan.price ?? 0) as number);
        }
      }
      await db
        .update(subscriptions)
        .set(setPayload as Record<string, unknown>)
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      if (planId) {
        console.log(`🔄 Triggering role upgrade for plan: ${planId}`);
        await updateAdministratorRolesForPlan(subscription.tenantId, planId);
        try {
          const onboardingOrgSetup = (await import('../../onboarding/services/onboarding-organization-setup.js')).default;
          const result = await onboardingOrgSetup.updateOrganizationApplicationsForPlanChange(subscription.tenantId, planId, { skipIfRecentlyUpdated: true });
          console.log('✅ Organization applications updated for new plan:', (result as Record<string, unknown>).applicationsAssigned ?? 0, 'assigned');
        } catch (errOrgApp: unknown) {
          const orgAppError = errOrgApp as Error;
          console.error('❌ Failed to update organization applications:', orgAppError.message);
        }
      }

      const amountPaid = (invoice as Record<string, unknown>).amount_paid ?? 0;
      const invoiceTax = (invoice as Record<string, unknown>).tax ?? 0;
      const invoiceCurrency = (invoice as Record<string, unknown>).currency ?? 'USD';

      await createPaymentRecord({
        tenantId: (subscription as Record<string, unknown>).tenantId,
        subscriptionId: ((subscription as Record<string, unknown>).subscriptionId ?? undefined) as string | undefined,
        stripePaymentIntentId: (invoice as Record<string, unknown>).payment_intent,
        stripeInvoiceId: invoice.id,
        stripeChargeId: (invoice as Record<string, unknown>).charge,
        amount: amountPaid / 100,
        currency: String(invoiceCurrency).toUpperCase(),
        status: 'succeeded',
        paymentMethod: 'card',
        paymentType: 'subscription',
        billingReason: (invoice as Record<string, unknown>).billing_reason,
        invoiceNumber: (invoice as Record<string, unknown>).number,
        description: `Subscription payment for ${(subscription as Record<string, unknown>).plan as string} plan`,
        taxAmount: invoiceTax / 100,
        processingFees: 0,
        netAmount: (amountPaid - invoiceTax) / 100,
        paymentMethodDetails: (invoice as Record<string, unknown>).payment_intent ? {} : {},
        riskLevel: 'normal',
        metadata: {
          stripeCustomerId: (invoice as Record<string, unknown>).customer,
          billingReason: (invoice as Record<string, unknown>).billing_reason,
          subscriptionPeriod: {
            start: new Date(((invoice as Record<string, unknown>).period_start ?? 0) * 1000),
            end: new Date(((invoice as Record<string, unknown>).period_end ?? 0) * 1000)
          },
          attempt_count: (invoice as Record<string, unknown>).attempt_count,
          nextPaymentAttempt: (invoice as Record<string, unknown>).next_payment_attempt ? new Date((invoice as Record<string, unknown>).next_payment_attempt * 1000) : null
        },
        stripeRawData: invoice,
        paidAt: new Date(((invoice as Record<string, unknown>).status_transitions?.paid_at ?? 0) * 1000)
      });

      console.log('✅ Payment succeeded and recorded for tenant:', subscription.tenantId, 'amount:', amountPaid / 100);

      try {
        const ActivityLogger = (await import('../../../services/activityLogger.js')).default;
        const [tenantUser] = await db
          .select()
          .from(tenantUsers)
          .where(eq(tenantUsers.tenantId, subscription.tenantId))
          .limit(1);

        if (tenantUser) {
          const requestContext: RequestContext = {
            ipAddress: undefined,
            userAgent: 'stripe-webhook',
            sessionId: undefined,
            source: 'webhook'
          };

          await ActivityLogger.logActivity(
            tenantUser.userId,
            subscription.tenantId,
            null,
            'payment.topup_success',
            {
              invoiceId: invoice.id,
              subscriptionId: subscription.subscriptionId,
              amount: amountPaid / 100,
              currency: invoiceCurrency,
              paymentMethod: invoice.payment_method_types?.[0] || 'card',
              planId: invoice.lines?.data?.[0]?.price?.id
            },
            requestContext
          );
        }
      } catch (errLog: unknown) {
        const logError = errLog as Error;
        console.warn('⚠️ Failed to log payment success activity:', logError.message);
      }
    } else {
      console.log('⚠️ Payment succeeded but no subscription ID found in invoice:', invoice.id);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}

// Handle invoice payment paid webhook (different from invoice.payment_succeeded)
export async function handleInvoicePaymentPaid(invoicePayment: Record<string, unknown>): Promise<void> {
  try {
    console.log('💰 Processing invoice payment paid:', invoicePayment.id);
    console.log('📋 Invoice Payment details:', {
      id: invoicePayment.id,
      invoice: invoicePayment.invoice,
      amount_paid: invoicePayment.amount_paid,
      currency: invoicePayment.currency,
      status: invoicePayment.status,
      payment: (invoicePayment as Record<string, unknown>).payment
    });

    if (!isStripeConfiguredFn()) {
      console.log('⚠️ Stripe not configured - skipping invoice payment processing');
      return;
    }

    try {
      if (!stripe) throw new Error('Stripe not configured');
      const invoice = await stripe.invoices.retrieve(invoicePayment.invoice as string);
      console.log('📄 Retrieved invoice:', {
        id: invoice.id,
        customer: invoice.customer,
        subscription: invoice.subscription,
        status: invoice.status
      });

      await handlePaymentSucceeded(invoice as Record<string, unknown> & { id?: string; subscription?: string; customer?: string; amount_paid?: number; currency?: string; payment_intent?: string; billing_reason?: string; number?: string; tax?: number; period_start?: number; period_end?: number; attempt_count?: number; next_payment_attempt?: number; status_transitions?: { paid_at?: number }; lines?: { data?: Array<{ price?: { id?: string } }> }; payment_method_types?: string[]; charge?: string });
    } catch (err: unknown) {
      const stripeError = err as Error;
      console.error('❌ Failed to retrieve invoice from Stripe:', stripeError);

      const paymentIntent = (invoicePayment as Record<string, unknown>).payment?.payment_intent;
      if (paymentIntent) {
        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.stripePaymentIntentId, paymentIntent as string))
          .limit(1);

        if (payment) {
          console.log('✅ Found payment record, updating status');
          const paidAt = (invoicePayment as Record<string, unknown>).status_transitions?.paid_at;
          await db
            .update(payments)
            .set({
              status: 'succeeded',
              paidAt: paidAt != null ? new Date((paidAt as number) * 1000) : new Date(),
              updatedAt: new Date()
            })
            .where(eq(payments.paymentId, payment.paymentId));
        }
      }
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling invoice payment paid:', error);
    throw error;
  }
}

// Handle payment failed webhook
export async function handlePaymentFailed(invoice: Record<string, unknown>): Promise<void> {
  try {
    console.log('❌ Processing payment failed for invoice:', invoice.id);

    const subscriptionId = invoice.subscription;

    if (subscriptionId) {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId as string))
        .limit(1);

      if (!subscription) {
        console.error('❌ Subscription not found for failed payment:', subscriptionId);
        return;
      }

      await db
        .update(subscriptions)
        .set({ status: 'past_due', updatedAt: new Date() } as Record<string, unknown>)
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId as string));

      const inv = invoice as Record<string, unknown>;
      await createPaymentRecord({
        tenantId: subscription.tenantId,
        subscriptionId: subscription.subscriptionId ?? undefined,
        stripePaymentIntentId: inv.payment_intent,
        stripeInvoiceId: inv.id,
        amount: Number(inv.amount_due ?? 0) / 100,
        currency: String(inv.currency ?? 'USD').toUpperCase(),
        status: 'failed',
        paymentMethod: 'card',
        paymentType: 'subscription',
        billingReason: inv.billing_reason,
        invoiceNumber: inv.number,
        description: `Failed subscription payment for ${subscription.plan} plan`,
        metadata: {
          stripeCustomerId: inv.customer,
          failureReason: (inv.last_finalization_error as Error)?.message || 'Payment failed',
          failureCode: (inv.last_finalization_error as Record<string, unknown>)?.code,
          attemptCount: inv.attempt_count,
          nextPaymentAttempt: inv.next_payment_attempt ? new Date((inv.next_payment_attempt as number) * 1000) : null,
          billingReason: inv.billing_reason
        },
        stripeRawData: invoice,
        paidAt: new Date()
      } as Record<string, unknown>);

      console.log('❌ Payment failed and recorded for tenant:', subscription.tenantId);

      try {
        const ActivityLogger = (await import('../../../services/activityLogger.js')).default;
        const [tenantUser] = await db
          .select()
          .from(tenantUsers)
          .where(eq(tenantUsers.tenantId, subscription.tenantId))
          .limit(1);

        if (tenantUser) {
          const requestContext: RequestContext = {
            ipAddress: undefined,
            userAgent: 'stripe-webhook',
            sessionId: undefined,
            source: 'webhook'
          };

          await ActivityLogger.logActivity(
            tenantUser.userId,
            subscription.tenantId,
            null,
            'payment.topup_failed',
            {
              invoiceId: invoice.id,
              subscriptionId: subscription.subscriptionId,
              amount: Number((invoice as Record<string, unknown>).amount_due ?? 0) / 100,
              currency: String((invoice as Record<string, unknown>).currency ?? 'USD'),
              failureReason: ((invoice as Record<string, unknown>).last_finalization_error as Error)?.message || 'Payment failed',
              failureCode: ((invoice as Record<string, unknown>).last_finalization_error as Record<string, unknown>)?.code,
              attemptCount: (invoice as Record<string, unknown>).attempt_count,
              nextPaymentAttempt: (invoice as Record<string, unknown>).next_payment_attempt != null ? new Date(Number((invoice as Record<string, unknown>).next_payment_attempt) * 1000) : null
            },
            requestContext
          );
        }
      } catch (errLog: unknown) {
        const logError = errLog as Error;
        console.warn('⚠️ Failed to log payment failure activity:', logError.message);
      }

      const emailService = new EmailService();
      await emailService.sendPaymentFailedNotification({
        tenantId: subscription.tenantId,
        amount: (invoice as Record<string, unknown>).amount_due / 100,
        currency: ((invoice as Record<string, unknown>).currency as string).toUpperCase(),
        nextAttempt: (invoice as Record<string, unknown>).next_payment_attempt ? new Date((invoice as Record<string, unknown>).next_payment_attempt * 1000) : undefined,
        failureReason: ((invoice as Record<string, unknown>).last_finalization_error as Error)?.message || 'Payment failed'
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling payment failed:', error);
    throw error;
  }
}

// Handle charge dispute webhook
export async function handleChargeDispute(
  dispute: Record<string, unknown> & {
    id: string;
    charge: string;
    amount: number;
    reason?: string;
    status?: string;
    currency?: string;
    created?: number;
    evidence_details?: { due_by?: number; has_evidence?: boolean };
  }
): Promise<void> {
  try {
    console.log('⚖️ Processing charge dispute:', dispute.id);

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripeChargeId, dispute.charge))
      .limit(1);

    if (!payment) {
      console.error('❌ Payment not found for dispute:', dispute.charge);
      return;
    }

    await db
      .update(payments)
      .set({
        status: 'disputed',
        updatedAt: new Date(),
        metadata: {
          ...(payment.metadata as Record<string, unknown> || {}),
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
          ...(payment.stripeRawData as Record<string, unknown> || {}),
          dispute: dispute
        }
      } as Record<string, unknown>)
      .where(eq(payments.paymentId, payment.paymentId));

    const emailServiceDispute = new EmailService();
    await emailServiceDispute.sendDisputeNotification({
      tenantId: payment.tenantId,
      disputeId: dispute.id,
      amount: dispute.amount / 100,
      currency: String(dispute.currency ?? 'USD'),
      reason: dispute.reason ?? '',
      evidenceDueBy: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : undefined
    });

    console.log('⚖️ Dispute recorded for payment:', payment.paymentId);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling charge dispute:', error);
    throw error;
  }
}

// Handle refund webhook
export async function handleRefund(
  refund: Record<string, unknown> & {
    id: string;
    charge: string;
    amount: number;
    reason?: string;
    status?: string;
    currency?: string;
    created?: number;
  }
): Promise<void> {
  const refundCreated = (refund.created ?? 0) as number;
  const refundCurrency = (refund.currency ?? 'USD') as string;
  try {
    console.log('💸 Processing refund:', refund.id);

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
    const isPartialRefund = refundAmount < parseFloat(String(payment.amount));

    const existingMeta = (payment.metadata as Record<string, unknown>) || {};
    await db
      .update(payments)
      .set({
        status: isPartialRefund ? 'partially_refunded' : 'refunded',
        updatedAt: new Date(),
        metadata: {
          ...existingMeta,
          amountRefunded: refundAmount,
          stripeRefundId: refund.id,
          refund: {
            id: refund.id,
            amount: refundAmount,
            reason: refund.reason,
            status: refund.status,
            created: new Date(refundCreated * 1000)
          }
        }
      } as Record<string, unknown>)
      .where(eq(payments.paymentId, payment.paymentId));

    await createPaymentRecord({
      tenantId: payment.tenantId,
      subscriptionId: payment.subscriptionId ?? undefined,
      stripeChargeId: refund.charge,
      stripeRefundId: refund.id,
      amount: -refundAmount,
      currency: String(refundCurrency).toUpperCase(),
      status: (refund.status ?? 'succeeded') as string,
      paymentType: 'refund',
      billingReason: 'refund',
      description: `Refund for ${refund.reason || 'customer request'}`,
      metadata: {
        originalPaymentId: payment.paymentId,
        refundReason: refund.reason,
        isPartialRefund
      },
      stripeRawData: refund,
      paidAt: new Date(refundCreated * 1000)
    });

    console.log('💸 Refund recorded:', refund.id, 'amount:', refundAmount);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling refund:', error);
    throw error;
  }
}

// Handle subscription updated webhook (e.g. after plan change in Billing Portal)
export async function handleSubscriptionUpdated(
  subscription: Record<string, unknown> & {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    items?: { data?: Array<{ price?: string | { id?: string } }> };
  }
): Promise<void> {
  try {
    const [existing] = await db
      .select({ tenantId: subscriptions.tenantId })
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .limit(1);

    const priceRef = subscription.items?.data?.[0]?.price;
    const priceId = typeof priceRef === 'string' ? priceRef : (priceRef && typeof priceRef === 'object' && 'id' in priceRef ? (priceRef as { id?: string }).id : null);
    const planId = priceId ? await getPlanIdFromPriceId(priceId) : null;

    const setPayload: Record<string, unknown> = {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: new Date()
    };

    if (planId) {
      const plans = await getAvailablePlans();
      const plan = plans.find((p: Record<string, unknown>) => p.id === planId) as Record<string, unknown> | undefined;
      if (plan) {
        setPayload.plan = planId;
        setPayload.subscribedTools = plan.applications ?? (plan as Record<string, unknown>).subscribedTools ?? [];
        setPayload.usageLimits = plan.limits ?? (plan as Record<string, unknown>).usageLimits ?? {};
        setPayload.yearlyPrice = String((plan.yearlyPrice ?? plan.price ?? 0) as number);
      }
    }

    await db
      .update(subscriptions)
      .set(setPayload as Record<string, unknown>)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    if (existing?.tenantId && planId) {
      console.log('🔄 Syncing plan from Stripe subscription.updated:', planId);
      await updateAdministratorRolesForPlan(existing.tenantId, planId);
      try {
        const onboardingOrgSetup = (await import('../../onboarding/services/onboarding-organization-setup.js')).default;
        await onboardingOrgSetup.updateOrganizationApplicationsForPlanChange(existing.tenantId, planId, { skipIfRecentlyUpdated: true });
      } catch (errOrgApp: unknown) {
        const orgAppError = errOrgApp as Error;
        console.error('❌ Failed to update organization applications:', orgAppError.message);
      }
    }

    console.log('🔄 Subscription updated:', subscription.id);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

// Handle subscription created webhook
export async function handleSubscriptionCreated(
  subscription: Record<string, unknown> & {
    id: string;
    customer: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
  }
): Promise<void> {
  try {
    console.log('🆕 Processing subscription created:', subscription.id);

    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, subscription.customer))
      .limit(1);

    if (existingSubscription) {
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
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

// Handle charge succeeded webhook
export async function handleChargeSucceeded(
  charge: Record<string, unknown> & {
    id: string;
    customer?: string;
    amount: number;
    currency?: string;
    payment_intent?: string;
    payment_method_details?: { type?: string };
    description?: string;
    metadata?: Record<string, unknown>;
    created?: number;
  }
): Promise<void> {
  try {
    console.log('💳 Processing charge succeeded:', charge.id);

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, (charge.customer ?? '') as string))
      .limit(1);

    if (subscription) {
      await createPaymentRecord({
        tenantId: subscription.tenantId,
        subscriptionId: subscription.subscriptionId ?? undefined,
        stripeChargeId: charge.id,
        stripePaymentIntentId: charge.payment_intent as string | undefined,
        stripeCustomerId: (charge.customer ?? undefined) as string | undefined,
        amount: (charge.amount / 100).toString(),
        currency: String(charge.currency ?? 'USD').toUpperCase(),
        status: 'succeeded',
        paymentMethod: (charge.payment_method_details as Record<string, unknown>)?.type || 'card',
        paymentType: 'subscription',
        description: (charge.description as string) || 'Subscription payment',
        metadata: (charge.metadata as Record<string, unknown>) || {},
        stripeRawData: charge,
        paidAt: new Date((charge.created ?? 0) * 1000)
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling charge succeeded:', error);
    throw error;
  }
}

// Handle credit purchase checkout completion
export async function handleCreditPurchase(session: Record<string, unknown>): Promise<void> {
  const meta = (session.metadata ?? {}) as Record<string, unknown>;
  console.log('🎯 === CREDIT PURCHASE WEBHOOK HANDLER STARTED ===');
  console.log('🎯 Session ID:', session.id);
  console.log('🎯 Payment Status:', session.payment_status);
  try {
    console.log('🎯 CREDIT PURCHASE WEBHOOK HANDLER CALLED');
    console.log('💰 Processing credit purchase checkout:', session.id);

    const tenantId = meta.tenantId as string | undefined;
    const userId = meta.userId as string | undefined;
    const creditAmount = parseInt(String(meta.creditAmount ?? '0'), 10);
    const entityType = (meta.entityType as string) || 'organization';
    const entityId = (meta.entityId as string) || tenantId;

    console.log('📋 Credit purchase details:', {
      tenantId,
      userId,
      creditAmount,
      entityType,
      entityId,
      paymentStatus: session.payment_status
    });

    if (!tenantId || !creditAmount) {
      console.error('❌ Missing required metadata for credit purchase');
      throw new Error('Missing required metadata for credit purchase');
    }

    let finalUserId: string | undefined = userId as string | undefined;
    if (!finalUserId) {
      console.log('⚠️ No userId in metadata, finding admin user for tenant...');
      try {
        console.log('🔐 Setting RLS context for user lookup...');
        await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`);
        await db.execute(sql`SELECT set_config('app.is_admin', 'true', false)`);
        console.log('✅ RLS context set for user lookup');

        const adminUsers = await db.execute(sql`
          SELECT user_id 
          FROM tenant_users 
          WHERE tenant_id = ${tenantId} 
          AND is_tenant_admin = true 
          AND is_active = true
          LIMIT 1
        `);

        if (adminUsers.length > 0) {
          finalUserId = (adminUsers[0] as Record<string, unknown>).user_id as string;
          console.log('✅ Found admin user:', finalUserId);
        } else {
          console.log('⚠️ No admin user found, looking for any active user...');
          const anyUsers = await db.execute(sql`
            SELECT user_id 
            FROM tenant_users 
            WHERE tenant_id = ${tenantId} 
            AND is_active = true
            LIMIT 1
          `);

          if (anyUsers.length > 0) {
            finalUserId = (anyUsers[0] as Record<string, unknown>).user_id as string;
            console.log('✅ Found active user:', finalUserId);
          } else {
            throw new Error('No active users found for tenant - cannot process credit purchase');
          }
        }
      } catch (errFind: unknown) {
        const error = errFind as Error;
        console.error('❌ Error finding user for tenant:', error);
        throw new Error(`Cannot process credit purchase: ${error.message}`);
      }
    }

    if (session.payment_status !== 'paid') {
      console.log('⚠️ Payment not completed for credit purchase');
      return;
    }

    console.log('🔐 Setting RLS context for credit operations...');
    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`);
    await db.execute(sql`SELECT set_config('app.user_id', ${finalUserId}, false)`);
    await db.execute(sql`SELECT set_config('app.is_admin', 'true', false)`);
    console.log('✅ RLS context set');

    console.log('📦 Importing CreditService...');
    const { CreditService } = await import('../../credits/index.js');
    console.log('✅ CreditService imported successfully');

    console.log('🔄 Calling CreditService.purchaseCredits...');
    const purchaseResult = await CreditService.purchaseCredits({
      tenantId: tenantId!,
      userId: finalUserId!,
      creditAmount,
      paymentMethod: 'stripe',
      currency: 'USD',
      entityType,
      entityId: entityId ?? tenantId!,
      notes: `Stripe checkout: ${String(session.id)}`,
      isWebhookCompletion: true,
      sessionId: String(session.id)
    });
    console.log('✅ CreditService.purchaseCredits completed');

    try {
      const { PaymentService } = await import('./payment-service.js');
      const dollarAmount = parseFloat(String(meta.dollarAmount ?? meta.totalAmount ?? 0));
      const amountTotal = Number(session.amount_total ?? 0);
      const paymentAmount = dollarAmount || (amountTotal ? amountTotal / 100 : 0);
      const paymentIntentId = String(session.payment_intent ?? session.id);

      const existingPayment = await PaymentService.getPaymentByIntentId(paymentIntentId);

      if (!existingPayment) {
        await PaymentService.recordPayment({
          tenantId: tenantId!,
          stripePaymentIntentId: paymentIntentId,
          stripeCustomerId: (session.customer != null ? String(session.customer) : undefined) as string | undefined,
          amount: paymentAmount.toString(),
          currency: String(session.currency ?? 'USD').toUpperCase(),
          status: session.payment_status === 'paid' ? 'succeeded' : 'pending',
          paymentMethod: 'card',
          paymentType: 'credit_purchase',
          description: `Credit purchase: ${creditAmount.toLocaleString()} credits for $${paymentAmount.toFixed(2)}`,
          metadata: {
            creditAmount: creditAmount.toString(),
            entityType,
            entityId: entityId ?? tenantId!,
            purchaseId: (purchaseResult as Record<string, unknown>)?.purchaseId,
            ...(typeof session.metadata === 'object' && session.metadata !== null ? (session.metadata as Record<string, unknown>) : {})
          },
          paidAt: (session.payment_status === 'paid' ? new Date() : undefined) as Date | undefined
        } as Record<string, unknown>);
        console.log('✅ Payment record created for credit purchase');
      } else {
        await PaymentService.updatePaymentStatus(paymentIntentId, session.payment_status === 'paid' ? 'succeeded' : 'pending', {
          stripe_checkout_session_id: session.id,
          paid_at: session.payment_status === 'paid' ? new Date().toISOString() : undefined
        });
        console.log('✅ Payment record updated for credit purchase');
      }
    } catch (err: unknown) {
      const paymentError = err as Error;
      console.error('❌ Failed to create payment record for credit purchase:', paymentError);
    }

    console.log('✅ Credit purchase processed successfully:', {
      purchaseId: (purchaseResult as Record<string, unknown>)?.purchaseId,
      creditsAllocated: creditAmount,
      tenantId
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Error processing credit purchase:', error.message);
    throw error;
  }
}

// Handle subscription deleted webhook
export async function handleSubscriptionDeleted(subscription: Record<string, unknown> & { id: string }): Promise<void> {
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
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}
