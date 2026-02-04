/**
 * Billing page: subscription, credit balance, plans, history, and timeline.
 * Composes useBilling hook and feature components.
 */

import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CreditBalanceIcon,
  CreditPackagesIcon,
  PaymentHistoryIcon
} from '@/components/common/BillingIcons'
import { ListOrdered } from 'lucide-react'
import { useBilling } from '../hooks/useBilling'
import {
  BillingAlerts,
  SubscriptionTab,
  PlansTab,
  HistoryTab,
  TimelineTab,
  CancelSubscriptionDialog,
  RefundDialog
} from '../components'

export function Billing() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <BillingContent />
    </motion.div>
  )
}

function BillingContent() {
  const {
    activeTab,
    setActiveTab,
    displaySubscription,
    displayBillingHistory,
    displayCreditTopups,
    applicationPlans,
    creditBalance,
    timelineData,
    subscriptionLoading,
    billingHistoryLoading,
    timelineLoading,
    upgradeMode,
    needsOnboarding,
    mockMode,
    isAuthenticated,
    selectedPlan,
    isUpgrading,
    showCancelDialog,
    setShowCancelDialog,
    selectedPaymentForRefund,
    setSelectedPaymentForRefund,
    refundReason,
    setRefundReason,
    refundMutation,
    handleCreditPurchase,
    handlePlanPurchase,
    setActiveTab: setTab
  } = useBilling()

  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4 dark:bg-gray-700" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 bg-gray-200 rounded dark:bg-gray-700"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BillingAlerts
        upgradeMode={upgradeMode}
        needsOnboarding={needsOnboarding}
        mockMode={mockMode}
        isAuthenticated={isAuthenticated}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 h-12 dark:bg-gray-800">
          <TabsTrigger
            value="subscription"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:dark:bg-gray-700 transition-all"
            data-tour-feature="purchase-credits"
          >
            <CreditBalanceIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Credit Balance</span>
            <span className="sm:hidden">Balance</span>
          </TabsTrigger>
          <TabsTrigger
            value="plans"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:dark:bg-gray-700 transition-all"
            data-tour-feature="credit-packages"
          >
            <CreditPackagesIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Credit Packages</span>
            <span className="sm:hidden">Packages</span>
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:dark:bg-gray-700 transition-all"
          >
            <PaymentHistoryIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Purchase History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:dark:bg-gray-700 transition-all"
          >
            <ListOrdered className="w-4 h-4" />
            <span className="hidden sm:inline">Timeline</span>
            <span className="sm:hidden">Time</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-8">
          <SubscriptionTab
            displaySubscription={displaySubscription}
            applicationPlans={applicationPlans}
            creditBalance={creditBalance}
            setActiveTab={setTab}
          />
        </TabsContent>

        <TabsContent value="plans" className="space-y-12">
          <PlansTab
            creditTopups={displayCreditTopups}
            applicationPlans={applicationPlans}
            onCreditPurchase={handleCreditPurchase}
            onPlanPurchase={handlePlanPurchase}
            isUpgrading={isUpgrading}
            selectedPlan={selectedPlan}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <HistoryTab
            displayBillingHistory={displayBillingHistory}
            billingHistoryLoading={billingHistoryLoading}
            displaySubscription={displaySubscription}
            onOpenCancelDialog={() => setShowCancelDialog(true)}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <TimelineTab
            timelineData={timelineData ?? undefined}
            timelineLoading={timelineLoading}
          />
        </TabsContent>
      </Tabs>

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        currentPeriodEnd={displaySubscription.currentPeriodEnd}
      />

      <RefundDialog
        paymentId={selectedPaymentForRefund}
        onClose={() => setSelectedPaymentForRefund(null)}
        refundReason={refundReason}
        onRefundReasonChange={setRefundReason}
        onConfirm={(paymentId, reason) =>
          refundMutation.mutate({ paymentId, reason })
        }
        isPending={refundMutation.isPending}
      />
    </div>
  )
}

export default Billing
