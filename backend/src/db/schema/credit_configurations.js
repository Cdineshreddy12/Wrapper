import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer, decimal, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';

// Credit configuration per operation/module
export const creditConfigurations = pgTable('credit_configurations', {
  configId: uuid('config_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Configuration Target
  operationCode: varchar('operation_code', { length: 255 }).notNull(), // 'crm.leads.create', 'crm.leads.*', 'crm.*'
  entityType: varchar('entity_type', { length: 20 }), // 'global', 'organization', 'location' (NULL = global)
  entityId: uuid('entity_id'), // NULL for global configs

  // Credit Cost Configuration
  creditCost: decimal('credit_cost', { precision: 10, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 20 }).default('operation'), // 'operation', 'record', 'minute', 'MB', 'GB'
  unitMultiplier: decimal('unit_multiplier', { precision: 10, scale: 4 }).default('1'), // How many units per operation

  // Free Allowance
  freeAllowance: integer('free_allowance').default(0),
  freeAllowancePeriod: varchar('free_allowance_period', { length: 20 }).default('month'), // 'day', 'week', 'month', 'year'

  // Volume Pricing Tiers
  volumeTiers: jsonb('volume_tiers').default([]),
  // Example: [
  //   { minVolume: 0, maxVolume: 1000, creditCost: 1.0, discountPercentage: 0 },
  //   { minVolume: 1001, maxVolume: 5000, creditCost: 0.9, discountPercentage: 10 },
  //   { minVolume: 5001, maxVolume: null, creditCost: 0.8, discountPercentage: 20 }
  // ]

  // Overage Configuration
  allowOverage: boolean('allow_overage').default(true),
  overageLimit: integer('overage_limit'), // Max operations per period
  overagePeriod: varchar('overage_period', { length: 20 }).default('day'),
  overageCost: decimal('overage_cost', { precision: 10, scale: 4 }), // Higher cost for overage

  // Scope Configuration
  scope: varchar('scope', { length: 20 }).default('organization'), // 'global', 'organization', 'location'
  isInherited: boolean('is_inherited').default(false), // Can be inherited by child entities

  // Status & Control
  isActive: boolean('is_active').default(true),
  isCustomized: boolean('is_customized').default(false), // True if entity customized from default
  priority: integer('priority').default(0), // For conflicting configurations

  // Audit & Tracking
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

}, (table) => ({
  uniqueCreditConfig: uniqueIndex('unique_credit_config').on(table.operationCode, table.entityType, table.entityId)
}));

// Module-level credit configurations (aggregate settings)
export const moduleCreditConfigurations = pgTable('module_credit_configurations', {
  moduleConfigId: uuid('module_config_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Module Target
  moduleCode: varchar('module_code', { length: 100 }).notNull(), // 'crm.leads', 'hr.payroll'
  entityType: varchar('entity_type', { length: 20 }),
  entityId: uuid('entity_id'),

  // Module-wide Settings
  defaultCreditCost: decimal('default_credit_cost', { precision: 10, scale: 4 }).notNull(),
  defaultUnit: varchar('default_unit', { length: 20 }).default('operation'),

  // Module Limits
  maxOperationsPerPeriod: integer('max_operations_per_period'),
  periodType: varchar('period_type', { length: 20 }).default('month'),
  creditBudget: decimal('credit_budget', { precision: 15, scale: 4 }), // Max credits for this module

  // Operation Overrides
  operationOverrides: jsonb('operation_overrides').default({}),
  // Example: {
  //   'create': { creditCost: 2.0, freeAllowance: 10 },
  //   'update': { creditCost: 1.0, freeAllowance: 50 },
  //   'delete': { creditCost: 0.5, freeAllowance: 25 }
  // }

  // Status
  isActive: boolean('is_active').default(true),
  isCustomized: boolean('is_customized').default(false),

  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Application-level credit configurations
export const appCreditConfigurations = pgTable('app_credit_configurations', {
  appConfigId: uuid('app_config_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Application Target
  appCode: varchar('app_code', { length: 20 }).notNull(), // 'crm', 'hr', 'affiliate'
  entityType: varchar('entity_type', { length: 20 }),
  entityId: uuid('entity_id'),

  // Application-wide Settings
  billingModel: varchar('billing_model', { length: 20 }).default('bulk_then_per_usage'),
  defaultCreditCost: decimal('default_credit_cost', { precision: 10, scale: 4 }).notNull(),
  defaultUnit: varchar('default_unit', { length: 20 }).default('operation'),

  // Application Limits
  maxDailyOperations: integer('max_daily_operations'),
  maxMonthlyOperations: integer('max_monthly_operations'),
  creditBudget: decimal('credit_budget', { precision: 15, scale: 4 }),

  // Premium Features
  premiumFeatures: jsonb('premium_features').default({}),
  // Example: {
  //   'advanced_reporting': { enabled: true, creditCost: 5.0 },
  //   'api_access': { enabled: true, creditCost: 10.0 },
  //   'white_label': { enabled: false, creditCost: 50.0 }
  // }

  // Module Defaults
  moduleDefaults: jsonb('module_defaults').default({}),
  // Example: {
  //   'leads': { creditCost: 1.0, freeAllowance: 100 },
  //   'accounts': { creditCost: 1.5, freeAllowance: 50 },
  //   'opportunities': { creditCost: 2.0, freeAllowance: 25 }
  // }

  // Status
  isActive: boolean('is_active').default(true),
  isCustomized: boolean('is_customized').default(false),

  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Global credit configuration templates
export const creditConfigurationTemplates = pgTable('credit_configuration_templates', {
  templateId: uuid('template_id').primaryKey().defaultRandom(),

  // Template Details
  templateName: varchar('template_name', { length: 100 }).notNull(),
  templateCode: varchar('template_code', { length: 50 }).notNull().unique(),
  description: text('description'),

  // Template Category
  category: varchar('category', { length: 50 }).default('standard'), // 'starter', 'professional', 'enterprise'
  isDefault: boolean('is_default').default(false),

  // Configuration Data
  appConfigurations: jsonb('app_configurations').default({}),
  moduleConfigurations: jsonb('module_configurations').default({}),
  operationConfigurations: jsonb('operation_configurations').default({}),

  // Template Metadata
  version: varchar('version', { length: 20 }).default('1.0'),
  isActive: boolean('is_active').default(true),

  // Usage Tracking
  usageCount: integer('usage_count').default(0),
  lastUsed: timestamp('last_used'),

  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Configuration change history
export const configurationChangeHistory = pgTable('configuration_change_history', {
  changeId: uuid('change_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Change Context
  configType: varchar('config_type', { length: 30 }).notNull(), // 'operation', 'module', 'app', 'template'
  configId: uuid('config_id'), // Reference to the configuration that changed
  operationCode: varchar('operation_code', { length: 255 }), // For operation-level changes

  // Entity Context
  entityType: varchar('entity_type', { length: 20 }),
  entityId: uuid('entity_id'),

  // Change Details
  changeType: varchar('change_type', { length: 50 }).notNull(), // 'create', 'update', 'delete', 'activate', 'deactivate'
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changeReason: text('change_reason'),

  // Impact Assessment
  affectedEntities: jsonb('affected_entities').default([]), // Which entities are affected
  estimatedImpact: jsonb('estimated_impact').default({}), // Revenue, usage impact

  // Rollback Support
  canRollback: boolean('can_rollback').default(true),
  rollbackData: jsonb('rollback_data'),

  // Audit
  changedBy: uuid('changed_by').references(() => tenantUsers.userId).notNull(),
  changedAt: timestamp('changed_at').defaultNow(),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});
