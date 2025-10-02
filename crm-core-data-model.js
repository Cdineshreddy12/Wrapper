/**
 * CRM Core Data Model - No Redundancy Architecture
 * Only CRM-specific data required for independent operations
 */

const crmCoreDataModel = {
  // ============================================================================
  // CORE PRINCIPLE: NO REDUNDANCY
  // ============================================================================
  principle: {
    description: "CRM stores only data it needs to operate independently",
    rules: [
      "No duplicate data from wrapper system",
      "No redundant relationships within CRM",
      "Single source of truth for each CRM concept",
      "Minimal data footprint for performance"
    ],
    scope: "CRM operates with: Credit Config, Hierarchy, Employees, Roles & Permissions"
  },

  // ============================================================================
  // DATA OWNERSHIP MATRIX
  // ============================================================================
  dataOwnership: {
    wrapper_system: [
      "Base user identity (Kinde ID, email, basic profile)",
      "Tenant creation and basic settings",
      "Authentication tokens and sessions",
      "External integrations and webhooks"
    ],

    crm_local_only: [
      "CRM-specific permissions and roles",
      "Organization hierarchy for CRM operations",
      "Employee profiles with CRM-specific fields",
      "Credit configurations and usage tracking",
      "CRM activity logs and audit trails",
      "CRM-specific business rules and workflows"
    ],

    crm_enhanced: [
      "Enhanced user profiles (CRM-specific fields only)",
      "Tenant settings extended with CRM configuration",
      "Organization structure with CRM operational data"
    ]
  },

  // ============================================================================
  // MINIMAL CRM DATA MODEL - NO REDUNDANCY
  // ============================================================================
  coreDataTables: {
    // ============================================================================
    // CREDIT CONFIGURATION - CRM SPECIFIC
    // ============================================================================
    crm_credit_configs: {
      table: "crm_credit_configs",
      purpose: "CRM-specific credit rules and configurations",
      fields: {
        config_id: "uuid PRIMARY KEY",
        tenant_id: "uuid REFERENCES tenants(tenant_id)",
        config_name: "varchar(100) NOT NULL", // e.g., "basic_plan", "enterprise_plan"
        credit_limit: "integer NOT NULL",
        reset_period: "varchar(20) DEFAULT 'monthly'", // daily, weekly, monthly, never
        reset_day: "integer", // 1-31 for monthly, 1-7 for weekly
        is_active: "boolean DEFAULT true",
        created_at: "timestamp DEFAULT NOW()",
        updated_at: "timestamp DEFAULT NOW()"
      },
      relationships: "1:many with crm_credit_usage (config defines rules)",
      redundancy_check: "No overlap with wrapper billing - this is CRM operational credits",
      data_volume: "~1-10 configs per tenant"
    },

    crm_credit_usage: {
      table: "crm_credit_usage",
      purpose: "Track CRM operations credit consumption",
      fields: {
        usage_id: "uuid PRIMARY KEY",
        tenant_id: "uuid REFERENCES tenants(tenant_id)",
        user_id: "uuid REFERENCES tenant_users(user_id)",
        operation_type: "varchar(50) NOT NULL", // 'export', 'api_call', 'storage', etc.
        credits_used: "integer NOT NULL",
        operation_metadata: "jsonb", // operation details, timestamps
        created_at: "timestamp DEFAULT NOW()"
      },
      relationships: "many:1 with crm_credit_configs (usage follows config rules)",
      redundancy_check: "Tracks CRM operations only, not wrapper billing",
      data_volume: "~100-1000 records per tenant per month"
    },

    // ============================================================================
    // HIERARCHY - CRM OPERATIONAL STRUCTURE
    // ============================================================================
    crm_organizations: {
      table: "crm_organizations",
      purpose: "CRM-specific organizational units for data isolation",
      fields: {
        org_id: "uuid PRIMARY KEY",
        tenant_id: "uuid REFERENCES tenants(tenant_id)",
        org_name: "varchar(255) NOT NULL",
        org_type: "varchar(50) NOT NULL", // 'department', 'team', 'division', 'location'
        parent_org_id: "uuid REFERENCES crm_organizations(org_id)", // self-reference
        path: "ltree", // PostgreSQL ltree for hierarchical queries
        is_active: "boolean DEFAULT true",
        created_at: "timestamp DEFAULT NOW()",
        updated_at: "timestamp DEFAULT NOW()"
      },
      relationships: "self-referencing hierarchy, 1:many with crm_employee_org_assignments",
      redundancy_check: "CRM operational hierarchy ≠ wrapper organizational structure",
      data_volume: "~5-50 organizations per tenant"
    },

    crm_employee_org_assignments: {
      table: "crm_employee_org_assignments",
      purpose: "Link employees to CRM organizational units",
      fields: {
        assignment_id: "uuid PRIMARY KEY",
        user_id: "uuid REFERENCES tenant_users(user_id)",
        org_id: "uuid REFERENCES crm_organizations(org_id)",
        assignment_type: "varchar(20) DEFAULT 'primary'", // 'primary', 'secondary', 'temporary'
        is_active: "boolean DEFAULT true",
        assigned_at: "timestamp DEFAULT NOW()",
        expires_at: "timestamp" // for temporary assignments
      },
      relationships: "many:1 with crm_organizations, many:1 with tenant_users",
      redundancy_check: "CRM-specific assignments, not duplicating wrapper memberships",
      data_volume: "~1-3 assignments per employee"
    },

    // ============================================================================
    // EMPLOYEES - CRM ENHANCED PROFILES
    // ============================================================================
    crm_employee_profiles: {
      table: "crm_employee_profiles",
      purpose: "CRM-specific employee data extending base profiles",
      fields: {
        profile_id: "uuid PRIMARY KEY",
        user_id: "uuid REFERENCES tenant_users(user_id) UNIQUE",
        employee_id: "varchar(50)", // CRM-specific employee ID
        job_title: "varchar(100)",
        department: "varchar(100)",
        manager_user_id: "uuid REFERENCES tenant_users(user_id)",
        hire_date: "date",
        crm_permissions: "jsonb DEFAULT '{}'", // CRM-specific permission overrides
        crm_settings: "jsonb DEFAULT '{}'", // CRM UI preferences, dashboard config
        is_active: "boolean DEFAULT true",
        created_at: "timestamp DEFAULT NOW()",
        updated_at: "timestamp DEFAULT NOW()"
      },
      relationships: "1:1 with tenant_users, self-reference for manager hierarchy",
      redundancy_check: "Extends, doesn't duplicate tenant_users table",
      data_volume: "~1 profile per active user"
    },

    // ============================================================================
    // ROLES & PERMISSIONS - CRM SECURITY MODEL
    // ============================================================================
    crm_roles: {
      table: "crm_roles",
      purpose: "CRM-specific roles defining operational permissions",
      fields: {
        role_id: "uuid PRIMARY KEY",
        tenant_id: "uuid REFERENCES tenants(tenant_id)",
        role_name: "varchar(100) NOT NULL",
        role_description: "text",
        role_type: "varchar(20) DEFAULT 'operational'", // 'operational', 'administrative', 'system'
        permissions: "jsonb NOT NULL", // CRM permission structure
        is_system_role: "boolean DEFAULT false",
        is_active: "boolean DEFAULT true",
        created_at: "timestamp DEFAULT NOW()",
        updated_at: "timestamp DEFAULT NOW()"
      },
      relationships: "1:many with crm_role_assignments",
      redundancy_check: "CRM-specific roles ≠ wrapper authentication roles",
      data_volume: "~5-20 roles per tenant"
    },

    crm_role_assignments: {
      table: "crm_role_assignments",
      purpose: "Assign CRM roles to users within organizational context",
      fields: {
        assignment_id: "uuid PRIMARY KEY",
        user_id: "uuid REFERENCES tenant_users(user_id)",
        role_id: "uuid REFERENCES crm_roles(role_id)",
        org_id: "uuid REFERENCES crm_organizations(org_id)", // scope to organization
        assigned_by: "uuid REFERENCES tenant_users(user_id)",
        assigned_at: "timestamp DEFAULT NOW()",
        expires_at: "timestamp", // for temporary assignments
        is_active: "boolean DEFAULT true"
      },
      relationships: "many:1 with users, roles, organizations",
      redundancy_check: "CRM operational roles ≠ wrapper authentication roles",
      data_volume: "~1-5 assignments per user"
    },

    crm_permission_definitions: {
      table: "crm_permission_definitions",
      purpose: "Define granular CRM permissions and their relationships",
      fields: {
        permission_id: "uuid PRIMARY KEY",
        permission_key: "varchar(100) UNIQUE NOT NULL", // e.g., 'crm.contacts.read', 'crm.deals.create'
        permission_name: "varchar(255) NOT NULL",
        permission_description: "text",
        resource_type: "varchar(50) NOT NULL", // 'contacts', 'deals', 'reports', etc.
        action: "varchar(20) NOT NULL", // 'create', 'read', 'update', 'delete', 'export'
        is_system_permission: "boolean DEFAULT false",
        created_at: "timestamp DEFAULT NOW()"
      },
      relationships: "Referenced by crm_roles.permissions jsonb",
      redundancy_check: "CRM business permissions ≠ wrapper system permissions",
      data_volume: "~50-200 permission definitions (system-wide)"
    },

    // ============================================================================
    // ACTIVITY LOGS - CRM OPERATIONS AUDIT
    // ============================================================================
    crm_activity_logs: {
      table: "crm_activity_logs",
      purpose: "Audit trail for CRM operations and data changes",
      fields: {
        log_id: "uuid PRIMARY KEY",
        tenant_id: "uuid REFERENCES tenants(tenant_id)",
        user_id: "uuid REFERENCES tenant_users(user_id)",
        org_id: "uuid REFERENCES crm_organizations(org_id)",
        operation_type: "varchar(50) NOT NULL", // 'create', 'update', 'delete', 'export', etc.
        resource_type: "varchar(50) NOT NULL", // 'contact', 'deal', 'organization', etc.
        resource_id: "varchar(255)", // ID of affected resource
        operation_details: "jsonb", // old_values, new_values, metadata
        ip_address: "varchar(45)",
        user_agent: "text",
        created_at: "timestamp DEFAULT NOW()"
      },
      relationships: "Links to users, organizations for context",
      redundancy_check: "CRM business operations ≠ wrapper system operations",
      data_volume: "~100-1000 logs per tenant per month"
    }
  },

  // ============================================================================
  // DATA FLOW - NO REDUNDANCY GUARANTEES
  // ============================================================================
  dataFlow: {
    credit_operations: {
      flow: "crm_credit_configs → crm_credit_usage",
      validation: "Check config limits before operations",
      audit: "Log all credit consumption in crm_activity_logs",
      redundancy_avoided: "No duplicate credit tracking with wrapper"
    },

    hierarchy_operations: {
      flow: "crm_organizations → crm_employee_org_assignments → crm_employee_profiles",
      validation: "Check organizational permissions for data access",
      audit: "Log hierarchy changes in crm_activity_logs",
      redundancy_avoided: "No duplicate org structure from wrapper"
    },

    permission_operations: {
      flow: "crm_permission_definitions → crm_roles → crm_role_assignments",
      validation: "Check permissions before every CRM operation",
      audit: "Log permission changes in crm_activity_logs",
      redundancy_avoided: "No duplicate roles from wrapper auth system"
    },

    employee_operations: {
      flow: "tenant_users (base) + crm_employee_profiles (extension)",
      validation: "CRM profiles extend but don't duplicate base user data",
      audit: "Log profile changes in crm_activity_logs",
      redundancy_avoided: "Extension pattern avoids data duplication"
    }
  },

  // ============================================================================
  // QUERY PATTERNS - OPTIMIZED FOR CRM OPERATIONS
  // ============================================================================
  queryPatterns: {
    credit_checks: `
      SELECT cc.credit_limit, COALESCE(SUM(cu.credits_used), 0) as used_credits
      FROM crm_credit_configs cc
      LEFT JOIN crm_credit_usage cu ON cu.tenant_id = cc.tenant_id
        AND cu.created_at >= cc.last_reset_date
      WHERE cc.tenant_id = $1 AND cc.is_active = true
      GROUP BY cc.config_id
    `,

    permission_checks: `
      SELECT cp.permissions
      FROM crm_role_assignments cra
      JOIN crm_roles cr ON cra.role_id = cr.role_id
      JOIN crm_employee_org_assignments ceoa ON cra.user_id = ceoa.user_id
        AND cra.org_id = ceoa.org_id
      WHERE cra.user_id = $1 AND cra.is_active = true
        AND ceoa.is_active = true AND ceoa.assignment_type = 'primary'
    `,

    hierarchy_access: `
      SELECT DISTINCT resource_id
      FROM crm_activity_logs cal
      JOIN crm_employee_org_assignments ceoa ON cal.org_id = ceoa.org_id
      WHERE ceoa.user_id = $1 AND ceoa.is_active = true
        AND cal.resource_type = $2
        AND cal.created_at >= $3
    `,

    employee_context: `
      SELECT tu.*, cep.*
      FROM tenant_users tu
      JOIN crm_employee_profiles cep ON tu.user_id = cep.user_id
      LEFT JOIN crm_employee_org_assignments ceoa ON tu.user_id = ceoa.user_id
        AND ceoa.assignment_type = 'primary'
      LEFT JOIN crm_organizations co ON ceoa.org_id = co.org_id
      WHERE tu.tenant_id = $1 AND tu.is_active = true
    `
  },

  // ============================================================================
  // INTEGRATION POINTS - MINIMAL SURFACE AREA
  // ============================================================================
  integrationPoints: {
    wrapper_auth: {
      data_needed: ["user_id", "tenant_id", "basic_profile"],
      data_provided: "CRM extends with crm_employee_profiles",
      redundancy_check: "CRM adds fields, doesn't duplicate"
    },

    wrapper_billing: {
      data_needed: ["subscription_status", "billing_limits"],
      data_provided: "CRM operational credits (separate from billing)",
      redundancy_check: "Operational credits ≠ subscription billing"
    },

    wrapper_org: {
      data_needed: ["base_organization_structure"],
      data_provided: "CRM operational hierarchy (different purpose)",
      redundancy_check: "Auth org structure ≠ CRM operational hierarchy"
    }
  },

  // ============================================================================
  // VALIDATION - ENSURING NO REDUNDANCY
  // ============================================================================
  redundancyValidation: {
    field_level: [
      "No duplicate user profile fields between tenant_users and crm_employee_profiles",
      "No duplicate organizational fields between wrapper and crm_organizations",
      "No duplicate permission fields between wrapper roles and crm_roles",
      "No duplicate credit fields between wrapper billing and crm_credit_configs"
    ],

    relationship_level: [
      "CRM org assignments don't duplicate wrapper org memberships",
      "CRM role assignments are operational, not authentication-based",
      "CRM credit usage tracks operations, not billing consumption",
      "CRM activity logs track business operations, not system events"
    ],

    operational_level: [
      "CRM can operate with only its local data + wrapper auth",
      "Wrapper can operate without CRM data",
      "Clean separation of concerns maintained",
      "Data consistency managed through defined sync points"
    ]
  }
};

module.exports = { crmCoreDataModel };
