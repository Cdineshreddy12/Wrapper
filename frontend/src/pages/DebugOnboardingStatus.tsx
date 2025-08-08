import React, { useState, useEffect } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  User, 
  Building, 
  Database,
  Settings,
  AlertTriangle,
  RotateCcw
} from 'lucide-react'
import { onboardingAPI } from '@/lib/api'
import { resetOnboardingStatus } from '@/hooks/usePostLoginRedirect'
import toast from 'react-hot-toast'

export default function DebugOnboardingStatus() {
  const { user, isAuthenticated, isLoading } = useKindeAuth()
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  const [debugLoading, setDebugLoading] = useState(false)

  const fetchOnboardingStatus = async () => {
    if (!isAuthenticated || !user) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Fetching onboarding status...')
      const response = await onboardingAPI.checkStatus()
      setOnboardingStatus(response.data)
      console.log('📊 Onboarding status:', response.data)
    } catch (err: any) {
      console.error('❌ Error fetching onboarding status:', err)
      setError(err.response?.data?.message || err.message || 'Failed to fetch onboarding status')
    } finally {
      setLoading(false)
    }
  }

  const handleResetOnboarding = async () => {
    setResetLoading(true)
    try {
      await resetOnboardingStatus()
      toast.success('Onboarding status reset successfully!')
      // Refresh status after reset
      setTimeout(() => {
        fetchOnboardingStatus()
      }, 1000)
    } catch (err: any) {
      console.error('❌ Error resetting onboarding:', err)
      toast.error(err.response?.data?.message || 'Failed to reset onboarding status')
    } finally {
      setResetLoading(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!onboardingStatus?.user?.id && !onboardingStatus?.organization?.id) {
      toast.error('No organization ID found - user may need to complete onboarding first')
      return
    }

    setResetLoading(true)
    try {
      const orgId = onboardingStatus.organization?.id || 'temp-org-id'
      await onboardingAPI.markComplete(orgId)
      toast.success('Onboarding marked as complete!')
      // Refresh status
      setTimeout(() => {
        fetchOnboardingStatus()
      }, 1000)
    } catch (err: any) {
      console.error('❌ Error marking onboarding complete:', err)
      toast.error(err.response?.data?.message || 'Failed to mark onboarding complete')
    } finally {
      setResetLoading(false)
    }
  }

  const handleRefresh = async () => {
    await fetchOnboardingStatus()
  }

  const handleSyncUser = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const result = await onboardingAPI.syncUser()
      console.log('✅ User sync result:', result)
      toast.success('User synced to database successfully!')
      // Refresh status after a short delay
      setTimeout(() => {
        fetchOnboardingStatus()
      }, 1000)
    } catch (err: any) {
      console.error('❌ Error syncing user:', err)
      toast.error(err.response?.data?.message || 'Failed to sync user')
    } finally {
      setLoading(false)
    }
  }

  const handleDebugUser = async () => {
    if (!user?.id) return
    
    setDebugLoading(true)
    try {
      const response = await fetch(`/api/onboarding/debug-user/${user.id}`, {
        credentials: 'include'
      })
      const result = await response.json()
      setDebugData(result.data)
      console.log('🔍 Debug data:', result.data)
      toast.success('Debug data fetched successfully!')
    } catch (err: any) {
      console.error('❌ Error fetching debug data:', err)
      toast.error('Failed to fetch debug data')
    } finally {
      setDebugLoading(false)
    }
  }

  const handleReset = async () => {
    await handleResetOnboarding()
  }

  useEffect(() => {
    fetchOnboardingStatus()
  }, [isAuthenticated, user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Not Authenticated</h2>
            <p className="text-gray-600">Please log in to debug onboarding status.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🔍 Onboarding Status Debug</h1>
            <p className="text-gray-600 mt-2">Troubleshoot and fix onboarding redirect issues</p>
          </div>
          <Button 
            onClick={fetchOnboardingStatus} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>ID:</strong> {user.id}
              </div>
              <div>
                <strong>Email:</strong> {user.email}
              </div>
              <div>
                <strong>Name:</strong> {user.givenName} {user.familyName}
              </div>
              <div>
                <strong>Authenticated:</strong> 
                <Badge variant={isAuthenticated ? "default" : "destructive"} className="ml-2">
                  {isAuthenticated ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>API Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Onboarding Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Onboarding Status
              {onboardingStatus && (
                <Badge variant={onboardingStatus.isOnboarded ? "default" : "destructive"}>
                  {onboardingStatus.isOnboarded ? 'Complete' : 'Incomplete'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading status...</span>
              </div>
            ) : onboardingStatus ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>Is Onboarded:</strong> 
                    <Badge variant={onboardingStatus.isOnboarded ? "default" : "destructive"} className="ml-2">
                      {onboardingStatus.isOnboarded ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <strong>Needs Onboarding:</strong>
                    <Badge variant={onboardingStatus.needsOnboarding ? "destructive" : "default"} className="ml-2">
                      {onboardingStatus.needsOnboarding ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <strong>Current Step:</strong> {onboardingStatus.onboardingStep || 'Not set'}
                  </div>
                  <div>
                    <strong>User ID:</strong> {onboardingStatus.user?.id || 'Not found'}
                  </div>
                </div>

                {/* Organization Info */}
                {onboardingStatus.organization ? (
                  <div className="mt-6">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Building className="h-4 w-4" />
                      Organization
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 p-4 rounded">
                      <div><strong>ID:</strong> {onboardingStatus.organization.id}</div>
                      <div><strong>Name:</strong> {onboardingStatus.organization.name}</div>
                      <div><strong>Subdomain:</strong> {onboardingStatus.organization.subdomain}</div>
                      <div><strong>Domain:</strong> {onboardingStatus.organization.domain}</div>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>No Organization Found:</strong> User doesn't have an associated organization. 
                      This is likely why onboarding redirects are happening.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Raw Data */}
                <details className="mt-6">
                  <summary className="cursor-pointer font-semibold mb-2">View Raw API Response</summary>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                    {JSON.stringify(onboardingStatus, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={handleRefresh} 
                disabled={loading}
                className="w-full"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
              
              <Button 
                onClick={handleSyncUser} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <User className="mr-2 h-4 w-4" />
                Sync User to Database
              </Button>

              <Button 
                onClick={handleDebugUser} 
                disabled={debugLoading}
                variant="secondary"
                className="w-full"
              >
                <Database className={`mr-2 h-4 w-4 ${debugLoading ? 'animate-spin' : ''}`} />
                Debug Organizations & Roles
              </Button>
              
              <Button 
                onClick={handleReset} 
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Onboarding (Testing)
              </Button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded">
              <h4 className="font-semibold mb-2">Troubleshooting Steps:</h4>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>If "Needs Onboarding" is Yes, use "Sync User to Database" to fix it</li>
                <li>If no organization is found, user needs to complete onboarding properly</li>
                <li>Use "Debug Organizations & Roles" to check Kinde assignments</li>
                <li>Use "Reset Onboarding" to start fresh if needed</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Debug Data Display */}
        {debugData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Organization & Role Debug Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                
                {/* Database Data */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database Records
                  </h4>
                  
                  {/* User Record */}
                  <div className="mb-4">
                    <h5 className="font-medium mb-2">User Record:</h5>
                    {debugData.database?.user ? (
                      <div className="bg-green-50 p-3 rounded border">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>User ID:</strong> {debugData.database.user.userId}</div>
                          <div><strong>Kinde ID:</strong> {debugData.database.user.kindeUserId}</div>
                          <div><strong>Email:</strong> {debugData.database.user.email}</div>
                          <div><strong>Name:</strong> {debugData.database.user.name}</div>
                          <div><strong>Onboarding Complete:</strong> 
                            <Badge variant={debugData.database.user.onboardingCompleted ? "default" : "destructive"} className="ml-1">
                              {debugData.database.user.onboardingCompleted ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          <div><strong>Is Admin:</strong> 
                            <Badge variant={debugData.database.user.isTenantAdmin ? "default" : "secondary"} className="ml-1">
                              {debugData.database.user.isTenantAdmin ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <span className="text-red-600">❌ No user record found in database</span>
                      </div>
                    )}
                  </div>

                  {/* Tenant Record */}
                  <div className="mb-4">
                    <h5 className="font-medium mb-2">Organization/Tenant Record:</h5>
                    {debugData.database?.tenant ? (
                      <div className="bg-green-50 p-3 rounded border">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>Tenant ID:</strong> {debugData.database.tenant.tenantId}</div>
                          <div><strong>Company:</strong> {debugData.database.tenant.companyName}</div>
                          <div><strong>Subdomain:</strong> {debugData.database.tenant.subdomain}</div>
                          <div><strong>Kinde Org ID:</strong> {debugData.database.tenant.kindeOrgId}</div>
                          <div><strong>Admin Email:</strong> {debugData.database.tenant.adminEmail}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <span className="text-red-600">❌ No organization record found in database</span>
                      </div>
                    )}
                  </div>

                  {/* User Roles */}
                  <div className="mb-4">
                    <h5 className="font-medium mb-2">Assigned Roles ({debugData.database?.roles?.length || 0}):</h5>
                    {debugData.database?.roles && debugData.database.roles.length > 0 ? (
                      <div className="space-y-2">
                        {debugData.database.roles.map((role: any, index: number) => (
                          <div key={index} className="bg-blue-50 p-3 rounded border">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><strong>Role:</strong> {role.roleName}</div>
                              <div><strong>Role ID:</strong> {role.roleId}</div>
                              <div><strong>Assigned:</strong> {new Date(role.assignedAt).toLocaleDateString()}</div>
                              <div><strong>Permissions:</strong> 
                                <Badge variant="outline" className="ml-1">
                                  {Object.keys(role.permissions || {}).length} modules
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Show permissions summary */}
                            {role.permissions && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs font-medium">View Permissions</summary>
                                <pre className="text-xs mt-1 bg-white p-2 rounded border overflow-auto max-h-32">
                                  {JSON.stringify(role.permissions, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <span className="text-yellow-600">⚠️ No roles assigned in database</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kinde Data */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Kinde Records
                  </h4>
                  
                  {/* Kinde Organizations */}
                  <div className="mb-4">
                    <h5 className="font-medium mb-2">Kinde Organizations:</h5>
                    {debugData.kinde?.organizations ? (
                      <div className="bg-green-50 p-3 rounded border">
                        <pre className="text-xs overflow-auto max-h-32">
                          {JSON.stringify(debugData.kinde.organizations, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <span className="text-red-600">❌ Could not fetch Kinde organizations</span>
                      </div>
                    )}
                  </div>

                  {/* Kinde Roles */}
                  <div className="mb-4">
                    <h5 className="font-medium mb-2">Kinde Roles:</h5>
                    {debugData.kinde?.roles ? (
                      <div className="bg-green-50 p-3 rounded border">
                        <pre className="text-xs overflow-auto max-h-32">
                          {JSON.stringify(debugData.kinde.roles, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <span className="text-red-600">❌ Could not fetch Kinde roles</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Analysis */}
                <div className="bg-gray-50 p-4 rounded">
                  <h5 className="font-medium mb-2">Analysis:</h5>
                  <ul className="text-sm space-y-1">
                    <li>
                      <strong>User Record:</strong> 
                      <Badge variant={debugData.database?.user ? "default" : "destructive"} className="ml-1">
                        {debugData.database?.user ? 'Found' : 'Missing'}
                      </Badge>
                    </li>
                    <li>
                      <strong>Organization:</strong> 
                      <Badge variant={debugData.database?.tenant ? "default" : "destructive"} className="ml-1">
                        {debugData.database?.tenant ? 'Found' : 'Missing'}
                      </Badge>
                    </li>
                    <li>
                      <strong>Roles Assigned:</strong> 
                      <Badge variant={debugData.database?.roles?.length > 0 ? "default" : "destructive"} className="ml-1">
                        {debugData.database?.roles?.length || 0} roles
                      </Badge>
                    </li>
                    <li>
                      <strong>Kinde Assignment:</strong> 
                      <Badge variant={debugData.kinde?.organizations ? "default" : "destructive"} className="ml-1">
                        {debugData.kinde?.organizations ? 'Connected' : 'Failed'}
                      </Badge>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Links */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <a href="/dashboard" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                Dashboard
              </a>
              <a href="/billing" className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                Normal Billing
              </a>
              <a href="/direct-billing" className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700">
                Direct Billing
              </a>
              <a href="/onboarding" className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">
                Onboarding
              </a>
              <a href="/debug-auth" className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">
                Debug Auth
              </a>
              <a href="/role-permission-manager" className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                🛡️ Role Manager
              </a>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
} 