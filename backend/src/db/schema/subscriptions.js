import { pgTable, uuid, varchar, timestamp, jsonb, decimal, integer, boolean, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

// Main subscriptions
export const subscriptions = pgTable('subscriptions', {
  subscriptionId: uuid('subscription_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  
  // Plan information
  plan: varchar('plan', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'active', 'past_due', 'canceled', 'trialing', 'suspended'
  
  // Stripe subscription details
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  
  // Trial information
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  isTrialUser: boolean('is_trial_user').default(false),
  
  // Upgrade tracking - NEW FIELDS
  hasEverUpgraded: boolean('has_ever_upgraded').default(false), // Track if user ever had a paid plan
  firstUpgradeAt: timestamp('first_upgrade_at'), // When they first upgraded from trial
  lastDowngradeAt: timestamp('last_downgrade_at'), // When they last downgraded
  trialToggledOff: boolean('trial_toggled_off').default(false), // Manually disable trial restrictions
  
  // Trial monitoring fields
  lastReminderSentAt: timestamp('last_reminder_sent_at'), // When last reminder was sent
  reminderCount: integer('reminder_count').default(0), // How many reminders sent
  restrictionsAppliedAt: timestamp('restrictions_applied_at'), // When restrictions were applied
  
  // Usage and limits
  subscribedTools: jsonb('subscribed_tools').default([]),
  usageLimits: jsonb('usage_limits').default({}),
  
  // Billing cycle and pricing
  billingCycle: varchar('billing_cycle', { length: 20 }).default('monthly'), // 'monthly', 'yearly'
  monthlyPrice: decimal('monthly_price', { precision: 10, scale: 2 }).default('0'),
  yearlyPrice: decimal('yearly_price', { precision: 10, scale: 2 }).default('0'),
  
  // Current period information
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  
  // Cancellation information
  cancelAt: timestamp('cancel_at'),
  canceledAt: timestamp('canceled_at'),
  suspendedAt: timestamp('suspended_at'),
  suspendedReason: text('suspended_reason'),
  
  // Add-ons and customizations
  addOns: jsonb('add_ons').default([]),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Payment history - CLEANED UP (no more trial tracking here)
export const payments = pgTable('payments', {
  paymentId: uuid('payment_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.subscriptionId),
  
  // Stripe Payment Details
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  stripeRefundId: varchar('stripe_refund_id', { length: 255 }),
  stripeDisputeId: varchar('stripe_dispute_id', { length: 255 }),
  
  // Payment Info
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  amountRefunded: decimal('amount_refunded', { precision: 10, scale: 2 }).default('0'),
  amountDisputed: decimal('amount_disputed', { precision: 10, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  status: varchar('status', { length: 20 }).notNull(), // 'succeeded', 'failed', 'pending', 'refunded', 'partially_refunded', 'disputed', 'canceled'
  paymentMethod: varchar('payment_method', { length: 50 }), // 'card', 'bank_transfer', etc.
  paymentMethodDetails: jsonb('payment_method_details').default({}), // Card brand, last4, etc.
  
  // Payment Type & Context (NO MORE TRIAL TYPES)
  paymentType: varchar('payment_type', { length: 30 }).default('subscription'), // 'subscription', 'setup', 'refund', 'proration', 'overage'
  billingReason: varchar('billing_reason', { length: 50 }), // 'subscription_cycle', 'subscription_create', 'subscription_update', etc.
  
  // Invoice Details
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  description: text('description'),
  
  // Proration & Credits
  prorationAmount: decimal('proration_amount', { precision: 10, scale: 2 }).default('0'),
  creditAmount: decimal('credit_amount', { precision: 10, scale: 2 }).default('0'),
  
  // Refund Information
  refundReason: varchar('refund_reason', { length: 100 }),
  refundRequestedBy: uuid('refund_requested_by').references(() => tenants.tenantId),
  isPartialRefund: boolean('is_partial_refund').default(false),
  
  // Dispute Information
  disputeReason: varchar('dispute_reason', { length: 100 }),
  disputeStatus: varchar('dispute_status', { length: 30 }), // 'warning_needs_response', 'under_review', 'charge_refunded', 'lost', 'won'
  disputeEvidenceSubmitted: boolean('dispute_evidence_submitted').default(false),
  
  // Tax Information
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 4 }).default('0'),
  taxRegion: varchar('tax_region', { length: 50 }),
  
  // Processing Information
  processingFees: decimal('processing_fees', { precision: 10, scale: 2 }).default('0'),
  netAmount: decimal('net_amount', { precision: 10, scale: 2 }), // Amount after fees and taxes
  
  // Risk & Fraud
  riskLevel: varchar('risk_level', { length: 20 }), // 'normal', 'elevated', 'highest'
  riskScore: integer('risk_score'),
  fraudDetails: jsonb('fraud_details').default({}),
  
  // Comprehensive metadata
  metadata: jsonb('metadata').default({}),
  stripeRawData: jsonb('stripe_raw_data').default({}), // Full Stripe event data for debugging
  
  // Dates
  paidAt: timestamp('paid_at'),
  failedAt: timestamp('failed_at'),
  refundedAt: timestamp('refunded_at'),
  disputedAt: timestamp('disputed_at'),
  settledAt: timestamp('settled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Trial Events - NEW TABLE for proper trial tracking
export const trialEvents = pgTable('trial_events', {
  eventId: uuid('event_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.subscriptionId),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'trial_started', 'trial_expired', 'reminder_sent', etc.
  eventData: jsonb('event_data').default({}),
  userId: uuid('user_id'), // Which user triggered this event
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Trial Restrictions - Track what's restricted
export const trialRestrictions = pgTable('trial_restrictions', {
  restrictionId: uuid('restriction_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  restrictionType: varchar('restriction_type', { length: 50 }).notNull(), // 'feature_access', 'api_calls', 'user_limit'
  isActive: boolean('is_active').default(true),
  restrictionData: jsonb('restriction_data').default({}),
  appliedAt: timestamp('applied_at').defaultNow(),
  removedAt: timestamp('removed_at'),
});

// Subscription actions and changes tracking
export const subscriptionActions = pgTable('subscription_actions', {
  actionId: uuid('action_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.subscriptionId).notNull(),
  
  // Action Details
  actionType: varchar('action_type', { length: 30 }).notNull(), // 'upgrade', 'downgrade', 'cancel', 'reactivate', 'pause', 'change_billing_cycle'
  fromPlan: varchar('from_plan', { length: 50 }),
  toPlan: varchar('to_plan', { length: 50 }),
  fromBillingCycle: varchar('from_billing_cycle', { length: 20 }),
  toBillingCycle: varchar('to_billing_cycle', { length: 20 }),
  
  // Financial Impact
  prorationAmount: decimal('proration_amount', { precision: 10, scale: 2 }).default('0'),
  refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }).default('0'),
  chargeAmount: decimal('charge_amount', { precision: 10, scale: 2 }).default('0'),
  effectiveDate: timestamp('effective_date').notNull(),
  
  // User & Reason
  initiatedBy: uuid('initiated_by').references(() => tenants.tenantId),
  reason: varchar('reason', { length: 100 }),
  adminNotes: text('admin_notes'),
  customerNotes: text('customer_notes'),
  
  // Processing Status
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'processing', 'completed', 'failed', 'reversed'
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
  
  // Impact Assessment
  impactAssessment: jsonb('impact_assessment').default({}), // Usage impact, feature changes, etc.
  rollbackData: jsonb('rollback_data').default({}), // Data needed to reverse the action
  
  // Timestamps
  requestedAt: timestamp('requested_at').defaultNow(),
  processedAt: timestamp('processed_at'),
  completedAt: timestamp('completed_at'),
  reversedAt: timestamp('reversed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}); 