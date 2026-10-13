import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../stores/authStore'
import LoginPage from '../pages/LoginPage'

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderLoginPage(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LoginPage />
    </MemoryRouter>,
  )
}

/** Reset Zustand store and localStorage between tests. */
beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({
    status: 'unauthenticated',
    user: null,
    accessToken: null,
    tenant: null,
  })
})

// ── 1. Login page renders ─────────────────────────────────────────────────────

describe('LoginPage renders', () => {
  it('shows the email field, password field, and submit button', () => {
    renderLoginPage()

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})

// ── 2. Login validation ───────────────────────────────────────────────────────

describe('LoginPage validation', () => {
  it('shows an error when email is empty', async () => {
    renderLoginPage()

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
  })

  it('shows an error when email format is invalid', async () => {
    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('shows an error when password is empty', async () => {
    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
  })
})

// ── 3. Successful login stores authentication state ───────────────────────────

describe('Successful login', () => {
  it('stores authentication state after a successful login', async () => {
    const mockLogin = vi.fn(async () => {
      useAuthStore.setState({
        status: 'authenticated',
        accessToken: 'test-token',
        user: {
          id: '1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
        tenant: null,
      })
    })

    useAuthStore.setState({ login: mockLogin } as Partial<ReturnType<typeof useAuthStore.getState>>)

    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      const { status, accessToken } = useAuthStore.getState()
      expect(status).toBe('authenticated')
      expect(accessToken).toBe('test-token')
    })
  })
})

// ── 4. Failed login displays error ───────────────────────────────────────────

describe('Failed login', () => {
  it('displays a generic error message when login fails', async () => {
    const mockLogin = vi.fn(async () => {
      throw new Error('401 Unauthorized')
    })

    useAuthStore.setState({ login: mockLogin } as Partial<ReturnType<typeof useAuthStore.getState>>)

    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(
      await screen.findByText(/invalid email or password/i),
    ).toBeInTheDocument()
  })
})
