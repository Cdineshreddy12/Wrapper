import { EmptyState } from "@/components/common/EmptyState";
import { IconButton } from "@/components/common/LoadingButton";
import { MetricCard } from "@/components/common/MetricCard";
import { Container, Flex, Grid, Section } from "@/components/common/Page";
import { Typography } from "@/components/common/Typography";
import { CreditBalance } from "@/components/CreditBalance";
import { BarChart } from "@/components/Charts/BarChart";
import { LinearChart } from "@/components/Charts/LinearChart";
import { ChartConfig } from "@/components/ui/chart";
import {
  Badge,
} from "@/components/ui";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  Package,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Eye,
  Coins,
  Database,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock data for charts and analytics
const mockUsageData = [
  { month: "Jan", apiCalls: 1200, users: 45 },
  { month: "Feb", apiCalls: 1900, users: 52 },
  { month: "Mar", apiCalls: 2100, users: 61 },
  { month: "Apr", apiCalls: 2400, users: 68 },
  { month: "May", apiCalls: 2800, users: 75 },
  { month: "Jun", apiCalls: 3200, users: 82 },
];

const usageChartConfig: ChartConfig = {
  apiCalls: { label: "API Calls", color: "#3B82F6" },
  users: { label: "Users", color: "#10B981" },
};

const revenueChartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "#8B5CF6" },
};

const mockRevenueData = [
  { month: "Jan", revenue: 4200 },
  { month: "Feb", revenue: 5100 },
  { month: "Mar", revenue: 6800 },
  { month: "Apr", revenue: 7200 },
  { month: "May", revenue: 8900 },
  { month: "Jun", revenue: 9800 },
];

export function OverviewPage() {
  const { metrics, applications, isLoading, refreshDashboard } =
    useDashboardData();
  const navigate = useNavigate();

  return (
    <Container>
      {/* Key Metrics */}
      <Section
        title="Key Metrics"
        description="Overview of your system performance and usage"
        variant="card"
        showDivider
        loading={isLoading}
      >
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
            value={
              applications.filter((app: any) => app.status === "active").length
            }
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
            value={metrics.systemHealth === "good" ? "Excellent" : "Warning"}
            icon={metrics.systemHealth === "good" ? CheckCircle : AlertTriangle}
            trend="99.9%"
            color={metrics.systemHealth === "good" ? "green" : "yellow"}
            isLoading={isLoading}
          />
        </Grid>
      </Section>

      {/* Credit Balance Section */}
      <Section
        title="Credit Balance and Usage Statistics"
        description="Manage your credits and billing"
        variant="card"
        showDivider={true}
        headerActions={[
          {
            label: "View Details",
            onClick: () => navigate("/dashboard?tab=credits"),
            variant: "outline",
            icon: Eye
          }
        ]}
      >
        <CreditBalance
          showPurchaseButton={true}
          showUsageStats={true}
          compact={false}
          onPurchaseClick={() => {
            // Navigate to billing page or open purchase modal
            window.location.href = "/billing?purchase=true";
          }}
        />
      </Section>

      {/* Charts and Recent Activity */}
      <Grid columns={{ sm: 1, lg: 2 }} gap={6}>
        <Section
          title="Usage Overview"
          description="API calls and user growth over time"
          variant="card"
          showDivider={true}
        >
          <BarChart
            data={mockUsageData}
            config={usageChartConfig}
            xAxisKey="month"
            dataKeys={["apiCalls", "users"]}
            height={300}
            showGrid={true}
            showTooltip={true}
            radius={6}
            strokeWidth={2}
          />
        </Section>

        <Section
          title="Revenue Trend"
          description="Monthly revenue growth"
          variant="card"
          showDivider={true}
        >
          <LinearChart
            data={mockRevenueData}
            config={revenueChartConfig}
            xAxisKey="month"
            dataKey="revenue"
            height={300}
            strokeWidth={3}
            stroke="#8B5CF6"
            type="monotone"
            showDots={true}
            dotSize={4}
            tooltipLabelFormatter={(value) => formatCurrency(value as number)}
          />
        </Section>
      </Grid>

      {/* Quick Access */}
      <Section
        title="Quick Access"
        description="Access key features and management tools"
        variant="card"
        showDivider={true}
      >
        <Grid columns={{ sm: 1, md: 2 }} gap={4}>
          <IconButton
            variant="outline"
            onClick={() => navigate("/dashboard?tab=credits")}
            startIcon={Coins}
            className="h-16 justify-start text-left"
          >
            <Flex direction="col" align="start" >
              <Typography variant="large">Credit Management</Typography>
              <Typography variant="muted">Manage your credits and billing</Typography>
            </Flex>
          </IconButton>
          <IconButton
            variant="outline"
            onClick={() => navigate("/dashboard?tab=user-apps")}
            startIcon={Database}
            className="h-16 justify-start text-left"
          >
            <Flex direction="col" align="start">
              <Typography variant="large">User Application Access</Typography>
              <Typography variant="muted">Control user permissions</Typography>
            </Flex>
          </IconButton>
        </Grid>
      </Section>

      {/* Recent Applications */}
      <Section
        title="Connected Applications"
        description="Your integrated applications and their status"
        variant="card"
        showDivider={true}
        headerActions={[
          {
            label: "Refresh",
            onClick: refreshDashboard,
            loading: isLoading,
            variant: "outline",
            icon: RefreshCw
          }
        ]}
        badges={applications.length > 0 ? [{ text: `${applications.length} apps`, variant: "secondary" }] : []}
        loading={isLoading}
      >
        {applications.length === 0 ? (
          <EmptyState
            title="No applications connected"
            description="Connect your applications to get started"
            icon={Package}
            showCard={false}
          />
        ) : (
          <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={4}>
            {applications.map((app: any) => (
              <div
                key={app.appId}
                className="group p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-primary/20 transition-all duration-200 bg-card"
              >
                <Flex align="center" justify="between" gap={2} className="mb-2">
                  <Typography variant="h4" className="font-semibold group-hover:text-primary transition-colors">
                    {app.appName}
                  </Typography>
                  <Badge
                    variant={
                      app.status === "active" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {app.status}
                  </Badge>
                </Flex>
                <Typography variant="muted" className="mb-3 line-clamp-2">
                  {app.description}
                </Typography>
                <Flex align="center" justify="between" gap={2}>
                  <Typography variant="muted" className="text-sm">
                    Users: {app.userCount || 0}
                  </Typography>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    startIcon={ExternalLink}
                  />
                </Flex>
              </div>
            ))}
          </Grid>
        )}
      </Section>
    </Container>
  );
}
