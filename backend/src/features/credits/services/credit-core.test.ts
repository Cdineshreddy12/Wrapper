/**
 * credit-core — unit tests
 *
 * Tests ensureCreditRecord (idempotent credit creation) and
 * findRootOrganization (priority-ordered root org lookup).
 *
 * All DB and Stripe calls are mocked — no real connections.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Stripe (instantiated at module level in credit-core.ts)
// ---------------------------------------------------------------------------
vi.mock('stripe', () => ({
  default: vi.fn(() => ({})),
}));

// ---------------------------------------------------------------------------
// Mock Drizzle ORM operators so they don't throw when passed plain values
// ---------------------------------------------------------------------------
vi.mock('drizzle-orm', () => ({
  eq:      vi.fn((...args: unknown[]) => ({ $type: 'eq',      args })),
  and:     vi.fn((...args: unknown[]) => ({ $type: 'and',     args })),
  isNull:  vi.fn((col: unknown)       => ({ $type: 'isNull',  col  })),
  desc:    vi.fn((col: unknown)       => ({ $type: 'desc',    col  })),
  inArray: vi.fn((...args: unknown[]) => ({ $type: 'inArray', args })),
  or:      vi.fn((...args: unknown[]) => ({ $type: 'or',      args })),
}));

// ---------------------------------------------------------------------------
// Build a mock DB that supports the builder chain:
//   db.select().from().where().limit()
//   db.insert().values()
// ---------------------------------------------------------------------------
const { mockDb } = vi.hoisted(() => {
  const chain = {
    from:      vi.fn(),
    where:     vi.fn(),
    leftJoin:  vi.fn(),
    orderBy:   vi.fn(),
    limit:     vi.fn(),
    values:    vi.fn(),
    set:       vi.fn(),
  };

  // All builder methods return the same chain object so calls can be chained
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  // limit / values / where as last call resolve with [] by default
  chain.limit.mockResolvedValue([]);
  chain.values.mockResolvedValue(undefined);
  chain.where.mockReturnValue(chain); // where at end of update chain

  const mockDb = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    _chain: chain, // expose for per-test configuration
  };

  return { mockDb };
});

vi.mock('../../../db/index.js', () => ({ db: mockDb }));

// ---------------------------------------------------------------------------
// Stub schema tables — the values just need to be truthy objects
// (they're passed to mocked from() / where() which ignore their content)
// ---------------------------------------------------------------------------
vi.mock('../../../db/schema/index.js', () => ({
  credits:           { tenantId: 'credits.tenantId', entityId: 'credits.entityId', availableCredits: 'credits.availableCredits', isActive: 'credits.isActive', lastUpdatedAt: 'credits.lastUpdatedAt' },
  applications:      { appId: 'apps.appId', appCode: 'apps.appCode', status: 'apps.status' },
  applicationModules:{ moduleCode: 'am.moduleCode', permissions: 'am.permissions', appId: 'am.appId' },
  entities:          { entityId: 'ent.entityId', tenantId: 'ent.tenantId', entityType: 'ent.entityType', parentEntityId: 'ent.parentEntityId', isActive: 'ent.isActive', isDefault: 'ent.isDefault', createdAt: 'ent.createdAt' },
}));

vi.mock('../../../db/schema/organizations/organization_memberships.js', () => ({
  organizationMemberships: {
    entityId: 'om.entityId',
    tenantId: 'om.tenantId',
    entityType: 'om.entityType',
    membershipStatus: 'om.membershipStatus',
    isPrimary: 'om.isPrimary',
  },
}));

import { ensureCreditRecord, findRootOrganization, getModulePermissions } from './credit-core.js';

// ---------------------------------------------------------------------------
// Helpers — configure what limit() resolves to on successive calls
// ---------------------------------------------------------------------------
function setLimitResults(...results: unknown[]) {
  const chain = mockDb._chain;
  chain.limit.mockReset();
  for (const result of results) {
    chain.limit.mockResolvedValueOnce(result);
  }
  chain.limit.mockResolvedValue([]); // fallback for any extra calls
}

// ---------------------------------------------------------------------------
describe('ensureCreditRecord', () => {
  const TENANT = 'tenant-1';
  const ENTITY = 'entity-1';

  const existingEntity = { entityId: ENTITY, tenantId: TENANT, isActive: true };

  beforeEach(() => {
    vi.clearAllMocks();

    const chain = mockDb._chain;
    // Restore default chain wiring after clearAllMocks
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.leftJoin.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.set.mockReturnValue(chain);
    chain.limit.mockResolvedValue([]);
    chain.values.mockResolvedValue(undefined);
    mockDb.select.mockReturnValue(chain);
    mockDb.insert.mockReturnValue(chain);
    mockDb.update.mockReturnValue(chain);
  });

  it('returns false and warns when entity does not exist in DB', async () => {
    // First query (entities) → not found
    setLimitResults([]);

    const result = await ensureCreditRecord(TENANT, 'organization', ENTITY);
    expect(result).toBe(false);
  });

  it('creates a credit record and returns true when entity exists but record missing', async () => {
    // Query 1 (entities) → found; Query 2 (credits) → not found
    setLimitResults([existingEntity], []);

    const result = await ensureCreditRecord(TENANT, 'organization', ENTITY, 100);

    expect(result).toBe(true);
    expect(mockDb.insert).toHaveBeenCalledOnce();
    expect(mockDb._chain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT,
        entityId: ENTITY,
        availableCredits: '100',
        isActive: true,
      }),
    );
  });

  it('returns false (idempotent) when credit record already exists', async () => {
    const existingCredit = { tenantId: TENANT, entityId: ENTITY, availableCredits: '50' };
    // Query 1 (entities) → found; Query 2 (credits) → found
    setLimitResults([existingEntity], [existingCredit]);

    const result = await ensureCreditRecord(TENANT, 'organization', ENTITY);

    expect(result).toBe(false);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('uses tenantId as entityId when no entityId is provided', async () => {
    setLimitResults([{ entityId: TENANT, tenantId: TENANT, isActive: true }], []);

    await ensureCreditRecord(TENANT);

    expect(mockDb._chain.values).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: TENANT }),
    );
  });

  it('propagates DB errors (does not swallow them)', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection refused');
    });

    await expect(ensureCreditRecord(TENANT, 'organization', ENTITY)).rejects.toThrow('DB connection refused');
  });
});

// ---------------------------------------------------------------------------
describe('findRootOrganization', () => {
  const TENANT = 'tenant-2';

  beforeEach(() => {
    vi.clearAllMocks();

    const chain = mockDb._chain;
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.leftJoin.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.set.mockReturnValue(chain);
    chain.limit.mockResolvedValue([]);
    chain.values.mockResolvedValue(undefined);
    mockDb.select.mockReturnValue(chain);
    mockDb.insert.mockReturnValue(chain);
    mockDb.update.mockReturnValue(chain);
  });

  it('returns primary org entityId when primary membership exists', async () => {
    // Query 1: primaryOrgMembership → found
    // Query 2: primaryOrg entity   → found
    setLimitResults(
      [{ entityId: 'org_primary' }],    // membership query
      [{ entityId: 'org_primary' }],    // entity lookup
    );

    const result = await findRootOrganization(TENANT);
    expect(result).toBe('org_primary');
  });

  it('falls back to default org when no primary membership', async () => {
    // Query 1: primaryOrgMembership → empty
    // Query 2: defaultOrg           → found
    setLimitResults(
      [],
      [{ entityId: 'org_default' }],
    );

    const result = await findRootOrganization(TENANT);
    expect(result).toBe('org_default');
  });

  it('falls back to first root org when no primary or default', async () => {
    // Query 1: primaryOrgMembership → empty
    // Query 2: defaultOrg           → empty
    // Query 3: rootOrg (orderBy createdAt) → found
    setLimitResults(
      [],
      [],
      [{ entityId: 'org_root' }],
    );

    const result = await findRootOrganization(TENANT);
    expect(result).toBe('org_root');
  });

  it('returns null when no org exists at any priority level', async () => {
    setLimitResults([], [], []);

    const result = await findRootOrganization(TENANT);
    expect(result).toBeNull();
  });

  it('returns null gracefully on DB error (does not throw)', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB timeout');
    });

    const result = await findRootOrganization(TENANT);
    expect(result).toBeNull(); // caught internally, returns null
  });
});

// ---------------------------------------------------------------------------
describe('getModulePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const chain = mockDb._chain;
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.leftJoin.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.set.mockReturnValue(chain);
    chain.limit.mockResolvedValue([]);
    chain.values.mockResolvedValue(undefined);
    mockDb.select.mockReturnValue(chain);
    mockDb.insert.mockReturnValue(chain);
    mockDb.update.mockReturnValue(chain);
  });

  it('returns formatted permissions from DB when module is found', async () => {
    setLimitResults([{
      appCode: 'crm',
      permissions: ['view', 'create', 'edit'],
    }]);

    const perms = await getModulePermissions('contacts');
    expect(perms).toEqual(['crm.contacts.view', 'crm.contacts.create', 'crm.contacts.edit']);
  });

  it('returns standard CRUD fallback when module is not in DB', async () => {
    setLimitResults([]); // module not found

    const perms = await getModulePermissions('invoices');
    expect(perms).toHaveLength(6);
    expect(perms[0]).toContain('.invoices.view');
    expect(perms[1]).toContain('.invoices.create');
  });

  it('returns fallback permissions on DB error (does not throw)', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('query failed');
    });

    const perms = await getModulePermissions('reports');
    expect(perms.length).toBeGreaterThan(0);
    expect(perms[0]).toContain('reports');
  });
});
