import { useEffect, useState } from 'react'
import { Navigate } from '@tanstack/react-router'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { useAuthStatus } from '@/hooks/useSharedQueries'
import { config } from '@/lib/config'
import { ZopkitRoundLoader } from '@/components/common/feedback/ZopkitRoundLoader'

/**
 * Determines the initial route when a user hits "/".
 *
 * Priority order:
 *  1. CRM cross-app auth flow (state param with app_code)
 *  2. Pending invitation → /invite/accept
 *  3. Needs onboarding   → /onboarding
 *  4. Authenticated       → /dashboard
 *  5. Unauthenticated     → /landing
 */
export function RootRedirect() {
  const { isAuthenticated, isLoading, getToken } = useKindeAuth()
  const { data: authData, isLoading: authLoading } = useAuthStatus()
  const [isChecking, setIsChecking] = useState(true)
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)

  useEffect(() => {
    async function checkStatus() {
      if (isLoading || authLoading) return

      if (isAuthenticated) {
        await handleCrmAuthFlow(getToken)
      }

      if (!isAuthenticated) {
        setIsChecking(false)
        return
      }

      const authStatus = authData?.authStatus
      setOnboardingStatus(authStatus ? { authStatus } : { hasUser: false, hasTenant: false })
      setIsChecking(false)
    }

    checkStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- authData intentionally omitted to prevent re-render loop
  }, [isAuthenticated, isLoading, authLoading])

  if (isLoading || authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <ZopkitRoundLoader size="lg" className="mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />
  }

  const pendingToken = typeof window !== 'undefined' ? localStorage.getItem('pendingInvitationToken') : null
  if (pendingToken) {
    return <Navigate to={`/invite/accept?token=${pendingToken}`} replace />
  }

  if (!onboardingStatus) {
    return <Navigate to="/landing" replace />
  }

  if (!onboardingStatus.authStatus) {
    return <Navigate to="/dashboard" replace />
  }

  const { authStatus } = onboardingStatus
  const needsOnboarding = authStatus.needsOnboarding ?? !authStatus.onboardingCompleted

  const isInvitedUser =
    authStatus.userType === 'INVITED_USER' ||
    authStatus.isInvitedUser === true ||
    authStatus.onboardingCompleted === true

  const hasPendingInvitation = localStorage.getItem('pendingInvitationToken')

  if (needsOnboarding && !isInvitedUser && !hasPendingInvitation) {
    return <Navigate to="/onboarding" replace />
  }

  if (isInvitedUser) {
    return <Navigate to="/dashboard" replace />
  }

  if (hasPendingInvitation) {
    return <Navigate to={`/invite/accept?token=${hasPendingInvitation}`} replace />
  }

  return <Navigate to="/dashboard" replace />
}

// ---------------------------------------------------------------------------
// CRM cross-app authentication flow
// Parses `?state=` param and, if valid, redirects the browser to the CRM app
// with an app-scoped token. Returns without redirecting on any failure.
// ---------------------------------------------------------------------------
async function handleCrmAuthFlow(getToken: () => Promise<string | undefined>) {
  const stateParam = new URLSearchParams(window.location.search).get('state')
  if (!stateParam) return

  try {
    const stateData = JSON.parse(stateParam)
    if (!stateData.app_code || !stateData.redirect_url) return

    const token = await getToken()
    if (!token) return

    const backendUrl = config.API_BASE_URL + '/api'

    const validateRes = await fetch(`${backendUrl}/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, app_code: stateData.app_code }),
    })
    if (!validateRes.ok) return

    const validation = await validateRes.json()
    if (!validation.success) return

    const appTokenRes = await fetch(`${backendUrl}/auth/generate-app-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, app_code: stateData.app_code }),
    })
    if (!appTokenRes.ok) return

    const appTokenData = await appTokenRes.json()
    const redirectUrl = new URL(stateData.redirect_url)
    redirectUrl.searchParams.set('token', appTokenData.token)
    redirectUrl.searchParams.set('expires_at', appTokenData.expiresAt)
    redirectUrl.searchParams.set('app_code', stateData.app_code)

    window.location.href = redirectUrl.toString()
  } catch (error) {
    console.error('Error processing CRM authentication:', error)
  }
}
