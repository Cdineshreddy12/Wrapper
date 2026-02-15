import React, { useMemo, useEffect, useState, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'

// React Router future flags to suppress deprecation warnings
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
}
import { Toaster } from '@/components/ui/sonner'
import { useAuthStatus } from '@/hooks/useSharedQueries'
import { ZopkitRoundLoader } from '@/components/common/ZopkitRoundLoader'
import { NewVersionBanner } from '@/components/NewVersionBanner'

// Kinde Authentication
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { KindeProvider } from '@/components/auth/KindeProvider'
import SilentAuthGuard from '@/components/auth/SilentAuthGuard'

// User Context and Permission Refresh
import { UserContextProvider } from './contexts/UserContextProvider'
import { EntityScopeProvider } from './contexts/EntityScopeContext'
import { ThemeProvider } from './components/theme/ThemeProvider'

// Layout & guards (small; keep eager)
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { OnboardingGuard, OnboardingPageGuard } from '@/features/onboarding/indexOptimized'
import { UserManagementProvider } from '@/features/users/components/context/UserManagementContext'
import { ErrorBoundary } from '@/errors/ErrorBoundary'

// Lazy-loaded pages (code-split per route for faster initial load)
const Landing = React.lazy(() => import('@/pages/landing').then(m => ({ default: m.Landing })))
const ProductPage = React.lazy(() => import('@/pages/landing').then(m => ({ default: m.ProductPage })))
const IndustryPage = React.lazy(() => import('@/pages/landing').then(m => ({ default: m.IndustryPage })))
const PrivacyPolicy = React.lazy(() => import('@/pages/landing').then(m => ({ default: m.PrivacyPolicy })))
const TermsOfService = React.lazy(() => import('@/pages/landing').then(m => ({ default: m.TermsOfService })))
const CookiePolicy = React.lazy(() => import('@/pages/landing').then(m => ({ default: m.CookiePolicy })))
const Security = React.lazy(() => import('@/pages/landing').then(m => ({ default: m.Security })))
const Pricing = React.lazy(() => import('@/pages/landing').then(m => ({ default: m.Pricing })))
const Login = React.lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const AuthCallback = React.lazy(() => import('@/pages/AuthCallback').then(m => ({ default: m.AuthCallback })))
const InviteAccept = React.lazy(() => import('@/pages/InviteAccept').then(m => ({ default: m.InviteAccept })))
const OnboardingPage = React.lazy(() => import('@/features/onboarding/indexOptimized').then(m => ({ default: m.OnboardingPage })))
const PaymentSuccess = React.lazy(() => import('./pages/PaymentSuccess'))
const PaymentCancelled = React.lazy(() => import('./pages/PaymentCancelled'))
const SuiteDashboard = React.lazy(() => import('@/pages/SuiteDashboard'))
const UserManagementDashboard = React.lazy(() => import('@/features/users/components/UserManagementDashboard').then(m => ({ default: m.UserManagementDashboard })))
const Billing = React.lazy(() => import('@/features/billing').then(m => ({ default: m.Billing })))
const Permissions = React.lazy(() => import('@/features/permissions').then(m => ({ default: m.Permissions })))
const UserApplicationAccessPage = React.lazy(() => import('@/pages/UserApplicationAccess'))
const AdminDashboardPage = React.lazy(() => import('@/features/admin').then(m => ({ default: m.AdminDashboardPage })))
const ApplicationPage = React.lazy(() => import('./pages/ApplicationPage').then(m => ({ default: m.ApplicationPage })))
const RolesPage = React.lazy(() => import('./pages/RolesPage').then(m => ({ default: m.RolesPage })))
const Settings = React.lazy(() => import('@/features/settings').then(m => ({ default: m.Settings })))
const OrganizationPage = React.lazy(() => import('@/features/organizations').then(m => ({ default: m.OrganizationPage })))
const NotFound = React.lazy(() => import('./pages/NotFound'))
const ActivityDashboard = React.lazy(() => import('./pages/ActivityDashboardPage').then(m => ({ default: m.ActivityDashboard })))
const PaymentDetailsPage = React.lazy(() => import('./pages/PaymentDetailsPage').then(m => ({ default: m.PaymentDetailsPage })))
const BillingUpgradePage = React.lazy(() => import('./pages/BillingUpgradePage').then(m => ({ default: m.BillingUpgradePage })))
const ApplicationDetailsPage = React.lazy(() => import('./pages/ApplicationDetailsPage').then(m => ({ default: m.ApplicationDetailsPage })))
const RoleDetailsPage = React.lazy(() => import('./pages/RoleDetailsPage').then(m => ({ default: m.RoleDetailsPage })))
const RoleBuilderPage = React.lazy(() => import('./pages/RoleBuilderPage').then(m => ({ default: m.RoleBuilderPage })))
const InviteUserPage = React.lazy(() => import('./pages/InviteUserPage').then(m => ({ default: m.InviteUserPage })))
const UserDetailsPage = React.lazy(() => import('./pages/UserDetailsPage').then(m => ({ default: m.UserDetailsPage })))
const TenantDetailsPage = React.lazy(() => import('./pages/TenantDetailsPage').then(m => ({ default: m.TenantDetailsPage })))
const CampaignDetailsPage = React.lazy(() => import('./pages/CampaignDetailsPage').then(m => ({ default: m.CampaignDetailsPage })))
const TestWelcomeScreen = React.lazy(() => import('./pages/test/TestWelcomeScreen'))
const TestLoadingScreen = React.lazy(() => import('./pages/test/TestLoadingScreen'))

