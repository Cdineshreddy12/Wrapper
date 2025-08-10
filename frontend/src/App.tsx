import React, { useMemo, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import api, { onboardingAPI, setKindeTokenGetter } from '@/lib/api'
import toast from 'react-hot-toast'

// Kinde Authentication
import { KindeProvider, useKindeAuth } from '@kinde-oss/kinde-auth-react'

// User Context and Permission Refresh
import { UserContextProvider } from './contexts/UserContextProvider'
import { PermissionRefreshNotification } from './components/PermissionRefreshNotification'

// Trial Management Components
import { TrialExpiryBanner, TrialBannerSpacer } from './components/trial/TrialExpiryBanner'

// Layout Components
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { OnboardingGuard } from '@/components/auth/OnboardingGuard'

// Pages
import Landing from '@/pages/Landing'
import { SimpleOnboarding } from '@/pages/SimpleOnboarding'
import { Login } from '@/pages/Login'
import { AuthCallback } from '@/pages/AuthCallback'
import { InviteAccept } from '@/pages/InviteAccept'
import { AuthDemo } from '@/pages/AuthDemo'
import { DebugAuth } from '@/pages/DebugAuth'
import { Dashboard } from '@/pages/Dashboard'
import { Analytics } from '@/pages/Analytics'
import { Users } from '@/pages/Users'
import { Billing } from '@/pages/Billing'
import { Usage } from '@/pages/Usage'
import { Permissions } from '@/pages/Permissions'
import PaymentAnalytics from '@/pages/PaymentAnalytics'
import DebugOnboardingStatus from '@/pages/DebugOnboardingStatus'
import { RolePermissionManager } from '@/pages/RolePermissionManager'
import { OptimizedRoleManagementDashboard } from '@/components/roles/OptimizedRoleManagementDashboard'
import { AdvancedRoleBuilder } from '@/components/roles/AdvancedRoleBuilder'
import KindeTestDashboard from '@/pages/KindeTestDashboard'
import SuiteDashboard from '@/pages/SuiteDashboard'
import RoleAssignmentTest from '@/components/users/RoleAssignmentTest'
import PermissionDiagnostic from '@/components/debug/PermissionDiagnostic'
import { ApplicationModuleRoleBuilder } from '@/components/roles/ApplicationModuleRoleBuilder'
import CacheMetricsDashboard from '@/pages/CacheMetricsDashboard'
import APIHitMetrics from '@/pages/APIHitMetrics'
import BusinessMetricsDashboard from '@/pages/BusinessMetricsDashboard'

// Create an optimized query client with better caching strategy
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 429 (rate limit)
        if (error?.response?.status >= 400 && error?.response?.status < 500 && error?.response?.status !== 429) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 1 * 60 * 1000, // 2 minutes
      gcTime: 1 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Enable background refetching for better UX
      refetchInterval: false, // Disable automatic polling by default
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
})

// Loading component
const LoadingScreen = () => (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )

// Auth initializer component
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useKindeAuth();
  
  useEffect(() => {
    // Set up the token getter for API calls
    setKindeTokenGetter(async () => {
      try {
        const token = await getToken();
        return token || null;
      } catch (error) {
        console.error('Failed to get Kinde token:', error);
        return null;
      }
    });
  }, [getToken]);
  
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KindeProvider
        clientId={import.meta.env.VITE_KINDE_CLIENT_ID!}
        domain={import.meta.env.VITE_KINDE_DOMAIN!}
        redirectUri={import.meta.env.VITE_KINDE_REDIRECT_URI!}
        logoutUri={import.meta.env.VITE_KINDE_LOGOUT_URI!}
      >
        <AuthInitializer>
          <Router>
            <UserContextProvider>
              <AppContent />
              <PermissionRefreshNotification />
            </UserContextProvider>
          </Router>
        </AuthInitializer>
      </KindeProvider>
      
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
    </QueryClientProvider>
  )
}

