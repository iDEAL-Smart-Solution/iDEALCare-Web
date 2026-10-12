import axios, { type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '../lib/apiClient'
import * as navigationRef from '../lib/navigationRef'
import { authStorage } from '../lib/authStorage'
import { useAuthStore } from '../stores/authStore'
import { useSubscriptionStore } from '../stores/subscriptionStore'

// ── Helpers — request interceptor ────────────────────────────────────────────

function getRequestInterceptor() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = (apiClient.interceptors.request as any).handlers[0]
  return handler.fulfilled as (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
}

function makeConfig(): InternalAxiosRequestConfig {
  return {
    headers: { 'Content-Type': 'application/json' },
    method: 'get',
    url: '/test',
  } as unknown as InternalAxiosRequestConfig
}

// ── Helpers — response interceptor ───────────────────────────────────────────

function getResponseSuccessInterceptor() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = (apiClient.interceptors.response as any).handlers[0]
  return handler.fulfilled as (response: unknown) => unknown
}

function getResponseErrorInterceptor() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = (apiClient.interceptors.response as any).handlers[0]
  return handler.rejected as (error: unknown) => Promise<unknown>
}

function makeAxios401(url: string) {
  const err = new axios.AxiosError('Request failed with status code 401')
  err.response = { status: 401, data: {}, headers: {}, config: {} as InternalAxiosRequestConfig, statusText: 'Unauthorized' }
  err.config = { url, headers: {} } as unknown as InternalAxiosRequestConfig
  return err
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
  // Reset store to a known authenticated state for 401 tests
  useAuthStore.setState({
    status: 'authenticated',
    user: { id: '1', firstName: 'Dev', lastName: 'User', email: 'dev@test.com' },
    accessToken: 'live-token',
    tenant: null,
  })
  // Reset subscription store
  useSubscriptionStore.setState({ blockState: null })
  // Give navigationRef a spy so we can assert without real navigation
  vi.spyOn(navigationRef, 'navigate').mockImplementation(() => undefined)
  // Reset pathname to a non-login page for each test
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, pathname: '/app/dashboard' },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── 1. Request interceptor — Bearer token ────────────────────────────────────

describe('apiClient request interceptor', () => {
  it('uses the Vite API base URL configuration', () => {
    expect(apiClient.defaults.baseURL).toBe('')
  })

  it('attaches Authorization header when a token is stored', () => {
    authStorage.saveToken('my-test-token', new Date(Date.now() + 3600 * 1000).toISOString())

    const config = getRequestInterceptor()(makeConfig())

    expect(config.headers['Authorization']).toBe('Bearer my-test-token')
  })

  it('does not attach Authorization header when no token is stored', () => {
    const config = getRequestInterceptor()(makeConfig())

    expect(config.headers['Authorization']).toBeUndefined()
  })
})

// ── 2. Response interceptor — 401 handling ───────────────────────────────────

describe('apiClient response interceptor — 401', () => {
  it('clears auth store and redirects to /login on a 401 from a non-login request', async () => {
    const errorInterceptor = getResponseErrorInterceptor()

    await expect(errorInterceptor(makeAxios401('/api/patients'))).rejects.toThrow()

    // Give the dynamic import inside the interceptor time to resolve
    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(localStorage.getItem('idealcare.accessToken')).toBeNull()
    expect(navigationRef.navigate).toHaveBeenCalledWith('/login')
  })

  it('does NOT trigger global handling on a 401 from the login endpoint', async () => {
    const errorInterceptor = getResponseErrorInterceptor()

    await expect(errorInterceptor(makeAxios401('/api/auth/login'))).rejects.toThrow()

    // Store must remain untouched
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(navigationRef.navigate).not.toHaveBeenCalled()
  })

  it('does NOT redirect again when already on /login', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, pathname: '/login' },
    })

    const errorInterceptor = getResponseErrorInterceptor()

    await expect(errorInterceptor(makeAxios401('/api/patients'))).rejects.toThrow()

    expect(navigationRef.navigate).not.toHaveBeenCalled()
  })

  it('passes non-401 errors through without touching auth state', async () => {
    const errorInterceptor = getResponseErrorInterceptor()

    const err = new axios.AxiosError('Server error')
    err.response = { status: 500, data: {}, headers: {}, config: {} as InternalAxiosRequestConfig, statusText: 'Internal Server Error' }
    err.config = { url: '/api/patients', headers: {} } as unknown as InternalAxiosRequestConfig

    await expect(errorInterceptor(err)).rejects.toThrow()

    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(navigationRef.navigate).not.toHaveBeenCalled()
  })
})

// ── 3. Response interceptor — 402 handling ───────────────────────────────────

