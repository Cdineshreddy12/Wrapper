import { useState, useEffect, useCallback } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { api, subscriptionAPI, creditAPI } from '@/lib/api'
import toast from 'react-hot-toast'

export interface CreditStatus {
  hasCredits: boolean
  isLowBalance: boolean
  plan: string
  status: string
  creditBalance: number
  reservedCredits: number
  availableCredits: number
  totalCredits: number
  lastPurchase?: Date
  creditExpiry?: Date
  lowBalanceThreshold: number
  criticalBalanceThreshold: number
  restrictionsActive: boolean
  usageThisPeriod: number
  periodLimit: number
  periodType: string
  alerts: CreditAlert[]
}

export interface CreditAlert {
  id: string
  type: 'low_balance' | 'critical_balance' | 'expiry_warning' | 'usage_limit'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  threshold: number
  currentValue: number
  actionRequired?: string
}

export interface CreditExpiredData {
  expired: boolean
  message: string
  creditBalance: number
  lowBalanceThreshold: number
  purchaseUrl: string
  blockAppLoading: boolean
  isLowBalance: boolean
  isCriticalBalance: boolean
  alerts: CreditAlert[]
}

export function useCreditStatus() {
  const { isAuthenticated, user } = useKindeAuth()

  // Initialize with localStorage check to prevent flash
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null)
  const [expiredData, setExpiredData] = useState<CreditExpiredData | null>(() => {
    // Check localStorage immediately on initialization
    const storedExpiry = localStorage.getItem('creditExpired')
    if (storedExpiry) {
      try {
        return JSON.parse(storedExpiry)
      } catch {
        localStorage.removeItem('creditExpired') // Clean up invalid data
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  // Immediate localStorage check for expiry state
  useEffect(() => {
    const storedExpiry = localStorage.getItem('creditExpired')
    if (storedExpiry && !expiredData) {
      try {
        const parsedExpiry = JSON.parse(storedExpiry)
        setExpiredData(parsedExpiry)
        console.log('🚫 useCreditStatus: Found stored credit expiry data:', parsedExpiry)
      } catch {
        localStorage.removeItem('creditExpired')
      }
    }
  }, [expiredData])

  const checkCreditStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log('⚠️ useCreditStatus: User not authenticated, skipping credit check')
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      console.log('🔍 useCreditStatus: Checking credit status...')

      // CRITICAL FIX: Check if user needs onboarding first
      try {
        console.log('🔍 useCreditStatus: Checking onboarding status first...')
        const onboardingResponse = await api.fetch<any>('/onboarding/status')
        const onboardingData = onboardingResponse.data?.data

        // Check URL parameters for onboarding completion
        const urlParams = new URLSearchParams(window.location.search)
        const onboardingComplete = urlParams.get('onboarding') === 'complete'

        if (onboardingData?.needsOnboarding && !onboardingData?.isOnboarded && !onboardingComplete) {
          console.log('🚫 useCreditStatus: User needs onboarding, skipping credit check')
          setCreditStatus({
            hasCredits: false,
            isLowBalance: false,
            plan: 'credit_based',
            status: 'onboarding_required',
            creditBalance: 0,
            reservedCredits: 0,
            availableCredits: 0,
            totalCredits: 0,
            lowBalanceThreshold: 100,
            criticalBalanceThreshold: 10,
            restrictionsActive: false,
            usageThisPeriod: 0,
            periodLimit: 0,
            periodType: 'month',
            alerts: []
          })
          setIsLoading(false)
          return
        }

        // If onboarding was just completed, add a small delay for auth state to sync
        if (onboardingComplete) {
          console.log('🎯 useCreditStatus: Onboarding just completed, adding delay for auth sync')
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
      } catch (onboardingError) {
        console.log('⚠️ useCreditStatus: Could not check onboarding status, proceeding with credit check')
      }

      // Primary check: Get current credit balance
      console.log('📡 useCreditStatus: Calling credit API...')
      const creditResponse = await creditAPI.getCurrentBalance()
      console.log('📦 useCreditStatus: Received credit response')
      const creditData = creditResponse.data?.data

      if (creditData) {
        console.log('💰 useCreditStatus: Credit balance:', {
          available: creditData.availableCredits,
          total: creditData.totalCredits,
          reserved: creditData.reservedCredits,
          status: creditData.status
        })
      } else {
        console.log('⚠️ useCreditStatus: No credit data received')
      }

      if (creditData) {
        const availableCredits = parseFloat(creditData.availableCredits || 0)
        const totalCredits = parseFloat(creditData.totalCredits || 0)
        const reservedCredits = parseFloat(creditData.reservedCredits || 0)
        const lowBalanceThreshold = parseFloat(creditData.lowBalanceThreshold || 100)
        const criticalBalanceThreshold = parseFloat(creditData.criticalBalanceThreshold || 10)

        // Check if credits are low or critical
        const isLowBalance = availableCredits <= lowBalanceThreshold && availableCredits > criticalBalanceThreshold
        const isCriticalBalance = availableCredits <= criticalBalanceThreshold
        const hasCredits = availableCredits > 0

        // Generate alerts
        const alerts: CreditAlert[] = []

        if (isCriticalBalance) {
          alerts.push({
            id: 'critical_balance',
            type: 'critical_balance',
            severity: 'critical',
            title: 'Critical Credit Balance',
            message: `You have only ${availableCredits} credits remaining. Purchase more credits to continue using the service.`,
            threshold: criticalBalanceThreshold,
            currentValue: availableCredits,
            actionRequired: 'purchase_credits'
          })
        } else if (isLowBalance) {
          alerts.push({
            id: 'low_balance',
            type: 'low_balance',
            severity: 'warning',
            title: 'Low Credit Balance',
            message: `You have ${availableCredits} credits remaining. Consider purchasing more credits.`,
            threshold: lowBalanceThreshold,
            currentValue: availableCredits,
            actionRequired: 'purchase_credits'
          })
        }

        // Check for expiry warnings
        if (creditData.creditExpiry) {
          const expiryDate = new Date(creditData.creditExpiry)
          const now = new Date()
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
            alerts.push({
              id: 'expiry_warning',
              type: 'expiry_warning',
              severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
              title: 'Credits Expiring Soon',
              message: `${availableCredits} credits will expire in ${daysUntilExpiry} days.`,
              threshold: daysUntilExpiry,
              currentValue: availableCredits,
              actionRequired: 'purchase_credits'
            })
          }
        }

        // Set credit status
        setCreditStatus({
          hasCredits,
          isLowBalance,
          plan: creditData.plan || 'credit_based',
          status: hasCredits ? 'active' : 'insufficient_credits',
          creditBalance: totalCredits,
          reservedCredits,
          availableCredits,
          totalCredits,
          lastPurchase: creditData.lastPurchase ? new Date(creditData.lastPurchase) : undefined,
          creditExpiry: creditData.creditExpiry ? new Date(creditData.creditExpiry) : undefined,
          lowBalanceThreshold,
          criticalBalanceThreshold,
          restrictionsActive: isCriticalBalance,
          usageThisPeriod: parseFloat(creditData.usageThisPeriod || 0),
          periodLimit: parseFloat(creditData.periodLimit || 0),
          periodType: creditData.periodType || 'month',
          alerts
        })

        // Reset retry count on successful credit check
        setRetryCount(0)

        // Handle critical balance scenarios
        if (isCriticalBalance) {
          console.log('🚫 useCreditStatus: Critical credit balance')

          const newExpiredData: CreditExpiredData = {
            expired: true,
            message: `You have only ${availableCredits} credits remaining. Purchase more credits to continue using the service.`,
            creditBalance: availableCredits,
            lowBalanceThreshold,
            purchaseUrl: '/billing?purchase=true',
            blockAppLoading: false,
            isLowBalance,
            isCriticalBalance,
            alerts
          }

          setExpiredData(newExpiredData)
          // Store in localStorage for immediate access on next reload
          localStorage.setItem('creditExpired', JSON.stringify(newExpiredData))

          setIsLoading(false)
          return
        }

        // Clear any stored credit expiry data if balance is sufficient
        if (!isLowBalance && !isCriticalBalance) {
          localStorage.removeItem('creditExpired')
          setExpiredData(null)
        }

      } else {
        // No credit data found - this might be a new user
        console.log('⚠️ useCreditStatus: No credit data found')
        setCreditStatus({
          hasCredits: false,
          isLowBalance: false,
          plan: 'credit_based',
          status: 'no_credits',
          creditBalance: 0,
          reservedCredits: 0,
          availableCredits: 0,
          totalCredits: 0,
          lowBalanceThreshold: 100,
          criticalBalanceThreshold: 10,
          restrictionsActive: true,
          usageThisPeriod: 0,
          periodLimit: 0,
          periodType: 'month',
          alerts: []
        })
        setExpiredData(null)
      }

    } catch (error: any) {
      console.error('❌ useCreditStatus: Error checking status:', error)
      console.error('🔍 useCreditStatus: Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      })

      // Handle different types of errors
      if (error.response?.status === 401) {
        console.log('🔐 useCreditStatus: Authentication error - clearing stored data')
        setError('Authentication required')
        setCreditStatus(null)
        setExpiredData(null)
        // Clear any stored credit data on auth errors
        localStorage.removeItem('creditExpired')
      } else if (error.response?.status === 404) {
        console.log('📭 useCreditStatus: No credit data found (404) - this is normal for new users')
        const errorMessage = error.response?.data?.message || ''

        // Check if this is the "User is not associated with any organization" error
        if (errorMessage.includes('not associated with any organization') ||
            errorMessage.includes('Organization Required') ||
            error.response?.data?.requiresOnboarding) {

          console.log('🏢 useCreditStatus: User needs to complete organization setup, setting onboarding status')

          // Implement retry logic for organization setup
          if (retryCount < maxRetries) {
            console.log(`🔄 useCreditStatus: Retrying credit check in 2 seconds (attempt ${retryCount + 1}/${maxRetries})`)
            setRetryCount(prev => prev + 1)

            setTimeout(() => {
              console.log('🔄 useCreditStatus: Retrying credit check after organization setup delay')
              checkCreditStatus()
            }, 2000) // Wait 2 seconds for potential onboarding completion

            return // Don't set credit status yet, wait for retry
          }

          // Max retries reached, show organization setup message
          setCreditStatus({
            hasCredits: false,
            isLowBalance: false,
            plan: 'credit_based',
            status: 'organization_required',
            creditBalance: 0,
            reservedCredits: 0,
            availableCredits: 0,
            totalCredits: 0,
            lowBalanceThreshold: 100,
            criticalBalanceThreshold: 10,
            restrictionsActive: false, // Don't block app for onboarding users
            usageThisPeriod: 0,
            periodLimit: 0,
            periodType: 'month',
            alerts: [{
              id: 'organization_required',
              type: 'critical_balance',
              severity: 'info',
              title: 'Complete Organization Setup',
              message: 'Please complete your organization setup to access credit features.',
              threshold: 0,
              currentValue: 0,
              actionRequired: 'complete_onboarding'
            }]
          })
        } else {
          // Regular 404 for new users
          setCreditStatus({
            hasCredits: false,
            isLowBalance: false,
            plan: 'credit_based',
            status: 'no_credits',
            creditBalance: 0,
            reservedCredits: 0,
            availableCredits: 0,
            totalCredits: 0,
            lowBalanceThreshold: 100,
            criticalBalanceThreshold: 10,
            restrictionsActive: false, // Don't block app for new users
            usageThisPeriod: 0,
            periodLimit: 0,
            periodType: 'month',
            alerts: []
          })
        }
        setExpiredData(null)
      } else if (error.response?.status === 200 && (error.response.data as any)?.creditExpired && error.response?.data?.code === 'CREDIT_EXPIRED') {
        const errorData = error.response.data
        console.log('🚫 useCreditStatus: Received credit expired error from API')

        const newExpiredData: CreditExpiredData = {
          expired: true,
          message: errorData.message || 'Your credits are insufficient',
          creditBalance: errorData.data?.creditBalance || 0,
          lowBalanceThreshold: errorData.data?.lowBalanceThreshold || 100,
          purchaseUrl: '/billing?purchase=true',
          blockAppLoading: false,
          isLowBalance: errorData.data?.isLowBalance || false,
          isCriticalBalance: errorData.data?.isCriticalBalance || false,
          alerts: errorData.data?.alerts || []
        }

        setExpiredData(newExpiredData)
        // Store in localStorage for immediate access
        localStorage.setItem('creditExpired', JSON.stringify(newExpiredData))
      } else {
        console.log('⚠️ useCreditStatus: Unexpected error - treating as no credits')
        setError(error.message || 'Failed to check credit status')
        // For unexpected errors, assume no credits rather than blocking the app
        setCreditStatus(null)
        setExpiredData(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  // Check status on mount and auth changes
  useEffect(() => {
    checkCreditStatus()
  }, [checkCreditStatus])

  // Listen for credit purchase events to refresh status
  useEffect(() => {
    const handleCreditPurchaseSuccess = () => {
      console.log('🎉 useCreditStatus: Credit purchase event received, refreshing status')
      localStorage.removeItem('creditExpired')
      setExpiredData(null)
      setCreditStatus(null)

      // Recheck status after credit purchase
      setTimeout(() => {
        checkCreditStatus()
      }, 1000)
    }

    window.addEventListener('creditPurchaseSuccess', handleCreditPurchaseSuccess)
    window.addEventListener('creditPurchased', handleCreditPurchaseSuccess)

    return () => {
      window.removeEventListener('creditPurchaseSuccess', handleCreditPurchaseSuccess)
      window.removeEventListener('creditPurchased', handleCreditPurchaseSuccess)
    }
  }, [checkCreditStatus])

  const showCreditAlertToast = useCallback(() => {
    if (expiredData) {
      // Rate limit toast to prevent spam
      const lastToastTime = localStorage.getItem('lastCreditAlertToast')
      const now = Date.now()

      if (!lastToastTime || (now - parseInt(lastToastTime)) > 30000) { // 30 second cooldown
        localStorage.setItem('lastCreditAlertToast', now.toString())

        const severity = expiredData.isCriticalBalance ? 'error' : 'warning'
        const icon = expiredData.isCriticalBalance ? '⚠️' : '💰'

        toast.error(
          `${icon} ${expiredData.message}`,
          {
            duration: 8000,
            position: 'top-center',
            style: {
              background: expiredData.isCriticalBalance ? '#dc2626' : '#f59e0b',
              color: 'white',
              fontWeight: 'bold'
            },
            icon: '⏰'
          }
        )
      }
    }
  }, [expiredData])

  const getStatusSeverity = (): 'success' | 'warning' | 'error' | 'info' => {
    if (!creditStatus) return 'info'
    if (creditStatus.isLowBalance) return 'warning'
    if (creditStatus.restrictionsActive) return 'error'
    if (creditStatus.hasCredits) return 'success'
    return 'info'
  }

  const getDisplayMessage = (): string => {
    if (!creditStatus) return 'Loading credit status...'
    if (!creditStatus.hasCredits) return 'No credits available'
    if (creditStatus.restrictionsActive) return `Critical balance: ${creditStatus.availableCredits} credits`
    if (creditStatus.isLowBalance) return `Low balance: ${creditStatus.availableCredits} credits`
    return `${creditStatus.availableCredits} credits available`
  }

  const getCreditUsagePercentage = (): number => {
    if (!creditStatus || creditStatus.periodLimit === 0) return 0
    return (creditStatus.usageThisPeriod / creditStatus.periodLimit) * 100
  }

  // Enhanced derived state
  const isExpired = expiredData?.expired || creditStatus?.restrictionsActive || false
  const availableCredits = creditStatus?.availableCredits || 0
  const shouldBlockApp = expiredData?.blockAppLoading || false
  const hasLowBalance = creditStatus?.isLowBalance || false
  const hasCriticalBalance = creditStatus?.restrictionsActive || false

  return {
    creditStatus,
    expiredData,
    isLoading,
    error,
    isExpired,
    availableCredits,
    shouldBlockApp,
    hasLowBalance,
    hasCriticalBalance,
    showCreditAlertToast,
    getStatusSeverity,
    getDisplayMessage,
    getCreditUsagePercentage,
    checkCreditStatus, // Export for manual refresh
  }
}

// Legacy export for backward compatibility
// This function converts credit status to trial status format
export function useTrialStatus() {
  const creditStatus = useCreditStatus()

  // Convert credit status to trial status format
  const trialStatus = creditStatus.creditStatus ? {
    hasTrial: creditStatus.creditStatus.hasCredits,
    isExpired: creditStatus.creditStatus.restrictionsActive,
    plan: creditStatus.creditStatus.plan,
    status: creditStatus.creditStatus.status,
    trialStart: creditStatus.creditStatus.lastPurchase,
    trialEnd: creditStatus.creditStatus.creditExpiry,
    timeRemaining: creditStatus.creditStatus.creditExpiry ?
      Math.max(0, creditStatus.creditStatus.creditExpiry.getTime() - Date.now()) : 0,
    timeRemainingHuman: creditStatus.getDisplayMessage(),
    daysRemaining: creditStatus.creditStatus.creditExpiry ?
      Math.max(0, Math.floor((creditStatus.creditStatus.creditExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
    hoursRemaining: creditStatus.creditStatus.creditExpiry ?
      Math.max(0, Math.floor((creditStatus.creditStatus.creditExpiry.getTime() - Date.now()) / (1000 * 60 * 60))) : 0,
    minutesRemaining: creditStatus.creditStatus.creditExpiry ?
      Math.max(0, Math.floor((creditStatus.creditStatus.creditExpiry.getTime() - Date.now()) / (1000 * 60))) : 0,
    expiredDuration: creditStatus.creditStatus.restrictionsActive ? 'insufficient credits' : undefined,
    restrictionsActive: creditStatus.creditStatus.restrictionsActive
  } : null

  const trialExpiredData = creditStatus.expiredData ? {
    expired: creditStatus.expiredData.expired,
    message: creditStatus.expiredData.message,
    trialEnd: creditStatus.expiredData.purchaseUrl, // Using purchase URL as trial end equivalent
    trialEndFormatted: new Date().toLocaleDateString(),
    expiredDuration: 'insufficient credits',
    plan: 'credit_based',
    upgradeUrl: creditStatus.expiredData.purchaseUrl,
    blockAppLoading: creditStatus.expiredData.blockAppLoading,
    isTrialExpired: creditStatus.expiredData.isCriticalBalance,
    isSubscriptionExpired: false
  } : null

  return {
    ...creditStatus,
    trialStatus,
    expiredData: trialExpiredData,
    showTrialExpiredToast: creditStatus.showCreditAlertToast,
    getStatusSeverity: creditStatus.getStatusSeverity,
    getDisplayMessage: creditStatus.getDisplayMessage,
    daysRemaining: trialStatus?.daysRemaining || 0,
  }
} 