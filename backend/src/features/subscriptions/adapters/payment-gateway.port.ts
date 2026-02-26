/**
 * Payment Gateway Port (Interface)
 *
 * Defines the contract that every payment gateway adapter must satisfy.
 * Services program against this port — never against a concrete provider.
 *
 * To add a new gateway (e.g. Razorpay, PayPal):
 *   1. Create `razorpay.adapter.ts` implementing `PaymentGatewayPort`
 *   2. Register it in `PaymentGatewayFactory`
 *   3. Set PAYMENT_GATEWAY_PROVIDER=razorpay in your .env
 */

import type {
  PaymentGatewayProvider,
  CreateCheckoutParams,
  CheckoutResult,
  BillingPortalParams,
  NormalizedWebhookEvent,
  CreateRefundParams,
  RefundResult,
  GatewaySubscription,
  UpdateSubscriptionParams,
  CancelSubscriptionParams,
  GatewayCustomer,
  GatewayCheckoutSession,
  GatewayInvoice,
  GatewayConfigStatus,
} from './types.js';

export interface PaymentGatewayPort {
  // -----------------------------------------------------------------------
  // Identity
  // -----------------------------------------------------------------------

  /** Human-readable provider name. */
  readonly providerName: PaymentGatewayProvider;

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  /** Whether the gateway is properly configured and ready for use. */
  isConfigured(): boolean;

  /** Detailed configuration status for diagnostics. */
  getConfigStatus(): GatewayConfigStatus;

  // -----------------------------------------------------------------------
  // Checkout
  // -----------------------------------------------------------------------

  /** Create a hosted checkout session and return the redirect URL. */
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult>;

  /** Create a billing portal session for the customer to self-manage. */
  createBillingPortalSession(params: BillingPortalParams): Promise<string | null>;

  // -----------------------------------------------------------------------
  // Webhooks
  // -----------------------------------------------------------------------

  /**
   * Verify the webhook signature and return a normalized event.
   * Throws if the signature is invalid.
   */
  verifyWebhook(
    rawBody: Buffer | string,
    signature: string,
    secret: string,
  ): Promise<NormalizedWebhookEvent>;

  // -----------------------------------------------------------------------
  // Refunds
  // -----------------------------------------------------------------------

  /** Issue a refund (full or partial). */
  createRefund(params: CreateRefundParams): Promise<RefundResult>;

  // -----------------------------------------------------------------------
  // Subscription Management
  // -----------------------------------------------------------------------

  /** Retrieve subscription details by provider subscription ID. */
  retrieveSubscription(subscriptionId: string): Promise<GatewaySubscription>;

  /** Update an existing subscription (e.g. change plan). */
  updateSubscription(subscriptionId: string, params: UpdateSubscriptionParams): Promise<GatewaySubscription>;

  /** Cancel a subscription. */
  cancelSubscription(subscriptionId: string, params?: CancelSubscriptionParams): Promise<void>;

  // -----------------------------------------------------------------------
  // Customer
  // -----------------------------------------------------------------------

  /** Retrieve customer details by provider customer ID. */
  retrieveCustomer(customerId: string): Promise<GatewayCustomer>;

  // -----------------------------------------------------------------------
  // Session / Invoice retrieval
  // -----------------------------------------------------------------------

  /** Retrieve a checkout session (optionally with expanded objects). */
  retrieveCheckoutSession(sessionId: string, expand?: string[]): Promise<GatewayCheckoutSession>;

  /** Retrieve an invoice by provider invoice ID. */
  retrieveInvoice(invoiceId: string): Promise<GatewayInvoice>;
}
