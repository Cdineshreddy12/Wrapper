import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, AlertTriangle, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { creditAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ThemeBadge, ThemeBadgeProps } from './common/ThemeBadge';
import { Flex, Section } from './common/Page';
import { Typography } from './common/Typography';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui';

interface CreditBalanceProps {
  showPurchaseButton?: boolean;
  showUsageStats?: boolean;
  compact?: boolean;
  onPurchaseClick?: () => void;
  className?: string;
}

interface CreditAllocation {
  allocationId: string;
  tenantId: string;
  sourceEntityId: string;
  targetApplication: string;
  allocatedCredits: number;
  usedCredits: number;
  availableCredits: number;
  allocationType: string;
  allocationPurpose?: string;
  allocatedAt: string;
  expiresAt?: string;
  autoReplenish: boolean;
}

export function CreditBalance({
  showPurchaseButton = true,
  showUsageStats = true,
  compact = false,
  onPurchaseClick,
  className
}: CreditBalanceProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch credit balance
  const {
    data: creditData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['credit', 'balance'],
    queryFn: async () => {
      const response = await creditAPI.getCurrentBalance();
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch usage summary
  const { data: usageData } = useQuery({
    queryKey: ['credit', 'usage'],
    queryFn: async () => {
      const response = await creditAPI.getUsageSummary();
      return response.data.data;
    },
    enabled: showUsageStats
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Credit balance refreshed');
    } catch (error) {
      toast.error('Failed to refresh credit balance');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusVariant = (availableCredits: number, lowBalanceThreshold: number): ThemeBadgeProps['variant'] => {
    if (availableCredits <= lowBalanceThreshold * 0.1) return 'critical';
    if (availableCredits <= lowBalanceThreshold) return 'low';
    return 'success';
  };


  const getStatusText = (availableCredits: number, lowBalanceThreshold: number) => {
    if (availableCredits <= lowBalanceThreshold * 0.1) return 'Critical';
    if (availableCredits <= lowBalanceThreshold) return 'Low';
    return 'Good';
  };

  if (isLoading) {
    return (
      <Section
        title="Credit Balance"
        description="Your available credits and usage"
        variant="card"
        loading={true}
        className={className}
      >
        <div />
      </Section>
    );
  }

  if (error || !creditData) {
    return (
      <Section
        title="Credit Balance"
        description="Your available credits and usage"
        variant="minimal"
        error="Failed to load credit balance"
        headerActions={[
          {
            label: "Retry",
            onClick: handleRefresh,
            loading: isRefreshing,
            variant: "outline",
            icon: RefreshCw
          }
        ]}
        className={className}
      >
        <div />
      </Section>
    );
  }

  const {
    availableCredits = 0,
    totalCredits = 0,
    reservedCredits = 0,
    lowBalanceThreshold = 100,
    criticalBalanceThreshold = 10,
    creditExpiry,
    alerts = [],
    usageThisPeriod = 0,
    periodType = 'month',
    applicationAllocations // New field for application allocations
  } = creditData;

  const usagePercentage = totalCredits > 0 ? (usageThisPeriod / totalCredits) * 100 : 0;
  const isLowBalance = availableCredits <= lowBalanceThreshold;
  const isCriticalBalance = availableCredits <= criticalBalanceThreshold;

  if (compact) {
    return (
      <Section
        title="Credit Balance"
        description="Your available credits and usage"
        variant="minimal"
        className={className}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Coins className="h-6 w-6 text-amber-500" />
            <div>
              <Typography variant="small" className="text-gray-900">
                {availableCredits.toLocaleString()} credits
              </Typography>
              <Typography variant="caption" className="text-gray-500">
                {totalCredits.toLocaleString()} total
              </Typography>
            </div>
          </div>
          <ThemeBadge variant={getStatusVariant(availableCredits, lowBalanceThreshold)}>
            {getStatusText(availableCredits, lowBalanceThreshold)}
          </ThemeBadge>
        </div>
      </Section>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6">
      {/* Main Credit Balance Section */}
      <Section
        title="Credit Balance"
        description="Your available credits and usage"
        showDivider={true}
        variant="minimal"
        headerActions={[
          {
            label: "Refresh",
            onClick: handleRefresh,
            loading: isRefreshing,
            variant: "outline",
            icon: RefreshCw
          }
        ]}
        className={className}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Available Credits */}
          <div className="text-center space-y-2">
            <Typography variant="h2" >
              {availableCredits.toLocaleString()}
            </Typography>
            <Typography variant="label" className='block'>Available Credits</Typography>
            <ThemeBadge variant={getStatusVariant(availableCredits, lowBalanceThreshold)}>
              {getStatusText(availableCredits, lowBalanceThreshold)}
            </ThemeBadge>
          </div>

          {/* Total Credits */}
          <div className="text-center space-y-2">
            <Typography variant="h2" >
              {totalCredits.toLocaleString()}
            </Typography>
            <Typography variant="label" className='block'>Total Credits</Typography>
            <Typography variant="caption" >
              {reservedCredits} reserved
            </Typography>
          </div>

          {/* Usage This Period */}
          <div className="text-center space-y-2">
            <Typography variant="h2" >
              {usageThisPeriod.toLocaleString()}
            </Typography>
            <Typography variant="label" className='block'>Used This {periodType}</Typography>
            <Typography variant="caption" >
              {usagePercentage.toFixed(1)}% of total
            </Typography>
          </div>
        </div>

        {/* Usage Progress Bar */}
        {showUsageStats && (
          <div className="space-y-2">
            <Flex justify='between' align='center' gap={2}>
              <Typography variant="label">
                {periodType.charAt(0).toUpperCase() + periodType.slice(1)} Usage
              </Typography>
              <Typography variant="small" >
                {usageThisPeriod}/{totalCredits} credits
              </Typography>
            </Flex>
            <Progress value={usagePercentage} className="h-2" />
          </div>
        )}

        {/* Credit Expiry */}
        {creditExpiry && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Calendar className="h-4 w-4" />
              <Typography variant="small" className="font-medium">
                Credits expire on {formatDate(creditExpiry)}
              </Typography>
            </div>
          </div>
        )}

        {/* Purchase Button */}
        {showPurchaseButton && (isLowBalance || availableCredits === 0) && (
          <div className="mt-6">
            <Button
              onClick={onPurchaseClick}
              className="w-full"
              variant={isCriticalBalance ? "default" : "outline"}
            >
              <Coins className="h-4 w-4 mr-2" />
              {isCriticalBalance ? 'Purchase Credits Now' : 'Purchase More Credits'}
            </Button>
          </div>
        )}
      </Section>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: any, index: number) => (
            <Alert key={index} className={
              alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
              alert.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
              'border-blue-200 bg-blue-50'
            }>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className={
                alert.severity === 'critical' ? 'text-red-800' :
                alert.severity === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }>
                <Typography variant="small" className="font-semibold">
                  {alert.title}:
                </Typography>
                <Typography variant="small" className="ml-1">
                  {alert.message}
                </Typography>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Usage Statistics */}
      {showUsageStats && usageData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage Statistics
            </CardTitle>
            <CardDescription>
              Your credit consumption patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {usageData.totalPurchased || 0}
                </div>
                <div className="text-sm text-gray-600">Purchased</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {usageData.totalConsumed || 0}
                </div>
                <div className="text-sm text-gray-600">Consumed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {usageData.totalExpired || 0}
                </div>
                <div className="text-sm text-gray-600">Expired</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {usageData.netCredits || 0}
                </div>
                <div className="text-sm text-gray-600">Net Balance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Credit Allocations */}
      {applicationAllocations && applicationAllocations.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Application Credit Allocations
            </CardTitle>
            <CardDescription>
              Credits allocated to specific applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {applicationAllocations?.summary?.totalAllocations ?? 0}
                </div>
                <div className="text-sm text-gray-600">Active Allocations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(applicationAllocations?.summary?.totalAllocatedCredits ?? 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Allocated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {(applicationAllocations?.summary?.totalUsedCredits ?? 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(applicationAllocations?.summary?.totalAvailableCredits ?? 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Available</div>
              </div>
            </div>

            {/* Application Breakdown */}
            {applicationAllocations.allocations && applicationAllocations.allocations.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">By Application</h4>
                <div className="grid gap-3">
                  {applicationAllocations.allocations.map((allocation: CreditAllocation) => (
                    <div key={allocation.targetApplication} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                          <div className="font-medium capitalize">{allocation.targetApplication}</div>
                          <div className="text-sm text-gray-500">
                            {allocation.allocationPurpose || 'No purpose specified'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          <span className="text-green-600">{(allocation.availableCredits ?? 0).toFixed(2)}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-purple-600">{(allocation.allocatedCredits ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {(allocation.usedCredits ?? 0).toFixed(2)} used
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
