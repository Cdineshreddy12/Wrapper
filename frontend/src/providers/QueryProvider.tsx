import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Create an optimized query client with better caching strategy
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error: any) => {
                // Don't retry on 4xx errors except 429 (rate limit)
                if (error?.response?.status >= 400 && error?.response?.status < 500 && error?.response?.status !== 429) {
                    return false;
                }
                return failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            staleTime: 1 * 60 * 1000, // 2 minutes
            gcTime: 1 * 60 * 1000, // 10 minutes (formerly cacheTime)
            // Enable background refetching for better UX
            refetchInterval: false, // Disable automatic polling by default
            refetchIntervalInBackground: false,
        },
        mutations: {
            retry: (failureCount, error: any) => {
                // Don't retry mutations on client errors
                if (error?.response?.status >= 400 && error?.response?.status < 500) {
                    return false;
                }
                return failureCount < 1;
            },
        },
    },
})

const QueryProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

export default QueryProvider