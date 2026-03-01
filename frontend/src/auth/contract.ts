export type Permission =
  | 'org:read'
  | 'org:write'
  | 'billing:read'
  | 'billing:write'
  | 'users:read'
  | 'users:write'
  | 'settings:read'
  | 'settings:write'
  | `custom:${string}`
  | string

export type AuthStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'expired'

export interface AuthUser {
  id: string
  email: string
  tenantId: string
  role: string
  claims: Record<string, unknown>
}

export interface AuthSnapshot {
  status: AuthStatus
  user: AuthUser | null
  permissions: readonly Permission[]
  issuedAt: number | null
  expiresAt: number | null
}

export interface AuthToken {
  getAccessToken(): Promise<string>
  getIdToken?(): Promise<string | null>
}

export interface AuthContract {
  getSnapshot(): AuthSnapshot
  subscribe(listener: () => void): () => void
  token: AuthToken
  hasPermission(permission: Permission): boolean
  hasAnyPermission(permissions: readonly Permission[]): boolean
  getTenantId(): string | null
  login(redirectTo?: string): void
  logout(): void
}
