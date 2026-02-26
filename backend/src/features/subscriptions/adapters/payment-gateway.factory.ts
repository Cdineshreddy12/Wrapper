/**
 * Payment Gateway Factory
 *
 * Singleton factory that produces the correct PaymentGatewayPort implementation
 * based on the PAYMENT_GATEWAY_PROVIDER env variable (defaults to 'stripe').
 *
 * Usage:
 *   import { getPaymentGateway } from './adapters/index.js';
 *   const gw = getPaymentGateway();
 *   const { url } = await gw.createCheckoutSession({ ... });
 *
 * Adding a new provider:
 *   1. Create `razorpay.adapter.ts` implementing PaymentGatewayPort
 *   2. Import it below and add a case to the switch
 *   3. Set PAYMENT_GATEWAY_PROVIDER=razorpay in .env
 */

import type { PaymentGatewayProvider } from './types.js';
import type { PaymentGatewayPort } from './payment-gateway.port.js';
import { StripePaymentGateway } from './stripe.adapter.js';
import { MockPaymentGateway } from './mock.adapter.js';

let instance: PaymentGatewayPort | null = null;

function resolveProvider(): PaymentGatewayProvider {
  const env = (process.env.PAYMENT_GATEWAY_PROVIDER ?? 'stripe').toLowerCase();
  const valid: PaymentGatewayProvider[] = ['stripe', 'razorpay', 'paypal', 'mock'];
  if (valid.includes(env as PaymentGatewayProvider)) {
    return env as PaymentGatewayProvider;
  }
  console.warn(`⚠️ Unknown PAYMENT_GATEWAY_PROVIDER "${env}" — falling back to stripe`);
  return 'stripe';
}

function createGateway(provider: PaymentGatewayProvider): PaymentGatewayPort {
  switch (provider) {
    case 'stripe': {
      const gw = new StripePaymentGateway();
      if (!gw.isConfigured()) {
        console.warn('⚠️ Stripe adapter not configured — falling back to mock gateway');
        return new MockPaymentGateway();
      }
      return gw;
    }

    // ---------------------------------------------------------------
    // Future providers — uncomment and implement as needed:
    //
    // case 'razorpay':
    //   return new RazorpayPaymentGateway();
    //
    // case 'paypal':
    //   return new PayPalPaymentGateway();
    // ---------------------------------------------------------------

    case 'mock':
      return new MockPaymentGateway();

    default:
      console.warn(`⚠️ Provider "${provider}" not yet implemented — using mock gateway`);
      return new MockPaymentGateway();
  }
}

/**
 * Returns the singleton PaymentGatewayPort instance.
 * First call lazily creates the appropriate adapter.
 */
export function getPaymentGateway(): PaymentGatewayPort {
  if (!instance) {
    const provider = resolveProvider();
    instance = createGateway(provider);
    console.log(`✅ Payment gateway initialised: ${instance.providerName}`);
  }
  return instance;
}

/**
 * Replaces the singleton (useful for tests).
 */
export function setPaymentGateway(gw: PaymentGatewayPort): void {
  instance = gw;
}

/**
 * Resets the singleton so the next call to getPaymentGateway() re-initialises.
 */
export function resetPaymentGateway(): void {
  instance = null;
}
