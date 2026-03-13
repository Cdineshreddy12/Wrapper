import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { subscriptions } from '../../../db/schema/index.js';

export class SubscriptionRepository {
  static async getLatestActiveByTenant(
    tenantId: string
  ): Promise<typeof subscriptions.$inferSelect | null> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.status, 'active')))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription ?? null;
  }

  static async getLatestByTenant(tenantId: string): Promise<typeof subscriptions.$inferSelect | null> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription ?? null;
  }
}
