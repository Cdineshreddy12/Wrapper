import React, { useMemo, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Toaster as Sonner } from 'sonner'

import api from '@/lib/api'

// Kinde Authentication
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { KindeProvider } from '@/components/auth/KindeProvider'
import SilentAuthGuard from '@/components/auth/SilentAuthGuard'

// User Context and Permission Refresh
import { UserContextProvider } from './contexts/UserContextProvider'
import { PermissionRefreshNotification } from './components/PermissionRefreshNotification'
import { ThemeProvider } from './components/theme/ThemeProvider'

// Trial Management Components
import { TrialExpiryBanner, TrialBannerSpacer } from './components/trial/TrialExpiryBanner'

// Layout Components
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { OnboardingGuard } from '@/components/auth/OnboardingGuard'

// Pages
import Landing from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { AuthCallback } from '@/pages/AuthCallback'
import { InviteAccept } from '@/pages/InviteAccept'
import { Dashboard } from '@/pages/Dashboard'
import { Analytics } from '@/pages/Analytics'
import { UserManagementDashboard } from '@/components/users/UserManagementDashboard'
import { Billing } from '@/pages/Billing'
import { Usage } from '@/pages/Usage'
import { Permissions } from '@/pages/Permissions'
import UserApplicationAccessPage from '@/pages/UserApplicationAccess'
import UserApplicationManagement from '@/pages/UserApplicationManagement'
import SuiteDashboard from '@/pages/SuiteDashboard'
import AdminDashboardPage from '@/pages/AdminDashboardPage'
import OnboardingPage from '@/pages/Onboarding'
import SimpleOnboarding from '@/pages/SimpleOnboarding'
import { OverviewPage } from './pages/OverviewPage'


// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
)

// Auth initializer component
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Token getter is now handled by KindeProvider.tsx to avoid conflicts
  // The enhanced api.ts will automatically get tokens from the configured getter

  return <>{children}</>;
};

function App() {
  return (
    <>
      <ThemeProvider defaultTheme="system" storageKey="zopkit-theme">
        <KindeProvider>
          <AuthInitializer>
            <Router>
              <SilentAuthGuard>
                <UserContextProvider>
                  <AppContent />
                </UserContextProvider>
              </SilentAuthGuard>
            </Router>
          </AuthInitializer>
        </KindeProvider>
      </ThemeProvider>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#DC2626',
            },
          },
        }}
      />
      <Sonner />
    </>
  )
}

