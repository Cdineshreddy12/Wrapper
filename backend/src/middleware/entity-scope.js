import { db } from '../db/index.js';
import { entities, responsiblePersons, tenantUsers } from '../db/schema/index.js';
import { eq, and, or, sql } from 'drizzle-orm';

/**
 * Get user's accessible entity IDs based on their role
 * - Tenant Admin: ALL entities in tenant
 * - Entity Admin (Responsible Person): Their entity + all children
 * - Regular User: None (or only their assigned entity)
 * 
 * @param {string} userId - Internal user ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} Entity scope object
 */
export async function getUserAccessibleEntities(userId, tenantId) {
  console.log('🔍 Getting accessible entities for user:', { userId, tenantId });

  // Check if user is tenant admin
  const [user] = await db
    .select({ 
      isTenantAdmin: tenantUsers.isTenantAdmin,
      email: tenantUsers.email 
    })
    .from(tenantUsers)
    .where(and(
      eq(tenantUsers.userId, userId),
      eq(tenantUsers.tenantId, tenantId)
    ))
    .limit(1);

  if (!user) {
    console.log('❌ User not found');
    return {
      scope: 'none',
      entities: [],
      entityIds: [], // Keep for backward compatibility
      isUnrestricted: false
    };
  }

  // Tenant Admin sees EVERYTHING
  if (user.isTenantAdmin) {
    console.log('👑 User is Tenant Admin - unrestricted access');
    const allEntities = await db
      .select({
        entityId: entities.entityId,
        entityName: entities.entityName,
        entityType: entities.entityType,
        entityCode: entities.entityCode
      })
      .from(entities)
      .where(eq(entities.tenantId, tenantId));

    return {
      scope: 'tenant',
      entities: allEntities,
      entityIds: allEntities.map(e => e.entityId), // Keep for backward compatibility
      isUnrestricted: true,
      userEmail: user.email
    };
  }

  // Get entities where user is responsible person
  const responsibilities = await db
    .select({
      entityId: responsiblePersons.entityId,
      entityType: responsiblePersons.entityType,
      scope: responsiblePersons.scope,
      responsibilityLevel: responsiblePersons.responsibilityLevel
    })
    .from(responsiblePersons)
    .where(and(
      eq(responsiblePersons.userId, userId),
      eq(responsiblePersons.isActive, true)
    ));

  if (responsibilities.length === 0) {
    console.log('⚠️ User has no entity responsibilities');
    return {
      scope: 'none',
      entities: [],
      entityIds: [], // Keep for backward compatibility
      isUnrestricted: false,
      userEmail: user.email
    };
  }

  console.log('📋 User has', responsibilities.length, 'entity responsibilities');

  // For each entity, get it + all its children
  const accessibleEntityIds = new Set();
  const accessibleEntities = [];

  for (const resp of responsibilities) {
    // Get the entity itself
    const [entity] = await db
      .select({
        entityId: entities.entityId,
        hierarchyPath: entities.hierarchyPath,
        entityName: entities.entityName,
        entityType: entities.entityType,
        entityCode: entities.entityCode
      })
      .from(entities)
      .where(and(
        eq(entities.entityId, resp.entityId),
        eq(entities.tenantId, tenantId)
      ))
      .limit(1);

    if (!entity) {
      console.log('⚠️ Entity not found:', resp.entityId);
      continue;
    }

    // Add the entity itself
    if (!accessibleEntityIds.has(entity.entityId)) {
      accessibleEntityIds.add(entity.entityId);
      accessibleEntities.push({
        entityId: entity.entityId,
        entityName: entity.entityName,
        entityType: entity.entityType,
        entityCode: entity.entityCode
      });
      console.log('✅ Added entity:', entity.entityName, entity.entityId);
    }

    // Get all child entities using parent relationship
    const childEntities = await db
      .select({
        entityId: entities.entityId,
        entityName: entities.entityName,
        entityType: entities.entityType,
        entityCode: entities.entityCode
      })
      .from(entities)
      .where(and(
        eq(entities.tenantId, tenantId),
        eq(entities.parentEntityId, resp.entityId)
      ));

    childEntities.forEach(child => {
      if (!accessibleEntityIds.has(child.entityId)) {
        accessibleEntityIds.add(child.entityId);
        accessibleEntities.push({
          entityId: child.entityId,
          entityName: child.entityName,
          entityType: child.entityType,
          entityCode: child.entityCode
        });
        console.log('  ↳ Added child:', child.entityName, child.entityId);
      }
    });

    // Recursively get all descendants and their details
    const descendantIds = await getDescendantEntities(resp.entityId, tenantId);
    if (descendantIds.length > 0) {
      const descendants = await db
        .select({
          entityId: entities.entityId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          entityCode: entities.entityCode
        })
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          sql`${entities.entityId} IN (${descendantIds.map(id => `'${id}'`).join(',')})`
        ));

      descendants.forEach(desc => {
        if (!accessibleEntityIds.has(desc.entityId)) {
          accessibleEntityIds.add(desc.entityId);
          accessibleEntities.push({
            entityId: desc.entityId,
            entityName: desc.entityName,
            entityType: desc.entityType,
            entityCode: desc.entityCode
          });
        }
      });
    }
  }

  console.log('✅ Total accessible entities:', accessibleEntityIds.size);

  return {
    scope: 'entity',
    entities: accessibleEntities,
    entityIds: Array.from(accessibleEntityIds), // Keep for backward compatibility
    isUnrestricted: false,
    responsibilities,
    userEmail: user.email
  };
}

