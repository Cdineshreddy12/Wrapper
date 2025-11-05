import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, AlertTriangle, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import LoadingButton from './common/LoadingButton';
import { ThemeBadge, ThemeBadgeProps } from './common/ThemeBadge';
import { useCreditStatusQuery, useCreditUsageSummary } from '@/hooks/useSharedQueries';

interface CreditBalanceProps {
  showPurchaseButton?: boolean;
  showUsageStats?: boolean;
  compact?: boolean;
  onPurchaseClick?: () => void;
  className?: string;
}

export function CreditBalance({
  showPurchaseButton = true,
  showUsageStats = true,
  compact = false,
  onPurchaseClick,
  className
}: CreditBalanceProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch credit balance using shared hook
  const {
    data: creditResponse,
    isLoading,
    error,
    refetch
  } = useCreditStatusQuery();

  // Fetch usage summary using shared hook
  const {
    data: usageResponse
  } = useCreditUsageSummary(showUsageStats ? {
    period: 'month'
  } : undefined);

  const creditData = creditResponse?.data;
  const usageData = usageResponse?.data;

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
      <Card className={cn(compact ? 'p-4' : '', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !creditData) {
    return (
      <Card className={cn(compact ? 'p-4' : '', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Failed to load credit balance</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="mt-2"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    availableCredits = 0,
    totalCredits = 0,
    freeCredits = 0,
    paidCredits = 0,
    lowBalanceThreshold = 100,
    criticalBalanceThreshold = 10,
    creditExpiry,
    alerts = [],
    usageThisPeriod = 0,
    periodType = 'month',
    allocations = [] // New field for credit allocations
  } = creditData;

  const usagePercentage = totalCredits > 0 ? (usageThisPeriod / totalCredits) * 100 : 0;
  const isLowBalance = availableCredits <= lowBalanceThreshold;
  const isCriticalBalance = availableCredits <= criticalBalanceThreshold;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border gap-4">
        <div className="flex items-center gap-3">
          <Coins className="h-6 w-6 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {availableCredits.toLocaleString()} credits available
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500">
                {totalCredits.toLocaleString()} total
              </p>
              {paidCredits > 0 && (
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                  {paidCredits} paid
                </span>
              )}
              {allocations.length > 0 && (
                <span className="text-xs text-blue-600">
                  ({allocations.length} allocation{allocations.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>
        </div>
        <ThemeBadge variant={getStatusVariant(availableCredits, lowBalanceThreshold)}>
          {getStatusText(availableCredits, lowBalanceThreshold)}
        </ThemeBadge>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Credit Balance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins className="h-6 w-6 text-amber-500" />
              <div>
                <CardTitle>Credit Balance</CardTitle>
                <CardDescription>Your available credits and usage</CardDescription>
              </div>
            </div>
            <LoadingButton
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              isLoading={isRefreshing}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Available Credits */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {availableCredits.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mb-2">Available Credits</div>
              <ThemeBadge variant={getStatusVariant(availableCredits, lowBalanceThreshold)}>
                {getStatusText(availableCredits, lowBalanceThreshold)}
              </ThemeBadge>
            </div>

            {/* Total Credits */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {totalCredits.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mb-2">Total Credits</div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">
                  {freeCredits} free
                </div>
                {paidCredits > 0 && (
                  <div className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200 inline-block">
                    <Coins className="h-3 w-3 inline mr-1" />
                    {paidCredits} paid
                  </div>
                )}
              </div>
            </div>

            {/* Usage This Period */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {usageThisPeriod.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mb-2">Used This {periodType}</div>
              <div className="text-xs text-gray-500">
                {usagePercentage.toFixed(1)}% of total
              </div>
            </div>
          </div>

          {/* Usage Progress Bar */}
          {showUsageStats && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {periodType.charAt(0).toUpperCase() + periodType.slice(1)} Usage
                </span>
                <span className="text-sm text-gray-500">
                  {usageThisPeriod}/{totalCredits} credits
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
            </div>
          )}

          {/* Credit Expiry Details */}
          {creditExpiry && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-blue-900">
                      Credit Expiry Details
                    </span>
                    {(() => {
                      const expiryDate = new Date(creditExpiry);
                      const now = new Date();
                      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const isExpiringSoon = daysRemaining <= 30;
                      const isExpired = daysRemaining < 0;

                      return (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          isExpired ? 'bg-red-100 text-red-700' :
                          isExpiringSoon ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {isExpired ? `${Math.abs(daysRemaining)} days ago` :
                           isExpiringSoon ? `${daysRemaining} days left` :
                           `${daysRemaining} days remaining`}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex justify-between items-center">
                      <span>Expiry Date:</span>
                      <span className="font-medium">{formatDate(creditExpiry)}</span>
                    </div>

                    {allocations && allocations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="text-xs font-medium text-blue-900 mb-2">Allocation Breakdown:</div>
                        <div className="space-y-1">
                          {allocations
                            .filter((alloc: any) => alloc.expiresAt)
                            .sort((a: any, b: any) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
                            .map((alloc: any, index: number) => {
                              const allocExpiry = new Date(alloc.expiresAt);
                              const now = new Date();
                              const daysToExpiry = Math.ceil((allocExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              const isExpired = daysToExpiry < 0;

                              return (
                                <div key={index} className="flex justify-between items-center text-xs">
                                  <span className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${
                                      alloc.creditType === 'paid' ? 'bg-green-500' :
                                      alloc.creditType === 'free' ? 'bg-blue-500' : 'bg-gray-500'
                                    }`}></div>
                                    {alloc.allocationPurpose || 'Credits'}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${
                                      alloc.creditType === 'paid' ? 'text-green-700' : 'text-blue-700'
                                    }`}>
                                      {alloc.availableCredits}/{alloc.allocatedCredits}
                                    </span>
                                    <span className={`${
                                      isExpired ? 'text-red-600' :
                                      daysToExpiry <= 7 ? 'text-yellow-600' : 'text-gray-600'
                                    }`}>
                                      {isExpired ? 'Expired' : `${daysToExpiry}d`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
        </CardContent>
      </Card>

      {/* Paid Credits Highlight */}
      {paidCredits > 0 && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Coins className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-green-900">
                    Paid Credits Active
                  </h3>
                  <p className="text-xs text-green-700">
                    {paidCredits.toLocaleString()} premium credits available
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  {paidCredits.toLocaleString()}
                </div>
                <div className="text-xs text-green-600">
                  Paid
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <strong>{alert.title}:</strong> {alert.message}
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

      {/* Credit Allocations */}
      {allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Credit Allocations
            </CardTitle>
            <CardDescription>
              Detailed breakdown of your credit allocations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allocations.map((allocation: any) => (
                <div key={allocation.allocationId} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Credit Amount */}
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {allocation.availableCredits.toLocaleString()} / {allocation.allocatedCredits.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Available / Allocated
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {allocation.creditType === 'free' ? 'Free Credits' : 'Paid Credits'}
                      </div>
                    </div>

                    {/* Start Date */}
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {allocation.allocatedAt ? formatDate(allocation.allocatedAt) : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Allocated On</div>
                    </div>

                    {/* Expiry Date */}
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {allocation.expiresAt ? formatDate(allocation.expiresAt) : 'Never'}
                      </div>
                      <div className="text-xs text-gray-500">Expires On</div>
                      {allocation.expiresAt && new Date(allocation.expiresAt) < new Date() && (
                        <div className="text-xs text-red-600 mt-1">Expired</div>
                      )}
                      {allocation.expiresAt && new Date(allocation.expiresAt) > new Date() && (
                        <div className="text-xs text-orange-600 mt-1">
                          {Math.ceil((new Date(allocation.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                        </div>
                      )}
                    </div>

                    {/* Purpose */}
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {allocation.allocationPurpose || allocation.allocationType}
                      </div>
                      <div className="text-xs text-gray-500">Purpose</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
