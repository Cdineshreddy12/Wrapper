# Subscriptions Feature

Provider-agnostic billing via the **Payment Gateway Adapter** pattern: plans, checkout, payments, trials, payment-profile/upgrade flows, billing portal, refunds, and usage/plan limits. The adapter layer lets you swap payment providers (Stripe, Razorpay, PayPal, …) by changing a single env variable.

## Directory Structure

```
subscriptions/
├── index.ts                                          # Feature + adapter barrel exports
├── adapters/                                         # ← Payment Gateway Adapter layer
│   ├── types.ts                                      # Gateway-agnostic shared types
│   ├── payment-gateway.port.ts                       # Interface (contract every provider implements)
│   ├── stripe.adapter.ts                             # Stripe concrete implementation
│   ├── mock.adapter.ts                               # Mock adapter for dev/testing
│   ├── payment-gateway.factory.ts                    # Factory + singleton management
│   └── index.ts                                      # Adapter barrel exports
├── routes/
│   ├── subscriptions.ts                              # Core subscription endpoints
│   ├── payments.ts                                   # Payment history, stats, webhooks
│   ├── payment-upgrade.ts                            # Profile completion and upgrade flows
│   ├── payment-profile-completion.ts                 # Profile requirements and payment
│   └── trial.ts                                      # Trial status and restrictions
└── services/
    ├── subscription-service.ts                       # Facade delegating to sub-services + gateway
    ├── subscription-core.ts                          # Gateway config, plan catalog, current sub
    ├── subscription-trial.ts                         # Trial/free creation, expiry, reminders
    ├── subscription-checkout.ts                      # Checkout session, billing portal (via adapter)
    ├── subscription-plan-change.ts                   # Plan change, downgrade scheduling (via adapter)
    ├── subscription-plan-roles.ts                    # Role/permission updates on plan change
    ├── subscription-payment-records.ts               # Payment records, refunds (via adapter)
    ├── subscription-webhook-handler.ts               # Webhook handling with normalised events (via adapter)
    └── payment-service.ts                            # Payment recording and statistics
```

## Payment Gateway Adapter

All payment-provider interactions go through a single `PaymentGatewayPort` interface. Services never call a provider SDK directly — they call the adapter returned by `getPaymentGateway()`.

### Switching providers

Set the `PAYMENT_GATEWAY_PROVIDER` env variable:

```bash
PAYMENT_GATEWAY_PROVIDER=stripe    # default — uses Stripe SDK
PAYMENT_GATEWAY_PROVIDER=razorpay  # future — add razorpay.adapter.ts
PAYMENT_GATEWAY_PROVIDER=paypal    # future — add paypal.adapter.ts
PAYMENT_GATEWAY_PROVIDER=mock      # dev/test — no real charges
```

If the configured provider's keys are missing, the factory automatically falls back to the mock adapter.

### Adding a new provider

1. Create `adapters/<provider>.adapter.ts` implementing `PaymentGatewayPort`
2. Register it in `adapters/payment-gateway.factory.ts` (add a `case` in the switch)
3. Set `PAYMENT_GATEWAY_PROVIDER=<provider>` in `.env`

No service-layer code changes required.

### Usage in services

```typescript
import { getPaymentGateway } from '../adapters/index.js';

const gw = getPaymentGateway();

// Checkout
const { url } = await gw.createCheckoutSession({ mode: 'subscription', lineItems, ... });

// Webhooks (normalised events — same shape regardless of provider)
const event = await gw.verifyWebhook(rawBody, signature, secret);
// event.type is e.g. 'checkout.completed', not 'checkout.session.completed'

// Refunds
await gw.createRefund({ paymentIntentId, amount: 500 });

// Subscription management
const sub = await gw.retrieveSubscription(subscriptionId);
await gw.cancelSubscription(subscriptionId, { prorate: true });
```

### Testing

```typescript
import { setPaymentGateway, MockPaymentGateway } from '../adapters/index.js';

// Inject mock for unit tests
setPaymentGateway(new MockPaymentGateway());
```

### Normalised webhook events

The adapter maps provider-specific event names to a common set:

| Normalised type          | Stripe original                   |
|--------------------------|-----------------------------------|
| `checkout.completed`     | `checkout.session.completed`      |
| `payment.succeeded`      | `invoice.paid` / `invoice.payment_succeeded` |
| `payment.failed`         | `invoice.payment_failed`          |
| `subscription.created`   | `customer.subscription.created`   |
| `subscription.updated`   | `customer.subscription.updated`   |
| `subscription.deleted`   | `customer.subscription.deleted`   |
| `charge.succeeded`       | `charge.succeeded`                |
| `charge.disputed`        | `charge.dispute.created`          |
| `refund.created`         | `refund.created`                  |
| `invoice.payment_paid`   | `invoice_payment.paid`            |