/**
 * Recursively get all descendant entities
 * @param {string} parentId - Parent entity ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<string[]>} Array of entity IDs
 */
async function getDescendantEntities(parentId, tenantId, visited = new Set()) {
  // Prevent infinite loops
  if (visited.has(parentId)) {
    return [];
  }
  visited.add(parentId);

  const descendants = [];
  
  // Get direct children
  const children = await db
    .select({ entityId: entities.entityId })
    .from(entities)
    .where(and(
      eq(entities.tenantId, tenantId),
      eq(entities.parentEntityId, parentId)
    ));

  for (const child of children) {
    descendants.push(child.entityId);
    // Recursively get their children
    const childDescendants = await getDescendantEntities(child.entityId, tenantId, visited);
    descendants.push(...childDescendants);
  }

  return descendants;
}

/**
 * Middleware: Add entity scope to request context
 * Use this middleware after authenticateToken
 */
export async function entityScopeMiddleware(request, reply) {
  if (!request.userContext) {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  const { internalUserId, tenantId } = request.userContext;
  
  try {
    const entityScope = await getUserAccessibleEntities(internalUserId, tenantId);
    
    // Add to request context
    request.entityScope = entityScope;
    
    console.log('🔐 Entity Scope Set:', {
      userId: internalUserId,
      scope: entityScope.scope,
      entityCount: entityScope.entityIds.length,
      isUnrestricted: entityScope.isUnrestricted
    });
  } catch (error) {
    console.error('❌ Failed to get entity scope:', error);
    request.entityScope = {
      scope: 'none',
      entityIds: [],
      isUnrestricted: false
    };
  }
}

/**
 * Helper: Check if user can access an entity
 * @param {Object} entityScope - Entity scope from request
 * @param {string} entityId - Entity ID to check
 * @returns {boolean}
 */
export function canAccessEntity(entityScope, entityId) {
  if (!entityScope) return false;
  if (entityScope.isUnrestricted) return true;
  return entityScope.entityIds.includes(entityId);
}

/**
 * Helper: Filter entities array to only accessible ones
 * @param {Array} entities - Array of entities
 * @param {Object} entityScope - Entity scope from request
 * @param {string} idField - Field name for entity ID (default: 'entityId')
 * @returns {Array}
 */
export function filterEntitiesByScope(entities, entityScope, idField = 'entityId') {
  if (!entityScope) return [];
  if (entityScope.isUnrestricted) return entities;
  
  return entities.filter(entity => 
    entityScope.entityIds.includes(entity[idField])
  );
}

/**
 * Helper: Build SQL WHERE clause for entity filtering
 * @param {Object} entityScope - Entity scope from request
 * @param {string} columnName - Column name for entity ID
 * @returns {SQL|null} SQL condition or null if unrestricted
 */
export function buildEntityScopeCondition(entityScope, columnName = 'entity_id') {
  if (!entityScope) {
    return sql`1 = 0`; // No access
  }
  
  if (entityScope.isUnrestricted) {
    return null; // No filter needed
  }
  
  if (entityScope.entityIds.length === 0) {
    return sql`1 = 0`; // No access
  }
  
  // Return SQL IN condition
  return sql`${sql.raw(columnName)} = ANY(${entityScope.entityIds})`;
}

export default {
  getUserAccessibleEntities,
  entityScopeMiddleware,
  canAccessEntity,
  filterEntitiesByScope,
  buildEntityScopeCondition
};

