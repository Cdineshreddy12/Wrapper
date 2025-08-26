import { pgTable, uuid, varchar, jsonb, boolean, timestamp, text, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';

// Custom roles
export const customRoles = pgTable('custom_roles', {
  roleId: uuid('role_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  
  // Role Details
  roleName: varchar('role_name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#6b7280'), // For UI display
  
  // Kinde Integration
  kindeRoleId: varchar('kinde_role_id', { length: 255 }),
  kindeRoleKey: varchar('kinde_role_key', { length: 255 }),
  
  // Permissions Structure
  permissions: jsonb('permissions').notNull(),
  
  // Advanced Restrictions
  restrictions: jsonb('restrictions').default({}),
  
  // Role Metadata
  isSystemRole: boolean('is_system_role').default(false),
  isDefault: boolean('is_default').default(false),
  priority: integer('priority').default(0), // For role hierarchy
  
  // Audit
  lastModifiedBy: uuid('last_modified_by').references(() => tenantUsers.userId),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Role templates table REMOVED - using application/module based role creation instead

// User role assignments
export const userRoleAssignments = pgTable('user_role_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => tenantUsers.userId).notNull(),
  roleId: uuid('role_id').references(() => customRoles.roleId, { onDelete: 'cascade' }).notNull(),
  
  // Assignment Details
  assignedBy: uuid('assigned_by').references(() => tenantUsers.userId).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow(),
  
  // Temporary role assignments
  isTemporary: boolean('is_temporary').default(false),
  expiresAt: timestamp('expires_at'),
  
  // Status
  isActive: boolean('is_active').default(true),
  deactivatedAt: timestamp('deactivated_at'),
  deactivatedBy: uuid('deactivated_by').references(() => tenantUsers.userId),
});

 