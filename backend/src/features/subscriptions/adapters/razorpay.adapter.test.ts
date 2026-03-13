/**
 * RazorpayPaymentGateway — unit tests
 *
 * Critical security coverage:
 *  - verifyWebhook accepts valid HMAC-SHA256, throws on invalid/empty signature
 *  - Razorpay event names map correctly to NormalizedEventType
 *  - isConfigured, getConfigStatus, createBillingPortalSession
 *
 * The Razorpay SDK is mocked so no real API calls are made.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Mock the Razorpay SDK — must come before any adapter import
// ---------------------------------------------------------------------------
const { razorpayClientMock } = vi.hoisted(() => ({
  razorpayClientMock: {
    orders: {
      create: vi.fn(async () => ({ id: 'order_test', amount: 50000, currency: 'INR' })),
      fetch:  vi.fn(async () => ({ id: 'order_test', amount: 50000, currency: 'INR', status: 'created', notes: {} })),
    },
    subscriptions: {
      create: vi.fn(async () => ({ id: 'sub_test', short_url: '' })),
      fetch:  vi.fn(async () => ({ id: 'sub_test', status: 'active', current_start: 0, current_end: 0, plan_id: 'plan_1' })),
      cancel: vi.fn(async () => undefined),
    },
    payments: {
      refund: vi.fn(async () => ({ id: 'rfnd_test', amount: 1000, currency: 'INR', status: 'processed' })),
    },
    customers: {
      fetch: vi.fn(async () => ({ id: 'cust_test', email: 'a@b.com', name: 'Test', notes: {} })),
    },
  },
}));

vi.mock('razorpay', () => ({
  default: vi.fn(() => razorpayClientMock),
}));

import { RazorpayPaymentGateway } from './razorpay.adapter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = 'test-webhook-secret-32chars-long!!';

/**
 * Builds a correctly signed Razorpay webhook payload.
 *
 * Razorpay payload shape:
 *   { event, account_id, payload: { <entityType>: { entity: { ... } } } }
 */
function buildWebhook(
  event: string,
  entityType: 'payment' | 'order' | 'subscription' | 'refund',
  entity: Record<string, unknown>,
  secret = WEBHOOK_SECRET,
): { body: Buffer; sig: string } {
  const raw = JSON.stringify({
    event,
    account_id: 'acc_test123',
    payload: { [entityType]: { entity } },
  });
  const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return { body: Buffer.from(raw), sig };
}

