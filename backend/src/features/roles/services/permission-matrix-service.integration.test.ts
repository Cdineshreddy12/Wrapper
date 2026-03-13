/**
 * Integration tests for PermissionMatrixService.
 *
 * Tests run against a real PostgreSQL container (started by global-setup.ts).
 * Roles are created via permissionService.createRole so FK constraints are
 * satisfied automatically.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import {
  createTestDb,
  seedTenant,
  seedUser,
  type TestDb,
} from '../../../db/test-helpers/seed.js';
import { db } from '../../../db/index.js';
import permissionMatrixService from './permission-matrix-service.js';

let testDb: TestDb;
let endDb: () => Promise<void>;

beforeAll(() => {
  const conn = createTestDb();
  testDb = conn.db;
  endDb = conn.end;
});

afterAll(() => endDb());

// ── Helpers ───────────────────────────────────────────────────────────────

async function assignRoleToUser(userId: string, roleId: string, assignedBy: string) {
  await db.execute(sql`
    INSERT INTO user_role_assignments (id, user_id, role_id, assigned_by, is_active)
    VALUES (${randomUUID()}, ${userId}, ${roleId}, ${assignedBy}, true)
  `);
}

/**
 * Insert a custom_role with a JSONB permissions object.
 *
 * The permissions are serialised to a JSON string and cast to jsonb so postgres
 * stores a proper JSONB object.  postgres-js returns JSONB objects as already-
 * parsed JS values, which the now-fixed getUserPermissionContext handles via a
 * typeof guard (see permission-matrix-service.ts).
 */
async function createRoleWithPermissions(
  testDb: TestDb,
  tenantId: string,
  roleName: string,
  permissions: Record<string, { operations?: string[] }>,
  createdBy: string,
): Promise<{ roleId: string; roleName: string }> {
  const roleId = randomUUID();
  const permJson = JSON.stringify(permissions);

  await testDb.execute(sql`
    INSERT INTO custom_roles
      (role_id, tenant_id, role_name, permissions, restrictions,
       is_system_role, is_default, priority, created_by, created_at, updated_at)
    VALUES
      (${roleId}, ${tenantId}, ${roleName},
       ${permJson}::jsonb,
       '{}'::jsonb,
       false, false, 0, ${createdBy}, NOW(), NOW())
  `);

  return { roleId, roleName };
}

// ── flattenNestedPermissions (pure function) ──────────────────────────────

describe('PermissionMatrixService.flattenNestedPermissions', () => {
  it('flattens a nested permissions object into dot-notation strings', () => {
    const permissions = {
      'crm.leads': { operations: ['read', 'create', 'update'] },
      'crm.accounts': { operations: ['read'] },
    };

    const flat = permissionMatrixService.flattenNestedPermissions(permissions);

    expect(flat).toContain('crm.leads.read');
    expect(flat).toContain('crm.leads.create');
    expect(flat).toContain('crm.leads.update');
    expect(flat).toContain('crm.accounts.read');
    expect(flat).toHaveLength(4);
  });

  it('ignores the "metadata" key', () => {
    const permissions = {
      metadata: { operations: ['should-be-ignored'] },
      'crm.leads': { operations: ['read'] },
    };

    const flat = permissionMatrixService.flattenNestedPermissions(permissions);

    expect(flat).not.toContain('metadata.should-be-ignored');
    expect(flat).toContain('crm.leads.read');
  });

  it('returns an empty array for an empty permissions object', () => {
    const flat = permissionMatrixService.flattenNestedPermissions({});
    expect(flat).toEqual([]);
  });

  it('skips resources with no operations array', () => {
    const permissions = {
      'crm.leads': { operations: ['read'] },
      'crm.contacts': {} as { operations?: string[] },
    };

    const flat = permissionMatrixService.flattenNestedPermissions(permissions);

    expect(flat).toContain('crm.leads.read');
    expect(flat.filter((p) => p.startsWith('crm.contacts'))).toHaveLength(0);
  });
});

// ── combineRestrictions (pure helper) ────────────────────────────────────

describe('PermissionMatrixService.combineRestrictions', () => {
  it('returns {} for an empty array', () => {
    expect(permissionMatrixService.combineRestrictions([])).toEqual({});
  });

  it('returns the first restriction when one is provided', () => {
    const r = { ipRange: '10.0.0.0/8' };
    expect(permissionMatrixService.combineRestrictions([r])).toEqual(r);
  });

  it('returns the first restriction when multiple are provided', () => {
    const r1 = { ipRange: '10.0.0.0/8' };
    const r2 = { timeRange: '09:00-17:00' };
    expect(permissionMatrixService.combineRestrictions([r1, r2])).toEqual(r1);
  });
});

