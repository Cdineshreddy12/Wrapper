import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer, decimal, text, bigint } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';

// Detailed credit usage tracking per operation
export const creditUsage = pgTable('credit_usage', {
  usageId: uuid('usage_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Entity Context
  entityType: varchar('entity_type', { length: 20 }).notNull(), // 'organization', 'location'
  entityId: uuid('entity_id').notNull(),

  // User Context
  userId: uuid('user_id').references(() => tenantUsers.userId),
  sessionId: uuid('session_id'),

  // Operation Details
  operationCode: varchar('operation_code', { length: 255 }).notNull(), // 'crm.leads.create', 'hr.payroll.process'
  operationId: uuid('operation_id'), // ID of the specific operation
  operationType: varchar('operation_type', { length: 50 }).notNull(), // 'api_call', 'data_processing', 'file_upload'

  // Credit Consumption
  creditsDebited: decimal('credits_debited', { precision: 10, scale: 4 }).notNull(),
  pricingMode: varchar('pricing_mode', { length: 20 }).default('credits'), // 'credits', 'overage'
  creditBatchId: uuid('credit_batch_id'), // Which batch was debited

  // Operation Metadata
  moduleCode: varchar('module_code', { length: 50 }), // 'crm.leads', 'hr.payroll'
  appCode: varchar('app_code', { length: 20 }), // 'crm', 'hr'
  endpoint: varchar('endpoint', { length: 255 }), // API endpoint used
  httpMethod: varchar('http_method', { length: 10 }), // GET, POST, PUT, DELETE

  // Performance Metrics
  processingTime: integer('processing_time'), // in milliseconds
  dataSize: integer('data_size'), // bytes processed
  recordCount: integer('record_count'), // number of records affected

  // Context Information
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  requestId: varchar('request_id', { length: 100 }), // For tracking related operations

  // Status & Errors
  success: boolean('success').default(true),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),

  // Cost Breakdown (for complex operations)
  costBreakdown: jsonb('cost_breakdown').default({}),
  // Example: {
  //   baseCost: 1.0,
  //   dataProcessingCost: 0.5,
  //   storageCost: 0.2,
  //   premiumFeaturesCost: 0.3
  // }

  // Billing Information
  billingCycle: varchar('billing_cycle', { length: 20 }), // 'hourly', 'daily', 'monthly'
  invoiceId: uuid('invoice_id'), // For invoiced operations
  isBillable: boolean('is_billable').default(true),

  // Refund/Adjustment Tracking
  isRefunded: boolean('is_refunded').default(false),
  refundedAmount: decimal('refunded_amount', { precision: 10, scale: 4 }).default('0'),
  refundReason: text('refund_reason'),
  refundedAt: timestamp('refunded_at'),
  refundedBy: uuid('refunded_by').references(() => tenantUsers.userId),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// Usage aggregation for reporting
export const usageAggregation = pgTable('usage_aggregation', {
  aggregationId: uuid('aggregation_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Aggregation Scope
  entityType: varchar('entity_type', { length: 20 }),
  entityId: uuid('entity_id'),
  aggregationType: varchar('aggregation_type', { length: 20 }).notNull(), // 'hourly', 'daily', 'weekly', 'monthly'
  aggregationKey: varchar('aggregation_key', { length: 100 }).notNull(), // '2024-01-01', '2024-01', etc.

  // Time Period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // Usage Metrics
  totalOperations: integer('total_operations').default(0),
  totalCreditsConsumed: decimal('total_credits_consumed', { precision: 15, scale: 4 }).default('0'),
  totalProcessingTime: integer('total_processing_time').default(0), // in milliseconds
  totalDataProcessed: bigint('total_data_processed', { mode: 'number' }).default(0), // in bytes

  // Breakdown by Operation Type
  operationsByType: jsonb('operations_by_type').default({}),
  creditsByType: jsonb('credits_by_type').default({}),
  // Example:
  // operationsByType: { 'crm.leads.create': 150, 'hr.payroll.process': 5 }
  // creditsByType: { 'crm.leads.create': 150.0, 'hr.payroll.process': 50.0 }

  // User Activity
  activeUsers: integer('active_users').default(0),
  newUsers: integer('new_users').default(0),

  // Performance Metrics
  avgResponseTime: decimal('avg_response_time', { precision: 8, scale: 2 }),
  errorRate: decimal('error_rate', { precision: 5, scale: 4 }), // percentage
  successRate: decimal('success_rate', { precision: 5, scale: 4 }), // percentage

  // Cost Analysis
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).default('0'),
  avgCostPerOperation: decimal('avg_cost_per_operation', { precision: 8, scale: 4 }),

  // Status
  isProcessed: boolean('is_processed').default(false),
  processedAt: timestamp('processed_at'),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Usage quotas and limits tracking
export const usageQuotas = pgTable('usage_quotas', {
  quotaId: uuid('quota_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Quota Scope
  entityType: varchar('entity_type', { length: 20 }),
  entityId: uuid('entity_id'),
  operationCode: varchar('operation_code', { length: 255 }), // Specific operation or NULL for all

  // Quota Limits
  quotaType: varchar('quota_type', { length: 20 }).default('soft'), // 'soft', 'hard'
  periodType: varchar('period_type', { length: 20 }).default('month'), // 'hour', 'day', 'week', 'month'
  maxOperations: integer('max_operations'),
  maxCredits: decimal('max_credits', { precision: 15, scale: 4 }),
  maxDataSize: bigint('max_data_size', { mode: 'number' }), // in bytes

  // Current Usage Tracking
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  currentOperations: integer('current_operations').default(0),
  currentCredits: decimal('current_credits', { precision: 15, scale: 4 }).default('0'),
  currentDataSize: bigint('current_data_size', { mode: 'number' }).default(0),

  // Warning Thresholds
  warningThreshold: decimal('warning_threshold', { precision: 5, scale: 2 }).default('0.8'), // 80%
  criticalThreshold: decimal('critical_threshold', { precision: 5, scale: 2 }).default('0.95'), // 95%

  // Status
  isActive: boolean('is_active').default(true),
  isExceeded: boolean('is_exceeded').default(false),

  // Notification Settings
  notifyOnWarning: boolean('notify_on_warning').default(true),
  notifyOnExceeded: boolean('notify_on_exceeded').default(true),
  notifyUsers: jsonb('notify_users').default([]),

  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Usage patterns for analytics
export const usagePatterns = pgTable('usage_patterns', {
  patternId: uuid('pattern_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Pattern Analysis
  entityType: varchar('entity_type', { length: 20 }),
  entityId: uuid('entity_id'),
  patternType: varchar('pattern_type', { length: 50 }).notNull(), // 'peak_hours', 'weekly_trend', 'user_behavior'

  // Time Analysis
  analysisPeriod: varchar('analysis_period', { length: 20 }).default('month'), // 'week', 'month', 'quarter'
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),

  // Pattern Data
  patternData: jsonb('pattern_data').default({}),
  // Example for peak_hours:
  // {
  //   peakHour: 14,
  //   peakDay: 'wednesday',
  //   avgOperationsPerHour: 45.2,
  //   hourlyBreakdown: [10, 15, 20, 25, ...]
  // }

  // Insights
  insights: jsonb('insights').default({}),
  recommendations: jsonb('recommendations').default([]),

  // Metadata
  confidence: decimal('confidence', { precision: 5, scale: 4 }), // AI confidence score
  lastCalculated: timestamp('last_calculated'),
  nextCalculation: timestamp('next_calculation'),

  // Status
  isActive: boolean('is_active').default(true),

  // Audit
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
