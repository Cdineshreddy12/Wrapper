/**
 * 💳 **SUBSCRIPTIONS FEATURE**
 * Centralized subscriptions feature module
 * Exports all subscription routes and services
 */

// Routes
export { default as subscriptionsRoutes } from './routes/subscriptions.js';
export { default as paymentsRoutes } from './routes/payments.js';
export { default as paymentUpgradeRoutes } from './routes/payment-upgrade.js';
export { default as paymentProfileCompletionRoutes } from './routes/payment-profile-completion.js';
export { default as trialRoutes } from './routes/trial.js';

// Services
export { SubscriptionService } from './services/subscription-service.js';
export { PaymentService } from './services/payment-service.js';

// Payment Gateway Adapter (public API)
export { getPaymentGateway, setPaymentGateway, resetPaymentGateway } from './adapters/index.js';
export type { PaymentGatewayPort } from './adapters/index.js';
export type {
  PaymentGatewayProvider,
  CreateCheckoutParams,
  CheckoutResult,
  NormalizedWebhookEvent,
  NormalizedEventType,
  GatewayConfigStatus,
} from './adapters/index.js';
