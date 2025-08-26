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
        
        const response = await api.get('/admin/auth-status')
        console.log('🔍 OnboardingGuard - Raw auth status response:', response.data)
        
        const status: OnboardingStatus = {
          needsOnboarding: response.data.authStatus?.needsOnboarding ?? !response.data.authStatus?.onboardingCompleted,
          onboardingCompleted: response.data.authStatus?.onboardingCompleted || false,
          hasUser: !!response.data.authStatus?.userId,
          hasTenant: !!response.data.authStatus?.tenantId
        }

        // Check if this is an invited user (they should never need onboarding)
        const isInvitedUser = response.data.authStatus?.userType === 'INVITED_USER' || 
                              response.data.authStatus?.isInvitedUser === true ||
                              response.data.authStatus?.onboardingCompleted === true

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

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('🔄 OnboardingGuard - Not authenticated, redirecting to:', redirectTo)
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