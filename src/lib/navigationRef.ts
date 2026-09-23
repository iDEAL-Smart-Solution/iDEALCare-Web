import type { NavigateFunction } from 'react-router-dom'

/**
 * Module-level navigation ref.
 *
 * React Router's useNavigate() is only available inside components, but
 * apiClient.ts is a plain module. App.tsx calls setNavigate() once on mount
 * (after BrowserRouter is ready) so the response interceptor can perform
 * programmatic navigation without a hard page reload.
 *
 * Nothing outside of App.tsx should call setNavigate().
 * Nothing outside of apiClient.ts should call navigate().
 */
let _navigate: NavigateFunction | null = null

export function setNavigate(fn: NavigateFunction): void {
  _navigate = fn
}

export function navigate(to: string): void {
  if (_navigate) {
    _navigate(to, { replace: true })
  } else {
    // Fallback: router not mounted yet (e.g. very early error during init).
    window.location.href = to
  }
}