// Main App content component
function AppContent() {
  const { isAuthenticated, isLoading, getToken } = useKindeAuth()

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
          
          {/* Redirect /dashboard to business metrics */}
          <Route 
            path="/dashboard" 
            element={<Navigate to="/business-metrics" replace />} 
          />
          
          <Route 
            path="/onboarding" 
            element={<SimpleOnboarding />}
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

          {/* Auth Demo Route */}
          <Route 
            path="/auth-demo" 
            element={<AuthDemo />} 
          />
          
          {/* Debug Auth Route */}
          <Route 
            path="/debug-auth" 
          element={
            <ProtectedRoute skipOnboardingCheck={true}>
              <DebugAuth />
            </ProtectedRoute>
          } 
          />
          
          {/* Auth Status Debug Route */}
          <Route 
            path="/auth-status" 
            element={
              <ProtectedRoute skipOnboardingCheck={true}>
                <AuthStatusDebug />
              </ProtectedRoute>
            } 
          />
          
        {/* Debug Onboarding Status Route */}
        <Route 
          path="/debug-onboarding-status" 
          element={
            <ProtectedRoute skipOnboardingCheck={true}>
              <DebugOnboardingStatus />
            </ProtectedRoute>
          } 
        />
        
        {/* Test Redirect Route */}
        <Route 
          path="/test-redirect" 
          element={<TestRedirect />} 
        />
        
        {/* Role & Permission Manager Route */}
        <Route 
          path="/role-permission-manager" 
          element={
            <ProtectedRoute skipOnboardingCheck={true}>
              <RolePermissionManager />
            </ProtectedRoute>
          } 
        />
        
        {/* Kinde Test Dashboard Route - bypasses authentication */}
        <Route 
          path="/test-dashboard" 
          element={<KindeTestDashboard />} 
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
        
        {/* Simple Direct Test Route */}
        <Route 
          path="/test-analytics" 
          element={
            <div className="p-8">
              <h1 className="text-2xl font-bold">Direct Analytics Test</h1>
              <p>Auth State: {authState.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</p>
              <p>Loading: {authState.isLoading ? 'Yes' : 'No'}</p>
              <div className="mt-4">
                <a href="/dashboard/analytics" className="bg-blue-600 text-white px-4 py-2 rounded">
                  Go to Real Analytics
                </a>
              </div>
            </div>
          } 
        />
        
        {/* Super simple test route to isolate the issue */}
        <Route 
          path="/test-simple" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-yellow-50 p-8">
                <h1 className="text-3xl font-bold text-green-600">✅ SIMPLE ROUTE WORKS!</h1>
                <p className="text-lg mt-4">This route uses only ProtectedRoute wrapper</p>
                <p>Auth State: {authState.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</p>
                <p>Loading: {authState.isLoading ? 'Yes' : 'No'}</p>
                <p>Pathname: {window.location.pathname}</p>
                <div className="mt-4 space-x-2">
                  <a href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded">Go to Dashboard</a>
                  <a href="/direct-analytics" className="bg-green-600 text-white px-4 py-2 rounded">Go to Direct Analytics</a>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Temporary direct routes to bypass nested routing issues */}
        <Route 
          path="/direct-analytics" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <div className="py-6">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 p-4 bg-blue-100 rounded">
                      <h2 className="font-bold">DEBUG: Direct Analytics Route</h2>
                      <p>This route bypasses nested routing completely</p>
                      <p>Auth: {authState.isAuthenticated ? 'YES' : 'NO'}</p>
                    </div>
                    <Analytics />
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/direct-users" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <div className="py-6">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 p-4 bg-green-100 rounded">
                      <h2 className="font-bold">DEBUG: Direct Users Route</h2>
                      <p>This route bypasses nested routing completely</p>
                      <p>Auth: {authState.isAuthenticated ? 'YES' : 'NO'}</p>
                    </div>
                    <Users />
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
          <Route 
          path="/direct-billing" 
            element={
            <ProtectedRoute skipOnboardingCheck={true}>
              <div className="min-h-screen bg-gray-50">
                <div className="py-6">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 p-4 bg-yellow-100 rounded">
                      <h2 className="font-bold">🏠 Direct Billing Route (No Onboarding Check)</h2>
                      <p>This route bypasses onboarding validation for testing purposes</p>
                      <p>Auth: {authState.isAuthenticated ? 'YES' : 'NO'}</p>
                      <div className="mt-2 space-x-2">
                        <a href="/dashboard" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Dashboard</a>
                        <a href="/billing" className="bg-green-600 text-white px-3 py-1 rounded text-sm">Normal Billing</a>
                      </div>
                    </div>
                    <Billing />
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/direct-permissions" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <div className="py-6">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 p-4 bg-purple-100 rounded">
                      <h2 className="font-bold">DEBUG: Direct Permissions Route</h2>
                      <p>This route bypasses nested routing completely</p>
                      <p>Auth: {authState.isAuthenticated ? 'YES' : 'NO'}</p>
                    </div>
                    <Permissions />
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Cache Metrics Dashboard Route */}
        <Route 
          path="/cache-metrics" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <CacheMetricsDashboard />
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* API Hit Metrics Dashboard Route */}
        <Route 
          path="/api-hit-metrics" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <APIHitMetrics />
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Business Metrics Dashboard Route - Primary Dashboard */}
        <Route 
          path="/business-metrics" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <BusinessMetricsDashboard />
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/payment-analytics" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <div className="py-6">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 p-4 bg-blue-100 rounded">
                      <h2 className="font-bold">🚀 Payment Analytics Dashboard</h2>
                      <p>Comprehensive payment and subscription analytics</p>
                      <p>Auth: {authState.isAuthenticated ? 'YES' : 'NO'}</p>
                    </div>
                    <PaymentAnalytics />
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Advanced Role Management Routes */}
        <Route 
          path="/roles-dashboard" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <div className="py-6">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 p-4 bg-indigo-100 rounded">
                      <h2 className="font-bold">🔐 Advanced Role Management Dashboard</h2>
                      <p>Comprehensive role and permission management system</p>
                      <p>Auth: {authState.isAuthenticated ? 'YES' : 'NO'}</p>
                      <div className="mt-2 space-x-2">
                        <a href="/role-builder" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Build Role</a>
                        <a href="/dashboard" className="bg-gray-600 text-white px-3 py-1 rounded text-sm">Dashboard</a>
                      </div>
                    </div>
                    <OptimizedRoleManagementDashboard />
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/role-builder" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50 p-6">
                <ApplicationModuleRoleBuilder 
                  onSave={(role: any) => {
                    console.log('✅ Role created:', role);
                    alert(`Role "${role.roleName}" created successfully!`);
                  }}
                  onCancel={() => {
                    window.history.back();
                  }}
                />
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Role Assignment API Test Route */}  
        <Route 
          path="/test-role-assignment" 
          element={
            <ProtectedRoute skipOnboardingCheck={true}>
              <div className="min-h-screen bg-gray-50">
                <div className="py-6">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 p-4 bg-orange-100 rounded">
                      <h2 className="font-bold">🧪 Role Assignment API Test</h2>
                      <p>Test the role assignment API integration</p>
                      <p>Auth: {authState.isAuthenticated ? 'YES' : 'NO'}</p>
                      <div className="mt-2 space-x-2">
                        <a href="/roles-dashboard" className="bg-indigo-600 text-white px-3 py-1 rounded text-sm">Role Dashboard</a>
                        <a href="/dashboard" className="bg-gray-600 text-white px-3 py-1 rounded text-sm">Dashboard</a>
                      </div>
                    </div>
                    <RoleAssignmentTest />
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Permission Flow Diagnostic Route */}  
        <Route 
          path="/test-permissions" 
          element={
            <ProtectedRoute skipOnboardingCheck={true}>
              <div className="min-h-screen bg-gray-50">
                <div className="py-6">
                  <PermissionDiagnostic />
                </div>
              </div>
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
          <Route index element={<Dashboard />} />
          <Route path="billing" element={<Billing />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="usage" element={<Usage />} />
          <Route path="permissions" element={<Permissions />} />
        </Route>

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
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="users" element={<Users />} />
            <Route path="billing" element={<Billing />} />
            <Route path="usage" element={<Usage />} />
            <Route path="permissions" element={<Permissions />} />
            <Route path="settings" element={<SettingsPlaceholder />} />
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

// Placeholder components for pages not yet implemented
function SettingsPlaceholder() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Configure your account and application settings</p>
      </div>
      
      <div className="bg-white p-8 rounded-lg border border-gray-200">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Settings Panel</h2>
          <p className="text-gray-600 mb-4">
            Comprehensive settings management is coming soon.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div>
              <h3 className="font-medium mb-2">Account Settings:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Profile management</li>
                <li>• Security settings</li>
                <li>• Notification preferences</li>
                <li>• API key management</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Tenant Settings:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Organization details</li>
                <li>• Domain configuration</li>
                <li>• Integration settings</li>
                <li>• Backup & restore</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Auth Status Debug Component
function AuthStatusDebug() {
  const { user, isAuthenticated, isLoading } = useKindeAuth()
  const [authStatus, setAuthStatus] = useState(null)
  const [onboardingStatus, setOnboardingStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check auth status from backend
        const authResponse = await api.get('/admin/auth-status')
        setAuthStatus(authResponse.data)

        // Check onboarding status
        const onboardingResponse = await onboardingAPI.checkStatus()
        setOnboardingStatus(onboardingResponse.data)
      } catch (error) {
        console.error('Error checking status:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && !isLoading) {
      checkStatus()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, isLoading])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">🔍 Auth Status Debug</h1>
        
        {/* Frontend Auth State */}
        <Card>
          <CardHeader>
            <CardTitle>Frontend Kinde Auth State</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify({
                isAuthenticated,
                isLoading,
                user: {
                  id: user?.id,
                  email: user?.email,
                  givenName: user?.givenName,
                  familyName: user?.familyName,
                  picture: user?.picture
                }
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Backend Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle>Backend Auth Status</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(authStatus, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Onboarding Status */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Status</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(onboardingStatus, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <a href="/dashboard" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                Dashboard
              </a>
              <a href="/onboarding" className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                Onboarding
              </a>
              <a href="/debug-onboarding-status" className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">
                Debug Onboarding
              </a>
              <a href="/role-permission-manager" className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700">
                Role Manager
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
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
              const response = await fetch(`${backendUrl}/api/auth/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, app_code: stateData.app_code }),
              });

              if (response.ok) {
                const validation = await response.json();
                
                if (validation.success) {
                  // Generate app-specific token
                  const appTokenResponse = await fetch(`${backendUrl}/api/auth/generate-app-token`, {
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
      } catch (error) {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
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
  const needsOnboarding = onboardingStatus.authStatus?.needsOnboarding ?? !onboardingStatus.authStatus?.onboardingCompleted
  
  if (needsOnboarding) {
    console.log('🔄 RootRedirect: User needs onboarding, redirecting to /onboarding')
    return <Navigate to="/onboarding" replace />
  }

  // User is authenticated and onboarded - go to dashboard
  console.log('🔄 RootRedirect: User is onboarded, redirecting to dashboard')
  return <Navigate to="/dashboard" replace />
}

// RoleCreateWrapper removed - now using ApplicationModuleRoleBuilder directly

function TestRedirect() {
  const navigate = useNavigate()
  
  const handleTestRedirect = () => {
    console.log('🚀 Testing manual dashboard redirect...')
    navigate('/dashboard?welcome=true&onboarding=complete&plan=trial', { replace: true })
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Dashboard Redirect</CardTitle>
          <CardDescription>
            Click the button below to test the redirect to dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestRedirect} className="w-full">
            Test Redirect to Dashboard
          </Button>
          <div className="mt-4 text-sm text-gray-600">
            <p>This will redirect you to:</p>
            <code className="text-xs bg-gray-100 p-1 rounded">
              /dashboard?welcome=true&onboarding=complete&plan=trial
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default App 