import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface RemoteErrorBoundaryProps {
  children: ReactNode
}

interface RemoteErrorBoundaryState {
  hasError: boolean
}

export class RemoteErrorBoundary extends Component<RemoteErrorBoundaryProps, RemoteErrorBoundaryState> {
  state: RemoteErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): RemoteErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/20">
          <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">Remote module failed to load</h2>
          <p className="mb-4 text-sm text-red-700 dark:text-red-300">
            Financial Accounting is currently unavailable. Verify the remote app is running on port 5003.
          </p>
          <Button variant="outline" onClick={this.handleRetry}>
            Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
