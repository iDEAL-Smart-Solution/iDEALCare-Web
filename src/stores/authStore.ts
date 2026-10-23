import { create } from 'zustand'
import { authApi } from '../api/authApi'
import { mockLoginResponse } from '../data/mockAuth'
import { authStorage } from '../lib/authStorage'
import type { AuthUser, LoginRequest, LoginResponse, TenantContext } from '../types/auth'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  tenant: TenantContext | null

  /** Call once on application startup to restore a persisted session. */
  restoreAuth: () => void

  /** Sets session directly from a successful login or registration response. */
  setSession: (response: LoginResponse) => void

  /** Calls the login API (or returns mock data in dev bypass mode). */
  login: (credentials: LoginRequest) => Promise<void>

  /** Clears all authentication state and persisted storage. */
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  accessToken: null,
  tenant: null,

  restoreAuth() {
    // In dev bypass mode, always restore as authenticated so page
    // refreshes don't land on the login screen.
    if (DEV_BYPASS) {
      set({
        status: 'authenticated',
        accessToken: mockLoginResponse.accessToken,
        user: mockLoginResponse.user,
        tenant: mockLoginResponse.tenant,
      })
      return
    }

    const token = authStorage.getToken()
    const user = authStorage.getUser()
    const tenant = authStorage.getTenant()

    if (!token || authStorage.isTokenExpired() || !user) {
      authStorage.clear()
      set({ status: 'unauthenticated', user: null, accessToken: null, tenant: null })
      return
    }

    set({
      status: 'authenticated',
      accessToken: token,
      user,
      tenant,
    })
  },

  setSession(response: LoginResponse) {
    const tenantRaw = response.tenant as unknown as Record<string, string | undefined>
    const normalizedTenant: TenantContext = {
      tenant_id: tenantRaw.tenant_id ?? tenantRaw.tenantId ?? '',
      tenant_role: tenantRaw.tenant_role ?? tenantRaw.role ?? '',
      tenantName: response.tenant?.tenantName,
      domain: response.tenant?.domain,
    }

    authStorage.saveSession(
      response.accessToken,
      response.expiresAt,
      response.user,
      normalizedTenant,
    )

    set({
      status: 'authenticated',
      accessToken: response.accessToken,
      user: response.user,
      tenant: normalizedTenant,
    })
  },

  async login(credentials: LoginRequest) {
    set({ status: 'loading', user: null, accessToken: null, tenant: null })

    try {
      const response = await authApi.login(credentials)

      const tenantRaw = response.tenant as unknown as Record<string, string | undefined>
      const normalizedTenant: TenantContext = {
        tenant_id: tenantRaw.tenant_id ?? tenantRaw.tenantId ?? '',
        tenant_role: tenantRaw.tenant_role ?? tenantRaw.role ?? '',
        tenantName: response.tenant.tenantName,
        domain: response.tenant.domain,
      }

      authStorage.saveSession(
        response.accessToken,
        response.expiresAt,
        response.user,
        normalizedTenant,
      )

      set({
        status: 'authenticated',
        accessToken: response.accessToken,
        user: response.user,
        tenant: normalizedTenant,
      })
    } catch (error) {
      authStorage.clear()
      set({ status: 'unauthenticated', user: null, accessToken: null, tenant: null })
      throw error
    }
  },

  logout() {
    authStorage.clear()
    set({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      tenant: null,
    })
  },
}))