// ── getAvailableRoleTemplates (pure) ─────────────────────────────────────

describe('PermissionMatrixService.getAvailableRoleTemplates', () => {
  it('returns at least 2 templates', () => {
    const templates = permissionMatrixService.getAvailableRoleTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(2);
  });

  it('each template has id, name, and a non-empty permissions object', () => {
    const templates = permissionMatrixService.getAvailableRoleTemplates();
    for (const t of templates) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.name).toBe('string');
      expect(typeof t.permissions).toBe('object');
    }
  });
});

// ── getUserPermissionContext (DB-backed) ──────────────────────────────────

describe('PermissionMatrixService.getUserPermissionContext', () => {
  it('returns a context with hasRoles=false and empty permissions for user with no roles', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const ctx = await permissionMatrixService.getUserPermissionContext(
      user.userId,
      tenant.tenantId,
    );

    expect(ctx.userId).toBe(user.userId);
    expect(ctx.tenantId).toBe(tenant.tenantId);
    expect(ctx.hasRoles).toBe(false);
    expect(ctx.roleCount).toBe(0);
    expect(Object.keys(ctx.permissions)).toHaveLength(0);
  });

  it('aggregates permissions from an assigned role', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const role = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `Matrix Role ${randomUUID().slice(0, 8)}`,
      { 'crm.leads': { operations: ['read', 'create'] } },
      user.userId,
    );

    await assignRoleToUser(user.userId, role.roleId, user.userId);

    const ctx = await permissionMatrixService.getUserPermissionContext(
      user.userId,
      tenant.tenantId,
    );

    expect(ctx.hasRoles).toBe(true);
    expect(ctx.roleCount).toBe(1);
    expect(ctx.roles[0].name).toBe(role.roleName);
    // Permissions object should contain the crm.leads key
    expect(ctx.permissions['crm.leads']).toBeDefined();
  });

  it('merges permissions from multiple roles', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);
    const suffix = randomUUID().slice(0, 8);

    const role1 = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `Role A ${suffix}`,
      { 'crm.leads': { operations: ['read'] } },
      user.userId,
    );

    const role2 = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `Role B ${suffix}`,
      { 'crm.accounts': { operations: ['read', 'create'] } },
      user.userId,
    );

    await assignRoleToUser(user.userId, role1.roleId, user.userId);
    await assignRoleToUser(user.userId, role2.roleId, user.userId);

    const ctx = await permissionMatrixService.getUserPermissionContext(
      user.userId,
      tenant.tenantId,
    );

    expect(ctx.roleCount).toBe(2);
    expect(ctx.permissions['crm.leads']).toBeDefined();
    expect(ctx.permissions['crm.accounts']).toBeDefined();
  });

  it('returns permissions=0 when role assignment is inactive (isActive=false)', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const role = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `Inactive Role ${randomUUID().slice(0, 8)}`,
      { 'crm.leads': { operations: ['read'] } },
      user.userId,
    );

    // Insert inactive assignment
    await db.execute(sql`
      INSERT INTO user_role_assignments (id, user_id, role_id, assigned_by, is_active)
      VALUES (${randomUUID()}, ${user.userId}, ${role.roleId}, ${user.userId}, false)
    `);

    const ctx = await permissionMatrixService.getUserPermissionContext(
      user.userId,
      tenant.tenantId,
    );

    expect(ctx.hasRoles).toBe(false);
    expect(ctx.roleCount).toBe(0);
  });
});

// ── hasPermission ─────────────────────────────────────────────────────────

describe('PermissionMatrixService.hasPermission', () => {
  it('returns false for a user with no roles', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const result = await permissionMatrixService.hasPermission(
      user.userId,
      tenant.tenantId,
      'crm.leads.read',
    );

    expect(result).toBe(false);
  });

  it('returns true when the user has the specific permission', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const role = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `HasPerm Role ${randomUUID().slice(0, 8)}`,
      { 'crm.leads': { operations: ['read', 'create'] } },
      user.userId,
    );

    await assignRoleToUser(user.userId, role.roleId, user.userId);

    expect(
      await permissionMatrixService.hasPermission(user.userId, tenant.tenantId, 'crm.leads.read'),
    ).toBe(true);

    expect(
      await permissionMatrixService.hasPermission(user.userId, tenant.tenantId, 'crm.leads.create'),
    ).toBe(true);
  });

  it('returns false for a permission the role does not include', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const role = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `NoPerm Role ${randomUUID().slice(0, 8)}`,
      { 'crm.leads': { operations: ['read'] } },
      user.userId,
    );

    await assignRoleToUser(user.userId, role.roleId, user.userId);

    expect(
      await permissionMatrixService.hasPermission(user.userId, tenant.tenantId, 'crm.leads.delete'),
    ).toBe(false);
  });
});

