import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import { setNavigate } from './lib/navigationRef'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './routes/ProtectedRoute'
import { useAuthStore } from './stores/authStore'

/**
 * Root component.
 *
 * Restores authentication state once on mount, then renders the route tree.
 *
 * Also wires the router's navigate function into navigationRef so that
 * apiClient's response interceptor can perform programmatic navigation
 * without a hard reload (plain modules cannot call useNavigate directly).
 *
 * Route structure:
 *   /              → redirect to /app/dashboard
 *   /login         → LoginPage (public)
 *   /app           → ProtectedRoute + AppLayout
 *   /app/dashboard → DashboardPage
 */
export default function App() {
  const restoreAuth = useAuthStore((s) => s.restoreAuth)
  const nav = useNavigate()

  useEffect(() => {
    setNavigate(nav)
  }, [nav])

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
