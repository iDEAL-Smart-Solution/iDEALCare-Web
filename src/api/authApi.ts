import { mockLoginResponse } from '../data/mockAuth'
import apiClient from '../lib/apiClient'
import type { LoginRequest, LoginResponse } from '../types/auth'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

export function getTenantDomain(): string {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_TENANT_DOMAIN) {
    return import.meta.env.VITE_DEV_TENANT_DOMAIN
  }

  return window.location.hostname
}

export const authApi = {
  async registerGuardian(request: {
    domain: string; email: string; userName: string; password: string;
    firstName: string; lastName: string; phoneNumber?: string; address?: string; country?: string
  }): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/auth/register-guardian', request)
    return response.data
  },
  async getTenantBranding(domain: string): Promise<{ tenantName: string; logoUrl?: string | null }> {
    const response = await apiClient.get<{ tenantName: string; logoUrl?: string | null }>(
      '/api/auth/tenant-branding',
      { params: { domain } },
    )
    return response.data
  },

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
