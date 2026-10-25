import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { useSubscriptionStore } from '../stores/subscriptionStore'
import type { SubscriptionBlockReason } from '../types/subscription'
import { authStorage } from './authStorage'
import { navigate } from './navigationRef'

const LOGIN_ENDPOINT = '/api/auth/login'
const PUBLIC_ENDPOINTS = ['/api/auth/tenant-branding', '/api/care-services/catalog']

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor ───────────────────────────────────────────────────────

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  // 2xx — clear any stale subscription block, but only when one is set.
  (response) => {
    if (useSubscriptionStore.getState().blockState !== null) {
      useSubscriptionStore.getState().clearBlocked()
    }
    return response
  },

  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const requestUrl = error.config?.url ?? ''


    if (status === 401) {
      if (requestUrl.includes(LOGIN_ENDPOINT) || PUBLIC_ENDPOINTS.some((endpoint) => requestUrl.includes(endpoint)) || window.location.pathname === '/register') {
        return Promise.reject(error)
      }

      // Already on /login — don't redirect again.
      if (window.location.pathname === '/login') {
        return Promise.reject(error)
      }
      useAuthStore.getState().logout()
      useSubscriptionStore.getState().clearBlocked()
      navigate('/login')

      return Promise.reject(error)
    }

    // ── 402: tenant subscription block ───────────────────────────────────────

    if (status === 402) {
      const body = error.response?.data as { error?: string; message?: string } | undefined
      const reason = (body?.error ?? 'subscription_required') as SubscriptionBlockReason
      const message = body?.message ?? ''

      useSubscriptionStore.getState().setBlocked(reason, message)

      return Promise.reject(error)
    }

    // All other errors — pass through unchanged.
    return Promise.reject(error)
  },
)

export default apiClient
