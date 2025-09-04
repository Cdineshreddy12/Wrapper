import { pgTable, uuid, varchar, timestamp, jsonb, boolean, text, integer, decimal, date } from 'drizzle-orm/pg-core';
import { tenantUsers } from './users.js';

// Main tenants table
export const tenants = pgTable('tenants', {

  //phase of extracting data from users
  tenantId: uuid('tenant_id').primaryKey().defaultRandom(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).notNull().unique(),
  kindeOrgId: varchar('kinde_org_id', { length: 255 }).notNull().unique(),
  adminEmail: varchar('admin_email', { length: 255 }).notNull(),
  
  // Enhanced Company Profile Fields
  legalCompanyName: varchar('legal_company_name', { length: 255 }),
  gstin: varchar('gstin', { length: 15 }),
  dunsNumber: varchar('duns_number', { length: 50 }),
  companyType: varchar('company_type', { length: 100 }),
  ownership: varchar('ownership', { length: 100 }),
  annualRevenue: decimal('annual_revenue', { precision: 15, scale: 2 }),
  numberOfEmployees: integer('number_of_employees'),
  tickerSymbol: varchar('ticker_symbol', { length: 20 }),
  website: varchar('website', { length: 500 }),
  companyDescription: text('company_description'),
  foundedDate: date('founded_date'),
  
  // Contact & Address Fields
  billingStreet: varchar('billing_street', { length: 255 }),
  billingCity: varchar('billing_city', { length: 100 }),
  billingState: varchar('billing_state', { length: 100 }),
  billingZip: varchar('billing_zip', { length: 20 }),
  billingCountry: varchar('billing_country', { length: 100 }),
  shippingStreet: varchar('shipping_street', { length: 255 }),
  shippingCity: varchar('shipping_city', { length: 100 }),
  shippingState: varchar('shipping_state', { length: 100 }),
  shippingZip: varchar('shipping_zip', { length: 20 }),
  shippingCountry: varchar('shipping_country', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  fax: varchar('fax', { length: 50 }),
  
  // Localization Settings
  defaultLanguage: varchar('default_language', { length: 10 }).default('en'),
  defaultLocale: varchar('default_locale', { length: 20 }).default('en-US'),
  defaultCurrency: varchar('default_currency', { length: 3 }).default('USD'),
  multiCurrencyEnabled: boolean('multi_currency_enabled').default(false),
  advancedCurrencyManagement: boolean('advanced_currency_management').default(false),
  defaultTimeZone: varchar('default_timezone', { length: 50 }).default('UTC'),
  firstDayOfWeek: integer('first_day_of_week').default(1),
  
  // Branding & Customization
  logo: varchar('logo', { length: 500 }), // Alias for logoUrl
  logoUrl: varchar('logo_url', { length: 500 }),
  primaryColor: varchar('primary_color', { length: 7 }).default('#2563eb'),
  customDomain: varchar('custom_domain', { length: 255 }),
  customBranding: jsonb('custom_branding').default({}), // Organization-specific branding
  brandingConfig: jsonb('branding_config').default({}), // Custom CSS, fonts, etc.
  

  //redudant fields
  // Business Details
  companySize: varchar('company_size', { length: 50 }), // 'startup', 'small', 'medium', 'enterprise'
  industry: varchar('industry', { length: 100 }),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  country: varchar('country', { length: 100 }),
  
  // Organization Hierarchy Fields
  parentOrganizationId: uuid('parent_organization_id').references(() => tenants.tenantId),
  organizationType: varchar('organization_type', { length: 20 }).default('standalone'), // 'parent', 'sub', 'standalone'
  defaultLocationId: uuid('default_location_id'),
  responsiblePersonId: uuid('responsible_person_id').references(() => tenantUsers.userId),

  // Credit System Fields
  creditBalance: decimal('credit_balance', { precision: 15, scale: 4 }).default('0'),
  creditExpiryPolicy: jsonb('credit_expiry_policy').default({
    expiryEnabled: true,
    defaultExpiryDays: 365,
    autoRenewal: false,
    notificationDays: [30, 7, 1]
  }),

  // Status & Settings
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  trialEndsAt: timestamp('trial_ends_at'),
  settings: jsonb('settings').default({}), // Dashboard preferences, notifications, etc.

  // Stripe Integration
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }), // Stripe customer ID for billing
  
  // Enhanced Onboarding & Setup Tracking
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingStep: varchar('onboarding_step', { length: 50 }), // 'account-setup', 'team-setup', 'integration', 'completed'
  onboardingProgress: jsonb('onboarding_progress').default({}), // Track completed steps and progress
  onboardedAt: timestamp('onboarded_at'), // When onboarding was completed
  onboardingStartedAt: timestamp('onboarding_started_at'), // When tenant first started onboarding
  setupCompletionRate: integer('setup_completion_rate').default(0), // Percentage of setup completed (0-100)

  // Phase-specific onboarding tracking for scalability
  trialOnboardingCompleted: boolean('trial_onboarding_completed').default(false),
  trialOnboardingCompletedAt: timestamp('trial_onboarding_completed_at'),
  upgradeOnboardingCompleted: boolean('upgrade_onboarding_completed').default(false),
  upgradeOnboardingCompletedAt: timestamp('upgrade_onboarding_completed_at'),
  profileOnboardingCompleted: boolean('profile_onboarding_completed').default(false),
  profileOnboardingCompletedAt: timestamp('profile_onboarding_completed_at'),

  // Onboarding phases tracking (JSONB for flexibility)
  onboardingPhases: jsonb('onboarding_phases').default({
    trial: { completed: false, completedAt: null, skipped: false },
    profile: { completed: false, completedAt: null, skipped: false },
    upgrade: { completed: false, completedAt: null, skipped: false },
    team: { completed: false, completedAt: null, skipped: false },
    integration: { completed: false, completedAt: null, skipped: false }
  }),

  // User journey analytics
  userJourney: jsonb('user_journey').default([]), // Array of journey events
  onboardingVariant: varchar('onboarding_variant', { length: 50 }), // For A/B testing
  
  // Trial & Subscription Tracking  
  trialStartedAt: timestamp('trial_started_at'), // When trial actually started
  trialStatus: varchar('trial_status', { length: 20 }).default('active'), // 'active', 'expired', 'canceled', 'upgraded'
  subscriptionStatus: varchar('subscription_status', { length: 20 }).default('trial'), // 'trial', 'active', 'canceled', 'past_due'
  
  // Feature Usage & Adoption
  featuresEnabled: jsonb('features_enabled').default({}), // Track which features are enabled
  firstLoginAt: timestamp('first_login_at'), // When admin first logged in
  lastActivityAt: timestamp('last_activity_at'),
  
  // Setup & Configuration
  initialSetupData: jsonb('initial_setup_data').default({}), // Store initial setup choices
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});



