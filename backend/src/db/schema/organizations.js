import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer, text, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { tenantUsers } from './users.js';

// Organization hierarchy management (extends tenants for complex hierarchies)
export const organizations = pgTable('organizations', {
  organizationId: uuid('organization_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Hierarchy Structure
  parentOrganizationId: uuid('parent_organization_id').references(() => organizations.organizationId),
  organizationLevel: integer('organization_level').default(1), // 1 = root, 2 = sub-org, etc.
  hierarchyPath: text('hierarchy_path'), // e.g., "root.sub1.sub2" for efficient queries

  // Organization Details
  organizationName: varchar('organization_name', { length: 255 }).notNull(),
  organizationCode: varchar('organization_code', { length: 50 }).unique(), // Unique code for identification
  description: text('description'),

  // Organization Type and Status
  organizationType: varchar('organization_type', { length: 20 }).default('business_unit'), // 'business_unit', 'department', 'division', 'subsidiary'
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false), // Is this the default organization for the tenant

  // Contact & Address (inherited from tenant but overridable)
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  address: jsonb('address').default({}), // Street, city, state, zip, country

  // Credit System Configuration
  creditPolicy: jsonb('credit_policy').default({
    allowCreditAllocation: true,
    maxCreditAllocation: null, // NULL = unlimited
    creditExpiryPolicy: {
      enabled: true,
      defaultDays: 365
    }
  }),

  // Responsible Person
  responsiblePersonId: uuid('responsible_person_id').references(() => tenantUsers.userId),

  // Settings & Configuration
  settings: jsonb('settings').default({
    timezone: 'UTC',
    currency: 'USD',
    language: 'en',
    features: {}
  }),

  // Metadata
  createdBy: uuid('created_by').references(() => tenantUsers.userId), // Made nullable for onboarding flow
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Organization locations (separate from main locations table for hierarchy)
export const organizationLocations = pgTable('organization_locations', {
  locationId: uuid('location_id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.organizationId, { onDelete: 'cascade' }).notNull(),

  // Location Details
  locationName: varchar('location_name', { length: 255 }).notNull(),
  locationCode: varchar('location_code', { length: 50 }), // Unique within organization
  locationType: varchar('location_type', { length: 20 }).default('office'), // 'office', 'warehouse', 'retail', 'remote'

  // Address
  address: jsonb('address').default({}), // Full address details
  coordinates: jsonb('coordinates').default({}), // latitude, longitude

  // Contact Information
  contactPerson: varchar('contact_person', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),

  // Status & Settings
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false), // Is this the default location for the organization
  timezone: varchar('timezone', { length: 50 }).default('UTC'),

  // Credit Configuration
  creditAllocation: decimal('credit_allocation', { precision: 15, scale: 4 }).default('0'),

  // Responsible Person
  responsiblePersonId: uuid('responsible_person_id').references(() => tenantUsers.userId),

  // Metadata
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  updatedBy: uuid('updated_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Organization hierarchy relationships
export const organizationRelationships = pgTable('organization_relationships', {
  relationshipId: uuid('relationship_id').primaryKey().defaultRandom(),
  parentOrganizationId: uuid('parent_organization_id').references(() => organizations.organizationId, { onDelete: 'cascade' }).notNull(),
  childOrganizationId: uuid('child_organization_id').references(() => organizations.organizationId, { onDelete: 'cascade' }).notNull(),

  // Relationship Details
  relationshipType: varchar('relationship_type', { length: 20 }).default('parent_child'), // 'parent_child', 'sibling', 'partner'
  isActive: boolean('is_active').default(true),

  // Credit Sharing (if applicable)
  creditSharingEnabled: boolean('credit_sharing_enabled').default(false),
  creditSharingLimit: decimal('credit_sharing_limit', { precision: 15, scale: 4 }),

  // Metadata
  createdBy: uuid('created_by').references(() => tenantUsers.userId).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
