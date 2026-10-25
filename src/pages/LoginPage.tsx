import { type FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getRoleEntryPoint } from '../config/roleExperience'
import { authApi } from '../api/authApi'

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
  // Tenant selection follows the current clinic host. Keep explicit URL and
  // local development overrides for existing tenant-specific login links.
  const domainOverride = new URLSearchParams(location.search).get('domain')?.trim()
    || import.meta.env.VITE_DEV_TENANT_DOMAIN
  const brandingDomain = domainOverride || window.location.hostname
  const [tenantBranding, setTenantBranding] = useState<{ tenantName: string; logoUrl?: string | null } | null>(null)
  const [tenantLogoFailed, setTenantLogoFailed] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isLoading = status === 'loading'

  useEffect(() => {
    if (typeof authApi.getTenantBranding !== 'function') return
    let active = true
    authApi.getTenantBranding(brandingDomain)
      .then((branding) => {
        if (active) setTenantBranding(branding)
      })
      .catch(() => {
        if (active) setTenantBranding(null)
      })
    return () => { active = false }
  }, [brandingDomain])

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
      await login({ email: email.trim(), password, domain: domainOverride || undefined })
      navigate(redirectTarget(), { replace: true })
    } catch {
      setSubmitError('Invalid email or password. Please try again.')
    }
  }

  return (
    <div className="login-page">
      <main className="login-card">
        <section className="login-welcome" aria-label="About iDEAL Care">
          <div className="login-welcome__brand">
            {tenantBranding?.logoUrl && !tenantLogoFailed
              ? <img className="login-welcome__tenant-logo" src={tenantBranding.logoUrl} alt="" onError={() => setTenantLogoFailed(true)} />
              : <span className="login-welcome__mark" aria-hidden="true">✦</span>}
            <span>{tenantBranding?.tenantName || 'iDEAL Care'}</span>
          </div>
          <div className="login-welcome__message">
            <p className="login-welcome__eyebrow">CARE, CONNECTED</p>
            <h1>Better care starts with being connected.</h1>
            <p className="login-welcome__copy">A trusted place to manage your care and stay connected with your health team.</p>
          </div>
          <div className="login-welcome__assurance">
            <span className="login-welcome__assurance-icon" aria-hidden="true">✓</span>
            <span>Your care information, in one secure place</span>
          </div>
          <span className="login-welcome__cross" aria-hidden="true">+</span>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel__heading">
            <p className="login-panel__eyebrow">WELCOME BACK</p>
            <h2 id="login-title" className="login-card__title">Sign in to your account</h2>
            <p className="login-card__subtitle">Enter your details to continue to your care portal.</p>
          </div>
          {passwordChanged && <div className="notice notice--success" role="status">Password updated. Sign in with your new password.</div>}

        <form
          className="login-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Sign in form"
        >
          {/* ── Clinic Domain ─────────────────────────────────── */}
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

          <div className="login-register">
            <span className="login-register__prompt">New to iDEAL Care?</span>
            <Link to="/register" className="login-register__link">
              Register as a patient <span aria-hidden="true">→</span>
          </Link>
            <p>Create your patient account to get started.</p>
            <p>Supporting a patient? <Link to="/guardian/register" className="login-register__link">Register as a guardian</Link></p>
          </div>
        </section>
      </main>
    </div>
  )
}