// Tenant invitations for team members
export const tenantInvitations = pgTable('tenant_invitations', {
  invitationId: uuid('invitation_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  roleId: uuid('role_id'), // Reference to role they'll get
  invitedBy: uuid('invited_by').notNull(),
  invitationToken: varchar('invitation_token', { length: 255 }).notNull().unique(),
  invitationUrl: varchar('invitation_url', { length: 1000 }), // Full invitation URL for easy access
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'accepted', 'expired', 'cancelled'
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: uuid('cancelled_by'), // Who cancelled the invitation
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Onboarding events tracking for analytics and scalability
export const onboardingEvents = pgTable('onboarding_events', {
  eventId: uuid('event_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),

  // Event details
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'trial_onboarding_started', 'trial_onboarding_completed', 'upgrade_onboarding_started', etc.
  eventPhase: varchar('event_phase', { length: 50 }).notNull(), // 'trial', 'profile', 'upgrade', 'team', 'integration'
  eventAction: varchar('event_action', { length: 50 }).notNull(), // 'started', 'completed', 'skipped', 'abandoned'

  // Context and metadata
  userId: uuid('user_id'), // Which user performed the action
  sessionId: varchar('session_id', { length: 255 }), // For session tracking
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4/IPv6
  userAgent: text('user_agent'), // Browser/device info

  // Event data
  eventData: jsonb('event_data').default({}), // Flexible data storage for event-specific info
  metadata: jsonb('metadata').default({}), // Additional metadata

  // Analytics fields
  timeSpent: integer('time_spent'), // Time spent on this phase/step in seconds
  completionRate: integer('completion_rate'), // Completion percentage at this point
  stepNumber: integer('step_number'), // Which step in the phase
  totalSteps: integer('total_steps'), // Total steps in this phase

  // A/B testing and variants
  variantId: varchar('variant_id', { length: 50 }), // A/B test variant
  experimentId: varchar('experiment_id', { length: 50 }), // Which experiment this event belongs to

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  eventTimestamp: timestamp('event_timestamp').defaultNow() // When the event actually occurred
}); 