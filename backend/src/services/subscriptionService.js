import stripe from 'stripe';
import { db } from '../db/connection.js';
import { subscriptions, payments, tenants } from '../db/schema/index.js';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import emailService from '../utils/email.js';

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

class SubscriptionService {
  async getCurrentSubscription(tenantId) {
    const subscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!subscription.length) {
      return null;
    }

    const current = subscription[0];
    
    // Get Stripe subscription details if active
    if (current.stripeSubscriptionId && current.status === 'active') {
      try {
        const stripeSubscription = await stripeClient.subscriptions.retrieve(
          current.stripeSubscriptionId,
          { expand: ['latest_invoice', 'customer'] }
        );
        
        return {
          ...current,
          stripeData: stripeSubscription,
          nextBillingDate: new Date(stripeSubscription.current_period_end * 1000),
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
        };
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }

    return current;
  }

  async getAvailablePlans() {
    try {
      const prices = await stripeClient.prices.list({
        active: true,
        expand: ['data.product']
      });

      return prices.data.map(price => ({
        id: price.id,
        productId: price.product.id,
        name: price.product.name,
        description: price.product.description,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        intervalCount: price.recurring?.interval_count,
        features: price.product.metadata?.features ? 
          JSON.parse(price.product.metadata.features) : [],
        limits: price.product.metadata?.limits ? 
          JSON.parse(price.product.metadata.limits) : {},
        popular: price.product.metadata?.popular === 'true'
      }));
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw new Error('Failed to fetch available plans');
    }
  }

  async createCheckoutSession(tenantId, planId, options = {}) {
    try {
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant.length) {
        throw new Error('Tenant not found');
      }

      const tenantData = tenant[0];
      let customerId = tenantData.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripeClient.customers.create({
          email: tenantData.contactEmail,
          name: tenantData.name,
          metadata: {
            tenantId: tenantId,
            subdomain: tenantData.subdomain
          }
        });

        customerId = customer.id;

        // Update tenant with customer ID
        await db
          .update(tenants)
          .set({ stripeCustomerId: customerId })
          .where(eq(tenants.id, tenantId));
      }

