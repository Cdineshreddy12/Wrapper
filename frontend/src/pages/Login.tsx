import React, { useState, useEffect } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { useNavigate, useParams, useSearchParams, Navigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, BarChart3, CreditCard, Building2, ArrowLeft, ExternalLink } from 'lucide-react'

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
  
  // CRM-specific parameters
  const returnTo = searchParams.get('returnTo')
  const source = searchParams.get('source')
  const error = searchParams.get('error')
  const redirectAfterAuth = searchParams.get('redirectAfterAuth')
  const crmRedirect = searchParams.get('crmRedirect')
  
  // Determine if this is a CRM request
  const isCrmRequest = source === 'crm' || app === 'crm' || crmRedirect === 'true'
  const shouldAutoRedirect = redirectAfterAuth === 'true'
  
  // Validate CRM return URL for security
  const isValidCrmReturnUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      // Only allow CRM domain
      return parsed.hostname === 'crm.zopkit.com' || 
             parsed.hostname.endsWith('.crm.zopkit.com');
    } catch {
      return false;
    }
  };
  
  console.log('🔐 Login.tsx - CRM Integration Check:', {
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

  // Handle CRM redirect after authentication
  useEffect(() => {
    const handleCrmRedirect = async () => {
      // Only proceed if authenticated with CRM redirect
      if (!isAuthenticated || !user || !returnTo || !isCrmRequest || isLoading || isRedirecting) {
        return;
      }

      console.log('🔄 Login.tsx - Processing CRM redirect to:', returnTo);
      
      try {
        // Validate return URL (only allow CRM domain)
        if (!isValidCrmReturnUrl(returnTo)) {
          console.error('❌ Invalid CRM return URL:', returnTo);
          toast.error('Invalid return URL. Please contact support.');
          return;
        }
        
        // Get access token from Kinde
        let token = null;
        
        try {
          token = await getToken();
        } catch (tokenError) {
          console.warn('⚠️ Could not get token via getToken(), but proceeding with redirect:', tokenError);
        }
        
        // Clear the CRM params from current URL to prevent loops
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('returnTo');
        currentUrl.searchParams.delete('source');
        currentUrl.searchParams.delete('app');
        currentUrl.searchParams.delete('error');
        currentUrl.searchParams.delete('redirectAfterAuth');
        currentUrl.searchParams.delete('crmRedirect');
        window.history.replaceState({}, '', currentUrl.toString());
        
        console.log('🚀 Redirecting to CRM:', returnTo);
        
        // Redirect to CRM - Kinde domain cookies will be automatically available
        window.location.href = returnTo;
        
      } catch (error) {
        console.error('❌ Error during CRM redirect:', error);
        toast.error('Failed to redirect to CRM. Please try again.');
      }
    };
    
    // Small delay to ensure everything is ready
    const timer = setTimeout(handleCrmRedirect, 500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, returnTo, isCrmRequest, isLoading, isRedirecting, getToken]);

  // Handle external redirect after authentication (existing functionality)
  useEffect(() => {
    const handleExternalRedirect = async () => {
      // Only proceed if authenticated with external redirect (non-CRM)
      if (!isAuthenticated || !user || !redirectTo || isLoading || isRedirecting || isCrmRequest) {
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

  // Show loading screen when processing CRM redirect
  if (!isLoading && isAuthenticated && user && returnTo && isCrmRequest && !isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to CRM...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we redirect you back to the CRM application</p>
        </div>
      </div>
    );
  }

  // Show loading screen when processing external redirect
  if (!isLoading && isAuthenticated && user && redirectTo && !isRedirecting && !isCrmRequest) {
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
      if (!isAuthenticated || !user || isLoading || redirectTo || returnTo || isRedirecting) {
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
  if (!isLoading && isAuthenticated && user && !redirectTo && !returnTo && !isRedirecting) {
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

  // Handle going back to CRM without login
  const handleBackToCRM = () => {
    if (returnTo && isValidCrmReturnUrl(returnTo)) {
      window.location.href = returnTo;
    } else {
      toast.error('Invalid return URL');
    }
  };

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
        {/* CRM Mode Header */}
        {isCrmRequest && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center">
                <ExternalLink className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🔐 CRM Authentication</h1>
            <p className="text-lg text-gray-600">Please login to access the CRM application</p>
            
            {/* CRM Return URL Info */}
            {returnTo && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  Returning to: <code className="text-xs break-all">{returnTo}</code>
                </p>
              </div>
            )}
            
            {/* Previous Error Display */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  Previous error: {decodeURIComponent(error)}
                </p>
              </div>
            )}
            
            {/* Back to CRM Button */}
            <Button
              onClick={handleBackToCRM}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to CRM
            </Button>
          </div>
        )}

        {/* Normal Wrapper Header */}
        {!isCrmRequest && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Wrapper Platform</h1>
            <p className="text-lg text-gray-600">Enterprise Multi-tenant SaaS Solution</p>
          </div>
        )}

        {/* Main login card */}
        <Card className={`shadow-xl ${isCrmRequest ? 'border-green-200' : ''}`}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">
              {isCrmRequest ? 'CRM Authentication Required' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isCrmRequest 
                ? 'Sign in to access the CRM application'
                : 'Sign in to access your organization\'s dashboard'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={handleLogin}
                className={`w-full ${isCrmRequest ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                size="lg"
              >
                {isCrmRequest ? 'Sign In to CRM' : 'Sign In with Kinde'}
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {isCrmRequest 
                    ? 'Kinde will securely authenticate you and redirect you back to CRM'
                    : 'Kinde will automatically detect your organization'
                  }
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

        {/* Platform Features - Only show for non-CRM requests */}
        {!isCrmRequest && (
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
        )}

        {/* Footer - Only show for non-CRM requests */}
        {!isCrmRequest && (
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
        )}

        {/* CRM Mode Footer */}
        {isCrmRequest && (
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Having trouble? 
              <a href="#" className="text-green-600 hover:text-green-500 font-medium ml-1">
                Contact Support
              </a>
            </p>
            <p className="text-xs text-gray-400 mt-4">
              Secure CRM Authentication via Wrapper Platform
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 