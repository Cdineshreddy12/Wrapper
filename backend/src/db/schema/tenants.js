import { pgTable, uuid, varchar, timestamp, jsonb, boolean, text, integer } from 'drizzle-orm/pg-core';
import { tenantUsers } from './users.js';

// Main tenants table
export const tenants = pgTable('tenants', {
  tenantId: uuid('tenant_id').primaryKey().defaultRandom(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).notNull().unique(),
  kindeOrgId: varchar('kinde_org_id', { length: 255 }).notNull().unique(),
  adminEmail: varchar('admin_email', { length: 255 }).notNull(),
  
  // Branding & Customization
  logo: varchar('logo', { length: 500 }), // Alias for logoUrl
  logoUrl: varchar('logo_url', { length: 500 }),
  primaryColor: varchar('primary_color', { length: 7 }).default('#2563eb'),
  customDomain: varchar('custom_domain', { length: 255 }),
  customBranding: jsonb('custom_branding').default({}), // Organization-specific branding
  brandingConfig: jsonb('branding_config').default({}), // Custom CSS, fonts, etc.
  
  // Business Details
  companySize: varchar('company_size', { length: 50 }), // 'startup', 'small', 'medium', 'enterprise'
  industry: varchar('industry', { length: 100 }),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  country: varchar('country', { length: 100 }),
  
  // Status & Settings
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  trialEndsAt: timestamp('trial_ends_at'),
  settings: jsonb('settings').default({}), // Dashboard preferences, notifications, etc.
  
  // Stripe Integration
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }), // Stripe customer ID for billing
  
  // Onboarding & Setup Tracking
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingStep: varchar('onboarding_step', { length: 50 }), // 'account-setup', 'team-setup', 'integration', 'completed'
  onboardingProgress: jsonb('onboarding_progress').default({}), // Track completed steps and progress
  onboardedAt: timestamp('onboarded_at'), // When onboarding was completed
  onboardingStartedAt: timestamp('onboarding_started_at'), // When tenant first started onboarding
  setupCompletionRate: integer('setup_completion_rate').default(0), // Percentage of setup completed (0-100)
  
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