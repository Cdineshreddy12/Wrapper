import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../../db/index.js';
import { tenants, tenantUsers, subscriptions } from '../../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export default async function paymentProfileCompletionRoutes(
  fastify: FastifyInstance,
  _options?: Record<string, unknown>
): Promise<void> {
  // Get profile completion requirements
  fastify.get('/onboarding/profile-requirements/:tenantId', {
    schema: {}
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const { tenantId } = params;

      const organization = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          gstin: tenants.gstin,
          phone: tenants.phone,
          onboardingCompleted: tenants.onboardingCompleted
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (organization.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found'
        });
      }

      const org = organization[0] as any;

      // Define required fields for completion
      const profileRequirements = {
        business_details: {
          title: 'Business Information',
          required: true,
          fields: [
            {
              name: 'legalCompanyName',
              label: 'Legal Company Name',
              type: 'text',
              required: true,
              placeholder: 'Enter legal registered company name'
            },
            {
              name: 'industry',
              label: 'Industry',
              type: 'select',
              required: true,
              options: [
                'Technology', 'Healthcare', 'Finance', 'Manufacturing',
                'Retail', 'Education', 'Consulting', 'Real Estate',
                'Transportation', 'Food & Beverage', 'Other'
              ]
            },
            {
              name: 'companySize',
              label: 'Company Size',
              type: 'select',
              required: true,
              options: ['1-10', '11-50', '51-200', '201-1000', '1000+']
            },
            {
              name: 'website',
              label: 'Company Website',
              type: 'url',
              required: false,
              placeholder: 'https://www.company.com'
            }
          ]
        },
        billing_address: {
          title: 'Billing Address',
          required: true,
          fields: [
            {
              name: 'billingStreet',
              label: 'Street Address',
              type: 'text',
              required: true,
              placeholder: '123 Business Street'
            },
            {
              name: 'billingCity',
              label: 'City',
              type: 'text',
              required: true,
              placeholder: 'Mumbai'
            },
            {
              name: 'billingState',
              label: 'State',
              type: 'text',
              required: true,
              placeholder: 'Maharashtra'
            },
            {
              name: 'billingZip',
              label: 'ZIP/Postal Code',
              type: 'text',
              required: true,
              placeholder: '400001'
            },
            {
              name: 'billingCountry',
              label: 'Country',
              type: 'select',
              required: true,
              options: ['India', 'United States', 'United Kingdom', 'Other']
            }
          ]
        },
        contact_details: {
          title: 'Contact Information',
          required: true,
          fields: [
            {
              name: 'phone',
              label: 'Business Phone',
              type: 'tel',
              required: true,
              placeholder: '+91-22-1234-5678'
            },
            {
              name: 'fax',
              label: 'Fax Number',
              type: 'tel',
              required: false,
              placeholder: '+91-22-1234-5679'
            }
          ]
        },
        payment_method: {
          title: 'Payment Method',
          required: true,
          fields: [
            {
              name: 'paymentMethod',
              label: 'Payment Method',
              type: 'select',
              required: true,
              options: ['Credit Card', 'Debit Card', 'Net Banking', 'UPI']
            }
          ]
        }
      };

      // Mark completed requirements
      const requirementsStatus: Record<string, unknown> = {};
      const reqKeys = Object.keys(profileRequirements);
      reqKeys.forEach(key => {
        const section = (profileRequirements as Record<string, unknown>)[key];
        requirementsStatus[key] = typeof section === 'object' && section !== null
          ? { ...(section as object), completed: (org.completedSteps as string[] || []).includes(key) }
          : { completed: (org.completedSteps as string[] || []).includes(key) };
      });

      const completedStepsArr = (org.completedSteps as string[] | undefined) || [];
      const totalReqs = reqKeys.length;
      return reply.send({
        success: true,
        data: {
          organization: {
            tenantId: org.tenantId,
            organizationName: org.companyName ?? org.organizationName,
            gstin: org.gstin,
            mobile: org.phone ?? org.mobile,
            onboardingStatus: org.onboardingCompleted ? 'completed' : (org.onboardingStatus ?? 'pending')
          },
          requirements: requirementsStatus,
          completionProgress: {
            completed: completedStepsArr.length,
            total: totalReqs,
            percentage: totalReqs ? Math.round((completedStepsArr.length / totalReqs) * 100) : 0
          }
        }
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Profile requirements fetch failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch requirements',
        message: 'Unable to retrieve profile completion requirements'
      });
    }
  });

  // Complete profile with payment
  fastify.post('/onboarding/complete-profile-with-payment', {
    schema: {}
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown>;
    const tenantId = (body.tenantId as string) ?? '';
    const profileData = (body.profileData as Record<string, unknown>) ?? {};
    const paymentData = (body.paymentData as Record<string, unknown>) ?? {};

    try {
      console.log('💳 Starting profile completion with payment for tenant:', tenantId);

      const organization = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (organization.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found'
        });
      }

      const org = organization[0] as any;

      if (org.onboardingCompleted === true || org.onboardingStatus === 'completed') {
        return reply.code(400).send({
          success: false,
          error: 'Already completed',
          message: 'Organization onboarding is already completed'
        });
      }

      console.log('💳 Processing payment...');
      const paymentResult = await processStripePayment(paymentData);

      if (!paymentResult.success) {
        return reply.code(400).send({
          success: false,
          error: 'Payment failed',
          message: paymentResult.message
        });
      }

      console.log('📝 Completing profile...');
      await db.update(tenants)
        .set({
          ...(profileData as object),
          stripeCustomerId: paymentResult.customerId ?? undefined,
          onboardingCompleted: true,
          isVerified: true,
          updatedAt: new Date()
        } as any)
        .where(eq(tenants.tenantId, tenantId));

      await updateSubscriptionToPaid(tenantId, paymentData, paymentResult);

      await sendCompletionConfirmation(org, profileData);

      console.log('✅ Profile completion with payment successful');

      return reply.send({
        success: true,
        message: 'Profile completed and payment processed successfully',
        data: {
          tenantId,
          subscriptionId: paymentResult.subscriptionId,
          onboardingStatus: 'completed',
          nextStep: 'dashboard'
        }
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Profile completion with payment failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Completion failed',
        message: 'Failed to complete profile and process payment'
      });
    }
  });

  // Update profile after initial completion
  fastify.put('/onboarding/update-profile/:tenantId', {
    schema: {
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          legalCompanyName: { type: 'string' },
          industry: { type: 'string' },
          companySize: { type: 'string' },
          website: { type: 'string' },
          billingStreet: { type: 'string' },
          billingCity: { type: 'string' },
          billingState: { type: 'string' },
          billingZip: { type: 'string' },
          billingCountry: { type: 'string' },
          phone: { type: 'string' },
          fax: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const { tenantId } = params;
      const updates = request.body as Record<string, unknown>;

      const updatePayload = typeof updates === 'object' && updates !== null ? { ...(updates as object), updatedAt: new Date() } : { updatedAt: new Date() };
      await db.update(tenants)
        .set(updatePayload as any)
        .where(eq(tenants.tenantId, tenantId));

      return reply.send({
        success: true,
        message: 'Profile updated successfully'
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Profile update failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Update failed',
        message: 'Failed to update profile'
      });
    }
  });
}