      const sessionConfig = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: planId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        metadata: {
          tenantId: tenantId
        },
        subscription_data: {
          metadata: {
            tenantId: tenantId
          }
        }
      };

      // Apply coupon if provided
      if (options.couponCode) {
        sessionConfig.discounts = [{
          coupon: options.couponCode
        }];
      }

      const session = await stripeClient.checkout.sessions.create(sessionConfig);
      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  async createPortalSession(tenantId, returnUrl) {
    try {
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant.length || !tenant[0].stripeCustomerId) {
        throw new Error('No billing account found');
      }

      const session = await stripeClient.billingPortal.sessions.create({
        customer: tenant[0].stripeCustomerId,
        return_url: returnUrl
      });

      return session;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw new Error('Failed to create portal session');
    }
  }

  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw error;
    }
  }

  async handleCheckoutCompleted(session) {
    const tenantId = session.metadata.tenantId;
    const subscriptionId = session.subscription;

    if (!tenantId || !subscriptionId) {
      console.error('Missing tenantId or subscriptionId in checkout session');
      return;
    }

    try {
      const stripeSubscription = await stripeClient.subscriptions.retrieve(subscriptionId);
      
      await db.insert(subscriptions).values({
        id: crypto.randomUUID(),
        tenantId: tenantId,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: session.customer,
        status: stripeSubscription.status,
        plan: stripeSubscription.items.data[0].price.id,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update tenant status
      await db
        .update(tenants)
        .set({ 
          status: 'active',
          plan: stripeSubscription.items.data[0].price.id,
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId));

      // Send welcome email
      await emailService.sendWelcomeEmail(tenantId);
    } catch (error) {
      console.error('Error handling checkout completed:', error);
    }
  }

  async handlePaymentSucceeded(invoice) {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    try {
      // Record payment
      await db.insert(payments).values({
        id: crypto.randomUUID(),
        tenantId: invoice.metadata?.tenantId,
        stripePaymentIntentId: invoice.payment_intent,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'succeeded',
        type: 'subscription',
        createdAt: new Date()
      });

      // Update subscription if needed
      if (subscriptionId) {
        await db
          .update(subscriptions)
          .set({ 
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  async handlePaymentFailed(invoice) {
    const subscriptionId = invoice.subscription;

    try {
      if (subscriptionId) {
        await db
          .update(subscriptions)
          .set({ 
            status: 'past_due',
            updatedAt: new Date()
          })
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

        // Send payment failed email
        const subscription = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (subscription.length) {
          await emailService.sendPaymentFailedEmail(subscription[0].tenantId, {
            amount: invoice.amount_due,
            currency: invoice.currency,
            nextAttempt: invoice.next_payment_attempt
          });
        }
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  async handleSubscriptionUpdated(subscription) {
    try {
      await db
        .update(subscriptions)
        .set({
          status: subscription.status,
          plan: subscription.items.data[0].price.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date()
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

      // Update tenant plan
      const sub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
        .limit(1);

      if (sub.length) {
        await db
          .update(tenants)
          .set({ 
            plan: subscription.items.data[0].price.id,
            updatedAt: new Date()
          })
          .where(eq(tenants.id, sub[0].tenantId));
      }
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  async handleSubscriptionCancelled(subscription) {
    try {
      await db
        .update(subscriptions)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

      // Update tenant status
      const sub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
        .limit(1);

      if (sub.length) {
        await db
          .update(tenants)
          .set({ 
            status: 'cancelled',
            updatedAt: new Date()
          })
          .where(eq(tenants.id, sub[0].tenantId));

        // Send cancellation email
        await emailService.sendSubscriptionCancelledEmail(sub[0].tenantId);
      }
    } catch (error) {
      console.error('Error handling subscription cancelled:', error);
    }
  }

  async getBillingHistory(tenantId, options = {}) {
    const { page = 1, limit = 20, type } = options;
    const offset = (page - 1) * limit;

    let query = db
      .select()
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    if (type) {
      query = query.where(and(
        eq(payments.tenantId, tenantId),
        eq(payments.type, type)
      ));
    }

    const history = await query;
    
    const total = await db
      .select({ count: count() })
      .from(payments)
      .where(eq(payments.tenantId, tenantId));

    return {
      data: history,
      pagination: {
        page,
        limit,
        total: total[0].count,
        pages: Math.ceil(total[0].count / limit)
      }
    };
  }



  async updatePaymentMethod(tenantId, paymentMethodId) {
    try {
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant.length || !tenant[0].stripeCustomerId) {
        throw new Error('No billing account found');
      }

      // Attach payment method to customer
      await stripeClient.paymentMethods.attach(paymentMethodId, {
        customer: tenant[0].stripeCustomerId
      });

      // Set as default payment method
      await stripeClient.customers.update(tenant[0].stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw new Error('Failed to update payment method');
    }
  }

  async cancelSubscription(tenantId, options = {}) {
    try {
      const subscription = await this.getCurrentSubscription(tenantId);
      
      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      const cancelParams = {
        cancellation_details: {
          comment: options.reason
        }
      };

      if (options.immediately) {
        cancelParams.prorate = true;
      }

      const cancelled = await stripeClient.subscriptions.cancel(
        subscription.stripeSubscriptionId,
        cancelParams
      );

      return {
        id: cancelled.id,
        status: cancelled.status,
        cancelledAt: new Date(cancelled.canceled_at * 1000),
        endsAt: new Date(cancelled.current_period_end * 1000)
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  async reactivateSubscription(tenantId) {
    try {
      const subscription = await this.getCurrentSubscription(tenantId);
      
      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new Error('No subscription found');
      }

      const reactivated = await stripeClient.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: false
        }
      );

      return {
        id: reactivated.id,
        status: reactivated.status,
        currentPeriodEnd: new Date(reactivated.current_period_end * 1000)
      };
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw new Error('Failed to reactivate subscription');
    }
  }

  async applyCoupon(tenantId, couponCode) {
    try {
      const subscription = await this.getCurrentSubscription(tenantId);
      
      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      const updated = await stripeClient.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          coupon: couponCode
        }
      );

      return {
        id: updated.id,
        discount: updated.discount
      };
    } catch (error) {
      console.error('Error applying coupon:', error);
      if (error.code === 'resource_missing') {
        throw new Error('Invalid coupon code');
      }
      throw new Error('Failed to apply coupon');
    }
  }

  async getUpcomingInvoice(tenantId) {
    try {
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant.length || !tenant[0].stripeCustomerId) {
        throw new Error('No billing account found');
      }

      const invoice = await stripeClient.invoices.retrieveUpcoming({
        customer: tenant[0].stripeCustomerId
      });

      return {
        id: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        dueDate: new Date(invoice.due_date * 1000),
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        lines: invoice.lines.data.map(line => ({
          description: line.description,
          amount: line.amount,
          quantity: line.quantity,
          period: {
            start: new Date(line.period.start * 1000),
            end: new Date(line.period.end * 1000)
          }
        }))
      };
    } catch (error) {
      console.error('Error fetching upcoming invoice:', error);
      throw new Error('Failed to fetch upcoming invoice');
    }
  }

  async getInvoiceDownloadUrl(tenantId, invoiceId) {
    try {
      const invoice = await stripeClient.invoices.retrieve(invoiceId);
      
      // Verify invoice belongs to tenant
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant.length || invoice.customer !== tenant[0].stripeCustomerId) {
        throw new Error('Invoice not found');
      }

      return invoice.invoice_pdf;
    } catch (error) {
      console.error('Error getting invoice download URL:', error);
      throw new Error('Failed to get invoice download URL');
    }
  }
}

export default new SubscriptionService(); 