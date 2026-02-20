import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { tenants } from '../../../db/schema/index.js';
import Logger from '../../../utils/logger.js';
import { CreditService } from '../../credits/index.js';
import { stripe, isStripeConfiguredFn, getAvailablePlans } from './subscription-core.js';

/**
 * Create Stripe checkout session (subscription or credit purchase).
 */
export async function createCheckoutSession(params: {
  tenantId: string;
  planId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  billingCycle?: string;
  credits?: number;
}): Promise<string> {
  const { tenantId, planId, customerId, successUrl, cancelUrl, billingCycle = 'monthly', credits } = params;
  const startTime = Date.now();
  const requestId = Logger.generateRequestId('stripe-checkout');

  // Determine if this is a subscription checkout or credit purchase
  const isSubscriptionCheckout = !credits; // If credits is not provided, it's a subscription
  const checkoutType = isSubscriptionCheckout ? 'SUBSCRIPTION CHECKOUT' : 'CREDIT PURCHASE CHECKOUT';

  Logger.billing.start(requestId, checkoutType, {
    tenantId,
    planId,
    customerId,
    billingCycle,
    credits,
    isSubscriptionCheckout,
    stripeConfigured: isStripeConfiguredFn(),
    environment: process.env.NODE_ENV
  });

  let selectedPlan: Record<string, unknown> | undefined;
  let totalAmount: number = 0;
  const currency = 'USD';
  let mode: string;
  let lineItems: Array<Record<string, unknown>>;

  if (isSubscriptionCheckout) {
    // Handle subscription checkout
    const plans = await getAvailablePlans();
    selectedPlan = plans.find(p => p.id === planId);

    console.log('🔍 createCheckoutSession - Found subscription plan:', selectedPlan ? selectedPlan.name : 'NOT FOUND');

    if (!selectedPlan) {
      throw new Error('Invalid subscription plan selected');
    }

    // Use the plan's price based on billing cycle
    totalAmount = Number(selectedPlan.price) || 0; // Already in dollars for annual
    mode = 'subscription';

    // Get the appropriate Stripe price ID
    const priceId = billingCycle === 'yearly' ?
      selectedPlan.stripeYearlyPriceId :
      selectedPlan.stripePriceId;

    if (!priceId) {
      throw new Error(`Stripe price ID not configured for ${planId} plan (${billingCycle})`);
    }

    lineItems = [{
      price: priceId,
      quantity: 1,
    }];

    console.log('🔍 createCheckoutSession - Subscription plan details:', {
      planId: selectedPlan.id,
      name: selectedPlan.name,
      price: totalAmount,
      billingCycle,
      priceId,
      currency
    });

  } else {
    // Handle credit purchase checkout - simplified to direct amount
    const packages = await CreditService.getAvailablePackages();
    selectedPlan = packages.find(p => p.id === planId);

    console.log('🔍 createCheckoutSession - Found credit package:', selectedPlan ? selectedPlan.name : 'NOT FOUND');

    if (!selectedPlan) {
      throw new Error('Invalid credit package selected');
    }

    // credits parameter now represents the dollar amount directly
    totalAmount = credits!; // Direct dollar amount, no credit calculations
    mode = 'payment';

    lineItems = [{
      price_data: {
        currency: (selectedPlan as Record<string, unknown>).currency ? String((selectedPlan as Record<string, unknown>).currency).toLowerCase() : 'usd',
        product_data: {
          name: `$${totalAmount.toFixed(2)} Credit Purchase`,
          description: `Purchase credits worth $${totalAmount.toFixed(2)}`
        },
        unit_amount: Math.round(totalAmount * 100) // Convert dollars to cents
      },
      quantity: 1,
    }];

    console.log('🔍 createCheckoutSession - Credit purchase details:', {
      packageId: selectedPlan.id,
      dollarAmount: totalAmount,
      currency: selectedPlan.currency
    });
  }

  // Check if we should use mock mode
  const isMockMode = !isStripeConfiguredFn();

  if (isMockMode) {
    console.log(`🧪 createCheckoutSession - Using mock mode for ${isSubscriptionCheckout ? 'subscription' : 'credit purchase'}`);
    const mockSessionId = `mock_${isSubscriptionCheckout ? 'subscription' : 'credit'}_session_${Date.now()}`;
    const mockCheckoutUrl = `${successUrl}?session_id=${mockSessionId}&mock=true&planId=${planId}${isSubscriptionCheckout ? `&billingCycle=${billingCycle}` : `&credits=${credits}`}`;
    console.log(`✅ createCheckoutSession - Mock ${checkoutType.toLowerCase()} success! URL:`, mockCheckoutUrl);

    if (!isSubscriptionCheckout) {
      // Simulate successful credit purchase
      setTimeout(async () => {
        try {
          console.log('🧪 Processing mock credit purchase completion...');
          // For mock purchase, estimate credits based on amount ($1 = 1000 credits)
          const estimatedCredits = Math.floor(totalAmount * 1000);
          await CreditService.purchaseCredits({
            tenantId,
            userId: 'mock-user', // This should be passed from the request
            creditAmount: estimatedCredits,
            paymentMethod: 'stripe',
            currency: String((selectedPlan as Record<string, unknown>).currency ?? 'USD'),
            notes: `Mock purchase of $${totalAmount.toFixed(2)} worth of credits (${estimatedCredits} credits)`
          });
          console.log('✅ Mock credit purchase processed successfully');
        } catch (err: unknown) {
          const error = err as Error;
          console.error('❌ Mock credit purchase processing error:', error);
        }
      }, 2000); // 2 second delay to simulate processing
    }

    return mockCheckoutUrl;
  }

  console.log(`🔍 createCheckoutSession - Creating ${isSubscriptionCheckout ? 'subscription' : 'credit purchase'} session config...`);

  const sessionConfig = {
    mode: mode,
    payment_method_types: ['card'],
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenantId,
      planId: planId,
      ...(isSubscriptionCheckout ? {
        billingCycle: billingCycle,
        packageId: planId, // For backward compatibility
      } : {
        packageId: planId,
        dollarAmount: String(credits ?? 0),
        totalAmount: String(totalAmount)
      })
    },
  };

  // Add customer if provided, otherwise Stripe will create one automatically
  const sessionConfigAny = sessionConfig as Record<string, unknown>;
  if (customerId) {
    sessionConfigAny.customer = customerId;
    console.log('🔍 createCheckoutSession - Using existing customer:', customerId);
  } else {
    // For payment mode, don't use customer_creation parameter
    // Stripe will automatically create a customer during the checkout process
    console.log('🔍 createCheckoutSession - Stripe will create new customer automatically');
  }

  Logger.billing.stripe.request(requestId, 'POST', '/checkout/sessions', sessionConfig);

  try {
    if (!stripe) throw new Error('Stripe not configured');
    const session = await stripe.checkout.sessions.create(sessionConfig as any);

    Logger.billing.stripe.response(requestId, 'success', {
      sessionId: session.id,
      url: session.url,
      mode: session.mode,
      status: session.status
    });

    Logger.billing.success(requestId, checkoutType, startTime, {
      sessionId: session.id,
      checkoutUrl: session.url
    });

    return session.url ?? '';
  } catch (err: unknown) {
    const stripeError = err as Error & { code?: string };
    Logger.billing.stripe.error(requestId, stripeError);
    const message = stripeError?.message || String(stripeError);
    console.error(`❌ Stripe checkout failed (${checkoutType}):`, message);
    if (stripeError?.code) console.error('   Stripe code:', stripeError.code);

    // Dev fallback when price ID doesn't exist in this Stripe account (wrong account or price not created yet)
    const isMissingPrice = stripeError?.code === 'resource_missing' || /no such price/i.test(message);
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (isMissingPrice && isDev && isSubscriptionCheckout) {
      const mockSessionId = `mock_subscription_session_${Date.now()}`;
      const mockCheckoutUrl = `${successUrl.replace('{CHECKOUT_SESSION_ID}', mockSessionId)}&mock=true&planId=${planId}&billingCycle=${billingCycle}`;
      console.warn('⚠️ Price ID not found in Stripe – using mock checkout. Create the price in your Stripe Dashboard (same account as STRIPE_SECRET_KEY) and set STRIPE_*_YEARLY_PRICE_ID in .env for real payments.');
      return mockCheckoutUrl as string;
    }

    throw stripeError;
  }
}

