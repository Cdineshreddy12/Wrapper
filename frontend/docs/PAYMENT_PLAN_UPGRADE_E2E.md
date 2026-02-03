# Payment for Plan Upgradation – E2E (Playwright)

This doc describes how to run and extend the Playwright E2E that verifies the **whole payment flow for plan upgradation**.

## What is verified

1. **Billing page** – Loads under `/dashboard/billing`, shows Credit Balance and plans.
2. **Credit Packages tab** – "Credit Packages" / "Packages" tab shows **Application Plans** (Starter, Premium, Enterprise).
3. **Purchase action** – Clicking "Purchase Starter" (or another plan) triggers the upgrade flow (redirect to Stripe in real mode, or toast in mock).
4. **Stripe Checkout (optional)** – If redirected to Stripe Checkout, the script fills the test card (`4242 4242 4242 4242`, expiry `12/34`, CVC `123`), submits, and waits for redirect back to **Payment Success**. Requires backend **test** API keys.
5. **Payment Success page** – Renders correctly (after real Stripe completion or direct visit with mock params).
6. **Payment Cancelled page** – `/payment-cancelled?type=subscription` shows "Payment Cancelled" and "Try Again".
7. **Try Again** – "Try Again" from the cancelled page navigates back to billing/dashboard.

## Prerequisites

- **Logged-in session** – Run the OAuth browser flow once so the persistent profile has a session:
  ```bash
  npm run test:oauth-browser
  ```
  Log in in the opened browser, then close it.

- **App running** – Frontend dev server on the URL used by the script (default `http://localhost:3001`):
  ```bash
  npm run dev
  ```

- **Playwright browsers** – If not already installed:
  ```bash
  npx playwright install
  ```

## How to run

From the `frontend` directory:

```bash
# Full run (billing without mock; may redirect to Stripe if you click purchase)
npm run test:payment-e2e
```

Optional: use mock billing so the app does not call the real checkout API (no Stripe redirect):

```bash
PAYMENT_MOCK=true npm run test:payment-e2e
# or
npm run test:payment-e2e:mock
```

To **complete the real Stripe payment** in test mode (backend must use Stripe **test** API keys):

```bash
# Best-effort: if redirect to Stripe happens, fill test card and complete; otherwise use mock success
npm run test:payment-e2e

# Require Stripe: fail if redirect to Stripe does not happen (ensures full checkout flow)
npm run test:payment-e2e:stripe
# or
STRIPE_E2E=true npm run test:payment-e2e
```

**Stripe test card** (used by the script): `4242 4242 4242 4242`, expiry `12/34`, CVC `123`. Use only with Stripe test keys.

## Env

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_APP_URL` | `http://localhost:3001` | Frontend base URL. |
| `PLAYWRIGHT_OAUTH_PROFILE` | `frontend/playwright-oauth-profile` | Persistent browser profile (holds login). |
| `PAYMENT_MOCK` | `false` | If `true`, open billing with `?mock=true` (no Stripe). |
| `STRIPE_E2E` | `false` | If `true`, require redirect to Stripe and complete payment; fail if no redirect. |

## Screenshots

On failure or at key steps, screenshots are written under:

`frontend/playwright-debug-screenshots/payment-e2e-<step>-<timestamp>.png`

## Flow summary

- **Billing** → **Credit Packages** tab → **Application Plans** → click **Purchase &lt;Plan&gt;**.
- If the app redirects to **Stripe Checkout**, the script fills the test card, submits, and waits for redirect to **Payment Success**. Otherwise it opens Payment Success with mock params.
- Then the script opens **Payment Cancelled** and asserts "Try Again" goes back to billing/dashboard.

This gives you E2E coverage of the plan upgrade flow, with optional full Stripe Checkout completion when using test API keys.
