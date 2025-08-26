// Export all schemas
export * from './tenants.js';
export * from './users.js';
export * from './subscriptions.js';
export * from './permissions.js';
export * from './usage.js';
export * from './suite-schema.js';
export * from './webhook-logs.js';

// Define relationships
import { relations } from 'drizzle-orm';
import { 
  tenants, 
  tenantUsers, 
  subscriptions, 
  payments,
  customRoles, 
  userRoleAssignments,
  tenantInvitations,
  usageMetricsDaily
} from './index.js';

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  users: many(tenantUsers),
  subscription: one(subscriptions),
  roles: many(customRoles),
  usageMetrics: many(usageMetricsDaily),
  payments: many(payments),
}));

export const tenantUsersRelations = relations(tenantUsers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [tenantUsers.tenantId],
    references: [tenants.tenantId],
  }),
  roleAssignments: many(userRoleAssignments),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [subscriptions.tenantId],
    references: [tenants.tenantId],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.tenantId],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.subscriptionId],
  }),
}));

export const customRolesRelations = relations(customRoles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customRoles.tenantId],
    references: [tenants.tenantId],
  }),
  userAssignments: many(userRoleAssignments),
  invitations: many(tenantInvitations),
}));

export const userRoleAssignmentsRelations = relations(userRoleAssignments, ({ one }) => ({
  user: one(tenantUsers, {
    fields: [userRoleAssignments.userId],
    references: [tenantUsers.userId],
  }),
  role: one(customRoles, {
    fields: [userRoleAssignments.roleId],
    references: [customRoles.roleId],
  }),
  assignedByUser: one(tenantUsers, {
    fields: [userRoleAssignments.assignedBy],
    references: [tenantUsers.userId],
  }),
}));

export const tenantInvitationsRelations = relations(tenantInvitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantInvitations.tenantId],
    references: [tenants.tenantId],
  }),
  role: one(customRoles, {
    fields: [tenantInvitations.roleId],
    references: [customRoles.roleId],
  }),
  invitedByUser: one(tenantUsers, {
    fields: [tenantInvitations.invitedBy],
    references: [tenantUsers.userId],
  }),
})); 