import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import type { PatientSummaryDto } from '../types/patient'

export default function AssessmentQueuePage() {
  const [patients, setPatients] = useState<PatientSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true); setError(null)
    try { setPatients(await patientApi.listAwaitingAdmission()) }
    catch (err: unknown) {
      const message = axios.isAxiosError(err) ? (err.response?.data as { message?: string })?.message : undefined
      setError(message ?? 'Could not load patients awaiting admission.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  return <section className="patients-page">
    <header className="patients-page__header"><div><p className="eyebrow">Registration workflow</p><h2>Admission queue</h2><p className="muted">Approved patients with any required registration fee paid are listed here. Admit them independently of the medical assessment.</p></div><button className="secondary-button" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh queue'}</button></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {loading ? <p className="state-message">Loading admission queue…</p> : patients.length === 0 ? <div className="empty-reviews-card"><h3>No accepted patients awaiting admission</h3><p className="muted">Patients appear here after registration approval and any required fee payment.</p></div> : <div className="review-grid">{patients.map((patient) => <article key={patient.id} className="review-card"><div className="review-card__header"><div><h3 className="review-card__name">{patient.fullName}</h3><span className="review-card__dob">Age {patient.age}{patient.dateOfBirth ? ` · ${patient.dateOfBirth}` : ''}</span></div><span className="status-badge status-badge--pending">Awaiting admission</span></div><div className="review-card__details"><div className="detail-item"><span className="detail-label">Contact</span><span className="detail-value">{patient.email ?? patient.phoneNumber ?? 'Not provided'}</span></div><div className="detail-item"><span className="detail-label">Registered</span><span className="detail-value">{new Date(patient.createdAt).toLocaleDateString()}</span></div></div><div className="review-card__actions"><Link className="primary-button" to={`/app/patients/${patient.id}`}>Open patient · admit</Link><Link className="secondary-button" to={`/app/patients/${patient.id}/assessment`}>Record onsite medical assessment</Link></div></article>)}</div>}
  </section>
}
