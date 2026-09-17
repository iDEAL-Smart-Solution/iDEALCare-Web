import axios from 'axios'
import { authStorage } from './authStorage'

/**
 * Single Axios instance for the entire application.
 *
 * Base URL is read from the Vite environment variable VITE_API_BASE_URL.
 * The request interceptor attaches the Bearer token when one is stored.
 * No other file should create its own Axios instance.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
