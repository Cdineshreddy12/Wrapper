/**
 * CRM SCHEMA RELATIONSHIPS & STRUCTURE
 * Brief explanation of your CRM database schema and relationships
 */

const crmSchemaOverview = {
  // ============================================================================
  // CORE ENTITIES & RELATIONSHIPS
  // ============================================================================
  schemaStructure: {
    tenants: {
      table: "tenants (wrapper)",
      description: "Top-level tenant/organization data",
      key_fields: ["tenant_id", "company_name", "subdomain", "admin_email"],
      relations: "Parent to all CRM tables"
    },

    entities: {
      table: "entities (wrapper)",
      description: "Hierarchical organizational structure (orgs, depts, teams)",
      key_fields: ["entity_id", "parent_entity_id", "entity_level", "hierarchy_path"],
      relations: "Self-referencing hierarchy, parent to credits/assignments"
    },

    tenant_users: {
      table: "tenant_users (wrapper)",
      description: "Basic user authentication and profile data",
      key_fields: ["user_id", "tenant_id", "email", "name"],
      relations: "Parent to CRM-specific user data"
    }
  },

  // ============================================================================
  // CRM-SPECIFIC TABLES & RELATIONSHIPS
  // ============================================================================
  crmTables: {
    // USER MANAGEMENT
    crm_tenant_users: {
      table: "crm_tenant_users",
      description: "Basic CRM user profiles (extends tenant_users)",
      key_fields: ["user_id", "tenant_id", "email", "name"],
      relations: "References tenant_users.user_id"
    },

    crm_employee_profiles: {
      table: "crm_employee_profiles",
      description: "CRM-specific employee data and settings",
      key_fields: ["profile_id", "user_id", "employee_id", "manager_user_id"],
      relations: "References crm_tenant_users.user_id, tenant_users.user_id (manager)"
    },

    crm_employee_org_assignments: {
      table: "crm_employee_org_assignments",
      description: "Employee assignments to organizational entities",
      key_fields: ["assignment_id", "user_id", "entity_id"],
      relations: "References tenant_users.user_id, entities.entity_id"
    },

    // ROLE & PERMISSIONS
    crm_roles: {
      table: "crm_roles",
      description: "CRM-specific roles and permissions",
      key_fields: ["role_id", "tenant_id", "entity_id", "role_name"],
      relations: "References tenants.tenant_id, entities.entity_id"
    },

    crm_role_assignments: {
      table: "crm_role_assignments",
      description: "User role assignments with entity scoping",
      key_fields: ["assignment_id", "user_id", "role_id", "entity_id"],
      relations: "References tenant_users.user_id, crm_roles.role_id, entities.entity_id"
    },

    // CREDIT MANAGEMENT
    crm_credit_configs: {
      table: "crm_credit_configs",
      description: "CRM credit limits and configuration",
      key_fields: ["config_id", "tenant_id", "config_name", "credit_limit"],
      relations: "References tenants.tenant_id"
    },

    crm_credit_allocations: {
      table: "crm_credit_allocations",
      description: "Credit allocations from entities to CRM",
      key_fields: ["allocation_id", "entity_id", "allocated_credits"],
      relations: "References entities.entity_id"
    },

    crm_entity_credits: {
      table: "crm_entity_credits",
      description: "Simplified credit balances per entity",
      key_fields: ["credit_id", "entity_id", "available_credits"],
      relations: "References entities.entity_id"
    },

    crm_credit_hierarchy: {
      table: "crm_credit_hierarchy",
      description: "Credit inheritance rules between entities",
      key_fields: ["hierarchy_id", "parent_entity_id", "child_entity_id"],
      relations: "References entities.entity_id (parent/child)"
    },

    crm_credit_usage: {
      table: "crm_credit_usage",
      description: "Detailed credit consumption tracking",
      key_fields: ["usage_id", "entity_id", "user_id", "credits_used"],
      relations: "References entities.entity_id, tenant_users.user_id"
    },

    // AUDIT & ACTIVITY
    crm_activity_logs: {
      table: "crm_activity_logs",
      description: "Complete audit trail of CRM operations",
      key_fields: ["log_id", "tenant_id", "user_id", "entity_id"],
      relations: "References tenants.tenant_id, tenant_users.user_id, entities.entity_id"
    }
  },

  // ============================================================================
  // RELATIONSHIP DIAGRAM
  // ============================================================================
  relationships: {
    hierarchy: {
      "tenants": "Parent to all tables",
      "entities": "Self-referencing hierarchy (parent_entity_id)",
      "tenant_users": "Basic user data from wrapper"
    },

    user_flow: {
      "tenant_users": "→ crm_tenant_users (basic profile)",
      "crm_tenant_users": "→ crm_employee_profiles (CRM-specific data)",
      "crm_employee_profiles": "→ crm_employee_org_assignments (entity assignments)",
      "crm_employee_profiles": "→ crm_role_assignments (role assignments)"
    },

    permission_flow: {
      "crm_roles": "→ crm_role_assignments (user-role-entity mapping)",
      "entities": "→ crm_roles (entity-scoped roles)",
      "tenant_users": "→ crm_role_assignments (user assignments)"
    },

    credit_flow: {
      "entities": "→ crm_entity_credits (credit balances)",
      "crm_entity_credits": "→ crm_credit_allocations (CRM allocations)",
      "crm_credit_allocations": "→ crm_credit_usage (consumption tracking)",
      "entities": "→ crm_credit_hierarchy (inheritance rules)"
    },

    audit_flow: {
      "All tables": "→ crm_activity_logs (complete audit trail)"
    }
  },

  // ============================================================================
  // KEY RELATIONSHIPS SUMMARY
  // ============================================================================
  keyRelationships: [
    "✅ tenants.tenant_id → All CRM tables (multi-tenancy)",
    "✅ entities.entity_id → Multiple CRM tables (hierarchy scoping)",
    "✅ tenant_users.user_id → crm_tenant_users, crm_employee_profiles",
    "✅ entities.entity_id → crm_employee_org_assignments (user-entity)",
    "✅ crm_roles.role_id → crm_role_assignments (role assignments)",
    "✅ entities.entity_id → crm_entity_credits (credit balances)",
    "✅ entities.entity_id → crm_credit_allocations (CRM credit allocation)",
    "✅ entities.entity_id → crm_credit_hierarchy (parent-child relationships)"
  ],

  // ============================================================================
  // SCHEMA BENEFITS
  // ============================================================================
  schemaBenefits: [
    "🏗️ Zero redundancy - No duplicate data storage",
    "🔗 Perfect wrapper integration - References existing tables",
    "📊 Entity-scoped operations - Everything scoped to organizational hierarchy",
    "👥 Complete user management - Basic + CRM-specific employee data",
    "🔐 Role-based permissions - Entity-scoped access control",
    "💰 Credit management - Entity-level credit allocation and tracking",
    "📋 Audit trail - Complete activity logging",
    "⚡ Performance optimized - Proper indexing and relationships"
  ],

  // ============================================================================
  // TOTAL SCHEMA SUMMARY
  // ============================================================================
  schemaSummary: {
    total_tables: 12,
    total_fields: 105,
    core_tables: 9, // What you have
    missing_tables: 3, // crm_employee_profiles, crm_credit_hierarchy, crm_credit_configs

    data_flow: [
      "1. Users authenticate via wrapper (tenant_users)",
      "2. CRM extends with specific profiles (crm_employee_profiles)",
      "3. Users assigned to entities (crm_employee_org_assignments)",
      "4. Roles defined with entity scoping (crm_roles)",
      "5. Role assignments link users to roles (crm_role_assignments)",
      "6. Credits allocated per entity (crm_entity_credits)",
      "7. CRM operations consume credits (crm_credit_usage)",
      "8. All activities audited (crm_activity_logs)"
    ],

    architecture_principles: [
      "✅ Single source of truth for each data type",
      "✅ Proper foreign key relationships",
      "✅ Entity-scoped permissions and data",
      "✅ Hierarchical credit management",
      "✅ Complete audit trail"
    ]
  }
};

module.exports = { crmSchemaOverview };