// ---------------------------------------------------------------------------
describe('RazorpayPaymentGateway', () => {
  let gw: RazorpayPaymentGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    // Start each test without env vars so isConfigured() starts as false
    vi.stubEnv('RAZORPAY_KEY_ID', '');
    vi.stubEnv('RAZORPAY_KEY_SECRET', '');
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', '');
    gw = new RazorpayPaymentGateway();
  });

  // -------------------------------------------------------------------------
  describe('isConfigured', () => {
    it('returns false when env vars are absent', () => {
      expect(gw.isConfigured()).toBe(false);
    });

    it('returns true when both key_id and key_secret are present', () => {
      vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_key123');
      vi.stubEnv('RAZORPAY_KEY_SECRET', 'super_secret');
      const configured = new RazorpayPaymentGateway();
      expect(configured.isConfigured()).toBe(true);
    });

    it('returns false when only key_id is set (secret missing)', () => {
      vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_key123');
      vi.stubEnv('RAZORPAY_KEY_SECRET', '');
      const half = new RazorpayPaymentGateway();
      expect(half.isConfigured()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('getConfigStatus', () => {
    it('reports test environment for rzp_test_ prefix', () => {
      vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_abc123');
      vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret');
      const g = new RazorpayPaymentGateway();
      expect(g.getConfigStatus().environment).toBe('test');
    });

    it('reports production environment for rzp_live_ prefix', () => {
      vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_abc123');
      vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret');
      const g = new RazorpayPaymentGateway();
      expect(g.getConfigStatus().environment).toBe('production');
    });

    it('includes provider=razorpay', () => {
      expect(gw.getConfigStatus().provider).toBe('razorpay');
    });
  });

  // -------------------------------------------------------------------------
  describe('verifyWebhook — signature verification (security-critical)', () => {
    it('accepts a correctly signed payload and returns a NormalizedWebhookEvent', async () => {
      const entity = { id: 'pay_abc123', amount: 50000, currency: 'INR', notes: { tenantId: 'tenant-1' } };
      const { body, sig } = buildWebhook('payment.captured', 'payment', entity);

      const result = await gw.verifyWebhook(body, sig, WEBHOOK_SECRET);

      expect(result.provider).toBe('razorpay');
      expect(result.type).toBe('payment.succeeded');
      expect((result.data as Record<string, unknown>).id).toBe('pay_abc123');
      expect(result.rawEvent).toBeDefined();
    });

    it('throws when signature does not match (tampered body)', async () => {
      const { body } = buildWebhook('payment.captured', 'payment', { id: 'pay_x', amount: 100 });

      await expect(
        gw.verifyWebhook(body, 'completely-wrong-signature', WEBHOOK_SECRET),
      ).rejects.toThrow('signature verification failed');
    });

    it('throws when signature is an empty string', async () => {
      const { body } = buildWebhook('order.paid', 'order', { id: 'order_1' });

      await expect(
        gw.verifyWebhook(body, '', WEBHOOK_SECRET),
      ).rejects.toThrow();
    });

    it('throws when secret is wrong even if signature format looks valid', async () => {
      const { body } = buildWebhook('payment.captured', 'payment', { id: 'pay_y' });
      // Sign with a different secret
      const wrongSig = crypto.createHmac('sha256', 'wrong-secret').update(body).digest('hex');

      await expect(
        gw.verifyWebhook(body, wrongSig, WEBHOOK_SECRET),
      ).rejects.toThrow('signature verification failed');
    });

    it('accepts a string body (not only Buffer)', async () => {
      const entity = { id: 'pay_str', amount: 10000, currency: 'INR' };
      const raw = JSON.stringify({ event: 'payment.captured', account_id: 'acc', payload: { payment: { entity } } });
      const sig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');

      const result = await gw.verifyWebhook(raw, sig, WEBHOOK_SECRET);
      expect(result.type).toBe('payment.succeeded');
    });
  });

  // -------------------------------------------------------------------------
  describe('verifyWebhook — event type mapping', () => {
    const cases: Array<[string, 'payment' | 'order' | 'subscription' | 'refund', string]> = [
      ['order.paid',             'order',        'checkout.completed'],
      ['payment.captured',       'payment',      'payment.succeeded'],
      ['payment.failed',         'payment',      'payment.failed'],
      ['subscription.activated', 'subscription', 'subscription.created'],
      ['subscription.updated',   'subscription', 'subscription.updated'],
      ['subscription.cancelled', 'subscription', 'subscription.deleted'],
      ['subscription.charged',   'subscription', 'invoice.payment_paid'],
      ['refund.created',         'refund',       'refund.created'],
      ['dispute.created',        'payment',      'charge.disputed'],
    ];

    it.each(cases)(
      'maps Razorpay "%s" → normalized "%s"',
      async (razorpayEvent, entityType, expectedNormalized) => {
        const entity = { id: 'ent_1', notes: {} };
        const { body, sig } = buildWebhook(razorpayEvent, entityType, entity);

        const result = await gw.verifyWebhook(body, sig, WEBHOOK_SECRET);
        expect(result.type).toBe(expectedNormalized);
      },
    );

    it('maps an unknown event → "unknown"', async () => {
      const entity = { id: 'x' };
      const raw = JSON.stringify({ event: 'some.completely.unknown.event', account_id: 'acc', payload: { payment: { entity } } });
      const sig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');

      const result = await gw.verifyWebhook(Buffer.from(raw), sig, WEBHOOK_SECRET);
      expect(result.type).toBe('unknown');
    });
  });

  // -------------------------------------------------------------------------
  describe('verifyWebhook — entity extraction from payload', () => {
    it('extracts entity from payment payload', async () => {
      const entity = { id: 'pay_deep', amount: 1500, method: 'upi', notes: { tenantId: 'tX' } };
      const { body, sig } = buildWebhook('payment.captured', 'payment', entity);

      const result = await gw.verifyWebhook(body, sig, WEBHOOK_SECRET);
      const data = result.data as Record<string, unknown>;
      expect(data.id).toBe('pay_deep');
      expect(data.method).toBe('upi');
    });

    it('extracts entity from order payload', async () => {
      const entity = { id: 'order_deep', amount: 9990, notes: { tenantId: 'tY', planId: 'plan_pro' } };
      const { body, sig } = buildWebhook('order.paid', 'order', entity);

      const result = await gw.verifyWebhook(body, sig, WEBHOOK_SECRET);
      const data = result.data as Record<string, unknown>;
      expect(data.id).toBe('order_deep');
      expect((data.notes as Record<string, unknown>).planId).toBe('plan_pro');
    });
  });

  // -------------------------------------------------------------------------
  describe('createBillingPortalSession', () => {
    it('returns null — Razorpay has no hosted billing portal', async () => {
      const result = await gw.createBillingPortalSession({
        customerId: 'cust_1',
        returnUrl: 'https://example.com/billing',
      });
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('providerName', () => {
    it('is "razorpay"', () => {
      expect(gw.providerName).toBe('razorpay');
    });
  });
});
