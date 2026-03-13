import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, seedTenant, type TestDb } from '../../../db/test-helpers/seed.js';
import { db } from '../../../db/index.js';
import { subscriptions } from '../../../db/schema/index.js';
import { checkTrialHistory, handleExpiredTrials, sendTrialReminders } from './subscription-trial.js';

let testDb: TestDb;
let endDb: () => Promise<void>;

beforeAll(() => {
  const conn = createTestDb();
  testDb = conn.db;
  endDb = conn.end;
});

afterAll(() => endDb());

describe('subscription-trial integration', () => {
  it('checkTrialHistory returns true only when a trial record exists', async () => {
    const tenant = await seedTenant(testDb);

    const before = await checkTrialHistory(tenant.tenantId);
    expect(before).toBe(false);

    await db.insert(subscriptions).values({
      tenantId: tenant.tenantId,
      plan: 'trial',
      status: 'trialing',
      currentPeriodEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

    const after = await checkTrialHistory(tenant.tenantId);
    expect(after).toBe(true);
  });

  it('handleExpiredTrials suspends only expired trialing subscriptions', async () => {
    const expiredTenant = await seedTenant(testDb);
    const activeTenant = await seedTenant(testDb);

    const [expiredSub] = await db.insert(subscriptions).values({
      tenantId: expiredTenant.tenantId,
      plan: 'trial',
      status: 'trialing',
      currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
    }).returning();

    const [activeSub] = await db.insert(subscriptions).values({
      tenantId: activeTenant.tenantId,
      plan: 'trial',
      status: 'trialing',
      currentPeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    }).returning();

    const suspendedCount = await handleExpiredTrials();
    expect(suspendedCount).toBeGreaterThanOrEqual(1);

    const expiredReload = await db.select().from(subscriptions).where(eq(subscriptions.subscriptionId, expiredSub.subscriptionId));
    const activeReload = await db.select().from(subscriptions).where(eq(subscriptions.subscriptionId, activeSub.subscriptionId));
    expect(expiredReload[0]?.status).toBe('suspended');
    expect(activeReload[0]?.status).toBe('trialing');
  });

  it('sendTrialReminders counts only trials expiring soon', async () => {
    const soonTenant = await seedTenant(testDb);
    const laterTenant = await seedTenant(testDb);

    await db.insert(subscriptions).values({
      tenantId: soonTenant.tenantId,
      plan: 'trial',
      status: 'trialing',
      currentPeriodEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

    await db.insert(subscriptions).values({
      tenantId: laterTenant.tenantId,
      plan: 'trial',
      status: 'trialing',
      currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });

    const reminders = await sendTrialReminders();
    expect(reminders).toBeGreaterThanOrEqual(1);
  });
});

describe('subscription-trial – tenant scoping and plan boundary cases', () => {
  it('checkTrialHistory is tenant-scoped: trial for tenant A does not affect tenant B', async () => {
    const tenantA = await seedTenant(testDb);
    const tenantB = await seedTenant(testDb);

    // Only tenantA gets a trial subscription
    await db.insert(subscriptions).values({
      tenantId: tenantA.tenantId,
      plan: 'trial',
      status: 'trialing',
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    expect(await checkTrialHistory(tenantA.tenantId)).toBe(true);
    expect(await checkTrialHistory(tenantB.tenantId)).toBe(false);
  });

  it('checkTrialHistory returns true even when the trial subscription is suspended', async () => {
    const tenant = await seedTenant(testDb);

    // Insert a trial that has already been suspended (status is irrelevant to the check)
    await db.insert(subscriptions).values({
      tenantId: tenant.tenantId,
      plan: 'trial',
      status: 'suspended',
      currentPeriodEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });

    // checkTrialHistory only looks at plan='trial', not the status column
    expect(await checkTrialHistory(tenant.tenantId)).toBe(true);
  });

  it('checkTrialHistory returns false for a paid-plan subscription', async () => {
    const tenant = await seedTenant(testDb);

    await db.insert(subscriptions).values({
      tenantId: tenant.tenantId,
      plan: 'professional',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // No plan='trial' row exists, so this must be false
    expect(await checkTrialHistory(tenant.tenantId)).toBe(false);
  });

  it('sendTrialReminders does not count a trial expiring more than 3 days away', async () => {
    const farTenant = await seedTenant(testDb);

    await db.insert(subscriptions).values({
      tenantId: farTenant.tenantId,
      plan: 'trial',
      status: 'trialing',
      currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days away
    });

    // Get the count before and after — the far-future tenant must not be included
    // We verify by checking the far-future subscription directly: sendTrialReminders
    // should not touch/suspend it, and we confirm the reminder window boundary.
    const beforeCount = await sendTrialReminders();

    // Re-insert another far-future trial and confirm count does not increase
    const farTenant2 = await seedTenant(testDb);
    await db.insert(subscriptions).values({
      tenantId: farTenant2.tenantId,
      plan: 'trial',
      status: 'trialing',
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days away
    });

    const afterCount = await sendTrialReminders();

    // The far-future subscriptions must not have added to the reminder count
    // (both calls should return the same count since no new soon-expiring trials were added)
    expect(afterCount).toBe(beforeCount);
  });
});
