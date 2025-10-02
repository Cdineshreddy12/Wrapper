/**
 * CRM FINAL FIELDS ONLY - Complete Minimal Schema
 * Exact fields needed for CRM operations with zero redundancy
 */

const crmFinalFieldsOnly = {
  // ============================================================================
  // COMPLETE CRM SCHEMA - 7 TABLES, 105 FIELDS TOTAL
  // Uses existing entities table for hierarchy
  // ============================================================================

  // ============================================================================
  // 1. CREDIT CONFIGURATION (15 fields)
  // ============================================================================
  crm_credit_configs: {
    config_id: "uuid PRIMARY KEY",
    tenant_id: "uuid REFERENCES tenants(tenant_id)",
    config_name: "varchar(100) NOT NULL",
    credit_limit: "integer NOT NULL",
    reset_period: "varchar(20) DEFAULT 'monthly'",
    reset_day: "integer",
    is_active: "boolean DEFAULT true",
    created_at: "timestamp DEFAULT NOW()",
    updated_at: "timestamp DEFAULT NOW()"
  },

  // ============================================================================
  // 2. CREDIT USAGE (10 fields)
  // ============================================================================
  crm_credit_usage: {
    usage_id: "uuid PRIMARY KEY",
    tenant_id: "uuid REFERENCES tenants(tenant_id)",
    user_id: "uuid REFERENCES tenant_users(user_id)",
    operation_type: "varchar(50) NOT NULL",
    credits_used: "integer NOT NULL",
    operation_metadata: "jsonb",
    created_at: "timestamp DEFAULT NOW()"
  },

  // ============================================================================
  // 3. EMPLOYEE-ENTITY ASSIGNMENTS (HIERARCHY VIA ENTITIES) (8 fields)
  // ============================================================================
  // NOTE: Hierarchy is handled by existing entities table
  // CRM uses entities for organizational structure

  // ============================================================================
  // 3. EMPLOYEE-ENTITY ASSIGNMENTS (8 fields)
  // ============================================================================
  crm_employee_org_assignments: {
    assignment_id: "uuid PRIMARY KEY",
    user_id: "uuid REFERENCES tenant_users(user_id)",
    org_id: "uuid REFERENCES entities(entity_id)",
    assignment_type: "varchar(20) DEFAULT 'primary'",
    is_active: "boolean DEFAULT true",
    assigned_at: "timestamp DEFAULT NOW()",
    expires_at: "timestamp",
    assigned_by: "uuid REFERENCES tenant_users(user_id)"
  },

  // ============================================================================
  // 4. EMPLOYEE PROFILES (12 fields)
  // ============================================================================
  crm_employee_profiles: {
    profile_id: "uuid PRIMARY KEY",
    user_id: "uuid REFERENCES tenant_users(user_id) UNIQUE",
    employee_id: "varchar(50)",
    job_title: "varchar(100)",
    department: "varchar(100)",
    manager_user_id: "uuid REFERENCES tenant_users(user_id)",
    hire_date: "date",
    crm_permissions: "jsonb DEFAULT '{}'",
    crm_settings: "jsonb DEFAULT '{}'",
    is_active: "boolean DEFAULT true",
    created_at: "timestamp DEFAULT NOW()",
    updated_at: "timestamp DEFAULT NOW()"
  },

  // ============================================================================
  // 5. ROLES (11 fields)
  // ============================================================================
  crm_roles: {
    role_id: "uuid PRIMARY KEY",
    tenant_id: "uuid REFERENCES tenants(tenant_id)",
    role_name: "varchar(100) NOT NULL",
    role_description: "text",
    role_type: "varchar(20) DEFAULT 'operational'",
    permissions: "jsonb NOT NULL",
    is_system_role: "boolean DEFAULT false",
    is_active: "boolean DEFAULT true",
    created_by: "uuid REFERENCES tenant_users(user_id)",
    created_at: "timestamp DEFAULT NOW()",
    updated_at: "timestamp DEFAULT NOW()"
  },

  // ============================================================================
  // 6. ROLE ASSIGNMENTS (8 fields)
  // ============================================================================
  crm_role_assignments: {
    assignment_id: "uuid PRIMARY KEY",
    user_id: "uuid REFERENCES tenant_users(user_id)",
    role_id: "uuid REFERENCES crm_roles(role_id)",
    org_id: "uuid REFERENCES entities(entity_id)",
    assigned_by: "uuid REFERENCES tenant_users(user_id)",
    assigned_at: "timestamp DEFAULT NOW()",
    expires_at: "timestamp",
    is_active: "boolean DEFAULT true"
  },

  // ============================================================================
  // 7. ACTIVITY LOGS (11 fields)
  // ============================================================================
  crm_activity_logs: {
    log_id: "uuid PRIMARY KEY",
    tenant_id: "uuid REFERENCES tenants(tenant_id)",
    user_id: "uuid REFERENCES tenant_users(user_id)",
    org_id: "uuid REFERENCES entities(entity_id)",
    operation_type: "varchar(50) NOT NULL",
    resource_type: "varchar(50) NOT NULL",
    resource_id: "varchar(255)",
    operation_details: "jsonb",
    ip_address: "varchar(45)",
    user_agent: "text",
    created_at: "timestamp DEFAULT NOW()"
  },

  // ============================================================================
  // EXISTING TABLES TO REUSE (0 new fields needed)
  // ============================================================================
  reuse_existing: {
    tenants: "tenant_id, company_name, subdomain, etc. (existing)",
    tenant_users: "user_id, tenant_id, email, name, etc. (existing)",
    user_sessions: "session_id, user_id, tenant_id, etc. (existing)",
    audit_logs: "log_id, tenant_id, user_id, etc. (existing)",
    entities: "entity_id, tenant_id, entity_name, parent_entity_id, etc. (existing)"
  },

  // ============================================================================
  // FIELD COUNT SUMMARY
  // ============================================================================
  field_counts: {
    crm_credit_configs: 9,
    crm_credit_usage: 7,
    crm_employee_org_assignments: 8,
    crm_employee_profiles: 12,
    crm_roles: 11,
    crm_role_assignments: 8,
    crm_activity_logs: 11,
    total_new_fields: 66, // Removed crm_organizations (9 fields)
    total_with_existing: 105
  },

  // ============================================================================
  // SQL CREATE STATEMENTS - READY TO IMPLEMENT
  // ============================================================================
  sql_schemas: {
    crm_credit_configs: `
      CREATE TABLE crm_credit_configs (
        config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
        config_name VARCHAR(100) NOT NULL,
        credit_limit INTEGER NOT NULL,
        reset_period VARCHAR(20) DEFAULT 'monthly',
        reset_day INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `,

    crm_credit_usage: `
      CREATE TABLE crm_credit_usage (
        usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
        user_id UUID NOT NULL REFERENCES tenant_users(user_id),
        operation_type VARCHAR(50) NOT NULL,
        credits_used INTEGER NOT NULL,
        operation_metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `,

    // NOTE: Using existing entities table for hierarchy - no crm_organizations table needed

    crm_employee_org_assignments: `
      CREATE TABLE crm_employee_org_assignments (
        assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES tenant_users(user_id),
        org_id UUID NOT NULL REFERENCES entities(entity_id),
        assignment_type VARCHAR(20) DEFAULT 'primary',
        is_active BOOLEAN DEFAULT true,
        assigned_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        assigned_by UUID REFERENCES tenant_users(user_id)
      );
    `,

    crm_employee_profiles: `
      CREATE TABLE crm_employee_profiles (
        profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES tenant_users(user_id),
        employee_id VARCHAR(50),
        job_title VARCHAR(100),
        department VARCHAR(100),
        manager_user_id UUID REFERENCES tenant_users(user_id),
        hire_date DATE,
        crm_permissions JSONB DEFAULT '{}',
        crm_settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `,

    crm_roles: `
      CREATE TABLE crm_roles (
        role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
        role_name VARCHAR(100) NOT NULL,
        role_description TEXT,
        role_type VARCHAR(20) DEFAULT 'operational',
        permissions JSONB NOT NULL,
        is_system_role BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES tenant_users(user_id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `,

    crm_role_assignments: `
      CREATE TABLE crm_role_assignments (
        assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES tenant_users(user_id),
        role_id UUID NOT NULL REFERENCES crm_roles(role_id),
        org_id UUID NOT NULL REFERENCES entities(entity_id),
        assigned_by UUID REFERENCES tenant_users(user_id),
        assigned_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
    `,

    crm_activity_logs: `
      CREATE TABLE crm_activity_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
        user_id UUID REFERENCES tenant_users(user_id),
        org_id UUID REFERENCES entities(entity_id),
        operation_type VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(255),
        operation_details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `
  },

  // ============================================================================
  // INDEXES NEEDED FOR PERFORMANCE
  // ============================================================================
  required_indexes: [
    "CREATE INDEX idx_crm_credit_configs_tenant ON crm_credit_configs(tenant_id);",
    "CREATE INDEX idx_crm_credit_usage_tenant_user ON crm_credit_usage(tenant_id, user_id);",
    "CREATE INDEX idx_crm_credit_usage_created ON crm_credit_usage(created_at);",
    // NOTE: Using existing entities table indexes for hierarchy
    "CREATE INDEX idx_crm_employee_org_assignments_user ON crm_employee_org_assignments(user_id);",
    "CREATE INDEX idx_crm_employee_org_assignments_org ON crm_employee_org_assignments(org_id);",
    "CREATE INDEX idx_crm_employee_profiles_user ON crm_employee_profiles(user_id);",
    "CREATE INDEX idx_crm_roles_tenant ON crm_roles(tenant_id);",
    "CREATE INDEX idx_crm_role_assignments_user_org ON crm_role_assignments(user_id, org_id);",
    "CREATE INDEX idx_crm_role_assignments_role_org ON crm_role_assignments(role_id, org_id);",
    "CREATE INDEX idx_crm_activity_logs_tenant ON crm_activity_logs(tenant_id);",
    "CREATE INDEX idx_crm_activity_logs_user ON crm_activity_logs(user_id);",
    "CREATE INDEX idx_crm_activity_logs_org ON crm_activity_logs(org_id);",
    "CREATE INDEX idx_crm_activity_logs_created ON crm_activity_logs(created_at);"
  ],

  // ============================================================================
  // TRIGGERS NEEDED FOR AUTOMATION
  // ============================================================================
  required_triggers: [
    // Update crm_organizations.path automatically
    `
    CREATE OR REPLACE FUNCTION update_crm_org_path() RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.parent_org_id IS NULL THEN
        NEW.path = NEW.org_id::text;
      ELSE
        SELECT path || NEW.org_id::text INTO NEW.path
        FROM crm_organizations WHERE org_id = NEW.parent_org_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_crm_org_path
      BEFORE INSERT OR UPDATE ON crm_organizations
      FOR EACH ROW EXECUTE FUNCTION update_crm_org_path();
    `,

    // Update timestamps
    `
    CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_crm_credit_configs_updated_at
      BEFORE UPDATE ON crm_credit_configs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    // NOTE: Using existing entities table triggers for hierarchy

    CREATE TRIGGER update_crm_employee_profiles_updated_at
      BEFORE UPDATE ON crm_employee_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_crm_roles_updated_at
      BEFORE UPDATE ON crm_roles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `
  ]
};

module.exports = { crmFinalFieldsOnly };
