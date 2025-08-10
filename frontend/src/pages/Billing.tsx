import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { 
  CreditCard, 
  Download, 
  Calendar, 
  Check, 
  X,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  Crown,
  Zap,
  ArrowRight,
  Star,
  Users,
  Database,
  Shield,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { subscriptionAPI, setKindeTokenGetter } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { PaymentDetailsModal } from '@/components/PaymentDetailsModal'

interface Plan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  limits: {
    users: number
    projects: number
    storage: number
    apiCalls: number
  }
  tools: string[]
  popular?: boolean
  badge?: string
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for individuals and small projects',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Up to 3 users',
      'Basic CRM tools',
      '3 projects',
      '1GB storage',
      'Community support',
      'Basic analytics'
    ],
    limits: {
      users: 3,
      projects: 3,
      storage: 1000000000, // 1GB
      apiCalls: 1000
    },
    tools: ['crm'],
    badge: 'Free Forever'
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams getting started',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      'Up to 10 users',
      'CRM & HR tools',
      'Unlimited projects',
      'Basic analytics',
      '5GB storage',
      'Email support',
      '✨ 14-day free trial'
    ],
    limits: {
      users: 10,
      projects: -1,
      storage: 5000000000, // 5GB
      apiCalls: 10000
    },
    tools: ['crm', 'hr']
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced features for growing businesses',
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      'Up to 50 users',
      'All tools included',
      'Unlimited projects',
      'Advanced analytics',
      '100GB storage',
      'Priority support',
      'Custom roles',
      '✨ 14-day free trial'
    ],
    limits: {
      users: 50,
      projects: -1,
      storage: 100000000000, // 100GB
      apiCalls: 100000
    },
    tools: ['crm', 'hr', 'affiliate', 'accounting'],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    features: [
      'Unlimited users',
      'All tools included',
      'Unlimited projects',
      'Custom integrations',
      'Unlimited storage',
      'White-label options',
      'Dedicated support',
      'SSO integration',
      '✨ 14-day free trial'
    ],
    limits: {
      users: -1,
      projects: -1,
      storage: -1,
      apiCalls: -1
    },
    tools: ['crm', 'hr', 'affiliate', 'accounting', 'inventory']
  }
]

