import { lazy, Suspense } from 'react'
import { RemoteErrorBoundary } from '@/components/remote/RemoteErrorBoundary'
import { ZopkitRoundLoader } from '@/components/common/feedback/ZopkitRoundLoader'

const RemoteFinancialChartOfAccounts = lazy(() => import('remote_financial/ChartOfAccounts'))

function AccountingLoadingState() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <ZopkitRoundLoader size="page" />
        <p className="text-sm text-slate-600 dark:text-slate-300">Loading Chart of Accounts...</p>
      </div>
    </div>
  )
}

export function AccountingChartOfAccountsPage() {
  return (
    <RemoteErrorBoundary>
      <Suspense fallback={<AccountingLoadingState />}>
        <RemoteFinancialChartOfAccounts />
      </Suspense>
    </RemoteErrorBoundary>
  )
}
