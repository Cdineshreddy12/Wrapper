import { useEffect } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { useUserContextSafe } from '@/contexts/UserContextProvider'
import { getKindeToken } from '@/lib/api'
import { hostAuthContract } from './hostAuthContract'
import type { AuthSnapshot, AuthStatus, AuthUser, Permission } from './contract'

const inferStatus = (isLoading: boolean, isAuthenticated: boolean, hasToken: boolean): AuthStatus => {
  if (isLoading) return 'authenticating'
  if (isAuthenticated && hasToken) return 'authenticated'
  if (isAuthenticated && !hasToken) return 'expired'
  return 'unauthenticated'
}

export function AuthContractBridge() {
  const { isLoading, isAuthenticated, login, logout, getIdToken } = useKindeAuth()
  const userContext = useUserContextSafe()

  useEffect(() => {
    hostAuthContract.setRuntimeHooks({
      getAccessToken: async () => getKindeToken(),
      getIdToken: async () => {
        try {
          return (await getIdToken()) || null
        } catch {
          return null
        }
      },
      login: (redirectTo?: string) => {
        const returnTo = redirectTo || window.location.pathname + window.location.search
        login({ app_state: { returnTo } })
      },
      logout: () => {
        logout()
      },
    })
  }, [getIdToken, login, logout])

  useEffect(() => {
    const permissions = (userContext?.permissions || [])
      .map((permission) => permission.name as Permission)
      .filter(Boolean)

    const ctxUser = userContext?.user
    const authUser: AuthUser | null = ctxUser
      ? {
          id: String(ctxUser.userId),
          email: ctxUser.email,
          tenantId: String(ctxUser.tenantId || ''),
          role: ctxUser.isTenantAdmin ? 'tenant_admin' : 'member',
          claims: {
            isTenantAdmin: !!ctxUser.isTenantAdmin,
            kindeUserId: ctxUser.kindeUserId,
          },
        }
      : null

    const hasTokenBackedUser = !!authUser && isAuthenticated
    const status = inferStatus(isLoading, isAuthenticated, hasTokenBackedUser)

    const snapshot: AuthSnapshot = {
      status,
      user: authUser,
      permissions,
      issuedAt: Date.now(),
      expiresAt: null,
    }

    hostAuthContract.updateSnapshot(snapshot)
  }, [isAuthenticated, isLoading, userContext?.permissions, userContext?.user])

  return null
}
