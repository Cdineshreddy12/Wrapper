import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDb, seedCreditRecord, seedOrganization, seedTenant, type TestDb } from '../../../db/test-helpers/seed.js';
import { getEntityBalance, getTransactionHistory, getUsageSummary } from './credit-balance.js';

let db: TestDb;
let endDb: () => Promise<void>;

beforeAll(() => {
  const conn = createTestDb();
  db = conn.db;
  endDb = conn.end;
});

afterAll(() => endDb());

describe('credit-balance integration', () => {
  it('returns null entity balance when no credit record exists', async () => {
    const tenant = await seedTenant(db);
    const org = await seedOrganization(db, tenant.tenantId);

    const balance = await getEntityBalance(tenant.tenantId, 'organization', org.entityId);
    expect(balance).toBeNull();
  });

  it('returns tenant-scoped transaction history and pagination metadata', async () => {
    const tenantA = await seedTenant(db);
    const tenantB = await seedTenant(db);
    const orgA = await seedOrganization(db, tenantA.tenantId);
    const orgB = await seedOrganization(db, tenantB.tenantId);

    await db.execute(sql`
      INSERT INTO credit_transactions (tenant_id, entity_id, transaction_type, amount, previous_balance, new_balance, operation_code)
      VALUES
      (${tenantA.tenantId}, ${orgA.entityId}, 'purchase', '100.0000', '0.0000', '100.0000', 'crm.leads.create'),
      (${tenantA.tenantId}, ${orgA.entityId}, 'consumption', '-30.0000', '100.0000', '70.0000', 'crm.leads.update'),
      (${tenantA.tenantId}, ${orgA.entityId}, 'expiry', '-10.0000', '70.0000', '60.0000', 'system.expiry'),
      (${tenantB.tenantId}, ${orgB.entityId}, 'purchase', '999.0000', '0.0000', '999.0000', 'hr.employees.create')
    `);

    const history = await getTransactionHistory(tenantA.tenantId, { limit: 2, page: 1 });
    expect(history.transactions).toHaveLength(2);
    expect(history.pagination.total).toBe(3);
    expect(history.pagination.pages).toBe(2);
    history.transactions.forEach((tx) => {
      expect(['purchase', 'consumption', 'expiry']).toContain(tx.type);
    });
  });

  it('computes usage summary totals correctly from real ledger rows', async () => {
    const tenant = await seedTenant(db);
    const org = await seedOrganization(db, tenant.tenantId);

    await db.execute(sql`
      INSERT INTO credit_transactions (tenant_id, entity_id, transaction_type, amount, previous_balance, new_balance, operation_code)
      VALUES
      (${tenant.tenantId}, ${org.entityId}, 'purchase', '200.0000', '0.0000', '200.0000', 'purchase.start'),
      (${tenant.tenantId}, ${org.entityId}, 'consumption', '-45.0000', '200.0000', '155.0000', 'crm.contacts.read'),
      (${tenant.tenantId}, ${org.entityId}, 'expiry', '-5.0000', '155.0000', '150.0000', 'expiry.month_end')
    `);

    const summary = await getUsageSummary(tenant.tenantId);
    expect(summary.totalPurchased).toBe(200);
    expect(summary.totalConsumed).toBe(45);
    expect(summary.totalExpired).toBe(5);
    expect(summary.netCredits).toBe(150);
  });
});