function makeAxios402(reason: string, message = 'Subscription required.') {
  const err = new axios.AxiosError('Request failed with status code 402')
  err.response = {
    status: 402,
    data: { error: reason, message },
    headers: {},
    config: {} as InternalAxiosRequestConfig,
    statusText: 'Payment Required',
  }
  err.config = { url: '/api/patients', headers: {} } as unknown as InternalAxiosRequestConfig
  return err
}

describe('apiClient response interceptor — 402', () => {
  it('sets subscriptionStore.blockState for subscription_required', async () => {
    const errorInterceptor = getResponseErrorInterceptor()

    await expect(
      errorInterceptor(makeAxios402('subscription_required', 'No active plan.')),
    ).rejects.toThrow()

    const { blockState } = useSubscriptionStore.getState()
    expect(blockState?.reason).toBe('subscription_required')
    expect(blockState?.message).toBe('No active plan.')
  })

  it('sets subscriptionStore.blockState for subscription_expired', async () => {
    const errorInterceptor = getResponseErrorInterceptor()

    await expect(
      errorInterceptor(makeAxios402('subscription_expired', 'Plan expired.')),
    ).rejects.toThrow()

    expect(useSubscriptionStore.getState().blockState?.reason).toBe('subscription_expired')
  })

  it('sets subscriptionStore.blockState for subscription_cancelled', async () => {
    const errorInterceptor = getResponseErrorInterceptor()

    await expect(
      errorInterceptor(makeAxios402('subscription_cancelled', 'Plan cancelled.')),
    ).rejects.toThrow()

    expect(useSubscriptionStore.getState().blockState?.reason).toBe('subscription_cancelled')
  })

  it('sets subscriptionStore.blockState for subscription_admin_only', async () => {
    const errorInterceptor = getResponseErrorInterceptor()

    await expect(
      errorInterceptor(makeAxios402('subscription_admin_only', 'Contact admin.')),
    ).rejects.toThrow()

    expect(useSubscriptionStore.getState().blockState?.reason).toBe('subscription_admin_only')
  })

  it('does NOT touch authStore on a 402', async () => {
    const errorInterceptor = getResponseErrorInterceptor()

    await expect(
      errorInterceptor(makeAxios402('subscription_required')),
    ).rejects.toThrow()

    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().accessToken).toBe('live-token')
  })

  it('does NOT trigger a redirect on a 402', async () => {
    const errorInterceptor = getResponseErrorInterceptor()

    await expect(
      errorInterceptor(makeAxios402('subscription_required')),
    ).rejects.toThrow()

    expect(navigationRef.navigate).not.toHaveBeenCalled()
  })
})

// ── 4. Response interceptor — 2xx clears subscription block ──────────────────

describe('apiClient response interceptor — 2xx subscription clearing', () => {
  it('clears subscriptionStore.blockState when a 2xx follows a prior 402', () => {
    // Simulate a blocked state left by a previous 402
    useSubscriptionStore.getState().setBlocked('subscription_expired', 'Expired.')
    expect(useSubscriptionStore.getState().blockState).not.toBeNull()

    const successInterceptor = getResponseSuccessInterceptor()
    successInterceptor({ status: 200, data: {} })

    expect(useSubscriptionStore.getState().blockState).toBeNull()
  })

  it('does not call clearBlocked() when blockState is already null', () => {
    // blockState is null from beforeEach — confirm no write happens
    const clearBlockedSpy = vi.spyOn(
      useSubscriptionStore.getState(),
      'clearBlocked',
    )

    const successInterceptor = getResponseSuccessInterceptor()
    successInterceptor({ status: 200, data: {} })

    expect(clearBlockedSpy).not.toHaveBeenCalled()
  })

  it('returns the response unchanged after clearing', () => {
    useSubscriptionStore.getState().setBlocked('subscription_required', '')

    const fakeResponse = { status: 200, data: { ok: true } }
    const successInterceptor = getResponseSuccessInterceptor()
    const result = successInterceptor(fakeResponse)

    expect(result).toBe(fakeResponse)
  })
})

// ── 5. 401 logout also clears subscription block ─────────────────────────────

describe('apiClient response interceptor — 401 clears subscription block', () => {
  it('clears subscriptionStore.blockState alongside authStore when a 401 fires', async () => {
    // Pre-seed a stale block from a previous tenant session
    useSubscriptionStore.getState().setBlocked('subscription_cancelled', 'Old session block.')

    const errorInterceptor = getResponseErrorInterceptor()
    await expect(errorInterceptor(makeAxios401('/api/patients'))).rejects.toThrow()

    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useSubscriptionStore.getState().blockState).toBeNull()
  })
})
