import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { careOperationsApi, homeCareStatusLabels, type HomeCareRequestDto, type HomeCareStatus } from '../api/careOperationsApi'
import { staffApi, type TenantStaffDto } from '../api/staffApi'
import { useAuthStore } from '../stores/authStore'

const message = (error: unknown) => axios.isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message ?? 'The request could not be completed.' : 'The request could not be completed.'

export default function HomeCareOperationsPage() {
  const role = useAuthStore((state) => state.tenant?.tenant_role?.toLowerCase())
  const isAdmin = role === 'owner' || role === 'admin'
  const [requests, setRequests] = useState<HomeCareRequestDto[]>([])
  const [staff, setStaff] = useState<TenantStaffDto[]>([])
  const [distance, setDistance] = useState<Record<string, string>>({})
  const [travel, setTravel] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [rows, staffRows] = await Promise.all([careOperationsApi.homeCareRequests(), isAdmin ? staffApi.list().catch(() => []) : Promise.resolve([] as TenantStaffDto[])])
      setRequests(rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())); setStaff(staffRows.filter((person) => person.isActive))
      setDistance(Object.fromEntries(rows.map((row) => [row.id, row.estimatedDistanceKm?.toString() ?? ''])))
      setTravel(Object.fromEntries(rows.map((row) => [row.id, row.estimatedTravelTime ?? ''])))
      setNotes(Object.fromEntries(rows.map((row) => [row.id, row.providerNotes ?? ''])))
    } catch (loadError) { setError(message(loadError)) }
    finally { setLoading(false) }
  }, [isAdmin])
  useEffect(() => { void load() }, [load])
  async function update(id: string, action: () => Promise<unknown>, success: string) {
    setBusyId(id); setError(''); setNotice('')
    try { await action(); setNotice(success); await load() }
    catch (requestError) { setError(message(requestError)) }
    finally { setBusyId('') }
  }
  return <section className="care-operations-page">
    <header className="patients-page__header"><div><p className="eyebrow">Mobile care</p><h2>Home-care requests</h2><p className="muted">Review patient locations, record service-area details, assign caregivers, and track home-care delivery.</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}{notice && <div className="notice notice--info" role="status">{notice}</div>}
    {loading ? <p className="state-message">Loading home-care requests…</p> : requests.length ? <div className="care-operations__cards">{requests.map((item) => <article className="patient-dashboard__panel home-care-card" key={item.id}><header><div><span className={`home-care-card__status home-care-card__status--${item.status}`}>{homeCareStatusLabels[item.status]}</span><h3>{item.patientName || 'Patient care request'}</h3><p>{[item.address, item.city, item.state, item.country].filter(Boolean).join(', ')}</p></div><time>{new Date(item.createdAt).toLocaleDateString()}</time></header>{item.locationNotes && <p><strong>Patient location notes:</strong> {item.locationNotes}</p>}
      <div className="home-care-card__metrics"><label className="form-field"><span>Estimated distance (km)</span><input className="form-input" type="number" min="0" step="0.1" value={distance[item.id] ?? ''} onChange={(event) => setDistance({ ...distance, [item.id]: event.target.value })} /></label><label className="form-field"><span>Travel time</span><input className="form-input" value={travel[item.id] ?? ''} onChange={(event) => setTravel({ ...travel, [item.id]: event.target.value })} placeholder="e.g. 35 minutes" maxLength={100} /></label><label className="form-field home-care-card__notes"><span>Provider assessment notes</span><textarea className="form-input form-textarea" rows={2} value={notes[item.id] ?? ''} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} maxLength={2000} /></label></div>
      <div className="home-care-card__actions"><button type="button" className="secondary-button" disabled={busyId === item.id} onClick={() => void update(item.id, () => careOperationsApi.assessHomeCare(item.id, { estimatedDistanceKm: distance[item.id] ? Number(distance[item.id]) : undefined, estimatedTravelTime: travel[item.id]?.trim() || undefined, providerNotes: notes[item.id]?.trim() || undefined, status: item.status === 1 ? 2 : undefined }), 'Location assessment saved.')}>Save location assessment</button>{isAdmin && <label className="form-field"><span>Assigned caregiver</span><select className="form-input" value={item.assignedStaffUserId ?? ''} disabled={busyId === item.id} onChange={(event) => void update(item.id, () => careOperationsApi.assignHomeCareStaff(item.id, event.target.value || undefined), 'Caregiver assignment updated.')}><option value="">Unassigned</option>{staff.map((person) => <option value={person.id} key={person.id}>{person.firstName} {person.lastName}</option>)}</select></label>}<label className="form-field"><span>Care status</span><select className="form-input" value={item.status} disabled={busyId === item.id} onChange={(event) => void update(item.id, () => careOperationsApi.updateHomeCareStatus(item.id, Number(event.target.value) as HomeCareStatus, notes[item.id]), 'Home-care status updated.')}><option value={1}>Requested</option><option value={2}>Under review</option><option value={3}>Approved</option><option value={4}>Scheduled</option><option value={5}>In progress</option><option value={6}>Completed</option><option value={7}>Cancelled</option></select></label></div>
    </article>)}</div> : <section className="patient-dashboard__panel"><p className="patient-dashboard__empty">There are no home-care requests yet.</p></section>}
  </section>
}
