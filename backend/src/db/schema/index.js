// Export all schemas
export * from './tenants.js';
export * from './users.js';
export * from './subscriptions.js';
export * from './permissions.js';
export * from './usage.js';
export * from './suite-schema.js';
export * from './webhook-logs.js';

// Export new schemas for hierarchical organizations and credit system
export * from './organizations.js';
export * from './locations.js';
export * from './organization_memberships.js';
export * from './credits.js';
export * from './credit_purchases.js';
export * from './credit_transfers.js';
export * from './credit_usage.js';
export * from './credit_configurations.js';
export * from './responsible_persons.js';

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
  usageMetricsDaily,
  auditLogs,
  // New schema imports for relationships
  organizations,
  organizationLocations,
  organizationRelationships,
  locations,
  locationAssignments,
  locationResources,
  locationUsage,
  organizationMemberships,
  membershipInvitations,
  membershipHistory,
  membershipBulkOperations,
  credits,
  creditTransactions,
  creditAlerts,
  creditPurchases,
  discountTiers,
  purchaseTemplates,
  purchaseHistory,
  creditTransfers,
  transferApprovalRules,
  transferHistory,
  transferNotifications,
  transferLimits,
  creditUsage,
  usageAggregation,
  usageQuotas,
  usagePatterns,
  creditConfigurations,
  moduleCreditConfigurations,
  appCreditConfigurations,
  creditConfigurationTemplates,
  configurationChangeHistory,
  responsiblePersons,
  responsibilityHistory,
  responsibilityDelegations,
  responsibilityTemplates,
  responsibilityNotifications,
  responsibilityCoverage
} from './index.js';

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  users: many(tenantUsers),
  subscription: one(subscriptions),
  roles: many(customRoles),
  usageMetrics: many(usageMetricsDaily),
  payments: many(payments),
  // New relationships for hierarchical organizations and credit system
  organizations: many(organizations),
  locations: many(locations),
  memberships: many(organizationMemberships),
  credits: many(credits),
  creditPurchases: many(creditPurchases),
  creditTransfers: many(creditTransfers),
  creditUsage: many(creditUsage),
  responsiblePersons: many(responsiblePersons),
}));

export const tenantUsersRelations = relations(tenantUsers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [tenantUsers.tenantId],
    references: [tenants.tenantId],
  }),
  primaryOrganization: one(tenants, {
    fields: [tenantUsers.primaryOrganizationId],
    references: [tenants.tenantId],
  }),
  roleAssignments: many(userRoleAssignments),
  // New relationships for hierarchical organizations and credit system
  memberships: many(organizationMemberships),
  creditUsage: many(creditUsage),
  responsibleFor: many(responsiblePersons),
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
  organization: one(tenants, {
    fields: [customRoles.organizationId],
    references: [tenants.tenantId],
  }),
  parentRole: one(customRoles, {
    fields: [customRoles.parentRoleId],
    references: [customRoles.roleId],
  }),
  userAssignments: many(userRoleAssignments),
  invitations: many(tenantInvitations),
  // New relationships for hierarchical organizations
  memberships: many(organizationMemberships),
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
  organization: one(tenants, {
    fields: [userRoleAssignments.organizationId],
    references: [tenants.tenantId],
  }),
  inheritedFrom: one(userRoleAssignments, {
    fields: [userRoleAssignments.inheritedFrom],
    references: [userRoleAssignments.id],
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

// New relationship definitions for hierarchical organizations and credit system

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  tenant: one(tenants, {
    fields: [organizations.tenantId],
    references: [tenants.tenantId],
  }),
  parentOrganization: one(organizations, {
    fields: [organizations.parentOrganizationId],
    references: [organizations.organizationId],
  }),
  childOrganizations: many(organizations),
  locations: many(organizationLocations),
  relationships: many(organizationRelationships),
  memberships: many(organizationMemberships),
}));

// Temporarily commented out due to Drizzle ORM relation issues
// export const organizationLocationsRelations = relations(organizationLocations, ({ one }) => ({
//   organization: one(organizations, {
//     fields: [organizationLocations.organizationId],
//     references: [organizations.organizationId],
//   }),
//   responsiblePerson: one(tenantUsers, {
//     fields: [organizationLocations.responsiblePersonId],
//     references: [tenantUsers.userId],
//   }),
// }));

// Relations for locations
export const locationsRelations = relations(locations, ({ many, one }) => ({
  tenant: one(tenants, {
    fields: [locations.tenantId],
    references: [tenants.tenantId],
  }),
  assignments: many(locationAssignments),
  resources: many(locationResources),
  usage: many(locationUsage),
  responsiblePerson: one(tenantUsers, {
    fields: [locations.responsiblePersonId],
    references: [tenantUsers.userId],
  }),
}));

// Relations for location assignments
export const locationAssignmentsRelations = relations(locationAssignments, ({ one }) => ({
  location: one(locations, {
    fields: [locationAssignments.locationId],
    references: [locations.locationId],
  }),
  assignedBy: one(tenantUsers, {
    fields: [locationAssignments.assignedBy],
    references: [tenantUsers.userId],
  }),
}));

export const organizationMembershipsRelations = relations(organizationMemberships, ({ many, one }) => ({
  user: one(tenantUsers, {
    fields: [organizationMemberships.userId],
    references: [tenantUsers.userId],
  }),
  tenant: one(tenants, {
    fields: [organizationMemberships.tenantId],
    references: [tenants.tenantId],
  }),
  role: one(customRoles, {
    fields: [organizationMemberships.roleId],
    references: [customRoles.roleId],
  }),
  invitations: many(membershipInvitations),
  history: many(membershipHistory),
}));

export const creditsRelations = relations(credits, ({ many, one }) => ({
  tenant: one(tenants, {
    fields: [credits.tenantId],
    references: [tenants.tenantId],
  }),
  transactions: many(creditTransactions),
  alerts: many(creditAlerts),
}));

export const creditPurchasesRelations = relations(creditPurchases, ({ many, one }) => ({
  tenant: one(tenants, {
    fields: [creditPurchases.tenantId],
    references: [tenants.tenantId],
  }),
  history: many(purchaseHistory),
}));

export const creditTransfersRelations = relations(creditTransfers, ({ many, one }) => ({
  tenant: one(tenants, {
    fields: [creditTransfers.tenantId],
    references: [tenants.tenantId],
  }),
  history: many(transferHistory),
  notifications: many(transferNotifications),
}));

export const creditUsageRelations = relations(creditUsage, ({ one }) => ({
  tenant: one(tenants, {
    fields: [creditUsage.tenantId],
    references: [tenants.tenantId],
  }),
  user: one(tenantUsers, {
    fields: [creditUsage.userId],
    references: [tenantUsers.userId],
  }),
}));

export const responsiblePersonsRelations = relations(responsiblePersons, ({ many, one }) => ({
  tenant: one(tenants, {
    fields: [responsiblePersons.tenantId],
    references: [tenants.tenantId],
  }),
  user: one(tenantUsers, {
    fields: [responsiblePersons.userId],
    references: [tenantUsers.userId],
  }),
  history: many(responsibilityHistory),
  delegations: many(responsibilityDelegations),
  notifications: many(responsibilityNotifications),
})); 