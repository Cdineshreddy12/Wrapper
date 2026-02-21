/**
 * Billing page data and actions.
 * Centralizes subscription, credit, billing history, timeline, and mutations.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import toast from 'react-hot-toast'

import {
  subscriptionAPI,
  creditAPI,
  tenantAPI,
  setKindeTokenGetter,
  api
} from '@/lib/api'
import { useSubscriptionCurrent } from '@/hooks/useSharedQueries'
import { applicationPlansFallback, creditTopups } from '../constants/billingPlans'
import type { ApplicationPlan, CreditTopup } from '@/types/pricing'

/** Display subscription shape (subscription + optional credit/usage fields) */
export interface DisplaySubscription {
  plan: string
  status: string
  currentPeriodEnd: string
  amount?: number
  currency?: string
  billingCycle?: string
  monthlyPrice?: number
  yearlyPrice?: number
  availableCredits?: number
  totalCredits?: number
  usageThisPeriod?: number
  freeCreditsExpiry?: string
  alerts?: string[]
  [key: string]: unknown
}

function ensureValidSubscription(sub: DisplaySubscription | null | undefined): DisplaySubscription | null {
  if (!sub) return null
  let validCurrentPeriodEnd = sub.currentPeriodEnd
  if (!validCurrentPeriodEnd || isNaN(new Date(validCurrentPeriodEnd).getTime())) {
    validCurrentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  }
  return { ...sub, currentPeriodEnd: validCurrentPeriodEnd }
}

const defaultDisplaySubscription: DisplaySubscription = {
  plan: 'free',
  status: 'active',
  currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  amount: 0,
  currency: 'USD'
}

