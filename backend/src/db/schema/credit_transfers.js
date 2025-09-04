import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer, decimal, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';

// Credit transfer requests
export const creditTransfers = pgTable('credit_transfers', {
  transferId: uuid('transfer_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Source Entity
  sourceEntityType: varchar('source_entity_type', { length: 20 }).notNull(), // 'organization', 'location'
  sourceEntityId: uuid('source_entity_id').notNull(),

  // Destination Entity
  destinationEntityType: varchar('destination_entity_type', { length: 20 }).notNull(),
  destinationEntityId: uuid('destination_entity_id').notNull(),

  // Transfer Details
  requestedAmount: decimal('requested_amount', { precision: 15, scale: 4 }).notNull(),
  transferAmount: decimal('transfer_amount', { precision: 15, scale: 4 }), // Actual amount transferred (may differ due to fees)
  transferFee: decimal('transfer_fee', { precision: 10, scale: 4 }).default('0'),

  // Credit Batch Selection
  selectedBatches: jsonb('selected_batches').default([]), // Array of batch IDs to transfer from
  // Example: ['batch-uuid-1', 'batch-uuid-2']

  // Transfer Type
  transferType: varchar('transfer_type', { length: 20 }).default('direct'), // 'direct', 'temporary', 'shared_pool'
  isTemporary: boolean('is_temporary').default(false), // Can be recalled
  recallDeadline: timestamp('recall_deadline'), // When temporary transfer expires

  // Approval Workflow
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'approved', 'rejected', 'completed', 'failed', 'recalled'
  approvalRequired: boolean('approval_required').default(true),

  // Approval Details
  approvedBy: uuid('approved_by').references(() => tenantUsers.userId),
  approvedAt: timestamp('approved_at'),
  approvalNotes: text('approval_notes'),

  // Rejection Details
  rejectedBy: uuid('rejected_by').references(() => tenantUsers.userId),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),

  // Processing Details
  processedAt: timestamp('processed_at'),
  processingNotes: text('processing_notes'),

  // Transfer Context
  purpose: varchar('purpose', { length: 100 }), // 'emergency', 'reallocation', 'project_funding'
  referenceNumber: varchar('reference_number', { length: 50 }), // User-provided reference
  description: text('description'),

  // Audit
  requestedBy: uuid('requested_by').references(() => tenantUsers.userId).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  // Metadata
  metadata: jsonb('metadata').default({}),
});

// Transfer approval rules
export const transferApprovalRules = pgTable('transfer_approval_rules', {
  ruleId: uuid('rule_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Rule Scope
  entityType: varchar('entity_type', { length: 20 }), // 'organization', 'location' (NULL = global)
  entityId: uuid('entity_id'),

  // Rule Criteria
  minAmount: decimal('min_amount', { precision: 15, scale: 4 }).default('0'),
  maxAmount: decimal('max_amount', { precision: 15, scale: 4 }),
  requiresApproval: boolean('requires_approval').default(true),

  // Approval Requirements
  approvalLevels: jsonb('approval_levels').default([]),
  // Example: [
  //   { level: 1, approverRole: 'manager', minAmount: 100 },
  //   { level: 2, approverRole: 'director', minAmount: 1000 }
  // ]

  // Automatic Approval
  autoApproveBelow: decimal('auto_approve_below', { precision: 15, scale: 4 }), // Auto-approve below this amount
  autoApproveRoles: jsonb('auto_approve_roles').default([]), // Roles that can auto-approve

  // Restrictions
  restrictedDestinations: jsonb('restricted_destinations').default([]), // Cannot transfer to these entities
  allowedPurposes: jsonb('allowed_purposes').default([]), // Only these purposes allowed

  // Status
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(0), // For conflicting rules

  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Transfer history and audit trail
export const transferHistory = pgTable('transfer_history', {
  historyId: uuid('history_id').primaryKey().defaultRandom(),
  transferId: uuid('transfer_id').references(() => creditTransfers.transferId, { onDelete: 'cascade' }).notNull(),

  // Status Change
  oldStatus: varchar('old_status', { length: 20 }),
  newStatus: varchar('new_status', { length: 20 }),
  statusChangedBy: uuid('status_changed_by').references(() => tenantUsers.userId),

  // Action Details
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'status_change', 'approval', 'rejection', 'recall'
  actionDetails: jsonb('action_details').default({}),
  notes: text('notes'),

  // Context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// Transfer notifications
export const transferNotifications = pgTable('transfer_notifications', {
  notificationId: uuid('notification_id').primaryKey().defaultRandom(),
  transferId: uuid('transfer_id').references(() => creditTransfers.transferId, { onDelete: 'cascade' }).notNull(),

  // Notification Details
  notificationType: varchar('notification_type', { length: 50 }).notNull(),
  // 'transfer_requested', 'transfer_approved', 'transfer_rejected', 'transfer_completed', 'transfer_failed'

  recipientUserId: uuid('recipient_user_id').references(() => tenantUsers.userId).notNull(),
  recipientEmail: varchar('recipient_email', { length: 255 }),

  // Notification Content
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),

  // Delivery Status
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  deliveryStatus: varchar('delivery_status', { length: 20 }).default('pending'),
  // 'pending', 'sent', 'delivered', 'failed', 'bounced'

  // Retry Logic
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  nextRetryAt: timestamp('next_retry_at'),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// Transfer limits and quotas
export const transferLimits = pgTable('transfer_limits', {
  limitId: uuid('limit_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Limit Scope
  entityType: varchar('entity_type', { length: 20 }),
  entityId: uuid('entity_id'),

  // Limit Configuration
  periodType: varchar('period_type', { length: 20 }).default('month'), // 'day', 'week', 'month', 'year'
  maxTransferAmount: decimal('max_transfer_amount', { precision: 15, scale: 4 }),
  maxTransferCount: integer('max_transfer_count'),
  maxRecipientCount: integer('max_recipient_count'), // Max different recipients per period

  // Current Usage (calculated fields)
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  currentTransferAmount: decimal('current_transfer_amount', { precision: 15, scale: 4 }).default('0'),
  currentTransferCount: integer('current_transfer_count').default(0),
  currentRecipientCount: integer('current_recipient_count').default(0),

  // Status
  isActive: boolean('is_active').default(true),
  isHardLimit: boolean('is_hard_limit').default(true), // Hard limit = cannot exceed, Soft limit = warning

  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
