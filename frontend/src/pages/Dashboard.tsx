 import React, { useState, useCallback, useEffect } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import api, { applicationAssignmentAPI } from '../lib/api'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart
} from 'recharts'
import {
  Users,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  Crown,
  Building,
  ExternalLink,
  Shield,
  Settings,
  Eye,
  DollarSign,
  BarChart3,
  Package,
  CheckCircle,
  RefreshCw,
  Database,
  Coins
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { RoleManagementDashboard } from '@/components/roles/RoleManagementDashboard'
import { UserApplicationAccess } from '@/components/users/UserApplicationAccess'
import { ActivityDashboard } from '@/components/activity/ActivityDashboard'
import { UserManagementDashboard } from '@/components/users/UserManagementDashboard'
import AdminDashboard from '@/pages/AdminDashboard'
import  OrganizationManagement  from '@/components/OrganizationManagement'
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import { formatCurrency } from '@/lib/utils'
import { CreditBalance } from '@/components/CreditBalance'
import toast from 'react-hot-toast'

const mockUsageData = [
  { month: 'Jan', apiCalls: 1200, users: 45 },
  { month: 'Feb', apiCalls: 1900, users: 52 },
  { month: 'Mar', apiCalls: 2100, users: 61 },
  { month: 'Apr', apiCalls: 2400, users: 68 },
  { month: 'May', apiCalls: 2800, users: 75 },
  { month: 'Jun', apiCalls: 3200, users: 82 }
]

const mockRevenueData = [
  { month: 'Jan', revenue: 4200 },
  { month: 'Feb', revenue: 5100 },
  { month: 'Mar', revenue: 6800 },
  { month: 'Apr', revenue: 7200 },
  { month: 'May', revenue: 8900 },
  { month: 'Jun', revenue: 9800 }
]

export function Dashboard() {
  const {
    user,
    isLoading: kindeLoading
  } = useKindeAuth()

  const { tenantId } = useOrganizationAuth()

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  
  // Extract tab from both query params and path
  let selectedTab = searchParams.get('tab') || 'overview'
  
  // If no tab in query params, try to extract from path
  if (!searchParams.get('tab')) {
    const pathSegments = location.pathname.split('/')
    if (pathSegments.includes('user-apps')) {
      selectedTab = 'user-apps'
    } else if (pathSegments.includes('organizations')) {
      selectedTab = 'organizations'
    } else if (pathSegments.includes('users')) {
      selectedTab = 'users'
    } else if (pathSegments.includes('roles')) {
      selectedTab = 'roles'
    } else if (pathSegments.includes('analytics')) {
      selectedTab = 'analytics'
    }
  }
  
  // Use optimized dashboard data management
  const {
    applications,
    users: employees,
    paymentStats,
    metrics,
    isLoading,
    isError,
    isTrialExpired,
    refreshDashboard,
    forceRefresh,
    isCached,
    cacheAge
  } = useDashboardData()

  const { expiredData } = useTrialStatus()

  // Shared applications state for all tabs
  const [tenantApplications, setTenantApplications] = useState<any[]>(applications || [])

  // Load tenant applications when component mounts (for organizations tab)
  useEffect(() => {
    const loadTenantApplications = async () => {
      if (!tenantId) return;

      // If we already have applications, no need to reload
      if (tenantApplications && tenantApplications.length > 0) return;

      try {
        console.log('🏢 Loading tenant applications for dashboard:', tenantId);
        const response = await fetch('http://localhsot:3000/api/admin/application-assignments/tenant-apps/' + tenantId, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.applications) {
            const apps = data.data.applications;
            console.log('✅ Loaded tenant applications for dashboard:', apps.length, 'apps');
            setTenantApplications(apps);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load tenant applications for dashboard:', error);
      }
    };

    loadTenantApplications();
  }, [tenantId]); // Remove selectedTab dependency, load when component mounts
  
  // Check if user is admin
  const isAdmin = user?.email && (
    user.email.includes('admin') 
  )

  // Handle tab navigation
  const handleTabChange = useCallback((tab: string) => {
    console.log('Tab changed to:', tab)
    navigate(`/dashboard?tab=${tab}`, { replace: true })
  }, [navigate])

  // Debug logging for tab selection
  console.log('Dashboard render:', {
    selectedTab,
    pathname: location.pathname
  })

  // Legacy compatibility - convert new data format to old format for existing components
  const dashboardData = {
    applications: applications || [],
    employees: employees || [],
    paymentStats: paymentStats || {},
    metrics: metrics || { totalUsers: 0, apiCalls: 0, revenue: 0, growth: 0 }
  }

  if (kindeLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
          {isCached && cacheAge && (
            <p className="text-sm text-gray-500 mt-2">
              Using cached data ({Math.round((cacheAge || 0) / 1000)}s old)
            </p>
          )}
        </div>
      </div>
    )
  }

  // Show graceful trial expiry message instead of generic error
  if (isTrialExpired && expiredData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
        {/* TrialExpiryBanner has been completely removed from the application */}
        
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-2xl mx-auto px-4">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-amber-100 mb-6">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Dashboard Access Limited
            </h2>
            
            <p className="text-gray-600 mb-6 text-lg">
              Your {expiredData.plan || 'trial'} has expired, but don't worry! 
              Your data is safe and you can restore full access by upgrading your plan.
            </p>
            
            <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">What's affected:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  Dashboard and analytics
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  User management
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  API access
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  Premium features
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => window.location.href = expiredData?.isSubscriptionExpired ? '/billing?renew=true' : '/billing?upgrade=true'}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
                size="lg"
              >
                <Crown className="w-5 h-5" />
                {expiredData?.isSubscriptionExpired ? 'Renew Subscription' : 'Upgrade Now'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                size="lg"
              >
                Go to Home
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              Need help? <a href="mailto:support@example.com" className="text-amber-600 hover:underline">Contact our support team</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">There was a temporary issue loading your dashboard data.</p>
          <Button onClick={forceRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header with Refresh Controls */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back{user?.givenName ? `, ${user.givenName}` : ''}! 👋
              </h1>
              <p className="mt-2 text-gray-600">
                Here's what's happening with your account today
              </p>
              {isCached && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    Cached {Math.round((cacheAge || 0) / 1000)}s ago
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshDashboard}
                    className="gap-1 h-6 px-2 text-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={refreshDashboard}
                className="gap-2"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>

              {/* Compact Credit Balance */}
              <div className="hidden md:block">
                <CreditBalance compact={true} showPurchaseButton={false} showUsageStats={false} />
              </div>

              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => handleTabChange('admin')}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </Button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'credits', label: 'Credits', icon: Coins },
                  { id: 'organizations', label: 'Organizations', icon: Building },
                  { id: 'applications', label: 'Applications', icon: Package },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                  { id: 'users', label: 'Users', icon: Users },
                  { id: 'roles', label: 'Roles', icon: Shield },
                  { id: 'activity', label: 'Activity', icon: Activity },
                  ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Crown }] : [])
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`${
                        selectedTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {selectedTab === 'overview' && (
            <OverviewTab
              data={dashboardData}
              isLoading={isLoading}
              onRefresh={refreshDashboard}
            />
          )}

          {selectedTab === 'credits' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Credit Management</h3>
                  <p className="text-sm text-gray-600">Monitor your credit balance, usage, and purchase history</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/billing?purchase=true'}
                  className="gap-2"
                >
                  <Coins className="w-4 h-4" />
                  Purchase Credits
                </Button>
              </div>

              <CreditBalance
                showPurchaseButton={true}
                showUsageStats={true}
                compact={false}
                onPurchaseClick={() => {
                  window.location.href = '/billing?purchase=true';
                }}
              />

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common credit-related tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => window.location.href = '/billing?purchase=true'}
                    >
                      <Coins className="h-6 w-6" />
                      <span>Purchase Credits</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => window.location.href = '/billing?history=true'}
                    >
                      <TrendingUp className="h-6 w-6" />
                      <span>Usage History</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => window.location.href = '/billing'}
                    >
                      <DollarSign className="h-6 w-6" />
                      <span>Billing & Plans</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedTab === 'organizations' && (
            <div className="space-y-6">
              <OrganizationManagement
                employees={employees || []}
                applications={tenantApplications}
                isAdmin={isAdmin || false}
                tenantId={tenantId}
                makeRequest={async (endpoint: string, options?: RequestInit) => {
                  // Use enhanced api.ts for proper authentication and error handling
                  try {
                    // Vite proxy handles /api routing, so just ensure proper endpoint format
                    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
                    // Axios baseURL already includes /api, so don't add it again
                    const apiPath = normalizedEndpoint;

                    // Configure request with proper headers and convert body to data for axios
                    // Build axios-compatible headers object
                    const headers: Record<string, string> = { 'X-Application': 'crm' };
                    if (options?.headers) {
                      const h: any = options.headers as any;
                      if (typeof Headers !== 'undefined' && h instanceof Headers) {
                        h.forEach((value: any, key: string) => { headers[key] = String(value); });
                      } else if (Array.isArray(h)) {
                        h.forEach(([key, value]: [string, any]) => { headers[key] = String(value); });
                      } else {
                        Object.assign(headers, h as Record<string, string>);
                      }
                    }

                    const axiosConfig: any = {
                      method: options?.method,
                      headers,
                      withCredentials: true,
                    };

                    // Convert fetch-style body to axios-style data
                    if (options?.body) {
                      try {
                        axiosConfig.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
                      } catch {
                        axiosConfig.data = options.body;
                      }
                    }

                    const response = await api(apiPath, axiosConfig);
                    return response.data;
                  } catch (error: any) {
                    console.error('API request failed:', error);
                    throw error;
                  }
                }}
                loadDashboardData={refreshDashboard}
                inviteEmployee={() => {
                  // Navigate to users tab to open invitation modal
                  setSelectedTab('users');
                  // The UserManagementDashboard component will handle the invitation
                }}
              />
            </div>
          )}

          {selectedTab === 'applications' && (
            <>
              {console.log('🎯 Rendering ApplicationsTab for selectedTab:', selectedTab)}
              <ApplicationsTab onApplicationsLoaded={setTenantApplications} />
            </>
          )}
          
          {selectedTab === 'analytics' && (
            <AnalyticsTab />
          )}
          
          {selectedTab === 'users' && (
            <div className="space-y-6">
              {isAdmin || user?.email ? (
                <UserManagementDashboard />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
                    <p className="text-gray-600">You need admin permissions to view user management.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {selectedTab === 'roles' && (
            <div className="space-y-6">
              {isAdmin || user?.email ? (
                <RoleManagementDashboard />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
                    <p className="text-gray-600">You need admin permissions to view role management.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {selectedTab === 'user-apps' && (
            <div className="space-y-6">
              {isAdmin || user?.email ? (
                <UserApplicationAccess />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
                    <p className="text-gray-600">You need admin permissions to view user application access.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          {selectedTab === 'activity' && (
            <div className="space-y-6">
              <ActivityDashboard />
            </div>
          )}
          
          {selectedTab === 'admin' && isAdmin && (
            <AdminDashboard />
          )}
        </div>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ 
  data, 
  isLoading, 
  onRefresh 
}: { 
  data: any; 
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const { metrics, applications } = data
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers}
          icon={Users}
          trend="+12%"
          color="blue"
          isLoading={isLoading}
        />
        <MetricCard
          title="Active Apps"
          value={applications.filter((app: any) => app.status === 'active').length}
          icon={Package}
          trend="+3"
          color="green"
          isLoading={isLoading}
        />
        <MetricCard
          title="Revenue"
          value={formatCurrency(metrics.revenue)}
          icon={DollarSign}
          trend={`+${metrics.growth}%`}
          color="purple"
          isLoading={isLoading}
        />
        <MetricCard
          title="System Health"
          value={metrics.systemHealth === 'good' ? 'Excellent' : 'Warning'}
          icon={metrics.systemHealth === 'good' ? CheckCircle : AlertTriangle}
          trend="99.9%"
          color={metrics.systemHealth === 'good' ? 'green' : 'yellow'}
          isLoading={isLoading}
        />
      </div>

      {/* Credit Balance Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Credit Balance</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard?tab=credits')}
            className="gap-2"
          >
            <Coins className="w-4 h-4" />
            View Details
          </Button>
        </div>
        <CreditBalance
          showPurchaseButton={true}
          showUsageStats={true}
          compact={false}
          onPurchaseClick={() => {
            // Navigate to billing page or open purchase modal
            window.location.href = '/billing?purchase=true';
          }}
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>API calls and user growth over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="apiCalls" fill="#3B82F6" />
                <Bar dataKey="users" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue growth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
          <CardDescription>Access key features and management tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => navigate('/dashboard?tab=credits')}
            >
              <Coins className="h-6 w-6" />
              <span>Credit Management</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => navigate('/dashboard?tab=user-apps')}
            >
              <Database className="h-6 w-6" />
              <span>User Application Access</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Connected Applications</CardTitle>
            <CardDescription>Your integrated applications and their status</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map((app: any) => (
              <div
                key={app.appId}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{app.appName}</h4>
                  <Badge 
                    variant={app.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {app.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{app.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Users: {app.userCount || 0}</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Analytics Tab Component  
function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
          <p className="text-gray-600 mb-4">
            Detailed analytics and insights are coming soon.
          </p>
          <Button variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            View Reports
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}



// Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  isLoading
}: {
  title: string
  value: string | number
  icon: any
  trend: string
  color: string
  isLoading: boolean
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    yellow: 'text-yellow-600 bg-yellow-100'
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{trend} from last month</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ApplicationsTab({ onApplicationsLoaded }: { onApplicationsLoaded?: (apps: any[]) => void }) {
  console.log('🎯 ApplicationsTab component rendered');

  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showAppDetails, setShowAppDetails] = useState(false);

  // Get tenant information
  const { tenantId, isAuthenticated } = useOrganizationAuth();

  console.log('🔑 ApplicationsTab tenant info:', { tenantId, isAuthenticated });

  // Fetch tenant-specific applications
  const fetchApplications = useCallback(async () => {
    console.log('🔍 ApplicationsTab debug:', {
      tenantId,
      isAuthenticated,
      isAuthenticatedType: typeof isAuthenticated
    });

    if (!tenantId) {
      console.log('🚫 Cannot fetch applications - no tenant ID available');
      setApplications([]);
      setIsLoading(false);
      return;
    }

    if (isAuthenticated === false) {
      console.log('🚫 Cannot fetch applications - user not authenticated');
      setApplications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Fetching tenant applications for:', tenantId);

      console.log('📡 About to call applicationAssignmentAPI.getTenantApplications with tenantId:', tenantId);
      const response = await applicationAssignmentAPI.getTenantApplications(tenantId);
      console.log('📥 API Response received:', response);
      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', response.data);

      const data = response.data?.data?.applications || response.data?.applications || [];

      console.log('✅ Fetched tenant applications:', data?.length || 0, 'applications');
      console.log('📋 Application data structure:', data);

      setApplications(data || []);
      onApplicationsLoaded?.(data || []);
    } catch (error: any) {
      console.error('❌ Failed to fetch applications:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data
      });
      toast.error(`Failed to load applications: ${error?.message || 'Unknown error'}`);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, isAuthenticated]);

  // Refresh function
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Refreshing applications...');
    await fetchApplications();
    toast.success('Applications refreshed successfully');
  }, [fetchApplications]);

  // Load applications on component mount and when tenant changes
  useEffect(() => {
    console.log('🔄 ApplicationsTab useEffect triggered');
    console.log('🔍 Current state:', { tenantId, isAuthenticated });

    if (tenantId && isAuthenticated !== false) {
      console.log('✅ Conditions met, calling fetchApplications');
      fetchApplications();
    } else {
      console.log('❌ Conditions not met, skipping fetchApplications');
    }
  }, [fetchApplications, tenantId, isAuthenticated]);

  const getApplicationIcon = (appCode: string) => {
    const icons: Record<string, React.ReactNode> = {
      'crm': <Users className="w-6 h-6" />,
      'hr': <Building className="w-6 h-6" />,
      'affiliate': <TrendingUp className="w-6 h-6" />,
      'system': <Settings className="w-6 h-6" />,
      'finance': <PieChart className="w-6 h-6" />,
      'inventory': <Package className="w-6 h-6" />,
      'analytics': <Activity className="w-6 h-6" />
    };
    return icons[appCode] || <Package className="w-6 h-6" />;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewApp = (app: any) => {
    setSelectedApp(app);
    setShowAppDetails(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Applications</h3>
            <p className="text-sm text-gray-600">Manage your organization's applications and modules</p>
          </div>
          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 border border-gray-200 rounded-lg animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Applications</h3>
          <p className="text-sm text-gray-600">
            Your organization has access to {applications.length} applications
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Applications Available</h4>
            <p className="text-gray-600 mb-4">
              Contact your administrator to enable applications for your organization.
            </p>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
              <Card key={app.appId} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewApp(app)}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        {getApplicationIcon(app.appCode)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{app.appName || 'Unknown App'}</h4>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{app.appCode || 'N/A'}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(app.isEnabled ? 'active' : 'inactive')}>
                      {app.isEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {app.description || 'No description available'}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Subscription Tier:</span>
                      <Badge variant="outline" className="capitalize">
                        {typeof app.subscriptionTier === 'object' ? 'Basic' : (app.subscriptionTier || 'Basic')}
                      </Badge>
                    </div>

                    {app.modules && app.modules.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Modules:</span>
                        <span className="font-medium text-gray-900">
                          {app.enabledModules?.length || 0} enabled / {app.modules.length} available
                        </span>
                      </div>
                    )}

                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Button variant="ghost" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Application Details Modal */}
          <Dialog open={showAppDetails} onOpenChange={setShowAppDetails}>
            <DialogContent className="max-w-2xl max-h-[80vh] min-h-[400px] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    {selectedApp && getApplicationIcon(selectedApp.appCode)}
                  </div>
                  <div>
                    <DialogTitle>{selectedApp?.appName || 'Unknown Application'}</DialogTitle>
                    <DialogDescription>{selectedApp?.description || 'No description available'}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {selectedApp && (
                <div className="flex-1 overflow-y-auto space-y-6 py-2 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {/* Application Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Application Code</label>
                        <p className="text-sm text-gray-900 uppercase">{selectedApp.appCode}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <Badge className={getStatusColor(typeof selectedApp.status === 'object' ? 'active' : selectedApp.status || 'active')}>
                          {typeof selectedApp.status === 'object' ? 'Active' : (selectedApp.status || 'Active')}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Subscription Tier</label>
                        <p className="text-sm text-gray-900 capitalize">{typeof selectedApp.subscriptionTier === 'object' ? 'Basic' : (selectedApp.subscriptionTier || 'Basic')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Access</label>
                        <p className="text-sm text-gray-900">
                          {selectedApp.isEnabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Modules Section */}
                  {selectedApp.modules && selectedApp.modules.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Modules</h4>
                      <div className="space-y-4">
                        {selectedApp.modules.map((module: any) => {
                          const isModuleEnabled = selectedApp.enabledModules?.includes(module.moduleCode);
                          const modulePermissions = selectedApp.enabledModulesPermissions?.[module.moduleCode] || [];
                          const customPermissions = selectedApp.customPermissions?.[module.moduleCode] || [];

                          return (
                            <div key={module.moduleId} className="p-4 border border-gray-200 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-gray-900">{module.moduleName || 'Unknown Module'}</h5>
                                  {isModuleEnabled && (
                                    <Badge className="bg-green-100 text-green-800">
                                      Enabled
                                    </Badge>
                                  )}
                                </div>
                                <Badge variant={module.isCore ? "default" : "outline"}>
                                  {module.isCore ? 'Core' : 'Optional'}
                                </Badge>
                              </div>

                              <p className="text-sm text-gray-600 mb-3">{module.description || 'No description available'}</p>

                              {/* Module Permissions */}
                              {module.permissions && module.permissions.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h6 className="text-sm font-medium text-gray-700">Available Permissions</h6>
                                    <span className="text-xs text-gray-500">{module.permissions.length} total</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {module.permissions.map((permission: any, index: number) => {
                                      const permissionText = typeof permission === 'string' ? permission : permission.code || permission.name || 'Unknown';
                                      const isEnabled = isModuleEnabled && (modulePermissions.includes(permissionText) || customPermissions.includes(permissionText));
                                      return (
                                        <Badge
                                          key={index}
                                          variant="outline"
                                          className={`text-xs ${
                                            isEnabled
                                              ? 'bg-green-50 text-green-700 border-green-200'
                                              : 'bg-gray-50 text-gray-600 border-gray-200'
                                          }`}
                                        >
                                          {permissionText}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Custom Permissions for this module */}
                              {customPermissions && customPermissions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    <h6 className="text-sm font-medium text-gray-700">Custom Permissions</h6>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {customPermissions.map((permission: any, index: number) => {
                                      const permissionText = typeof permission === 'string' ? permission : permission.code || permission.name || 'Unknown';
                                      return (
                                        <Badge
                                          key={index}
                                          variant="outline"
                                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                        >
                                          {permissionText}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Enabled Modules */}
                  {selectedApp.enabledModules && Array.isArray(selectedApp.enabledModules) && selectedApp.enabledModules.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Enabled Modules</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedApp.enabledModules.map((moduleCode: string) => (
                          <Badge key={moduleCode} variant="outline" className="text-green-600">
                            {moduleCode}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
                <Button variant="outline" onClick={() => setShowAppDetails(false)}>
                  Close
                </Button>
                {selectedApp?.baseUrl && (
                  <Button onClick={() => window.open(selectedApp.baseUrl, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Application
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
} 
