import { lazy, Suspense } from 'react'
import { RemoteErrorBoundary } from '@/components/remote/RemoteErrorBoundary'
import { ZopkitRoundLoader } from '@/components/common/feedback/ZopkitRoundLoader'

const RemoteFinancialDashboard = lazy(() => import('remote_financial/Dashboard'))

function AccountingLoadingState() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <ZopkitRoundLoader size="page" />
        <p className="text-sm text-slate-600 dark:text-slate-300">Loading Financial Accounting...</p>
      </div>
    </div>
  )
}

export function AccountingDashboardPage() {
  return (
    <RemoteErrorBoundary>
      <Suspense fallback={<AccountingLoadingState />}>
        <RemoteFinancialDashboard />
      </Suspense>
    </RemoteErrorBoundary>
  )
}
