import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { patientApi } from '../api/patientApi'
import type { PatientAppointmentDto, PatientCareRecordDto, PatientDto, RegistrationInvoiceDto, MedicalItemDto } from '../types/patient'
import RegistrationFeePage from './RegistrationFeePage'

const money = (amount: number) => `₦${amount.toLocaleString()}`

export default function PatientDashboardPage() {
  const [patient, setPatient] = useState<PatientDto | null>(null)
  const [invoices, setInvoices] = useState<RegistrationInvoiceDto[]>([])
  const [medicalItems, setMedicalItems] = useState<MedicalItemDto[]>([])
  const [appointments, setAppointments] = useState<PatientAppointmentDto[]>([])
  const [records, setRecords] = useState<PatientCareRecordDto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      const me = await patientApi.getMe()
      setPatient(me)
      if (me.status !== 6) return
      const [bills, items, visits, care] = await Promise.allSettled([
        patientApi.getInvoices(me.id),
        patientApi.getMedicalItems(me.id),
        patientApi.getAppointments(me.id),
        patientApi.getCareRecords(me.id),
      ])
      setInvoices(bills.status === 'fulfilled' ? bills.value : [])
      setMedicalItems(items.status === 'fulfilled' ? items.value : [])
      setAppointments(visits.status === 'fulfilled' ? visits.value : [])
      setRecords(care.status === 'fulfilled' ? care.value : [])
      if ([bills, items, visits, care].every((result) => result.status === 'rejected')) {
        setError('Some care and billing information could not be loaded. Try refreshing.')
      }
    } catch {
      setError('We could not load your patient information. Please refresh the page.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [])

  if (loading && !patient) return <div className="patient-portal"><p className="state-message">Loading your patient dashboard…</p></div>
  if (!patient) return <div className="patient-portal"><div className="notice notice--error" role="alert">{error ?? 'No patient record is linked to your account.'}</div></div>
  if (patient.status !== 6) return <RegistrationFeePage />

  const outstandingInvoices = invoices.filter((invoice) => invoice.status !== 3 && invoice.status !== 5 && invoice.outstandingAmount > 0)
  const outstandingMedical = medicalItems.filter((item) => item.status === 1)
  const balance = outstandingInvoices.reduce((sum, invoice) => sum + invoice.outstandingAmount, 0)
    + outstandingMedical.reduce((sum, item) => sum + item.price, 0)
  const nextAppointment = appointments
    .filter((appointment) => appointment.scheduledAt && new Date(appointment.scheduledAt) >= new Date() && [1, 2, 5].includes(appointment.status))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]
  const recentRecords = [...records].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()).slice(0, 3)
  const recordType: Record<number, string> = { 1: 'Care note', 2: 'Observation', 3: 'Medication', 4: 'Vital signs', 5: 'Input / output', 6: 'Visit', 7: 'Nursing activity', 8: 'Condition update', 9: 'Care update' }

  return (
    <div className="patient-portal">
      <header className="patient-portal__header">
        <div>
          <span className="eyebrow">Patient dashboard</span>
          <h2>Welcome, {patient.firstName}</h2>
          <p className="muted">Your care information, appointments, and billing at a glance.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void load(true)} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </header>

      {error && <div className="notice notice--info" role="status">{error}</div>}

      <section className="patient-dashboard__welcome" aria-label="Admission status">
        <div className="patient-dashboard__check" aria-hidden="true">✓</div>
        <div>
          <span className="patient-dashboard__eyebrow">Admission status</span>
          <h3>You are admitted to care</h3>
          <p>Your care is active. Your care team will contact you about visits and any next steps.</p>
        </div>
        <span className="patient-dashboard__active">Active</span>
      </section>

      <section className="patient-dashboard__summary" aria-label="Patient summary">
        <article className="patient-dashboard__card">
          <span className="patient-dashboard__card-label">Outstanding balance</span>
          <strong>{money(balance)}</strong>
          <Link to="/app/bills">View bills and payments →</Link>
        </article>
        <article className="patient-dashboard__card">
          <span className="patient-dashboard__card-label">Upcoming appointment</span>
          {nextAppointment ? <>
            <strong>{new Date(nextAppointment.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
            <span>{new Date(nextAppointment.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}{nextAppointment.location ? ` · ${nextAppointment.location}` : ''}</span>
          </> : <><strong>None scheduled</strong><span>Your care team will let you know when a visit is arranged.</span></>}
        </article>
        <article className="patient-dashboard__card">
          <span className="patient-dashboard__card-label">Patient details</span>
          <strong>{patient.careLocationType === 2 ? 'Home care' : 'Clinic / facility care'}</strong>
          <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
        </article>
      </section>

      <section className="patient-dashboard__panel">
        <div className="patient-dashboard__panel-heading">
          <div><span className="eyebrow">Care activity</span><h3>Recent care updates</h3></div>
        </div>
        {recentRecords.length ? <ul className="patient-dashboard__updates">
          {recentRecords.map((record) => <li key={record.id}>
            <span className="patient-dashboard__update-mark" aria-hidden="true">•</span>
            <div><strong>{recordType[record.recordType] ?? 'Care update'}</strong><p>{record.content}</p><time>{new Date(record.recordedAt).toLocaleString()}</time></div>
          </li>)}
        </ul> : <p className="patient-dashboard__empty">There are no care updates to show yet.</p>}
      </section>

      <section className="patient-dashboard__panel patient-dashboard__panel--bills">
        <div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Billing</span><h3>Your bills</h3></div><Link to="/app/bills">View all bills →</Link></div>
        <div className="patient-dashboard__bill-summary">
          <span>{outstandingInvoices.length + outstandingMedical.length} unpaid item{outstandingInvoices.length + outstandingMedical.length === 1 ? '' : 's'}</span>
          <strong>{money(balance)} outstanding</strong>
        </div>
        {outstandingInvoices.length + outstandingMedical.length === 0 && <p className="patient-dashboard__empty">You have no outstanding bills.</p>}
      </section>
    </div>
  )
}
