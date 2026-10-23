import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getRoleEntryPoint } from '../config/roleExperience'

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
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from
  const requestedReturnUrl = new URLSearchParams(location.search).get('returnUrl')
  const passwordChanged = (location.state as { passwordChanged?: boolean } | null)?.passwordChanged === true
  const safeReturnUrl = requestedReturnUrl?.startsWith('/') && !requestedReturnUrl.startsWith('//')
    ? requestedReturnUrl
    : undefined
  const redirectTarget = () => {
    const defaultEntryPoint = getRoleEntryPoint(useAuthStore.getState().tenant?.tenant_role)
    return from ? `${from.pathname ?? defaultEntryPoint}${from.search ?? ''}${from.hash ?? ''}` : safeReturnUrl ?? defaultEntryPoint
  }

  const [email, setEmail] = useState(() => new URLSearchParams(location.search).get('email') ?? '')
  const [password, setPassword] = useState('')
  const [domain, setDomain] = useState(() => new URLSearchParams(location.search).get('domain') ?? import.meta.env.VITE_DEV_TENANT_DOMAIN ?? '')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isLoading = status === 'loading'

  if (status === 'idle') {
    return null
  }

  if (status === 'authenticated') {
    if (user?.mustChangePassword) {
      return <Navigate to="/first-login-password" replace />
    }
    return <Navigate to={redirectTarget()} replace />
  }

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      errors.email = 'Email is required.'
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
      await login({ email: email.trim(), password, domain: domain.trim() || undefined })
      navigate(redirectTarget(), { replace: true })
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
        {passwordChanged && <div className="notice notice--success" role="status">Password updated. Sign in with your new password.</div>}

        <form
          className="login-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Sign in form"
        >
          {/* ── Clinic Domain ─────────────────────────────────── */}
          <div className="form-field">
            <label className="form-label" htmlFor="domain">
              Clinic Domain
            </label>
            <input
              id="domain"
              type="text"
              className="form-input"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. yourclinic.idealcare.ng"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          {/* ── Email ──────────────────────────────────────── */}
          <div className="form-field">
            <label className="form-label" htmlFor="email">
              Email or username
            </label>
            <input
              id="email"
              type="text"
              className={`form-input${fieldErrors.email ? ' form-input--error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
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

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--text)' }}>
          <span>New patient? </span>
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'underline' }}>
            Register for care here
          </Link>
        </div>
      </div>
    </div>
  )
}