// Main App content component
function AppContent() {
  const { isAuthenticated, isLoading } = useKindeAuth()

  // Memoize auth state to prevent unnecessary re-renders
  const authState = useMemo(() => ({
    isAuthenticated: !!isAuthenticated,
    isLoading: !!isLoading
  }), [isAuthenticated, isLoading])

  // Debug logging for authentication state changes
  useEffect(() => {
    console.log('🔍 App.tsx - Auth State Change:', {
      isAuthenticated: authState.isAuthenticated,
      isLoading: authState.isLoading,
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname
    })
  }, [authState.isAuthenticated, authState.isLoading])

  // Show loading spinner while authentication is being determined
  if (authState.isLoading) {
    console.log('🔄 App.tsx - Showing loading screen')
    return <LoadingScreen />
  }

  console.log('🚀 App.tsx - Rendering routes with auth state:', authState)

  return (
    <div className="App">
      {/* Trial Expiry Banner Only */}
      <TrialExpiryBanner />
      <TrialBannerSpacer />

      {/* Permission refresh notification - only show when authenticated */}
      {authState.isAuthenticated && <PermissionRefreshNotification />}

      <Routes>
        {/* Public Routes */}
        <Route
          path="/landing"
          element={
            authState.isAuthenticated ? <Navigate to="/" replace /> : <Landing />
          }
        />

        {/* Root redirect based on auth status */}
        <Route
          path="/"
          element={<RootRedirect />}
        />

       

        <Route
          path="/onboarding"
          element={<SimpleOnboarding />}
        // element={<OnboardingPage />}
        // element={<FlowSelectorMultiStepExample />}
        />

        {/* <Route
          path="/form-demo"
          element={<FormComponentsDemo />}
        />

        <Route
          path="/context-demo"
          element={<ContextDemo />}
        />

        <Route
          path="/perfect-form"
          element={<PerfectFormDemo />}
        />

        <Route
          path="/form-layout-test"
          element={<FormLayoutTest />}
        />

        <Route
          path="/form-error-test"
          element={<FormErrorTest />}
        /> */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/auth/callback"
          element={<AuthCallback />}
        />

        {/* Invitation Accept Route - Public (handles auth internally) */}
        <Route
          path="/invite/accept"
          element={<InviteAccept />}
        />

        {/* Business Suite Dashboard Route */}
        <Route
          path="/suite"
          element={
            <ProtectedRoute>
              <SuiteDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected dashboard routes with onboarding guard */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <DashboardLayout />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="users" element={<UserManagementDashboard />} />
          <Route path="user-apps" element={<UserApplicationAccessPage />} />
          <Route path="user-application-management" element={<UserApplicationManagement />} />
          <Route path="billing" element={<Billing />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="usage" element={<Usage />} />
          <Route path="permissions" element={<Permissions />} />
        </Route>

        {/* Standalone Admin Dashboard Route */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Organization-specific routes with onboarding guard */}
        <Route
          path="/org/:orgCode"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <DashboardLayout />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="users" element={<UserManagementDashboard />} />
          <Route path="user-apps" element={<UserApplicationAccessPage />} />
          <Route path="user-application-management" element={<UserApplicationManagement />} />
          <Route path="billing" element={<Billing />} />
          <Route path="usage" element={<Usage />} />
          <Route path="permissions" element={<Permissions />} />
        </Route>

        {/* Catch all - redirect to landing if not authenticated */}
        <Route
          path="*"
          element={
            authState.isLoading ? (
              <LoadingScreen />
            ) : (
              <Navigate to={authState.isAuthenticated ? "/dashboard" : "/landing"} replace />
            )
          }
        />
      </Routes>
    </div>
  )
}





// Root redirect component to handle initial route decisions
function RootRedirect() {
  const { isAuthenticated, isLoading } = useKindeAuth()
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    async function checkStatus() {
      if (isLoading) {
        return // Wait for Kinde to finish loading
      }

      // Check if this is a CRM authentication flow (from Kinde callback)
      const urlParams = new URLSearchParams(window.location.search);
      const stateParam = urlParams.get('state');

      if (stateParam && isAuthenticated) {
        try {
          const stateData = JSON.parse(stateParam);
          console.log('🔍 RootRedirect: Detected CRM authentication flow:', stateData);

          if (stateData.app_code && stateData.redirect_url) {
            console.log('🔄 RootRedirect: Processing CRM authentication flow');

            // Get the token from Kinde
            const { getToken } = useKindeAuth();
            const token = await getToken();

            if (token) {
              // Generate app-specific token using backend
              const backendUrl = 'https://wrapper.zopkit.com';
              const response = await fetch(`${backendUrl}/auth/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, app_code: stateData.app_code }),
              });

              if (response.ok) {
                const validation = await response.json();

                if (validation.success) {
                  // Generate app-specific token
                  const appTokenResponse = await fetch(`${backendUrl}/auth/generate-app-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, app_code: stateData.app_code }),
                  });

                  if (appTokenResponse.ok) {
                    const appTokenData = await appTokenResponse.json();

                    // Redirect to CRM with token
                    const redirectUrl = new URL(stateData.redirect_url);
                    redirectUrl.searchParams.set('token', appTokenData.token);
                    redirectUrl.searchParams.set('expires_at', appTokenData.expiresAt);
                    redirectUrl.searchParams.set('app_code', stateData.app_code);

                    console.log('🚀 RootRedirect: Redirecting to CRM:', redirectUrl.toString());
                    window.location.href = redirectUrl.toString();
                    return;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ RootRedirect: Error processing CRM authentication:', error);
        }
      }

      if (!isAuthenticated) {
        console.log('🔄 RootRedirect: Not authenticated, redirecting to landing')
        setIsChecking(false)
        return
      }

      try {
        console.log('🔍 RootRedirect: Checking onboarding status for authenticated user')
        const response = await api.get('/admin/auth-status')
        console.log('✅ RootRedirect: Auth status received:', response.data)
        setOnboardingStatus(response.data)
      } catch (error: any) {
        console.error('❌ RootRedirect: Error checking auth status:', error)
        // If error checking status, redirect to landing
        setOnboardingStatus({ hasUser: false, hasTenant: false })
      } finally {
        setIsChecking(false)
      }
    }

    checkStatus()
  }, [isAuthenticated, isLoading])

  // Show loading while checking
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - go to landing
  if (!isAuthenticated) {
    console.log('🔄 RootRedirect: Not authenticated, redirecting to landing')
    return <Navigate to="/landing" replace />
  }

  // Authenticated but no onboarding status yet
  if (!onboardingStatus) {
    console.log('🔄 RootRedirect: No onboarding status, redirecting to landing')
    return <Navigate to="/landing" replace />
  }

  // Check if user needs onboarding based on the actual backend response structure
  // INVITED USERS: Always skip onboarding (they should have onboardingCompleted=true)
  const needsOnboarding = onboardingStatus.authStatus?.needsOnboarding ?? !onboardingStatus.authStatus?.onboardingCompleted

  // Check if this is an invited user (they should never need onboarding)
  const isInvitedUser = onboardingStatus.authStatus?.userType === 'INVITED_USER' ||
    onboardingStatus.authStatus?.isInvitedUser === true ||
    onboardingStatus.authStatus?.onboardingCompleted === true

  // DEBUG LOGGING: Log the decision-making process
  console.log('🔍 RootRedirect: Onboarding decision analysis:', {
    needsOnboarding,
    isInvitedUser,
    hasPendingInvitation: !!localStorage.getItem('pendingInvitationToken'),
    authStatus: {
      needsOnboarding: onboardingStatus.authStatus?.needsOnboarding,
      onboardingCompleted: onboardingStatus.authStatus?.onboardingCompleted,
      userType: onboardingStatus.authStatus?.userType,
      isInvitedUser: onboardingStatus.authStatus?.isInvitedUser
    }
  })

  // Check if there's a pending invitation (user should complete invitation flow first)
  const hasPendingInvitation = localStorage.getItem('pendingInvitationToken')

  if (needsOnboarding && !isInvitedUser && !hasPendingInvitation) {
    console.log('🔄 RootRedirect: User needs onboarding, redirecting to /onboarding')
    return <Navigate to="/onboarding" replace />
  }

  // INVITED USERS: Always go to dashboard (they skip onboarding)
  if (isInvitedUser) {
    console.log('🔄 RootRedirect: Invited user detected, redirecting to dashboard (skipping onboarding)')
    return <Navigate to="/dashboard" replace />
  }

  // If there's a pending invitation, redirect to invitation acceptance
  if (hasPendingInvitation) {
    console.log('🔄 RootRedirect: Pending invitation detected, redirecting to invitation acceptance')
    const token = localStorage.getItem('pendingInvitationToken')
    return <Navigate to={`/invite/accept?token=${token}`} replace />
  }

  // User is authenticated and onboarded - go to dashboard
  console.log('🔄 RootRedirect: User is onboarded, redirecting to dashboard')
  return <Navigate to="/dashboard" replace />
}



export default App 