import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import type { GuardianAccessDto, GuardianDirectoryDto } from '../types/guardian'
import { guardianPermissions } from '../types/guardian'

function message(error: unknown) {
  return axios.isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message ?? 'The guardian request could not be completed.' : 'The guardian request could not be completed.'
}

export default function PatientGuardiansPanel({ patientId }: { patientId: string }) {
  const [guardians, setGuardians] = useState<GuardianAccessDto[]>([])
  const [email, setEmail] = useState('')
  const [relationship, setRelationship] = useState('')
  const [primary, setPrimary] = useState(false)
  const [lookup, setLookup] = useState<GuardianDirectoryDto | null>(null)
  const [permissions, setPermissions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = useMemo(() => guardians.filter((item) => item.isActive), [guardians])

  async function load() {
    setLoading(true); setError(null)
    try { setGuardians(await patientApi.listGuardians(patientId)) }
    catch (requestError) { setError(message(requestError)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [patientId])

  async function findGuardian() {
    setError(null); setLookup(null)
    try { setLookup(await patientApi.findGuardianByEmail(email.trim())) }
    catch (requestError) { setError(message(requestError)) }
  }
  function toggle(bit: number) { setPermissions((current) => current & bit ? current & ~bit : current | bit) }
  async function linkGuardian() {
    if (!lookup || !relationship.trim() || !permissions) return
    setSaving(true); setError(null)
    try {
      await patientApi.assignGuardian(patientId, { guardianId: lookup.id, relationship: relationship.trim(), isPrimary: primary, permissions })
      setLookup(null); setEmail(''); setRelationship(''); setPermissions(0); setPrimary(false); await load()
    } catch (requestError) { setError(message(requestError)) }
    finally { setSaving(false) }
  }
  async function changePermissions(link: GuardianAccessDto, next: number) {
    setSaving(true); setError(null)
    try { await patientApi.updateGuardianPermissions(patientId, link.guardianId, { grant: next & ~link.permissions, revoke: link.permissions & ~next }); await load() }
    catch (requestError) { setError(message(requestError)) }
    finally { setSaving(false) }
  }
  async function revoke(link: GuardianAccessDto) {
    setSaving(true); setError(null)
    try { await patientApi.revokeGuardian(patientId, link.guardianId); await load() }
    catch (requestError) { setError(message(requestError)) }
    finally { setSaving(false) }
  }

  return <section className="review-card guardian-management">
    <div className="patient-staff-assignments__heading"><div><h3>Guardian access</h3><p className="muted">Link a guardian account registered with this provider. The patient must approve before access becomes active.</p></div><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button></div>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {loading ? <p className="muted">Loading guardian access…</p> : active.length === 0 ? <p className="muted">No guardian accounts are linked yet.</p> : <ul className="guardian-management__list">{active.map((link) => <li key={link.guardianId}>
      <div className="guardian-management__identity"><strong>{link.guardianFirstName} {link.guardianLastName}</strong><span>{link.guardianEmail} · {link.relationship}{link.isPrimary ? ' · Primary contact' : ''}</span><span className={link.consentGranted ? 'guardian-management__status guardian-management__status--active' : 'guardian-management__status'}>{link.consentGranted ? 'Patient approved · access active' : 'Waiting for patient approval'}</span></div>
      <fieldset className="guardian-management__permissions"><legend>Allowed information</legend>{guardianPermissions.map(({ bit, label }) => <label key={bit}><input type="checkbox" checked={(link.permissions & bit) !== 0} disabled={saving} onChange={() => void changePermissions(link, link.permissions & bit ? link.permissions & ~bit : link.permissions | bit)} />{label}</label>)}</fieldset>
      <button className="secondary-button" type="button" disabled={saving} onClick={() => void revoke(link)}>Revoke access</button>
    </li>)}</ul>}
    <div className="guardian-management__add"><h4>Link a registered guardian</h4><div className="guardian-management__lookup"><label className="form-field"><span>Guardian email</span><input className="form-input" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setLookup(null) }} placeholder="guardian@example.com" disabled={saving} /></label><button className="secondary-button" type="button" onClick={() => void findGuardian()} disabled={saving || !email.trim()}>Find account</button></div>
      {lookup && <div className="guardian-management__form"><p>Found: <strong>{lookup.firstName} {lookup.lastName}</strong> · {lookup.email}</p><div className="guardian-management__lookup"><label className="form-field"><span>Relationship to patient</span><input className="form-input" value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="e.g. Daughter" disabled={saving} /></label><label className="guardian-management__primary"><input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} disabled={saving} /> Primary guardian</label></div><fieldset className="guardian-management__permissions"><legend>Permissions to request</legend>{guardianPermissions.map(({ bit, label }) => <label key={bit}><input type="checkbox" checked={(permissions & bit) !== 0} onChange={() => toggle(bit)} disabled={saving} />{label}</label>)}</fieldset><button className="primary-button" type="button" onClick={() => void linkGuardian()} disabled={saving || !relationship.trim() || permissions === 0}>{saving ? 'Saving…' : 'Link guardian'}</button></div>}
    </div>
  </section>
}
