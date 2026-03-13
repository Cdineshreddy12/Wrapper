/**
 * DataIsolationService — unit tests
 *
 * Security-critical: verifies that multi-tenant data isolation rules are
 * enforced correctly.
 *
 *  - TENANT_ADMIN sees ALL organisations in their tenant
 *  - Regular users only see orgs they are directly a member of (+parents/children)
 *  - Users with no memberships get an empty list (not all tenant data)
 *  - canAccessEntity returns true/false based on actual access
 *  - filterOrganizationsByAccess strips orgs the user cannot see
 *
 * All DB calls are mocked — no real database connection.
 *
 * Key mock design:
 *   Drizzle queries end with either:
 *     a) .where(...)          — awaited directly (no .limit)
 *     b) .where(...).limit(n) — awaited after limit
 *   makeSelectChain() handles both: where() returns a thenable that ALSO
 *   has a limit() method, so both usage patterns are satisfied.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Drizzle ORM operators
// ---------------------------------------------------------------------------
vi.mock('drizzle-orm', () => ({
  eq:      vi.fn((...args: unknown[]) => ({ $type: 'eq',  args })),
  and:     vi.fn((...args: unknown[]) => ({ $type: 'and', args })),
  inArray: vi.fn((...args: unknown[]) => ({ $type: 'inArray', args })),
  or:      vi.fn((...args: unknown[]) => ({ $type: 'or',  args })),
}));

// ---------------------------------------------------------------------------
// Mock schema tables
// ---------------------------------------------------------------------------
vi.mock('../db/schema/organizations/unified-entities.js', () => ({
  entities: { entityId: 'ent.entityId', tenantId: 'ent.tenantId', entityType: 'ent.entityType', parentEntityId: 'ent.parentEntityId' },
}));

vi.mock('../db/schema/core/users.js', () => ({
  tenantUsers: { userId: 'tu.userId', tenantId: 'tu.tenantId' },
}));

vi.mock('../db/schema/organizations/organization_memberships.js', () => ({
  organizationMemberships: {
    userId:           'om.userId',
    entityId:         'om.entityId',
    entityType:       'om.entityType',
    membershipStatus: 'om.membershipStatus',
  },
}));

// ---------------------------------------------------------------------------
// Mock DB
// ---------------------------------------------------------------------------
const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    select: vi.fn(),
    _callIndex: 0,
  };
  return { mockDb };
});

vi.mock('../db/index.js', () => ({ db: mockDb }));

// ---------------------------------------------------------------------------
// Helper: create a select chain where where() is BOTH thenable (direct await)
// AND has limit() for chained use.
//
//   await db.select().from(T).where(cond)         → resolves to terminalResult
//   await db.select().from(T).where(cond).limit(n) → resolves to limitResult
// ---------------------------------------------------------------------------
function makeSelectChain(
  terminalResult: unknown,
  limitResult: unknown = [],
) {
  const afterWhere: {
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => Promise<void>;
    catch: (fn: (e: unknown) => void) => Promise<unknown>;
    limit: ReturnType<typeof vi.fn>;
    orderBy: () => unknown;
  } = {
    // Thenable — used when the query is awaited directly after .where()
    then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
      return Promise.resolve(terminalResult).then(resolve, reject);
    },
    catch(fn: (e: unknown) => void) {
      return Promise.resolve(terminalResult).catch(fn);
    },
    // Chainable — used when .limit() follows .where()
    limit: vi.fn().mockResolvedValue(limitResult),
    // Allow .orderBy() after .where() if needed
    orderBy() { return afterWhere; },
  };

  const chain: {
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
  } = {
    from:  vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue(afterWhere),
  };

  return chain;
}

// ---------------------------------------------------------------------------
import { DataIsolationService, type UserContext } from './data-isolation-service.js';

// ---------------------------------------------------------------------------
const TENANT = 'tenant-abc';

const adminCtx: UserContext    = { userId: 'u1', internalUserId: 'iu1', tenantId: TENANT, roles: ['TENANT_ADMIN'] };
const regularCtx: UserContext  = { userId: 'u2', internalUserId: 'iu2', tenantId: TENANT, roles: ['USER'] };
const noTenantCtx: UserContext = { userId: 'u3', tenantId: null };

// ---------------------------------------------------------------------------
describe('DataIsolationService', () => {
  let svc: DataIsolationService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new DataIsolationService();
  });

  // -------------------------------------------------------------------------
  describe('getUserAccessibleOrganizations — TENANT_ADMIN', () => {
    it('returns ALL organisations in the tenant (no filtering)', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([
          { organizationId: 'org_1', membershipType: 'member', membershipStatus: 'active' },
        ]))                                                             // memberships query
        .mockReturnValueOnce(makeSelectChain([                          // all orgs for admin
          { entityId: 'org_1' }, { entityId: 'org_2' }, { entityId: 'org_3' },
        ]));

      const orgs = await svc.getUserAccessibleOrganizations(adminCtx);

      expect(orgs).toEqual(expect.arrayContaining(['org_1', 'org_2', 'org_3']));
      expect(orgs).toHaveLength(3);
    });

    it('returns empty array when tenant has no orgs', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([]))   // memberships
        .mockReturnValueOnce(makeSelectChain([]));  // all orgs → empty

      const orgs = await svc.getUserAccessibleOrganizations(adminCtx);
      expect(orgs).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  describe('getUserAccessibleOrganizations — regular user', () => {
    it('returns empty array when user has no memberships', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([]));  // memberships → empty

      const orgs = await svc.getUserAccessibleOrganizations(regularCtx);
      expect(orgs).toEqual([]);
    });

    it('returns empty array when tenantId is null', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([]));  // memberships

      const orgs = await svc.getUserAccessibleOrganizations(noTenantCtx);
      expect(orgs).toEqual([]);
    });

    it('includes direct membership org', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([
          { organizationId: 'org_direct', membershipType: 'member', membershipStatus: 'active' },
        ]))                                                       // memberships
        .mockReturnValueOnce(makeSelectChain([], [{ parentEntityId: null }]))  // parent lookup → no parent (.limit)
        .mockReturnValueOnce(makeSelectChain([]));                             // children query

      const orgs = await svc.getUserAccessibleOrganizations(regularCtx);
      expect(orgs).toContain('org_direct');
    });

    it('includes parent org when direct org has a parent', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([
          { organizationId: 'org_child', membershipType: 'member', membershipStatus: 'active' },
        ]))                                                                // memberships
        .mockReturnValueOnce(makeSelectChain([], [{ parentEntityId: 'org_parent' }])) // parent lookup (.limit)
        .mockReturnValueOnce(makeSelectChain([]));                                     // children

      const orgs = await svc.getUserAccessibleOrganizations(regularCtx);
      expect(orgs).toContain('org_child');
      expect(orgs).toContain('org_parent');
    });

    it('includes child orgs of directly accessible orgs', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([
          { organizationId: 'org_parent', membershipType: 'member', membershipStatus: 'active' },
        ]))                                                              // memberships
        .mockReturnValueOnce(makeSelectChain([], [{ parentEntityId: null }]))  // parent lookup (.limit) → no parent
        .mockReturnValueOnce(makeSelectChain([                                  // children
          { entityId: 'org_child_a' }, { entityId: 'org_child_b' },
        ]));

      const orgs = await svc.getUserAccessibleOrganizations(regularCtx);
      expect(orgs).toContain('org_parent');
      expect(orgs).toContain('org_child_a');
      expect(orgs).toContain('org_child_b');
    });
  });

  // -------------------------------------------------------------------------
  describe('getUserAccessibleLocations', () => {
    it('returns all tenant locations for a user with org access', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([{ entityId: 'loc_1' }, { entityId: 'loc_2' }]));

      const locs = await svc.getUserAccessibleLocations(regularCtx, ['org_1']);
      expect(locs).toEqual(['loc_1', 'loc_2']);
    });

    it('returns empty array when accessibleOrgs is empty', async () => {
      const locs = await svc.getUserAccessibleLocations(regularCtx, []);
      expect(locs).toEqual([]);
      expect(mockDb.select).not.toHaveBeenCalled(); // no DB call needed
    });

    it('returns empty array when tenantId is null', async () => {
      const locs = await svc.getUserAccessibleLocations(noTenantCtx, ['org_1']);
      expect(locs).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  describe('canAccessEntity', () => {
    it('returns true when entityId is in accessible orgs', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([
          { organizationId: 'org_allowed', membershipType: 'member', membershipStatus: 'active' },
        ]))                                                              // memberships
        .mockReturnValueOnce(makeSelectChain([], [{ parentEntityId: null }])) // parent (.limit)
        .mockReturnValueOnce(makeSelectChain([]))                             // children
        .mockReturnValueOnce(makeSelectChain([]));                            // locations

      const canAccess = await svc.canAccessEntity(regularCtx, 'org_allowed');
      expect(canAccess).toBe(true);
    });

    it('returns false when entityId is NOT in accessible orgs or locations', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([
          { organizationId: 'org_a', membershipType: 'member', membershipStatus: 'active' },
        ]))                                                              // memberships
        .mockReturnValueOnce(makeSelectChain([], [{ parentEntityId: null }])) // parent (.limit)
        .mockReturnValueOnce(makeSelectChain([]))                             // children
        .mockReturnValueOnce(makeSelectChain([]));                            // locations

      const canAccess = await svc.canAccessEntity(regularCtx, 'org_secret_other_tenant');
      expect(canAccess).toBe(false);
    });

    it('TENANT_ADMIN can access any entity in their tenant', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([]))    // memberships (admin ignores result)
        .mockReturnValueOnce(makeSelectChain([       // all tenant orgs
          { entityId: 'org_x' }, { entityId: 'org_target' },
        ]))
        .mockReturnValueOnce(makeSelectChain([]));   // locations

      const canAccess = await svc.canAccessEntity(adminCtx, 'org_target');
      expect(canAccess).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('filterOrganizationsByAccess', () => {
    it('keeps only orgs that the user can access', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([
          { organizationId: 'org_a', membershipType: 'member', membershipStatus: 'active' },
        ]))                                                              // memberships
        .mockReturnValueOnce(makeSelectChain([], [{ parentEntityId: null }])) // parent (.limit)
        .mockReturnValueOnce(makeSelectChain([]));                            // children

      const all = [{ entityId: 'org_a' }, { entityId: 'org_b' }, { entityId: 'org_c' }];
      const filtered = await svc.filterOrganizationsByAccess(all, regularCtx);

      expect(filtered).toEqual([{ entityId: 'org_a' }]);
    });

    it('returns all orgs for TENANT_ADMIN', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([]))                        // memberships
        .mockReturnValueOnce(makeSelectChain([                           // all tenant orgs
          { entityId: 'org_a' }, { entityId: 'org_b' },
        ]));

      const all = [{ entityId: 'org_a' }, { entityId: 'org_b' }];
      const filtered = await svc.filterOrganizationsByAccess(all, adminCtx);

      expect(filtered).toHaveLength(2);
    });

    it('returns empty array when user has no memberships', async () => {
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([])); // no memberships

      const all = [{ entityId: 'org_a' }, { entityId: 'org_b' }];
      const filtered = await svc.filterOrganizationsByAccess(all, regularCtx);

      expect(filtered).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  describe('getUserAccessScope — safe defaults on DB failure', () => {
    it('returns zero counts when DB fails entirely', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('DB unreachable');
      });

      const scope = await svc.getUserAccessScope(regularCtx);

      expect(scope.scope.orgCount).toBe(0);
      expect(scope.scope.locationCount).toBe(0);
      expect(scope.organizations).toEqual([]);
      expect(scope.locations).toEqual([]);
    });
  });
});
