import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { staffApi, type CreatedTenantStaffDto, type TenantStaffDto } from '../api/staffApi'

const initialForm = { firstName: '', lastName: '', email: '', userName: '', role: 'Nurse' as 'Nurse' | 'Staff' }

function requestError(error: unknown) {
  if (!axios.isAxiosError(error)) return 'The request could not be completed.'
  const data = error.response?.data as { message?: string; errors?: string[] } | undefined
  return data?.errors?.join(' ') || data?.message || 'The request could not be completed.'
}

export default function StaffManagementPage() {
  const [members, setMembers] = useState<TenantStaffDto[]>([])
  const [created, setCreated] = useState<CreatedTenantStaffDto | null>(null)
  const [form, setForm] = useState(initialForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try { setMembers(await staffApi.list()) }
    catch (requestError) { setError(requestErrorText(requestError)) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError(null)
    try {
      const result = await staffApi.create({
        ...form,
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        email: form.email.trim(), userName: form.userName.trim(),
      })
      setCreated(result); setCopied(false); setModalOpen(false); setForm(initialForm)
      setMembers((current) => [...current, result.staff].sort((a, b) => a.firstName.localeCompare(b.firstName)))
    } catch (requestError) { setError(requestErrorText(requestError)) }
    finally { setSaving(false) }
  }

  async function copyTemporaryPassword() {
    if (!created) return
    try { await navigator.clipboard.writeText(created.temporaryPassword); setCopied(true) }
    catch { setError('Clipboard access was denied. Select and copy the temporary password manually.') }
  }

  return <section className="staff-management">
    <header className="staff-management__header">
      <div><span className="eyebrow">Team management</span><h2>Care staff</h2><p className="muted">Register care staff, then assign them to admitted patients from each patient profile.</p></div>
      <button className="primary-button" type="button" onClick={() => { setError(null); setModalOpen(true) }}>Register staff</button>
    </header>

    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {created && <section className="staff-credentials" aria-label="New staff sign-in details">
      <div><span className="eyebrow">Account created · share once</span><h3>{created.staff.firstName} {created.staff.lastName}</h3>
        <p>Sign-in username: <strong>{created.staff.userName}</strong> · Email: <strong>{created.staff.email}</strong></p>
        <p className="staff-credentials__password">Temporary password: <code>{created.temporaryPassword}</code></p>
        <p className="muted">The staff member must set a new password at first sign-in. This temporary password will not be shown again.</p>
      </div>
      <button className="secondary-button" type="button" onClick={() => void copyTemporaryPassword()}>{copied ? 'Copied' : 'Copy password'}</button>
    </section>}

    <section className="staff-management__list">
      <div className="staff-management__list-heading"><div><span className="eyebrow">Tenant team</span><h3>Active staff</h3></div><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
      {loading ? <p className="state-message">Loading staff…</p> : members.length === 0 ? <p className="state-message">No care staff have been registered yet.</p> : <div className="staff-management__table-wrap"><table className="staff-management__table"><thead><tr><th>Name</th><th>Role</th><th>Username</th><th>Email</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td>{member.firstName} {member.lastName}</td><td><span className="staff-role-pill">{member.role}</span></td><td>{member.userName}</td><td>{member.email}</td></tr>)}</tbody></table></div>}
    </section>

    {modalOpen && <div className="modal-backdrop" role="presentation"><form className="modal-content staff-registration-modal" role="dialog" aria-modal="true" aria-labelledby="register-staff-title" onSubmit={submit}>
      <h3 className="modal-title" id="register-staff-title">Register care staff</h3>
      <p className="modal-subtitle">A temporary password will be generated. The staff member must replace it at first sign-in.</p>
      <div className="form-grid">
        <label className="form-field"><span>First name</span><input className="form-input" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required maxLength={100} /></label>
        <label className="form-field"><span>Last name</span><input className="form-input" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required maxLength={100} /></label>
        <label className="form-field"><span>Email</span><input className="form-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required maxLength={256} /></label>
        <label className="form-field"><span>Username</span><input className="form-input" value={form.userName} onChange={(event) => setForm({ ...form, userName: event.target.value })} required minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" /></label>
        <label className="form-field"><span>Role</span><select className="form-input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as 'Nurse' | 'Staff' })}><option value="Nurse">Nurse</option><option value="Staff">Care staff</option></select></label>
      </div>
      {error && <div className="notice notice--error" role="alert">{error}</div>}
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Creating account…' : 'Create staff account'}</button></div>
    </form></div>}
  </section>
}

function requestErrorText(error: unknown) { return requestError(error) }
