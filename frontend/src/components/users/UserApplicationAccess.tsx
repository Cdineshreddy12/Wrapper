import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  RefreshCw, 
  Users, 
  Eye, 
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Settings,
  Database,
  RotateCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { userSyncAPI } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface UserClassification {
  userId: string
  name: string
  email: string
  allowedApplications: string[]
  roles: Array<{ roleId: string, roleName: string }>
  classificationReason: {
    primary: string
    accessMethod: string
    allowedAppCount: number
  }
}

interface ApplicationGroup {
  appInfo: {
    appCode: string
    appName: string
    description: string
  }
  users: UserClassification[]
  totalUsers: number
}

interface ClassificationData {
  summary: {
    totalUsers: number
    applicationBreakdown: Record<string, number>
    subscriptionBreakdown: Record<string, number>
  }
  byApplication: Record<string, ApplicationGroup>
  byUser: Record<string, UserClassification>
}

export function UserApplicationAccess() {
  const [selectedApp, setSelectedApp] = useState<string>('all')
  const [syncLoading, setSyncLoading] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Add a simple fallback for immediate rendering
  console.log('UserApplicationAccess component mounted')

  // Add error handling for API calls
  const handleApiError = (error: any, operation: string) => {
    console.error(`API Error in ${operation}:`, error)
    toast.error(`Failed to ${operation}: ${error.response?.data?.message || error.message}`)
  }

  // Get user classification
  const { data: classificationData, isLoading: classificationLoading, refetch: refetchClassification, error: classificationError } = useQuery<{
    success: boolean
    data: ClassificationData
  }>({
    queryKey: ['user-classification'],
    queryFn: () => userSyncAPI.getUserClassification().then(res => res.data),
    retry: 1,
  })

  // Get sync status
  const { data: syncStatusData, isLoading: syncStatusLoading, error: syncStatusError } = useQuery<{
    success: boolean
    data: {
      tenantId: string
      summary: { totalUsers: number }
      applicationStatus: Record<string, {
        userCount: number
        applicationUrl: string
        isConfigured: boolean
        status: string
      }>
    }
  }>({
    queryKey: ['sync-status'],
    queryFn: () => userSyncAPI.getSyncStatus().then(res => res.data),
    retry: 1,
  })

  // Debug logging for API data
  useEffect(() => {
    console.log('🔍 Frontend Debug - classificationData:', classificationData);
    console.log('🔍 Frontend Debug - syncStatusData:', syncStatusData);
    
    if (classificationData?.data) {
      console.log('🔍 Frontend Debug - classificationData.data keys:', Object.keys(classificationData.data));
      console.log('🔍 Frontend Debug - byApplication:', classificationData.data.byApplication);
      console.log('🔍 Frontend Debug - summary:', classificationData.data.summary);
      
      // More detailed logging
      console.log('🔍 Frontend Debug - classificationData.data.byApplication type:', typeof classificationData.data.byApplication);
      console.log('🔍 Frontend Debug - classificationData.data.byApplication length:', Object.keys(classificationData.data.byApplication).length);
      console.log('🔍 Frontend Debug - classificationData.data.byApplication stringified:', JSON.stringify(classificationData.data.byApplication));
    }
    
    if (syncStatusData?.data) {
      console.log('🔍 Frontend Debug - syncStatusData.data keys:', Object.keys(syncStatusData.data));
      console.log('🔍 Frontend Debug - applicationStatus:', syncStatusData.data.applicationStatus);
      
      // More detailed logging
      console.log('🔍 Frontend Debug - syncStatusData.data.applicationStatus type:', typeof syncStatusData.data.applicationStatus);
      console.log('🔍 Frontend Debug - syncStatusData.data.applicationStatus length:', Object.keys(syncStatusData.data.applicationStatus).length);
      console.log('🔍 Frontend Debug - syncStatusData.data.applicationStatus stringified:', JSON.stringify(syncStatusData.data.applicationStatus));
    }
  }, [classificationData, syncStatusData]);

  // Sync all users mutation
  const syncAllMutation = useMutation({
    mutationFn: (options: { dryRun?: boolean } = {}) => userSyncAPI.syncAllUsers(options),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Users synced successfully')
      queryClient.invalidateQueries({ queryKey: ['user-classification'] })
      queryClient.invalidateQueries({ queryKey: ['sync-status'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to sync users')
    }
  })

  // Sync specific application mutation
  const syncAppMutation = useMutation({
    mutationFn: ({ appCode }: { appCode: string }) => userSyncAPI.syncUsersForApplication(appCode),
    onMutate: ({ appCode }) => {
      setSyncLoading(appCode)
    },
    onSuccess: (response, { appCode }) => {
      toast.success(`${appCode.toUpperCase()} users synced successfully`)
      queryClient.invalidateQueries({ queryKey: ['user-classification'] })
      setSyncLoading(null)
    },
    onError: (error: any, { appCode }) => {
      toast.error(`Failed to sync ${appCode.toUpperCase()} users`)
      setSyncLoading(null)
    }
  })

  // Test connectivity mutation
  const testConnectivityMutation = useMutation({
    mutationFn: () => userSyncAPI.testConnectivity(),
    onSuccess: (response) => {
      const results = response.data.data
      const available = results.summary.available
      const total = results.summary.total
      toast.success(`Connectivity test: ${available}/${total} applications available`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Connectivity test failed')
    }
  })

  // Individual user sync mutation
  const syncUserMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) => userSyncAPI.syncUser(userId),
    onSuccess: (response, { userId }) => {
      const userData = Object.values(classificationData?.data.byUser || {}).find(u => u.userId === userId)
      toast.success(`${userData?.name || 'User'} synced successfully`)
      queryClient.invalidateQueries({ queryKey: ['user-classification'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to sync user')
    }
  })

  const handleSyncAll = (dryRun = false) => {
    syncAllMutation.mutate({ dryRun })
  }

  const handleSyncApp = (appCode: string) => {
    syncAppMutation.mutate({ appCode })
  }

  const handleTestConnectivity = () => {
    testConnectivityMutation.mutate()
  }

  const handleSyncUser = (userId: string) => {
    syncUserMutation.mutate({ userId })
  }

  const getApplications = () => {
    if (!classificationData?.data.byApplication) return []
    return Object.entries(classificationData.data.byApplication)
      .map(([appCode, appData]) => ({ appCode, ...appData }))
      .sort((a, b) => b.totalUsers - a.totalUsers)
  }

  const getFilteredUsers = () => {
    if (!classificationData?.data) return []
    
    if (selectedApp === 'all') {
      return Object.values(classificationData.data.byUser)
    }
    
    const appData = classificationData.data.byApplication[selectedApp]
    return appData?.users || []
  }

  const getAccessMethodColor = (method: string) => {
    switch (method) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'role_based': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Debug logging
  console.log('UserApplicationAccess render:', {
    classificationLoading,
    syncStatusLoading,
    classificationData,
    syncStatusData,
    selectedApp
  })

  if (classificationLoading || syncStatusLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading user classification...</span>
      </div>
    )
  }

  // Show error state if no data
  if (!classificationData?.data) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">User Application Access</h1>
            <p className="text-gray-600 mt-1">
              Manage user access to applications and synchronize users across systems
            </p>
          </div>
        </div>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Component state and API responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Classification Loading:</strong> {classificationLoading ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Sync Status Loading:</strong> {syncStatusLoading ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Classification Error:</strong> 
                {classificationError ? (
                  <span className="text-red-600">Yes - {classificationError.message}</span>
                ) : (
                  <span className="text-green-600">No</span>
                )}
              </div>
              <div>
                <strong>Sync Status Error:</strong>
                {syncStatusError ? (
                  <span className="text-red-600">Yes - {syncStatusError.message}</span>
                ) : (
                  <span className="text-green-600">No</span>
                )}
              </div>
              <div>
                <strong>Classification Data:</strong> 
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(classificationData, null, 2)}
                </pre>
              </div>
              <div>
                <strong>Sync Status Data:</strong>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(syncStatusData, null, 2)}
                </pre>
              </div>
              <Button 
                onClick={() => refetchClassification()} 
                className="mt-2"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Classification
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Application Access</h1>
          <p className="text-gray-600 mt-1">
            Manage user access to applications and synchronize users across systems
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleTestConnectivity}
            disabled={testConnectivityMutation.isPending}
          >
            <Activity className="h-4 w-4 mr-2" />
            Test Connectivity
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSyncAll(true)}
            disabled={syncAllMutation.isPending}
          >
            <Eye className="h-4 w-4 mr-2" />
            Dry Run
          </Button>
          <Button 
            onClick={() => handleSyncAll(false)}
            disabled={syncAllMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {syncAllMutation.isPending ? 'Syncing...' : 'Sync All Users'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{classificationData?.data.summary.totalUsers || 0}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">
                  {Object.keys(classificationData?.data.byApplication || {}).length}
                </p>
                <p className="text-sm text-gray-600">Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">
                  {Object.keys(syncStatusData?.data?.applicationStatus || {}).filter(
                    app => syncStatusData?.data?.applicationStatus[app]?.isConfigured
                  ).length}
                </p>
                <p className="text-sm text-gray-600">Configured Apps</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">
                  {Object.values(classificationData?.data.summary.applicationBreakdown || {})
                    .reduce((sum, count) => sum + count, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Access Grants</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedApp} onValueChange={setSelectedApp}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="sync-management">Sync Management</TabsTrigger>
          {getApplications().slice(0, 4).map(app => (
            <TabsTrigger key={app.appCode} value={app.appCode}>
              {app.appInfo.appName} ({app.totalUsers})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="sync-management" className="mt-6">
          <div className="space-y-6">
            {/* Enhanced Sync Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Sync Operations</CardTitle>
                  <CardDescription>
                    Synchronize users to all their accessible applications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Button 
                      onClick={() => handleSyncAll(true)}
                      disabled={syncAllMutation.isPending}
                      className="w-full"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {syncAllMutation.isPending ? 'Running Preview...' : 'Preview Sync (Dry Run)'}
                    </Button>
                    
                    <Button 
                      onClick={() => handleSyncAll(false)}
                      disabled={syncAllMutation.isPending}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {syncAllMutation.isPending ? 'Syncing All Users...' : 'Sync All Users'}
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Quick Stats</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Users:</span>
                        <span className="ml-2 font-medium">{classificationData?.data.summary.totalUsers || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Applications:</span>
                        <span className="ml-2 font-medium">{Object.keys(classificationData?.data.byApplication || {}).length}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Application Connectivity</CardTitle>
                  <CardDescription>
                    Test and monitor external application connections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleTestConnectivity}
                    disabled={testConnectivityMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    {testConnectivityMutation.isPending ? 'Testing...' : 'Test All Connections'}
                  </Button>
                  
                  <div className="space-y-2">
                    {Object.entries(syncStatusData?.data.applicationStatus || {}).map(([appCode, status]) => (
                      <div key={appCode} className="flex justify-between items-center p-2 border rounded">
                        <span className="text-sm font-medium">{appCode.toUpperCase()}</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${status.isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-xs text-gray-600">{status.userCount} users</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Application-Specific Sync */}
            <Card>
              <CardHeader>
                <CardTitle>Application-Specific Sync</CardTitle>
                <CardDescription>
                  Sync users to individual applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getApplications().map(app => (
                    <div key={app.appCode} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{app.appInfo.appName}</h4>
                        <Badge variant="secondary">{app.totalUsers} users</Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600">{app.appInfo.description}</p>
                      
                      <div className="space-y-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSyncApp(app.appCode)}
                          disabled={syncLoading === app.appCode}
                          className="w-full"
                        >
                          {syncLoading === app.appCode ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RotateCw className="h-4 w-4 mr-2" />
                          )}
                          Sync {app.appCode.toUpperCase()}
                        </Button>
                        
                        <div className="text-xs text-gray-500 text-center">
                          Status: {syncStatusData?.data.applicationStatus[app.appCode]?.isConfigured ? 
                            <span className="text-green-600">Configured</span> : 
                            <span className="text-red-600">Not Configured</span>
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User-Level Management */}
            <Card>
              <CardHeader>
                <CardTitle>Individual User Management</CardTitle>
                <CardDescription>
                  Manage application access for specific users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.values(classificationData?.data.byUser || {}).slice(0, 10).map(user => (
                    <div key={user.userId} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-800">
                            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{user.name}</h4>
                          <p className="text-xs text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {user.allowedApplications.map(app => (
                            <Badge key={app} variant="outline" className="text-xs">
                              {app.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleSyncUser(user.userId)}
                          disabled={syncUserMutation.isPending}
                          title={`Sync ${user.name} to ${user.allowedApplications.length} applications`}
                        >
                          <RefreshCw className={`h-3 w-3 ${syncUserMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(classificationData?.data.byUser || {}).length > 10 && (
                    <div className="text-center pt-2">
                      <span className="text-sm text-gray-500">
                        Showing 10 of {Object.keys(classificationData?.data.byUser || {}).length} users
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Application Access Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Application Access Summary</CardTitle>
                <CardDescription>
                  Users grouped by application access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getApplications().map(app => (
                    <div key={app.appCode} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{app.appInfo.appName}</h4>
                        <p className="text-sm text-gray-600">{app.appInfo.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{app.totalUsers} users</Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSyncApp(app.appCode)}
                          disabled={syncLoading === app.appCode}
                        >
                          {syncLoading === app.appCode ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sync Status */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Status</CardTitle>
                <CardDescription>
                  Application connectivity and configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(syncStatusData?.data.applicationStatus || {}).map(([appCode, status]) => (
                    <div key={appCode} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{appCode.toUpperCase()}</h4>
                        <p className="text-sm text-gray-600">{status.applicationUrl}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={status.isConfigured ? "default" : "destructive"}
                          className={status.isConfigured ? "bg-green-100 text-green-800" : ""}
                        >
                          {status.isConfigured ? 'Configured' : 'Not Configured'}
                        </Badge>
                        <span className="text-sm text-gray-600">{status.userCount} users</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {getApplications().map(app => (
          <TabsContent key={app.appCode} value={app.appCode} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{app.appInfo.appName} Users</CardTitle>
                <CardDescription>
                  Users with access to {app.appInfo.appName} ({app.totalUsers} users)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {app.users.map(user => (
                    <div key={user.userId} className="flex justify-between items-center p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-800">
                            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getAccessMethodColor(user.classificationReason.accessMethod)}>
                          {user.classificationReason.accessMethod.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {user.allowedApplications.length} apps
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Users Table for All Users View */}
      {selectedApp === 'all' && (
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Complete list of users and their application access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getFilteredUsers().map(user => (
                <div key={user.userId} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-800">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{user.name}</h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">{user.classificationReason.primary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getAccessMethodColor(user.classificationReason.accessMethod)}>
                      {user.classificationReason.accessMethod.replace('_', ' ')}
                    </Badge>
                    {user.allowedApplications.map(app => (
                      <Badge key={app} variant="outline" className="text-xs">
                        {app.toUpperCase()}
                      </Badge>
                    ))}
                    {user.roles.map(role => (
                      <Badge key={role.roleId} variant="secondary" className="text-xs">
                        {role.roleName}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
