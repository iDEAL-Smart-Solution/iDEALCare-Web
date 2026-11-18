import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import { useAuthStore } from '../stores/authStore'
import type { PatientStatus, PatientSummaryDto } from '../types/patient'

type TeamRole = 'nurse' | 'staff'
const PAGE_SIZE = 20
const statusLabels: Record<PatientStatus, string> = {
  1: 'Pending review', 2: 'Awaiting information', 3: 'Awaiting admission',
  4: 'Awaiting payment', 5: 'Awaiting admission', 6: 'Active',
  7: 'Rejected', 8: 'Discharged', 9: 'Terminated',
}

export default function TeamDashboardPage({ role }: { role: TeamRole }) {
  const user = useAuthStore((state) => state.user)
  const tenant = useAuthStore((state) => state.tenant)
  const [patients, setPatients] = useState<PatientSummaryDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPatients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await patientApi.list(page, PAGE_SIZE)
      setPatients(result.items)
      setTotal(result.totalCount)
    } catch (requestError: unknown) {
      const message = axios.isAxiosError(requestError)
        ? (requestError.response?.data as { message?: string } | undefined)?.message
        : undefined
      setError(message ?? 'Could not load your assigned patients.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { void loadPatients() }, [loadPatients])

  const isNurse = role === 'nurse'
  return <section className="patients-page team-dashboard">
    <header className="patients-page__header">
      <div>
        <p className="eyebrow">{tenant?.tenantName?.trim() || 'iDEAL Care'} · {isNurse ? 'Nursing' : 'Care staff'}</p>
        <h1>{isNurse ? 'Nursing Dashboard' : 'Staff Dashboard'}</h1>
        <p className="muted">Welcome, {user?.firstName ?? 'team member'}. This is your assigned patient caseload.</p>
      </div>
      <button className="secondary-button" type="button" onClick={() => void loadPatients()} disabled={loading}>
        {loading ? 'Refreshing…' : 'Refresh patients'}
      </button>
    </header>

    <nav className="dashboard-quick-links" aria-label="Care team shortcuts">
      <Link to="/app/care-records">Assigned patient care records</Link><Link to="/app/schedule">Schedule</Link><Link to="/app/messages">Messages</Link><Link to="/app/home-care">Home-care operations</Link>
    </nav>

    {error && <div className="notice notice--error" role="alert">{error}</div>}
    <section className="dashboard-card" aria-label="Assigned patients">
      <div className="dashboard-card__header">
        <h2 className="dashboard-card__heading">My assigned patients</h2>
        <span className="status-pill">{loading ? 'Loading…' : total}</span>
      </div>
      <p className="muted">Only patients assigned to you with an active admission appear here. Select a name to open their profile and care record.</p>
      {loading ? <p className="state-message">Loading your patients…</p> : patients.length === 0 ? (
        <p className="state-message">No admitted patients are assigned to you yet. Contact your clinic administrator if you expect to see a patient here.</p>
      ) : <div className="patient-table-wrap"><table className="patient-table">
        <caption className="sr-only">Your assigned patients</caption>
        <thead><tr><th>Patient</th><th>Age</th><th>Status</th><th>Contact</th><th>Profile</th></tr></thead>
        <tbody>{patients.map((patient) => <tr key={patient.id}>
          <td><Link to={`/app/patients/${patient.id}`}>{patient.fullName}</Link></td>
          <td>{patient.age}</td>
          <td><span className="status-pill">{statusLabels[patient.status]}</span></td>
          <td>{patient.phoneNumber ?? patient.email ?? 'Not provided'}</td>
          <td><Link to={`/app/patients/${patient.id}`}>Open profile</Link></td>
        </tr>)}</tbody>
      </table></div>}
      {!loading && total > PAGE_SIZE && <div className="pagination">
        <span>{total} assigned patients</span>
        <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
        <span>Page {page}</span>
        <button type="button" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((current) => current + 1)}>Next</button>
      </div>}
    </section>
  </section>
}
