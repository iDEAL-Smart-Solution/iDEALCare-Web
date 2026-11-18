import { useCallback, useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { careOperationsApi, homeCareStatusLabels, type HomeCareRequestDto } from '../api/careOperationsApi'
import { patientApi } from '../api/patientApi'
import type { PatientDto } from '../types/patient'

const errorText = (error: unknown) => axios.isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message ?? 'Your home-care request could not be completed.' : 'Your home-care request could not be completed.'

export default function PatientHomeCarePage() {
  const [patient, setPatient] = useState<PatientDto | null>(null)
  const [requests, setRequests] = useState<HomeCareRequestDto[]>([])
  const [form, setForm] = useState({ address: '', city: '', state: '', country: '', locationNotes: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const current = await patientApi.getMe(); setPatient(current)
      setForm((old) => ({ address: current.homeCareAddress || current.address || old.address, city: current.homeCareCity || current.city || old.city, state: current.homeCareState || current.state || old.state, country: current.homeCareCountry || current.country || old.country, locationNotes: old.locationNotes }))
      setRequests(await careOperationsApi.myHomeCareRequests(current.id))
    } catch (loadError) { setError(errorText(loadError)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!patient) return
    setSaving(true); setError(''); setNotice('')
    try {
      await careOperationsApi.createMyHomeCareRequest({ patientId: patient.id, ...form, locationNotes: form.locationNotes.trim() || undefined })
      setNotice('Your home-care request was sent to the provider.'); setForm((old) => ({ ...old, locationNotes: '' })); await load()
    } catch (submitError) { setError(errorText(submitError)) }
    finally { setSaving(false) }
  }
  const hasOpenRequest = requests.some((request) => ![6, 7].includes(request.status))
  if (loading) return <p className="state-message">Loading your home-care requests…</p>
  return <section className="patient-home-care"><header className="patients-page__header"><div><p className="eyebrow">Home care</p><h2>Request care at home</h2><p className="muted">Share the visit location so your provider can assess travel and care needs.</p></div><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}{notice && <div className="notice notice--info" role="status">{notice}</div>}
    {patient?.careLocationType !== 2 && <div className="notice notice--info" role="status">Your current care preference is facility-based. You can still submit a home-care request for provider review.</div>}
    {!hasOpenRequest && <form className="patient-dashboard__panel patient-home-care__form" onSubmit={(event) => void submit(event)}><h3>Home visit details</h3><div className="patient-home-care__fields"><label className="form-field"><span>Street address</span><input className="form-input" required maxLength={500} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label className="form-field"><span>City</span><input className="form-input" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} maxLength={100} /></label><label className="form-field"><span>State</span><input className="form-input" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} maxLength={100} /></label><label className="form-field"><span>Country</span><input className="form-input" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} maxLength={100} /></label><label className="form-field patient-home-care__wide"><span>Access, environment, or visit notes</span><textarea className="form-input form-textarea" rows={3} maxLength={2000} value={form.locationNotes} onChange={(event) => setForm({ ...form, locationNotes: event.target.value })} /></label></div><p className="patient-home-care__privacy">Your address and notes are shared with your provider's authorized care team for service planning.</p><button type="submit" className="primary-button" disabled={saving || !form.address.trim()}>{saving ? 'Submitting…' : 'Submit home-care request'}</button></form>}
    {hasOpenRequest && <section className="patient-dashboard__panel"><h3>Request under review</h3><p className="patient-dashboard__empty">You already have an open home-care request. Your provider will update its status here.</p></section>}
    <section className="patient-dashboard__panel"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">History</span><h3>Your home-care requests</h3></div></div>{requests.length ? <ul className="guardian-portal__list">{requests.map((request) => <li key={request.id}><div><strong>{homeCareStatusLabels[request.status]}</strong><span>{[request.address, request.city, request.state, request.country].filter(Boolean).join(', ')}</span>{request.providerNotes && <span>Provider update: {request.providerNotes}</span>}</div><time>{new Date(request.createdAt).toLocaleDateString()}</time></li>)}</ul> : <p className="patient-dashboard__empty">You have not made a home-care request yet.</p>}</section>
  </section>
}
