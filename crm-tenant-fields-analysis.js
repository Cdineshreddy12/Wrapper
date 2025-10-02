/**
 * CRM TENANT FIELDS ANALYSIS
 * Which fields from the tenants table should be stored in the CRM
 */

const crmTenantFieldsAnalysis = {
  // ============================================================================
  // TENANTS TABLE STRUCTURE ANALYSIS
  // ============================================================================
  tenantsTableFields: {
    // IDENTIFIERS
    tenant_id: "uuid PRIMARY KEY - Unique tenant identifier",
    company_name: "varchar(255) NOT NULL - Company name",
    subdomain: "varchar(100) NOT NULL - Subdomain for tenant",
    kinde_org_id: "varchar(255) NOT NULL - Kinde organization ID",

    // CONTACT INFORMATION
    admin_email: "varchar(255) NOT NULL - Admin email",
    legal_company_name: "varchar(255) - Legal company name",
    website: "varchar(500) - Company website",

    // BILLING ADDRESS
    billing_street: "varchar(255) - Billing street address",
    billing_city: "varchar(100) - Billing city",
    billing_state: "varchar(100) - Billing state/province",
    billing_zip: "varchar(20) - Billing postal code",
    billing_country: "varchar(100) - Billing country",

    // COMPANY DETAILS
    gstin: "varchar(15) - GST identification number",
    company_type: "varchar(100) - Type of company",
    industry: "varchar(100) - Industry sector",
    phone: "varchar(50) - Phone number",

    // LOCALIZATION
    default_language: "varchar(10) DEFAULT 'en'",
    default_locale: "varchar(20) DEFAULT 'en-US'",
    default_currency: "varchar(3) DEFAULT 'USD'",
    default_timezone: "varchar(50) DEFAULT 'UTC'",

    // BRANDING
    logo_url: "varchar(500) - Logo URL",
    primary_color: "varchar(7) DEFAULT '#2563eb'",
    custom_domain: "varchar(255) - Custom domain",
    branding_config: "jsonb DEFAULT '{}'::jsonb - Branding configuration",

    // STATUS
    is_active: "boolean DEFAULT true - Active status",
    is_verified: "boolean DEFAULT false - Verification status",

    // SETTINGS
    settings: "jsonb DEFAULT '{}'::jsonb - General settings",

    // PAYMENT PROCESSING
    stripe_customer_id: "varchar(255) - Stripe customer ID",

    // ONBOARDING & TRIAL
    onboarding_completed: "boolean DEFAULT false",
    onboarded_at: "timestamp - Onboarding completion date",
    onboarding_started_at: "timestamp - Onboarding start date",
    trial_ends_at: "timestamp - Trial end date",
    trial_started_at: "timestamp - Trial start date",

    // ACTIVITY
    first_login_at: "timestamp - First login timestamp",
    last_activity_at: "timestamp - Last activity timestamp",

    // AUDIT
    created_at: "timestamp DEFAULT now()",
    updated_at: "timestamp DEFAULT now()"
  },

  // ============================================================================
  // CRM RELEVANT FIELDS - WHAT TO STORE
  // ============================================================================
  crmRelevantFields: {
    // CRITICAL FOR CRM - MUST STORE
    critical: {
      tenant_id: "uuid REFERENCES tenants(tenant_id) - Primary key, foreign key",
      company_name: "varchar(255) NOT NULL - Essential for CRM display",
      subdomain: "varchar(100) - For tenant identification",
      admin_email: "varchar(255) - Primary contact for CRM",
      is_active: "boolean - CRM needs to know active status",
      is_verified: "boolean - Verification status for trust",
      industry: "varchar(100) - Industry classification for CRM segmentation"
    },

    // IMPORTANT FOR CRM - SHOULD STORE
    important: {
      legal_company_name: "varchar(255) - Legal name for contracts",
      website: "varchar(500) - Website for lead enrichment",
      billing_country: "varchar(100) - Country for regional analysis",
      company_type: "varchar(100) - Company type classification",
      phone: "varchar(50) - Phone contact",
      default_currency: "varchar(3) - Currency for pricing",
      default_timezone: "varchar(50) - Timezone for scheduling",
      logo_url: "varchar(500) - Logo for CRM interface",
      primary_color: "varchar(7) - Brand color for customization",
      last_activity_at: "timestamp - Last activity for engagement tracking",
      created_at: "timestamp - Account creation date"
    },

    // OPTIONAL FOR CRM - NICE TO HAVE
    optional: {
      billing_city: "varchar(100) - City for location analysis",
      billing_state: "varchar(100) - State for regional analysis",
      default_language: "varchar(10) - Language preference",
      default_locale: "varchar(20) - Locale settings",
      custom_domain: "varchar(255) - Custom domain for branding",
      branding_config: "jsonb - Additional branding settings",
      settings: "jsonb - General tenant settings",
      gstin: "varchar(15) - Tax ID for compliance"
    }
  },

  // ============================================================================
  // FIELDS TO EXCLUDE FROM CRM
  // ============================================================================
  excludeFromCrm: {
    // AUTHENTICATION - Handled by wrapper
    kinde_org_id: "varchar(255) - Authentication handled by wrapper",

    // PAYMENT PROCESSING - Handled by wrapper
    stripe_customer_id: "varchar(255) - Payment processing by wrapper",

    // ONBOARDING - Internal wrapper process
    onboarding_completed: "boolean - Internal onboarding status",
    onboarded_at: "timestamp - Internal onboarding date",
    onboarding_started_at: "timestamp - Internal onboarding start",

    // TRIAL MANAGEMENT - Handled by wrapper
    trial_ends_at: "timestamp - Trial management by wrapper",
    trial_started_at: "timestamp - Trial management by wrapper",

    // DETAILED ADDRESS - Not needed for CRM core
    billing_street: "varchar(255) - Detailed address not needed",
    billing_zip: "varchar(20) - Zip code not critical",

    // ACTIVITY TRACKING - Internal wrapper metrics
    first_login_at: "timestamp - Internal activity tracking",

    // AUDIT - Internal wrapper field
    updated_at: "timestamp - Internal audit field"
  },

  // ============================================================================
  // FINAL CRM TENANT FIELDS - MINIMAL SCHEMA
  // ============================================================================
  finalCrmTenantFields: {
    // PRIMARY FIELDS (13 fields)
    tenant_id: "uuid PRIMARY KEY REFERENCES tenants(tenant_id)",
    company_name: "varchar(255) NOT NULL",
    subdomain: "varchar(100) NOT NULL",
    admin_email: "varchar(255) NOT NULL",
    is_active: "boolean DEFAULT true",
    is_verified: "boolean DEFAULT false",
    industry: "varchar(100)",

    // CONTACT & LEGAL (5 fields)
    legal_company_name: "varchar(255)",
    website: "varchar(500)",
    phone: "varchar(50)",
    billing_country: "varchar(100)",

    // BUSINESS INFO (4 fields)
    company_type: "varchar(100)",
    default_currency: "varchar(3) DEFAULT 'USD'",
    default_timezone: "varchar(50) DEFAULT 'UTC'",

    // BRANDING (2 fields)
    logo_url: "varchar(500)",
    primary_color: "varchar(7) DEFAULT '#2563eb'",

    // ACTIVITY (1 field)
    last_activity_at: "timestamp",

    // AUDIT (1 field)
    created_at: "timestamp DEFAULT NOW()",

    // TOTAL: 27 fields (down from 38 tenant fields)
    field_count: 27,
    excluded_fields: 11
  },

  // ============================================================================
  // CRM TENANT TABLE SCHEMA
  // ============================================================================
  crmTenantTableSchema: `
  CREATE TABLE crm_tenants (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(tenant_id),
    company_name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    industry VARCHAR(100),

    -- Contact & Legal
    legal_company_name VARCHAR(255),
    website VARCHAR(500),
    phone VARCHAR(50),
    billing_country VARCHAR(100),

    -- Business Info
    company_type VARCHAR(100),
    default_currency VARCHAR(3) DEFAULT 'USD',
    default_timezone VARCHAR(50) DEFAULT 'UTC',

    -- Branding
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#2563eb',

    -- Activity
    last_activity_at TIMESTAMP,

    -- Audit
    created_at TIMESTAMP DEFAULT NOW()
  );
  `,

  // ============================================================================
  // JUSTIFICATION
  // ============================================================================
  justification: {
    approach: "Store only CRM-relevant tenant data, fetch rest from wrapper",
    benefits: [
      "✅ Zero redundancy - no duplicate storage",
      "✅ CRM-focused - only fields needed for CRM operations",
      "✅ Performance - smaller table, faster queries",
      "✅ Maintenance - single source of truth for tenant data",
      "✅ Flexibility - CRM can evolve independently"
    ],

    dataFlow: [
      "1. CRM stores minimal tenant profile (27 fields)",
      "2. CRM fetches detailed data from wrapper when needed",
      "3. CRM caches frequently used data (logo, branding)",
      "4. CRM syncs status fields (active, verified) periodically"
    ]
  },

  // ============================================================================
  // SYNCHRONIZATION STRATEGY
  // ============================================================================
  syncStrategy: {
    initialSync: "Copy 27 fields from tenants table on CRM setup",
    realTimeSync: [
      "is_active - Real-time sync for security",
      "is_verified - Real-time sync for trust indicators",
      "company_name - Sync on changes",
      "admin_email - Sync on changes"
    ],
    periodicSync: [
      "last_activity_at - Daily sync for engagement metrics",
      "industry - Weekly sync for segmentation updates"
    ],
    onDemandSync: [
      "logo_url - Sync when needed for display",
      "branding_config - Sync when needed for theming"
    ]
  }
};

module.exports = { crmTenantFieldsAnalysis };
