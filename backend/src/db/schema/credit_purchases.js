import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer, decimal, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';

// Credit purchase orders
export const creditPurchases = pgTable('credit_purchases', {
  purchaseId: uuid('purchase_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Purchase Context
  entityType: varchar('entity_type', { length: 20 }).default('organization'), // 'organization', 'location', 'tenant'
  entityId: uuid('entity_id'), // NULL for tenant-level purchases

  // Purchase Details
  creditAmount: decimal('credit_amount', { precision: 15, scale: 4 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  unitPrice: decimal('unit_price', { precision: 10, scale: 4 }).notNull(), // Price per credit
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(), // Total cost before discounts

  // Volume Discounts Applied
  discountTier: varchar('discount_tier', { length: 50 }), // 'tier_1', 'tier_2', 'tier_3'
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).default('0'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  finalAmount: decimal('final_amount', { precision: 10, scale: 2 }).notNull(), // Amount after discount

  // Credit Batch Details
  batchId: uuid('batch_id').notNull().unique(), // Unique identifier for this credit batch
  expiryDate: timestamp('expiry_date'), // When these credits expire
  expiryPolicy: jsonb('expiry_policy').default({
    type: 'fixed_date', // 'fixed_date', 'rolling_period', 'never'
    period: null, // '30_days', '90_days', '1_year'
    notificationDays: [30, 7, 1]
  }),

  // Payment Information
  paymentMethod: varchar('payment_method', { length: 50 }), // 'stripe', 'bank_transfer', 'check'
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
  paymentStatus: varchar('payment_status', { length: 20 }).default('pending'),
  // 'pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'

  // Purchase Status
  status: varchar('status', { length: 20 }).default('pending'),
  // 'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'

  // Tax Information
  taxRate: decimal('tax_rate', { precision: 5, scale: 4 }).default('0'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  taxRegion: varchar('tax_region', { length: 100 }),

  // Processing Information
  processingFees: decimal('processing_fees', { precision: 10, scale: 2 }).default('0'),
  netAmount: decimal('net_amount', { precision: 10, scale: 2 }), // Final amount received

  // Timestamps
  requestedAt: timestamp('requested_at').defaultNow(),
  paidAt: timestamp('paid_at'),
  creditedAt: timestamp('credited_at'), // When credits were added to balance
  completedAt: timestamp('completed_at'),

  // Audit
  requestedBy: uuid('requested_by').references(() => tenantUsers.userId).notNull(),
  processedBy: uuid('processed_by').references(() => tenantUsers.userId),

  // Additional Information
  notes: text('notes'),
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  purchaseOrderNumber: varchar('purchase_order_number', { length: 50 }),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Volume discount tiers configuration
export const discountTiers = pgTable('discount_tiers', {
  tierId: uuid('tier_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Tier Definition
  tierCode: varchar('tier_code', { length: 50 }).notNull().unique(),
  tierName: varchar('tier_name', { length: 100 }).notNull(),
  description: text('description'),

  // Credit Range
  minCredits: decimal('min_credits', { precision: 15, scale: 4 }).default('0'),
  maxCredits: decimal('max_credits', { precision: 15, scale: 4 }), // NULL = unlimited

  // Discount Details
  discountType: varchar('discount_type', { length: 20 }).default('percentage'), // 'percentage', 'fixed_amount'
  discountValue: decimal('discount_value', { precision: 5, scale: 2 }).notNull(), // Percentage or fixed amount
  basePrice: decimal('base_price', { precision: 10, scale: 4 }).notNull(), // Base price per credit before discount

  // Status
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(0), // For overlapping ranges

  // Usage Tracking
  totalPurchases: integer('total_purchases').default(0),
  totalCreditsSold: decimal('total_credits_sold', { precision: 15, scale: 4 }).default('0'),
  totalRevenue: decimal('total_revenue', { precision: 15, scale: 2 }).default('0'),

  // Validity Period
  validFrom: timestamp('valid_from'),
  validUntil: timestamp('valid_until'),

  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Purchase templates (for recurring purchases)
export const purchaseTemplates = pgTable('purchase_templates', {
  templateId: uuid('template_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Template Details
  templateName: varchar('template_name', { length: 100 }).notNull(),
  description: text('description'),

  // Purchase Configuration
  creditAmount: decimal('credit_amount', { precision: 15, scale: 4 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).default('stripe'),

  // Auto-purchase Settings
  autoPurchaseEnabled: boolean('auto_purchase_enabled').default(false),
  autoPurchaseThreshold: decimal('auto_purchase_threshold', { precision: 15, scale: 4 }), // Trigger when balance drops below this
  maxAutoPurchases: integer('max_auto_purchases'), // Limit number of auto-purchases
  autoPurchaseCount: integer('auto_purchase_count').default(0), // Track usage

  // Recurring Settings
  isRecurring: boolean('is_recurring').default(false),
  recurringInterval: varchar('recurring_interval', { length: 20 }), // 'weekly', 'monthly', 'quarterly'
  nextPurchaseDate: timestamp('next_purchase_date'),

  // Status
  isActive: boolean('is_active').default(true),

  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Purchase history for reporting
export const purchaseHistory = pgTable('purchase_history', {
  historyId: uuid('history_id').primaryKey().defaultRandom(),
  purchaseId: uuid('purchase_id').references(() => creditPurchases.purchaseId, { onDelete: 'cascade' }).notNull(),

  // Historical Data
  oldStatus: varchar('old_status', { length: 20 }),
  newStatus: varchar('new_status', { length: 20 }),
  oldPaymentStatus: varchar('old_payment_status', { length: 20 }),
  newPaymentStatus: varchar('new_payment_status', { length: 20 }),

  // Change Details
  changeType: varchar('change_type', { length: 50 }).notNull(), // 'status_change', 'payment_update', 'refund'
  changeReason: text('change_reason'),

  // Context
  changedBy: uuid('changed_by').references(() => tenantUsers.userId).notNull(),
  changeSource: varchar('change_source', { length: 50 }).default('manual'), // 'manual', 'system', 'webhook'

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});
