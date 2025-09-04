import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer, decimal, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';

// Main credit balance table
export const credits = pgTable('credits', {
  creditId: uuid('credit_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Entity Context
  entityType: varchar('entity_type', { length: 20 }).notNull(), // 'organization', 'location', 'tenant'
  entityId: uuid('entity_id'), // NULL for tenant-level

  // Credit Balance
  availableCredits: decimal('available_credits', { precision: 15, scale: 4 }).default('0'),
  reservedCredits: decimal('reserved_credits', { precision: 15, scale: 4 }).default('0'), // Credits held for pending operations
  totalCredits: decimal('total_credits', { precision: 15, scale: 4 }).default('0'), // Available + Reserved

  // Credit Pools (for batch management)
  creditPools: jsonb('credit_pools').default([]), // Array of credit batches with expiry dates
  // Example: [
  //   { batchId: 'uuid', amount: 1000, expiryDate: '2024-12-31', source: 'purchase' },
  //   { batchId: 'uuid', amount: 500, expiryDate: '2024-06-30', source: 'transfer' }
  // ]

  // Credit Policy
  creditPolicy: jsonb('credit_policy').default({
    allowOverage: true,
    overageLimit: {
      period: 'day',
      maxAmount: 10000
    },
    expiryPolicy: {
      enabled: true,
      defaultDays: 365,
      notificationDays: [30, 7, 1]
    },
    autoRenewal: false
  }),

  // Usage Tracking
  totalConsumed: decimal('total_consumed', { precision: 15, scale: 4 }).default('0'),
  totalExpired: decimal('total_expired', { precision: 15, scale: 4 }).default('0'),
  totalTransferred: decimal('total_transferred', { precision: 15, scale: 4 }).default('0'),

  // Period Tracking (for limits)
  currentPeriodConsumed: decimal('current_period_consumed', { precision: 15, scale: 4 }).default('0'),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  periodType: varchar('period_type', { length: 20 }).default('month'), // 'day', 'week', 'month', 'year'

  // Status
  isActive: boolean('is_active').default(true),
  isFrozen: boolean('is_frozen').default(false),
  frozenReason: text('frozen_reason'),

  // Audit
  lastUpdatedBy: uuid('last_updated_by').references(() => tenantUsers.userId),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Credit transaction ledger (immutable record of all credit movements)
export const creditTransactions = pgTable('credit_transactions', {
  transactionId: uuid('transaction_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Entity Context
  entityType: varchar('entity_type', { length: 20 }).notNull(),
  entityId: uuid('entity_id'),

  // Transaction Details
  transactionType: varchar('transaction_type', { length: 30 }).notNull(),
  // 'purchase', 'consumption', 'expiry', 'transfer_in', 'transfer_out', 'refund', 'adjustment'

  amount: decimal('amount', { precision: 15, scale: 4 }).notNull(),
  previousBalance: decimal('previous_balance', { precision: 15, scale: 4 }),
  newBalance: decimal('new_balance', { precision: 15, scale: 4 }),

  // Transaction Context
  operationCode: varchar('operation_code', { length: 255 }), // 'crm.leads.create', 'hr.payroll.process'
  operationId: uuid('operation_id'), // ID of the operation that consumed credits
  batchId: uuid('batch_id'), // Which credit batch was affected

  // Related Entities (for transfers)
  relatedEntityType: varchar('related_entity_type', { length: 20 }),
  relatedEntityId: uuid('related_entity_id'),
  transferId: uuid('transfer_id'), // Reference to credit transfer record

  // Payment Context (for purchases)
  paymentId: uuid('payment_id'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),

  // Metadata
  description: text('description'),
  metadata: jsonb('metadata').default({}),

  // Audit
  initiatedBy: uuid('initiated_by').references(() => tenantUsers.userId),
  processedAt: timestamp('processed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Credit alerts and notifications
export const creditAlerts = pgTable('credit_alerts', {
  alertId: uuid('alert_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Alert Context
  entityType: varchar('entity_type', { length: 20 }),
  entityId: uuid('entity_id'),

  // Alert Details
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  // 'low_balance', 'expiry_warning', 'overage_limit', 'transfer_request', 'purchase_required'

  severity: varchar('severity', { length: 20 }).default('info'), // 'info', 'warning', 'critical'
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),

  // Alert Data
  currentValue: decimal('current_value', { precision: 15, scale: 4 }),
  thresholdValue: decimal('threshold_value', { precision: 15, scale: 4 }),
  percentage: decimal('percentage', { precision: 5, scale: 2 }),

  // Notification Status
  isRead: boolean('is_read').default(false),
  isSent: boolean('is_sent').default(false),
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),

  // Recipients
  notifyUsers: jsonb('notify_users').default([]), // Array of user IDs to notify
  notifyRoles: jsonb('notify_roles').default([]), // Array of role IDs to notify

  // Actions
  actionRequired: varchar('action_required', { length: 100 }), // 'purchase_credits', 'approve_transfer', 'review_usage'
  actionTaken: varchar('action_taken', { length: 100 }),
  resolvedAt: timestamp('resolved_at'),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});
