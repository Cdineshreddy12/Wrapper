import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import toast from 'react-hot-toast';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Activity,
  RefreshCw
} from 'lucide-react';

interface PaymentAnalytics {
  overview: {
    totalRevenue: number;
    totalPayments: number;
    averagePayment: number;
    conversionRate: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
  };
  revenueChart: Array<{
    date: string;
    revenue: number;
    payments: number;
  }>;
  subscriptionMetrics: {
    newTrials: number;
    converted: number;
    expired: number;
    churnRate: number;
  };
  paymentsByStatus: Array<{
    status: string;
    count: number;
    amount: number;
    color: string;
  }>;
  planDistribution: Array<{
    plan: string;
    subscribers: number;
    revenue: number;
    color: string;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    description: string;
    createdAt: string;
    tenantName?: string;
  }>;
  cronJobStatus: {
    isRunning: boolean;
    jobs: Array<{
      name: string;
      schedule: string;
      description: string;
    }>;
  };
}

const COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777'];

export default function PaymentAnalytics() {
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("revenue");
  const { getToken } = useKindeAuth();

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      
      // Get the access token from Kinde
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/analytics/payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load payment analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600">No Data Available</h2>
          <p className="text-gray-500 mt-2">Unable to load payment analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive payment and subscription insights</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.overview.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {analytics.overview.totalPayments} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.overview.averagePayment.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Trial to paid conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Paying customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Subscriptions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.trialSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              In trial period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cron Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${analytics.cronJobStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-2xl font-bold">
                {analytics.cronJobStatus.isRunning ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.cronJobStatus.jobs.length} jobs configured
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analytics.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? `$${value}` : value,
                      name === 'revenue' ? 'Revenue' : 'Payments'
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Bar dataKey="payments" fill="#10b981" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">New Trials</span>
                  <Badge variant="secondary">{analytics.subscriptionMetrics.newTrials}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Converted</span>
                  <Badge variant="default">{analytics.subscriptionMetrics.converted}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Expired</span>
                  <Badge variant="destructive">{analytics.subscriptionMetrics.expired}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Churn Rate</span>
                  <Badge variant="outline">{analytics.subscriptionMetrics.churnRate.toFixed(1)}%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.planDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="subscribers"
                      label={({ plan, subscribers }) => `${plan}: ${subscribers}`}
                    >
                      {analytics.planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.paymentsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'amount' ? `$${value}` : value,
                        name === 'amount' ? 'Amount' : 'Count'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="Count" />
                    <Bar dataKey="amount" fill="#10b981" name="Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {analytics.recentPayments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center py-2 border-b">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{payment.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold">${payment.amount}</span>
                        <Badge 
                          variant={payment.status === 'succeeded' ? 'default' : 
                                  payment.status === 'failed' ? 'destructive' : 'secondary'}
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plan Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.planDistribution.map((plan, index) => (
                  <div key={plan.plan} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: plan.color || COLORS[index % COLORS.length] }}
                      ></div>
                      <div>
                        <h3 className="font-medium capitalize">{plan.plan}</h3>
                        <p className="text-sm text-gray-500">{plan.subscribers} subscribers</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">${plan.revenue.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cron Job Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className={`h-3 w-3 rounded-full ${analytics.cronJobStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">
                    System Status: {analytics.cronJobStatus.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                
                {analytics.cronJobStatus.jobs.map((job, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{job.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{job.description}</p>
                      </div>
                      <Badge variant="outline">{job.schedule}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 