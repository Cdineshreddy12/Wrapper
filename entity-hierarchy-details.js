/**
 * ENTITY HIERARCHY MAINTENANCE - Complete Details
 * Where and how the organizational hierarchy is maintained
 */

const entityHierarchyDetails = {
  // ============================================================================
  // HIERARCHY LOCATION - EXISTING ENTITIES TABLE
  // ============================================================================
  hierarchyLocation: {
    table: "entities (existing unified table)",
    file: "backend/src/db/schema/unified-entities.js",
    purpose: "Single table handling ALL organizational units and their hierarchy"
  },

  // ============================================================================
  // HIERARCHY FIELDS IN ENTITIES TABLE
  // ============================================================================
  hierarchyFields: {
    // PRIMARY HIERARCHY STRUCTURE
    parentEntityId: {
      field: "parentEntityId: uuid",
      purpose: "Self-reference to parent entity (NULL for root entities)",
      example: "Marketing Dept → parentEntityId = NULL (root)",
      example: "Content Team → parentEntityId = marketing-dept-id"
    },

    entityLevel: {
      field: "entityLevel: integer DEFAULT 1",
      purpose: "Tracks depth in hierarchy (1 = root, 2 = child, etc.)",
      example: "Tenant Company = level 1, Marketing Dept = level 2, Design Team = level 3"
    },

    // AUTOMATIC PATH GENERATION
    hierarchyPath: {
      field: "hierarchyPath: text",
      purpose: "Auto-generated human-readable path",
      example: "'Marketing/Content Team/Design Sub-team'",
      maintenance: "Updated automatically via triggers"
    },

    fullHierarchyPath: {
      field: "fullHierarchyPath: text",
      purpose: "Complete path including all ancestors",
      example: "'Company/Marketing/Content Team/Design Sub-team'",
      maintenance: "Updated automatically via triggers"
    },

    // POSTGRESQL LTREE FOR FAST QUERIES
    path: {
      field: "path: ltree",
      purpose: "PostgreSQL ltree type for fast hierarchical queries",
      example: "'company.marketing.content.design'",
      maintenance: "Auto-generated via trigger function"
    }
  },

  // ============================================================================
  // HOW HIERARCHY IS MAINTAINED
  // ============================================================================
  hierarchyMaintenance: {
    // 1. SELF-REFERENCING FOREIGN KEY
    selfReference: {
      sql: "parentEntityId: uuid REFERENCES entities(entityId)",
      purpose: "Enforces referential integrity in hierarchy",
      constraint: "Cannot reference non-existent parent"
    },

    // 2. AUTOMATIC PATH GENERATION TRIGGER
    pathGenerationTrigger: {
      function: `
CREATE OR REPLACE FUNCTION update_entity_path() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_entity_id IS NULL THEN
    NEW.path = NEW.entity_id::text;
    NEW.hierarchy_path = NEW.entity_name;
    NEW.full_hierarchy_path = NEW.entity_name;
    NEW.entity_level = 1;
  ELSE
    SELECT
      parent.path || NEW.entity_id::text,
      parent.hierarchy_path || '/' || NEW.entity_name,
      parent.full_hierarchy_path || '/' || NEW.entity_name,
      parent.entity_level + 1
    INTO NEW.path, NEW.hierarchy_path, NEW.full_hierarchy_path, NEW.entity_level
    FROM entities parent
    WHERE parent.entity_id = NEW.parent_entity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
      `,
      trigger: `
CREATE TRIGGER trigger_entity_path
  BEFORE INSERT OR UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_entity_path();
      `,
      purpose: "Automatically maintains all path fields when hierarchy changes"
    },

    // 3. INDEXES FOR PERFORMANCE
    performanceIndexes: [
      "CREATE INDEX idx_entities_parent ON entities(parent_entity_id);",
      "CREATE INDEX idx_entities_tenant ON entities(tenant_id);",
      "CREATE INDEX idx_entities_level ON entities(entity_level);",
      "CREATE INDEX idx_entities_path ON entities USING GIST (path);"
    ]
  },

  // ============================================================================
  // HIERARCHY QUERY PATTERNS
  // ============================================================================
  hierarchyQueries: {
    // Get all children of an entity (subtree)
    getChildren: `
SELECT * FROM entities
WHERE path <@ (SELECT path FROM entities WHERE entity_id = $1)
  AND entity_id != $1
ORDER BY path;
    `,

    // Get direct children only
    getDirectChildren: `
SELECT * FROM entities
WHERE parent_entity_id = $1
ORDER BY entity_name;
    `,

    // Get full path to root
    getPathToRoot: `
SELECT * FROM entities
WHERE $1 <@ path
ORDER BY entity_level;
    `,

    // Get entities at specific level
    getByLevel: `
SELECT * FROM entities
WHERE tenant_id = $1 AND entity_level = $2
ORDER BY entity_name;
    `,

    // Check if entity is descendant of another
    isDescendant: `
SELECT EXISTS(
  SELECT 1 FROM entities
  WHERE entity_id = $1 AND path <@ (SELECT path FROM entities WHERE entity_id = $2)
);
    `,

    // Get hierarchy tree with depth
    getHierarchyTree: `
WITH RECURSIVE hierarchy AS (
  SELECT entity_id, entity_name, entity_type, entity_level, parent_entity_id,
         entity_name as path_name, 0 as depth
  FROM entities
  WHERE parent_entity_id IS NULL AND tenant_id = $1

  UNION ALL

  SELECT e.entity_id, e.entity_name, e.entity_type, e.entity_level, e.parent_entity_id,
         h.path_name || '/' || e.entity_name, h.depth + 1
  FROM entities e
  JOIN hierarchy h ON e.parent_entity_id = h.entity_id
)
SELECT * FROM hierarchy ORDER BY path_name;
    `
  },

  // ============================================================================
  // CRM USAGE OF ENTITY HIERARCHY
  // ============================================================================
  crmEntityUsage: {
    // CRM references existing entities for organizational structure
    crmTablesUsingEntities: [
      {
        table: "crm_employee_org_assignments",
        field: "org_id (uuid REFERENCES entities(entity_id))",
        purpose: "Links employees to organizational entities"
      },
      {
        table: "crm_role_assignments",
        field: "org_id (uuid REFERENCES entities(entity_id))",
        purpose: "Scopes role assignments to organizational entities"
      },
      {
        table: "crm_activity_logs",
        field: "org_id (uuid REFERENCES entities(entity_id))",
        purpose: "Tracks which organizational entity was affected"
      }
    ],

    // CRM can query existing hierarchy
    crmHierarchyQueries: {
      // Get user's accessible organizations
      userOrganizations: `
SELECT e.* FROM entities e
JOIN crm_employee_org_assignments cea ON cea.org_id = e.entity_id
WHERE cea.user_id = $1 AND cea.is_active = true
ORDER BY e.path;
      `,

      // Get user's organizational permissions
      userOrgPermissions: `
SELECT DISTINCT e.entity_name, e.entity_type, cra.permissions
FROM entities e
JOIN crm_role_assignments cra ON cra.org_id = e.entity_id
WHERE cra.user_id = $1 AND cra.is_active = true
ORDER BY e.path;
      `,

      // Check if user can access entity
      canAccessEntity: `
SELECT EXISTS(
  SELECT 1 FROM crm_employee_org_assignments cea
  JOIN entities e ON cea.org_id = e.entity_id
  WHERE cea.user_id = $1 AND cea.is_active = true
    AND ($2 <@ e.path OR e.entity_id = $2)
);
      `
    }
  },

  // ============================================================================
  // HIERARCHY MAINTENANCE OPERATIONS
  // ============================================================================
  hierarchyOperations: {
    createEntity: {
      sql: `
INSERT INTO entities (
  tenant_id, entity_type, entity_name, entity_code, parent_entity_id
) VALUES ($1, $2, $3, $4, $5);
      `,
      triggers: "Automatically updates path, hierarchy_path, full_hierarchy_path, entity_level"
    },

    moveEntity: {
      sql: `
UPDATE entities
SET parent_entity_id = $2
WHERE entity_id = $1;
      `,
      triggers: "Automatically recalculates all path fields for entity and descendants"
    },

    deleteEntity: {
      consideration: "Need to handle child entities and referential integrity",
      options: [
        "Cascade delete (removes subtree)",
        "Move children to parent",
        "Prevent deletion if has children"
      ]
    },

    bulkOperations: {
      tenantHierarchyRebuild: `
-- Rebuild all paths for a tenant (maintenance operation)
UPDATE entities SET entity_id = entity_id
WHERE tenant_id = $1;
      `,
      note: "Trigger will recalculate all paths automatically"
    }
  },

  // ============================================================================
  // SUMMARY - WHERE HIERARCHY IS MAINTAINED
  // ============================================================================
  summary: {
    location: "EXISTING entities table - NO new tables needed for hierarchy",
    maintenance: "AUTOMATIC via database triggers",
    crmIntegration: "CRM tables reference entities.entity_id directly",
    performance: "LTREE indexes enable fast hierarchical queries",
    integrity: "Self-referencing foreign keys enforce structure",

    keyPoints: [
      "✅ Hierarchy maintained in existing entities table",
      "✅ No redundant organization tables created",
      "✅ Automatic path generation via triggers",
      "✅ CRM uses entities for organizational scoping",
      "✅ Fast queries with GIST indexes on ltree paths"
    ]
  }
};

module.exports = { entityHierarchyDetails };
