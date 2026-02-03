/**
 * Billing History Item - represents a payment record from the billing history API
 * Maps to the credit_purchases table schema
 */
export interface BillingHistoryItem {
  /** Unique payment identifier (purchaseId from credit_purchases) */
  id: string
  /** Total amount paid */
  amount: number
  /** Currency code (defaults to 'USD') */
  currency: string
  /** Payment status: 'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded' */
  status: string
  /** Human-readable description of the payment */
  description: string
  /** Invoice number (null if not available) */
  invoiceNumber: string | null
  /** Date when payment was completed */
  paidAt: Date | string | null
  /** Date when the record was created */
  createdAt: Date | string
  /** Number of credits purchased (for credit purchases) */
  creditsPurchased: number | null
  /** Date when purchased credits expire */
  expiryDate: Date | string | null
  /** Payment method used: 'stripe', 'bank_transfer', 'check', etc. */
  paymentMethod: string | null
  /** Stripe Payment Intent ID (if paid via Stripe) */
  stripePaymentIntentId: string | null
  /** Payment status from payment processor */
  paymentStatus: string | null
  /** Price per credit unit */
  unitPrice: number | null
  /** Unique batch identifier for this credit purchase */
  batchId: string | null
  /** Date when the purchase was requested */
  requestedAt: Date | string | null
  /** Date when credits were added to the account */
  creditedAt: Date | string | null
  /** Type of payment: 'credit_purchase', 'subscription', etc. */
  type: string
  /** Optional: Tax amount (if applicable) */
  taxAmount?: number
  /** Optional: Processing fees (if applicable) */
  processingFees?: number
  /** Optional: Net amount before taxes/fees */
  netAmount?: number
  /** Optional: Refund information */
  amountRefunded?: number
  refundedAt?: Date | string | null
  refundReason?: string | null
  /** Optional: Dispute information */
  amountDisputed?: number
  disputeStatus?: string | null
  disputeReason?: string | null
  /** Optional: Payment method details (card info, etc.) */
  paymentMethodDetails?: {
    card?: {
      last4: string
      brand: string
    }
  }
  /** Optional: Billing reason */
  billingReason?: string
  /** Optional: Stripe Charge ID */
  stripeChargeId?: string | null
  /** Optional: Stripe Invoice ID */
  stripeInvoiceId?: string | null
}
