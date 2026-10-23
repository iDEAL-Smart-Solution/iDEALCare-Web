import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import apiClient from '../lib/apiClient'
import { patientApi } from '../api/patientApi'

export default function PatientInformationPage() {
  const navigate = useNavigate()
  const [medicalHistory, setMedicalHistory] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [conditions, setConditions] = useState('')
  const [medications, setMedications] = useState('')
  const [allergies, setAllergies] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null)
    try {
      const patient = await patientApi.getMe()
      await apiClient.put(`/api/medical/patients/${patient.id}/information`, {
        medicalHistory: medicalHistory.trim() || undefined,
        currentSymptoms: symptoms.trim() || undefined,
        chronicConditions: conditions.trim() || undefined,
        otherRelevantInformation: [medications.trim() ? `Current medications: ${medications.trim()}` : '', allergies.trim() ? `Allergies: ${allergies.trim()}` : ''].filter(Boolean).join('\n') || undefined,
      })
      if (file) {
        const form = new FormData()
        form.append('file', file)
        form.append('description', 'Patient-provided supporting document')
        await apiClient.post(`/api/medical/patients/${patient.id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      await patientApi.resubmitRegistration()
      navigate('/app/registration-fee', { replace: true })
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data as { message?: string })?.message ?? 'Could not submit your information.' : 'Could not submit your information.')
    } finally { setBusy(false) }
  }

  return <section className="patients-page">
    <header className="patients-page__header"><div><p className="eyebrow">Patient onboarding</p><h2>Provide requested information</h2><p className="muted">Add the clinical details requested by your care team. The request is visible on your onboarding status page.</p></div></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    <form className="patient-editor" onSubmit={submit}>
      <fieldset className="register-fieldset"><legend className="register-legend">Medical information</legend>
        <label className="form-field">Medical history<textarea className="form-input form-textarea" rows={3} value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} /></label>
        <label className="form-field">Current symptoms<textarea className="form-input form-textarea" rows={3} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} /></label>
        <label className="form-field">Chronic conditions<textarea className="form-input form-textarea" rows={2} value={conditions} onChange={(e) => setConditions(e.target.value)} /></label>
        <label className="form-field">Current medications<textarea className="form-input form-textarea" rows={2} value={medications} onChange={(e) => setMedications(e.target.value)} /></label>
        <label className="form-field">Known allergies<textarea className="form-input form-textarea" rows={2} value={allergies} onChange={(e) => setAllergies(e.target.value)} /></label>
        <label className="form-field">Supporting medical document<input className="form-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
      </fieldset>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => navigate('/app/registration-fee')}>Cancel</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Submitting information…' : 'Submit information for review'}</button></div>
    </form>
  </section>
}
