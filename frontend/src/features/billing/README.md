# Billing Feature

Manages subscriptions, credit purchases, payment history, and trial status. Integrates with Stripe for checkout and payment processing.

## Directory Structure

```
billing/
├── index.ts                          # Public export (Billing page)
├── constants/
│   └── billingPlans.ts               # Fallback plans & credit top-up definitions
├── hooks/
│   └── useBilling.ts                 # Central data/state/mutations hook
├── components/
│   ├── index.ts
│   ├── BillingAlerts.tsx             # Upgrade mode / onboarding alerts
│   ├── SubscriptionTab.tsx           # Credit balance & subscription overview
│   ├── PlansTab.tsx                  # Credit top-ups & application plans
│   ├── HistoryTab.tsx                # Payment history with cancel/refund CTAs
│   ├── TimelineTab.tsx               # Tenant event timeline
│   ├── CancelSubscriptionDialog.tsx  # Subscription cancellation modal
│   └── RefundDialog.tsx              # Refund request modal
├── pages/
│   ├── Billing.tsx                   # Main billing page (tabbed)
│   ├── BillingUpgradePage.tsx        # Multi-step upgrade form
│   ├── PaymentSuccess.tsx            # Post-checkout success with confetti
│   ├── PaymentCancelled.tsx          # Checkout cancelled page
│   └── PaymentDetailsPage.tsx        # Single payment detail view
└── trial/
    ├── TrialExpiryBanner.tsx         # Dismissible trial expiry banner
    ├── TrialExpiryModal.tsx          # Blocking/non-blocking trial modal
    └── TrialStatusWidget.tsx         # Compact trial status in header
```

## Tabs (Main Billing Page)

1. **Credit Balance** — Current plan, credit balance (available/total), period end
2. **Credit Packages** — Top-up cards and application plan cards
3. **Purchase History** — Payment list, cancel subscription, request refund
4. **Timeline** — Chronological tenant events (account creation, trial, purchases)

## Key APIs

| Area | Endpoints |
|------|-----------|
| Subscription | `GET /subscriptions/current`, `GET /subscriptions/plans`, `POST /subscriptions/checkout`, `POST /subscriptions/change-plan` |
| Billing history | `GET /subscriptions/billing-history`, `GET /subscriptions/payment/:id` |
| Credits | `GET /credits/current`, `POST /credits/purchase`, `GET /credits/payment/:sessionId` |
| Timeline | `GET /tenants/current/timeline` |
| Refund | `POST /subscriptions/refund` |
| Profile | `GET /api/payment-upgrade/profile-status`, `POST /api/payment-upgrade/complete-profile` |

## Checkout Flow

1. User selects a plan or credit top-up
2. Profile completeness check — if incomplete, redirects to `BillingUpgradePage`
3. `subscriptionAPI.createCheckout` creates a Stripe checkout session
4. User completes payment on Stripe
5. Redirect to `PaymentSuccess` (or `PaymentCancelled`)

## Trial Sub-feature

- **TrialExpiryBanner** — Shows days remaining or expired state; CTA to upgrade
- **TrialExpiryModal** — Optional blocking modal when trial expires
- **TrialStatusWidget** — Compact header indicator

All trial components use `useTrialStatus` and listen for `trialExpired` / `apiTrialExpired` events.

## Dependencies

- `@tanstack/react-query` — Queries and mutations
- `@kinde-oss/kinde-auth-react` — Auth for token management
- `canvas-confetti` — Celebration animation on PaymentSuccess
- `framer-motion` — Page animations
- `@/hooks/useTrialStatus` — Trial state management
- `@/hooks/useSharedQueries` — `useSubscriptionCurrent`