describe('credit-balance – field shapes, filters, and isolation', () => {
  it('getEntityBalance returns the expected field shape for an active balance', async () => {
    const tenant = await seedTenant(db);
    const org = await seedOrganization(db, tenant.tenantId);

    await seedCreditRecord(db, tenant.tenantId, org.entityId, '75');

    const balance = await getEntityBalance(tenant.tenantId, 'organization', org.entityId);

    expect(balance).not.toBeNull();
    const b = balance as {
      availableCredits: number;
      status: string;
      entityId: string;
      tenantId: string;
    };
    expect(b.availableCredits).toBe(75);
    expect(b.status).toBe('active');
    expect(b.entityId).toBe(org.entityId);
    expect(b.tenantId).toBe(tenant.tenantId);
  });

  it('getEntityBalance returns status insufficient_credits when availableCredits is zero', async () => {
    const tenant = await seedTenant(db);
    const org = await seedOrganization(db, tenant.tenantId);

    await seedCreditRecord(db, tenant.tenantId, org.entityId, '0');

    const balance = await getEntityBalance(tenant.tenantId, 'organization', org.entityId);

    expect(balance).not.toBeNull();
    expect((balance as { status: string }).status).toBe('insufficient_credits');
    expect((balance as { availableCredits: number }).availableCredits).toBe(0);
  });

  it('getTransactionHistory filters results by transaction type', async () => {
    const tenant = await seedTenant(db);
    const org = await seedOrganization(db, tenant.tenantId);

    await db.execute(sql`
      INSERT INTO credit_transactions (tenant_id, entity_id, transaction_type, amount, previous_balance, new_balance, operation_code)
      VALUES
      (${tenant.tenantId}, ${org.entityId}, 'purchase',     '500.0000', '0.0000',   '500.0000', 'pkg.purchase'),
      (${tenant.tenantId}, ${org.entityId}, 'consumption',  '-20.0000', '500.0000', '480.0000', 'crm.leads.create'),
      (${tenant.tenantId}, ${org.entityId}, 'consumption',  '-15.0000', '480.0000', '465.0000', 'crm.leads.update')
    `);

    const purchaseHistory = await getTransactionHistory(tenant.tenantId, { type: 'purchase', limit: 10 });
    expect(purchaseHistory.transactions.length).toBeGreaterThanOrEqual(1);
    purchaseHistory.transactions.forEach((tx) => {
      expect(tx.type).toBe('purchase');
    });

    const consumptionHistory = await getTransactionHistory(tenant.tenantId, { type: 'consumption', limit: 10 });
    expect(consumptionHistory.transactions.length).toBeGreaterThanOrEqual(2);
    consumptionHistory.transactions.forEach((tx) => {
      expect(tx.type).toBe('consumption');
    });
  });

  it('getTransactionHistory returns rows in descending createdAt order', async () => {
    const tenant = await seedTenant(db);
    const org = await seedOrganization(db, tenant.tenantId);

    await db.execute(sql`
      INSERT INTO credit_transactions (tenant_id, entity_id, transaction_type, amount, previous_balance, new_balance, operation_code, created_at)
      VALUES
      (${tenant.tenantId}, ${org.entityId}, 'purchase', '300.0000', '0.0000',   '300.0000', 'pkg.old',    NOW() - INTERVAL '3 hours'),
      (${tenant.tenantId}, ${org.entityId}, 'purchase', '100.0000', '300.0000', '400.0000', 'pkg.middle', NOW() - INTERVAL '1 hour'),
      (${tenant.tenantId}, ${org.entityId}, 'purchase', '50.0000',  '400.0000', '450.0000', 'pkg.newest', NOW())
    `);

    const history = await getTransactionHistory(tenant.tenantId, { limit: 10 });
    expect(history.transactions.length).toBeGreaterThanOrEqual(3);

    // Verify descending order: each item's createdAt should be >= the next item's
    for (let i = 0; i < history.transactions.length - 1; i++) {
      const currRaw = history.transactions[i]!.createdAt;
      const nextRaw = history.transactions[i + 1]!.createdAt;
      const curr = currRaw ? new Date(currRaw).getTime() : 0;
      const next = nextRaw ? new Date(nextRaw).getTime() : 0;
      expect(curr).toBeGreaterThanOrEqual(next);
    }
  });

  it('getUsageSummary is tenant-scoped and excludes other tenant transactions', async () => {
    const tenantA = await seedTenant(db);
    const tenantB = await seedTenant(db);
    const orgA = await seedOrganization(db, tenantA.tenantId);
    const orgB = await seedOrganization(db, tenantB.tenantId);

    await db.execute(sql`
      INSERT INTO credit_transactions (tenant_id, entity_id, transaction_type, amount, previous_balance, new_balance, operation_code)
      VALUES
      (${tenantA.tenantId}, ${orgA.entityId}, 'purchase',    '400.0000',  '0.0000',   '400.0000',  'isolation.buy'),
      (${tenantA.tenantId}, ${orgA.entityId}, 'consumption', '-60.0000',  '400.0000', '340.0000',  'isolation.use'),
      (${tenantB.tenantId}, ${orgB.entityId}, 'purchase',    '9999.0000', '0.0000',   '9999.0000', 'other.buy')
    `);

    const summaryA = await getUsageSummary(tenantA.tenantId);
    expect(summaryA.totalPurchased).toBe(400);
    expect(summaryA.totalConsumed).toBe(60);
    // tenantB's 9999 purchase must NOT appear in tenantA's summary
    expect(summaryA.totalPurchased).not.toBe(10399);
  });
});
