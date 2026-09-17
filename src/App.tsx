import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './routes/ProtectedRoute'
import { useAuthStore } from './stores/authStore'

/**
 * Root component.
 *
 * Restores authentication state once on mount, then renders the route tree.
 *
 * Route structure:
 *   /              → redirect to /app/dashboard
 *   /login         → LoginPage (public)
 *   /app           → ProtectedRoute + AppLayout
 *   /app/dashboard → DashboardPage
 */
export default function App() {
  const restoreAuth = useAuthStore((s) => s.restoreAuth)

  useEffect(() => {
    restoreAuth()
  }, [restoreAuth])

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/app/dashboard" element={<DashboardPage />} />
          {/* /app → redirect to dashboard */}
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  )
}
