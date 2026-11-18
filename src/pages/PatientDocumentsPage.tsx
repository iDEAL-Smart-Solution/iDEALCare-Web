import { useEffect, useState } from 'react'
import { patientApi } from '../api/patientApi'
import PatientMedicalDocumentsPanel from '../components/PatientMedicalDocumentsPanel'

export default function PatientDocumentsPage() {
  const [patientId, setPatientId] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { patientApi.getMe().then((patient) => setPatientId(patient.id)).catch(() => setError('Your patient profile could not be loaded.')) }, [])
  return <section className="patient-documents-page"><header className="patients-page__header"><div><p className="eyebrow">Patient file</p><h2>Medical documents</h2><p className="muted">Keep reports, test results, prescriptions, and referrals available to your care team.</p></div></header>{error && <div className="notice notice--error" role="alert">{error}</div>}{patientId && <PatientMedicalDocumentsPanel patientId={patientId} canUpload canDelete />}</section>
}