// Professional Loading component using Zopkit round loader
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="text-center flex flex-col items-center">
      <ZopkitRoundLoader size="page" className="mb-6" />
      <p className="text-gray-600 dark:text-gray-300 text-base font-medium">Your data is loading...</p>
    </div>
  </div>
)

// Fallback when PaymentSuccess page throws (e.g. context/API error in production)
function PaymentSuccessErrorFallback() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-xl text-center">
        <p className="text-slate-900 font-bold mb-2">Something went wrong</p>
        <p className="text-slate-600 text-sm mb-6">The payment success page could not load. Your payment may still have gone through.</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/billing')}
            className="w-full rounded-lg bg-blue-600 py-3 px-4 text-white font-semibold hover:bg-blue-700"
          >
            Return to Billing
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-lg border border-slate-300 py-3 px-4 text-slate-700 font-medium hover:bg-slate-50"
          >
            Refresh page
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <>
      <ThemeProvider defaultTheme="system" storageKey="zopkit-theme">
        <Toaster position="top-right" richColors offset="80px" gap={12} />
        <KindeProvider>
          <Router future={router.future}>
            <SilentAuthGuard>
              <UserContextProvider>
                <EntityScopeProvider>
                  <AppContent />
                </EntityScopeProvider>
              </UserContextProvider>
            </SilentAuthGuard>
          </Router>
        </KindeProvider>
      </ThemeProvider>

      {/* Toast notifications - Using Sonner only to avoid overlap */}
      {/* Removed react-hot-toast Toaster as it overlaps with Sonner */}
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

  // Show loading spinner while authentication is being determined
  if (authState.isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="App">
      {/* Trial Expiry Banner Only */}
      {/* <TrialExpiryBanner />
      <TrialBannerSpacer /> */}

      {/* New Version Available Banner */}
      <NewVersionBanner />

      <Suspense fallback={<LoadingScreen />}>
        <Routes>
        {/* Public Routes */}
        <Route
          path="/landing"
          element={
            authState.isAuthenticated ? <Navigate to="/" replace /> : <Landing />
          }
        />

        {/* Product Pages - Public */}
        <Route
          path="/products/:productId"
          element={<ProductPage />}
        />

        {/* Industry Pages - Public */}
        <Route
          path="/industries/:industrySlug"
          element={<IndustryPage />}
        />

        {/* Legal & Info Pages - Public */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/security" element={<Security />} />
        <Route path="/pricing" element={<Pricing />} />

        {/* TEST ROUTES - Remove after testing is complete */}
        <Route path="/test/welcome" element={<TestWelcomeScreen />} />
        <Route path="/test/loading" element={<TestLoadingScreen />} />

        {/* Root redirect based on auth status */}
        <Route
          path="/"
          element={<RootRedirect />}
        />



        <Route
          path="/onboarding"
          element={
            <OnboardingPageGuard>
              <OnboardingPage />
            </OnboardingPageGuard>
          }
        />

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

        {/* Payment Status Routes - Protected */}
        <Route
          path="/payment-success"
          element={
            <ProtectedRoute>
              <ErrorBoundary
                fallback={
                  <PaymentSuccessErrorFallback />
                }
              >
                <PaymentSuccess />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment-cancelled"
          element={
            <ProtectedRoute>
              <PaymentCancelled />
            </ProtectedRoute>
          }
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
          path="/dashboard"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <DashboardLayout />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<ApplicationPage />} />
          <Route path="applications/:appId" element={<ApplicationDetailsPage />} />
          <Route path="applications" element={<ApplicationPage />} />
          <Route path="users/invite" element={<UserManagementProvider><InviteUserPage /></UserManagementProvider>} />
          <Route path="users/:userId" element={<UserDetailsPage />} />
          <Route path="users" element={<UserManagementDashboard />} />
          <Route path="organization" element={<OrganizationPage />} />
          <Route path="roles/new" element={<RoleBuilderPage />} />
          <Route path="roles/:roleId/edit" element={<RoleBuilderPage />} />
          <Route path="roles/:roleId" element={<RoleDetailsPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="user-apps" element={<UserApplicationAccessPage />} />
          <Route path="billing/payments/:paymentId" element={<PaymentDetailsPage />} />
          <Route path="billing/upgrade" element={<BillingUpgradePage />} />
          <Route path="billing" element={<Billing />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="settings" element={<Settings />} />
          <Route path="activity" element={<ActivityDashboard />} />
        </Route>

        {/* Company Admin Dashboard - Secure Route with Kinde Permissions
            skipOnboardingCheck: Company admins are platform-level (Kinde); they may have no tenant
            or incomplete tenant onboarding. They access via company:admin:access, not tenant roles. */}
        <Route
          path="/company-admin/tenants/:tenantId"
          element={
            <ProtectedRoute skipOnboardingCheck>
              <PermissionGuard requiredPermission="company:admin:access">
                <TenantDetailsPage />
              </PermissionGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/company-admin/campaigns/:campaignId"
          element={
            <ProtectedRoute skipOnboardingCheck>
              <PermissionGuard requiredPermission="company:admin:access">
                <CampaignDetailsPage />
              </PermissionGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/company-admin"
          element={
            <ProtectedRoute skipOnboardingCheck>
              <PermissionGuard requiredPermission="company:admin:access">
                <AdminDashboardPage />
              </PermissionGuard>
            </ProtectedRoute>
          }
        />



        {/* Catch all - show NotFound page for invalid routes */}
        <Route
          path="*"
          element={
            authState.isLoading ? (
              <LoadingScreen />
            ) : (
              <NotFound />
            )
          }
        />
        </Routes>
      </Suspense>
    </div>
  )
}




// Root redirect component to handle initial route decisions
function RootRedirect() {
  const { isAuthenticated, isLoading, getToken } = useKindeAuth()
  const { data: authData, isLoading: authLoading } = useAuthStatus()
  const [isChecking, setIsChecking] = useState(true)
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)

  useEffect(() => {
    async function checkStatus() {
      if (isLoading || authLoading) {
        return // Wait for Kinde and auth status to finish loading
      }

      // Check if this is a CRM authentication flow (from Kinde callback)
      const urlParams = new URLSearchParams(window.location.search);
      const stateParam = urlParams.get('state');

      if (stateParam && isAuthenticated) {
        try {
          const stateData = JSON.parse(stateParam);

          if (stateData.app_code && stateData.redirect_url) {
            const token = await getToken();

            if (token) {
              // Generate app-specific token using backend
              const backendUrl = 'https://zopkit.com/api';
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

                    window.location.href = redirectUrl.toString();
                    return;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error processing CRM authentication:', error);
        }
      }

      if (!isAuthenticated) {
        setIsChecking(false)
        return
      }

      // Use auth data from shared hook (read inside effect; do not put authData in deps to avoid infinite loop from new object refs)
      const authStatus = authData?.authStatus
      if (authStatus) {
        setOnboardingStatus({ authStatus })
      } else {
        setOnboardingStatus({ hasUser: false, hasTenant: false })
      }

      setIsChecking(false)
    }

    checkStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- authData intentionally omitted to prevent re-render loop
  }, [isAuthenticated, isLoading, authLoading])

  // Show loading while checking
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

  // Not authenticated - go to landing
  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />
  }

  // Authenticated but no onboarding status yet (still loading)
  if (!onboardingStatus) {
    return <Navigate to="/landing" replace />
  }

  // Placeholder when backend auth status wasn't available - send to dashboard and let guards handle it (avoids redirect loop)
  if (!onboardingStatus.authStatus) {
    return <Navigate to="/dashboard" replace />
  }

  // Check if user needs onboarding based on the actual backend response structure
  const needsOnboarding = onboardingStatus.authStatus?.needsOnboarding ?? !onboardingStatus.authStatus?.onboardingCompleted

  // Check if this is an invited user (they should never need onboarding)
  const isInvitedUser = onboardingStatus.authStatus?.userType === 'INVITED_USER' ||
    onboardingStatus.authStatus?.isInvitedUser === true ||
    onboardingStatus.authStatus?.onboardingCompleted === true

  // Check if there's a pending invitation (user should complete invitation flow first)
  const hasPendingInvitation = localStorage.getItem('pendingInvitationToken')

  if (needsOnboarding && !isInvitedUser && !hasPendingInvitation) {
    return <Navigate to="/onboarding" replace />
  }

  // INVITED USERS: Always go to dashboard (they skip onboarding)
  if (isInvitedUser) {
    return <Navigate to="/dashboard" replace />
  }

  // If there's a pending invitation, redirect to invitation acceptance
  if (hasPendingInvitation) {
    const token = localStorage.getItem('pendingInvitationToken')
    return <Navigate to={`/invite/accept?token=${token}`} replace />
  }

  // User is authenticated and onboarded - go to dashboard
  return <Navigate to="/dashboard" replace />
}

export default App