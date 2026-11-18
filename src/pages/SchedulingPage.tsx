import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import { schedulingApi, appointmentStatuses, appointmentTypes, type AppointmentDto, type AppointmentStatus, type AppointmentType, type AvailabilitySlotDto } from '../api/schedulingApi'
import { staffApi, type TenantStaffDto } from '../api/staffApi'
import { useAuthStore } from '../stores/authStore'
import type { PatientDto, PatientSummaryDto } from '../types/patient'
import type { GuardianPatientDto } from '../types/guardian'

type PatientOption = Pick<PatientSummaryDto, 'id' | 'fullName'>
const localDateTime = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
const errorMessage = (error: unknown) => axios.isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message ?? 'The scheduling request failed.' : 'The scheduling request failed.'

export default function SchedulingPage() {
  const role = useAuthStore((state) => state.tenant?.tenant_role?.toLowerCase() ?? '')
  const staff = ['owner', 'admin', 'nurse', 'staff'].includes(role)
  const tenantAdmin = role === 'owner' || role === 'admin'
  const canManage = staff
  const canBook = role === 'patient' || role === 'guardian'
  const [appointments, setAppointments] = useState<AppointmentDto[]>([])
  const [slots, setSlots] = useState<AvailabilitySlotDto[]>([])
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [staffList, setStaffList] = useState<TenantStaffDto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [showSlotForm, setShowSlotForm] = useState(false)
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(5)
  const [scheduledAt, setScheduledAt] = useState(localDateTime(new Date(Date.now() + 86_400_000)))
  const [duration, setDuration] = useState('60')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [assigningAppointmentId, setAssigningAppointmentId] = useState<string | null>(null)
  const [slotStart, setSlotStart] = useState(localDateTime(new Date(Date.now() + 86_400_000)))
  const [slotEnd, setSlotEnd] = useState(localDateTime(new Date(Date.now() + 86_400_000 + 3_600_000)))

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      let patientOptions: PatientOption[] = []
      if (role === 'patient') {
        const patient: PatientDto = await patientApi.getMe()
        patientOptions = [{ id: patient.id, fullName: `${patient.firstName} ${patient.lastName}` }]
      } else if (role === 'guardian') {
        const links: GuardianPatientDto[] = await patientApi.listMyGuardianPatients()
        patientOptions = links.filter((item) => item.isActive && item.consentGranted && (item.permissions & 32) !== 0).map((item) => ({ id: item.patientId, fullName: `${item.firstName} ${item.lastName}` }))
      } else {
        const first = await patientApi.list(1, 100)
        const pages = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.totalCount / 100) - 1) }, (_, index) => patientApi.list(index + 2, 100)))
        patientOptions = [first, ...pages].flatMap((page) => page.items.map(({ id, fullName }) => ({ id, fullName })))
      }
      setPatients(patientOptions)
      const patientId = patientOptions.some((item) => item.id === selectedPatient) ? selectedPatient : patientOptions[0]?.id ?? ''
      setSelectedPatient(patientId)
      let nextAppointments: AppointmentDto[] = []
      if (tenantAdmin) nextAppointments = await schedulingApi.listAppointments()
      else if (patientId && (role === 'patient' || role === 'guardian')) nextAppointments = await schedulingApi.patientAppointments(patientId)
      else if (patientId && staff) {
        const all = await Promise.all(patientOptions.map((patient) => schedulingApi.patientAppointments(patient.id).catch(() => [])))
        nextAppointments = all.flat()
      }
      setAppointments(nextAppointments.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()))
      if (canManage) {
        const [nextSlots, nextStaff] = await Promise.all([
          schedulingApi.allSlots(),
          tenantAdmin ? staffApi.list().catch(() => []) : Promise.resolve([] as TenantStaffDto[]),
        ])
        setSlots(nextSlots); setStaffList(nextStaff.filter((person) => person.isActive))
      } else {
        setSlots(await schedulingApi.availableSlots())
      }
    } catch (loadError) { setError(errorMessage(loadError)) }
    finally { setLoading(false) }
  }, [role, selectedPatient, tenantAdmin, staff, canManage])

  useEffect(() => { void load() }, [load])

  async function createAppointment(event: FormEvent) {
    event.preventDefault()
    if (!selectedPatient) return
    setSaving(true); setError(''); setNotice('')
    try {
      await schedulingApi.createAppointment({ patientId: selectedPatient, appointmentType, scheduledAt: new Date(scheduledAt).toISOString(), durationMinutes: Number(duration) || undefined, location: location.trim() || undefined, notes: notes.trim() || undefined })
      setNotice('Appointment scheduled and notifications sent.'); setShowAppointmentForm(false); setNotes(''); await load()
    } catch (saveError) { setError(errorMessage(saveError)) }
    finally { setSaving(false) }
  }

  async function createSlot(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      await schedulingApi.createSlot({ startAt: new Date(slotStart).toISOString(), endAt: new Date(slotEnd).toISOString() })
      setNotice('Availability added.'); setShowSlotForm(false); await load()
    } catch (saveError) { setError(errorMessage(saveError)) }
    finally { setSaving(false) }
  }

  async function book(slotId: string) {
    if (!selectedPatient) return
    setSaving(true); setError(''); setNotice('')
    try {
      await schedulingApi.bookSlot({ slotId, patientId: selectedPatient, appointmentType, location: location.trim() || undefined, notes: notes.trim() || undefined })
      setNotice('Appointment booked.'); await load()
    } catch (saveError) { setError(errorMessage(saveError)) }
    finally { setSaving(false) }
  }

  async function cancel(item: AppointmentDto) {
    const reason = window.prompt('Reason for cancellation (optional):')
    if (reason === null) return
    setSaving(true); setError(''); setNotice('')
    try { await schedulingApi.cancel(item.id, reason.trim() || undefined); setNotice('Appointment cancelled.'); await load() }
    catch (saveError) { setError(errorMessage(saveError)) }
    finally { setSaving(false) }
  }

  async function updateStatus(item: AppointmentDto, status: AppointmentStatus) {
    setSaving(true); setError(''); setNotice('')
    try { await schedulingApi.updateStatus(item.id, status); setNotice('Appointment status updated.'); await load() }
    catch (saveError) { setError(errorMessage(saveError)) }
    finally { setSaving(false) }
  }

  async function assignNurse(item: AppointmentDto, nurseUserId: string) {
    if (!nurseUserId) return
    setAssigningAppointmentId(item.id); setError(''); setNotice('')
    try { await schedulingApi.assignNurse(item.id, nurseUserId); setNotice('Nurse assigned.'); await load() }
    catch (saveError) { setError(errorMessage(saveError)) }
    finally { setAssigningAppointmentId(null) }
  }

  const upcoming = useMemo(() => appointments.filter((item) => new Date(item.scheduledAt) >= new Date() && item.status !== 4 && item.status !== 3), [appointments])
  const past = useMemo(() => appointments.filter((item) => !upcoming.includes(item)), [appointments, upcoming])
  const patientName = (id: string) => patients.find((item) => item.id === id)?.fullName ?? 'Patient'

  if (loading) return <p className="state-message">Loading appointments…</p>
  return <section className="scheduling-page">
    <header className="patients-page__header"><div><p className="eyebrow">Care coordination</p><h2>{canManage ? 'Appointments & availability' : 'Appointments'}</h2><p className="muted">{canManage ? 'Schedule visits, manage appointment status, and publish bookable times.' : 'Review upcoming visits or book an open appointment time.'}</p></div><div className="modal-actions">{tenantAdmin && <button type="button" className="secondary-button" onClick={() => setShowSlotForm((value) => !value)}>Add availability</button>}{canManage && <button type="button" className="primary-button" onClick={() => setShowAppointmentForm((value) => !value)}>Schedule appointment</button>}</div></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}{notice && <div className="notice notice--info" role="status">{notice}</div>}
    {patients.length > 1 && <label className="form-field scheduling-page__patient"><span>Patient</span><select className="form-input" value={selectedPatient} onChange={(event) => setSelectedPatient(event.target.value)}>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select></label>}
    {showAppointmentForm && <form className="patient-dashboard__panel scheduling-page__form" onSubmit={(event) => void createAppointment(event)}><div className="patient-dashboard__panel-heading"><h3>Schedule a visit</h3><button className="secondary-button" type="button" onClick={() => setShowAppointmentForm(false)}>Close</button></div><div className="scheduling-page__fields">{tenantAdmin && <label className="form-field"><span>Patient</span><select className="form-input" value={selectedPatient} onChange={(event) => setSelectedPatient(event.target.value)} required><option value="">Select a patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select></label>}<label className="form-field"><span>Appointment type</span><select className="form-input" value={appointmentType} onChange={(event) => setAppointmentType(Number(event.target.value) as AppointmentType)}>{appointmentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label className="form-field"><span>Date and time</span><input className="form-input" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required /></label><label className="form-field"><span>Duration in minutes</span><input className="form-input" type="number" min="1" max="1440" value={duration} onChange={(event) => setDuration(event.target.value)} /></label><label className="form-field"><span>Location</span><input className="form-input" value={location} onChange={(event) => setLocation(event.target.value)} maxLength={300} /></label><label className="form-field scheduling-page__wide"><span>Notes</span><textarea className="form-input form-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} /></label></div><p className="muted">The appointment will be created without a nurse. Assign a nurse from the schedule after saving.</p><button className="primary-button" type="submit" disabled={saving || !selectedPatient}>{saving ? 'Saving…' : 'Confirm appointment'}</button></form>}
    {showSlotForm && <form className="patient-dashboard__panel scheduling-page__form" onSubmit={(event) => void createSlot(event)}><div className="patient-dashboard__panel-heading"><h3>Publish clinic availability</h3><button className="secondary-button" type="button" onClick={() => setShowSlotForm(false)}>Close</button></div><p className="muted">These times are open to any patient and are not tied to a particular nurse.</p><div className="scheduling-page__fields"><label className="form-field"><span>Starts</span><input className="form-input" type="datetime-local" value={slotStart} onChange={(event) => setSlotStart(event.target.value)} required /></label><label className="form-field"><span>Ends</span><input className="form-input" type="datetime-local" value={slotEnd} onChange={(event) => setSlotEnd(event.target.value)} required /></label></div><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add clinic time'}</button></form>}
    {canBook && <section className="patient-dashboard__panel scheduling-page__booking"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Book an available time</span><h3>Open clinic times</h3></div><select aria-label="Appointment type" className="form-input" value={appointmentType} onChange={(event) => setAppointmentType(Number(event.target.value) as AppointmentType)}>{appointmentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div><label className="form-field scheduling-page__location"><span>Preferred location (optional)</span><input className="form-input" value={location} onChange={(event) => setLocation(event.target.value)} /></label>{slots.length ? <ul className="guardian-portal__list">{slots.map((slot) => <li key={slot.id}><div><strong>{new Date(slot.startAt).toLocaleString()}</strong><span>{Math.round((new Date(slot.endAt).getTime() - new Date(slot.startAt).getTime()) / 60000)} minute clinic appointment</span></div><button type="button" className="primary-button" disabled={saving || !selectedPatient} onClick={() => void book(slot.id)}>Book time</button></li>)}</ul> : <p className="patient-dashboard__empty">There are no available clinic times right now. Please check again later.</p>}</section>}
    <section className="patient-dashboard__panel"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Schedule</span><h3>Upcoming appointments <span className="scheduling-page__count">{upcoming.length}</span></h3></div><button type="button" className="secondary-button" onClick={() => void load()}>Refresh</button></div>{upcoming.length ? <ul className="guardian-portal__list">{upcoming.map((item) => <li key={item.id}><div className="scheduling-page__appointment"><strong>{appointmentTypes[item.appointmentType - 1]?.label ?? 'Appointment'} · {new Date(item.scheduledAt).toLocaleString()}</strong><span>{patientName(item.patientId)}{item.assignedStaffUserName ? ` · ${item.assignedStaffUserName}` : ''}{item.location ? ` · ${item.location}` : ''}</span>{item.notes && <span>{item.notes}</span>}</div><div className="scheduling-page__actions"><span className={`scheduling-page__status scheduling-page__status--${item.status}`}>{appointmentStatuses[item.status]}</span>{tenantAdmin && item.status !== 4 && item.status !== 3 && <select className="form-input" aria-label={`Assign nurse for appointment with ${patientName(item.patientId)}`} value={item.assignedStaffUserId ?? ''} disabled={assigningAppointmentId === item.id} onChange={(event) => void assignNurse(item, event.target.value)}><option value="" disabled>Select nurse</option>{staffList.filter((member) => member.role.toLowerCase() === 'nurse').map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}</select>}{item.status === 1 && <button type="button" className="secondary-button" disabled={saving} onClick={() => void cancel(item)}>Cancel</button>}{canManage && item.status !== 4 && item.status !== 3 && <select className="form-input" aria-label="Update appointment status" value={item.status} disabled={saving} onChange={(event) => void updateStatus(item, Number(event.target.value) as AppointmentStatus)}>{Object.entries(appointmentStatuses).filter(([value]) => Number(value) !== 4 && Number(value) !== 5).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>}</div></li>)}</ul> : <p className="patient-dashboard__empty">No upcoming appointments.</p>}</section>
    {canManage && <section className="patient-dashboard__panel"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Availability</span><h3>Published clinic times</h3></div></div>{slots.length ? <ul className="guardian-portal__list">{slots.map((slot) => <li key={slot.id}><div><strong>{new Date(slot.startAt).toLocaleString()} – {new Date(slot.endAt).toLocaleTimeString()}</strong><span>Clinic-wide availability</span></div><span className={`scheduling-page__status ${slot.isBooked ? 'scheduling-page__status--4' : 'scheduling-page__status--1'}`}>{slot.isBooked ? 'Booked' : 'Available'}</span></li>)}</ul> : <p className="patient-dashboard__empty">No clinic availability has been published.</p>}</section>}
    {past.length > 0 && <section className="patient-dashboard__panel"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">History</span><h3>Previous appointments</h3></div></div><ul className="guardian-portal__list">{past.map((item) => <li key={item.id}><div><strong>{appointmentTypes[item.appointmentType - 1]?.label ?? 'Appointment'} · {new Date(item.scheduledAt).toLocaleString()}</strong><span>{patientName(item.patientId)} · {appointmentStatuses[item.status]}</span>{item.cancellationReason && <span>{item.cancellationReason}</span>}</div></li>)}</ul></section>}
  </section>
}
