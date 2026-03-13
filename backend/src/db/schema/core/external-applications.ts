import { pgTable, uuid, text, integer, jsonb, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenantUsers } from './users.js';

export const externalApplications = pgTable('external_applications', {
  appId: uuid('app_id').primaryKey().defaultRandom(),
  appName: text('app_name').notNull(),
  appDescription: text('app_description'),
  apiKey: text('api_key').notNull(),
  apiSecret: text('api_secret'),
  webhookUrl: text('webhook_url'),
  webhookSecret: text('webhook_secret'),
  rateLimit: integer('rate_limit').notNull().default(100),
  allowedTenants: jsonb('allowed_tenants'),
  permissions: jsonb('permissions').notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
  requestCount: integer('request_count').notNull().default(0),
  lastRequestAt: timestamp('last_request_at'),
  metadata: jsonb('metadata').default({}),
}, (table) => ({
  apiKeyUnique: uniqueIndex('external_applications_api_key_unique').on(table.apiKey),
  apiKeyKeyUnique: uniqueIndex('external_applications_api_key_key').on(table.apiKey),
  apiKeyIdx: index('idx_external_applications_api_key').on(table.apiKey),
  isActiveIdx: index('idx_external_applications_is_active').on(table.isActive),
  createdByIdx: index('idx_external_applications_created_by').on(table.createdBy),
  lastUsedAtIdx: index('idx_external_applications_last_used_at').on(table.lastUsedAt),
}));
