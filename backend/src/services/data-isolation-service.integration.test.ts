/**
 * DataIsolationService — Integration Tests
 *
 * These tests run against a REAL PostgreSQL container (started by
 * global-setup.ts via @testcontainers/postgresql).  No mocks — every
 * assertion is backed by actual SQL execution.
 *
 * What is proved here (that unit tests with mocks CANNOT prove):
 *   1. Tenant A's TENANT_ADMIN sees ALL orgs belonging to tenant A only.
 *   2. A regular user is scoped to their direct memberships + parent + children.
 *   3. A user with no memberships gets an empty list — they NEVER see data they
 *      have no relation to.
 *   4. Cross-tenant leakage is impossible: Tenant B's data is never returned
 *      for Tenant A's user even when both tenants share the same DB.
 *   5. canAccessEntity / filterOrganizationsByAccess honour the above rules.
 *
 * Isolation strategy: each describe block creates its own tenant(s), users and
 * entities using unique UUIDs.  Tests never touch each other's data.
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  createTestDb,
  seedTenant,
  seedUser,
  seedOrganization,
  seedLocation,
  seedMembership,
  type TestDb,
} from '../db/test-helpers/seed.js';
import { DataIsolationService } from './data-isolation-service.js';

// ---------------------------------------------------------------------------
// One shared connection for the whole file
// ---------------------------------------------------------------------------
let db: TestDb;
let endDb: () => Promise<void>;

beforeAll(() => {
  const conn = createTestDb();
  db    = conn.db;
  endDb = conn.end;
});

afterAll(() => endDb());

// ---------------------------------------------------------------------------
// Helper: fresh service instance per test suite (stateless, but good hygiene)
// ---------------------------------------------------------------------------
function svc() {
  return new DataIsolationService();
}

// ===========================================================================
// Suite 1 — TENANT_ADMIN access
// ===========================================================================
describe('TENANT_ADMIN — sees ALL orgs in their tenant', () => {
  let tenantId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const tenant = await seedTenant(db);
    tenantId     = tenant.tenantId;
    const user   = await seedUser(db, tenantId, { isTenantAdmin: true });
    adminUserId  = user.userId;

    // Create 3 organizations
    await seedOrganization(db, tenantId, { entityName: 'Alpha HQ' });
    await seedOrganization(db, tenantId, { entityName: 'Beta HQ' });
    await seedOrganization(db, tenantId, { entityName: 'Gamma HQ' });
  });

  it('returns all 3 orgs regardless of membership', async () => {
    // Admin has NO explicit memberships — should still see everything
    const orgs = await svc().getUserAccessibleOrganizations({
      userId:         adminUserId,
      internalUserId: adminUserId,
      tenantId,
      roles:          ['TENANT_ADMIN'],
    });

    expect(orgs).toHaveLength(3);
  });

  it('does NOT include location entities in the org list', async () => {
    // Add a location — should not appear in org results
    await seedLocation(db, tenantId, { entityName: 'Warehouse 1' });

    const orgs = await svc().getUserAccessibleOrganizations({
      userId: adminUserId, internalUserId: adminUserId, tenantId, roles: ['TENANT_ADMIN'],
    });

    // Still 3 — the location should be excluded
    expect(orgs).toHaveLength(3);
  });
});

// ===========================================================================
// Suite 2 — Cross-tenant isolation (the most critical security test)
// ===========================================================================
describe('Cross-tenant isolation — user from Tenant A NEVER sees Tenant B data', () => {
  let tenantA: string;
  let tenantB: string;
  let userA:   string;

  beforeAll(async () => {
    const tA = await seedTenant(db);
    const tB = await seedTenant(db);
    tenantA  = tA.tenantId;
    tenantB  = tB.tenantId;

    const u = await seedUser(db, tenantA);
    userA    = u.userId;

    // Give userA access to their own org
    const orgA = await seedOrganization(db, tenantA, { entityName: 'A Corp' });
    await seedMembership(db, { userId: userA, tenantId: tenantA, entityId: orgA.entityId });

    // Create orgs in Tenant B — userA should NEVER see these
    await seedOrganization(db, tenantB, { entityName: 'B Corp 1' });
    await seedOrganization(db, tenantB, { entityName: 'B Corp 2' });
  });

  it('userA sees only their own tenant org', async () => {
    const orgs = await svc().getUserAccessibleOrganizations({
      userId: userA, internalUserId: userA, tenantId: tenantA, roles: ['USER'],
    });

    expect(orgs).toHaveLength(1); // only A Corp
  });

  it('canAccessEntity returns false for a Tenant B entity', async () => {
    // Get a Tenant B org ID to probe
    const { entities } = await import('../db/schema/organizations/unified-entities.js');
    const { eq, and } = await import('drizzle-orm');
    const bOrgs = await db.select({ entityId: entities.entityId })
      .from(entities)
      .where(and(eq(entities.tenantId, tenantB), eq(entities.entityType, 'organization')));

    expect(bOrgs.length).toBeGreaterThan(0);

    for (const { entityId } of bOrgs) {
      const access = await svc().canAccessEntity(
        { userId: userA, internalUserId: userA, tenantId: tenantA, roles: ['USER'] },
        entityId,
      );
      expect(access).toBe(false);
    }
  });
});

// ===========================================================================
// Suite 3 — Regular user: hierarchy traversal
// ===========================================================================
describe('Regular user — hierarchy traversal (parent + children)', () => {
  let tenantId:   string;
  let userId:     string;
  let parentId:   string;
  let childAId:   string;
  let childBId:   string;
  let siblingId:  string; // same level as parent but NOT in the user's path

  beforeAll(async () => {
    const tenant = await seedTenant(db);
    tenantId     = tenant.tenantId;
    const user   = await seedUser(db, tenantId);
    userId       = user.userId;

    // Tree:
    //   root (no parent) — unrelated, user has no access
    //     parent          ← user is a member here
    //       child_a       ← should be visible
    //       child_b       ← should be visible
    //   sibling           ← same depth as parent but DIFFERENT branch; invisible

    const parent  = await seedOrganization(db, tenantId, { entityName: 'Parent Org' });
    parentId      = parent.entityId;

    const childA  = await seedOrganization(db, tenantId, {
      entityName: 'Child A', parentEntityId: parentId,
    });
    childAId      = childA.entityId;

    const childB  = await seedOrganization(db, tenantId, {
      entityName: 'Child B', parentEntityId: parentId,
    });
    childBId      = childB.entityId;

    const sibling = await seedOrganization(db, tenantId, { entityName: 'Sibling (no access)' });
    siblingId     = sibling.entityId;

    // Give user direct membership to 'parent' only
    await seedMembership(db, { userId, tenantId, entityId: parentId });
  });

  it('includes the directly-joined org', async () => {
    const orgs = await svc().getUserAccessibleOrganizations({
      userId, internalUserId: userId, tenantId, roles: ['USER'],
    });
    expect(orgs).toContain(parentId);
  });

  it('includes children of the directly-joined org', async () => {
    const orgs = await svc().getUserAccessibleOrganizations({
      userId, internalUserId: userId, tenantId, roles: ['USER'],
    });
    expect(orgs).toContain(childAId);
    expect(orgs).toContain(childBId);
  });

  it('does NOT include sibling orgs the user has no membership in', async () => {
    const orgs = await svc().getUserAccessibleOrganizations({
      userId, internalUserId: userId, tenantId, roles: ['USER'],
    });
    expect(orgs).not.toContain(siblingId);
  });
});

// ===========================================================================
// Suite 4 — User with direct membership to a CHILD org sees its parent too
// ===========================================================================
describe('Regular user — member of child sees parent', () => {
  let tenantId: string;
  let userId:   string;
  let parentId: string;
  let childId:  string;

  beforeAll(async () => {
    const tenant = await seedTenant(db);
    tenantId     = tenant.tenantId;
    const user   = await seedUser(db, tenantId);
    userId       = user.userId;

    const parent = await seedOrganization(db, tenantId, { entityName: 'Root Org' });
    parentId     = parent.entityId;

    const child  = await seedOrganization(db, tenantId, {
      entityName: 'Sub Org', parentEntityId: parentId,
    });
    childId      = child.entityId;

    // User is a member of CHILD only
    await seedMembership(db, { userId, tenantId, entityId: childId });
  });

  it('includes the parent org even though user only has membership in the child', async () => {
    const orgs = await svc().getUserAccessibleOrganizations({
      userId, internalUserId: userId, tenantId, roles: ['USER'],
    });

    expect(orgs).toContain(childId);
    expect(orgs).toContain(parentId);
  });
});

// ===========================================================================
// Suite 5 — No memberships → empty list (not "all tenant data")
// ===========================================================================
describe('User with no memberships', () => {
  let tenantId: string;
  let userId:   string;

  beforeAll(async () => {
    const tenant = await seedTenant(db);
    tenantId     = tenant.tenantId;
    const user   = await seedUser(db, tenantId);
    userId       = user.userId;

    // Create orgs — user is NOT a member of any
    await seedOrganization(db, tenantId, { entityName: 'Orphan Org 1' });
    await seedOrganization(db, tenantId, { entityName: 'Orphan Org 2' });
  });

  it('returns empty array — never leaks all tenant orgs to an unaffiliated user', async () => {
    const orgs = await svc().getUserAccessibleOrganizations({
      userId, internalUserId: userId, tenantId, roles: ['USER'],
    });

    expect(orgs).toEqual([]);
  });

  it('getUserAccessScope returns zero counts', async () => {
    const scope = await svc().getUserAccessScope({
      userId, internalUserId: userId, tenantId, roles: ['USER'],
    });

    expect(scope.scope.orgCount).toBe(0);
    expect(scope.organizations).toEqual([]);
  });
});

// ===========================================================================
// Suite 6 — filterOrganizationsByAccess strips inaccessible orgs
// ===========================================================================
describe('filterOrganizationsByAccess', () => {
  let tenantId:     string;
  let userId:       string;
  let allowedOrgId: string;
  let blockedOrgId: string;

  beforeAll(async () => {
    const tenant = await seedTenant(db);
    tenantId     = tenant.tenantId;
    const user   = await seedUser(db, tenantId);
    userId       = user.userId;

    const allowed = await seedOrganization(db, tenantId, { entityName: 'Allowed Org' });
    allowedOrgId  = allowed.entityId;
    await seedMembership(db, { userId, tenantId, entityId: allowedOrgId });

    const blocked = await seedOrganization(db, tenantId, { entityName: 'Blocked Org' });
    blockedOrgId  = blocked.entityId;
    // No membership → blocked
  });

  it('keeps only accessible orgs and drops the rest', async () => {
    const input    = [{ entityId: allowedOrgId }, { entityId: blockedOrgId }];
    const filtered = await svc().filterOrganizationsByAccess(input, {
      userId, internalUserId: userId, tenantId, roles: ['USER'],
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].entityId).toBe(allowedOrgId);
  });
});

// ===========================================================================
// Suite 7 — getUserAccessScope enriches data with entity names
// ===========================================================================
describe('getUserAccessScope — returns rich entity details', () => {
  let tenantId: string;
  let userId:   string;
  let orgId:    string;

  beforeAll(async () => {
    const tenant = await seedTenant(db);
    tenantId     = tenant.tenantId;
    const user   = await seedUser(db, tenantId);
    userId       = user.userId;

    const org = await seedOrganization(db, tenantId, { entityName: 'Named Org' });
    orgId     = org.entityId;
    await seedMembership(db, { userId, tenantId, entityId: orgId });
  });

  it('returns organizationName in the scope payload', async () => {
    const scope = await svc().getUserAccessScope({
      userId, internalUserId: userId, tenantId, roles: ['USER'],
    });

    expect(scope.scope.orgCount).toBeGreaterThanOrEqual(1);
    const found = scope.organizations.find((o) => o.organizationId === orgId);
    expect(found).toBeDefined();
    expect(found?.organizationName).toBe('Named Org');
  });
});