export function useBilling() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as Record<string, string>
  const queryClient = useQueryClient()

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('subscription')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<string | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null)
  const [isCheckingProfile, setIsCheckingProfile] = useState(false)

  const { isAuthenticated, isLoading, user, getToken, login } = useKindeAuth()

  const upgradeMode = search['upgrade'] === 'true'
  const paymentCancelled = search['payment'] === 'cancelled'
  const paymentSuccess = search['payment'] === 'success'
  const mockMode = search['mock'] === 'true'

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['credit'] })
    }
  }, [isAuthenticated, isLoading, queryClient])

  useEffect(() => {
    if (paymentCancelled) {
      const params = new URLSearchParams(window.location.search)
      navigate({ to: `/payment-cancelled?${params.toString()}` })
    }
  }, [paymentCancelled, navigate])

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !mockMode) {
      toast.error('Not authenticated with Kinde. Please log in first.')
    }
  }, [isAuthenticated, isLoading, mockMode])

  useEffect(() => {
    if (getToken) {
      setKindeTokenGetter(async () => {
        try {
          const token = await getToken()
          return token || null
        } catch (error) {
          console.error('Kinde token getter error:', error)
          return null
        }
      })
    }
  }, [getToken, isAuthenticated])

  useEffect(() => {
    if (paymentSuccess) {
      queryClient.invalidateQueries()
      localStorage.removeItem('trialExpired')
      window.dispatchEvent(new CustomEvent('paymentSuccess'))
      window.dispatchEvent(new CustomEvent('subscriptionUpgraded'))
      window.dispatchEvent(new CustomEvent('profileCompleted'))
      const params = new URLSearchParams(window.location.search)
      navigate({ to: `/payment-success?${params.toString()}` })
    }
  }, [paymentSuccess, queryClient, navigate])

  const {
    data: subscription,
    isLoading: subscriptionLoading,
    refetch: refetchSubscription
  } = useSubscriptionCurrent()

  const { data: plansFromApi } = useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: async () => {
      const response = await subscriptionAPI.getAvailablePlans()
      const raw = response.data?.data ?? response.data
      const list = Array.isArray(raw) ? raw : []
      return list.map((p: { id: string; name: string; description?: string; monthlyPrice?: number; yearlyPrice?: number; price?: number; credits?: number; features?: string[]; popular?: boolean }) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        monthlyPrice: Number(p.monthlyPrice) ?? 0,
        annualPrice: Number(p.yearlyPrice ?? p.price) ?? 0,
        currency: 'USD',
        freeCredits: Number(p.credits) ?? 0,
        features: Array.isArray(p.features) ? p.features : [],
        popular: !!p.popular
      })) as ApplicationPlan[]
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  })

  const applicationPlans: ApplicationPlan[] =
    plansFromApi && plansFromApi.length > 0 ? plansFromApi : applicationPlansFallback

  const { data: packagesData } = useQuery({
    queryKey: ['credit', 'packages'],
    queryFn: async () => creditTopups,
    enabled: !mockMode,
    retry: 1
  })

  const {
    data: creditBalance,
    refetch: refetchCreditBalance
  } = useQuery({
    queryKey: ['credit', 'current'],
    queryFn: async () => {
      try {
        const response = await creditAPI.getCurrentBalance()
        return response.data.data
      } catch (error: unknown) {
        console.warn('Failed to fetch credit balance:', error)
        return { availableCredits: 0, freeCredits: 0, paidCredits: 0, totalCredits: 0 }
      }
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  })

  const { data: billingHistory, isLoading: billingHistoryLoading } = useQuery({
    queryKey: ['subscription', 'billing-history'],
    queryFn: async () => {
      try {
        const response = await subscriptionAPI.getBillingHistory()
        return response.data.data ?? []
      } catch (error: unknown) {
        console.warn('Failed to fetch billing history:', error)
        return []
      }
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  })

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['tenant', 'timeline'],
    queryFn: async () => {
      try {
        const response = await tenantAPI.getTimeline({ includeActivity: true, limit: 300 })
        return response.data.data ?? { events: [] }
      } catch (error: unknown) {
        console.warn('Failed to fetch timeline:', error)
        return { events: [] }
      }
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  })

  const displaySubscription: DisplaySubscription =
    ensureValidSubscription(subscription as DisplaySubscription) ?? defaultDisplaySubscription
  const displayBillingHistory = billingHistory ?? []
  const displayCreditTopups: CreditTopup[] = packagesData ?? creditTopups

  const createCheckoutMutation = useMutation({
    mutationFn: async ({ planId, billingCycle: cycle }: { planId: string; billingCycle: 'monthly' | 'yearly' }) => {
      if (mockMode) {
        await new Promise((r) => setTimeout(r, 2000))
        return { checkoutUrl: `https://checkout.stripe.com/pay/mock-${planId}-${cycle}#test` }
      }
      const response = await subscriptionAPI.createCheckout({
        planId,
        billingCycle: cycle,
        successUrl: `${window.location.origin}/payment-success?type=credit_purchase&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/billing?payment=cancelled`
      })
      return response.data.data
    },
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        toast.success('Redirecting to secure payment page...', { duration: 2000 })
        setTimeout(() => {
          if (mockMode) setIsUpgrading(false)
          else window.location.href = data.checkoutUrl
        }, 1000)
      } else {
        toast.error('No checkout URL received from server')
        setIsUpgrading(false)
      }
    },
    onError: (error: unknown & { response?: { data?: { action?: string } }; message?: string }) => {
      if ((error as { response?: { data?: { action?: string } } })?.response?.data?.action === 'redirect_to_onboarding') {
        setNeedsOnboarding(true)
        toast.error('Please complete onboarding first to create a subscription.', { duration: 5000 })
      } else {
        toast.error((error as { message?: string }).message ?? 'Failed to create checkout session', { duration: 8000 })
      }
      setIsUpgrading(false)
    }
  })

  const changePlanMutation = useMutation({
    mutationFn: async ({ planId, billingCycle: cycle }: { planId: string; billingCycle: 'monthly' | 'yearly' }) => {
      const response = await subscriptionAPI.changePlan({ planId, billingCycle: cycle })
      return response.data
    },
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        toast.success('Redirecting to secure payment page...', { duration: 2000 })
        setTimeout(() => window.location.href = data.checkoutUrl, 1000)
      } else {
        toast.success(data?.message ?? 'Plan changed successfully!', { duration: 3000 })
        refetchSubscription()
        setIsUpgrading(false)
      }
    },
    onError: (error: unknown & { response?: { data?: { message?: string } } }) => {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to change plan')
      setIsUpgrading(false)
    }
  })

  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; amount?: number; reason?: string }) => {
      const response = await subscriptionAPI.processRefund({ paymentId, reason })
      return response.data
    },
    onSuccess: () => {
      toast.success('Refund processed successfully!', { duration: 3000 })
      setSelectedPaymentForRefund(null)
      queryClient.invalidateQueries({ queryKey: ['subscription', 'billing-history'] })
    },
    onError: (error: unknown & { response?: { data?: { message?: string } } }) => {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to process refund')
    }
  })

  const checkProfileStatus = async () => {
    try {
      setIsCheckingProfile(true)
      const response = await api.get('/api/payment-upgrade/profile-status')
      const status = response.data
      setProfileCompleted(status.profileCompleted)
      return status
    } catch (error) {
      console.error('Failed to check profile status:', error)
      setProfileCompleted(false)
      return { profileCompleted: false }
    } finally {
      setIsCheckingProfile(false)
    }
  }

  const handleCreditPurchase = async (packageId: string) => {
    if (!isAuthenticated) {
      const googleConnectionId = import.meta.env.VITE_KINDE_GOOGLE_CONNECTION_ID
      if (googleConnectionId) login({ connectionId: googleConnectionId })
      else login()
      return
    }
    setSelectedPlan(packageId)
    setIsUpgrading(true)
    try {
      const pkg = displayCreditTopups.find((p) => p.id === packageId)
      if (!pkg) throw new Error('Selected credit top-up not found')
      const response = await creditAPI.purchaseCredits({
        creditAmount: pkg.credits,
        paymentMethod: 'stripe',
        currency: pkg.currency,
        notes: `Purchase of ${pkg.name} package`
      })
      if (response.data.data?.checkoutUrl) {
        window.location.href = response.data.data.checkoutUrl
      } else {
        toast.success('Credits purchased successfully!')
        queryClient.invalidateQueries({ queryKey: ['credit'] })
        queryClient.invalidateQueries({ queryKey: ['subscription'] })
      }
    } catch (error: unknown & { response?: { data?: { message?: string } } }) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to purchase credits')
    } finally {
      setIsUpgrading(false)
      setSelectedPlan(null)
    }
  }

  const handlePlanPurchase = async (planId: string) => {
    if (!isAuthenticated) {
      const googleConnectionId = import.meta.env.VITE_KINDE_GOOGLE_CONNECTION_ID
      if (googleConnectionId) login({ connectionId: googleConnectionId })
      else login()
      return
    }
    setSelectedPlan(planId)
    setIsUpgrading(true)
    try {
      const selectedPlanData = applicationPlans.find((p) => p.id === planId)
      if (!selectedPlanData) throw new Error('Selected plan not found')
      const hasActiveSubscription = displaySubscription?.status === 'active' && displaySubscription?.plan !== 'free'
      if (hasActiveSubscription) {
        try {
          const response = await subscriptionAPI.changePlan({ planId, billingCycle: 'yearly' })
          if (response.data.data?.checkoutUrl) {
            window.location.href = response.data.data.checkoutUrl
          } else {
            toast.success('Plan changed successfully!')
            queryClient.invalidateQueries({ queryKey: ['subscription'] })
            queryClient.invalidateQueries({ queryKey: ['credit'] })
          }
        } catch {
          const response = await subscriptionAPI.createCheckout({
            planId,
            billingCycle: 'yearly',
            successUrl: `${window.location.origin}/payment-success?type=subscription&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/billing?payment=cancelled&type=subscription`
          })
          if (response.data.data?.checkoutUrl) {
            window.location.href = response.data.data.checkoutUrl
          } else {
            toast.success('Plan activated successfully!')
            queryClient.invalidateQueries({ queryKey: ['subscription'] })
            queryClient.invalidateQueries({ queryKey: ['credit'] })
          }
        }
      } else {
        const response = await subscriptionAPI.createCheckout({
          planId,
          billingCycle: 'yearly',
          successUrl: `${window.location.origin}/payment-success?type=subscription&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/billing?payment=cancelled&type=subscription`
        })
        if (response.data.data?.checkoutUrl) {
          window.location.href = response.data.data.checkoutUrl
        } else {
          toast.success('Plan activated successfully!')
          queryClient.invalidateQueries({ queryKey: ['subscription'] })
          queryClient.invalidateQueries({ queryKey: ['credit'] })
        }
      }
    } catch (error: unknown & { response?: { data?: { message?: string } } }) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to purchase plan')
    } finally {
      setIsUpgrading(false)
      setSelectedPlan(null)
    }
  }

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      toast.error('You are already on the free plan')
      return
    }
    const status = await checkProfileStatus()
    if (status?.profileCompleted) {
      setSelectedPlan(planId)
      setIsUpgrading(true)
      toast.loading(`Setting up your ${planId} plan upgrade...`, { duration: 2000 })
      try {
        await createCheckoutMutation.mutateAsync({ planId, billingCycle })
      } catch {
        setIsUpgrading(false)
        toast.error('Payment failed. Please try again.')
      }
    } else {
      navigate({ to: `/dashboard/billing/upgrade?plan=${planId}&cycle=${billingCycle}` })
    }
  }

  return {
    // UI state
    activeTab,
    setActiveTab,
    billingCycle,
    setBillingCycle,
    selectedPlan,
    isUpgrading,
    showCancelDialog,
    setShowCancelDialog,
    selectedPaymentForRefund,
    setSelectedPaymentForRefund,
    refundReason,
    setRefundReason,
    // Auth / mode
    isAuthenticated,
    mockMode,
    upgradeMode,
    needsOnboarding,
    navigate,
    // Data
    displaySubscription,
    displayBillingHistory,
    displayCreditTopups,
    applicationPlans,
    creditBalance,
    timelineData,
    // Loading
    subscriptionLoading,
    billingHistoryLoading,
    timelineLoading,
    // Mutations
    createCheckoutMutation,
    changePlanMutation,
    refundMutation,
    // Handlers
    handleCreditPurchase,
    handlePlanPurchase,
    handleUpgrade,
    checkProfileStatus,
    refetchSubscription,
    refetchCreditBalance
  }
}
