import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import ProtectedRoute from '../routes/ProtectedRoute'
import { useAuthStore } from '../stores/authStore'

beforeEach(() => {
  localStorage.clear()
})

function renderWithAuth(authStatus: 'authenticated' | 'unauthenticated' | 'idle' | 'loading') {
  useAuthStore.setState({
    status: authStatus,
    user:
      authStatus === 'authenticated'
        ? { id: '1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }
        : null,
    accessToken: authStatus === 'authenticated' ? 'test-token' : null,
    tenant: null,
  })

  return render(
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app/dashboard" element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

// ── 5. Protected route redirects unauthenticated users ────────────────────────

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    renderWithAuth('unauthenticated')

    expect(screen.getByText('Login Page')).toBeTruthy()
    expect(screen.queryByText('Dashboard')).toBeNull()
  })

  // ── 6. Authenticated users can access /app/dashboard ───────────────────────

  it('allows authenticated users to access /app/dashboard', () => {
    renderWithAuth('authenticated')

    expect(screen.getByText('Dashboard')).toBeTruthy()
    expect(screen.queryByText('Login Page')).toBeNull()
  })

  it('does not render protected content while auth is loading', () => {
    renderWithAuth('loading')

    expect(screen.queryByText('Dashboard')).toBeNull()
    expect(screen.queryByText('Login Page')).toBeNull()
  })
})
