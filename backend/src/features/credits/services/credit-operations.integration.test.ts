import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestDb,
  seedCreditRecord,
  seedOrganization,
  seedTenant,
  seedUser,
  type TestDb,
} from '../../../db/test-helpers/seed.js';
import { addCreditsToEntity, consumeCredits, getAvailablePackages, transferCredits } from './credit-operations.js';
import { getEntityBalance, getTransactionHistory, getUsageSummary } from './credit-balance.js';

let db: TestDb;
let endDb: () => Promise<void>;

beforeAll(() => {
  const conn = createTestDb();
  db = conn.db;
  endDb = conn.end;
});

afterAll(() => endDb());

describe('credit operations integration', () => {
  it('debits credits and writes a consumption transaction', async () => {
    const tenant = await seedTenant(db);
    const user = await seedUser(db, tenant.tenantId);
    const org = await seedOrganization(db, tenant.tenantId);

    await seedCreditRecord(db, tenant.tenantId, org.entityId, '120');

    const result = await consumeCredits({
      tenantId: tenant.tenantId,
      userId: user.userId,
      operationCode: 'ticket_resolution',
      creditCost: 25,
      operationId: 'op_1',
      entityType: 'organization',
      entityId: org.entityId,
    });

    expect(result.success).toBe(true);
    expect((result.data as { remainingCredits: number }).remainingCredits).toBe(95);

    const balance = await getEntityBalance(tenant.tenantId, 'organization', org.entityId);
    expect(balance).not.toBeNull();
    expect((balance as { availableCredits: number }).availableCredits).toBe(95);

    const history = await getTransactionHistory(tenant.tenantId, { type: 'consumption', limit: 10 });
    expect(history.transactions.length).toBeGreaterThan(0);
    expect(history.transactions[0]?.type).toBe('consumption');
    expect(history.transactions[0]?.amount).toBe(-25);
  });

  it('blocks over-draft and leaves balance unchanged', async () => {
    const tenant = await seedTenant(db);
    const user = await seedUser(db, tenant.tenantId);
    const org = await seedOrganization(db, tenant.tenantId);

    await seedCreditRecord(db, tenant.tenantId, org.entityId, '10');

    const result = await consumeCredits({
      tenantId: tenant.tenantId,
      userId: user.userId,
      operationCode: 'expensive_operation',
      creditCost: 25,
      operationId: 'op_2',
      entityType: 'organization',
      entityId: org.entityId,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Insufficient credits');

    const balance = await getEntityBalance(tenant.tenantId, 'organization', org.entityId);
    expect((balance as { availableCredits: number }).availableCredits).toBe(10);
  });
});

describe('credit operations – boundary and isolation', () => {
  it('consumes exact available balance leaving zero credits with insufficient_credits status', async () => {
    const tenant = await seedTenant(db);
    const user = await seedUser(db, tenant.tenantId);
    const org = await seedOrganization(db, tenant.tenantId);

    await seedCreditRecord(db, tenant.tenantId, org.entityId, '50');

    const result = await consumeCredits({
      tenantId: tenant.tenantId,
      userId: user.userId,
      operationCode: 'ticket_resolution',
      creditCost: 50,
      operationId: 'op_boundary_1',
      entityType: 'organization',
      entityId: org.entityId,
    });

    expect(result.success).toBe(true);
    expect((result.data as { remainingCredits: number }).remainingCredits).toBe(0);

    const balance = await getEntityBalance(tenant.tenantId, 'organization', org.entityId);
    expect(balance).not.toBeNull();
    expect((balance as { availableCredits: number; status: string }).availableCredits).toBe(0);
    expect((balance as { availableCredits: number; status: string }).status).toBe('insufficient_credits');
  });

  it('consuming for tenant A does not alter tenant B balance', async () => {
    const tenantA = await seedTenant(db);
    const userA = await seedUser(db, tenantA.tenantId);
    const orgA = await seedOrganization(db, tenantA.tenantId);

    const tenantB = await seedTenant(db);
    const orgB = await seedOrganization(db, tenantB.tenantId);

    await seedCreditRecord(db, tenantA.tenantId, orgA.entityId, '200');
    await seedCreditRecord(db, tenantB.tenantId, orgB.entityId, '200');

    const result = await consumeCredits({
      tenantId: tenantA.tenantId,
      userId: userA.userId,
      operationCode: 'ticket_resolution',
      creditCost: 100,
      operationId: 'op_isolation_1',
      entityType: 'organization',
      entityId: orgA.entityId,
    });

    expect(result.success).toBe(true);

    const balanceA = await getEntityBalance(tenantA.tenantId, 'organization', orgA.entityId);
    const balanceB = await getEntityBalance(tenantB.tenantId, 'organization', orgB.entityId);

    expect((balanceA as { availableCredits: number }).availableCredits).toBe(100);
    expect((balanceB as { availableCredits: number }).availableCredits).toBe(200);
  });

  it('sequential consumptions accumulate correctly against the same balance', async () => {
    const tenant = await seedTenant(db);
    const user = await seedUser(db, tenant.tenantId);
    const org = await seedOrganization(db, tenant.tenantId);

    await seedCreditRecord(db, tenant.tenantId, org.entityId, '100');

    const first = await consumeCredits({
      tenantId: tenant.tenantId,
      userId: user.userId,
      operationCode: 'ticket_resolution',
      creditCost: 30,
      operationId: 'op_seq_1',
      entityType: 'organization',
      entityId: org.entityId,
    });
    expect(first.success).toBe(true);
    expect((first.data as { remainingCredits: number }).remainingCredits).toBe(70);

    const second = await consumeCredits({
      tenantId: tenant.tenantId,
      userId: user.userId,
      operationCode: 'ticket_resolution',
      creditCost: 40,
      operationId: 'op_seq_2',
      entityType: 'organization',
      entityId: org.entityId,
    });
    expect(second.success).toBe(true);
    expect((second.data as { remainingCredits: number }).remainingCredits).toBe(30);

    const balance = await getEntityBalance(tenant.tenantId, 'organization', org.entityId);
    expect((balance as { availableCredits: number }).availableCredits).toBe(30);
  });

  it('getAvailablePackages returns three predefined packages with correct shape', async () => {
    const packages = await getAvailablePackages();

    expect(Array.isArray(packages)).toBe(true);
    expect(packages).toHaveLength(3);

    const ids = packages.map((p) => p.id);
    expect(ids).toContain('starter');
    expect(ids).toContain('professional');
    expect(ids).toContain('enterprise');

    // Only the professional package is marked recommended
    const recommended = packages.filter((p) => p.recommended);
    expect(recommended).toHaveLength(1);
    expect(recommended[0]?.id).toBe('professional');

    // Each package has required numeric/string fields
    for (const pkg of packages) {
      expect(typeof pkg.credits).toBe('number');
      expect(pkg.credits).toBeGreaterThan(0);
      expect(typeof pkg.price).toBe('number');
      expect(pkg.currency).toBe('USD');
      expect(Array.isArray(pkg.features)).toBe(true);
    }
  });
});

describe('credit operations – addCreditsToEntity and transferCredits', () => {
  it('addCreditsToEntity upserts balance and writes purchase ledger row(s)', async () => {
    const tenant = await seedTenant(db);
    const user = await seedUser(db, tenant.tenantId);
    const org = await seedOrganization(db, tenant.tenantId);

    await addCreditsToEntity({
      tenantId: tenant.tenantId,
      entityType: 'organization',
      entityId: org.entityId,
      creditAmount: 60,
      source: 'purchase',
      sourceId: 'seed_a',
      initiatedBy: user.userId,
      description: 'seed purchase A',
    });

    await addCreditsToEntity({
      tenantId: tenant.tenantId,
      entityType: 'organization',
      entityId: org.entityId,
      creditAmount: 40,
      source: 'purchase',
      sourceId: 'seed_b',
      initiatedBy: user.userId,
      description: 'seed purchase B',
    });

    const balance = await getEntityBalance(tenant.tenantId, 'organization', org.entityId);
    expect(balance).not.toBeNull();
    expect((balance as { availableCredits: number }).availableCredits).toBe(100);

    const purchaseHistory = await getTransactionHistory(tenant.tenantId, { type: 'purchase', limit: 20 });
    expect(purchaseHistory.transactions.length).toBeGreaterThanOrEqual(2);
  });

  it('transferCredits moves credits between entities and writes transfer ledger rows', async () => {
    const tenant = await seedTenant(db);
    const user = await seedUser(db, tenant.tenantId);
    const sourceOrg = await seedOrganization(db, tenant.tenantId, { entityName: 'Source Org' });
    const targetOrg = await seedOrganization(db, tenant.tenantId, { entityName: 'Target Org' });

    await seedCreditRecord(db, tenant.tenantId, sourceOrg.entityId, '150');
    await seedCreditRecord(db, tenant.tenantId, targetOrg.entityId, '10');

    const result = await transferCredits({
      fromTenantId: sourceOrg.entityId,
      toEntityType: 'organization',
      toEntityId: targetOrg.entityId,
      creditAmount: 40,
      initiatedBy: user.userId,
      reason: 'reallocation',
    });

    expect(result.success).toBe(true);

    const sourceBalance = await getEntityBalance(tenant.tenantId, 'organization', sourceOrg.entityId);
    const targetBalance = await getEntityBalance(tenant.tenantId, 'organization', targetOrg.entityId);
    expect((sourceBalance as { availableCredits: number }).availableCredits).toBe(110);
    expect((targetBalance as { availableCredits: number }).availableCredits).toBe(50);

    const outTx = await getTransactionHistory(tenant.tenantId, { type: 'transfer_out', limit: 10 });
    const inTx = await getTransactionHistory(tenant.tenantId, { type: 'transfer_in', limit: 10 });
    expect(outTx.transactions.length).toBeGreaterThanOrEqual(1);
    expect(inTx.transactions.length).toBeGreaterThanOrEqual(1);
  });
});

describe('credit lifecycle flow', () => {
  it('add -> consume -> summary -> history remains consistent', async () => {
    const tenant = await seedTenant(db);
    const user = await seedUser(db, tenant.tenantId);
    const org = await seedOrganization(db, tenant.tenantId, { entityName: 'Lifecycle Org' });

    await addCreditsToEntity({
      tenantId: tenant.tenantId,
      entityType: 'organization',
      entityId: org.entityId,
      creditAmount: 120,
      source: 'purchase',
      sourceId: 'lifecycle_seed',
      initiatedBy: user.userId,
      description: 'lifecycle top-up',
    });

    const consumeResult = await consumeCredits({
      tenantId: tenant.tenantId,
      userId: user.userId,
      operationCode: 'crm.contacts.create',
      creditCost: 35,
      operationId: 'lifecycle_consume_1',
      entityType: 'organization',
      entityId: org.entityId,
    });
    expect(consumeResult.success).toBe(true);

    const summary = await getUsageSummary(tenant.tenantId);
    expect(summary.totalPurchased).toBeGreaterThanOrEqual(120);
    expect(summary.totalConsumed).toBeGreaterThanOrEqual(35);

    const history = await getTransactionHistory(tenant.tenantId, { limit: 20 });
    const txTypes = history.transactions.map((t) => t.type);
    expect(txTypes).toContain('purchase');
    expect(txTypes).toContain('consumption');

    for (let i = 0; i < history.transactions.length - 1; i++) {
      const currRaw = history.transactions[i]!.createdAt;
      const nextRaw = history.transactions[i + 1]!.createdAt;
      const curr = currRaw ? new Date(currRaw).getTime() : 0;
      const next = nextRaw ? new Date(nextRaw).getTime() : 0;
      expect(curr).toBeGreaterThanOrEqual(next);
    }
  });
});
