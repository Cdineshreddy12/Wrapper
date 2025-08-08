import React, { useEffect, useState, useCallback } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  PieChart,
  Pie,
  Cell
} from 'recharts'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PaymentHistory } from '@/components/PaymentHistory'
import { analyticsAPI, usageAPI, subscriptionAPI } from '@/lib/api'
import { formatCurrency, formatNumber } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { UserManagementDashboard } from '@/components/users/UserManagementDashboard'
import { OptimizedRoleManagementDashboard } from '@/components/roles/OptimizedRoleManagementDashboard'
import { UserRoleManager } from '@/components/users/UserRoleManager'
import PaymentAnalytics from '@/pages/PaymentAnalytics'
import { ActivityDashboard } from '@/components/activity/ActivityDashboard'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useTrialStatus } from '@/hooks/useTrialStatus'

interface DashboardMetrics {
  totalUsers: number
  apiCalls: number
  revenue: number
  growth: number
}

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function Dashboard() {
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
  
  // Legacy state for compatibility with existing UI
  const [selectedView, setSelectedView] = useState('overview')
  const [activeTimeRange, setActiveTimeRange] = useState('7d')
  
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

  // Handle view changes
  const handleViewChange = useCallback((view: string) => {
    setSelectedView(view)
  }, [])

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
        {/* Removed TrialExpiryBanner from here - it's handled at app level */}
        
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
          
          {selectedTab === 'applications' && (
            <ApplicationsTab 
              applications={applications || []}
              isLoading={isLoading}
              onRefresh={refreshDashboard}
            />
          )}
          
          {selectedTab === 'analytics' && (
            <AnalyticsTab 
              data={dashboardData}
              isLoading={isLoading}
            />
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
                <OptimizedRoleManagementDashboard />
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
          
          {selectedTab === 'activity' && (
            <div className="space-y-6">
              <ActivityDashboard />
            </div>
          )}
          
          {selectedTab === 'admin' && isAdmin && (
            <AdminTab 
              data={dashboardData}
              isLoading={isLoading}
              onRefresh={refreshDashboard}
            />
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
  const { metrics, applications, employees } = data

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
function AnalyticsTab({ data, isLoading }: { data: any; isLoading: boolean }) {
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

// Admin Tab Component
function AdminTab({ 
  data, 
  isLoading, 
  onRefresh 
}: { 
  data: any; 
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Admin Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start gap-2">
              <Users className="w-4 h-4" />
              Manage Users
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Shield className="w-4 h-4" />
              Role Management
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Settings className="w-4 h-4" />
              System Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Healthy
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Operational
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Storage</span>
              <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                78% Used
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <PaymentAnalytics />
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

function ApplicationsTab({ 
  applications, 
  isLoading, 
  onRefresh 
}: { 
  applications: any[]; 
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showAppDetails, setShowAppDetails] = useState(false);

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
        <Button variant="outline" size="sm" onClick={onRefresh}>
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
            <Button variant="outline" onClick={onRefresh}>
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
                        <h4 className="font-semibold text-gray-900">{app.appName}</h4>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{app.appCode}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(app.status || 'active')}>
                      {app.status || 'Active'}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {app.description || 'No description available'}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Subscription Tier:</span>
                      <Badge variant="outline" className="capitalize">
                        {app.subscriptionTier || 'Basic'}
                      </Badge>
                    </div>

                    {app.modules && app.modules.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Modules:</span>
                        <span className="font-medium text-gray-900">{app.modules.length} available</span>
                      </div>
                    )}

                    {app.enabledModules && Array.isArray(app.enabledModules) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Enabled:</span>
                        <span className="font-medium text-green-600">
                          {app.enabledModules.length} modules
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    {selectedApp && getApplicationIcon(selectedApp.appCode)}
                  </div>
                  <div>
                    <DialogTitle>{selectedApp?.appName}</DialogTitle>
                    <DialogDescription>{selectedApp?.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {selectedApp && (
                <div className="space-y-6">
                  {/* Application Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Application Code</label>
                        <p className="text-sm text-gray-900 uppercase">{selectedApp.appCode}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <Badge className={getStatusColor(selectedApp.status || 'active')}>
                          {selectedApp.status || 'Active'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Subscription Tier</label>
                        <p className="text-sm text-gray-900 capitalize">{selectedApp.subscriptionTier || 'Basic'}</p>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedApp.modules.map((module: any) => (
                          <div key={module.moduleId} className="p-3 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">{module.moduleName}</h5>
                              <Badge variant={module.isCore ? "default" : "outline"}>
                                {module.isCore ? 'Core' : 'Optional'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{module.description}</p>
                            {module.permissions && module.permissions.length > 0 && (
                              <p className="text-xs text-gray-500">
                                {module.permissions.length} permissions available
                              </p>
                            )}
                          </div>
                        ))}
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

              <DialogFooter>
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
