import type { AuthUser, TenantContext } from '../types/auth'

const ACCESS_TOKEN_KEY = 'idealcare.accessToken'
const EXPIRES_AT_KEY = 'idealcare.expiresAt'
const USER_KEY = 'idealcare.user'
const TENANT_KEY = 'idealcare.tenant'

// Clean up legacy localStorage keys once so older global tokens do not leak across tabs
try {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TENANT_KEY)
} catch {
  // Ignore in environments where localStorage is unavailable or restricted
}

export const authStorage = {
  saveSession(
    accessToken: string,
    expiresAt: string,
    user: AuthUser,
    tenant: TenantContext | null,
  ): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    sessionStorage.setItem(EXPIRES_AT_KEY, expiresAt)
    sessionStorage.setItem(USER_KEY, JSON.stringify(user))
    if (tenant) {
      sessionStorage.setItem(TENANT_KEY, JSON.stringify(tenant))
    } else {
      sessionStorage.removeItem(TENANT_KEY)
    }
  },

  saveToken(accessToken: string, expiresAt: string): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    sessionStorage.setItem(EXPIRES_AT_KEY, expiresAt)
  },

  getToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getExpiresAt(): string | null {
    return sessionStorage.getItem(EXPIRES_AT_KEY)
  },

  getUser(): AuthUser | null {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  },

  getTenant(): TenantContext | null {
    const raw = sessionStorage.getItem(TENANT_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as TenantContext
    } catch {
      return null
    }
  },

  clear(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(EXPIRES_AT_KEY)
    sessionStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TENANT_KEY)

    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(EXPIRES_AT_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TENANT_KEY)
    } catch {
      // Ignore
    }
  },

  isTokenExpired(): boolean {
    const expiresAt = sessionStorage.getItem(EXPIRES_AT_KEY)
    if (!expiresAt) return true
    return new Date(expiresAt) <= new Date()
  },
}

