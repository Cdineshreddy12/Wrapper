/**
 * Cancel subscription confirmation dialog.
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export interface CancelSubscriptionDialogProps {
  open: boolean
  onClose: () => void
  currentPeriodEnd: string
}

export function CancelSubscriptionDialog({
  open,
  onClose,
  currentPeriodEnd
}: CancelSubscriptionDialogProps) {
  if (!open) return null

  const handleCancelSubscription = () => {
    toast.success('Cancellation feature coming soon!')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Cancel Subscription</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Your subscription will be canceled at the end of your current billing period (
          {formatDate(currentPeriodEnd)}). You'll retain access to all features until then.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Keep Subscription
          </Button>
          <Button
            onClick={handleCancelSubscription}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            Cancel Subscription
          </Button>
        </div>
      </div>
    </div>
  )
}
