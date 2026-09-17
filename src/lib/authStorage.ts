/**
 * Isolated authentication persistence layer.
 *
 * All reads/writes to storage go through here so the strategy
 * (localStorage today, httpOnly cookie tomorrow) can be swapped
 * in one place without touching the rest of the app.
 */

const ACCESS_TOKEN_KEY = 'idealcare.accessToken'
const EXPIRES_AT_KEY = 'idealcare.expiresAt'

export const authStorage = {
  saveToken(accessToken: string, expiresAt: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(EXPIRES_AT_KEY, expiresAt)
  },

  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getExpiresAt(): string | null {
    return localStorage.getItem(EXPIRES_AT_KEY)
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(EXPIRES_AT_KEY)
  },

  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem(EXPIRES_AT_KEY)
    if (!expiresAt) return true
    return new Date(expiresAt) <= new Date()
  },
}
