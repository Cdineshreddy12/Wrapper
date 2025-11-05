import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { api } from '@/lib/api'

// Query keys for consistent caching
export const queryKeys = {
  authStatus: ['authStatus'] as const,
  creditStatus: ['creditStatus'] as const,
  onboardingStatus: ['onboardingStatus'] as const,
  userContext: ['userContext'] as const,
} as const

// Shared auth status hook to prevent duplicate API calls
export function useAuthStatus() {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: queryKeys.authStatus,
    queryFn: async () => {
      console.log('🔍 useAuthStatus: Fetching auth status...')
      const response = await api.get('/admin/auth-status')
      console.log('✅ useAuthStatus: Auth status received')
      return response.data
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry auth errors, but retry network errors
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Shared credit status hook
export function useCreditStatusQuery(enabled: boolean = true) {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: [...queryKeys.creditStatus, user?.id],
    queryFn: async () => {
      console.log('🔍 useCreditStatusQuery: Fetching credit status...')
      const response = await api.get('/credits/current')
      console.log('✅ useCreditStatusQuery: Credit status received')
      return response.data
    },
    enabled: enabled && !!isAuthenticated && !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Shared credit usage summary hook
export function useCreditUsageSummary(params?: {
  period?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
}) {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: ['credit', 'usage-summary', params],
    queryFn: async () => {
      console.log('🔍 useCreditUsageSummary: Fetching usage summary...')
      const response = await api.get('/credits/usage-summary', { params })
      console.log('✅ useCreditUsageSummary: Usage summary received')
      return response.data
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Shared credit statistics hook
export function useCreditStats() {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: ['credit', 'stats'],
    queryFn: async () => {
      console.log('🔍 useCreditStats: Fetching credit stats...')
      const response = await api.get('/credits/stats')
      console.log('✅ useCreditStats: Credit stats received')
      return response.data
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Shared credit transaction history hook
export function useCreditTransactionHistory(params?: {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: ['credit', 'transactions', params],
    queryFn: async () => {
      console.log('🔍 useCreditTransactionHistory: Fetching transaction history...')
      const response = await api.get('/credits/transactions', { params })
      console.log('✅ useCreditTransactionHistory: Transaction history received')
      return response.data
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Shared onboarding status hook
export function useOnboardingStatus() {
  const { isAuthenticated, user } = useKindeAuth()

  return useQuery({
    queryKey: queryKeys.onboardingStatus,
    queryFn: async () => {
      console.log('🔍 useOnboardingStatus: Fetching onboarding status...')
      const response = await api.get('/onboarding/status')
      console.log('✅ useOnboardingStatus: Onboarding status received')
      return response.data
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 2
    },
  })
}

// Hook to invalidate all cached queries (useful for manual refresh)
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateAuthStatus: () => queryClient.invalidateQueries({ queryKey: queryKeys.authStatus }),
    invalidateCreditStatus: () => queryClient.invalidateQueries({ queryKey: queryKeys.creditStatus }),
    invalidateOnboardingStatus: () => queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus }),
    invalidateAll: () => queryClient.invalidateQueries(),
    prefetchAuthStatus: () => queryClient.prefetchQuery({
      queryKey: queryKeys.authStatus,
      queryFn: async () => {
        const response = await api.get('/admin/auth-status')
        return response.data
      },
      staleTime: 2 * 60 * 1000,
    }),
  }
}

// Hook for debounced API calls
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout>()

  return React.useCallback(
    ((...args) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      const newTimer = setTimeout(() => {
        callback(...args)
      }, delay)

      setDebounceTimer(newTimer)
    }) as T,
    [callback, delay, debounceTimer]
  )
}

