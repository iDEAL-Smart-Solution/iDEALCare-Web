import { mockLoginResponse } from '../data/mockAuth'
import apiClient from '../lib/apiClient'
import type { LoginRequest, LoginResponse } from '../types/auth'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

function getTenantDomain(): string {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_TENANT_DOMAIN) {
    return import.meta.env.VITE_DEV_TENANT_DOMAIN
  }

  return window.location.hostname
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (DEV_BYPASS) {
      return mockLoginResponse
    }

    const domain = credentials.domain?.trim() || getTenantDomain()

    const response = await apiClient.post<LoginResponse>(
      '/api/auth/login',
      { email: credentials.email, password: credentials.password, domain },
    )
    return response.data
  },
}
