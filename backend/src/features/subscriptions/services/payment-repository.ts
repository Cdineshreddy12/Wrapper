import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { payments } from '../../../db/schema/billing/subscriptions.js';

export class PaymentRepository {
  static async create(paymentValues: Record<string, unknown>): Promise<typeof payments.$inferSelect> {
    const [payment] = await db.insert(payments).values(paymentValues as any).returning();
    return payment;
  }

  static async getByPaymentIntentId(paymentIntentId: string): Promise<typeof payments.$inferSelect | null> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    return payment ?? null;
  }

  static async updateByPaymentIntentId(
    paymentIntentId: string,
    updates: Record<string, unknown>
  ): Promise<typeof payments.$inferSelect | undefined> {
    const [updatedPayment] = await db
      .update(payments)
      .set(updates as any)
      .where(eq(payments.stripePaymentIntentId, paymentIntentId))
      .returning();
    return updatedPayment;
  }

  static async getHistoryByTenant(tenantId: string, limit = 50): Promise<Array<typeof payments.$inferSelect>> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.createdAt))
      .limit(limit);
  }

  static async getBySubscription(subscriptionId: string): Promise<Array<typeof payments.$inferSelect>> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.subscriptionId, subscriptionId))
      .orderBy(desc(payments.createdAt));
  }

  static async getFailedByTenant(tenantId: string, limit = 10): Promise<Array<typeof payments.$inferSelect>> {
    return db
      .select()
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.status, 'failed')))
      .orderBy(desc((payments as any).failedAt ?? payments.createdAt))
      .limit(limit);
  }
}