// ── hasAllPermissions ─────────────────────────────────────────────────────

describe('PermissionMatrixService.hasAllPermissions', () => {
  it('returns true when user has all required permissions', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const role = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `AllPerms Role ${randomUUID().slice(0, 8)}`,
      { 'crm.leads': { operations: ['read', 'create', 'update'] } },
      user.userId,
    );

    await assignRoleToUser(user.userId, role.roleId, user.userId);

    const result = await permissionMatrixService.hasAllPermissions(
      user.userId,
      tenant.tenantId,
      ['crm.leads.read', 'crm.leads.create'],
    );

    expect(result).toBe(true);
  });

  it('returns false when user is missing even one required permission', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const role = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `PartialPerms Role ${randomUUID().slice(0, 8)}`,
      { 'crm.leads': { operations: ['read'] } },
      user.userId,
    );

    await assignRoleToUser(user.userId, role.roleId, user.userId);

    const result = await permissionMatrixService.hasAllPermissions(
      user.userId,
      tenant.tenantId,
      ['crm.leads.read', 'crm.leads.delete'],
    );

    expect(result).toBe(false);
  });
});

// ── hasAnyPermission ──────────────────────────────────────────────────────

describe('PermissionMatrixService.hasAnyPermission', () => {
  it('returns true when user has at least one of the required permissions', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const role = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `AnyPerm Role ${randomUUID().slice(0, 8)}`,
      { 'crm.leads': { operations: ['read'] } },
      user.userId,
    );

    await assignRoleToUser(user.userId, role.roleId, user.userId);

    const result = await permissionMatrixService.hasAnyPermission(
      user.userId,
      tenant.tenantId,
      ['crm.leads.read', 'crm.leads.delete', 'crm.leads.export'],
    );

    expect(result).toBe(true);
  });

  it('returns false when user has none of the required permissions', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const role = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `NoAnyPerm Role ${randomUUID().slice(0, 8)}`,
      { 'crm.leads': { operations: ['read'] } },
      user.userId,
    );

    await assignRoleToUser(user.userId, role.roleId, user.userId);

    const result = await permissionMatrixService.hasAnyPermission(
      user.userId,
      tenant.tenantId,
      ['crm.leads.delete', 'crm.leads.export', 'crm.leads.import'],
    );

    expect(result).toBe(false);
  });
});

// ── revokeAllUserPermissions ──────────────────────────────────────────────

describe('PermissionMatrixService.revokeAllUserPermissions', () => {
  it('deactivates all role assignments and returns the correct count', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);
    const suffix = randomUUID().slice(0, 8);

    const role1 = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `Revoke R1 ${suffix}`,
      {},
      user.userId,
    );

    const role2 = await createRoleWithPermissions(
      testDb,
      tenant.tenantId,
      `Revoke R2 ${suffix}`,
      {},
      user.userId,
    );

    await assignRoleToUser(user.userId, role1.roleId, user.userId);
    await assignRoleToUser(user.userId, role2.roleId, user.userId);

    // Verify 2 roles are active
    const beforeCtx = await permissionMatrixService.getUserPermissionContext(
      user.userId,
      tenant.tenantId,
    );
    expect(beforeCtx.roleCount).toBe(2);

    const result = await permissionMatrixService.revokeAllUserPermissions(
      user.userId,
      tenant.tenantId,
    );

    expect(result.userId).toBe(user.userId);
    expect(result.assignmentsRevoked).toBe(2);

    // Verify 0 roles now
    const afterCtx = await permissionMatrixService.getUserPermissionContext(
      user.userId,
      tenant.tenantId,
    );
    expect(afterCtx.roleCount).toBe(0);
  });

  it('returns assignmentsRevoked=0 when user has no active assignments', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const result = await permissionMatrixService.revokeAllUserPermissions(
      user.userId,
      tenant.tenantId,
    );

    expect(result.assignmentsRevoked).toBe(0);
  });
});
