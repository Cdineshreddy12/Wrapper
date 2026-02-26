/**
 * Payment Gateway Adapter — Shared Types
 *
 * Gateway-agnostic type definitions used by all adapter implementations
 * and the consuming service layer. No provider-specific types leak here.
 */

// ---------------------------------------------------------------------------
// Provider identification
// ---------------------------------------------------------------------------

export type PaymentGatewayProvider = 'stripe' | 'razorpay' | 'paypal' | 'mock';

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface CheckoutLineItem {
  priceId?: string;
  priceData?: {
    currency: string;
    unitAmount: number;
    productData: {
      name: string;
      description?: string;
    };
  };
  quantity: number;
}

export interface CreateCheckoutParams {
  mode: 'subscription' | 'payment';
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
  requireBillingAddress?: boolean;
  collectPhoneNumber?: boolean;
  collectTaxId?: boolean;
}

export interface CheckoutResult {
  sessionId: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Billing Portal
// ---------------------------------------------------------------------------

export interface BillingPortalParams {
  customerId: string;
  returnUrl: string;
}

// ---------------------------------------------------------------------------
// Webhook — Normalized
// ---------------------------------------------------------------------------

export type NormalizedEventType =
  | 'checkout.completed'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.deleted'
  | 'charge.succeeded'
  | 'charge.disputed'
  | 'refund.created'
  | 'invoice.payment_paid'
  | 'unknown';

export interface NormalizedWebhookEvent {
  id: string;
  type: NormalizedEventType;
  data: Record<string, unknown>;
  rawEvent: unknown;
  provider: PaymentGatewayProvider;
}

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------

export interface CreateRefundParams {
  paymentIntentId?: string;
  chargeId?: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, string>;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  currency: string;
  status: string;
  paymentIntentId?: string;
  chargeId?: string;
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export interface GatewaySubscriptionItem {
  id: string;
  priceId: string;
}

export interface GatewaySubscription {
  id: string;
  customerId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  items: GatewaySubscriptionItem[];
  metadata?: Record<string, string>;
}

export interface UpdateSubscriptionParams {
  items?: Array<{ id: string; priceId: string }>;
  prorationBehavior?: 'always_invoice' | 'create_prorations' | 'none';
  cancelAtPeriodEnd?: boolean;
}

export interface CancelSubscriptionParams {
  prorate?: boolean;
  invoiceNow?: boolean;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export interface GatewayCustomer {
  id: string;
  email: string | null;
  name?: string | null;
  metadata?: Record<string, string>;
  deleted?: boolean;
}

// ---------------------------------------------------------------------------
// Checkout Session (retrieval)
// ---------------------------------------------------------------------------

export interface GatewayCheckoutSession {
  id: string;
  mode: string;
  paymentStatus: string;
  status: string;
  amountTotal: number;
  currency: string;
  customerId?: string;
  subscriptionId?: string;
  paymentIntentId?: string;
  metadata: Record<string, string>;
  url?: string;
  created: number;
  subscription?: GatewaySubscription;
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export interface GatewayInvoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  paymentIntentId?: string;
  chargeId?: string;
  billingReason?: string;
  invoiceNumber?: string;
  tax?: number;
  periodStart?: number;
  periodEnd?: number;
  attemptCount?: number;
  nextPaymentAttempt?: number;
  paidAt?: number;
  lineItems: Array<{ priceId?: string }>;
  paymentMethodTypes?: string[];
  lastFinalizationError?: { message?: string; code?: string };
  rawData: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Configuration status
// ---------------------------------------------------------------------------

export interface GatewayConfigStatus {
  isConfigured: boolean;
  provider: PaymentGatewayProvider;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  environment: string;
  details?: Record<string, unknown>;
}