// Helper function to process Stripe payment
async function processStripePayment(paymentData: Record<string, unknown>): Promise<{ success: boolean; customerId?: string; subscriptionId?: string; invoiceId?: string; message?: string }> {
  try {
    const { paymentMethodId, planId, billingCycle = 'monthly' } = paymentData;

    let customer: Stripe.Customer;
    const customerEmail = paymentData.customerEmail as string;
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        name: (paymentData.customerName as string) ?? '',
        payment_method: paymentMethodId as string,
        invoice_settings: {
          default_payment_method: paymentMethodId as string
        }
      } as Stripe.CustomerCreateParams);
    }

    const priceId = getPriceId(planId as string, billingCycle as string) ?? undefined;
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId ?? (process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? '') }],
      default_payment_method: paymentMethodId as string,
      expand: ['latest_invoice.payment_intent']
    } as Stripe.SubscriptionCreateParams);

    const latestInvoice = subscription.latest_invoice;
    const invoiceId = typeof latestInvoice === 'object' && latestInvoice && 'id' in latestInvoice
      ? (latestInvoice as Stripe.Invoice).id
      : (typeof latestInvoice === 'string' ? latestInvoice : undefined);

    return {
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id,
      invoiceId
    };

  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Stripe payment processing failed:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Helper function to update subscription
async function updateSubscriptionToPaid(tenantId: string, paymentData: Record<string, unknown>, paymentResult: { subscriptionId?: string; customerId?: string }): Promise<void> {
  // Update subscription from trial to paid
  await db.update(subscriptions)
    .set({
      plan: paymentData.planId as string,
      status: 'active',
      stripeSubscriptionId: paymentResult.subscriptionId ?? null,
      stripeCustomerId: paymentResult.customerId ?? null,
      billingCycle: paymentData.billingCycle as string,
      updatedAt: new Date()
    } as any)
    .where(eq(subscriptions.tenantId, tenantId));
}

// Helper function to get Stripe price ID
function getPriceId(planId: string, billingCycle: string): string | undefined {
  const priceIds = {
    starter: {
      monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID
    },
    professional: {
      monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID
    },
    enterprise: {
      monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID
    }
  };

  return (priceIds as Record<string, Record<string, string | undefined>>)[planId]?.[billingCycle] || priceIds.starter.monthly;
}

// Helper function to send completion confirmation
async function sendCompletionConfirmation(organization: Record<string, unknown>, profileData: Record<string, unknown>): Promise<void> {
  const adminEmail = (organization as any).adminEmail as string | undefined;
  console.log('📧 Sending completion confirmation to:', adminEmail ?? '');

  // Implementation would depend on your email service
  // await EmailService.sendCompletionConfirmation({
  //   to: organization.adminEmail,
  //   organization: organization,
  //   profileData: profileData
  // });
}
