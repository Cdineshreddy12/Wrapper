import { useMemo, Suspense } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'

// UI
import { ZopkitRoundLoader } from '@/components/common/feedback/ZopkitRoundLoader'
import { NewVersionBanner } from '@/components/NewVersionBanner'

// Layout & Guards
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { OnboardingGuard } from '@/features/onboarding/components/OnboardingGuard'
import { OnboardingPageGuard } from '@/features/onboarding/components/OnboardingPageGuard'
import { UserManagementProvider } from '@/features/users/components/context/UserManagementContext'
import { ErrorBoundary } from '@/errors/ErrorBoundary'

// Route modules
import { RootRedirect } from './RootRedirect'
import {
  Landing,
  ProductPage,
  IndustryPage,
  PrivacyPolicy,
  TermsOfService,
  CookiePolicy,
  Security,
  Pricing,
  Login,
  AuthCallback,
  InviteAccept,
  OnboardingPage,
  PaymentSuccess,
  PaymentCancelled,
  PaymentDetailsPage,
  BillingUpgradePage,
  Billing,
  SuiteDashboard,
  ActivityDashboard,
  ApplicationPage,
  ApplicationDetailsPage,
  UserManagementDashboard,
  InviteUserPage,
  UserDetailsPage,
  UserApplicationAccessPage,
  RolesPage,
  RoleDetailsPage,
  RoleBuilderPage,
  OrganizationPage,
  Permissions,
  Settings,
  AdminDashboardPage,
  TenantDetailsPage,
  CampaignDetailsPage,
  NotFound,
} from './lazyPages'

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center flex flex-col items-center">
        <ZopkitRoundLoader size="page" className="mb-6" />
        <p className="text-gray-600 dark:text-gray-300 text-base font-medium">
          Your data is loading...
        </p>
      </div>
    </div>
  )
}

function PaymentSuccessErrorFallback() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-xl text-center">
        <p className="text-slate-900 font-bold mb-2">Something went wrong</p>
        <p className="text-slate-600 text-sm mb-6">
          The payment success page could not load. Your payment may still have gone through.
        </p>
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

export function AppRoutes() {
  const { isAuthenticated, isLoading } = useKindeAuth()

  const authState = useMemo(
    () => ({
      isAuthenticated: !!isAuthenticated,
      isLoading: !!isLoading,
    }),
    [isAuthenticated, isLoading],
  )

  if (authState.isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="App">
      <NewVersionBanner />

      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public — Landing is the home page */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/products/:productId" element={<ProductPage />} />
          <Route path="/industries/:industrySlug" element={<IndustryPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/security" element={<Security />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/invite/accept" element={<InviteAccept />} />
          <Route
            path="/onboarding"
            element={
              <OnboardingPageGuard>
                <OnboardingPage />
              </OnboardingPageGuard>
            }
          />

          {/* Payment */}
          <Route
            path="/payment-success"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallback={<PaymentSuccessErrorFallback />}>
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

          {/* Suite */}
          <Route
            path="/suite"
            element={
              <ProtectedRoute>
                <SuiteDashboard />
              </ProtectedRoute>
            }
          />

          {/* Dashboard */}
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

          {/* Company Admin */}
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

          {/* Catch-all */}
          <Route path="*" element={authState.isLoading ? <LoadingScreen /> : <NotFound />} />
        </Routes>
      </Suspense>
    </div>
  )
}
