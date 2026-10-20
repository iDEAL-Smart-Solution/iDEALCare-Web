import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../stores/authStore'
import type { LoginResponse } from '../types/auth'

// Mock the authApi so tests don't hit the network
vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

import { authApi } from '../api/authApi'

const mockLoginResponse: LoginResponse = {
  accessToken: 'mock-jwt-token',
  expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  user: {
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
  },
  tenant: {
    tenant_id: 'tenant-1',
    tenant_role: 'Owner',
    tenantName: 'Acme Clinic',
  },
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({
    status: 'unauthenticated',
    user: null,
    accessToken: null,
    tenant: null,
  })
  vi.clearAllMocks()
})

describe('authStore – restoreAuth', () => {
  it('does not mark the app authenticated when only a token exists without restored user or tenant data', () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    localStorage.setItem('idealcare.accessToken', 'persisted-token')
    localStorage.setItem('idealcare.expiresAt', expiresAt)

    useAuthStore.getState().restoreAuth()

    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().tenant).toBeNull()
    expect(localStorage.getItem('idealcare.accessToken')).toBeNull()
    expect(localStorage.getItem('idealcare.expiresAt')).toBeNull()
  })
})

// ── 7. Logout clears authentication state ────────────────────────────────────

describe('authStore – logout', () => {
  it('clears all authentication state and localStorage', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce(mockLoginResponse)

    await useAuthStore.getState().login({ email: 'jane@example.com', password: 'pass' })

    // Confirm we are authenticated first
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(localStorage.getItem('idealcare.accessToken')).not.toBeNull()
    expect(useAuthStore.getState().tenant).toEqual({
      tenant_id: 'tenant-1',
      tenant_role: 'Owner',
      tenantName: 'Acme Clinic',
    })

    // Now logout
    useAuthStore.getState().logout()

    const { status, user, accessToken, tenant } = useAuthStore.getState()
    expect(status).toBe('unauthenticated')
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
    expect(tenant).toBeNull()
    expect(localStorage.getItem('idealcare.accessToken')).toBeNull()
  })
})
