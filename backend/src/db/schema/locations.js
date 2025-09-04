import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer, decimal, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';

// Main locations table (physical/virtual locations)
export const locations = pgTable('locations', {
  locationId: uuid('location_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Location Details
  locationName: varchar('location_name', { length: 255 }).notNull(),
  locationCode: varchar('location_code', { length: 50 }).unique(), // Globally unique code
  locationType: varchar('location_type', { length: 20 }).default('office'), // 'office', 'warehouse', 'retail', 'remote', 'branch'

  // Address Information
  address: jsonb('address').default({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    additionalDetails: ''
  }),
  coordinates: jsonb('coordinates').default({}), // latitude, longitude for mapping

  // Contact Information
  contactPerson: varchar('contact_person', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  emergencyContact: jsonb('emergency_contact').default({}),

  // Operational Details
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  businessHours: jsonb('business_hours').default({
    monday: { open: '09:00', close: '17:00', isOpen: true },
    tuesday: { open: '09:00', close: '17:00', isOpen: true },
    wednesday: { open: '09:00', close: '17:00', isOpen: true },
    thursday: { open: '09:00', close: '17:00', isOpen: true },
    friday: { open: '09:00', close: '17:00', isOpen: true },
    saturday: { open: '09:00', close: '17:00', isOpen: false },
    sunday: { open: '09:00', close: '17:00', isOpen: false }
  }),

  // Capacity & Resources
  capacity: jsonb('capacity').default({
    maxOccupancy: null,
    currentOccupancy: 0,
    resources: {}
  }),

  // Credit System Configuration
  creditAllocation: decimal('credit_allocation', { precision: 15, scale: 4 }).default('0'),
  creditPolicy: jsonb('credit_policy').default({
    allowOverage: true,
    overageLimit: 10000,
    overagePeriod: 'day'
  }),

  // Status & Settings
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false), // Is this the default location for the tenant/organization
  isHeadquarters: boolean('is_headquarters').default(false),
  settings: jsonb('settings').default({
    notifications: true,
    autoBackup: true,
    features: {}
  }),

  // Responsible Person
  responsiblePersonId: uuid('responsible_person_id').references(() => tenantUsers.userId),

  // Metadata
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Location assignments (which organizations/locations use this location)
export const locationAssignments = pgTable('location_assignments', {
  assignmentId: uuid('assignment_id').primaryKey().defaultRandom(),
  locationId: uuid('location_id').references(() => locations.locationId, { onDelete: 'cascade' }).notNull(),

  // Assignment Target
  entityType: varchar('entity_type', { length: 20 }).notNull(), // 'organization', 'tenant'
  entityId: uuid('entity_id').notNull(), // organizationId or tenantId

  // Assignment Details
  assignmentType: varchar('assignment_type', { length: 20 }).default('primary'), // 'primary', 'secondary', 'backup'
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(1), // For ordering multiple assignments

  // Credit Sharing
  creditSharingEnabled: boolean('credit_sharing_enabled').default(false),
  creditSharingPercentage: decimal('credit_sharing_percentage', { precision: 5, scale: 2 }).default('0'),

  // Metadata
  assignedBy: uuid('assigned_by').references(() => tenantUsers.userId).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow(),
});

// Location resources (equipment, assets, etc.)
export const locationResources = pgTable('location_resources', {
  resourceId: uuid('resource_id').primaryKey().defaultRandom(),
  locationId: uuid('location_id').references(() => locations.locationId, { onDelete: 'cascade' }).notNull(),

  // Resource Details
  resourceName: varchar('resource_name', { length: 255 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(), // 'equipment', 'software', 'asset', 'service'
  resourceCode: varchar('resource_code', { length: 50 }),

  // Resource Information
  description: text('description'),
  specifications: jsonb('specifications').default({}),
  quantity: integer('quantity').default(1),
  unit: varchar('unit', { length: 20 }).default('unit'),

  // Cost & Billing
  costPerUnit: decimal('cost_per_unit', { precision: 10, scale: 2 }),
  billingCycle: varchar('billing_cycle', { length: 20 }).default('monthly'), // 'monthly', 'yearly', 'usage'
  creditCost: decimal('credit_cost', { precision: 10, scale: 4 }).default('0'), // Credit cost for usage

  // Status
  isActive: boolean('is_active').default(true),
  isAvailable: boolean('is_available').default(true),
  maintenanceSchedule: jsonb('maintenance_schedule').default({}),

  // Metadata
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Location usage tracking
export const locationUsage = pgTable('location_usage', {
  usageId: uuid('usage_id').primaryKey().defaultRandom(),
  locationId: uuid('location_id').references(() => locations.locationId, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => tenantUsers.userId),

  // Usage Details
  usageType: varchar('usage_type', { length: 50 }).notNull(), // 'check_in', 'check_out', 'resource_usage', 'meeting'
  resourceId: uuid('resource_id').references(() => locationResources.resourceId),

  // Time Tracking
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  duration: integer('duration'), // in minutes

  // Credit Consumption
  creditConsumed: decimal('credit_consumed', { precision: 10, scale: 4 }).default('0'),
  creditBatchId: uuid('credit_batch_id'),

  // Additional Data
  notes: text('notes'),
  metadata: jsonb('metadata').default({}),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
});
