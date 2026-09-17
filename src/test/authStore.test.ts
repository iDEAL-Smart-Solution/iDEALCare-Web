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
  tenants: [
    { tenantId: 'tenant-1', tenantName: 'Acme Clinic', role: 'Owner' },
  ],
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({
    status: 'unauthenticated',
    user: null,
    accessToken: null,
    tenants: [],
  })
  vi.clearAllMocks()
})

// ── 7. Logout clears authentication state ────────────────────────────────────

describe('authStore – logout', () => {
  it('clears all authentication state and localStorage', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce(mockLoginResponse)

    await useAuthStore.getState().login({ email: 'jane@example.com', password: 'pass' })

    // Confirm we are authenticated first
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(localStorage.getItem('idealcare.accessToken')).not.toBeNull()

    // Now logout
    useAuthStore.getState().logout()

    const { status, user, accessToken, tenants } = useAuthStore.getState()
    expect(status).toBe('unauthenticated')
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
    expect(tenants).toHaveLength(0)
    expect(localStorage.getItem('idealcare.accessToken')).toBeNull()
  })
})
