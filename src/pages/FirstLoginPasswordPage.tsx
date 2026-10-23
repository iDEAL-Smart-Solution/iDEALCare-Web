import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'

export default function FirstLoginPasswordPage() {
  const user = useAuthStore((state) => state.user)
  const tenant = useAuthStore((state) => state.tenant)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!temporaryPassword) {
      setError('Enter the temporary password from your account email.')
      return
    }
    if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      setError('Use at least 8 characters, including uppercase, lowercase, a number, and a symbol.')
      return
    }
    if (newPassword !== confirmation) {
      setError('The new passwords do not match.')
      return
    }

    setSaving(true)
    try {
      await apiClient.post('/api/auth/patient/complete-first-login', {
        temporaryPassword,
        newPassword,
      })
      logout()
      const loginUrl = `/login?email=${encodeURIComponent(user?.email ?? '')}&domain=${encodeURIComponent(tenant?.domain ?? '')}`
      navigate(loginUrl, { replace: true, state: { passwordChanged: true } })
    } catch {
      setError('The temporary password is incorrect or the new password does not meet the requirements.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" role="main">
        <div className="login-card__brand" aria-hidden="true">✦</div>
        <h1 className="login-card__title">Secure your account</h1>
        <p className="login-card__subtitle">Your first sign-in uses a temporary password. Choose a personal password to continue.</p>
        <form className="login-form" onSubmit={submit} noValidate>
          <div className="form-field">
            <label className="form-label" htmlFor="temporary-password">Temporary password</label>
            <input id="temporary-password" className="form-input" type="password" autoComplete="current-password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} disabled={saving} required />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="new-password">New password</label>
            <input id="new-password" className="form-input" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={saving} required />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" className="form-input" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={saving} required />
          </div>
          {error && <div className="form-submit-error" role="alert">{error}</div>}
          <button className="login-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Set my password'}</button>
        </form>
      </div>
    </div>
  )
}
