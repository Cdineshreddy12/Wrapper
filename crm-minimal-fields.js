/**
 * CRM Minimal Fields - No Redundancy Implementation
 * Exact fields to use for each CRM component
 */

const crmMinimalFields = {
  // ============================================================================
  // CREDIT CONFIGURATION - MINIMAL FIELDS (15 fields total)
  // ============================================================================
  creditConfiguration: {
    table: "crm_credit_configs",
    fields: {
      // Primary identifiers
      config_id: "uuid PRIMARY KEY", // Unique config identifier
      tenant_id: "uuid REFERENCES tenants(tenant_id)", // Links to tenant

      // Basic configuration
      config_name: "varchar(100) NOT NULL", // 'basic_plan', 'enterprise_plan'
      credit_limit: "integer NOT NULL", // Total credits allowed
      reset_period: "varchar(20) DEFAULT 'monthly'", // 'daily', 'weekly', 'monthly', 'never'
      reset_day: "integer", // Day of month/week for reset

      // Status
      is_active: "boolean DEFAULT true", // Enable/disable config

      // Audit
      created_at: "timestamp DEFAULT NOW()",
      updated_at: "timestamp DEFAULT NOW()"
    },

    // When this changes: NO REDUNDANCY IMPACT
    // - Only this table needs update
    // - crm_credit_usage references config_id (no cached data)
    changePropagation: "Direct - no cascading updates needed"
  },

  // ============================================================================
  // CREDIT USAGE - MINIMAL FIELDS (10 fields total)
  // ============================================================================
  creditUsage: {
    table: "crm_credit_usage",
    fields: {
      // Primary identifiers
      usage_id: "uuid PRIMARY KEY",
      tenant_id: "uuid REFERENCES tenants(tenant_id)",
      user_id: "uuid REFERENCES tenant_users(user_id)",

      // Operation details
      operation_type: "varchar(50) NOT NULL", // 'export', 'api_call', 'storage'
      credits_used: "integer NOT NULL",

      // Context
      operation_metadata: "jsonb", // operation details, timestamps

      // Audit
      created_at: "timestamp DEFAULT NOW()"
    },

    // When credit config changes: NO REDUNDANCY
    // - Usage records remain historical (immutable)
    // - New operations use updated config
    changePropagation: "None - usage is historical"
  },

  // ============================================================================
  // HIERARCHY - MINIMAL FIELDS (15 fields total)
  // ============================================================================
  hierarchy: {
    table: "crm_organizations",
    fields: {
      // Primary identifiers
      org_id: "uuid PRIMARY KEY",
      tenant_id: "uuid REFERENCES tenants(tenant_id)",

      // Basic info
      org_name: "varchar(255) NOT NULL",
      org_type: "varchar(50) NOT NULL", // 'department', 'team', 'division'

      // Hierarchy structure (using PostgreSQL ltree)
      parent_org_id: "uuid REFERENCES crm_organizations(org_id)",
      path: "ltree", // Automatic hierarchical path

      // Status
      is_active: "boolean DEFAULT true",

      // Audit
      created_at: "timestamp DEFAULT NOW()",
      updated_at: "timestamp DEFAULT NOW()"
    },

    // When hierarchy changes: CASCADE UPDATES (but minimal)
    // - Update path field automatically via triggers
    // - crm_employee_org_assignments reference org_id (no cached names)
    changePropagation: "Automatic path updates only"
  },

  // ============================================================================
  // EMPLOYEE-ORG ASSIGNMENTS - MINIMAL FIELDS (10 fields total)
  // ============================================================================
  employeeOrgAssignments: {
    table: "crm_employee_org_assignments",
    fields: {
      // Primary identifiers
      assignment_id: "uuid PRIMARY KEY",
      user_id: "uuid REFERENCES tenant_users(user_id)",
      org_id: "uuid REFERENCES crm_organizations(org_id)",

      // Assignment details
      assignment_type: "varchar(20) DEFAULT 'primary'", // 'primary', 'secondary'
      is_active: "boolean DEFAULT true",

      // Time-based
      assigned_at: "timestamp DEFAULT NOW()",
      expires_at: "timestamp", // Optional expiry

      // Audit
      assigned_by: "uuid REFERENCES tenant_users(user_id)"
    },

    // When hierarchy changes: NO REDUNDANCY IMPACT
    // - References org_id directly (no cached org data)
    // - If org becomes inactive, assignments can be deactivated
    changePropagation: "Optional deactivation only"
  },

  // ============================================================================
  // EMPLOYEE PROFILES - MINIMAL FIELDS (15 fields total)
  // ============================================================================
  employeeProfiles: {
    table: "crm_employee_profiles",
    fields: {
      // Primary identifiers
      profile_id: "uuid PRIMARY KEY",
      user_id: "uuid REFERENCES tenant_users(user_id) UNIQUE",

      // CRM-specific employee data
      employee_id: "varchar(50)", // CRM employee ID
      job_title: "varchar(100)",
      department: "varchar(100)",
      manager_user_id: "uuid REFERENCES tenant_users(user_id)",

      // Employment details
      hire_date: "date",

      // CRM-specific overrides
      crm_permissions: "jsonb DEFAULT '{}'", // Permission overrides
      crm_settings: "jsonb DEFAULT '{}'", // UI preferences

      // Status
      is_active: "boolean DEFAULT true",

      // Audit
      created_at: "timestamp DEFAULT NOW()",
      updated_at: "timestamp DEFAULT NOW()"
    },

    // When employee data changes: NO REDUNDANCY
    // - Only this extension table updates
    // - Base user data in tenant_users (separate concern)
    changePropagation: "Isolated - no cascading updates"
  },

  // ============================================================================
  // ROLES - MINIMAL FIELDS (12 fields total)
  // ============================================================================
  roles: {
    table: "crm_roles",
    fields: {
      // Primary identifiers
      role_id: "uuid PRIMARY KEY",
      tenant_id: "uuid REFERENCES tenants(tenant_id)",

      // Role definition
      role_name: "varchar(100) NOT NULL",
      role_description: "text",
      role_type: "varchar(20) DEFAULT 'operational'",

      // Permissions
      permissions: "jsonb NOT NULL", // CRM permission structure

      // Status
      is_system_role: "boolean DEFAULT false",
      is_active: "boolean DEFAULT true",

      // Audit
      created_by: "uuid REFERENCES tenant_users(user_id)",
      created_at: "timestamp DEFAULT NOW()",
      updated_at: "timestamp DEFAULT NOW()"
    },

    // When roles change: CASCADE PERMISSION CHECKS
    // - crm_role_assignments reference role_id (no cached permissions)
    // - Permission checks use current role.permissions
    changePropagation: "Real-time permission validation"
  },

  // ============================================================================
  // ROLE ASSIGNMENTS - MINIMAL FIELDS (10 fields total)
  // ============================================================================
  roleAssignments: {
    table: "crm_role_assignments",
    fields: {
      // Primary identifiers
      assignment_id: "uuid PRIMARY KEY",
      user_id: "uuid REFERENCES tenant_users(user_id)",
      role_id: "uuid REFERENCES crm_roles(role_id)",
      org_id: "uuid REFERENCES crm_organizations(org_id)",

      // Assignment details
      assigned_by: "uuid REFERENCES tenant_users(user_id)",
      assigned_at: "timestamp DEFAULT NOW()",

      // Time-based
      expires_at: "timestamp",
      is_active: "boolean DEFAULT true"
    },

    // When roles change: NO REDUNDANCY IMPACT
    // - References role_id directly (no cached role data)
    // - Permission checks query crm_roles.permissions in real-time
    changePropagation: "Real-time permission resolution"
  },

  // ============================================================================
  // ACTIVITY LOGS - MINIMAL FIELDS (12 fields total)
  // ============================================================================
  activityLogs: {
    table: "crm_activity_logs",
    fields: {
      // Primary identifiers
      log_id: "uuid PRIMARY KEY",
      tenant_id: "uuid REFERENCES tenants(tenant_id)",
      user_id: "uuid REFERENCES tenant_users(user_id)",
      org_id: "uuid REFERENCES crm_organizations(org_id)",

      // Operation details
      operation_type: "varchar(50) NOT NULL", // 'create', 'update', 'delete'
      resource_type: "varchar(50) NOT NULL", // 'contact', 'deal', 'organization'
      resource_id: "varchar(255)", // Affected resource ID

      // Change details
      operation_details: "jsonb", // old_values, new_values, metadata

      // Context
      ip_address: "varchar(45)",
      user_agent: "text",

      // Audit
      created_at: "timestamp DEFAULT NOW()"
    },

    // When anything changes: IMMUTABLE AUDIT TRAIL
    // - Logs are append-only (never updated)
    // - Historical record of all changes
    changePropagation: "None - append-only records"
  }
};

