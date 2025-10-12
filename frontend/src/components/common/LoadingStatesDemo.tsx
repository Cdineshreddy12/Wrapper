import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PageLoading,
  PageError,
  PageEmpty,
  CardLoading,
  CardError,
  CardEmpty,
  InlineLoading,
  InlineError,
  InlineEmpty,
  ConnectivityError,
  LoadingOverlay,
  SkeletonCard,
  SkeletonList,
  SkeletonTable 
} from './LoadingStates';
import { UnifiedLoading } from './UnifiedLoading';
import { useLoadingState } from '@/hooks/useLoadingState';

/**
 * Demo component showcasing all unified loading states
 */
export function LoadingStatesDemo() {
  const [demoState, setDemoState] = useState<'loading' | 'error' | 'empty' | 'success'>('success');
  const [showOverlay, setShowOverlay] = useState(false);
  
  const loadingState = useLoadingState({
    initialLoading: false,
    maxRetries: 3,
    onRetry: () => {
      console.log('Retrying...');
      setTimeout(() => {
        loadingState.setSuccess();
      }, 1000);
    }
  });

  const simulateAsyncOperation = async () => {
    loadingState.setLoading(true);
    loadingState.setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      loadingState.setSuccess();
    } catch (error) {
      loadingState.setError('Simulated error occurred');
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Unified Loading States Demo</h1>
        <p className="text-muted-foreground">
          Comprehensive examples of all loading, error, and empty states
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Controls</CardTitle>
          <CardDescription>Switch between different states to see the components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={demoState === 'loading' ? 'default' : 'outline'}
              onClick={() => setDemoState('loading')}
            >
              Loading
            </Button>
            <Button 
              variant={demoState === 'error' ? 'default' : 'outline'}
              onClick={() => setDemoState('error')}
            >
              Error
            </Button>
            <Button 
              variant={demoState === 'empty' ? 'default' : 'outline'}
              onClick={() => setDemoState('empty')}
            >
              Empty
            </Button>
            <Button 
              variant={demoState === 'success' ? 'default' : 'outline'}
              onClick={() => setDemoState('success')}
            >
              Success
            </Button>
            <Button 
              variant={showOverlay ? 'default' : 'outline'}
              onClick={() => setShowOverlay(!showOverlay)}
            >
              Toggle Overlay
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Page Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Page Loading States</CardTitle>
          <CardDescription>Full-page loading, error, and empty states</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Page Loading</h4>
              <div className="h-32 border rounded-lg">
                <PageLoading 
                  message="Loading page content..."
                  showBackground={false}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Page Error</h4>
              <div className="h-32 border rounded-lg">
                <PageError 
                  error="Failed to load data"
                  title="Something went wrong"
                  description="An error occurred while loading the page."
                  showBackground={false}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Page Empty</h4>
              <div className="h-32 border rounded-lg">
                <PageEmpty 
                  title="No data available"
                  description="There is no data to display."
                  showBackground={false}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Card Loading States</CardTitle>
          <CardDescription>Loading states within cards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CardLoading 
              title="Loading Card"
              description="This card is loading..."
            />
            
            <CardError 
              error="Failed to load card data"
              title="Card Error"
              description="There was an error loading this card."
            />
            
            <CardEmpty 
              title="Empty Card"
              description="This card has no data to display."
            />
          </div>
        </CardContent>
      </Card>

      {/* Inline Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Inline Loading States</CardTitle>
          <CardDescription>Small loading states for inline use</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <InlineLoading message="Loading inline..." />
              <InlineError error="Inline error" />
              <InlineEmpty message="No inline data" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skeleton Loaders */}
      <Card>
        <CardHeader>
          <CardTitle>Skeleton Loaders</CardTitle>
          <CardDescription>Placeholder content while loading</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Skeleton Card</h4>
              <SkeletonCard showHeader={true} lines={4} />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Skeleton List</h4>
              <SkeletonList items={3} />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Skeleton Table</h4>
              <SkeletonTable rows={3} columns={4} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Overlay */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Overlay</CardTitle>
          <CardDescription>Overlay loading state on top of content</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingOverlay 
            isLoading={showOverlay}
            message="Processing overlay..."
          >
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Content Behind Overlay</h4>
              <p className="text-sm text-muted-foreground">
                This content is visible when the overlay is not active.
                Toggle the overlay button above to see the loading state.
              </p>
            </div>
          </LoadingOverlay>
        </CardContent>
      </Card>

      {/* Unified Loading Component */}
      <Card>
        <CardHeader>
          <CardTitle>Unified Loading Component</CardTitle>
          <CardDescription>Single component that handles all states</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => setDemoState('loading')} size="sm">
                Show Loading
              </Button>
              <Button onClick={() => setDemoState('error')} size="sm">
                Show Error
              </Button>
              <Button onClick={() => setDemoState('empty')} size="sm">
                Show Empty
              </Button>
              <Button onClick={() => setDemoState('success')} size="sm">
                Show Success
              </Button>
            </div>
            
            <div className="h-64 border rounded-lg">
              <UnifiedLoading
                isLoading={demoState === 'loading'}
                error={demoState === 'error' ? 'Demo error message' : null}
                isEmpty={demoState === 'empty'}
                loadingType="page"
                loadingMessage="Loading demo content..."
                errorTitle="Demo Error"
                errorDescription="This is a demo error state."
                emptyTitle="Demo Empty"
                emptyDescription="This is a demo empty state."
              >
                <div className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">Success State</h3>
                  <p className="text-muted-foreground">
                    This is the success state with actual content.
                  </p>
                </div>
              </UnifiedLoading>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State Hook Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Loading State Hook</CardTitle>
          <CardDescription>Using the useLoadingState hook for async operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={simulateAsyncOperation} disabled={loadingState.isLoading}>
                {loadingState.isLoading ? 'Loading...' : 'Simulate Async Operation'}
              </Button>
              
              <div className="flex items-center gap-2">
                <Badge variant={loadingState.isLoading ? 'default' : 'secondary'}>
                  {loadingState.isLoading ? 'Loading' : 'Idle'}
                </Badge>
                {loadingState.hasError && (
                  <Badge variant="destructive">Error</Badge>
                )}
                {loadingState.retryCount > 0 && (
                  <Badge variant="outline">Retries: {loadingState.retryCount}</Badge>
                )}
              </div>
            </div>
            
            {loadingState.hasError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Error: {loadingState.error}
                </p>
                {loadingState.canRetry && (
                  <Button 
                    onClick={loadingState.retry} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                  >
                    Retry ({loadingState.retryCount}/3)
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connectivity States */}
      <Card>
        <CardHeader>
          <CardTitle>Connectivity States</CardTitle>
          <CardDescription>Network and connectivity related states</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 border rounded-lg">
            <ConnectivityError 
              onRetry={() => console.log('Retrying connection...')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
