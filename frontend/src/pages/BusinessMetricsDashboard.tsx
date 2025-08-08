import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Shield, 
  DollarSign, 
  Users, 
  Star, 
  Activity,
  TrendingUp, 
  CheckCircle,
  Target,
  Zap,
  Clock,
  Database,
  AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api';

interface BusinessMetrics {
  summary: {
    totalImportantCalls: number;
    businessCriticalCalls: number;
    averageResponseTime: string;
    overallHitRate: string;
    activeApplications: number;
    activeUsers: number;
    totalApiCalls: number;
    tenantId: string;
  };
  criticalFeatures: Array<{
    name: string;
    category: string;
    priority: 'Critical' | 'High';
    calls: number;
    hitRate: string;
    avgResponseTime: string;
    businessImpact: string;
  }>;
  applicationPerformance: Record<string, {
    totalCalls: number;
    hitRate: string;
    avgResponseTime: string;
    features: string[];
    realtimeCalls: number;
    tenantId: string;
  }>;
  businessImpactMetrics: Record<string, {
    calls: number;
    hitRate: string;
    improvement: string;
  }>;
  performanceTrends: Array<{
    time: string;
    responseTime: number;
    hitRate: number;
    calls: number;
  }>;
  realTimeData: {
    currentUsage: Record<string, number>;
    totalApiCalls: number;
    activeUsers: number;
    cacheHitRate: string;
  };
  timestamp: string;
}

interface TenantUsage {
  tenantId: string;
  totalCalls: number;
  appBreakdown: Record<string, number>;
  timestamp: string;
}

const BusinessMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [tenantUsage, setTenantUsage] = useState<TenantUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch business metrics (only important features from Redis cache)
  const fetchMetrics = async () => {
    try {
      // Use the configured api instance instead of fetch to include auth headers
      const response = await api.get('/metrics/business-dashboard');
      const data = response.data;
      
      if (data.success && data.data) {
        setMetrics(data.data);
        console.log('✅ Business metrics loaded from Redis cache:', {
          cached: data.cached,
          totalCalls: data.data.summary?.totalImportantCalls,
          tenantId: data.data.summary?.tenantId,
          applications: Object.keys(data.data.applicationPerformance || {}).length
        });
      } else {
        console.warn('⚠️ No business metrics data available');
        setMetrics(null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Failed to fetch business metrics from Redis:', error);
      setMetrics(null);
      setLoading(false);
    }
  };

  // Fetch tenant-wise usage data from Redis cache
  const fetchTenantUsage = async () => {
    try {
      const response = await api.get('/metrics/tenant-usage');
      const data = response.data;
      
      if (data.success && data.data) {
        setTenantUsage(Array.isArray(data.data) ? data.data : [data.data]);
        console.log('✅ Tenant usage data loaded from Redis cache:', {
          tenantCount: Array.isArray(data.data) ? data.data.length : 1,
          data: data.data
        });
      } else {
        console.warn('⚠️ No tenant usage data available');
        setTenantUsage([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch tenant usage from Redis:', error);
      setTenantUsage([]);
    }
  };

  // No more mock data - all data comes from Redis cache

  useEffect(() => {
    fetchMetrics();
    fetchTenantUsage();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMetrics();
        fetchTenantUsage();
      }, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Get category icon and color
  const getCategoryDisplay = (category: string, priority: string) => {
    const isCritical = priority === 'Critical';
    
    switch (category) {
      case 'Security & Access Control':
      case 'Security & Compliance':
        return { 
          icon: <Shield className="w-4 h-4" />, 
          color: isCritical ? 'bg-red-100 text-red-800 border-red-200' : 'bg-red-50 text-red-700 border-red-100'
        };
      case 'Revenue Protection':
        return { 
          icon: <DollarSign className="w-4 h-4" />, 
          color: isCritical ? 'bg-green-100 text-green-800 border-green-200' : 'bg-green-50 text-green-700 border-green-100'
        };
      case 'User Conversion':
        return { 
          icon: <Users className="w-4 h-4" />, 
          color: isCritical ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-50 text-blue-700 border-blue-100'
        };
      case 'Product Experience':
        return { 
          icon: <Star className="w-4 h-4" />, 
          color: isCritical ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-purple-50 text-purple-700 border-purple-100'
        };
      default:
        return { 
          icon: <Activity className="w-4 h-4" />, 
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  // Chart colors
  const COLORS = ['#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4'];

  // Prepare chart data with safety checks
  const applicationData = metrics && metrics.applicationPerformance ? 
    Object.entries(metrics.applicationPerformance).map(([app, data]) => ({
      name: app,
      calls: data?.totalCalls || 0,
      hitRate: parseFloat(data?.hitRate || '0'),
      responseTime: parseFloat(data?.avgResponseTime || '0')
    })) : [];

  const businessImpactData = metrics && metrics.businessImpactMetrics ? 
    Object.entries(metrics.businessImpactMetrics).map(([key, data]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
      value: data?.calls || 0,
      hitRate: parseFloat(data?.hitRate || '0')
    })) : [];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Performance Dashboard</h1>
          <p className="text-gray-600 mt-1">Focus on what matters - Business-critical feature performance only</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Only Important Features
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Important Feature Calls</p>
                <p className="text-2xl font-bold text-blue-900">{metrics?.summary.totalImportantCalls.toLocaleString()}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Business Critical</p>
                <p className="text-2xl font-bold text-red-900">{metrics?.summary.businessCriticalCalls.toLocaleString()}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Cache Hit Rate</p>
                <p className="text-2xl font-bold text-green-900">{metrics?.summary.overallHitRate}</p>
              </div>
              <Database className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Avg Response Time</p>
                <p className="text-2xl font-bold text-purple-900">{metrics?.summary.averageResponseTime}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Active Apps</p>
                <p className="text-2xl font-bold text-orange-900">{metrics?.summary.activeApplications}</p>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">Active Users</p>
                <p className="text-2xl font-bold text-indigo-900">{metrics?.summary.activeUsers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert - Focus Message */}
      <Alert className="border-blue-200 bg-blue-50">
        <Target className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Focused Metrics:</strong> This dashboard shows only business-critical features. 
          System health checks, debug logs, and infrastructure monitoring are excluded to reduce noise and focus on what impacts your business.
        </AlertDescription>
      </Alert>

      {/* Tenant Usage Analytics */}
      {tenantUsage.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Tenant-wise API Usage (Redis Cache)
              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                Live Data
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {tenantUsage.slice(0, 6).map((tenant, index) => (
                <div key={tenant.tenantId} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{tenant.tenantId}</span>
                    <Badge variant="secondary">{tenant.totalCalls.toLocaleString()} calls</Badge>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(tenant.appBreakdown).map(([app, calls]) => (
                      <div key={app} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">{app}:</span>
                        <span className="font-medium">{calls.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Updated: {new Date(tenant.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
            {tenantUsage.length > 6 && (
              <div className="text-center mt-4">
                <Badge variant="outline">
                  +{tenantUsage.length - 6} more tenants
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Tenant Real-time Data */}
      {metrics?.realTimeData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-600" />
              Real-time Usage for Tenant: {metrics.summary.tenantId}
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                Live Redis Data
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(metrics.realTimeData.currentUsage).map(([app, calls]) => (
                <div key={app} className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-900">{calls.toLocaleString()}</div>
                  <div className="text-sm text-green-700 capitalize">{app}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>Cache Hit Rate: <strong className="text-green-600">{metrics.realTimeData.cacheHitRate}</strong></span>
              <span>Active Users: <strong className="text-blue-600">{metrics.realTimeData.activeUsers}</strong></span>
              <span>Total API Calls: <strong className="text-purple-600">{metrics.realTimeData.totalApiCalls.toLocaleString()}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Business-Critical Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics?.performanceTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="responseTime" 
                stackId="1" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
                name="Response Time (ms)"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="hitRate" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Hit Rate (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Features Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-600" />
              Business-Critical Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.criticalFeatures?.map((feature, index) => {
                const display = getCategoryDisplay(feature.category, feature.priority);
                return (
                  <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {display.icon}
                        <span className="font-medium ml-2">{feature.name}</span>
                      </div>
                      <Badge className={display.color}>
                        {feature.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{feature?.businessImpact || 'Business impact not available'}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Calls:</span>
                        <span className="font-medium ml-1">{feature?.calls?.toLocaleString() || '0'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Hit Rate:</span>
                        <span className="font-medium ml-1 text-green-600">{feature?.hitRate || '0%'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Avg Time:</span>
                        <span className="font-medium ml-1 text-blue-600">{feature?.avgResponseTime || '0ms'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Business Impact Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2 text-purple-600" />
              Business Impact Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={businessImpactData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {businessImpactData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {metrics && Object.entries(metrics.businessImpactMetrics).map(([key, data], index) => (
                <div key={key} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="font-medium">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-600 font-medium">{data.improvement}</span>
                    <span className="text-gray-500 ml-2">improvement</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-600" />
            Application Performance (Important Features Only)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={applicationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="calls" fill="#3b82f6" name="Important Feature Calls" />
              <Bar yAxisId="right" dataKey="hitRate" fill="#10b981" name="Hit Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-4 border-t">
        <p>Last updated: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleString() : 'Never'}</p>
        <p className="mt-1">
          <strong>Note:</strong> This dashboard focuses exclusively on business-critical features. 
          Infrastructure monitoring, health checks, and debug calls are filtered out for clarity.
        </p>
      </div>
    </div>
  );
};

export default BusinessMetricsDashboard; 