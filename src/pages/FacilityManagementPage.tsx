import { useCallback, useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { bedStatusLabels, careOperationsApi, type FacilityDto } from '../api/careOperationsApi'
import { useAuthStore } from '../stores/authStore'

const requestMessage = (error: unknown) => axios.isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message ?? 'The facility request could not be completed.' : 'The facility request could not be completed.'

export default function FacilityManagementPage() {
  const role = useAuthStore((state) => state.tenant?.tenant_role?.toLowerCase())
  const canManage = role === 'owner' || role === 'admin'
  const [facilities, setFacilities] = useState<FacilityDto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newFacility, setNewFacility] = useState(false)
  const [facilityForm, setFacilityForm] = useState({ name: '', address: '', city: '', state: '', country: '' })
  const [roomNames, setRoomNames] = useState<Record<string, string>>({})
  const [bedLabels, setBedLabels] = useState<Record<string, string>>({})
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setFacilities(await careOperationsApi.facilities()) }
    catch (loadError) { setError(requestMessage(loadError)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function action(run: () => Promise<unknown>, success: string) {
    setSaving(true); setError(''); setNotice('')
    try { await run(); setNotice(success); await load() }
    catch (requestError) { setError(requestMessage(requestError)) }
    finally { setSaving(false) }
  }
  async function createFacility(event: FormEvent) {
    event.preventDefault()
    await action(() => careOperationsApi.createFacility({ ...facilityForm, isActive: true }), 'Facility created.')
    setFacilityForm({ name: '', address: '', city: '', state: '', country: '' }); setNewFacility(false)
  }
  async function createRoom(event: FormEvent, facilityId: string) {
    event.preventDefault()
    const name = roomNames[facilityId]?.trim()
    if (!name) return
    await action(() => careOperationsApi.createRoom(facilityId, { name, isActive: true }), 'Room added.')
    setRoomNames({ ...roomNames, [facilityId]: '' })
  }
  async function createBed(event: FormEvent, facilityId: string, roomId: string) {
    event.preventDefault()
    const label = bedLabels[roomId]?.trim()
    if (!label) return
    await action(() => careOperationsApi.createBed(facilityId, roomId, { label, status: 1 }), 'Bed added.')
    setBedLabels({ ...bedLabels, [roomId]: '' })
  }
  return <section className="facility-page">
    <header className="patients-page__header"><div><p className="eyebrow">Facility care</p><h2>Facilities & rooms</h2><p className="muted">Manage locations and maintain internal room and bed availability for care operations.</p></div><div className="modal-actions">{canManage && <button className="primary-button" type="button" onClick={() => setNewFacility((value) => !value)}>Add facility</button>}<button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}{notice && <div className="notice notice--info" role="status">{notice}</div>}
    {newFacility && <form className="patient-dashboard__panel facility-page__form" onSubmit={(event) => void createFacility(event)}><h3>New facility</h3><div className="facility-page__fields"><label className="form-field"><span>Name</span><input className="form-input" required maxLength={200} value={facilityForm.name} onChange={(event) => setFacilityForm({ ...facilityForm, name: event.target.value })} /></label>{(['address', 'city', 'state', 'country'] as const).map((field) => <label className="form-field" key={field}><span>{field[0].toUpperCase() + field.slice(1)}</span><input className="form-input" value={facilityForm[field]} onChange={(event) => setFacilityForm({ ...facilityForm, [field]: event.target.value })} maxLength={300} /></label>)}</div><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create facility'}</button></form>}
    {loading ? <p className="state-message">Loading facilities…</p> : facilities.length ? <div className="facility-page__list">{facilities.map((facility) => <article className="patient-dashboard__panel facility-card" key={facility.id}><header className="patient-dashboard__panel-heading"><div><span className={`facility-card__state ${facility.isActive ? 'facility-card__state--active' : ''}`}>{facility.isActive ? 'Active' : 'Inactive'}</span><h3>{facility.name}</h3><p>{[facility.address, facility.city, facility.state, facility.country].filter(Boolean).join(', ') || 'No address recorded'}</p></div><span className="facility-card__counts">{facility.rooms.length} rooms · {facility.rooms.reduce((total, room) => total + room.beds.length, 0)} beds</span></header>
      {canManage && <form className="facility-card__add-room" onSubmit={(event) => void createRoom(event, facility.id)}><label className="form-field"><span>New room name</span><input className="form-input" value={roomNames[facility.id] ?? ''} onChange={(event) => setRoomNames({ ...roomNames, [facility.id]: event.target.value })} maxLength={150} /></label><button className="secondary-button" type="submit" disabled={saving || !roomNames[facility.id]?.trim()}>Add room</button></form>}
      {facility.rooms.length ? <div className="facility-card__rooms">{facility.rooms.map((room) => <section className="facility-room" key={room.id}><div className="facility-room__header"><div><h4>{room.name}</h4>{room.description && <p>{room.description}</p>}</div><span>{room.isActive ? 'Active' : 'Inactive'}</span></div>{room.beds.length ? <ul className="facility-room__beds">{room.beds.map((bed) => <li key={bed.id}><div><strong>{bed.label}</strong>{bed.notes && <span>{bed.notes}</span>}</div><label className="form-field"><span className="sr-only">{bed.label} status</span><select className="form-input" value={bed.status} disabled={saving || (!canManage && !['nurse', 'staff'].includes(role ?? ''))} onChange={(event) => void action(() => careOperationsApi.updateBedStatus(facility.id, room.id, bed.id, Number(event.target.value)), `${bed.label} status updated.`)}>{Object.entries(bedStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></li>)}</ul> : <p className="patient-dashboard__empty">No beds configured for this room.</p>}{canManage && <form className="facility-room__add-bed" onSubmit={(event) => void createBed(event, facility.id, room.id)}><label className="form-field"><span>New bed label</span><input className="form-input" value={bedLabels[room.id] ?? ''} onChange={(event) => setBedLabels({ ...bedLabels, [room.id]: event.target.value })} maxLength={100} /></label><button type="submit" className="secondary-button" disabled={saving || !bedLabels[room.id]?.trim()}>Add bed</button></form>}</section>)}</div> : <p className="patient-dashboard__empty">No rooms have been added yet.</p>}
    </article>)}</div> : <section className="patient-dashboard__panel"><p className="patient-dashboard__empty">No facilities have been configured.</p></section>}
  </section>
}
