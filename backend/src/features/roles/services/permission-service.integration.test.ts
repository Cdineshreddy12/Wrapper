import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createTestDb, seedTenant, seedUser, type TestDb } from '../../../db/test-helpers/seed.js';
import { db } from '../../../db/index.js';
import { customRoles } from '../../../db/schema/core/permissions.js';
import { eq } from 'drizzle-orm';
import permissionService from './permission-service.js';

let testDb: TestDb;
let endDb: () => Promise<void>;

beforeAll(() => {
  const conn = createTestDb();
  testDb = conn.db;
  endDb = conn.end;
});

afterAll(() => endDb());

describe('permission-service – getAvailablePermissions (pure)', () => {
  it('returns well-formed structure with applications, modules, and a valid summary', async () => {
    const result = await permissionService.getAvailablePermissions();

    // Top-level shape
    expect(Array.isArray(result.applications)).toBe(true);
    expect(result.applications.length).toBeGreaterThan(0);
    expect(typeof result.summary).toBe('object');
    expect(typeof result.structure).toBe('object');

    // Summary counts must be positive and internally consistent
    const { applicationCount, moduleCount, operationCount } = result.summary;
    expect(applicationCount).toBeGreaterThan(0);
    expect(moduleCount).toBeGreaterThan(0);
    expect(operationCount).toBeGreaterThan(moduleCount); // More operations than modules

    // Each application must have an appCode and a modules array
    for (const app of result.applications as Array<{ appCode: string; modules: unknown[] }>) {
      expect(typeof app.appCode).toBe('string');
      expect(Array.isArray(app.modules)).toBe(true);
    }
  });
});

describe('permission-service – createRole and getTenantRoles (DB-backed)', () => {
  it('createRole inserts a custom role and returns the persisted record', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);
    const suffix = randomUUID().slice(0, 8);
    const roleName = `Integration Test Role ${suffix}`;

    const role = await permissionService.createRole({
      tenantId: tenant.tenantId,
      name: roleName,
      description: 'Created by integration test',
      permissions: { crm: { leads: ['create', 'read'] } },
      createdBy: user.userId,
    } as any);

    expect(role).toBeDefined();
    expect(role.tenantId).toBe(tenant.tenantId);
    expect(role.roleName).toBe(roleName);
    expect(role.isSystemRole).toBe(false);
    expect(role.roleId).toBeTruthy();

    // Confirm it's actually in the DB
    const rows = await db
      .select()
      .from(customRoles)
      .where(eq(customRoles.roleId, role.roleId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.roleName).toBe(roleName);
  });

  it('createRole throws when a role with the same name already exists for the tenant', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);
    const suffix = randomUUID().slice(0, 8);
    const roleName = `Duplicate Role ${suffix}`;

    await permissionService.createRole({
      tenantId: tenant.tenantId,
      name: roleName,
      description: 'First insert',
      permissions: {},
      createdBy: user.userId,
    } as any);

    await expect(
      permissionService.createRole({
        tenantId: tenant.tenantId,
        name: roleName,
        description: 'Duplicate attempt',
        permissions: {},
        createdBy: user.userId,
      } as any)
    ).rejects.toThrow(`Role with name "${roleName}" already exists`);
  });

  it('duplicate-name check is tenant-scoped: same name allowed across different tenants', async () => {
    const tenantA = await seedTenant(testDb);
    const tenantB = await seedTenant(testDb);
    const userA = await seedUser(testDb, tenantA.tenantId);
    const userB = await seedUser(testDb, tenantB.tenantId);
    const roleName = `Shared Name ${randomUUID().slice(0, 8)}`;

    const roleA = await permissionService.createRole({
      tenantId: tenantA.tenantId,
      name: roleName,
      description: 'tenant A',
      permissions: {},
      createdBy: userA.userId,
    } as any);

    // Should NOT throw — different tenant
    const roleB = await permissionService.createRole({
      tenantId: tenantB.tenantId,
      name: roleName,
      description: 'tenant B',
      permissions: {},
      createdBy: userB.userId,
    } as any);

    expect(roleA.tenantId).toBe(tenantA.tenantId);
    expect(roleB.tenantId).toBe(tenantB.tenantId);
    expect(roleA.roleId).not.toBe(roleB.roleId);
  });

  it('getTenantRoles returns 0 for a fresh tenant with no roles', async () => {
    const tenant = await seedTenant(testDb);

    const result = await permissionService.getTenantRoles(tenant.tenantId);
    expect(result.total).toBe(0);
    expect(result.data).toHaveLength(0);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(0);
  });

  it('getTenantRoles returns created roles with correct total and pagination shape', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);
    const suffix = randomUUID().slice(0, 8);

    // Insert 3 roles for this tenant
    for (let i = 0; i < 3; i++) {
      await permissionService.createRole({
        tenantId: tenant.tenantId,
        name: `Paged Role ${suffix} ${i}`,
        description: `Role ${i}`,
        permissions: {},
        createdBy: user.userId,
      } as any);
    }

    // Fetch all
    const all = await permissionService.getTenantRoles(tenant.tenantId);
    expect(all.total).toBe(3);
    expect(all.data).toHaveLength(3);

    // Paginate: page 1, limit 2 → 2 rows, 2 pages
    const page1 = await permissionService.getTenantRoles(tenant.tenantId, { page: 1, limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(3);
    expect(page1.totalPages).toBe(2);

    // Page 2 → 1 row
    const page2 = await permissionService.getTenantRoles(tenant.tenantId, { page: 2, limit: 2 });
    expect(page2.data).toHaveLength(1);
  });

  it('getTenantRoles search option filters by role name substring', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);
    const suffix = randomUUID().slice(0, 8);

    await permissionService.createRole({ tenantId: tenant.tenantId, name: `Alpha ${suffix}`, description: null, permissions: {}, createdBy: user.userId } as any);
    await permissionService.createRole({ tenantId: tenant.tenantId, name: `Beta ${suffix}`, description: null, permissions: {}, createdBy: user.userId } as any);

    const alphaResults = await permissionService.getTenantRoles(tenant.tenantId, { search: 'Alpha' });
    // Note: `total` reflects the unfiltered tenant role count; `data` IS filtered by the search term
    expect(alphaResults.data).toHaveLength(1);
    expect((alphaResults.data[0] as { roleName: string }).roleName).toContain('Alpha');
  });
});
