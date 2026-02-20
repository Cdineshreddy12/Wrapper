import { db } from '../../../db/index.js';
import { payments } from '../../../db/schema/billing/subscriptions.js';
import { eq, desc, and } from 'drizzle-orm';

type PaymentData = Record<string, unknown> & {
  tenantId: string;
  subscriptionId?: string;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  stripeChargeId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  amount: string | number;
  currency?: string;
  status: string;
  paymentMethod?: string;
  paymentMethodDetails?: Record<string, unknown>;
  paymentType?: string;
  billingReason?: string;
  invoiceNumber?: string;
  description?: string;
  prorationAmount?: string;
  creditAmount?: string;
  taxAmount?: string;
  taxRate?: string;
  taxRegion?: string;
  processingFees?: string;
  netAmount?: string;
  riskLevel?: string;
  riskScore?: number;
  fraudDetails?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  stripeRawData?: Record<string, unknown>;
  paidAt?: Date;
};

export class PaymentService {
  // Record a comprehensive payment transaction
  static async recordPayment(paymentData: PaymentData) {
    try {
      const [payment] = await db.insert(payments).values({
        tenantId: paymentData.tenantId,
        subscriptionId: paymentData.subscriptionId,
        stripePaymentIntentId: paymentData.stripePaymentIntentId,
        stripeInvoiceId: paymentData.stripeInvoiceId,
        stripeChargeId: paymentData.stripeChargeId,
        stripeCustomerId: paymentData.stripeCustomerId,
        stripeSubscriptionId: paymentData.stripeSubscriptionId,
        amount: String(paymentData.amount),
        currency: paymentData.currency || 'USD',
        status: paymentData.status,
        paymentMethod: paymentData.paymentMethod,
        paymentMethodDetails: (paymentData.paymentMethodDetails || {}) as Record<string, unknown>,
        paymentType: paymentData.paymentType || 'subscription',
        billingReason: paymentData.billingReason,
        invoiceNumber: paymentData.invoiceNumber,
        description: paymentData.description,
        taxAmount: paymentData.taxAmount || '0',
        metadata: (paymentData.metadata || {}) as Record<string, unknown>,
        stripeRawData: (paymentData.stripeRawData || {}) as Record<string, unknown>,
        paidAt: paymentData.paidAt || new Date(),
      } as any).returning();

      console.log('✅ Payment recorded:', payment.paymentId);
      return payment;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to record payment:', error);
      throw error;
    }
  }