// ============================================================================
// REDUNDANCY ELIMINATION SUMMARY
// ============================================================================
const redundancyElimination = {
  // When credit config changes - only 1 table updates
  creditChanges: "Only crm_credit_configs updates (15 fields)",

  // When hierarchy changes - automatic path updates only
  hierarchyChanges: "Only crm_organizations.path updates automatically",

  // When employee data changes - isolated extension updates
  employeeChanges: "Only crm_employee_profiles updates (CRM-specific fields)",

  // When roles/permissions change - real-time resolution
  permissionChanges: "crm_roles.permissions updates, assignments reference by ID",

  // Total fields for full CRM: 110 fields across 8 tables
  totalFields: "110 fields (vs 600+ in current system)",

  // Change propagation: Minimal cascading updates
  changePropagation: "Direct table updates only - no redundant data to sync"
};

// ============================================================================
// IMPLEMENTATION QUERIES - NO REDUNDANCY
// ============================================================================
const implementationQueries = {
  // Credit validation - single table lookup
  checkCredits: `
    SELECT credit_limit, reset_period, reset_day
    FROM crm_credit_configs
    WHERE tenant_id = $1 AND is_active = true
  `,

  // Permission check - direct role lookup
  checkPermissions: `
    SELECT cr.permissions
    FROM crm_role_assignments cra
    JOIN crm_roles cr ON cra.role_id = cr.role_id
    WHERE cra.user_id = $1 AND cra.org_id = $2 AND cra.is_active = true
  `,

  // Hierarchy navigation - ltree path queries
  getHierarchy: `
    SELECT org_name, path
    FROM crm_organizations
    WHERE tenant_id = $1 AND is_active = true
    ORDER BY path
  `,

  // Employee context - extension pattern
  getEmployeeContext: `
    SELECT tu.*, cep.*
    FROM tenant_users tu
    JOIN crm_employee_profiles cep ON tu.user_id = cep.user_id
    WHERE tu.tenant_id = $1 AND tu.is_active = true
  `
};

module.exports = {
  crmMinimalFields,
  redundancyElimination,
  implementationQueries
};
