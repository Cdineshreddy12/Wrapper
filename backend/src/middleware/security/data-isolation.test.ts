/**
 * Unit tests for DataIsolationMiddleware.
 *
 * All DataIsolationService calls are mocked so no database is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataIsolationMiddleware } from './data-isolation.js';
import type { UserContext } from '../../types/common.js';

// ── Mock DataIsolationService ──────────────────────────────────────────────
vi.mock('../../services/data-isolation-service.js', () => ({
  default: {
    canAccessEntity: vi.fn(),
    getUserAccessScope: vi.fn(),
    filterOrganizationsByAccess: vi.fn(),
    filterLocationsByAccess: vi.fn(),
  },
}));

import DataIsolationService from '../../services/data-isolation-service.js';

// ── Helpers ───────────────────────────────────────────────────────────────

function makeReply() {
  const reply = { code: vi.fn(), send: vi.fn() };
  reply.code.mockReturnValue(reply);
  return reply as unknown as import('fastify').FastifyReply;
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    userContext: null,
    params: {},
    body: {},
    userAccessScope: undefined,
    ...overrides,
  } as unknown as import('fastify').FastifyRequest;
}

const mockScope = {
  organizations: [],
  locations: [],
  scope: { orgCount: 0, locationCount: 0 },
};

function makeUserContext(overrides: Partial<UserContext> = {}): UserContext {
  return {
    userId: 'u1',
    kindeUserId: 'kinde_u1',
    internalUserId: 'u1',
    tenantId: 't1',
    email: 'user@example.com',
    name: 'User One',
    isAuthenticated: true,
    needsOnboarding: false,
    onboardingCompleted: true,
    isActive: true,
    isAdmin: false,
    isTenantAdmin: false,
    isSuperAdmin: false,
    ...overrides,
  };
}

// ── enforceOrganizationAccess ─────────────────────────────────────────────

describe('DataIsolationMiddleware.enforceOrganizationAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when userContext is null', async () => {
    const handler = DataIsolationMiddleware.enforceOrganizationAccess();
    const reply = makeReply();

    await handler(makeRequest({ userContext: null }), reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    const body = (reply.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toMatch(/User context not found/i);
  });

  it('returns 401 when userContext is undefined', async () => {
    const handler = DataIsolationMiddleware.enforceOrganizationAccess();
    const reply = makeReply();

    await handler(makeRequest({ userContext: undefined }), reply);

    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it('skips access check and sets scope when no organizationId provided', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.getUserAccessScope).mockResolvedValue(mockScope);

    const handler = DataIsolationMiddleware.enforceOrganizationAccess();
    const req = makeRequest({ userContext: uc, params: {}, body: {} });
    const reply = makeReply();

    await handler(req, reply);

    expect(DataIsolationService.canAccessEntity).not.toHaveBeenCalled();
    expect(reply.code).not.toHaveBeenCalled();
    expect(req.userAccessScope).toEqual(mockScope);
  });

  it('returns 403 when canAccessEntity returns false (organizationId from params)', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(false);

    const handler = DataIsolationMiddleware.enforceOrganizationAccess();
    const req = makeRequest({ userContext: uc, params: { organizationId: 'org-xyz' } });
    const reply = makeReply();

    await handler(req, reply);

    expect(DataIsolationService.canAccessEntity).toHaveBeenCalledWith(uc, 'org-xyz');
    expect(reply.code).toHaveBeenCalledWith(403);
    const body = (reply.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error).toBe('Forbidden');
    expect(body.message).toContain('organization');
  });

  it('returns 403 when canAccessEntity returns false (organizationId from body)', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(false);

    const handler = DataIsolationMiddleware.enforceOrganizationAccess();
    const req = makeRequest({ userContext: uc, params: {}, body: { organizationId: 'org-body' } });
    const reply = makeReply();

    await handler(req, reply);

    expect(DataIsolationService.canAccessEntity).toHaveBeenCalledWith(uc, 'org-body');
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it('allows access and sets userAccessScope when canAccessEntity returns true', async () => {
    const uc = makeUserContext();
    const scope = { organizations: [{ organizationId: 'org-xyz' }], locations: [], scope: { orgCount: 1, locationCount: 0 } };
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(true);
    vi.mocked(DataIsolationService.getUserAccessScope).mockResolvedValue(scope);

    const handler = DataIsolationMiddleware.enforceOrganizationAccess();
    const req = makeRequest({ userContext: uc, params: { organizationId: 'org-xyz' } });
    const reply = makeReply();

    await handler(req, reply);

    expect(reply.code).not.toHaveBeenCalled();
    expect(req.userAccessScope).toEqual(scope);
  });

  it('returns 500 when DataIsolationService throws unexpectedly', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.canAccessEntity).mockRejectedValue(new Error('DB offline'));

    const handler = DataIsolationMiddleware.enforceOrganizationAccess();
    const req = makeRequest({ userContext: uc, params: { organizationId: 'org-xyz' } });
    const reply = makeReply();

    await handler(req, reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    const body = (reply.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error).toBe('Internal Server Error');
  });
});

// ── enforceLocationAccess ─────────────────────────────────────────────────

describe('DataIsolationMiddleware.enforceLocationAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when userContext is missing', async () => {
    const handler = DataIsolationMiddleware.enforceLocationAccess();
    const reply = makeReply();

    await handler(makeRequest({ userContext: null }), reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    const body = (reply.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error).toBe('Unauthorized');
  });

  it('skips access check when no locationId in request', async () => {
    const uc = makeUserContext();

    const handler = DataIsolationMiddleware.enforceLocationAccess();
    const req = makeRequest({ userContext: uc, params: {}, body: {} });
    const reply = makeReply();

    await handler(req, reply);

    expect(DataIsolationService.canAccessEntity).not.toHaveBeenCalled();
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks access to locationId from params', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(false);

    const handler = DataIsolationMiddleware.enforceLocationAccess();
    const req = makeRequest({ userContext: uc, params: { locationId: 'loc-abc' } });
    const reply = makeReply();

    await handler(req, reply);

    expect(DataIsolationService.canAccessEntity).toHaveBeenCalledWith(uc, 'loc-abc');
    expect(reply.code).toHaveBeenCalledWith(403);
    const body = (reply.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error).toBe('Forbidden');
    expect(body.message).toContain('location');
  });

  it('returns 403 when user lacks access to locationId from body', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(false);

    const handler = DataIsolationMiddleware.enforceLocationAccess();
    const req = makeRequest({ userContext: uc, params: {}, body: { locationId: 'loc-body' } });
    const reply = makeReply();

    await handler(req, reply);

    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it('passes through (no error) when user has access to locationId', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(true);

    const handler = DataIsolationMiddleware.enforceLocationAccess();
    const req = makeRequest({ userContext: uc, params: { locationId: 'loc-abc' } });
    const reply = makeReply();

    await handler(req, reply);

    expect(reply.code).not.toHaveBeenCalled();
  });

  it('params take precedence over body for locationId', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(true);

    const handler = DataIsolationMiddleware.enforceLocationAccess();
    const req = makeRequest({
      userContext: uc,
      params: { locationId: 'loc-from-params' },
      body: { locationId: 'loc-from-body' },
    });
    const reply = makeReply();

    await handler(req, reply);

    // ?? operator means params wins
    expect(DataIsolationService.canAccessEntity).toHaveBeenCalledWith(uc, 'loc-from-params');
  });

  it('returns 500 when DataIsolationService throws', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.canAccessEntity).mockRejectedValue(new Error('network error'));

    const handler = DataIsolationMiddleware.enforceLocationAccess();
    const req = makeRequest({ userContext: uc, params: { locationId: 'loc-abc' } });
    const reply = makeReply();

    await handler(req, reply);

    expect(reply.code).toHaveBeenCalledWith(500);
  });
});

// ── addUserAccessContext ──────────────────────────────────────────────────

describe('DataIsolationMiddleware.addUserAccessContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets userAccessScope when userContext is present', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.getUserAccessScope).mockResolvedValue(mockScope);

    const handler = DataIsolationMiddleware.addUserAccessContext();
    const req = makeRequest({ userContext: uc });
    await handler(req, makeReply());

    expect(DataIsolationService.getUserAccessScope).toHaveBeenCalledWith(uc);
    expect(req.userAccessScope).toEqual(mockScope);
  });

  it('does not set userAccessScope when userContext is absent', async () => {
    const handler = DataIsolationMiddleware.addUserAccessContext();
    const req = makeRequest({ userContext: null });
    await handler(req, makeReply());

    expect(DataIsolationService.getUserAccessScope).not.toHaveBeenCalled();
    expect(req.userAccessScope).toBeUndefined();
  });

  it('does not throw even when getUserAccessScope rejects', async () => {
    const uc = makeUserContext();
    vi.mocked(DataIsolationService.getUserAccessScope).mockRejectedValue(new Error('timeout'));

    const handler = DataIsolationMiddleware.addUserAccessContext();
    await expect(handler(makeRequest({ userContext: uc }), makeReply())).resolves.not.toThrow();
  });
});

// ── filterOrganizationData ────────────────────────────────────────────────

describe('DataIsolationMiddleware.filterOrganizationData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const uc = makeUserContext();

  it('delegates array filtering to filterOrganizationsByAccess', async () => {
    const orgs = [{ entityId: 'org-1' }, { entityId: 'org-2' }];
    const filtered = [{ entityId: 'org-1' }];
    vi.mocked(DataIsolationService.filterOrganizationsByAccess).mockResolvedValue(filtered);

    const result = await DataIsolationMiddleware.filterOrganizationData(orgs, uc);

    expect(DataIsolationService.filterOrganizationsByAccess).toHaveBeenCalledWith(orgs, uc);
    expect(result).toEqual(filtered);
  });

  it('returns single org object when canAccessEntity is true', async () => {
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(true);
    const org = { organizationId: 'org-1' };

    const result = await DataIsolationMiddleware.filterOrganizationData(org, uc);

    expect(result).toEqual(org);
  });

  it('returns null for single org when canAccessEntity is false', async () => {
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(false);

    const result = await DataIsolationMiddleware.filterOrganizationData({ organizationId: 'org-2' }, uc);

    expect(result).toBeNull();
  });
});

// ── filterLocationData ────────────────────────────────────────────────────

describe('DataIsolationMiddleware.filterLocationData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const uc = makeUserContext();

  it('delegates array filtering to filterLocationsByAccess', async () => {
    const locs = [{ entityId: 'loc-1' }];
    vi.mocked(DataIsolationService.filterLocationsByAccess).mockResolvedValue(locs);

    const result = await DataIsolationMiddleware.filterLocationData(locs, uc);

    expect(DataIsolationService.filterLocationsByAccess).toHaveBeenCalledWith(locs, uc);
    expect(result).toEqual(locs);
  });

  it('returns single location when canAccessEntity is true', async () => {
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(true);
    const loc = { locationId: 'loc-1' };

    const result = await DataIsolationMiddleware.filterLocationData(loc, uc);

    expect(result).toEqual(loc);
  });

  it('returns null for single location when user lacks access', async () => {
    vi.mocked(DataIsolationService.canAccessEntity).mockResolvedValue(false);

    const result = await DataIsolationMiddleware.filterLocationData({ locationId: 'loc-2' }, uc);

    expect(result).toBeNull();
  });
});
