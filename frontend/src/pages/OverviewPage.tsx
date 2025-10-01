import LoadingButton, { IconButton } from '@/components/common/LoadingButton';
import { MetricCard } from '@/components/common/MetricCard';
import { Container, Flex, Grid } from '@/components/common/Page';
import { Typography } from '@/components/common/Typography';
import { CreditBalance } from '@/components/CreditBalance';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/lib/utils';
import { Users, Package, DollarSign, CheckCircle, AlertTriangle, Eye, Coins, Database, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line, BarChart, LineChart } from 'recharts';


// Mock data for charts and analytics
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

export function OverviewPage() {
    const { metrics, applications, isLoading, refreshDashboard } = useDashboardData()
    const navigate = useNavigate()

    return (
        <Container>
            {/* Key Metrics */}
            <Grid columns={{ sm: 1, md: 2, lg: 4 }} gap={6}>
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
            </Grid>

            {/* Credit Balance Section */}
            <>
                <Flex align="center" justify="between" gap={6}>
                    <Typography variant="h3">Credit Balance</Typography>
                    <IconButton
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/dashboard?tab=credits')}
                        startIcon={Eye}
                    >
                        View Details
                    </IconButton>
                </Flex>
                <CreditBalance
                    showPurchaseButton={true}
                    showUsageStats={true}
                    compact={false}
                    onPurchaseClick={() => {
                        // Navigate to billing page or open purchase modal
                        window.location.href = '/billing?purchase=true';
                    }}
                />
            </>

            {/* Charts and Recent Activity */}
            <Grid columns={{ sm: 1, lg: 2 }} gap={6}>
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
            </Grid>

            {/* Quick Access */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Access</CardTitle>
                    <CardDescription>Access key features and management tools</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <IconButton
                            variant="outline"
                            onClick={() => navigate('/dashboard?tab=credits')}
                            startIcon={Coins}
                        >
                            Credit Management
                        </IconButton>
                        <IconButton
                            variant="outline"
                            onClick={() => navigate('/dashboard?tab=user-apps')}
                            startIcon={Database}
                        >
                            User Application Access
                        </IconButton>
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
                    <LoadingButton variant="outline" size="sm" onClick={refreshDashboard} isLoading={isLoading}>
                        Refresh
                    </LoadingButton>
                </CardHeader>
                <CardContent>
                    <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={4}>
                        {applications.map((app: any) => (
                            <div
                                key={app.appId}
                                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                            >
                                <Flex align="center" justify="between" gap={2}>
                                    <Typography variant="h4">{app.appName}</Typography>
                                    <Badge
                                        variant={app.status === 'active' ? 'default' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {app.status}
                                    </Badge>
                                </Flex>
                                <Typography variant="muted">{app.description}</Typography>
                                <Flex align="center" justify="between" gap={2}>
                                    <Typography variant="muted">Users: {app.userCount || 0}</Typography>
                                    <IconButton variant="ghost" size="sm" startIcon={ExternalLink} />
                                </Flex>
                            </div>
                        ))}
                    </Grid>
                </CardContent>
            </Card>
        </Container>
    )
}
