import type { AuthContract, AuthSnapshot, AuthStatus, AuthUser, Permission } from './contract'

type RuntimeHooks = {
  getAccessToken: () => Promise<string | null>
  getIdToken?: () => Promise<string | null>
  login: (redirectTo?: string) => void
  logout: () => void
}

const EMPTY_SNAPSHOT: AuthSnapshot = {
  status: 'authenticating',
  user: null,
  permissions: [],
  issuedAt: null,
  expiresAt: null,
}

const freezeSnapshot = (snapshot: AuthSnapshot): AuthSnapshot =>
  Object.freeze({
    ...snapshot,
    user: snapshot.user
      ? ({
          ...snapshot.user,
          claims: { ...snapshot.user.claims },
        } as AuthUser)
      : null,
    permissions: Object.freeze([...snapshot.permissions]),
  })

export class HostAuthContractImpl implements AuthContract {
  private snapshot: AuthSnapshot = freezeSnapshot(EMPTY_SNAPSHOT)
  private listeners = new Set<() => void>()
  private hooks: RuntimeHooks = {
    getAccessToken: async () => null,
    login: (redirectTo) => {
      const returnTo = encodeURIComponent(redirectTo || window.location.pathname + window.location.search)
      window.location.assign(`/login?returnTo=${returnTo}`)
    },
    logout: () => {
      window.location.assign('/login')
    },
  }

  getSnapshot(): AuthSnapshot {
    return this.snapshot
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly token = {
    getAccessToken: async (): Promise<string> => {
      const token = await this.hooks.getAccessToken()
      if (!token) {
        throw new Error('Access token unavailable')
      }
      return token
    },
    getIdToken: async (): Promise<string | null> => {
      if (!this.hooks.getIdToken) return null
      return this.hooks.getIdToken()
    },
  }

  hasPermission(permission: Permission): boolean {
    return this.snapshot.permissions.includes(permission)
  }

  hasAnyPermission(permissions: readonly Permission[]): boolean {
    return permissions.some((permission) => this.snapshot.permissions.includes(permission))
  }

  getTenantId(): string | null {
    return this.snapshot.user?.tenantId ?? null
  }

  login(redirectTo?: string): void {
    this.hooks.login(redirectTo)
  }

  logout(): void {
    this.hooks.logout()
  }

  updateSnapshot(next: AuthSnapshot): void {
    this.snapshot = freezeSnapshot(next)
    this.emit()
  }

  updateStatus(status: AuthStatus): void {
    this.updateSnapshot({
      ...this.snapshot,
      status,
    })
  }

  setRuntimeHooks(hooks: Partial<RuntimeHooks>): void {
    this.hooks = {
      ...this.hooks,
      ...hooks,
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

export const hostAuthContract = new HostAuthContractImpl()
