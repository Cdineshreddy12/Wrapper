import { pgTable, uuid, varchar, timestamp, boolean, jsonb, integer, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

// Tenant users
export const tenantUsers = pgTable('tenant_users', {
  userId: uuid('user_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  kindeUserId: varchar('kinde_user_id', { length: 255 }), // Made nullable for pending invitations
  
  // Basic Info
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: varchar('avatar', { length: 500 }),
  title: varchar('title', { length: 100 }),
  department: varchar('department', { length: 100 }),
  
  // Status
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  isTenantAdmin: boolean('is_tenant_admin').default(false),
  
  // User Management (removed duplicate invitation fields)
  invitedBy: uuid('invited_by').references(() => tenantUsers.userId),
  invitedAt: timestamp('invited_at'),
  // Note: invitationToken, invitationExpiresAt, invitationAcceptedAt moved to tenant_invitations table
  
  // Activity
  lastActiveAt: timestamp('last_active_at'),
  lastLoginAt: timestamp('last_login_at'),
  loginCount: integer('login_count').default(0),
  
  // Preferences
  preferences: jsonb('preferences').default({}), // Dashboard layout, notifications, etc.
  
  // Onboarding
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingStep: varchar('onboarding_step', { length: 50 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User sessions for tracking
export const userSessions = pgTable('user_sessions', {
  sessionId: uuid('session_id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => tenantUsers.userId).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  sessionToken: varchar('session_token', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  loginAt: timestamp('login_at').defaultNow(),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').default(true),
});

// Audit logs for tracking user actions and changes
export const auditLogs = pgTable('audit_logs', {
  logId: uuid('log_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  userId: uuid('user_id').references(() => tenantUsers.userId),
  
  // Action details
  action: varchar('action', { length: 100 }).notNull(), // 'create', 'update', 'delete', 'assign', etc.
  resourceType: varchar('resource_type', { length: 50 }).notNull(), // 'role', 'user', 'permission', etc.
  resourceId: varchar('resource_id', { length: 255 }), // ID of the affected resource
  
  // Change tracking
  oldValues: jsonb('old_values'), // Previous state of the resource
  newValues: jsonb('new_values'), // New state of the resource
  details: jsonb('details'), // Additional context or metadata
  
  // Request context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').defaultNow(),
}); 