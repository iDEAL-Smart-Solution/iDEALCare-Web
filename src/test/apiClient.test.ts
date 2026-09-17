import { beforeEach, describe, expect, it } from 'vitest'
import apiClient from '../lib/apiClient'
import { authStorage } from '../lib/authStorage'
import type { InternalAxiosRequestConfig } from 'axios'

// Pull out the first registered request interceptor fulfilled handler
function getInterceptorFulfilled() {
  // Axios stores handlers on the interceptors manager
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

beforeEach(() => {
  localStorage.clear()
})

// ── 8. Axios attaches the Bearer token ───────────────────────────────────────

describe('apiClient interceptor', () => {
  it('attaches Authorization header when a token is stored', () => {
    authStorage.saveToken('my-test-token', new Date(Date.now() + 3600 * 1000).toISOString())

    const config = getInterceptorFulfilled()(makeConfig())

    expect(config.headers['Authorization']).toBe('Bearer my-test-token')
  })

  it('does not attach Authorization header when no token is stored', () => {
    // localStorage was cleared in beforeEach — no token present
    const config = getInterceptorFulfilled()(makeConfig())

    expect(config.headers['Authorization']).toBeUndefined()
  })
})
