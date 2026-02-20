import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { payments } from '../../../db/schema/index.js';
import { stripe, isStripeConfiguredFn } from './subscription-core.js';

export async function getPaymentDetailsByCheckoutSessionId(sessionId: string, tenantId: string): Promise<Record<string, unknown> | null> {
  if (!stripe || !isStripeConfiguredFn()) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    const meta = session.metadata || {};
    if (meta.tenantId !== tenantId) return null;
    const planId = meta.planId || meta.packageId || 'starter';
    const billingCycle = meta.billingCycle || 'yearly';
    const { PLAN_ACCESS_MATRIX } = await import('../../../data/permission-matrix.js');
    const planAccess = (PLAN_ACCESS_MATRIX as Record<string, any>)[planId];
    const planDetails = planAccess ? {
      name: planId.charAt(0).toUpperCase() + planId.slice(1),
      features: [
        ...(planAccess.applications?.includes('crm') ? ['CRM Suite'] : []),
        ...(planAccess.applications?.includes('hr') ? ['HR Management'] : []),
        `${planAccess.credits?.free || 0} Free Credits`,
      ],
      credits: planAccess.credits?.free || 0
    } : null;
    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const status = session.payment_status === 'paid' ? 'succeeded' : (session.payment_status || 'pending');
    return {
      success: true,
      data: {
        sessionId: session.id,
        transactionId: session.id,
        amount,
        currency: (session.currency || 'usd').toUpperCase(),
        planId,
        planName: planDetails?.name || planId,
        billingCycle,
        paymentMethod: 'card',
        status,
        createdAt: session.created ? new Date(session.created * 1000).toISOString() : new Date().toISOString(),
        processedAt: session.payment_status === 'paid' ? new Date().toISOString() : null,
        description: `Subscription: ${planDetails?.name || planId}`,
        subscription: null,
        features: planDetails?.features || [],
        credits: planDetails?.credits || 0
      }
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('getPaymentDetailsByCheckoutSessionId:', error?.message);
    return null;
  }
}

/**
 * Create comprehensive payment record.
 */
export async function createPaymentRecord(paymentData: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const paymentRecord = {
      paymentId: uuidv4(),
      tenantId: paymentData.tenantId as string,
      subscriptionId: paymentData.subscriptionId as string | undefined,

      // Stripe IDs
      stripePaymentIntentId: paymentData.stripePaymentIntentId,
      stripeInvoiceId: paymentData.stripeInvoiceId,
      stripeChargeId: paymentData.stripeChargeId,

      // Payment amounts
      amount: String(paymentData.amount ?? 0),
      currency: String(paymentData.currency ?? 'USD').toUpperCase(),
      status: paymentData.status as string,

      // Payment details
      paymentMethod: paymentData.paymentMethod || 'card',
      paymentMethodDetails: paymentData.paymentMethodDetails || {},
      paymentType: paymentData.paymentType || 'subscription',
      billingReason: paymentData.billingReason,

      // Invoice info
      invoiceNumber: paymentData.invoiceNumber,
      description: paymentData.description,

      // Financial breakdown
      prorationAmount: paymentData.prorationAmount?.toString() || '0',
      taxAmount: paymentData.taxAmount?.toString() || '0',
      taxRate: paymentData.taxRate?.toString() || '0',
      taxRegion: paymentData.taxRegion,
      processingFees: paymentData.processingFees?.toString() || '0',
      netAmount: paymentData.netAmount?.toString(),

      // Risk assessment
      riskLevel: paymentData.riskLevel || 'normal',
      riskScore: paymentData.riskScore,
      fraudDetails: paymentData.fraudDetails || {},

      // Metadata
      metadata: paymentData.metadata || {},
      stripeRawData: paymentData.stripeRawData || {},

      // Timestamps
      paidAt: paymentData.paidAt || new Date(),
      createdAt: new Date()
    };

    const [payment] = await db.insert(payments).values(paymentRecord as any).returning();

    console.log('✅ Payment record created:', payment.paymentId);
    return payment as unknown as Record<string, unknown>;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Failed to create payment record:', error);
    throw error;
  }
}

/**
 * Process immediate refund.
 */
export async function processRefund(params: { tenantId: string; paymentId: string; amount?: number | null; reason?: string }): Promise<Record<string, unknown>> {
  const { tenantId, paymentId, amount = null, reason = 'customer_request' } = params;
  try {
    console.log('🔄 Processing refund for payment:', paymentId);

    // Get the payment record
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.paymentId, paymentId))
      .limit(1);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.tenantId !== tenantId) {
      throw new Error('Payment does not belong to this tenant');
    }

    // Determine refund amount
    const refundAmount = amount ?? parseFloat(payment.amount);
    const isPartialRefund = amount != null && amount < parseFloat(payment.amount);

    // Process refund with Stripe
    let stripeRefund: unknown = null;
    if (payment.stripePaymentIntentId || payment.stripeChargeId) {
      const refundData: Record<string, unknown> = {
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: reason,
        metadata: {
          tenantId,
          paymentId,
          reason
        }
      };

      if (payment.stripePaymentIntentId) {
        refundData.payment_intent = payment.stripePaymentIntentId;
      } else if (payment.stripeChargeId) {
        refundData.charge = payment.stripeChargeId;
      }

      if (stripe) {
        stripeRefund = await stripe.refunds.create(refundData as any);
        console.log('✅ Stripe refund created:', (stripeRefund as { id: string })?.id);
      }
    }

    // Update payment record (extra fields in metadata if not in schema)
    await db
      .update(payments)
      .set({
        status: isPartialRefund ? 'partially_refunded' : 'refunded',
        updatedAt: new Date(),
        metadata: {
          ...(payment.metadata as Record<string, unknown> || {}),
          amountRefunded: refundAmount,
          refundReason: reason,
          stripeRefundId: (stripeRefund as { id?: string })?.id
        }
      } as any)
      .where(eq(payments.paymentId, paymentId));

    // Create refund payment record
    await createPaymentRecord({
      tenantId,
      subscriptionId: payment.subscriptionId,
      stripePaymentIntentId: (stripeRefund as { payment_intent?: string })?.payment_intent,
      stripeChargeId: (stripeRefund as { charge?: string })?.charge,
      amount: -refundAmount, // Negative amount for refund
      currency: payment.currency,
      status: 'succeeded',
      paymentType: 'refund',
      billingReason: 'refund_request',
      description: `Refund for ${reason}`,
      metadata: {
        originalPaymentId: paymentId,
        refundReason: reason,
        isPartialRefund
      },
      stripeRawData: stripeRefund || {}
    });

    console.log('✅ Refund processed successfully');
    return {
      refundId: (stripeRefund as { id?: string })?.id,
      amount: refundAmount,
      currency: payment.currency,
      status: 'succeeded',
      isPartialRefund
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Refund processing failed:', error);
    throw error;
  }
}
