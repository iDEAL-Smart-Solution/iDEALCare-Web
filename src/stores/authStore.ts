import { create } from 'zustand'
import { authApi } from '../api/authApi'
import { mockLoginResponse } from '../data/mockAuth'
import { authStorage } from '../lib/authStorage'
import type { AuthUser, LoginRequest, TenantContext } from '../types/auth'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  tenant: TenantContext | null

  /** Call once on application startup to restore a persisted session. */
  restoreAuth: () => void

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

    if (!token || authStorage.isTokenExpired()) {
      authStorage.clear()
      set({ status: 'unauthenticated', user: null, accessToken: null, tenant: null })
      return
    }

    // The app only persists the access token and expiry. There is no
    // documented session-restoration API that rehydrates user/tenant state,
    // so a valid token alone must not be treated as a full authenticated
    // session for the UI.
    authStorage.clear()
    set({ status: 'unauthenticated', user: null, accessToken: null, tenant: null })
  },

  async login(credentials: LoginRequest) {
    set({ status: 'loading', user: null, accessToken: null, tenant: null })

    try {
      const response = await authApi.login(credentials)

      authStorage.saveToken(response.accessToken, response.expiresAt)

      set({
        status: 'authenticated',
        accessToken: response.accessToken,
        user: response.user,
        tenant: response.tenant,
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
