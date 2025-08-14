#!/usr/bin/env node

/**
 * Setup script for local environment configuration
 * This will help you configure Stripe webhooks for local development
 */

console.log(`
🔧 LOCAL ENVIRONMENT SETUP
==========================

Your payment was successful in Stripe, but your local backend isn't configured to receive webhooks.

Here's how to fix this:

1️⃣  INSTALL STRIPE CLI:
   Visit: https://stripe.com/docs/stripe-cli#install
   Or run: brew install stripe/stripe-cli/stripe (on macOS)

2️⃣  LOGIN TO STRIPE:
   stripe login

3️⃣  FORWARD WEBHOOKS TO LOCAL SERVER:
   stripe listen --forward-to localhost:3000/api/subscriptions/webhook

4️⃣  COPY THE WEBHOOK SECRET:
   The command above will output something like:
   "Ready! Your webhook signing secret is whsec_1234..."
   
5️⃣  CREATE .env FILE:
   Copy backend/env.example to backend/.env and update:
   - STRIPE_SECRET_KEY=sk_test_... (from your Stripe dashboard)
   - STRIPE_PUBLISHABLE_KEY=pk_test_... (from your Stripe dashboard)  
   - STRIPE_WEBHOOK_SECRET=whsec_... (from step 4)
   - STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_1RUhPf01KG3phQlPJ0xSx4CM

6️⃣  RESTART YOUR BACKEND SERVER:
   npm run dev (or node server.js)

🔄 THEN TEST THE PAYMENT AGAIN:
   - Your webhook will now process the events
   - Database will be updated automatically
   - Trial restrictions will be lifted

📊 CURRENT STATUS:
   ✅ Payment completed in Stripe
   ❌ Webhook secret missing
   ❌ Local webhook forwarding not set up
   ✅ Trial restrictions bypassed temporarily

🎯 WEBHOOK EVENTS TO PROCESS:
   The following events from your payment need to be processed:
   - checkout.session.completed
   - customer.subscription.created  
   - customer.subscription.updated
   - invoice.payment_succeeded
   - invoice_payment.paid
`);

// Check if .env file exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  console.log(`
❗ QUICK SETUP:
   Run this command to create your .env file:
   cp backend/env.example backend/.env
   
   Then edit backend/.env with your actual Stripe keys.
`);
} else {
  console.log(`
✅ .env file exists. Make sure it has:
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET  
   - STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_1RUhPf01KG3phQlPJ0xSx4CM
`);
}

console.log(`
🔗 USEFUL LINKS:
   - Stripe CLI: https://stripe.com/docs/stripe-cli
   - Your Stripe Dashboard: https://dashboard.stripe.com/test/webhooks
   - Webhook Testing: https://stripe.com/docs/webhooks/test
`);
