import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, seedTenant, seedUser, type TestDb } from '../../../db/test-helpers/seed.js';
import { db } from '../../../db/index.js';
import { customRoles } from '../../../db/schema/core/permissions.js';
import { CustomRoleService } from './custom-role-service.js';

let testDb: TestDb;
let endDb: () => Promise<void>;

beforeAll(() => {
  const conn = createTestDb();
  testDb = conn.db;
  endDb = conn.end;
});

afterAll(() => endDb());

describe('CustomRoleService – resolveUserPermissions', () => {
  it('returns empty permissions for a tenant with no custom roles', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    const result = await CustomRoleService.resolveUserPermissions({
      userId: user.userId,
      tenantId: tenant.tenantId,
    });

    expect(result.permissions).toHaveLength(0);
    expect(result.sources).toHaveLength(0);
    expect(result.summary.totalPermissions).toBe(0);
    expect(result.summary.rolePermissions).toBe(0);
    expect(result.summary.userOverrides).toBe(0);
  });

  it('flattens hierarchical permissions from a seeded custom role', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    // Seed a custom role with hierarchical permissions directly via DB
    await db.insert(customRoles).values({
      tenantId: tenant.tenantId,
      roleName: 'Sales Manager',
      description: 'Integration test role',
      permissions: { crm: { leads: ['create', 'read'], contacts: ['read'] } } as unknown as Record<string, unknown>,
      isSystemRole: false,
      createdBy: user.userId,
      lastModifiedBy: user.userId,
    });

    const result = await CustomRoleService.resolveUserPermissions({
      userId: user.userId,
      tenantId: tenant.tenantId,
    });

    // Expect the three permissions to be flattened correctly
    expect(result.permissions).toContain('crm.leads.create');
    expect(result.permissions).toContain('crm.leads.read');
    expect(result.permissions).toContain('crm.contacts.read');

    expect(result.summary.totalPermissions).toBe(3);
    expect(result.summary.rolePermissions).toBe(3);
    expect(result.summary.userOverrides).toBe(0);

    // Each source entry must reference the role
    result.sources.forEach((src) => {
      expect(src.source).toBe('role');
      expect(src.roleName).toBe('Sales Manager');
    });
  });

  it('accumulates permissions from multiple roles for the same tenant', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    await db.insert(customRoles).values([
      {
        tenantId: tenant.tenantId,
        roleName: 'Role A',
        permissions: { crm: { leads: ['create'] } } as unknown as Record<string, unknown>,
        isSystemRole: false,
        createdBy: user.userId,
        lastModifiedBy: user.userId,
      },
      {
        tenantId: tenant.tenantId,
        roleName: 'Role B',
        permissions: { crm: { accounts: ['read', 'update'] } } as unknown as Record<string, unknown>,
        isSystemRole: false,
        createdBy: user.userId,
        lastModifiedBy: user.userId,
      },
    ]);

    const result = await CustomRoleService.resolveUserPermissions({
      userId: user.userId,
      tenantId: tenant.tenantId,
    });

    expect(result.permissions).toContain('crm.leads.create');
    expect(result.permissions).toContain('crm.accounts.read');
    expect(result.permissions).toContain('crm.accounts.update');
    expect(result.summary.totalPermissions).toBe(3);
  });

  it('is tenant-scoped: roles from tenant A are not visible when resolving for tenant B', async () => {
    const tenantA = await seedTenant(testDb);
    const tenantB = await seedTenant(testDb);
    const userA = await seedUser(testDb, tenantA.tenantId);
    const userB = await seedUser(testDb, tenantB.tenantId);

    // Only tenant A has a custom role
    await db.insert(customRoles).values({
      tenantId: tenantA.tenantId,
      roleName: 'Tenant A Only Role',
      permissions: { crm: { leads: ['delete'] } } as unknown as Record<string, unknown>,
      isSystemRole: false,
      createdBy: userA.userId,
      lastModifiedBy: userA.userId,
    });

    const resultA = await CustomRoleService.resolveUserPermissions({ userId: userA.userId, tenantId: tenantA.tenantId });
    const resultB = await CustomRoleService.resolveUserPermissions({ userId: userB.userId, tenantId: tenantB.tenantId });

    expect(resultA.permissions).toContain('crm.leads.delete');
    expect(resultB.permissions).not.toContain('crm.leads.delete');
    expect(resultB.summary.totalPermissions).toBe(0);
  });
});

describe('CustomRoleService – upsertOrganizationApplication', () => {
  it('creates a new org-app record when none exists', async () => {
    const tenant = await seedTenant(testDb);
    const { applications, organizationApplications } = await import('../../../db/schema/index.js');
    const { eq, and } = await import('drizzle-orm');

    // Pick any app from the applications table (seeded by migrations)
    const [app] = await db.select().from(applications).limit(1);
    if (!app) {
      // No applications in DB — skip this test gracefully
      console.warn('⚠️  No applications in test DB — skipping upsertOrganizationApplication create test');
      return;
    }

    await CustomRoleService.upsertOrganizationApplication(tenant.tenantId, app.appId, {
      subscriptionTier: 'starter',
      enabledModules: ['leads', 'contacts'],
      isEnabled: true,
    });

    const rows = await db
      .select()
      .from(organizationApplications)
      .where(
        and(
          eq(organizationApplications.tenantId, tenant.tenantId),
          eq(organizationApplications.appId, app.appId)
        )
      );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.subscriptionTier).toBe('starter');
    expect(rows[0]?.isEnabled).toBe(true);
  });

  it('updates existing org-app record on second call (idempotent upsert)', async () => {
    const tenant = await seedTenant(testDb);
    const { applications, organizationApplications } = await import('../../../db/schema/index.js');
    const { eq, and } = await import('drizzle-orm');

    const [app] = await db.select().from(applications).limit(1);
    if (!app) {
      console.warn('⚠️  No applications in test DB — skipping upsertOrganizationApplication update test');
      return;
    }

    // First upsert
    await CustomRoleService.upsertOrganizationApplication(tenant.tenantId, app.appId, {
      subscriptionTier: 'starter',
      enabledModules: ['leads'],
      isEnabled: true,
    });

    // Second upsert — should UPDATE, not INSERT a second row
    await CustomRoleService.upsertOrganizationApplication(tenant.tenantId, app.appId, {
      subscriptionTier: 'professional',
      enabledModules: ['leads', 'contacts', 'accounts'],
      isEnabled: true,
    });

    const rows = await db
      .select()
      .from(organizationApplications)
      .where(
        and(
          eq(organizationApplications.tenantId, tenant.tenantId),
          eq(organizationApplications.appId, app.appId)
        )
      );

    // Should still be exactly 1 row (not 2)
    expect(rows).toHaveLength(1);
    expect(rows[0]?.subscriptionTier).toBe('professional');
  });
});