export function Billing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('subscription')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [authTestResult, setAuthTestResult] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<string | null>(null)
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = useState<any>(null)
  const [refundRequested, setRefundRequested] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [planLimits, setPlanLimits] = useState<any>(null)

  // Add state for manual cleanup
  const [isCleaningUp, setIsCleaningUp] = useState(false)

  // Get Kinde authentication state
  const { isAuthenticated, isLoading, user, getToken, login } = useKindeAuth()

  // Check if we're in upgrade mode
  const upgradeMode = searchParams.get('upgrade') === 'true'
  const paymentCancelled = searchParams.get('payment') === 'cancelled'
  const paymentSuccess = searchParams.get('payment') === 'success'
  const upgradedPlan = searchParams.get('plan')
  const mockMode = searchParams.get('mock') === 'true' // For testing without backend

  useEffect(() => {
    if (paymentCancelled) {
      toast.error('Payment was cancelled. You can try again anytime.', {
        duration: 5000,
      })
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [paymentCancelled])

  // Check authentication status and provide helpful feedback
  useEffect(() => {
    if (!isLoading) {
      console.log('🔍 Billing Page - Auth Status:', {
        isAuthenticated,
        user: user?.email,
        hasUser: !!user,
        mockMode
      });

      if (!isAuthenticated && !mockMode) {
        console.log('⚠️ User not authenticated, auth test will likely fail');
        setAuthTestResult('❌ Not authenticated');
        toast.error('Not authenticated with Kinde. Please log in first.');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, mockMode])

  // Register Kinde token getter with API
  useEffect(() => {
    if (getToken) {
      console.log('🔧 Registering Kinde token getter with API');
      setKindeTokenGetter(async () => {
        try {
          const token = await getToken();
          console.log('🎯 Kinde token getter called, result:', token ? 'Token provided' : 'No token');
          return token || null;
        } catch (error) {
          console.error('❌ Kinde token getter error:', error);
          return null;
        }
      });
    }
  }, [getToken, isAuthenticated])

  // Fetch real subscription data
  const {
    data: subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
    refetch: refetchSubscription
  } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: async () => {
      try {
        const response = await subscriptionAPI.getCurrent();
        return response.data.data; // Extract the actual subscription object from the wrapper
      } catch (error: any) {
        if (error.response?.status === 404) {
          // No subscription found, user might be on free plan
          return {
            plan: 'free',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 0,
            currency: 'USD'
          };
        }
        throw error;
      }
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  });

  // Fetch available plans
  const {
    data: plansData,
    isLoading: plansLoading
  } = useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: async () => {
      try {
        const response = await subscriptionAPI.getAvailablePlans();
        return response.data.data; // Extract the actual plans array from the wrapper
      } catch (error) {
        console.warn('Failed to fetch plans from API, using local plans');
        return plans; // Fallback to local plans
      }
    },
    enabled: !mockMode,
    retry: 1
  });

  // Fetch configuration status
  const {
    data: configStatus,
    isLoading: configLoading
  } = useQuery({
    queryKey: ['subscription', 'config-status'],
    queryFn: async () => {
      try {
        const response = await subscriptionAPI.getConfigStatus();
        return response.data.data;
      } catch (error) {
        console.warn('Failed to fetch config status');
        return null;
      }
    },
    enabled: !mockMode,
    retry: 1
  });

  // Fetch billing history
  const {
    data: billingHistory,
    isLoading: billingHistoryLoading
  } = useQuery({
    queryKey: ['subscription', 'billing-history'],
    queryFn: async () => {
      try {
        const response = await subscriptionAPI.getBillingHistory();
        return response.data.data; // Extract the actual billing history array from the wrapper
      } catch (error) {
        console.warn('Failed to fetch billing history:', error);
        // Return empty array instead of throwing to prevent component crash
        return [];
      }
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  });

  // Fetch usage data
  const {
    data: usageData,
    isLoading: usageLoading
  } = useQuery({
    queryKey: ['subscription', 'usage'],
    queryFn: async () => {
      const response = await subscriptionAPI.getUsage();
      return response.data.data; // Extract the actual usage data from the wrapper
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  });

  // Fetch plan limits
  const {
    data: planLimitsData,
    isLoading: planLimitsLoading
  } = useQuery({
    queryKey: ['subscription', 'plan-limits'],
    queryFn: async () => {
      const response = await subscriptionAPI.getPlanLimits();
      return response.data.data; // Extract the actual plan limits data from the wrapper
    },
    enabled: isAuthenticated && !mockMode,
    retry: 1
  });

  // Use the usage data (removing linter warning)
  console.log('Usage data loaded:', usageData, usageLoading);
  console.log('Plan limits loaded:', planLimitsData, planLimitsLoading);

  // Use API data or fallback to mock data
  const displayPlans = plansData || plans;
  
  // Ensure subscription data has valid date
  const ensureValidSubscription = (sub: any) => {
    if (!sub) return null;
    
    // Ensure currentPeriodEnd is a valid date
    let validCurrentPeriodEnd = sub.currentPeriodEnd;
    if (!validCurrentPeriodEnd || isNaN(new Date(validCurrentPeriodEnd).getTime())) {
      // If no valid date, default to 1 year from now for free plans, or current date for others
      validCurrentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    return {
      ...sub,
      currentPeriodEnd: validCurrentPeriodEnd
    };
  };
  
  const displaySubscription = ensureValidSubscription(subscription) || {
    plan: 'free',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 0,
    currency: 'USD'
  };
  const displayBillingHistory = billingHistory || [];

  // Handle payment success after refetchSubscription is available
  useEffect(() => {
    if (paymentSuccess) {
      toast.success('🎉 Payment successful! Your subscription is now active.', {
        duration: 6000,
      })
      
      // Clear trial expiry data from localStorage and trigger cleanup
      localStorage.removeItem('trialExpired')
      
      // Dispatch custom events to clear trial state
      window.dispatchEvent(new CustomEvent('paymentSuccess'))
      window.dispatchEvent(new CustomEvent('subscriptionUpgraded'))
      
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries()
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [paymentSuccess, queryClient])

  // Create Stripe checkout session mutation with better error handling
  const createCheckoutMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: string; billingCycle: 'monthly' | 'yearly' }) => {
      console.log('🔄 Creating checkout session for:', { planId, billingCycle });
      
      // If in mock mode, simulate the process
      if (mockMode) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
        return {
          checkoutUrl: `https://checkout.stripe.com/pay/mock-${planId}-${billingCycle}#test`
        };
      }
      
      try {
        const response = await subscriptionAPI.createCheckout({
          planId,
          billingCycle,
          successUrl: `${window.location.origin}/billing?payment=success`,
          cancelUrl: `${window.location.origin}/billing?payment=cancelled`
        });
        
        console.log('✅ Checkout session created - Full response:', response);
        console.log('✅ Response data:', response.data);
        console.log('✅ Actual checkout data:', response.data.data);
        
        // Return the actual data (response.data.data) not the wrapper (response.data)
        return response.data.data;
      } catch (error: any) {
        console.error('❌ Checkout creation failed:', error);
        
        // Handle different error types
        if (error.response?.status === 401) {
          throw new Error('Authentication required. Please log in again or use mock mode by adding "?mock=true" to the URL.');
        } else if (error.response?.status === 403) {
          throw new Error('You don\'t have permission to create subscriptions.');
        } else if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else {
          throw new Error('Failed to create checkout session. Please try mock mode or check your authentication.');
        }
      }
    },
    onSuccess: (data) => {
      console.log('✅ Checkout mutation successful!');
      console.log('🔍 Full data object received:', data);
      console.log('🔍 data.checkoutUrl:', data.checkoutUrl);
      console.log('🔍 data type:', typeof data);
      console.log('🔍 data keys:', Object.keys(data));
      console.log('🔍 Stringified data:', JSON.stringify(data, null, 2));
      
      if (data.checkoutUrl) {
        console.log('✅ Checkout URL found, redirecting to:', data.checkoutUrl);
        // Show success message before redirecting
        toast.success('Redirecting to secure payment page...', {
          duration: 2000,
        });
        
        // Small delay to show the message
        setTimeout(() => {
          if (mockMode) {
            toast.success('Mock mode: Simulated successful upgrade!', {
              duration: 3000,
            });
            // In mock mode, just show success and stay on page
            setIsUpgrading(false);
          } else {
            window.location.href = data.checkoutUrl;
          }
        }, 1000);
      } else {
        console.error('❌ No checkout URL found in data');
        console.error('❌ Data structure analysis:');
        console.error('   - data.checkoutUrl:', data.checkoutUrl);
        console.error('   - data.data?.checkoutUrl:', data.data?.checkoutUrl);
        console.error('   - data.url:', data.url);
        console.error('   - data.checkoutUrl (typeof):', typeof data.checkoutUrl);
        toast.error('No checkout URL received from server');
        setIsUpgrading(false);
      }
    },
    onError: (error: any) => {
      console.error('❌ Checkout mutation failed:', error);
      
      const errorMessage = error.message || 'Failed to create checkout session';
      
      // Check if user needs onboarding
      if (error.response?.data?.action === 'redirect_to_onboarding') {
        setNeedsOnboarding(true);
        toast.error('Please complete onboarding first to create a subscription.', {
          duration: 5000,
        });
        return;
      }
      
      toast.error(errorMessage, {
        duration: 8000,
      });
      
      setIsUpgrading(false);
    }
  });

  // Plan change mutation for upgrades/downgrades
  const changePlanMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: string; billingCycle: 'monthly' | 'yearly' }) => {
      console.log('🔄 Changing plan to:', { planId, billingCycle });
      
      const response = await subscriptionAPI.changePlan({
        planId,
        billingCycle
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Plan change successful:', data);
      
      if (data.checkoutUrl) {
        // For paid plans, redirect to checkout
        toast.success('Redirecting to secure payment page...', {
          duration: 2000,
        });
        
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 1000);
      } else {
        // For free plan downgrade, refresh data
        toast.success(data.message || 'Plan changed successfully!', {
          duration: 3000,
        });
        
      // Refresh subscription data
        refetchSubscription();
        setIsUpgrading(false);
      }
    },
    onError: (error: any) => {
      console.error('❌ Plan change failed:', error);
      toast.error(error.response?.data?.message || 'Failed to change plan');
      setIsUpgrading(false);
    }
  });

  // Immediate downgrade mutation
  const immediateDowngradeMutation = useMutation({
    mutationFn: async ({ newPlan, reason, refundRequested }: { newPlan: string; reason?: string; refundRequested?: boolean }) => {
      const response = await subscriptionAPI.immediateDowngrade({
        newPlan,
        reason,
        refundRequested
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Downgrade completed successfully!', {
        duration: 3000,
      });
      setShowDowngradeDialog(false);
      refetchSubscription();
      queryClient.invalidateQueries({ queryKey: ['subscription', 'billing-history'] });
    },
    onError: (error: any) => {
      console.error('❌ Immediate downgrade failed:', error);
      toast.error(error.response?.data?.message || 'Failed to process downgrade');
    }
  });

  // Refund processing mutation
  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, amount, reason }: { paymentId: string; amount?: number; reason?: string }) => {
      const response = await subscriptionAPI.processRefund({
        paymentId,
        amount,
        reason
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Refund processed successfully!', {
        duration: 3000,
      });
      setSelectedPaymentForRefund(null);
      queryClient.invalidateQueries({ queryKey: ['subscription', 'billing-history'] });
    },
    onError: (error: any) => {
      console.error('❌ Refund processing failed:', error);
      toast.error(error.response?.data?.message || 'Failed to process refund');
    }
  });

  const handleUpgrade = async (planId: string) => {
    console.log('🎯 Upgrade button clicked for plan:', planId);
    
    if (planId === 'free') {
      toast.error('You are already on the free plan');
      return;
    }

    // Check if this is a downgrade to free (which should be handled differently)
    if (displaySubscription.plan !== 'free' && planId === 'free') {
      toast.error('To downgrade to free plan, please contact support or cancel your current subscription.');
      return;
    }

    setSelectedPlan(planId);
    setIsUpgrading(true);

    // Show immediate feedback
    toast.loading(`Setting up your ${planId} plan upgrade...`, {
      duration: 2000,
    });

    try {
      console.log('🚀 Starting checkout process...');
      await createCheckoutMutation.mutateAsync({ planId, billingCycle });
    } catch (error) {
      console.error('❌ Upgrade process failed:', error);
      setIsUpgrading(false);
    }
  };

  // For testing: Add a button to test authentication
  const testAuth = async () => {
    try {
      setAuthTestResult('Testing...');
      console.log('🧪 === COMPREHENSIVE AUTH TEST ===');
      
      // Step 1: Check Kinde auth state
      console.log('🔍 Step 1: Kinde Auth State');
      console.log('  isAuthenticated:', isAuthenticated);
      console.log('  isLoading:', isLoading);
      console.log('  user email:', user?.email);
      console.log('  user id:', user?.id);
      console.log('  hasUser:', !!user);

      if (!isAuthenticated) {
        setAuthTestResult('❌ Not authenticated');
        toast.error('Not authenticated with Kinde. Please log in first.');
        return;
      }

      // Step 2: Try to get the current token from Kinde
      console.log('🔍 Step 2: Getting Kinde Token');
      let kindeToken = null;
      try {
        kindeToken = await getToken();
        console.log('  Kinde getToken() result:', kindeToken ? 'Token received' : 'No token');
        console.log('  Token preview:', kindeToken ? `${kindeToken.substring(0, 20)}...` : 'None');
      } catch (tokenError) {
        console.error('  ❌ Failed to get Kinde token:', tokenError);
      }

      // Step 3: Test the debug authentication endpoint
      console.log('🔍 Step 3: Testing Debug Auth Endpoint');
      const response = await subscriptionAPI.debugAuth();
      console.log('✅ Debug auth test successful:', response.data);
      
      // Check if user needs onboarding
      if (response.data.user && !response.data.tenantId) {
        setNeedsOnboarding(true);
        console.log('⚠️ User needs onboarding - no tenantId found');
      }
      
      setAuthTestResult('✅ Success');
      toast.success('Authentication is working!');
    } catch (error: any) {
      console.error('❌ Auth test failed:', error);
      console.log('🔍 Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 401) {
        setAuthTestResult('❌ 401 Unauthorized');
        toast.error('Authentication failed. Try logging out and back in.');
      } else {
        setAuthTestResult('❌ Error');
        toast.error('API test failed: ' + (error.message || 'Unknown error'));
      }
    }
  };

  // Add a manual token override for testing
  const testWithManualToken = async () => {
    const manualToken = prompt('Enter a Kinde access token to test with:');
    if (!manualToken) return;

    try {
      console.log('🧪 Testing with manual token:', manualToken.substring(0, 20) + '...');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://wrapper.zopkit.com/api'}/subscriptions/current`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${manualToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();
      console.log('Manual token test result:', { status: response.status, data });
      
      if (response.ok) {
        toast.success('Manual token test successful!');
        setAuthTestResult('✅ Manual Success');
      } else {
        toast.error(`Manual token test failed: ${response.status}`);
        setAuthTestResult(`❌ Manual ${response.status}`);
      }
    } catch (error) {
      console.error('Manual token test error:', error);
      toast.error('Manual token test failed');
      setAuthTestResult('❌ Manual Error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'trialing':
        return 'bg-blue-100 text-blue-800'
      case 'past_due':
        return 'bg-red-100 text-red-800'
      case 'canceled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Manual cleanup function for trial data
  const handleManualCleanup = async () => {
    setIsCleaningUp(true)
    try {
      console.log('🧹 Starting manual cleanup...')
      
      // 1. Clean up duplicate payments
      try {
        const cleanupResponse = await subscriptionAPI.cleanupDuplicatePayments()
        console.log('✅ Payment cleanup result:', cleanupResponse.data)
        toast.success(`Cleaned up ${cleanupResponse.data.data.duplicatesRemoved} duplicate payments`, {
          duration: 3000
        })
      } catch (error) {
        console.warn('⚠️ Payment cleanup failed:', error)
      }
      
      // 2. Toggle off trial restrictions
      try {
        const toggleResponse = await subscriptionAPI.toggleTrialRestrictions(true)
        console.log('✅ Trial restrictions disabled:', toggleResponse.data)
        toast.success('Trial restrictions disabled', {
          duration: 2000
        })
      } catch (error) {
        console.warn('⚠️ Trial toggle failed:', error)
      }
      
      // 3. Clear trial expiry data
      localStorage.removeItem('trialExpired')
      
      // 4. Dispatch cleanup events
      window.dispatchEvent(new CustomEvent('paymentSuccess'))
      window.dispatchEvent(new CustomEvent('subscriptionUpgraded'))
      
      // 5. Refresh all data
      queryClient.invalidateQueries()
      
      toast.success('✅ Manual cleanup completed! Please refresh the page.', {
        duration: 5000
      })
      
      // Refresh page after a delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (error) {
      console.error('❌ Manual cleanup failed:', error)
      toast.error('Manual cleanup failed. Please contact support.', {
        duration: 5000
      })
    } finally {
      setIsCleaningUp(false)
    }
  }

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your subscription and billing information</p>
          {mockMode && (
            <div className="mt-2">
              <Badge className="bg-yellow-100 text-yellow-800">
                🧪 Mock Mode - Testing UI without backend
              </Badge>
        </div>
          )}
          {!isLoading && (
            <div className="mt-2 flex items-center gap-2">
              <Badge className={isAuthenticated ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {isAuthenticated ? (
                  <>✅ Authenticated as {user?.email}</>
                ) : (
                  <>❌ Not Authenticated</>
                )}
              </Badge>
              {configStatus && !configLoading && (
                <Badge className={configStatus.stripeConfigured ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}>
                  {configStatus.stripeConfigured ? (
                    <>🔧 Stripe: {configStatus.mode} mode</>
                  ) : (
                    <>⚠️ Stripe: Mock mode</>
                  )}
                </Badge>
              )}
      </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Test Auth Button */}
          <Button variant="outline" onClick={testAuth} size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Test Auth
            {authTestResult && (
              <span className="ml-2 text-xs">
                {authTestResult}
              </span>
            )}
          </Button>
          
          {/* Manual Token Test Button */}
          <Button variant="outline" onClick={testWithManualToken} size="sm" className="text-xs">
            🔧 Manual Token
          </Button>
          
          {/* Login button if not authenticated */}
          {!isAuthenticated && !mockMode && (
            <Button 
              variant="default" 
              onClick={() => login()} 
              size="sm"
            >
              🔐 Login
            </Button>
          )}

          {!mockMode && authTestResult === '❌ 401 Unauthorized' && (
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/billing?mock=true'} 
              size="sm"
              className="bg-yellow-50 border-yellow-300"
            >
              🧪 Try Mock Mode
            </Button>
          )}
          {upgradeMode && (
            <Badge className="bg-blue-100 text-blue-800">
              <Zap className="h-3 w-3 mr-1" />
              Upgrade Mode
            </Badge>
          )}
        </div>
      </div>

      {/* Onboarding Notice for users without organizations */}
      {needsOnboarding && !mockMode && isAuthenticated && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-orange-800">
            <strong>Setup Required:</strong> You need to complete onboarding to access subscription features.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-3"
              onClick={() => navigate('/onboarding')}
            >
              Complete Setup
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Upgrade CTA for free users */}
      {(displaySubscription.plan === 'free' || upgradeMode) && (
        <Alert className="border-green-200 bg-green-50">
          <Crown className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            <strong>Ready to unlock more power?</strong> Upgrade to a paid plan to access unlimited projects, 
            advanced features, and priority support.
            {authTestResult === '❌ 401 Unauthorized' && !mockMode && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                <strong>Note:</strong> Authentication is required for upgrades. 
                <button 
                  onClick={() => window.location.href = '/billing?mock=true'}
                  className="ml-2 underline hover:no-underline"
                >
                  Try mock mode
                </button> to test the upgrade flow.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscription">Current Plan</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          <TabsTrigger value="history">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          {/* Current Subscription Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Subscription</CardTitle>
                  <CardDescription>
                    Your current plan and billing information
                  </CardDescription>
                </div>
                
                {/* Manual cleanup button for debugging */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualCleanup}
                  disabled={isCleaningUp}
                  className="text-xs"
                  title="Fix trial status and clean up duplicate payments"
                >
                  {isCleaningUp ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                      Cleaning...
                    </>
                  ) : (
                    <>
                      🧹 Fix Issues
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Plan</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold capitalize">{displaySubscription.plan}</p>
                      <Badge className={getStatusColor(displaySubscription.status)}>
                        {displaySubscription.status}
                      </Badge>
                      {displaySubscription.plan === 'free' && (
                        <Badge className="bg-green-100 text-green-800">
                          Free Forever
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600">Amount</p>
                    <p className="text-xl font-bold">
                      {displaySubscription.plan === 'free' ? 'Free' : formatCurrency(displaySubscription.amount)}
                      {displaySubscription.plan !== 'free' && `/${displaySubscription.currency}`}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {displaySubscription.plan === 'free' ? 'Account Created' : 'Next Billing'}
                    </p>
                    <p className="text-sm">
                      {formatDate(displaySubscription.currentPeriodEnd)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Plan Features</p>
                  <div className="space-y-2">
                      {plans.find(p => p.id === displaySubscription.plan)?.features.slice(0, 4).map((feature: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {displaySubscription.plan === 'free' && (
                    <Button onClick={() => setSelectedPlan('professional')} className="w-full">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Usage & Restrictions</CardTitle>
              <CardDescription>Your current usage against plan limits</CardDescription>
            </CardHeader>
            <CardContent>
              {planLimitsData ? (
                <div className="space-y-6">
                  {/* Users */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Users</span>
                      <span className="text-sm">
                        {planLimitsData.currentUsage.users} / {planLimitsData.limits.users === -1 ? '∞' : planLimitsData.limits.users}
                      </span>
                    </div>
                    {planLimitsData.limits.users !== -1 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            planLimitsData.restrictions.canCreateUsers ? 'bg-green-600' : 'bg-red-600'
                          }`} 
                          style={{ 
                            width: `${Math.min(100, (planLimitsData.currentUsage.users / planLimitsData.limits.users) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    )}
                    {!planLimitsData.restrictions.canCreateUsers && (
                      <p className="text-xs text-red-600">⚠️ User limit reached - upgrade to add more users</p>
                    )}
                  </div>

                  {/* Roles */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Custom Roles</span>
                      <span className="text-sm">
                        {planLimitsData.currentUsage.roles} / {planLimitsData.limits.roles === -1 ? '∞' : planLimitsData.limits.roles}
                      </span>
                    </div>
                    {planLimitsData.limits.roles !== -1 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            planLimitsData.restrictions.canCreateRoles ? 'bg-blue-600' : 'bg-red-600'
                          }`} 
                          style={{ 
                            width: `${Math.min(100, (planLimitsData.currentUsage.roles / planLimitsData.limits.roles) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    )}
                    {!planLimitsData.restrictions.canCreateRoles && (
                      <p className="text-xs text-red-600">⚠️ Role limit reached - upgrade to create more roles</p>
                    )}
                  </div>

                  {/* Available Applications & Modules */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Available Applications</p>
                    <div className="flex flex-wrap gap-2">
                      {planLimitsData.allowedApplications?.map((app: string) => (
                        <Badge key={app} variant="default" className="text-xs">
                          {app.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                    
                    {planLimitsData.allowedModules && Object.keys(planLimitsData.allowedModules).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Available Modules</p>
                        {Object.entries(planLimitsData.allowedModules).map(([app, modules]: [string, any]) => (
                          <div key={app} className="space-y-1">
                            <p className="text-xs font-medium text-gray-600">{app.toUpperCase()}:</p>
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(modules) ? 
                                modules.map((module: string) => (
                                  <Badge key={`${app}-${module}`} variant="secondary" className="text-xs">
                                    {module.replace('_', ' ')}
                                  </Badge>
                                )) :
                                modules === '*' ? (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    All Modules
                                  </Badge>
                                ) : null
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {planLimitsData.currentPlan === 'trial' && (
                      <p className="text-xs text-amber-600">
                        ⏰ Trial period - Upgrade to continue access after expiration
                      </p>
                    )}
                  </div>

                  {/* Upgrade Suggestion */}
                  {(planLimitsData.currentPlan === 'free' || 
                    !planLimitsData.restrictions.canCreateUsers || 
                    !planLimitsData.restrictions.canCreateRoles) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Upgrade Recommended
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        {planLimitsData.currentPlan === 'free' 
                          ? 'Unlock more modules and increase your limits with a paid plan.'
                          : 'You\'ve reached your plan limits. Upgrade for more capacity.'
                        }
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setActiveTab('plans')}
                      >
                        View Plans
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Loading usage data...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full animate-pulse" style={{ width: '50%' }}></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <span className={billingCycle === 'monthly' ? 'font-medium' : 'text-gray-600'}>Monthly</span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={billingCycle === 'yearly' ? 'font-medium' : 'text-gray-600'}>
              Yearly <Badge className="ml-1 bg-green-100 text-green-800">Save 17%</Badge>
            </span>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayPlans.map((plan: any) => {
              const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
              const yearlyPrice = plan.yearlyPrice
              const monthlySavings = plan.monthlyPrice * 12 - yearlyPrice
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative ${
                    displaySubscription.plan === plan.id ? 'ring-2 ring-blue-500' : ''
                  } ${plan.popular ? 'ring-2 ring-purple-500' : ''}`}
                >
                  {displaySubscription.plan === plan.id && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500">Current Plan</Badge>
                  </div>
                )}
                
                  {plan.popular && displaySubscription.plan !== plan.id && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-purple-500">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {plan.badge && plan.id === 'free' && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-green-500">{plan.badge}</Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="space-y-1">
                      {plan.id === 'free' ? (
                        <div className="text-3xl font-bold text-green-600">FREE</div>
                      ) : (
                        <>
                          <div className="text-3xl font-bold">
                            ${price}
                            <span className="text-lg font-normal text-gray-600">
                              /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                          </div>
                          {billingCycle === 'yearly' && monthlySavings > 0 && (
                            <p className="text-sm text-green-600">
                              Save ${monthlySavings}/year
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                      {plan.features.map((feature: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                    <div className="pt-4">
                      {displaySubscription.plan === plan.id ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : (
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                          disabled={isUpgrading && selectedPlan === plan.id}
                    className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                        >
                          {isUpgrading && selectedPlan === plan.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : plan.id === 'free' ? (
                            'Downgrade to Free'
                          ) : (
                            <>
                              <Crown className="h-4 w-4 mr-2" />
                              {displaySubscription.plan === 'free' ? 'Upgrade' : 'Change Plan'}
                            </>
                          )}
                  </Button>
                      )}
              </div>
            </CardContent>
          </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Payment History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Payment History</h3>
              <div className="text-sm text-gray-500">
                Your billing and payment records
              </div>
            </div>
            
            {billingHistoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading payment history...</p>
                </div>
              </div>
            ) : !displayBillingHistory || displayBillingHistory.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No payment history yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayBillingHistory.map((payment: any) => (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`rounded-full p-2 ${
                            payment.status === 'succeeded' ? 'bg-green-100' : 
                            payment.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                          }`}>
                            {payment.status === 'succeeded' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : payment.status === 'failed' ? (
                              <X className="h-4 w-4 text-red-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">
                                {payment.description || `${payment.paymentType} payment`}
                              </h4>
                              <Badge variant={
                                payment.status === 'succeeded' ? 'default' : 
                                payment.status === 'failed' ? 'destructive' : 'secondary'
                              }>
                                {payment.status === 'succeeded' ? 'Paid' : 
                                 payment.status === 'failed' ? 'Failed' : 'Pending'}
                              </Badge>
                            </div>
                            
                            <div className="mt-1 space-y-1">
                              <p className="text-sm text-gray-600">
                                {formatDate(payment.paidAt || payment.createdAt)} 
                                {payment.billingReason && ` • ${payment.billingReason.replace(/_/g, ' ')}`}
                              </p>
                              
                              {payment.paymentMethodDetails?.card && (
                                <p className="text-sm text-gray-500">
                                  **** **** **** {payment.paymentMethodDetails.card.last4} • {payment.paymentMethodDetails.card.brand?.toUpperCase()}
                                </p>
                              )}
                              
                              {payment.invoiceNumber && (
                                <p className="text-sm text-gray-500">
                                  Invoice #{payment.invoiceNumber}
                                </p>
                              )}
                              
                              {/* Stripe Payment Details */}
                              {payment.stripePaymentIntentId && (
                                <div className="text-xs text-gray-400 space-y-1">
                                  <p>Payment ID: {payment.stripePaymentIntentId}</p>
                                  {payment.stripeChargeId && payment.stripeChargeId !== payment.stripePaymentIntentId && (
                                    <p>Charge ID: {payment.stripeChargeId}</p>
                                  )}
                                  {payment.stripeInvoiceId && (
                                    <p>Invoice ID: {payment.stripeInvoiceId}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(payment.amount * 100, payment.currency || 'USD')}
                          </div>
                          {payment.taxAmount > 0 && (
                            <div className="text-sm text-gray-500">
                              Tax: {formatCurrency(payment.taxAmount * 100, payment.currency || 'USD')}
                            </div>
                          )}
                          {payment.processingFees > 0 && (
                            <div className="text-sm text-gray-500">
                              Fees: {formatCurrency(payment.processingFees * 100, payment.currency || 'USD')}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPaymentForDetails(payment)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(payment, null, 2))}`, '_blank')}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Receipt
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Enhanced Plan Management */}
          {displaySubscription.plan !== 'free' && (
          <Card>
            <CardHeader>
                <CardTitle>Plan Management</CardTitle>
                <CardDescription>Manage your current subscription</CardDescription>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                    <h4 className="font-medium">Immediate Downgrade</h4>
                    <p className="text-sm text-gray-600">
                      Downgrade to a lower plan with optional prorated refund
                    </p>
                    </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDowngradeDialog(true)}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <ArrowRight className="h-4 w-4 mr-2 rotate-90" />
                    Downgrade
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Cancel Subscription</h4>
                    <p className="text-sm text-gray-600">
                      Cancel your subscription (effective at end of billing period)
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCancelDialog(true)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Immediate Downgrade Dialog */}
      {showDowngradeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Immediate Downgrade</h3>
            <p className="text-gray-600 mb-4">
              You're about to downgrade from the {displaySubscription.plan} plan. This action will:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
              <li>Immediately switch you to the Free plan</li>
              <li>Remove access to premium features</li>
              <li>Optionally provide a prorated refund</li>
            </ul>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  onChange={(e) => setRefundRequested(e.target.checked)}
                />
                <span className="text-sm">Request prorated refund</span>
              </label>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDowngradeDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  immediateDowngradeMutation.mutate({
                    newPlan: 'free',
                    reason: 'customer_request',
                    refundRequested: refundRequested
                  });
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                disabled={immediateDowngradeMutation.isPending}
              >
                {immediateDowngradeMutation.isPending ? 'Processing...' : 'Confirm Downgrade'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Cancel Subscription</h3>
            <p className="text-gray-600 mb-4">
              Your subscription will be canceled at the end of your current billing period ({formatDate(displaySubscription.currentPeriodEnd)}). 
              You'll retain access to all features until then.
            </p>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowCancelDialog(false)}
                className="flex-1"
              >
                Keep Subscription
              </Button>
              <Button 
                onClick={() => {
                  // Handle regular cancellation here
                  toast.success('Cancellation feature coming soon!');
                  setShowCancelDialog(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Cancel Subscription
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Dialog */}
      {selectedPaymentForRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Request Refund</h3>
            <p className="text-gray-600 mb-4">
              Request a refund for this payment. Refunds are typically processed within 5-10 business days.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Reason (optional)</label>
              <textarea 
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Please let us know why you're requesting a refund..."
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPaymentForRefund(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  refundMutation.mutate({
                    paymentId: selectedPaymentForRefund,
                    reason: refundReason || 'customer_request'
                  });
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                disabled={refundMutation.isPending}
              >
                {refundMutation.isPending ? 'Processing...' : 'Request Refund'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        payment={selectedPaymentForDetails}
        isOpen={!!selectedPaymentForDetails}
        onClose={() => setSelectedPaymentForDetails(null)}
        onRefund={(paymentId) => {
          setSelectedPaymentForDetails(null)
          setSelectedPaymentForRefund(paymentId)
        }}
      />
    </div>
  )
} 