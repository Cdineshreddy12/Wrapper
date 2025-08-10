import { useState, useEffect, useCallback } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { api, subscriptionAPI } from '@/lib/api'
import toast from 'react-hot-toast'

export interface TrialStatus {
  hasTrial: boolean
  isExpired: boolean
  plan: string
  status: string
  trialStart?: Date
  trialEnd?: Date
  timeRemaining: number
  timeRemainingHuman: string
  daysRemaining: number
  hoursRemaining: number
  minutesRemaining: number
  expiredDuration?: string
  restrictionsActive: boolean
}

export interface TrialExpiredData {
  expired: boolean
  message: string
  trialEnd: string
  trialEndFormatted: string
  expiredDuration: string
  plan: string
  upgradeUrl: string
  blockAppLoading: boolean
  isTrialExpired: boolean
  isSubscriptionExpired: boolean
}

export function useTrialStatus() {
  const { isAuthenticated, user } = useKindeAuth()
  
  // Initialize with localStorage check to prevent flash
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [expiredData, setExpiredData] = useState<TrialExpiredData | null>(() => {
    // Check localStorage immediately on initialization
    const storedExpiry = localStorage.getItem('trialExpired')
    if (storedExpiry) {
      try {
        return JSON.parse(storedExpiry)
      } catch {
        localStorage.removeItem('trialExpired') // Clean up invalid data
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Immediate localStorage check for expiry state
  useEffect(() => {
    const storedExpiry = localStorage.getItem('trialExpired')
    if (storedExpiry && !expiredData) {
      try {
        const parsedExpiry = JSON.parse(storedExpiry)
        setExpiredData(parsedExpiry)
        console.log('🚫 useTrialStatus: Found stored trial expiry data:', parsedExpiry)
      } catch {
        localStorage.removeItem('trialExpired')
      }
    }
  }, [expiredData])

  const checkTrialStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      console.log('🔍 useTrialStatus: Checking subscription status...')
      
      // Primary check: Get current subscription status
      const subscriptionResponse = await subscriptionAPI.getCurrent()
      const subscription = subscriptionResponse.data?.data
      
      console.log('💳 useTrialStatus: Current subscription:', subscription)
      
      // If user has an active subscription that's not trial, clear any trial warnings
      if (subscription) {
        // FIRST: Check if trial/subscription is actually expired based on dates and status
        const now = new Date()
        const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null
        const currentPeriodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
        
        // Check if trial is expired (regardless of isTrialUser flag)
        const isTrialExpired = (
          subscription.plan === 'trial' && 
          subscription.status === 'past_due' &&
          trialEnd && 
          trialEnd < now
        )
        
        // Check if paid subscription is expired
        const isPaidSubscriptionExpired = (
          subscription.plan !== 'trial' &&
          subscription.plan !== 'free' &&
          subscription.status !== 'active' &&
          currentPeriodEnd &&
          currentPeriodEnd < now
        )
        
        // If either trial or paid subscription is expired, show expiry banner
        if (isTrialExpired || isPaidSubscriptionExpired) {
          console.log(`🚫 useTrialStatus: ${isTrialExpired ? 'Trial' : 'Subscription'} is expired`)
          
          const expiredDate = isTrialExpired ? trialEnd : currentPeriodEnd
          const timeSinceExpiry = now.getTime() - expiredDate.getTime()
          const daysSinceExpiry = Math.floor(timeSinceExpiry / (1000 * 60 * 60 * 24))
          const hoursSinceExpiry = Math.floor(timeSinceExpiry / (1000 * 60 * 60))
          
          let expiredDuration = ''
          if (daysSinceExpiry > 0) {
            expiredDuration = `${daysSinceExpiry} day${daysSinceExpiry > 1 ? 's' : ''} ago`
          } else if (hoursSinceExpiry > 0) {
            expiredDuration = `${hoursSinceExpiry} hour${hoursSinceExpiry > 1 ? 's' : ''} ago`
          } else {
            expiredDuration = 'recently'
          }
          
          setTrialStatus({
            hasTrial: true,
            isExpired: true,
            plan: subscription.plan,
            status: 'expired',
            trialEnd: expiredDate,
            timeRemaining: 0,
            timeRemainingHuman: 'Expired',
            daysRemaining: 0,
            hoursRemaining: 0,
            minutesRemaining: 0,
            expiredDuration,
            restrictionsActive: true
          })
          
          const message = isTrialExpired 
            ? `Your ${subscription.plan} trial has expired. Please upgrade to continue using the service.`
            : `Your ${subscription.plan} subscription has expired. Please renew to continue using the service.`
          
          const newExpiredData = {
            expired: true,
            message,
            trialEnd: expiredDate.toISOString(),
            trialEndFormatted: expiredDate.toLocaleDateString() + ' at ' + expiredDate.toLocaleTimeString(),
            expiredDuration,
            plan: subscription.plan,
            upgradeUrl: isTrialExpired ? '/billing?upgrade=true' : '/billing?renew=true',
            blockAppLoading: false,
            isTrialExpired,
            isSubscriptionExpired: isPaidSubscriptionExpired
          }
          
          setExpiredData(newExpiredData)
          // Store in localStorage for immediate access on next reload
          localStorage.setItem('trialExpired', JSON.stringify(newExpiredData))
          
          setIsLoading(false)
          return
        }
        
        // ONLY AFTER confirming no expiry, check if user should be treated as active/upgraded
        const isActivePaidUser = (
          // Currently active paid plan
          (subscription.status === 'active' && 
           subscription.stripeSubscriptionId &&
           subscription.plan !== 'trial' && 
           subscription.plan !== 'free') ||
          // Has upgraded before (upgrade tracking)
          subscription.hasEverUpgraded === true ||
          // Trial manually disabled
          subscription.trialToggledOff === true
        );
        
        if (isActivePaidUser) {
          console.log('✅ useTrialStatus: User has active/upgraded status, no trial restrictions')
          
          // Clear any stored trial expiry data
          localStorage.removeItem('trialExpired')
          
          setTrialStatus(null)
          setExpiredData(null)
          setIsLoading(false)
          return
        }
        
        // If subscription exists but is trial/free, check if trial is active
        if (subscription.plan === 'trial' && trialEnd && trialEnd >= now) {
          // Trial is still active
          console.log('✅ useTrialStatus: Trial is still active')
          
          const timeRemaining = Math.max(0, trialEnd.getTime() - now.getTime())
          const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24))
          const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
          
          setTrialStatus({
            hasTrial: true,
            isExpired: false,
            plan: subscription.plan,
            status: 'active',
            trialEnd: trialEnd,
            timeRemaining,
            timeRemainingHuman: `${daysRemaining} days`,
            daysRemaining,
            hoursRemaining,
            minutesRemaining,
            restrictionsActive: false
          })
          
          setExpiredData(null)
          localStorage.removeItem('trialExpired')
        }
      } else {
        // No subscription found - this might be a new user
        console.log('⚠️ useTrialStatus: No subscription found')
        setTrialStatus(null)
        setExpiredData(null)
      }
      
    } catch (error: any) {
      console.error('❌ useTrialStatus: Error checking status:', error)
      
      // Only show trial expiry if we get a specific trial expired error
      if (error.response?.status === 200 && (error.response.data as any)?.subscriptionExpired && error.response?.data?.code === 'TRIAL_EXPIRED') {
        const errorData = error.response.data
        console.log('🚫 useTrialStatus: Received trial expired error from API')
        
        const newExpiredData = {
          expired: true,
          message: errorData.message || 'Your trial has expired',
          trialEnd: errorData.data?.trialEnd || new Date().toISOString(),
          trialEndFormatted: errorData.data?.trialEndFormatted || 'Recently',
          expiredDuration: errorData.data?.expiredDuration || 'recently',
          plan: errorData.data?.plan || 'trial',
          upgradeUrl: '/billing?upgrade=true',
          blockAppLoading: false,
          isTrialExpired: false,
          isSubscriptionExpired: false
        }
        
        setExpiredData(newExpiredData)
        // Store in localStorage for immediate access
        localStorage.setItem('trialExpired', JSON.stringify(newExpiredData))
      } else {
        setError(error.message || 'Failed to check status')
        setTrialStatus(null)
        setExpiredData(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  // Check status on mount and auth changes
  useEffect(() => {
    checkTrialStatus()
  }, [checkTrialStatus])

  // Listen for upgrade events to refresh status
  useEffect(() => {
    const handleUpgradeSuccess = () => {
      console.log('🎉 useTrialStatus: Upgrade event received, refreshing status')
      localStorage.removeItem('trialExpired')
      setExpiredData(null)
      setTrialStatus(null)
      
      // Recheck status after upgrade
      setTimeout(() => {
        checkTrialStatus()
      }, 1000)
    }

    window.addEventListener('paymentSuccess', handleUpgradeSuccess)
    window.addEventListener('subscriptionUpgraded', handleUpgradeSuccess)

    return () => {
      window.removeEventListener('paymentSuccess', handleUpgradeSuccess)
      window.removeEventListener('subscriptionUpgraded', handleUpgradeSuccess)
    }
  }, [checkTrialStatus])

  const showTrialExpiredToast = useCallback(() => {
    if (expiredData) {
      // Rate limit toast to prevent spam
      const lastToastTime = localStorage.getItem('lastTrialExpiredToast')
      const now = Date.now()
      
      if (!lastToastTime || (now - parseInt(lastToastTime)) > 30000) { // 30 second cooldown
        localStorage.setItem('lastTrialExpiredToast', now.toString())
        
        toast.error(
          `🔒 ${expiredData.message}`, 
          {
            duration: 8000,
            position: 'top-center',
            style: {
              background: '#dc2626',
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
    if (!trialStatus || !trialStatus.hasTrial) return 'info'
    if (trialStatus.isExpired) return 'error'
    if (trialStatus.daysRemaining <= 3) return 'error'
    if (trialStatus.daysRemaining <= 7) return 'warning'
    return 'success'
  }

  const getDisplayMessage = (): string => {
    if (!trialStatus || !trialStatus.hasTrial) return 'No trial information'
    if (trialStatus.isExpired) return `Trial expired ${trialStatus.expiredDuration || 'recently'}`
    if (trialStatus.daysRemaining === 0) return `Trial expires in ${trialStatus.timeRemainingHuman}`
    return `${trialStatus.daysRemaining} days remaining`
  }

  // Enhanced derived state
  const isExpired = expiredData?.expired || trialStatus?.isExpired || false
  const daysRemaining = trialStatus?.daysRemaining || 0
  const shouldBlockApp = expiredData?.blockAppLoading || false

  return {
    trialStatus,
    expiredData,
    isLoading,
    error,
    isExpired,
    daysRemaining,
    shouldBlockApp,
    showTrialExpiredToast,
    getStatusSeverity,
    getDisplayMessage,
    checkTrialStatus, // Export for manual refresh
  }
} 