  // Get payment by Stripe payment intent ID
  static async getPaymentByIntentId(paymentIntentId: string) {
    try {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.stripePaymentIntentId, paymentIntentId))
        .limit(1);
      return payment ?? null;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to get payment by intent ID:', error);
      throw error;
    }
  }

  // Update payment status with comprehensive metadata
  static async updatePaymentStatus(paymentIntentId: string, status: string, metadata: Record<string, unknown> = {}) {
    try {
      const [updatedPayment] = await db
        .update(payments)
        .set({
          status,
          metadata,
          updatedAt: new Date(),
          ...(status === 'succeeded' && { paidAt: new Date() }),
          ...(status === 'failed' && { failedAt: new Date() }),
          ...(status === 'refunded' && { refundedAt: new Date() }),
          ...(status === 'disputed' && { disputedAt: new Date() })
        })
        .where(eq(payments.stripePaymentIntentId, paymentIntentId))
        .returning();

      return updatedPayment;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to update payment status:', error);
      throw error;
    }
  }

  // Get comprehensive payment history for a tenant
  static async getPaymentHistory(tenantId: string, limit = 50) {
    try {
      const paymentHistory = await db
        .select()
        .from(payments)
        .where(eq(payments.tenantId, tenantId))
        .orderBy(desc(payments.createdAt))
        .limit(limit);

      return paymentHistory;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to get payment history:', error);
      throw error;
    }
  }

  // Record a comprehensive refund
  static async recordRefund(originalPaymentId: string, refundAmount: string | number, reason?: string) {
    try {
      // Get the original payment
      const [originalPayment] = await db
        .select()
        .from(payments)
        .where(eq(payments.paymentId, originalPaymentId))
        .limit(1);

      if (!originalPayment) {
        throw new Error('Original payment not found');
      }

      const isPartialRefund = parseFloat(String(refundAmount)) < parseFloat(String(originalPayment.amount));

      // Update original payment record (schema may have amountRefunded, refundReason, etc.)
      const [updatedPayment] = await db
        .update(payments)
        .set({
          amountRefunded: String(refundAmount),
          status: isPartialRefund ? 'partially_refunded' : 'refunded',
          refundReason: reason,
          isPartialRefund,
          refundedAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            ...(originalPayment.metadata as Record<string, unknown> || {}),
            refund: {
              amount: refundAmount,
              reason: reason,
              processed_at: new Date().toISOString(),
              is_partial: isPartialRefund
            }
          }
        } as any)
        .where(eq(payments.paymentId, originalPaymentId))
        .returning();

      // Create separate refund record
      const [refundRecord] = await db.insert(payments).values({
        tenantId: originalPayment.tenantId,
        subscriptionId: originalPayment.subscriptionId,
        stripeChargeId: originalPayment.stripeChargeId,
        amount: (-parseFloat(String(refundAmount))).toString(), // Negative for refund
        currency: originalPayment.currency,
        status: 'succeeded',
        paymentType: 'refund',
        billingReason: 'refund',
        description: `Refund for ${reason || 'customer request'}`,
        metadata: {
          originalPaymentId: originalPaymentId,
          refundReason: reason,
          isPartialRefund
        },
        paidAt: new Date()
      } as any).returning();

      return { updatedPayment, refundRecord };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to record refund:', error);
      throw error;
    }
  }

  // Get payment statistics for a tenant
  static async getPaymentStats(tenantId: string) {
    try {
      const paymentHistory = await this.getPaymentHistory(tenantId);
      
      const stats = {
        totalPaid: 0,
        totalRefunded: 0,
        successfulPayments: 0,
        failedPayments: 0,
        lastPayment: null as Record<string, unknown> | null,
        monthlySpend: 0,
        averageTransactionValue: 0,
        disputeCount: 0,
        processingFees: 0
      };

      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      paymentHistory.forEach((payment: any) => {
        const amount = parseFloat(String(payment.amount));
        const paidAt = payment.paidAt ?? null;

        if (payment.status === 'succeeded' && payment.paymentType !== 'refund') {
          stats.totalPaid += amount;
          stats.successfulPayments++;

          if (!stats.lastPayment || (paidAt && (stats.lastPayment as any).paidAt && paidAt > (stats.lastPayment as any).paidAt)) {
            stats.lastPayment = payment as any;
          }

          // Calculate monthly spend
          if (paidAt && paidAt >= currentMonth) {
            stats.monthlySpend += amount;
          }

          // Add processing fees
          if ((payment as any).processingFees) {
            stats.processingFees += parseFloat(String((payment as any).processingFees));
          }
        } else if (payment.status === 'failed') {
          stats.failedPayments++;
        }

        // Count refunds
        if ((payment as any).amountRefunded && parseFloat(String((payment as any).amountRefunded)) > 0) {
          stats.totalRefunded += parseFloat(String((payment as any).amountRefunded));
        }

        // Count disputes
        if (payment.status === 'disputed' || (payment as any).stripeDisputeId) {
          stats.disputeCount++;
        }
      });

      // Calculate average transaction value
      if (stats.successfulPayments > 0) {
        stats.averageTransactionValue = stats.totalPaid / stats.successfulPayments;
      }

      return stats;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to get payment stats:', error);
      throw error;
    }
  }

  // Get payment methods from payment history (since we removed the separate table)
  static async getPaymentMethods(tenantId: string) {
    try {
      // Get unique payment methods from successful payments
      const uniquePaymentMethods = await db
        .select({
          paymentMethod: payments.paymentMethod,
          paymentMethodDetails: payments.paymentMethodDetails,
          lastUsed: payments.paidAt,
          count: payments.paymentId
        })
        .from(payments)
        .where(and(
          eq(payments.tenantId, tenantId),
          eq(payments.status, 'succeeded')
        ))
        .orderBy(desc(payments.paidAt));

      // Group by payment method and get the most recent details
      const methodsMap = new Map<string, { type: string; details: unknown; lastUsed: Date | null; isActive: boolean }>();

      uniquePaymentMethods.forEach(payment => {
        const method = payment.paymentMethod ?? 'unknown';
        const entry = methodsMap.get(method);
        if (!entry || (payment.lastUsed != null && (entry.lastUsed == null || payment.lastUsed > entry.lastUsed))) {
          methodsMap.set(method, {
            type: method,
            details: payment.paymentMethodDetails,
            lastUsed: payment.lastUsed,
            isActive: true
          });
        }
      });

      return Array.from(methodsMap.values());
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to get payment methods:', error);
      throw error;
    }
  }

  // Record dispute information
  static async recordDispute(paymentId: string, disputeData: Record<string, unknown> & { disputeId?: string; amount: string | number; reason?: string; status?: string; currency?: string; evidenceDueBy?: string; hasEvidence?: boolean }) {
    try {
      const [updatedPayment] = await db
        .update(payments)
        .set({
          status: 'disputed',
          stripeDisputeId: (disputeData.disputeId as string) ?? undefined,
          amountDisputed: String(disputeData.amount),
          updatedAt: new Date(),
          disputeReason: disputeData.reason,
          disputeStatus: disputeData.status,
          disputedAt: new Date(),
          metadata: {
            dispute: {
              id: disputeData.disputeId,
              reason: disputeData.reason,
              status: disputeData.status,
              amount: disputeData.amount,
              currency: disputeData.currency,
              evidence_due_by: disputeData.evidenceDueBy,
              has_evidence: disputeData.hasEvidence || false
            }
          }
        } as any)
        .where(eq(payments.paymentId, paymentId))
        .returning();

      return updatedPayment;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to record dispute:', error);
      throw error;
    }
  }

  // Get payments by subscription
  static async getPaymentsBySubscription(subscriptionId: string) {
    try {
      const subscriptionPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.subscriptionId, subscriptionId))
        .orderBy(desc(payments.createdAt));

      return subscriptionPayments;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to get subscription payments:', error);
      throw error;
    }
  }

  // Get failed payments for retry
  static async getFailedPayments(tenantId: string, limit = 10) {
    try {
      const failedPayments = await db
        .select()
        .from(payments)
        .where(and(
          eq(payments.tenantId, tenantId),
          eq(payments.status, 'failed')
        ))
        .orderBy(desc((payments as any).failedAt ?? payments.createdAt))
        .limit(limit);

      return failedPayments;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Failed to get failed payments:', error);
      throw error;
    }
  }
} 