# Subscriptions Feature

Stripe-based billing: plans, checkout, payments, trials, payment-profile/upgrade flows, billing portal, refunds, and usage/plan limits.

## Directory Structure

```
subscriptions/
├── index.ts                                          # Feature exports
├── routes/
│   ├── subscriptions.ts                              # Core subscription endpoints
│   ├── payments.ts                                   # Payment history, stats, webhooks
│   ├── payment-upgrade.ts                            # Profile completion and upgrade flows
│   ├── payment-profile-completion.ts                 # Profile requirements and payment
│   └── trial.ts                                      # Trial status and restrictions
└── services/
    ├── subscription-service.ts                       # Facade delegating to sub-services
    ├── subscription-core.ts                          # Stripe config, plan catalog, current sub
    ├── subscription-trial.ts                         # Trial/free creation, expiry, reminders
    ├── subscription-checkout.ts                      # Checkout session, billing portal
    ├── subscription-plan-change.ts                   # Plan change, downgrade scheduling
    ├── subscription-plan-roles.ts                    # Role/permission updates on plan change
    ├── subscription-payment-records.ts               # Payment records, refunds
    ├── subscription-webhook-handler.ts               # Stripe webhook handling
    └── payment-service.ts                            # Payment recording and statistics
```

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
| **SubscriptionService** | Facade that re-exports subscription logic from all sub-services |
| **subscription-core** | Stripe config, plan catalog, current subscription, usage, billing history |
| **subscription-trial** | Trial/free subscription creation, cancellation, expiry processing, reminder sending |
| **subscription-checkout** | Stripe checkout session creation, mock checkout, billing portal session |
| **subscription-plan-change** | Plan upgrades/downgrades, downgrade scheduling, feature/user limit checks |
| **subscription-plan-roles** | Role and permission updates when subscription plan changes |
| **subscription-payment-records** | Payment record management, refund processing, payment lookup by checkout session |
| **subscription-webhook-handler** | Stripe webhook handling for checkout completion, invoices, subscription events |
| **PaymentService** | Payment recording and updates (by intent ID), payment history, statistics, payment methods, dispute recording |
