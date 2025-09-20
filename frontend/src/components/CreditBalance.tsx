import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, AlertTriangle, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { creditAPI, setKindeTokenGetter, api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CreditBalanceProps {
  showPurchaseButton?: boolean;
  showUsageStats?: boolean;
  compact?: boolean;
  onPurchaseClick?: () => void;
}

export function CreditBalance({
  showPurchaseButton = true,
  showUsageStats = true,
  compact = false,
  onPurchaseClick
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
  const {
    data: usageData,
    isLoading: usageLoading
  } = useQuery({
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

  const getStatusColor = (availableCredits: number, lowBalanceThreshold: number) => {
    if (availableCredits <= lowBalanceThreshold * 0.1) return 'bg-red-100 text-red-800';
    if (availableCredits <= lowBalanceThreshold) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (availableCredits: number, lowBalanceThreshold: number) => {
    if (availableCredits <= lowBalanceThreshold * 0.1) return 'Critical';
    if (availableCredits <= lowBalanceThreshold) return 'Low';
    return 'Good';
  };

  if (isLoading) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !creditData) {
    return (
      <Card className={compact ? 'p-4' : ''}>
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
    reservedCredits = 0,
    lowBalanceThreshold = 100,
    criticalBalanceThreshold = 10,
    creditExpiry,
    alerts = [],
    usageThisPeriod = 0,
    periodType = 'month'
  } = creditData;

  const usagePercentage = totalCredits > 0 ? (usageThisPeriod / totalCredits) * 100 : 0;
  const isLowBalance = availableCredits <= lowBalanceThreshold;
  const isCriticalBalance = availableCredits <= criticalBalanceThreshold;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
        <div className="flex items-center gap-3">
          <Coins className="h-6 w-6 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {availableCredits.toLocaleString()} credits
            </p>
            <p className="text-xs text-gray-500">
              {totalCredits.toLocaleString()} total
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(availableCredits, lowBalanceThreshold)}>
          {getStatusText(availableCredits, lowBalanceThreshold)}
        </Badge>
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
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
              <Badge className={getStatusColor(availableCredits, lowBalanceThreshold)}>
                {getStatusText(availableCredits, lowBalanceThreshold)}
              </Badge>
            </div>

            {/* Total Credits */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {totalCredits.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mb-2">Total Credits</div>
              <div className="text-xs text-gray-500">
                {reservedCredits} reserved
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

          {/* Credit Expiry */}
          {creditExpiry && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Credits expire on {formatDate(creditExpiry)}
                </span>
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
    </div>
  );
}
