/**
 * Billing plans and credit top-up constants.
 * Fallback data when API is unavailable; must match backend IDs: starter, professional, enterprise.
 */

import type { ApplicationPlan, CreditTopup } from '@/types/pricing'

/** Fallback application plans (when API fails or mock mode) */
export const applicationPlansFallback: ApplicationPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Essential tools for small teams',
    monthlyPrice: 10,
    annualPrice: 120,
    currency: 'USD',
    freeCredits: 60000,
    features: ['CRM tools', 'User Management', 'Basic permissions', 'Email support']
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Comprehensive tools for growing businesses',
    monthlyPrice: 20,
    annualPrice: 240,
    currency: 'USD',
    freeCredits: 300000,
    features: [
      'All Starter features',
      'CRM & HR tools',
      'Advanced permissions',
      'Priority support',
      'Affiliate management'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Complete solution with all features',
    monthlyPrice: 30,
    annualPrice: 360,
    currency: 'USD',
    freeCredits: 1200000,
    features: [
      'All Professional features',
      'Unlimited users',
      'White-label options',
      'Dedicated support',
      'All integrations'
    ]
  }
]

/** Credit top-up plans (one-time purchases) */
export const creditTopups: CreditTopup[] = [
  {
    id: 'credits_5000',
    name: '5,000 Credits',
    description: 'Perfect for light usage',
    credits: 5000,
    price: 5,
    currency: 'USD',
    features: ['5,000 credits', 'Never expires', 'Use anytime', 'No monthly fees']
  },
  {
    id: 'credits_10000',
    name: '10,000 Credits',
    description: 'Ideal for regular operations',
    credits: 10000,
    price: 10,
    currency: 'USD',
    features: ['10,000 credits', 'Never expires', 'Best value', 'Priority support'],
    recommended: true
  },
  {
    id: 'credits_15000',
    name: '15,000 Credits',
    description: 'For high-volume operations',
    credits: 15000,
    price: 15,
    currency: 'USD',
    features: ['15,000 credits', 'Never expires', 'Maximum value', 'Premium support']
  }
]
