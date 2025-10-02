/**
 * CRM CREDIT ALLOCATION FIELDS ANALYSIS
 * Where credit allocation details should be stored in the CRM
 */

const crmCreditAllocationFieldsAnalysis = {
  // ============================================================================
  // EXISTING CREDIT ALLOCATION STRUCTURE
  // ============================================================================
  existingCreditStructure: {
    credit_allocations: {
      table: "credit_allocations (existing wrapper table)",
      purpose: "Tracks credit allocations from entities to applications",
      keyFields: {
        source_entity_id: "uuid REFERENCES entities(entity_id) - Entity providing credits",
        target_application: "varchar(50) - Application receiving credits (e.g., 'crm')",
        allocated_credits: "numeric(15,4) - Total credits allocated",
        used_credits: "numeric(15,4) - Credits already consumed",
        available_credits: "numeric(15,4) - Credits still available",
        allocation_type: "varchar(30) - 'manual', 'automatic', etc.",
        expires_at: "timestamp - When allocation expires",
        is_active: "boolean - Allocation status"
      }
    },

    credits: {
      table: "credits (existing wrapper table)",
      purpose: "Overall credit balances per entity",
      keyFields: {
        entity_id: "uuid REFERENCES entities(entity_id) - Entity with credits",
        available_credits: "numeric(15,4) - Available credit balance",
        reserved_credits: "numeric(15,4) - Reserved credits"
      }
    },

    credit_configurations: {
      table: "credit_configurations (existing wrapper table)",
      purpose: "Credit costs for different operations",
      keyFields: {
        operation_code: "varchar(255) - Operation identifier",
        credit_cost: "numeric(10,4) - Credits required per operation",
        is_global: "boolean - Global or tenant-specific config"
      }
    }
  },

  // ============================================================================
  // CRM CREDIT ALLOCATION NEEDS
  // ============================================================================
  crmCreditAllocationNeeds: {
    whyCrmNeedsAllocationData: [
      "✅ Track which entities have CRM credits allocated",
      "✅ Enforce credit limits per entity for CRM operations",
      "✅ Provide credit usage analytics by entity",
      "✅ Support hierarchical credit allocation (parent/child entities)",
      "✅ Enable credit transfer between entities",
      "✅ Audit credit consumption by entity and user"
    ],

    crmCreditOperations: [
      "📊 View credit allocation by entity hierarchy",
      "🎯 Enforce per-entity credit limits",
      "📈 Track CRM usage by entity",
      "🔄 Transfer credits between entities",
      "⚡ Real-time credit validation",
      "📋 Credit usage reports by entity"
    ]
  },

  // ============================================================================
  // CRM CREDIT ALLOCATION TABLES
  // ============================================================================
  crmCreditAllocationTables: {
    // 1. CRM CREDIT ALLOCATIONS - Entity to CRM Application Allocations
    crm_credit_allocations: {
      table: "crm_credit_allocations",
      purpose: "CRM-specific view of credit allocations to CRM application",
      fields: {
        allocation_id: "uuid PRIMARY KEY REFERENCES credit_allocations(allocation_id)",
        tenant_id: "uuid NOT NULL REFERENCES tenants(tenant_id)",
        entity_id: "uuid NOT NULL REFERENCES entities(entity_id)",
        allocated_credits: "numeric(15,4) NOT NULL",
        used_credits: "numeric(15,4) DEFAULT 0",
        available_credits: "numeric(15,4) DEFAULT 0",
        allocation_type: "varchar(30) DEFAULT 'manual'",
        allocation_purpose: "text",
        expires_at: "timestamp",
        is_active: "boolean DEFAULT true",
        allocated_at: "timestamp DEFAULT NOW()",
        allocated_by: "uuid REFERENCES tenant_users(user_id)",
        last_updated_at: "timestamp DEFAULT NOW()"
      },
      indexes: [
        "CREATE INDEX idx_crm_credit_alloc_tenant_entity ON crm_credit_allocations(tenant_id, entity_id);",
        "CREATE INDEX idx_crm_credit_alloc_active ON crm_credit_allocations(tenant_id, is_active);",
        "CREATE INDEX idx_crm_credit_alloc_expires ON crm_credit_allocations(expires_at);"
      ]
    },

    // 2. CRM ENTITY CREDIT BALANCES - Simplified view for CRM operations
    crm_entity_credits: {
      table: "crm_entity_credits",
      purpose: "Simplified credit balances for CRM operations",
      fields: {
        credit_id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
        tenant_id: "uuid NOT NULL REFERENCES tenants(tenant_id)",
        entity_id: "uuid NOT NULL REFERENCES entities(entity_id)",
        available_credits: "numeric(15,4) DEFAULT 0",
        reserved_credits: "numeric(15,4) DEFAULT 0",
        total_allocated: "numeric(15,4) DEFAULT 0",
        is_active: "boolean DEFAULT true",
        last_updated_at: "timestamp DEFAULT NOW()"
      },
      indexes: [
        "CREATE INDEX idx_crm_entity_credits_tenant_entity ON crm_entity_credits(tenant_id, entity_id);",
        "CREATE UNIQUE INDEX idx_crm_entity_credits_unique ON crm_entity_credits(tenant_id, entity_id);"
      ]
    },

    // 3. CRM CREDIT ALLOCATION HIERARCHY - For hierarchical credit management
    crm_credit_hierarchy: {
      table: "crm_credit_hierarchy",
      purpose: "Track credit inheritance and transfers between entities",
      fields: {
        hierarchy_id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
        tenant_id: "uuid NOT NULL REFERENCES tenants(tenant_id)",
        parent_entity_id: "uuid REFERENCES entities(entity_id)",
        child_entity_id: "uuid NOT NULL REFERENCES entities(entity_id)",
        can_inherit_credits: "boolean DEFAULT true",
        inheritance_percentage: "numeric(5,2) DEFAULT 100.00",
        transfer_allowed: "boolean DEFAULT false",
        max_transfer_amount: "numeric(15,4)",
        is_active: "boolean DEFAULT true",
        created_at: "timestamp DEFAULT NOW()"
      },
      indexes: [
        "CREATE INDEX idx_crm_credit_hierarchy_tenant ON crm_credit_hierarchy(tenant_id);",
        "CREATE INDEX idx_crm_credit_hierarchy_parent ON crm_credit_hierarchy(parent_entity_id);",
        "CREATE INDEX idx_crm_credit_hierarchy_child ON crm_credit_hierarchy(child_entity_id);"
      ]
    }
  },

  // ============================================================================
  // CRM CREDIT ALLOCATION SCHEMA
  // ============================================================================
  crmCreditAllocationSchema: `
  -- ============================================================================
  -- CRM CREDIT ALLOCATION TABLES
  -- ============================================================================

  -- 1. CRM Credit Allocations (Entity to CRM Application)
  CREATE TABLE crm_credit_allocations (
    allocation_id UUID PRIMARY KEY REFERENCES credit_allocations(allocation_id),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    entity_id UUID NOT NULL REFERENCES entities(entity_id),
    allocated_credits NUMERIC(15,4) NOT NULL,
    used_credits NUMERIC(15,4) DEFAULT 0,
    available_credits NUMERIC(15,4) DEFAULT 0,
    allocation_type VARCHAR(30) DEFAULT 'manual',
    allocation_purpose TEXT,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    allocated_at TIMESTAMP DEFAULT NOW(),
    allocated_by UUID REFERENCES tenant_users(user_id),
    last_updated_at TIMESTAMP DEFAULT NOW()
  );

  -- 2. CRM Entity Credit Balances (Simplified)
  CREATE TABLE crm_entity_credits (
    credit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    entity_id UUID NOT NULL REFERENCES entities(entity_id),
    available_credits NUMERIC(15,4) DEFAULT 0,
    reserved_credits NUMERIC(15,4) DEFAULT 0,
    total_allocated NUMERIC(15,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, entity_id)
  );

  -- 3. CRM Credit Hierarchy (For inheritance and transfers)
  CREATE TABLE crm_credit_hierarchy (
    hierarchy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    parent_entity_id UUID REFERENCES entities(entity_id),
    child_entity_id UUID NOT NULL REFERENCES entities(entity_id),
    can_inherit_credits BOOLEAN DEFAULT true,
    inheritance_percentage NUMERIC(5,2) DEFAULT 100.00,
    transfer_allowed BOOLEAN DEFAULT false,
    max_transfer_amount NUMERIC(15,4),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- ============================================================================
  -- INDEXES FOR PERFORMANCE
  -- ============================================================================
  CREATE INDEX idx_crm_credit_alloc_tenant_entity ON crm_credit_allocations(tenant_id, entity_id);
  CREATE INDEX idx_crm_credit_alloc_active ON crm_credit_allocations(tenant_id, is_active);
  CREATE INDEX idx_crm_credit_alloc_expires ON crm_credit_allocations(expires_at);

  CREATE INDEX idx_crm_entity_credits_tenant_entity ON crm_entity_credits(tenant_id, entity_id);

  CREATE INDEX idx_crm_credit_hierarchy_tenant ON crm_credit_hierarchy(tenant_id);
  CREATE INDEX idx_crm_credit_hierarchy_parent ON crm_credit_hierarchy(parent_entity_id);
  CREATE INDEX idx_crm_credit_hierarchy_child ON crm_credit_hierarchy(child_entity_id);
  `,

  // ============================================================================
  // SYNCHRONIZATION STRATEGY
  // ============================================================================
  syncStrategy: {
    initialSync: "Copy active CRM allocations from credit_allocations where target_application = 'crm'",

    realTimeSync: [
      "Credit allocation changes - Immediate sync",
      "Credit usage updates - Real-time",
      "Credit expiration - Automatic deactivation",
      "Entity hierarchy changes - Update inheritance"
    ],

    periodicSync: [
      "Credit balance reconciliation - Hourly",
      "Expired allocation cleanup - Daily",
      "Credit usage analytics - Daily"
    ],

    onDemandSync: [
      "Credit transfer requests - Immediate",
      "Credit allocation requests - Immediate",
      "Credit usage reports - On request"
    ]
  },

  // ============================================================================
  // CRM CREDIT QUERIES
  // ============================================================================
  crmCreditQueries: {
    // Get entity's available CRM credits
    getEntityCredits: `
    SELECT
      cec.available_credits,
      cec.reserved_credits,
      cec.total_allocated,
      COALESCE(SUM(cca.available_credits), 0) as allocated_available
    FROM crm_entity_credits cec
    LEFT JOIN crm_credit_allocations cca ON cec.entity_id = cca.entity_id
      AND cca.is_active = true
      AND (cca.expires_at IS NULL OR cca.expires_at > NOW())
    WHERE cec.tenant_id = $1 AND cec.entity_id = $2
    GROUP BY cec.credit_id, cec.available_credits, cec.reserved_credits, cec.total_allocated;
    `,

    // Check if entity has enough credits for operation
    checkCreditAvailability: `
    SELECT
      available_credits >= $3 as has_credits,
      available_credits,
      reserved_credits
    FROM crm_entity_credits
    WHERE tenant_id = $1 AND entity_id = $2 AND is_active = true;
    `,

    // Get credit hierarchy for entity
    getCreditHierarchy: `
    WITH RECURSIVE credit_tree AS (
      -- Base: entity's own credits
      SELECT
        entity_id,
        entity_id as root_entity_id,
        available_credits,
        0 as level,
        entity_name as hierarchy_path
      FROM crm_entity_credits cec
      JOIN entities e ON cec.entity_id = e.entity_id
      WHERE cec.tenant_id = $1 AND cec.entity_id = $2

      UNION ALL

      -- Recursive: parent entity credits (if inheritance allowed)
      SELECT
        e.entity_id,
        ct.root_entity_id,
        cec.available_credits,
        ct.level + 1,
        ct.hierarchy_path || ' > ' || e.entity_name
      FROM entities e
      JOIN crm_credit_hierarchy cch ON e.entity_id = cch.parent_entity_id
      JOIN credit_tree ct ON cch.child_entity_id = ct.entity_id
      JOIN crm_entity_credits cec ON e.entity_id = cec.entity_id
      WHERE cch.can_inherit_credits = true
        AND cch.is_active = true
        AND cec.is_active = true
    )
    SELECT * FROM credit_tree ORDER BY level;
    `,

    // Get credit usage by entity
    getCreditUsageByEntity: `
    SELECT
      e.entity_name,
      e.entity_type,
      cec.available_credits,
      cec.total_allocated,
      COALESCE(SUM(cu.credits_used), 0) as total_used,
      COUNT(cu.usage_id) as operation_count
    FROM entities e
    JOIN crm_entity_credits cec ON e.entity_id = cec.entity_id
    LEFT JOIN crm_credit_usage cu ON cec.entity_id = cu.entity_id
    WHERE cec.tenant_id = $1 AND cec.is_active = true
    GROUP BY e.entity_id, e.entity_name, e.entity_type, cec.available_credits, cec.total_allocated
    ORDER BY cec.total_allocated DESC;
    `
  },

  // ============================================================================
  // INTEGRATION WITH EXISTING CRM TABLES
  // ============================================================================
  integrationWithCrmTables: {
    crm_credit_configs: "Defines global CRM credit limits",
    crm_credit_usage: "Links to entity_id for per-entity usage tracking",
    crm_employee_org_assignments: "Links users to entities for credit scoping",

    completeCreditFlow: `
    1. crm_credit_configs: Define CRM operation costs
    2. crm_credit_allocations: Allocate credits to entities for CRM
    3. crm_entity_credits: Simplified credit balances for CRM operations
    4. crm_credit_usage: Track actual CRM usage by entity and user
    5. crm_credit_hierarchy: Manage credit inheritance between entities
    `
  },

  // ============================================================================
  // BENEFITS FOR CRM
  // ============================================================================
  benefits: [
    "✅ Entity-level credit management",
    "✅ Hierarchical credit allocation support",
    "✅ Real-time credit validation",
    "✅ Credit usage analytics by entity",
    "✅ Credit transfer capabilities",
    "✅ Audit trail for credit operations",
    "✅ Performance optimized for CRM queries",
    "✅ Zero redundancy with wrapper credit system"
  ],

  // ============================================================================
  // TOTAL FIELDS SUMMARY
  // ============================================================================
  fieldSummary: {
    crm_credit_allocations: 12,
    crm_entity_credits: 8,
    crm_credit_hierarchy: 10,
    total_new_fields: 30,
    total_with_indexes: 33,
    purpose: "Complete CRM credit allocation management with entity scoping"
  }
};

module.exports = { crmCreditAllocationFieldsAnalysis };