/**
 * Handle mock checkout completion for development/testing.
 */
export async function handleMockCheckoutCompleted(params: { tenantId: string; planId: string; billingCycle: string; sessionId: string }): Promise<void> {
  const { tenantId, planId } = params;
  try {
    console.log('🧪 Processing mock credit purchase completion for tenant:', tenantId);

    const packages = await CreditService.getAvailablePackages();
    const selectedPackage = packages.find((p: Record<string, unknown>) => p.id === planId) as Record<string, unknown> | undefined;

    if (!selectedPackage) {
      throw new Error(`Invalid package ID: ${planId}`);
    }

    // Process credit purchase
    await CreditService.purchaseCredits({
      tenantId,
      userId: 'mock-user', // Should be passed from request context
      creditAmount: Number(selectedPackage.credits) || 0,
      paymentMethod: 'stripe',
      currency: String(selectedPackage.currency || 'USD'),
      notes: `Mock purchase of ${String(selectedPackage.name || 'package')} package`
    });

    console.log('✅ Mock credit purchase processed successfully for tenant:', tenantId);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Error processing mock credit purchase:', error);
    throw error;
  }
}

/**
 * Create a Stripe Billing Portal session for plan changes.
 * Plan upgrades must go through Stripe (portal or checkout) so payment is confirmed before we update.
 */
export async function createBillingPortalSession(tenantId: string, returnUrl?: string): Promise<string | null> {
  if (!isStripeConfiguredFn() || !stripe) {
    throw new Error('Stripe is not configured; cannot create billing portal session.');
  }
  const [tenant] = await db
    .select({ stripeCustomerId: tenants.stripeCustomerId })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);
  const customerId = tenant?.stripeCustomerId;
  if (!customerId) {
    throw new Error('No Stripe customer linked to this organization. Please subscribe via checkout first.');
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${process.env.FRONTEND_URL || ''}/billing`
  });
  console.log('🔗 Billing portal session created for tenant:', tenantId);
  return session.url ?? null;
}
