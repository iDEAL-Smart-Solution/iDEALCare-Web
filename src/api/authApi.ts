import apiClient from '../lib/apiClient'
import type { LoginRequest, LoginResponse } from '../types/auth'

/**
 * Authentication API service.
 * All calls to /api/auth/* live here — not in pages or components.
 */
export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/api/auth/login',
      credentials,
    )
    return response.data
  },
}
