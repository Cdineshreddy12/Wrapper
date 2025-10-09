import { pgTable, text, timestamp, boolean, jsonb, uuid, integer } from 'drizzle-orm/pg-core';

/**
 * Event Tracking Schema
 * Tracks events published to external systems and their acknowledgment status
 */
export const eventTracking = pgTable('event_tracking', {
  trackingId: uuid('tracking_id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull(), // Unique event identifier
  eventType: text('event_type').notNull(), // 'credit.allocated', 'credit.consumed', etc.
  tenantId: text('tenant_id').notNull(),
  entityId: text('entity_id'), // Associated entity (organization, user, etc.)
  streamKey: text('stream_key').notNull(), // Redis stream key
  sourceApplication: text('source_application').default('wrapper').notNull(), // Which app sent the event
  targetApplication: text('target_application').notNull(), // Which app should process it
  eventData: jsonb('event_data'), // Original event payload

  // Publication tracking
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  publishedBy: text('published_by'), // User/system that published

  // Acknowledgment tracking
  acknowledged: boolean('acknowledged').default(false).notNull(),
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgmentData: jsonb('acknowledgment_data'), // CRM response data

  // Status and error tracking
  status: text('status').default('published').notNull(), // 'published', 'acknowledged', 'failed', 'timeout'
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0).notNull(),
  lastRetryAt: timestamp('last_retry_at'),

  // Metadata
  metadata: jsonb('metadata'), // Additional context
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
