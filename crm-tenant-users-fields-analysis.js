/**
 * CRM TENANT USERS FIELDS ANALYSIS
 * Which fields from the tenant_users table should be stored in the CRM
 */

const crmTenantUsersFieldsAnalysis = {
  // ============================================================================
  // TENANT_USERS TABLE STRUCTURE ANALYSIS (32 fields total)
  // ============================================================================
  tenantUsersTableFields: {
    // IDENTIFIERS
    user_id: "uuid PRIMARY KEY - Unique user identifier",
    tenant_id: "uuid NOT NULL - Tenant association",
    kinde_user_id: "varchar(255) - Kinde authentication ID",

    // BASIC PROFILE
    email: "varchar(255) NOT NULL - Primary email",
    name: "varchar(255) NOT NULL - Full display name",
    first_name: "varchar(100) - First name",
    last_name: "varchar(100) - Last name",
    username: "varchar(100) - Username/handle",

    // CONTACT & AVATAR
    avatar: "varchar(500) - Profile picture URL",
    phone: "varchar(50) - Phone number",
    mobile: "varchar(50) - Mobile number",

    // JOB INFORMATION
    title: "varchar(100) - Job title",
    department: "varchar(100) - Department name",
    alias: "varchar(100) - Display alias",

    // ORGANIZATIONAL
    primary_organization_id: "uuid - Primary organization (references tenants)",
    is_responsible_person: "boolean DEFAULT false - Responsible person status",
    admin_privileges: "jsonb DEFAULT '{}'::jsonb - Admin permissions",

    // STATUS
    is_active: "boolean DEFAULT true - Active status",
    is_verified: "boolean DEFAULT false - Email verification",
    is_tenant_admin: "boolean DEFAULT false - Tenant admin status",

    // PROFILE DATA
    profile_data: "jsonb DEFAULT '{}'::jsonb - Extended profile data",

    // INVITATION & ONBOARDING
    invited_at: "timestamp - Invitation timestamp",
    onboarding_completed: "boolean DEFAULT false - Onboarding status",
    onboarding_step: "varchar(50) - Current onboarding step",

    // ACTIVITY & ENGAGEMENT
    last_active_at: "timestamp - Last activity timestamp",
    last_login_at: "timestamp - Last login timestamp",
    login_count: "integer DEFAULT 0 - Total login count",

    // PREFERENCES
    preferences: "jsonb DEFAULT '{}'::jsonb - User preferences",

    // AUDIT
    created_at: "timestamp DEFAULT now() - Account creation",
    updated_at: "timestamp DEFAULT now() - Last update"
  },

  // ============================================================================
  // CRM RELEVANT FIELDS - WHAT TO STORE
  // ============================================================================
  crmRelevantFields: {
    // CRITICAL FOR CRM - MUST STORE
    critical: {
      user_id: "uuid PRIMARY KEY REFERENCES tenant_users(user_id)",
      tenant_id: "uuid NOT NULL REFERENCES tenants(tenant_id)",
      email: "varchar(255) NOT NULL - Essential for CRM operations",
      name: "varchar(255) NOT NULL - Display name for CRM",
      is_active: "boolean - User active status",
      title: "varchar(100) - Job title for CRM",
      department: "varchar(100) - Department for organization"
    },

    // IMPORTANT FOR CRM - SHOULD STORE
    important: {
      first_name: "varchar(100) - For personalization",
      last_name: "varchar(100) - For personalization",
      avatar: "varchar(500) - Profile picture for CRM interface",
      phone: "varchar(50) - Contact information",
      mobile: "varchar(50) - Mobile contact",
      primary_organization_id: "uuid - Primary org for CRM scoping",
      is_tenant_admin: "boolean - Admin status for permissions",
      last_active_at: "timestamp - Engagement tracking",
      created_at: "timestamp - User join date"
    },

    // OPTIONAL FOR CRM - NICE TO HAVE
    optional: {
      username: "varchar(100) - Alternative identifier",
      alias: "varchar(100) - Display alias",
      profile_data: "jsonb - Extended profile information",
      preferences: "jsonb - UI preferences"
    }
  },

  // ============================================================================
  // FIELDS TO EXCLUDE FROM CRM
  // ============================================================================
  excludeFromCrm: {
    // AUTHENTICATION - Handled by wrapper
    kinde_user_id: "varchar(255) - Authentication handled by wrapper",

    // INTERNAL PERMISSIONS - Handled by wrapper
    is_responsible_person: "boolean - Internal responsibility status",
    admin_privileges: "jsonb - Admin permissions handled by wrapper",

    // VERIFICATION - Handled by wrapper
    is_verified: "boolean - Email verification handled by wrapper",

    // ONBOARDING - Internal wrapper process
    invited_at: "timestamp - Invitation tracking",
    onboarding_completed: "boolean - Onboarding status",
    onboarding_step: "varchar(50) - Onboarding progress",

    // ACTIVITY METRICS - Internal wrapper metrics
    last_login_at: "timestamp - Login tracking",
    login_count: "integer - Usage metrics",

    // AUDIT - Internal wrapper field
    updated_at: "timestamp - Internal audit field"
  },

  // ============================================================================
  // FINAL CRM TENANT USERS FIELDS - MINIMAL SCHEMA
  // ============================================================================
  finalCrmTenantUsersFields: {
    // PRIMARY FIELDS (7 fields)
    user_id: "uuid PRIMARY KEY REFERENCES tenant_users(user_id)",
    tenant_id: "uuid NOT NULL REFERENCES tenants(tenant_id)",
    email: "varchar(255) NOT NULL",
    name: "varchar(255) NOT NULL",
    is_active: "boolean DEFAULT true",
    title: "varchar(100)",
    department: "varchar(100)",

    // CONTACT & PROFILE (8 fields)
    first_name: "varchar(100)",
    last_name: "varchar(100)",
    avatar: "varchar(500)",
    phone: "varchar(50)",
    mobile: "varchar(50)",
    primary_organization_id: "uuid REFERENCES entities(entity_id)",
    is_tenant_admin: "boolean DEFAULT false",

    // ACTIVITY (2 fields)
    last_active_at: "timestamp",
    created_at: "timestamp DEFAULT NOW()",

    // TOTAL: 17 fields (down from 32 tenant_users fields)
    field_count: 17,
    excluded_fields: 15
  },

  // ============================================================================
  // CRM TENANT USERS TABLE SCHEMA
  // ============================================================================
  crmTenantUsersTableSchema: `
  CREATE TABLE crm_tenant_users (
    user_id UUID PRIMARY KEY REFERENCES tenant_users(user_id),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    title VARCHAR(100),
    department VARCHAR(100),

    -- Contact & Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar VARCHAR(500),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    primary_organization_id UUID REFERENCES entities(entity_id),
    is_tenant_admin BOOLEAN DEFAULT false,

    -- Activity
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );
  `,

  // ============================================================================
  // RELATIONSHIP TO CRM EMPLOYEE PROFILES
  // ============================================================================
  relationshipToEmployeeProfiles: {
    explanation: "CRM tenant_users provides basic user info, while crm_employee_profiles adds CRM-specific data",
    crmTenantUsers: "Basic user identity and contact info",
    crmEmployeeProfiles: "CRM-specific roles, permissions, settings, and overrides",

    integration: `
    -- CRM can join these tables for complete employee view
    SELECT
      ctu.*,
      cep.employee_id,
      cep.manager_user_id,
      cep.crm_permissions,
      cep.crm_settings
    FROM crm_tenant_users ctu
    LEFT JOIN crm_employee_profiles cep ON ctu.user_id = cep.user_id
    WHERE ctu.tenant_id = $1;
    `
  },

  // ============================================================================
  // JUSTIFICATION
  // ============================================================================
  justification: {
    approach: "Store basic user profile data needed for CRM operations, keep authentication and detailed permissions in wrapper",
    benefits: [
      "✅ Zero redundancy - no duplicate authentication data",
      "✅ CRM-focused - only fields needed for CRM user management",
      "✅ Performance - smaller table for CRM queries",
      "✅ Security - sensitive auth data stays in wrapper",
      "✅ Integration - easy to join with CRM-specific employee data"
    ],

    dataFlow: [
      "1. CRM stores basic user profile (17 fields)",
      "2. CRM fetches authentication status from wrapper",
      "3. CRM gets detailed permissions from wrapper when needed",
      "4. CRM syncs activity data periodically"
    ]
  },

  // ============================================================================
  // SYNCHRONIZATION STRATEGY
  // ============================================================================
  syncStrategy: {
    initialSync: "Copy 17 fields from tenant_users table on CRM setup",
    realTimeSync: [
      "is_active - Real-time sync for security",
      "name - Sync on profile updates",
      "email - Sync on email changes",
      "title - Sync on job changes",
      "department - Sync on department changes"
    ],
    periodicSync: [
      "last_active_at - Daily sync for engagement metrics",
      "avatar - Weekly sync for profile updates"
    ],
    onDemandSync: [
      "profile_data - Sync when needed for extended info",
      "preferences - Sync when needed for UI customization"
    ]
  },

  // ============================================================================
  // INDEXES NEEDED FOR PERFORMANCE
  // ============================================================================
  requiredIndexes: [
    "CREATE INDEX idx_crm_tenant_users_tenant ON crm_tenant_users(tenant_id);",
    "CREATE INDEX idx_crm_tenant_users_email ON crm_tenant_users(email);",
    "CREATE INDEX idx_crm_tenant_users_active ON crm_tenant_users(tenant_id, is_active);",
    "CREATE INDEX idx_crm_tenant_users_org ON crm_tenant_users(primary_organization_id);",
    "CREATE INDEX idx_crm_tenant_users_activity ON crm_tenant_users(last_active_at);"
  ]
};

module.exports = { crmTenantUsersFieldsAnalysis };
