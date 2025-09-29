import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  AreaChart,
  Area
} from 'recharts'
import { 
  Download, 
  Filter, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { analyticsAPI } from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/utils'
import { Typography } from '@/components/common/Typography'
import { IconButton } from '@/components/common/LoadingButton'

export function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('all')

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['analytics-metrics', selectedPeriod],
    queryFn: () => analyticsAPI.getMetrics(selectedPeriod).then(res => res.data),
  })

  const { data: performanceData } = useQuery({
    queryKey: ['analytics-performance'],
    queryFn: () => analyticsAPI.getPerformance().then(res => res.data),
  })

  const { data: reportsData } = useQuery({
    queryKey: ['analytics-reports'],
    queryFn: () => analyticsAPI.getReports().then(res => res.data),
  })

  const handleExport = async (type: string) => {
    try {
      const response = await analyticsAPI.exportData(type)
      // Handle file download
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${type}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const apiMetrics = metricsData?.api || {}
  const userMetrics = metricsData?.users || {}
  const performanceMetrics = performanceData || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h1">Analytics</Typography>
          <Typography variant="muted">Detailed insights into your platform performance</Typography>
        </div>
        <div className="flex items-center gap-2">
          <IconButton variant="outline" size="sm" startIcon={Filter}>
            Filter
          </IconButton>
          <IconButton variant="outline" size="sm" startIcon={Download} onClick={() => handleExport('all')}>
            Export
          </IconButton>
        </div>
      </div>

      {/* Period Selection */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Period:</span>
        {['7d', '30d', '90d', '1y'].map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(period)}
          >
            {period}
          </Button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="muted">Total API Calls</Typography>
                <Typography variant="h2">{formatNumber(apiMetrics.total || 0)}</Typography>
                <Typography variant="muted">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{apiMetrics.growth || 0}% vs last period
                </Typography>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="muted">Active Users</Typography>
                <Typography variant="h2">{formatNumber(userMetrics.active || 0)}</Typography>
                <Typography variant="muted">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{userMetrics.growth || 0}% vs last period
                </Typography>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="muted">Avg Response Time</Typography>
                <Typography variant="h2">{performanceMetrics.avgResponseTime || 0}ms</Typography>
                <Typography variant="muted">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -{performanceMetrics.improvement || 0}% improvement
                </Typography>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Overview</TabsTrigger>
          <TabsTrigger value="api">API Usage</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Calls Over Time</CardTitle>
                <CardDescription>Daily API usage for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metricsData?.apiUsage || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="calls" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>Daily active users</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricsData?.userActivity || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="activeUsers" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Endpoint Usage</CardTitle>
                <CardDescription>Most popular endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={metricsData?.endpoints || []} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="endpoint" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Error Rates</CardTitle>
                  <CardDescription>API error distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">2xx Success</span>
                      </div>
                      <span className="font-medium">95.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">4xx Client Error</span>
                      </div>
                      <span className="font-medium">3.1%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm">5xx Server Error</span>
                      </div>
                      <span className="font-medium">1.7%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rate Limiting</CardTitle>
                  <CardDescription>Throttled requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Requests</span>
                      <span className="font-medium">{formatNumber(apiMetrics.total || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rate Limited</span>
                      <span className="font-medium text-red-600">{formatNumber(apiMetrics.rateLimited || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rate Limit %</span>
                      <Badge variant="secondary">
                        {((apiMetrics.rateLimited || 0) / (apiMetrics.total || 1) * 100).toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData?.userGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="newUsers" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Retention</CardTitle>
                <CardDescription>User activity retention rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Day 1</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-gray-200 rounded-full">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Day 7</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-gray-200 rounded-full">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                      <span className="text-sm font-medium">65%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Day 30</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-gray-200 rounded-full">
                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trends</CardTitle>
                <CardDescription>API response times over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData?.responseTimes || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="avg" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Average"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="p95" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="95th Percentile"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>Recent analytics reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reportsData?.map((report: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{report.name}</p>
                  <p className="text-sm text-gray-600">
                    Generated on {formatDate(report.createdAt)}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-4">No reports available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 