import { mockLoginResponse } from '../data/mockAuth'
import apiClient from '../lib/apiClient'
import type { LoginRequest, LoginResponse } from '../types/auth'

/**
 * Authentication API service.
 * All calls to /api/auth/* live here — not in pages or components.
 *
 * When VITE_DEV_BYPASS_AUTH=true the login call returns mock data
 * immediately without hitting the network. All other behaviour
 * (token storage, store state, routing) is identical to production.
 *
 * To switch to real auth: set VITE_DEV_BYPASS_AUTH=false (or remove it).
 */
const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

export const authApi = {
  async login(_credentials: LoginRequest): Promise<LoginResponse> {
    if (DEV_BYPASS) {
      return mockLoginResponse
    }

    const response = await apiClient.post<LoginResponse>(
      '/api/auth/login',
      _credentials,
    )
    return response.data
  },
}
