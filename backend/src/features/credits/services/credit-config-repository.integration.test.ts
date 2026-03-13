import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, seedTenant, seedUser, type TestDb } from '../../../db/test-helpers/seed.js';
import { db } from '../../../db/index.js';
import { creditConfigurations } from '../../../db/schema/index.js';
import { CreditConfigRepository } from './credit-config-repository.js';

let testDb: TestDb;
let endDb: () => Promise<void>;

beforeAll(() => {
  const conn = createTestDb();
  testDb = conn.db;
  endDb = conn.end;
});

afterAll(() => endDb());

describe('credit-config repository integration', () => {
  it('returns tenant config for tenant operation lookup', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    await db.insert(creditConfigurations).values({
      tenantId: tenant.tenantId,
      operationCode: 'crm.leads.create',
      isGlobal: false,
      creditCost: '3.5000',
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const config = await CreditConfigRepository.getTenantOperationConfig('crm.leads.create', tenant.tenantId);
    expect(config).not.toBeNull();
    expect(config?.tenantId).toBe(tenant.tenantId);
    expect(config?.isGlobal).toBe(false);
    expect(Number(config?.creditCost)).toBe(3.5);
  });

  it('returns global config for global operation lookup', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    await db.insert(creditConfigurations).values({
      tenantId: null,
      operationCode: 'crm.contacts.read',
      isGlobal: true,
      creditCost: '1.2500',
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const global = await CreditConfigRepository.getGlobalOperationConfig('crm.contacts.read');
    expect(global).not.toBeNull();
    expect(global?.isGlobal).toBe(true);
    expect(Number(global?.creditCost)).toBe(1.25);
  });
});

describe('credit-config repository – null returns, sorting, and isolation', () => {
  it('getAllGlobalConfigs returns multiple global configs ordered alphabetically by operationCode', async () => {
    const user = await seedUser(testDb, (await seedTenant(testDb)).tenantId);

    // Insert three global configs with codes that sort in a known order
    await db.insert(creditConfigurations).values([
      { tenantId: null, operationCode: 'zzz.last.op',    isGlobal: true, creditCost: '9.0000', createdBy: user.userId, updatedBy: user.userId },
      { tenantId: null, operationCode: 'aaa.first.op',   isGlobal: true, creditCost: '1.0000', createdBy: user.userId, updatedBy: user.userId },
      { tenantId: null, operationCode: 'mmm.middle.op',  isGlobal: true, creditCost: '5.0000', createdBy: user.userId, updatedBy: user.userId },
    ]);

    const allGlobal = await CreditConfigRepository.getAllGlobalConfigs();

    // Should include at least our three new rows
    expect(allGlobal.length).toBeGreaterThanOrEqual(3);

    // Every returned row must be global
    allGlobal.forEach((c) => expect(c.isGlobal).toBe(true));

    // Verify the result is sorted ascending by operationCode
    for (let i = 0; i < allGlobal.length - 1; i++) {
      expect(allGlobal[i]!.operationCode.localeCompare(allGlobal[i + 1]!.operationCode)).toBeLessThanOrEqual(0);
    }

    // Our known rows must appear in ascending order relative to each other
    const ours = allGlobal.filter((c) =>
      ['aaa.first.op', 'mmm.middle.op', 'zzz.last.op'].includes(c.operationCode)
    );
    expect(ours.map((c) => c.operationCode)).toEqual(['aaa.first.op', 'mmm.middle.op', 'zzz.last.op']);
  });

  it('getTenantOperationConfig returns null for an unknown operation code', async () => {
    const tenant = await seedTenant(testDb);

    const result = await CreditConfigRepository.getTenantOperationConfig('nonexistent.code.xyz', tenant.tenantId);
    expect(result).toBeNull();
  });

  it('getGlobalOperationConfig returns null for an unknown operation code', async () => {
    const result = await CreditConfigRepository.getGlobalOperationConfig('nonexistent.global.xyz');
    expect(result).toBeNull();
  });

  it('tenant A config is not visible when querying with tenant B id', async () => {
    const tenantA = await seedTenant(testDb);
    const tenantB = await seedTenant(testDb);
    const userA = await seedUser(testDb, tenantA.tenantId);

    await db.insert(creditConfigurations).values({
      tenantId: tenantA.tenantId,
      operationCode: 'isolation.op.tenant_a',
      isGlobal: false,
      creditCost: '7.0000',
      createdBy: userA.userId,
      updatedBy: userA.userId,
    });

    // tenantA can find it
    const fromA = await CreditConfigRepository.getTenantOperationConfig('isolation.op.tenant_a', tenantA.tenantId);
    expect(fromA).not.toBeNull();

    // tenantB cannot see tenantA's config
    const fromB = await CreditConfigRepository.getTenantOperationConfig('isolation.op.tenant_a', tenantB.tenantId);
    expect(fromB).toBeNull();
  });

  it('tenant-specific config (isGlobal=false) is not returned by getGlobalOperationConfig', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    await db.insert(creditConfigurations).values({
      tenantId: tenant.tenantId,
      operationCode: 'scope.check.tenant_only',
      isGlobal: false,
      creditCost: '2.0000',
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const globalLookup = await CreditConfigRepository.getGlobalOperationConfig('scope.check.tenant_only');
    expect(globalLookup).toBeNull();
  });
});
