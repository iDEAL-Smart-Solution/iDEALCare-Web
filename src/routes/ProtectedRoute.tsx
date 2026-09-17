import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

/**
 * Wraps authenticated routes.
 *
 * - Renders child routes via <Outlet /> when the user is authenticated.
 * - Redirects to /login for unauthenticated users.
 * - While auth state is still being restored (idle) we render nothing to
 *   avoid a flash-redirect before the token check completes.
 */
export default function ProtectedRoute() {
  const status = useAuthStore((s) => s.status)

  if (status === 'idle') {
    // Auth restoration hasn't run yet — avoid a premature redirect.
    return null
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  // 'loading' and 'authenticated' both pass through; the loading spinner
  // is rendered by the page/layout that triggered the login, not here.
  return <Outlet />
}
