import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, seedTenant, seedUser, type TestDb } from '../../../db/test-helpers/seed.js';
import { db } from '../../../db/index.js';
import { creditConfigurations } from '../../../db/schema/index.js';
import { getGlobalOperationConfigs, getOperationConfig } from './credit-config-global.js';

let testDb: TestDb;
let endDb: () => Promise<void>;

beforeAll(() => {
  const conn = createTestDb();
  testDb = conn.db;
  endDb = conn.end;
});

afterAll(() => endDb());

describe('getGlobalOperationConfigs', () => {
  it('returns an array where every entry has the expected transformed shape', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    // Insert a known global config so we can assert shape
    await db.insert(creditConfigurations).values({
      tenantId: null,
      operationCode: 'shape.test.op',
      isGlobal: true,
      creditCost: '7.5000',
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const configs = await getGlobalOperationConfigs();

    // Must return an array
    expect(Array.isArray(configs)).toBe(true);

    // Find our inserted config by operationCode
    const ours = configs.find((c) => c.operationCode === 'shape.test.op');
    expect(ours).toBeDefined();

    // creditCost must be a parsed float, not a string
    expect(typeof ours!.creditCost).toBe('number');
    expect(ours!.creditCost).toBe(7.5);

    // unitMultiplier must default to 1 when not provided
    expect(ours!.unitMultiplier).toBe(1);

    // isActive must be present (may be true or null depending on schema default)
    expect(Object.prototype.hasOwnProperty.call(ours, 'isActive')).toBe(true);
  });

  it('does not return tenant-specific configs (isGlobal=false)', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    await db.insert(creditConfigurations).values({
      tenantId: tenant.tenantId,
      operationCode: 'tenant.only.op',
      isGlobal: false,
      creditCost: '3.0000',
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const configs = await getGlobalOperationConfigs();
    const leaked = configs.find((c) => c.operationCode === 'tenant.only.op');
    expect(leaked).toBeUndefined();
  });
});

describe('getOperationConfig – priority chain', () => {
  it('returns default config with isDefault=true when operation code has no DB config', async () => {
    const config = await getOperationConfig('nonexistent.mystery.op');

    expect(config.isDefault).toBe(true);
    expect(config.configSource).toBe('default');
    expect(config.operationCode).toBe('nonexistent.mystery.op');
    expect(config.creditCost).toBe(1.0);   // hardcoded fallback in the service
    expect(config.allowOverage).toBe(true); // hardcoded fallback
  });

  it('returns global config with configSource=global when only a global config exists', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    await db.insert(creditConfigurations).values({
      tenantId: null,
      operationCode: 'global.priority.op',
      isGlobal: true,
      creditCost: '5.0000',
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const config = await getOperationConfig('global.priority.op', null);
    expect(config.isDefault).toBe(false);
    expect(config.configSource).toBe('global');
    expect(config.creditCost).toBe(5.0);
    expect(config.isGlobal).toBe(true);
    expect(config.operationCode).toBe('global.priority.op');
    expect(config.appCode).toBe('global');
    expect(config.moduleCode).toBe('priority');
  });

  it('returns tenant config with configSource=tenant when tenant-specific config exists', async () => {
    const tenant = await seedTenant(testDb);
    const user = await seedUser(testDb, tenant.tenantId);

    // Insert a global config (lower priority)
    await db.insert(creditConfigurations).values({
      tenantId: null,
      operationCode: 'priority.test.op',
      isGlobal: true,
      creditCost: '2.0000',
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    // Insert a tenant-specific config (higher priority)
    await db.insert(creditConfigurations).values({
      tenantId: tenant.tenantId,
      operationCode: 'priority.test.op',
      isGlobal: false,
      creditCost: '8.0000',
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    // With tenantId — should prefer tenant config
    const tenantConfig = await getOperationConfig('priority.test.op', tenant.tenantId);
    expect(tenantConfig.configSource).toBe('tenant');
    expect(tenantConfig.creditCost).toBe(8.0);

    // Without tenantId — should use global config
    const globalConfig = await getOperationConfig('priority.test.op', null);
    expect(globalConfig.configSource).toBe('global');
    expect(globalConfig.creditCost).toBe(2.0);
  });
});
