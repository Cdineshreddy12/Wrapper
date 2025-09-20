import React, { useEffect, useState } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface OnboardingGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

interface OnboardingStatus {
  needsOnboarding: boolean
  onboardingCompleted: boolean
  hasUser: boolean
  hasTenant: boolean
}

export function OnboardingGuard({ children, redirectTo = '/login' }: OnboardingGuardProps) {
  const { isAuthenticated, isLoading: kindeLoading, user } = useKindeAuth()
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const location = useLocation()

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!isAuthenticated || kindeLoading) {
        setIsChecking(false)
        return
      }

      try {
        console.log('🔍 OnboardingGuard - Checking onboarding status for user:', user?.email)
        console.log('🔍 OnboardingGuard - Current URL:', location.pathname + location.search)

        // Check if we just completed onboarding (URL parameter)
        const urlParams = new URLSearchParams(location.search)
        const justCompletedOnboarding = urlParams.get('onboarding') === 'complete'

        // If onboarding was just completed, force a delay to allow auth state to sync
        if (justCompletedOnboarding) {
          console.log('🎯 OnboardingGuard: Onboarding just completed, adding delay for auth sync')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

        // CRITICAL FIX: Check onboarding status first before other API calls
        const response = await api.get('/onboarding/status')
        console.log('🔍 OnboardingGuard - Raw onboarding status response:', response.data)

        const onboardingData = response.data?.data

        // If user needs onboarding, redirect immediately
        if (onboardingData?.needsOnboarding && !onboardingData?.isOnboarded && !justCompletedOnboarding) {
          console.log('🔄 OnboardingGuard - User needs onboarding, redirecting to /onboarding')
          setOnboardingStatus({
            needsOnboarding: true,
            onboardingCompleted: false,
            hasUser: !!onboardingData?.user,
            hasTenant: !!onboardingData?.organization
          })
          return
        }

        // Now check admin auth status for additional context
        let authData = null
        try {
          const authResponse = await api.get('/admin/auth-status')
          console.log('🔍 OnboardingGuard - Raw auth status response:', authResponse.data)
          authData = authResponse.data
        } catch (authError) {
          console.log('⚠️ OnboardingGuard - Could not get admin auth status, proceeding with onboarding data only')
        }

        const status: OnboardingStatus = {
          needsOnboarding: onboardingData?.needsOnboarding ?? !onboardingData?.isOnboarded,
          onboardingCompleted: onboardingData?.isOnboarded || false,
          hasUser: !!onboardingData?.user,
          hasTenant: !!onboardingData?.organization
        }

        // Check if this is an invited user (they should never need onboarding)
        const isInvitedUser = authData?.authStatus?.userType === 'INVITED_USER' ||
                              authData?.authStatus?.isInvitedUser === true ||
                              authData?.authStatus?.onboardingCompleted === true ||
                              onboardingData?.user?.userType === 'INVITED_USER'

        // INVITED USERS: Always skip onboarding
        if (isInvitedUser) {
          console.log('✅ OnboardingGuard - Invited user detected, skipping onboarding')
          status.needsOnboarding = false
          status.onboardingCompleted = true
        }

        // If we just completed onboarding, override status to allow access
        if (justCompletedOnboarding) {
          console.log('✅ OnboardingGuard - Just completed onboarding, allowing access')
          status.needsOnboarding = false
          status.onboardingCompleted = true
        }

        console.log('✅ OnboardingGuard - Final computed status:', status)
        setOnboardingStatus(status)
      } catch (error) {
        console.error('❌ OnboardingGuard - Error checking status:', error)
        
        // Check if we just completed onboarding via URL - allow access even on error
        const urlParams = new URLSearchParams(location.search)
        const justCompletedOnboarding = urlParams.get('onboarding') === 'complete'
        
        if (justCompletedOnboarding) {
          console.log('✅ OnboardingGuard - Just completed onboarding (via URL), allowing access despite error')
          setOnboardingStatus({
            needsOnboarding: false,
            onboardingCompleted: true,
            hasUser: true,
            hasTenant: true
          })
        } else {
          // If we can't check status, assume they need onboarding
          setOnboardingStatus({
            needsOnboarding: true,
            onboardingCompleted: false,
            hasUser: false,
            hasTenant: false
          })
        }
      } finally {
        setIsChecking(false)
      }
    }

    checkOnboardingStatus()
  }, [isAuthenticated, kindeLoading, user?.email, location.pathname, location.search])

  // Show loading while checking authentication and onboarding status
  if (kindeLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-sm text-gray-600">Checking access...</p>
        </div>
      </div>
    )
  }

  // If not authenticated AND Kinde is not loading, redirect to login
  // This prevents redirect loops while Kinde is still initializing
  if (!isAuthenticated && !kindeLoading) {
    console.log('🔄 OnboardingGuard - Not authenticated (Kinde loaded), redirecting to:', redirectTo)
    return <Navigate to={redirectTo} replace />
  }

  // If we have onboarding status and user needs onboarding, redirect to onboarding
  if (onboardingStatus?.needsOnboarding) {
    console.log('🔄 OnboardingGuard - User needs onboarding, redirecting to /onboarding')
    return <Navigate to="/onboarding" replace />
  }

  // If onboarding is completed, allow access to children
  if (onboardingStatus?.onboardingCompleted) {
    console.log('✅ OnboardingGuard - Onboarding completed, allowing access')
    return <>{children}</>
  }

  // Fallback: show loading if we don't have clear status yet
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
        <p className="mt-2 text-sm text-gray-600">Loading workspace...</p>
      </div>
    </div>
  )
} 