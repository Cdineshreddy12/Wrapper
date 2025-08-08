import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { resetOnboardingStatus, checkOnboardingStatus } from '@/hooks/usePostLoginRedirect'
import {
  Shield,
  User,
  Key,
  Navigation,
  Clock,
  Building,
  AlertCircle,
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react'

export function DebugAuth() {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    organization, 
    permissions,
    getToken
  } = useKindeAuth()
  
  const navigate = useNavigate()
  const location = useLocation()
  const [tokenInfo, setTokenInfo] = useState<string>('')
  const [authStateHistory, setAuthStateHistory] = useState<Array<{timestamp: string, state: any}>>([])
  const [envCheck, setEnvCheck] = useState<{[key: string]: string | undefined}>({})
  const [onboardingStatus, setOnboardingStatus] = useState<boolean | null>(null)

  // Check environment variables
  useEffect(() => {
    setEnvCheck({
      KINDE_DOMAIN: import.meta.env.VITE_KINDE_DOMAIN,
      KINDE_CLIENT_ID: import.meta.env.VITE_KINDE_CLIENT_ID,
      KINDE_REDIRECT_URI: import.meta.env.VITE_KINDE_REDIRECT_URI,
      KINDE_LOGOUT_URI: import.meta.env.VITE_KINDE_LOGOUT_URI,
    })
  }, [])

  // Check onboarding status when user changes
  useEffect(() => {
    const checkStatus = async () => {
      if (user) {
        try {
          const status = await checkOnboardingStatus(user)
          setOnboardingStatus(status?.isOnboarded || false)
        } catch (error) {
          console.error('Error checking onboarding status:', error)
          setOnboardingStatus(null)
        }
      } else {
        setOnboardingStatus(null)
      }
    }
    
    checkStatus()
  }, [user])

  // Track authentication state changes
  useEffect(() => {
    const newState = {
      timestamp: new Date().toISOString(),
      state: {
        isAuthenticated,
        isLoading,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        pathname: location.pathname
      }
    }
    
    setAuthStateHistory(prev => [newState, ...prev.slice(0, 9)]) // Keep last 10 states
  }, [isAuthenticated, isLoading, user, location.pathname])

  // Test token retrieval
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      getToken()
        .then(token => {
          setTokenInfo(token ? `Token: ${token.substring(0, 50)}...` : 'No token available')
        })
        .catch(err => {
          setTokenInfo(`Token error: ${err.message}`)
        })
    }
  }, [isAuthenticated, isLoading, getToken])

  const testRouteNavigation = (route: string) => {
    console.log(`Testing navigation to: ${route}`)
    console.log('Current auth state:', { isAuthenticated, isLoading, user: !!user })
    navigate(route)
  }

  const handleResetOnboarding = async () => {
    if (user?.id) {
      try {
        await resetOnboardingStatus()
        setOnboardingStatus(false)
        console.log('🔄 Onboarding status reset')
      } catch (error) {
        console.error('Error resetting onboarding status:', error)
      }
    }
  }

  const testOnboardingFlow = async () => {
    if (user?.id) {
      try {
        await resetOnboardingStatus()
        navigate('/login')
        console.log('🧪 Testing onboarding flow - redirecting to login')
      } catch (error) {
        console.error('Error testing onboarding flow:', error)
      }
    }
  }

  const refetchOnboardingStatus = async () => {
    if (user) {
      try {
        const status = await checkOnboardingStatus(user)
        setOnboardingStatus(status?.isOnboarded || false)
        console.log('🔄 Onboarding status refetched:', status)
      } catch (error) {
        console.error('Error refetching onboarding status:', error)
      }
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Authentication Debug Dashboard</h1>
        <p className="text-gray-600">Real-time authentication state and routing diagnostics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Environment Check */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Environment Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(envCheck).map(([key, value]) => (
                <div key={key} className="p-3 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-700">{key}</div>
                  <div className="text-xs text-gray-600 mt-1 break-all">
                    {value ? (
                      <span className="text-green-600">✅ {value.length > 30 ? `${value.substring(0, 30)}...` : value}</span>
                    ) : (
                      <span className="text-red-600">❌ Not set</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Authentication State */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Authentication State
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Authenticated:</span>
                <Badge className={isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {isAuthenticated ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Loading:</span>
                <Badge className={isLoading ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}>
                  {isLoading ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">User Present:</span>
                <Badge className={user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {user ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Current Path:</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{location.pathname}</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2 text-sm">
                <div><strong>ID:</strong> {user.id}</div>
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Name:</strong> {user.givenName} {user.familyName}</div>
                <div><strong>Picture:</strong> {user.picture ? 'Yes' : 'No'}</div>
              </div>
            ) : (
              <p className="text-gray-500">No user data available</p>
            )}
          </CardContent>
        </Card>

        {/* Token Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Token Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm break-all">
              {tokenInfo || 'Loading token info...'}
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Onboarding Controls
            </CardTitle>
            <CardDescription>
              Test the onboarding flow and status management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Onboarding Status:</span>
                <Badge className={
                  onboardingStatus === null 
                    ? 'bg-gray-100 text-gray-800' 
                    : onboardingStatus 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                }>
                  {onboardingStatus === null 
                    ? 'Unknown' 
                    : onboardingStatus 
                      ? 'Completed' 
                      : 'Needs Onboarding'
                  }
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleResetOnboarding}
                disabled={!user}
                variant="outline" 
                size="sm" 
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Reset Onboarding Status
              </Button>
              <Button 
                onClick={testOnboardingFlow}
                disabled={!user}
                variant="default" 
                size="sm" 
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Onboarding Flow
              </Button>
              <Button 
                onClick={refetchOnboardingStatus}
                disabled={!user}
                variant="outline" 
                size="sm" 
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refetch Status from API
              </Button>
              <Button 
                onClick={() => navigate('/onboarding')}
                variant="outline" 
                size="sm" 
                className="w-full"
              >
                Go to Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Route Testing */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Route Testing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button 
                onClick={() => testRouteNavigation('/dashboard')} 
                variant="outline" 
                size="sm"
              >
                Dashboard Home
              </Button>
              <Button 
                onClick={() => testRouteNavigation('/dashboard/analytics')} 
                variant="outline" 
                size="sm"
              >
                Analytics
              </Button>
              <Button 
                onClick={() => testRouteNavigation('/dashboard/users')} 
                variant="outline" 
                size="sm"
              >
                Users
              </Button>
              <Button 
                onClick={() => testRouteNavigation('/dashboard/billing')} 
                variant="outline" 
                size="sm"
              >
                Billing
              </Button>
              <Button 
                onClick={() => testRouteNavigation('/dashboard/permissions')} 
                variant="outline" 
                size="sm"
              >
                Permissions
              </Button>
              <Button 
                onClick={() => testRouteNavigation('/dashboard/usage')} 
                variant="outline" 
                size="sm"
              >
                Usage
              </Button>
              <Button 
                onClick={() => testRouteNavigation('/dashboard/settings')} 
                variant="outline" 
                size="sm"
              >
                Settings
              </Button>
              <Button 
                onClick={() => testRouteNavigation('/login')} 
                variant="destructive" 
                size="sm"
              >
                Login (Test)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Authentication State History */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Authentication State History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {authStateHistory.map((entry, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded text-xs">
                  <div className="font-medium text-gray-700 mb-1">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-600">
                    <div>Auth: {entry.state.isAuthenticated ? '✅' : '❌'}</div>
                    <div>Loading: {entry.state.isLoading ? '⏳' : '✅'}</div>
                    <div>User: {entry.state.hasUser ? '✅' : '❌'}</div>
                    <div>Path: {entry.state.pathname}</div>
                  </div>
                  {entry.state.userEmail && (
                    <div className="mt-1 text-gray-600">User: {entry.state.userEmail}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Organization & Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Organization & Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <strong>Organization:</strong>
              <div className="text-sm text-gray-600">
                {organization ? `${organization.code} (${organization.name})` : 'No organization'}
              </div>
            </div>
            <div>
              <strong>Permissions:</strong>
              <div className="text-sm text-gray-600">
                {permissions && permissions.length > 0 ? (
                  <div className="max-h-32 overflow-y-auto">
                    {permissions.map((permission, index) => (
                      <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded mb-1">
                        {permission}
                      </div>
                    ))}
                  </div>
                ) : (
                  'No permissions available'
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Actions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Emergency Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                size="sm"
              >
                Force Reload Page
              </Button>
              <Button 
                onClick={() => localStorage.clear()} 
                variant="destructive" 
                size="sm"
              >
                Clear All Local Storage
              </Button>
              <Button 
                onClick={() => {
                  localStorage.clear()
                  window.location.href = '/login'
                }} 
                variant="destructive" 
                size="sm"
              >
                Reset & Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 