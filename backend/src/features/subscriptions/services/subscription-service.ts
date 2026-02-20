/**
 * Subscription Service — Facade
 *
 * Re-exports all subscription functionality through the original SubscriptionService class
 * for full backward compatibility. Actual logic lives in the split modules:
 *   - subscription-core.ts        (Stripe config, plan catalog, subscription state)
 *   - subscription-trial.ts       (trial/free creation, cancellation, expiry)
 *   - subscription-checkout.ts    (Stripe checkout, billing portal)
 *   - subscription-plan-change.ts (plan upgrades/downgrades)
 *   - subscription-plan-roles.ts  (role/permission updates on plan change)
 *   - subscription-payment-records.ts (payment records, refunds)
 *   - subscription-webhook-handler.ts (Stripe webhook processing)
 */

import {
  isStripeConfiguredFn,
  getStripeConfigStatus,
  getCurrentSubscription,
  getAvailablePlans,
  getPlanIdFromPriceId,
  getUsageMetrics,
  getBillingHistory,
} from './subscription-core.js';

import {
  createTrialSubscription,
  createFreeSubscription,
  checkTrialHistory,
  cancelSubscription,
  recordTrialEvent,
  handleExpiredTrials,
  sendTrialReminders,
} from './subscription-trial.js';

import {
  createCheckoutSession,
  handleMockCheckoutCompleted,
  createBillingPortalSession,
} from './subscription-checkout.js';

import {
  changePlan,
  scheduleDowngrade,
  processImmediatePlanChange,
  isValidPlanChange,
  immediateDowngrade,
  calculateFeatureLoss,
  calculateDataRetention,
  calculateUserLimits,
} from './subscription-plan-change.js';

import {
  updateAdministratorRolesForPlan,
  enhanceAdminPermissionsForPlan,
  updateAdminRestrictionsForPlan,
  updateTenantAdminUsersForPlan,
  updateSuperAdminRoleForPlan,
} from './subscription-plan-roles.js';

import {
  getPaymentDetailsByCheckoutSessionId,
  createPaymentRecord,
  processRefund,
} from './subscription-payment-records.js';
import {
  handleWebhook,
  handleCheckoutCompleted,
  applyInvoicePaymentToSubscription,
  handlePaymentSucceeded,
  handleInvoicePaymentPaid,
  handlePaymentFailed,
  handleChargeDispute,
  handleRefund,
  handleSubscriptionUpdated,
  handleSubscriptionCreated,
  handleChargeSucceeded,
  handleCreditPurchase,
  handleSubscriptionDeleted,
} from './subscription-webhook-handler.js';

import type { RequestContext } from '../../../services/activityLogger.js';

export class SubscriptionService {
  // Core
  static isStripeConfigured = isStripeConfiguredFn;
  static getStripeConfigStatus = getStripeConfigStatus;
  static getCurrentSubscription = getCurrentSubscription;
  static getAvailablePlans = getAvailablePlans;
  static getPlanIdFromPriceId = getPlanIdFromPriceId;
  static getUsageMetrics = getUsageMetrics;
  static getBillingHistory = getBillingHistory;

  // Trial & free
  static createTrialSubscription = createTrialSubscription;
  static createFreeSubscription = createFreeSubscription;
  static checkTrialHistory = checkTrialHistory;
  static cancelSubscription = cancelSubscription;
  static recordTrialEvent = recordTrialEvent;
  static handleExpiredTrials = handleExpiredTrials;
  static sendTrialReminders = sendTrialReminders;

  // Checkout & billing portal
  static createCheckoutSession = createCheckoutSession;
  static handleMockCheckoutCompleted = handleMockCheckoutCompleted;
  static createBillingPortalSession = createBillingPortalSession;

  // Plan change & downgrade
  static changePlan = changePlan;
  static scheduleDowngrade = scheduleDowngrade;
  static processImmediatePlanChange = processImmediatePlanChange;
  static isValidPlanChange = isValidPlanChange;
  static immediateDowngrade = immediateDowngrade;
  static calculateFeatureLoss = calculateFeatureLoss;
  static calculateDataRetention = calculateDataRetention;
  static calculateUserLimits = calculateUserLimits;

  // Plan roles
  static updateAdministratorRolesForPlan = updateAdministratorRolesForPlan;
  static enhanceAdminPermissionsForPlan = enhanceAdminPermissionsForPlan;
  static updateAdminRestrictionsForPlan = updateAdminRestrictionsForPlan;
  static updateTenantAdminUsersForPlan = updateTenantAdminUsersForPlan;
  static updateSuperAdminRoleForPlan = updateSuperAdminRoleForPlan;

  // Payment records
  static getPaymentDetailsByCheckoutSessionId = getPaymentDetailsByCheckoutSessionId;
  static createPaymentRecord = createPaymentRecord;
  static processRefund = processRefund;

  // Webhook handling
  static handleWebhook = handleWebhook;
  static handleCheckoutCompleted = handleCheckoutCompleted;
  static _applyInvoicePaymentToSubscription = applyInvoicePaymentToSubscription;
  static handlePaymentSucceeded = handlePaymentSucceeded;
  static handleInvoicePaymentPaid = handleInvoicePaymentPaid;
  static handlePaymentFailed = handlePaymentFailed;
  static handleChargeDispute = handleChargeDispute;
  static handleRefund = handleRefund;
  static handleSubscriptionUpdated = handleSubscriptionUpdated;
  static handleSubscriptionCreated = handleSubscriptionCreated;
  static handleChargeSucceeded = handleChargeSucceeded;
  static handleCreditPurchase = handleCreditPurchase;
  static handleSubscriptionDeleted = handleSubscriptionDeleted;
}
