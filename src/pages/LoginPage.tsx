import { type FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import './LoginPage.css'

/**
 * Login page.
 *
 * Delegates all API work to the authStore — no Axios calls here.
 * On success, redirects to /app/dashboard.
 * On failure, shows a generic error message (no backend details exposed).
 */
export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const status = useAuthStore((s) => s.status)
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from
  const redirectTarget = from ? `${from.pathname ?? '/app/dashboard'}${from.search ?? ''}${from.hash ?? ''}` : '/app/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isLoading = status === 'loading'

  if (status === 'idle') {
    return null
  }

  if (status === 'authenticated') {
    return <Navigate to={redirectTarget} replace />
  }

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      errors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address.'
    }

    if (!password) {
      errors.password = 'Password is required.'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)

    if (!validate()) return

    try {
      await login({ email: email.trim(), password })
      navigate(redirectTarget, { replace: true })
    } catch {
      setSubmitError('Invalid email or password. Please try again.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" role="main">
        <div className="login-card__brand" aria-hidden="true">✦</div>
        <h1 className="login-card__title">iDEAL Care</h1>
        <p className="login-card__subtitle">Sign in to your account</p>

        <form
          className="login-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Sign in form"
        >
          {/* ── Email ──────────────────────────────────────── */}
          <div className="form-field">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`form-input${fieldErrors.email ? ' form-input--error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              disabled={isLoading}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <span id="email-error" className="form-error" role="alert">
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* ── Password ───────────────────────────────────── */}
          <div className="form-field">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={`form-input${fieldErrors.password ? ' form-input--error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              aria-invalid={!!fieldErrors.password}
            />
            {fieldErrors.password && (
              <span id="password-error" className="form-error" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* ── Submit error ───────────────────────────────── */}
          {submitError && (
            <div className="form-submit-error" role="alert" aria-live="polite">
              {submitError}
            </div>
          )}

          {/* ── Submit ─────────────────────────────────────── */}
          <button
            type="submit"
            className="login-btn"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
