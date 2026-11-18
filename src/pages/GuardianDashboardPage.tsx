import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { patientApi } from '../api/patientApi'
import type { PatientAppointmentDto, PatientCareRecordDto, PatientDto, RegistrationInvoiceDto, MedicalItemDto } from '../types/patient'
import type { GuardianMedicalDocumentDto, GuardianMedicalInformationDto, GuardianPatientDto } from '../types/guardian'
import { guardianPermissions } from '../types/guardian'
import GuardianMessagesPanel from '../components/GuardianMessagesPanel'

type Overview = {
  patient: PatientDto | null
  invoices: RegistrationInvoiceDto[]
  items: MedicalItemDto[]
  appointments: PatientAppointmentDto[]
  records: PatientCareRecordDto[]
  medical: GuardianMedicalInformationDto | null
  documents: GuardianMedicalDocumentDto[]
  failures: string[]
}
const emptyOverview: Overview = { patient: null, invoices: [], items: [], appointments: [], records: [], medical: null, documents: [], failures: [] }
const permissionLabel = (mask: number) => guardianPermissions.filter(({ bit }) => (mask & bit) !== 0).map(({ label }) => label)

export default function GuardianDashboardPage() {
  const [patients, setPatients] = useState<GuardianPatientDto[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [overview, setOverview] = useState<Overview>(emptyOverview)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const selected = patients.find((patient) => patient.patientId === selectedId) ?? null

  async function loadPatients(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      const result = await patientApi.listMyGuardianPatients()
      setPatients(result)
      setSelectedId((current) => result.some((patient) => patient.patientId === current) ? current : result[0]?.patientId ?? '')
    } catch (requestError) {
      setError(axios.isAxiosError(requestError) && requestError.response?.status === 403
        ? 'You do not have permission to view linked patients.'
        : 'We could not load your linked patients. Please refresh the page.')
    } finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { void loadPatients() }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const reference = params.get('reference') || params.get('trxref')
    if (!reference) return
    patientApi.verifyPayment(reference)
      .then((result) => setNotice(result.status === 2 ? 'Payment confirmed successfully.' : result.status === 1 ? 'Payment is processing. Refresh in a moment.' : 'Payment was not completed.'))
      .catch(() => setNotice('We could not verify this payment. Please refresh the dashboard.'))
      .finally(() => { navigate('/app/guardian/dashboard', { replace: true }); setRefreshKey((value) => value + 1) })
  }, [location.search, navigate])

  useEffect(() => {
    let active = true
    async function loadOverview() {
      setOverview(emptyOverview)
      if (!selected || !selected.isActive || !selected.consentGranted) { setOverview(emptyOverview); return }
      const mask = selected.permissions
      const jobs: Promise<unknown>[] = []
      const keys: string[] = []
      const add = (key: string, job: Promise<unknown>) => { keys.push(key); jobs.push(job) }
      if (mask & 1) add('patient', patientApi.get(selected.patientId))
      if (mask & 2) add('medical', patientApi.getMedicalInformation(selected.patientId))
      if (mask & 4) add('documents', patientApi.getMedicalDocuments(selected.patientId))
      if (mask & 8) add('invoices', patientApi.getInvoices(selected.patientId))
      if (mask & 8) add('items', patientApi.getMedicalItems(selected.patientId))
      if (mask & 32) add('appointments', patientApi.getAppointments(selected.patientId))
      if (mask & 64) add('records', patientApi.getCareRecords(selected.patientId))
      const settled = await Promise.allSettled(jobs)
      if (!active) return
      const next = { ...emptyOverview }
      settled.forEach((result, index) => {
        if (result.status === 'rejected') { next.failures.push(keys[index]); return }
        const value = result.value
        if (keys[index] === 'patient') next.patient = value as PatientDto
        if (keys[index] === 'medical') next.medical = value as GuardianMedicalInformationDto
        if (keys[index] === 'documents') next.documents = value as GuardianMedicalDocumentDto[]
        if (keys[index] === 'invoices') next.invoices = value as RegistrationInvoiceDto[]
        if (keys[index] === 'items') next.items = value as MedicalItemDto[]
        if (keys[index] === 'appointments') next.appointments = value as PatientAppointmentDto[]
        if (keys[index] === 'records') next.records = value as PatientCareRecordDto[]
      })
      setOverview(next)
    }
    void loadOverview()
    return () => { active = false }
  }, [selected?.patientId, selected?.permissions, selected?.consentGranted, selected?.isActive, refreshKey])

  const upcoming = useMemo(() => overview.appointments
    .filter((item) => new Date(item.scheduledAt) >= new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()), [overview.appointments])
  const unpaidInvoices = overview.invoices.filter((item) => item.outstandingAmount > 0)
  const unpaidItems = overview.items.filter((item) => item.status === 1)
  const granted = selected ? permissionLabel(selected.permissions) : []

  async function payInvoice(invoiceId: string, amount: number) {
    if (!selected || !(selected.permissions & 16)) return
    setPayingId(invoiceId); setNotice(null)
    try {
      const response = await patientApi.payInvoice(selected.patientId, invoiceId, amount, `${window.location.origin}/app/guardian/dashboard`)
      if (response.authorizationUrl) window.location.href = response.authorizationUrl
      else setNotice('Payment was initiated successfully.')
    } catch (requestError) {
      setNotice(axios.isAxiosError(requestError) ? (requestError.response?.data as { message?: string } | undefined)?.message ?? 'Payment could not be started.' : 'Payment could not be started.')
    } finally { setPayingId(null) }
  }

  async function payMedicalItem(itemId: string, amount: number) {
    if (!selected || !(selected.permissions & 16)) return
    setPayingId(itemId); setNotice(null)
    try {
      const response = await patientApi.payMedicalItem(selected.patientId, itemId, amount, `${window.location.origin}/app/guardian/dashboard`)
      if (response.authorizationUrl) window.location.href = response.authorizationUrl
      else setNotice('Payment was initiated successfully.')
    } catch (requestError) {
      setNotice(axios.isAxiosError(requestError) ? (requestError.response?.data as { message?: string } | undefined)?.message ?? 'Payment could not be started.' : 'Payment could not be started.')
    } finally { setPayingId(null) }
  }

  if (loading) return <div className="guardian-portal"><p className="state-message">Loading your guardian dashboard…</p></div>
  return <div className="guardian-portal">
    <header className="patient-portal__header"><div><span className="eyebrow">Guardian dashboard</span><h2>Welcome to your care dashboard</h2><p className="muted">See updates for the patients who have authorized your access.</p></div><button className="secondary-button" type="button" onClick={() => void loadPatients(true)} disabled={refreshing}>{refreshing ? 'Refreshing…' : '↻ Refresh'}</button></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {notice && <div className="notice notice--info" role="status">{notice}</div>}
    {patients.length === 0 && !error && <section className="patient-dashboard__panel"><h3>No patient links yet</h3><p className="patient-dashboard__empty">Once a provider links you to a patient, the patient can approve the information you may access. Your linked patients will appear here.</p></section>}
    {patients.length > 0 && <>
      <label className="guardian-portal__selector"><span>Patient</span><select className="form-input" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{patients.map((patient) => <option key={patient.patientId} value={patient.patientId}>{patient.firstName} {patient.lastName} · {patient.relationship}</option>)}</select></label>
      {selected && (!selected.isActive || !selected.consentGranted) && <section className="patient-dashboard__welcome guardian-portal__pending"><div className="patient-dashboard__check" aria-hidden="true">…</div><div><span className="patient-dashboard__eyebrow">Access approval</span><h3>Waiting for patient approval</h3><p>Your account is linked. Patient information will appear here after the patient approves your access.</p></div><span className="patient-dashboard__active">Pending</span></section>}
      {selected?.isActive && selected.consentGranted && <>
        <section className="patient-dashboard__welcome"><div className="patient-dashboard__check" aria-hidden="true">✓</div><div><span className="patient-dashboard__eyebrow">Authorized patient</span><h3>{overview.patient ? `${overview.patient.firstName} ${overview.patient.lastName}` : `${selected.firstName} ${selected.lastName}`}</h3><p>{selected.relationship}{selected.isPrimary ? ' · Primary guardian' : ''}</p></div><span className="patient-dashboard__active">Access active</span></section>
        <section className="guardian-portal__permissions"><strong>Information you can access</strong><div>{granted.map((label) => <span className="guardian-portal__permission" key={label}>{label}</span>)}</div></section>
        {overview.failures.length > 0 && <div className="notice notice--info" role="status">Some authorized information could not be loaded. Refresh to try again.</div>}
        <div className="patient-dashboard__summary">
          {(selected.permissions & 8) !== 0 && <article className="patient-dashboard__card"><span className="patient-dashboard__card-label">Unpaid bills</span><strong>{unpaidInvoices.length + unpaidItems.length}</strong><span>Open bills and medical items</span></article>}
          {(selected.permissions & 32) !== 0 && <article className="patient-dashboard__card"><span className="patient-dashboard__card-label">Upcoming appointments</span><strong>{upcoming.length ? new Date(upcoming[0].scheduledAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'None'}</strong><span>{upcoming[0] ? new Date(upcoming[0].scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'No upcoming visits scheduled'}</span></article>}
          {(selected.permissions & 64) !== 0 && <article className="patient-dashboard__card"><span className="patient-dashboard__card-label">Care updates</span><strong>{overview.records.length}</strong><span>Updates shared by the care team</span></article>}
        </div>
        {(selected.permissions & 1) !== 0 && overview.patient && <section className="patient-dashboard__panel"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Profile</span><h3>Patient information</h3></div></div><p><strong>Age:</strong> {overview.patient.age ?? 'Not provided'}</p><p><strong>Date of birth:</strong> {overview.patient.dateOfBirth ? new Date(overview.patient.dateOfBirth).toLocaleDateString() : 'Not provided'}</p><p><strong>Care location:</strong> {overview.patient.careLocationType === 2 ? 'Home care' : 'Clinic or facility care'}</p></section>}
        {(selected.permissions & 2) !== 0 && <section className="patient-dashboard__panel"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Medical information</span><h3>Health summary</h3></div></div>{overview.medical ? <div className="guardian-portal__medical">{overview.medical.currentDiagnosis && <p><strong>Current diagnosis:</strong> {overview.medical.currentDiagnosis}</p>}{overview.medical.medicalHistory && <p><strong>Medical history:</strong> {overview.medical.medicalHistory}</p>}{overview.medical.chronicConditions && <p><strong>Chronic conditions:</strong> {overview.medical.chronicConditions}</p>}{overview.medical.allergies?.length > 0 && <p><strong>Allergies:</strong> {overview.medical.allergies.map((item) => `${item.name}${item.reaction ? ` (${item.reaction})` : ''}`).join(', ')}</p>}{overview.medical.medications?.length > 0 && <p><strong>Medications:</strong> {overview.medical.medications.map((item) => `${item.name}${item.dosage ? `, ${item.dosage}` : ''}`).join('; ')}</p>}</div> : <p className="patient-dashboard__empty">No medical information is available.</p>}</section>}
        {(selected.permissions & 4) !== 0 && <section className="patient-dashboard__panel"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Documents</span><h3>Medical documents</h3></div></div>{overview.documents.length ? <ul className="guardian-portal__list">{overview.documents.map((doc) => <li key={doc.id}><div><strong>{doc.fileName}</strong><span>{doc.description || new Date(doc.createdAt).toLocaleDateString()}</span></div><a href={doc.fileUrl} target="_blank" rel="noreferrer">View document</a></li>)}</ul> : <p className="patient-dashboard__empty">No medical documents are available.</p>}</section>}
        {(selected.permissions & 8) !== 0 && <section className="patient-dashboard__panel"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Bills & payments</span><h3>Billing activity</h3></div></div>{unpaidInvoices.length + unpaidItems.length ? <ul className="guardian-portal__list">{unpaidInvoices.map((bill) => <li key={bill.id}><div><strong>{bill.notes || 'Patient invoice'}</strong><span>{bill.outstandingAmount.toLocaleString()} outstanding</span></div><span className="guardian-portal__billing-actions">Due {bill.paymentDeadline ? new Date(bill.paymentDeadline).toLocaleDateString() : '—'}{(selected.permissions & 16) !== 0 && <button className="primary-button" type="button" disabled={payingId === bill.id} onClick={() => void payInvoice(bill.id, bill.outstandingAmount)}>{payingId === bill.id ? 'Starting…' : 'Pay bill'}</button>}</span></li>)}{unpaidItems.map((item) => <li key={item.id}><div><strong>{item.name}</strong><span>{item.description || 'Medical item'}</span></div><span className="guardian-portal__billing-actions">{item.price.toLocaleString()}{(selected.permissions & 16) !== 0 && <button className="primary-button" type="button" disabled={payingId === item.id} onClick={() => void payMedicalItem(item.id, item.price)}>{payingId === item.id ? 'Starting…' : 'Pay item'}</button>}</span></li>)}</ul> : <p className="patient-dashboard__empty">No unpaid bills are available.</p>}</section>}
        {(selected.permissions & 32) !== 0 && <section className="patient-dashboard__panel"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Appointments</span><h3>Upcoming visits</h3></div></div>{upcoming.length ? <ul className="guardian-portal__list">{upcoming.slice(0, 5).map((item) => <li key={item.id}><div><strong>{new Date(item.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</strong><span>{item.location || 'Location to be confirmed'}</span></div><span>{new Date(item.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span></li>)}</ul> : <p className="patient-dashboard__empty">No upcoming appointments are scheduled.</p>}</section>}
        {(selected.permissions & 64) !== 0 && <section className="patient-dashboard__panel"><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Care activity</span><h3>Recent care updates</h3></div><Link to="/app/care-records">Open full care history →</Link></div>{overview.records.length ? <ul className="patient-dashboard__updates">{[...overview.records].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()).slice(0, 5).map((record) => <li key={record.id}><span className="patient-dashboard__update-mark">•</span><div><p>{record.content}</p><time>{new Date(record.recordedAt).toLocaleString()}</time></div></li>)}</ul> : <p className="patient-dashboard__empty">No care updates are available.</p>}</section>}
        {(selected.permissions & 128) !== 0 && <GuardianMessagesPanel patientId={selected.patientId} />}
        {(selected.permissions & 16) !== 0 && !(selected.permissions & 8) && <section className="patient-dashboard__panel"><div><span className="eyebrow">Payments</span><h3>Payment access</h3></div><p className="patient-dashboard__empty">Payment permission is active. Bills need to be shared separately before you can view or pay them.</p></section>}
      </>}
    </>}
  </div>
}
