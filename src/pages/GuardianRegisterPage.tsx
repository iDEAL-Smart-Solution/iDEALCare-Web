import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { authApi, getTenantDomain } from '../api/authApi'
import { useAuthStore } from '../stores/authStore'

export default function GuardianRegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', userName: '', password: '', phoneNumber: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  function change(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setSubmitting(true)
    try {
      const session = await authApi.registerGuardian({ ...form, domain: getTenantDomain() })
      setSession(session)
      navigate('/app/guardian/dashboard', { replace: true })
    } catch (requestError) {
      setError(axios.isAxiosError(requestError)
        ? (requestError.response?.data as { message?: string } | undefined)?.message ?? 'We could not create your account. Check your details and try again.'
        : 'We could not create your account. Check your details and try again.')
    } finally { setSubmitting(false) }
  }
  return <main className="register-page"><section className="register-card">
    <span className="register-card__eyebrow">Guardian portal</span><h1>Create your account</h1>
    <p className="muted">Register with the care provider your family member is receiving care from. Their provider can then link your account, and the patient approves what you can access.</p>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    <form onSubmit={(event) => void submit(event)}>
      <div className="register-grid">
        <Field id="guardian-first" label="First name" value={form.firstName} onChange={(v) => change('firstName', v)} required disabled={submitting} />
        <Field id="guardian-last" label="Last name" value={form.lastName} onChange={(v) => change('lastName', v)} required disabled={submitting} />
        <Field id="guardian-email" label="Email" type="email" value={form.email} onChange={(v) => change('email', v)} required disabled={submitting} />
        <Field id="guardian-username" label="Username" value={form.userName} onChange={(v) => change('userName', v)} required disabled={submitting} />
        <Field id="guardian-phone" label="Phone (optional)" value={form.phoneNumber} onChange={(v) => change('phoneNumber', v)} disabled={submitting} />
        <Field id="guardian-password" label="Password" type="password" value={form.password} onChange={(v) => change('password', v)} required disabled={submitting} />
      </div>
      <button className="register-btn" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create guardian account'}</button>
    </form>
    <div className="register-footer"><span>Already have an account? </span><Link to="/login" className="register-link">Sign in</Link><span> · </span><Link to="/register" className="register-link">Patient registration</Link></div>
  </section></main>
}

function Field({ id, label, value, onChange, type = 'text', required = false, disabled = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; disabled?: boolean
}) {
  return <div className="form-field"><label className="form-label" htmlFor={id}>{label}{required ? ' *' : ''}</label><input id={id} className="form-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} autoComplete={id.includes('password') ? 'new-password' : undefined} /></div>
}