## Endpoints

### Subscriptions (`/api/subscriptions`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/debug-auth` | Debug auth (dev) |
| GET | `/current` | Current subscription for tenant |
| GET | `/plans` | Available subscription plans |
| GET | `/credit-packages` | Available credit packages |
| GET | `/config-status` | Stripe/config status (debug) |
| GET | `/plan-limits` | Plan limits and usage for tenant |
| GET | `/usage` | Subscription usage metrics |
| GET | `/billing-history` | Billing history for tenant |
| GET | `/upcoming-invoice` | Upcoming invoice |
| GET | `/invoice/:invoiceId/download` | Download invoice PDF |
| GET | `/payment/:identifier` | Payment details by ID |
| GET | `/actions` | Subscription actions history |
| GET | `/debug-stripe-config` | Stripe config status (debug) |
| POST | `/checkout` | Create Stripe checkout session |
| POST | `/cancel` | Cancel subscription |
| POST | `/change-plan` | Change subscription plan |
| POST | `/portal` | Create Stripe Customer Portal session |
| POST | `/payment-method` | Set default payment method |
| POST | `/reactivate` | Reactivate cancelled subscription |
| POST | `/coupon` | Apply coupon code |
| POST | `/refund` | Process refund |
| POST | `/webhook` | Stripe webhook handler (signature verified) |
| POST | `/test-webhook` | Test webhook (no verification) |
| POST | `/cleanup-duplicate-payments` | Remove duplicate payment records |
| POST | `/toggle-trial-restrictions` | Toggle trial restrictions (deprecated) |

### Payments (`/api/payments`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/history` | Payment history for tenant |
| GET | `/stats` | Payment statistics |
| GET | `/methods` | Payment methods for tenant |
| GET | `/analytics` | Payment analytics (revenue, growth) |
| POST | `/webhook/stripe` | Stripe webhook (payment intents, invoices, subscriptions) |

### Payment Upgrade (`/api/payment-upgrade`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile-status` | Whether tenant profile is complete for upgrade |
| GET | `/upgrade-options` | Current plan and available upgrades |
| POST | `/complete-profile` | Complete tenant profile for billing |
| POST | `/purchase-credits` | Purchase credits with optional profile completion |

### Payment Profile Completion

| Method | Path | Description |
|--------|------|-------------|
| GET | `/onboarding/profile-requirements/:tenantId` | Profile completion requirements and progress |
| POST | `/onboarding/complete-profile-with-payment` | Complete profile and process payment |
| PUT | `/onboarding/update-profile/:tenantId` | Update tenant profile after completion |

### Trial (`/api/trial`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Trial status, expiry, restrictions, upgrade URL |
| GET | `/restrictions` | Active trial restrictions |
| GET | `/check/:feature` | Check if a feature is restricted |
| GET | `/events` | Trial events (debug/admin) |
| POST | `/force-expiry-check` | Force trial expiry check (dev only) |

## Services

| Service | Description |
|---------|-------------|
| **SubscriptionService** | Facade that re-exports subscription logic from all sub-services and the gateway |
| **subscription-core** | Gateway config, plan catalog, current subscription, usage, billing history |
| **subscription-trial** | Trial/free subscription creation, cancellation, expiry processing, reminder sending |
| **subscription-checkout** | Checkout session creation, billing portal (via adapter) |
| **subscription-plan-change** | Plan upgrades/downgrades, downgrade scheduling, feature/user limit checks (via adapter) |
| **subscription-plan-roles** | Role and permission updates when subscription plan changes |
| **subscription-payment-records** | Payment record management, refund processing, session lookup (via adapter) |
| **subscription-webhook-handler** | Webhook handling with normalised events for all providers (via adapter) |
| **PaymentService** | Payment recording and updates (by intent ID), payment history, statistics, payment methods, dispute recording |

## Adapter Components

| Component | Description |
|-----------|-------------|
| **PaymentGatewayPort** | TypeScript interface defining the contract every payment provider must implement |
| **StripePaymentGateway** | Concrete adapter wrapping the Stripe SDK; maps Stripe responses to gateway-agnostic types |
| **MockPaymentGateway** | Adapter returning plausible mock data; used in dev/test or when no provider keys are set |
| **PaymentGatewayFactory** | Singleton factory that reads `PAYMENT_GATEWAY_PROVIDER` and creates the right adapter |
| **types.ts** | Shared gateway-agnostic types (`CreateCheckoutParams`, `NormalizedWebhookEvent`, `GatewaySubscription`, etc.) |
