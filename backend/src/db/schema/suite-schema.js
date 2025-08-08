import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer, decimal } from 'drizzle-orm/pg-core';

// Import existing tables for proper foreign key references
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';

// Applications registry
export const applications = pgTable('applications', {
  appId: uuid('app_id').primaryKey().defaultRandom(),
  appCode: varchar('app_code', { length: 50 }).notNull().unique(), // 'crm', 'hr', 'affiliate'
  appName: varchar('app_name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 255 }),
  baseUrl: varchar('base_url', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive, maintenance
  version: varchar('version', { length: 20 }),
  isCore: boolean('is_core').default(false), // Core apps vs optional
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Application modules (features within each app)
export const applicationModules = pgTable('application_modules', {
  moduleId: uuid('module_id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => applications.appId),
  moduleCode: varchar('module_code', { length: 50 }).notNull(), // 'contacts', 'deals', 'reports'
  moduleName: varchar('module_name', { length: 100 }).notNull(),
  description: text('description'),
  isCore: boolean('is_core').default(false),
  permissions: jsonb('permissions'), // Remove the type annotation that's causing the error
  createdAt: timestamp('created_at').defaultNow()
});

// Organization application access
export const organizationApplications = pgTable('organization_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId),
  appId: uuid('app_id').references(() => applications.appId),
  isEnabled: boolean('is_enabled').default(true),
  enabledModules: jsonb('enabled_modules'), // Array of module codes
  customPermissions: jsonb('custom_permissions'), // Override default permissions
  licenseCount: integer('license_count').default(0), // Number of licenses purchased
  maxUsers: integer('max_users'), // Maximum users for this app
  subscriptionTier: varchar('subscription_tier', { length: 50 }), // 'basic', 'pro', 'enterprise'
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// User application permissions
export const userApplicationPermissions = pgTable('user_application_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => tenantUsers.userId),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId),
  appId: uuid('app_id').references(() => applications.appId),
  moduleId: uuid('module_id').references(() => applicationModules.moduleId),
  permissions: jsonb('permissions'), // ['view', 'create', 'edit', 'delete']
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'), // Additional metadata like reason, expiry, etc.
  grantedBy: uuid('granted_by').references(() => tenantUsers.userId),
  grantedAt: timestamp('granted_at').defaultNow(),
  expiresAt: timestamp('expires_at')
});



// SSO tokens for app authentication
export const ssoTokens = pgTable('sso_tokens', {
  tokenId: uuid('token_id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => tenantUsers.userId),
  appId: uuid('app_id').references(() => applications.appId),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isRevoked: boolean('is_revoked').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

// Activity logs for audit
export const activityLogs = pgTable('activity_logs', {
  logId: uuid('log_id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => tenantUsers.userId),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId),
  appId: uuid('app_id').references(() => applications.appId),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: varchar('resource_id', { length: 255 }),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow()
}); 