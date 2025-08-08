import React, { useState, useEffect } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { useNavigate, useParams, useSearchParams, Navigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, BarChart3, CreditCard, Building2 } from 'lucide-react'

import toast from 'react-hot-toast'
import api from '@/lib/api'

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { 
    isAuthenticated, 
    user, 
    isLoading, 
    getToken, 
    login,
    getOrganization,
    getUserOrganizations 
  } = useKindeAuth()
  
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [userOrgs, setUserOrgs] = useState<any>(null)
  const [currentOrg, setCurrentOrg] = useState<any>(null)

  // Check for external redirect URL from query params
  const redirectTo = searchParams.get('redirect_to')
  const app = searchParams.get('app')
  
  console.log('🔐 Login.tsx - Using Kinde org handlers:', {
    redirectTo,
    app,
    isAuthenticated,
    hasUser: !!user,
    isLoading,
    isRedirecting,
    currentOrg,
    userOrgs,
    pathname: location.pathname,
    timestamp: new Date().toISOString()
  })

  // Get organization data when user is authenticated
  useEffect(() => {
    const fetchOrgData = async () => {
      if (!isAuthenticated || !user || isLoading) return;
      
      try {
        // Get current organization
        const org = await getOrganization();
        console.log('🏢 Current organization:', org);
        setCurrentOrg(org);
        
        // Get all user organizations
        const orgs = await getUserOrganizations();
        console.log('🏢 User organizations:', orgs);
        setUserOrgs(orgs);
      } catch (error) {
        console.error('❌ Error fetching organization data:', error);
      }
    };

    fetchOrgData();
  }, [isAuthenticated, user, isLoading, getOrganization, getUserOrganizations]);

  // Handle external redirect after authentication
  useEffect(() => {
    const handleExternalRedirect = async () => {
      // Only proceed if authenticated with external redirect
      if (!isAuthenticated || !user || !redirectTo || isLoading || isRedirecting) {
        return;
      }

      console.log('🔄 Login.tsx - Processing external redirect to:', redirectTo);
      
      try {
        // Get access token from Kinde
        let token = null;
        
        try {
          token = await getToken();
        } catch (tokenError) {
          console.warn('⚠️ Could not get token via getToken(), checking user properties:', tokenError);
          // For now, we'll handle this in the backend by passing the session
        }
        
        if (token) {
          // Construct redirect URL with token
          const redirectUrl = new URL(redirectTo);
          redirectUrl.searchParams.set('token', token);
          if (app) redirectUrl.searchParams.set('app', app);
          
          console.log('🚀 Redirecting to external app:', redirectUrl.toString());
          
          // Clear the redirect params from current URL to prevent loops
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete('redirect_to');
          currentUrl.searchParams.delete('app');
          window.history.replaceState({}, '', currentUrl.toString());
          
          // Redirect to external app
          window.location.href = redirectUrl.toString();
        } else {
          console.error('❌ No token available for external redirect');
          toast.error('Authentication token not available. Please try logging in again.');
        }
      } catch (error) {
        console.error('❌ Error during external redirect:', error);
        toast.error('Failed to redirect to application. Please try again.');
      }
    };
    
    // Small delay to ensure everything is ready
    const timer = setTimeout(handleExternalRedirect, 500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, redirectTo, app, isLoading, isRedirecting, getToken]);

  // Show loading screen when processing external redirect
  if (!isLoading && isAuthenticated && user && redirectTo && !isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to your application...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we redirect you back to {app || 'your application'}</p>
        </div>
      </div>
    );
  }

  // Handle post-login redirect for authenticated users
  useEffect(() => {
    const handlePostLoginRedirect = async () => {
      if (!isAuthenticated || !user || isLoading || redirectTo || isRedirecting) {
        return
      }

      console.log('🔄 Login.tsx - User authenticated, checking onboarding status')
      setIsRedirecting(true)

      try {
        // Check onboarding status to determine where to redirect
        const response = await api.get('/onboarding/status')
        const status = response.data

        if (status.user && status.isOnboarded && !status.needsOnboarding) {
          // User is fully onboarded - go to dashboard
          console.log('✅ User onboarded, redirecting to dashboard')
          navigate('/dashboard', { replace: true })
        } else {
          // User needs onboarding - go to onboarding page
          console.log('🔄 User needs onboarding, redirecting to onboarding')
          navigate('/onboarding', { replace: true })
        }
      } catch (error) {
        console.error('❌ Error checking onboarding status:', error)
        // Default to onboarding on error
        navigate('/onboarding', { replace: true })
      }
    }

    handlePostLoginRedirect()
  }, [isAuthenticated, user, isLoading, redirectTo, navigate])

  // Show loading while handling post-login redirect
  if (!isLoading && isAuthenticated && user && !redirectTo && !isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your workspace...</p>
        </div>
      </div>
    )
  }

  // Check for messages from URL params - only run once
  useEffect(() => {
    const message = searchParams.get('message')
    const error = searchParams.get('error')
    
    if (message === 'setup_complete') {
      toast.success('Organization setup complete! Please sign in to continue.')
    }
    
    if (error === 'auth_failed') {
      toast.error('Authentication failed. Please try again.')
    }
  }, []) // Empty dependency array to run only once

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const handleAuthSuccess = (user: any) => {
    toast.success(`Welcome, ${user.givenName || user.email}!`)
    // Let the router handle the redirect automatically
  }

  const handleAuthError = (error: string) => {
    toast.error(error)
  }

  // Handle login - let Kinde manage organization selection
  const handleLogin = async () => {
    try {
      console.log('🔄 Starting Kinde login flow');
      // Kinde will automatically handle organization selection:
      // - If user belongs to one org: automatically signs them in
      // - If user belongs to multiple orgs: shows organization picker
      // - If user belongs to no orgs: signs them in without org context
      await login();
    } catch (error) {
      console.error('❌ Login error:', error);
      toast.error('Failed to start login process. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Wrapper Platform</h1>
          <p className="text-lg text-gray-600">Enterprise Multi-tenant SaaS Solution</p>
        </div>

        {/* Main login card - no more subdomain input */}
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your organization's dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={handleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                Sign In with Kinde
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Kinde will automatically detect your organization
                </p>
              </div>

              {/* Show organization info if user is authenticated */}
              {isAuthenticated && currentOrg && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Signed in to: {currentOrg.orgName}
                  </p>
                  {userOrgs && userOrgs.orgCodes && userOrgs.orgCodes.length > 1 && (
                    <p className="text-xs text-green-600 mt-1">
                      You have access to {userOrgs.orgCodes.length} organizations
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Platform Features */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-center">Platform Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start space-x-2">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Team Management</p>
                  <p className="text-xs text-gray-500">Role-based access control</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Analytics</p>
                  <p className="text-xs text-gray-500">Real-time insights</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Billing</p>
                  <p className="text-xs text-gray-500">Integrated payments</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Multi-tenant</p>
                  <p className="text-xs text-gray-500">Isolated workspaces</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Don't have an organization? 
            <a href="/onboarding" className="text-blue-600 hover:text-blue-500 font-medium ml-1">
              Get Started
            </a>
          </p>
          <p className="text-sm text-gray-600">
            Need help? 
            <a href="#" className="text-blue-600 hover:text-blue-500 font-medium ml-1">
              Support Center
            </a>
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Powered by Kinde Authentication • Secure Social SSO
          </p>
        </div>
      </div>
    </div>
  )
} 