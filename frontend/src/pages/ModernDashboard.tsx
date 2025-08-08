import React, { useEffect, useState, useCallback } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Users, 
  Activity, 
  CreditCard, 
  TrendingUp,
  Calendar,
  Clock,
  AlertTriangle,
  Crown,
  Zap,
  ArrowRight,
  Building,
  Plus,
  ExternalLink,
  Shield,
  Settings,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  BarChart3,
  Package,
  Target,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { useTrialStatus } from '@/hooks/useTrialStatus'

// Import our new reusable components
import { PageHeader, StatsHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { DataTable, DataTableColumn, DataTableAction } from '@/components/ui/data-table'
import { StatusBadge, UserStatusBadge, PaymentStatusBadge } from '@/components/ui/status-badge'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Components
import { ModernUserDashboard } from '@/components/users/ModernUserDashboard'

interface Employee {
  userId: string;
  email: string;
  name: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  onboardingCompleted: boolean;
  department?: string;
  title?: string;
}

interface Application {
  appId: string;
  appCode: string;
  appName: string;
  description: string;
  icon: string;
  baseUrl: string;
  isEnabled: boolean;
  subscriptionTier: string;
  enabledModules: string[];
  maxUsers: number;
  hostUrl: string;
}

interface PaymentStats {
  totalPaid: number;
  totalRefunded: number;
  successfulPayments: number;
  failedPayments: number;
  monthlySpend: number;
  averageTransactionValue: number;
  disputeCount: number;
  processingFees: number;
  totalRevenue: number;
  percentageChange: number;
}

export function ModernDashboard() {
  const { 
    user, 
    isAuthenticated, 
    isLoading: kindeLoading, 
    getToken,
    organization 
  } = useKindeAuth()
  
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedTab = searchParams.get('tab') || 'overview'
  
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

  // Check if user is admin
  const isAdmin = user?.email && (
    user.email.includes('admin') || 
    user.email === 'hellobrother9959@gmail.com' ||
    user.email === 'growthcrm7@gmail.com'
  )

  // Handle tab navigation
  const handleTabChange = useCallback((tab: string) => {
    navigate(`/dashboard?tab=${tab}`, { replace: true })
  }, [navigate])

  if (kindeLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
          {isCached && (
            <p className="text-xs text-gray-500 mt-2">
              Using cached data ({Math.round((cacheAge || 0) / 1000)}s old)
            </p>
          )}
        </div>
      </div>
    )
  }

  if (isTrialExpired && expiredData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-2xl mx-auto px-4">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-amber-100 mb-6">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Dashboard Access Limited
            </h2>
            
            <p className="text-gray-600 mb-6 text-lg">
              Your {expiredData.plan || 'trial'} has expired, but your data is safe! 
              Upgrade your plan to restore full dashboard access.
            </p>
            
            <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Affected features:</h3>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  Analytics & Reports
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  User Management
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  Application Access
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
                  Premium Features
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => navigate(expiredData?.isSubscriptionExpired ? '/billing?renew=true' : '/billing?upgrade=true')}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
                size="lg"
              >
                <Crown className="w-5 h-5" />
                {expiredData?.isSubscriptionExpired ? 'Renew Plan' : 'Upgrade Now'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                size="lg"
              >
                Return Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            There was a temporary issue loading your dashboard. Please try again.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={forceRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Please sign in to access the dashboard.</p>
        </div>
      </div>
    )
  }

  const dashboardStats = [
    {
      label: "Total Users",
      value: employees?.length || 0,
      icon: Users,
      trend: { value: "+12%", isPositive: true }
    },
    {
      label: "Active Applications",
      value: applications?.filter(app => app.isEnabled).length || 0,
      icon: Package
    },
    {
      label: "API Calls",
      value: formatNumber(metrics?.apiCalls || 0),
      icon: Activity,
      trend: { value: "+8%", isPositive: true }
    },
    {
      label: "Revenue",
      value: formatCurrency((paymentStats?.totalRevenue || 0) * 100),
      icon: DollarSign,
      trend: { value: `${paymentStats?.percentageChange || 0}%`, isPositive: (paymentStats?.percentageChange || 0) > 0 }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Main Dashboard Header */}
        <StatsHeader
          title="Dashboard"
          description={`Welcome back, ${user?.givenName || 'User'}! Here's what's happening with your organization.`}
          stats={dashboardStats}
          actions={
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={forceRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => navigate('/applications')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Application
              </Button>
            </div>
          }
        />

        {/* Dashboard Tabs */}
        <Tabs value={selectedTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab 
              data={{ applications, employees, paymentStats, metrics }}
              isLoading={isLoading}
              onRefresh={refreshDashboard}
            />
          </TabsContent>

          <TabsContent value="users">
            <ModernUserDashboard />
          </TabsContent>

          <TabsContent value="applications">
            <ApplicationsTab 
              applications={applications || []}
              isLoading={isLoading}
              onRefresh={refreshDashboard}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab 
              data={{ applications, employees, paymentStats, metrics }}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
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
  const recentUsers = data?.employees?.slice(0, 5) || [];
  const recentApplications = data?.applications?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <UserPlus className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Invite User</div>
                <div className="text-sm text-muted-foreground">Add team member</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <Package className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Add Application</div>
                <div className="text-sm text-muted-foreground">Connect new app</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <Settings className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Manage Roles</div>
                <div className="text-sm text-muted-foreground">Configure permissions</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Latest team members</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user: any) => (
                <div key={user.userId} className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <UserStatusBadge 
                    isActive={user.isActive}
                    onboardingCompleted={user.onboardingCompleted}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Applications</CardTitle>
              <CardDescription>Connected services</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApplications.map((app: any) => (
                <div key={app.appId} className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{app.appName}</p>
                    <p className="text-sm text-muted-foreground truncate">{app.description}</p>
                  </div>
                  <StatusBadge status={app.isEnabled ? 'active' : 'inactive'} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Applications Tab Component
function ApplicationsTab({ 
  applications, 
  isLoading, 
  onRefresh 
}: { 
  applications: Application[]; 
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const columns: DataTableColumn<Application>[] = [
    {
      key: 'app',
      label: 'Application',
      searchable: true,
      render: (app) => (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-medium">{app.appName}</div>
            <div className="text-sm text-muted-foreground">{app.description}</div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (app) => (
        <StatusBadge status={app.isEnabled ? 'active' : 'inactive'} />
      )
    },
    {
      key: 'tier',
      label: 'Tier',
      render: (app) => (
        <Badge variant="outline">{app.subscriptionTier}</Badge>
      )
    },
    {
      key: 'users',
      label: 'Max Users',
      render: (app) => app.maxUsers || 'Unlimited'
    }
  ];

  const actions: DataTableAction<Application>[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: (app) => console.log('View app:', app)
    },
    {
      key: 'configure',
      label: 'Configure',
      icon: Settings,
      onClick: (app) => console.log('Configure app:', app)
    },
    {
      key: 'external',
      label: 'Open App',
      icon: ExternalLink,
      onClick: (app) => window.open(app.baseUrl, '_blank')
    }
  ];

  return (
    <DataTable
      data={applications}
      columns={columns}
      actions={actions}
      loading={isLoading}
      getItemId={(app) => app.appId}
      title="Applications"
      description="Manage your connected applications and services"
      onRefresh={onRefresh}
      emptyMessage="No applications connected. Add your first application to get started."
    />
  )
}

// Analytics Tab Component
function AnalyticsTab({ 
  data, 
  isLoading 
}: { 
  data: any; 
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency((data?.paymentStats?.totalRevenue || 0) * 100)}
          icon={DollarSign}
          iconColor="text-green-600"
          trend={{
            value: `${data?.paymentStats?.percentageChange || 0}%`,
            isPositive: (data?.paymentStats?.percentageChange || 0) > 0,
            label: "vs last month"
          }}
          loading={isLoading}
        />
        <StatCard
          title="Successful Payments"
          value={data?.paymentStats?.successfulPayments || 0}
          icon={CheckCircle}
          iconColor="text-green-600"
          loading={isLoading}
        />
        <StatCard
          title="Failed Payments"
          value={data?.paymentStats?.failedPayments || 0}
          icon={AlertCircle}
          iconColor="text-red-600"
          loading={isLoading}
        />
        <StatCard
          title="Processing Fees"
          value={formatCurrency((data?.paymentStats?.processingFees || 0) * 100)}
          icon={CreditCard}
          iconColor="text-blue-600"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Overview</CardTitle>
          <CardDescription>Detailed insights into your organization's performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-muted-foreground mb-4">
              Detailed analytics and reporting features are coming soon.
            </p>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 