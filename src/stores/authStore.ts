import { create } from 'zustand'
import { authApi } from '../api/authApi'
import { authStorage } from '../lib/authStorage'
import type { AuthUser, LoginRequest, TenantMembership } from '../types/auth'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  tenants: TenantMembership[]

  /** Call once on application startup to restore a persisted session. */
  restoreAuth: () => void

  /** Calls the login API, persists the token, and updates state. */
  login: (credentials: LoginRequest) => Promise<void>

  /** Clears all authentication state and persisted storage. */
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  accessToken: null,
  tenants: [],

  restoreAuth() {
    const token = authStorage.getToken()

    if (!token || authStorage.isTokenExpired()) {
      authStorage.clear()
      set({ status: 'unauthenticated', user: null, accessToken: null, tenants: [] })
      return
    }

    // Token exists and is not expired — mark as authenticated.
    // The user object is not persisted to avoid stale PII in localStorage;
    // a future /me endpoint can re-hydrate it here if needed.
    set({ status: 'authenticated', accessToken: token, user: null, tenants: [] })
  },

  async login(credentials: LoginRequest) {
    set({ status: 'loading' })

    const response = await authApi.login(credentials)

    authStorage.saveToken(response.accessToken, response.expiresAt)

    set({
      status: 'authenticated',
      accessToken: response.accessToken,
      user: response.user,
      tenants: response.tenants,
    })
  },

  logout() {
    authStorage.clear()
    set({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      tenants: [],
    })
  },
}))
