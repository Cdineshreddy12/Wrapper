/**
 * Unit tests for StripePaymentGateway adapter.
 *
 * No real Stripe API calls or database connections are made.
 * Stripe SDK is NOT mocked — we test the adapter's own logic against its
 * public interface by controlling env vars and using dev-mode bypass.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StripePaymentGateway } from './stripe.adapter.js';

// ── Env helpers ───────────────────────────────────────────────────────────

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ── isConfigured ──────────────────────────────────────────────────────────

describe('StripePaymentGateway – isConfigured', () => {
  it('returns false when STRIPE_SECRET_KEY is not set', () => {
    withEnv({ STRIPE_SECRET_KEY: undefined }, () => {
      const gw = new StripePaymentGateway();
      expect(gw.isConfigured()).toBe(false);
    });
  });

  it('returns true when STRIPE_SECRET_KEY is set', () => {
    withEnv({ STRIPE_SECRET_KEY: 'sk_test_fake_key_for_testing' }, () => {
      const gw = new StripePaymentGateway();
      expect(gw.isConfigured()).toBe(true);
    });
  });
});

// ── getConfigStatus ───────────────────────────────────────────────────────

describe('StripePaymentGateway – getConfigStatus', () => {
  it('reports isConfigured=false and hasSecretKey=false when not configured', () => {
    withEnv({ STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined }, () => {
      const gw = new StripePaymentGateway();
      const status = gw.getConfigStatus();

      expect(status.isConfigured).toBe(false);
      expect(status.provider).toBe('stripe');
      expect(status.hasSecretKey).toBe(false);
      expect(status.hasWebhookSecret).toBe(false);
    });
  });

  it('reports isConfigured=true and hasSecretKey=true when key is set', () => {
    withEnv({ STRIPE_SECRET_KEY: 'sk_test_abc', STRIPE_WEBHOOK_SECRET: 'whsec_xyz' }, () => {
      const gw = new StripePaymentGateway();
      const status = gw.getConfigStatus();

      expect(status.isConfigured).toBe(true);
      expect(status.hasSecretKey).toBe(true);
      expect(status.hasWebhookSecret).toBe(true);
    });
  });

  it('returns correct environment in getConfigStatus', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    withEnv({ STRIPE_SECRET_KEY: undefined }, () => {
      const gw = new StripePaymentGateway();
      const status = gw.getConfigStatus();
      expect(status.environment).toBe('production');
    });

    process.env.NODE_ENV = original;
  });

  it('details.secretKeyPrefix shows "not set" when key is absent', () => {
    withEnv({ STRIPE_SECRET_KEY: undefined }, () => {
      const gw = new StripePaymentGateway();
      const status = gw.getConfigStatus();
      expect((status.details as Record<string, unknown>).secretKeyPrefix).toBe('not set');
    });
  });

  it('details.secretKeyPrefix shows key prefix when key is present', () => {
    withEnv({ STRIPE_SECRET_KEY: 'sk_test_abcdefghij' }, () => {
      const gw = new StripePaymentGateway();
      const status = gw.getConfigStatus();
      expect((status.details as Record<string, unknown>).secretKeyPrefix).toBe('sk_test_ab');
    });
  });
});

// ── providerName ──────────────────────────────────────────────────────────

describe('StripePaymentGateway – providerName', () => {
  it('always reports "stripe" as providerName', () => {
    withEnv({ STRIPE_SECRET_KEY: undefined }, () => {
      const gw = new StripePaymentGateway();
      expect(gw.providerName).toBe('stripe');
    });
  });
});

// ── getRawClient ──────────────────────────────────────────────────────────

describe('StripePaymentGateway – getRawClient', () => {
  it('returns null when not configured', () => {
    withEnv({ STRIPE_SECRET_KEY: undefined }, () => {
      const gw = new StripePaymentGateway();
      expect(gw.getRawClient()).toBeNull();
    });
  });

  it('returns a Stripe instance when configured', () => {
    withEnv({ STRIPE_SECRET_KEY: 'sk_test_abc' }, () => {
      const gw = new StripePaymentGateway();
      expect(gw.getRawClient()).not.toBeNull();
    });
  });
});

// ── Methods throw when not configured ─────────────────────────────────────

describe('StripePaymentGateway – throws when not configured', () => {
  let gw: StripePaymentGateway;

  beforeEach(() => {
    withEnv({ STRIPE_SECRET_KEY: undefined }, () => {
      gw = new StripePaymentGateway();
    });
  });

  it('createCheckoutSession throws "Stripe is not configured"', async () => {
    await expect(
      gw.createCheckoutSession({
        mode: 'subscription',
        lineItems: [],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }),
    ).rejects.toThrow('Stripe is not configured');
  });

  it('createBillingPortalSession throws "Stripe is not configured"', async () => {
    await expect(
      gw.createBillingPortalSession({ customerId: 'cus_test', returnUrl: 'https://example.com' }),
    ).rejects.toThrow('Stripe is not configured');
  });

  it('createRefund throws "Stripe is not configured"', async () => {
    await expect(
      gw.createRefund({ amount: 1000, paymentIntentId: 'pi_test' }),
    ).rejects.toThrow('Stripe is not configured');
  });

  it('retrieveSubscription throws "Stripe is not configured"', async () => {
    await expect(gw.retrieveSubscription('sub_test')).rejects.toThrow('Stripe is not configured');
  });

  it('retrieveCustomer throws "Stripe is not configured"', async () => {
    await expect(gw.retrieveCustomer('cus_test')).rejects.toThrow('Stripe is not configured');
  });
});

// ── verifyWebhook in dev bypass mode ─────────────────────────────────────

describe('StripePaymentGateway – verifyWebhook (dev bypass)', () => {
  let gw: StripePaymentGateway;
  let originalEnv: string | undefined;
  let originalNodeEnv: NodeJS.ProcessEnv['NODE_ENV'];

  beforeEach(() => {
    originalEnv = process.env.BYPASS_WEBHOOK_SIGNATURE;
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    process.env.BYPASS_WEBHOOK_SIGNATURE = 'true';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dev_bypass';
    gw = new StripePaymentGateway();
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.BYPASS_WEBHOOK_SIGNATURE;
    else process.env.BYPASS_WEBHOOK_SIGNATURE = originalEnv;

    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    delete process.env.STRIPE_SECRET_KEY;
  });

  it('normalises checkout.session.completed to "checkout.completed"', async () => {
    const payload = JSON.stringify({
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', mode: 'subscription' } },
    });

    const event = await gw.verifyWebhook(payload, 'ignored-sig', 'ignored-secret');

    expect(event.type).toBe('checkout.completed');
    expect(event.provider).toBe('stripe');
    expect(event.id).toBe('evt_test_1');
  });

  it('normalises invoice.paid to "payment.succeeded"', async () => {
    const payload = JSON.stringify({
      id: 'evt_test_2',
      type: 'invoice.paid',
      data: { object: { id: 'in_test_1' } },
    });

    const event = await gw.verifyWebhook(payload, '', '');

    expect(event.type).toBe('payment.succeeded');
  });

  it('normalises customer.subscription.created to "subscription.created"', async () => {
    const payload = JSON.stringify({
      type: 'customer.subscription.created',
      data: { object: { id: 'sub_test_1' } },
    });

    const event = await gw.verifyWebhook(payload, '', '');

    expect(event.type).toBe('subscription.created');
  });

  it('normalises customer.subscription.updated to "subscription.updated"', async () => {
    const payload = JSON.stringify({
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_test_2' } },
    });

    const event = await gw.verifyWebhook(payload, '', '');

    expect(event.type).toBe('subscription.updated');
  });

  it('normalises customer.subscription.deleted to "subscription.deleted"', async () => {
    const payload = JSON.stringify({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_test_3' } },
    });

    const event = await gw.verifyWebhook(payload, '', '');

    expect(event.type).toBe('subscription.deleted');
  });

  it('normalises invoice.payment_failed to "payment.failed"', async () => {
    const payload = JSON.stringify({
      type: 'invoice.payment_failed',
      data: { object: { id: 'in_test_2' } },
    });

    const event = await gw.verifyWebhook(payload, '', '');

    expect(event.type).toBe('payment.failed');
  });

  it('normalises charge.dispute.created to "charge.disputed"', async () => {
    const payload = JSON.stringify({
      type: 'charge.dispute.created',
      data: { object: { id: 'dp_test_1' } },
    });

    const event = await gw.verifyWebhook(payload, '', '');

    expect(event.type).toBe('charge.disputed');
  });

  it('returns "unknown" for unrecognised event types', async () => {
    const payload = JSON.stringify({
      type: 'some.unknown.stripe.event',
      data: { object: {} },
    });

    const event = await gw.verifyWebhook(payload, '', '');

    expect(event.type).toBe('unknown');
  });

  it('auto-detects checkout.session.completed from object type when event.type is absent', async () => {
    const payload = JSON.stringify({
      // No top-level "type" field
      object: 'checkout.session',
      id: 'cs_autodetect',
    });

    const event = await gw.verifyWebhook(payload, '', '');

    expect(event.type).toBe('checkout.completed');
  });

  it('uses dev_{timestamp} as id when no id is present in payload', async () => {
    const payload = JSON.stringify({
      type: 'invoice.paid',
      data: { object: {} },
    });

    const event = await gw.verifyWebhook(payload, '', '');

    expect(event.id).toMatch(/^dev_/);
  });

  it('returns event.data as the object from data.object', async () => {
    const obj = { id: 'cs_data_test', amount_total: 5000, currency: 'usd' };
    const payload = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: obj },
    });

    const event = await gw.verifyWebhook(payload, '', '');

    expect(event.data).toMatchObject({ id: 'cs_data_test', amount_total: 5000 });
  });
});
