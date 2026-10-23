import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { assessmentApi, type AssessmentQuestion } from '../api/assessmentApi'
import { patientApi } from '../api/patientApi'
import type { PatientDto } from '../types/patient'

export default function PatientAssessmentPage() {
  const { patientId = '' } = useParams()
  const [patient, setPatient] = useState<PatientDto | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [condition, setCondition] = useState('')
  const [painScore, setPainScore] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [temperature, setTemperature] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [spo2, setSpo2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([patientApi.get(patientId), assessmentApi.questions()])
      .then(([record, items]) => { setPatient(record); setQuestions(items) })
      .catch((err: unknown) => setError(axios.isAxiosError(err) ? (err.response?.data as { message?: string })?.message ?? 'Could not load the assessment.' : 'Could not load the assessment.'))
  }, [patientId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError(null)
    try {
      await assessmentApi.createAssessment({
        patientId,
        notes: notes.trim() || undefined,
        responses: questions.filter((q) => answers[q.id]?.trim()).map((q) => ({ assessmentQuestionId: q.id, answer: answers[q.id].trim() })),
      })
      await assessmentApi.createPhysicalAssessment(patientId, {
        isComplete: true,
        generalPhysicalCondition: condition.trim() || undefined,
        painScore: painScore ? Number(painScore) : undefined,
        bloodPressure: bloodPressure.trim() || undefined,
        temperatureCelsius: temperature ? Number(temperature) : undefined,
        heartRateBpm: heartRate ? Number(heartRate) : undefined,
        oxygenSaturationPercent: spo2 ? Number(spo2) : undefined,
        additionalNotes: notes.trim() || undefined,
      })
      setSuccess(`Medical assessment saved for ${patient?.firstName ?? 'patient'}. Admission status was not changed.`)
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data as { message?: string })?.message ?? 'Could not save the assessment.' : 'Could not save the assessment.')
    } finally { setBusy(false) }
  }

  return <section className="patients-page">
    <header className="patients-page__header"><div><p className="eyebrow">Clinical care · onsite</p><h2>Medical assessment</h2><p className="muted">{patient ? `${patient.firstName} ${patient.lastName}` : 'Loading patient'} · Record medical findings when the patient is physically present. This does not control registration acceptance or admission.</p></div><Link className="secondary-button" to={`/app/patients/${patientId}`}>Back to patient</Link></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {success && <div className="notice notice--success" role="status">{success}</div>}
    <form className="patient-editor" onSubmit={submit}>
      <fieldset className="register-fieldset"><legend className="register-legend">Physical assessment</legend>
        <label className="form-field">General condition<input className="form-input" required value={condition} onChange={(e) => setCondition(e.target.value)} /></label>
        <div className="register-grid">
          <label className="form-field">Pain score (0–10)<input className="form-input" type="number" min="0" max="10" value={painScore} onChange={(e) => setPainScore(e.target.value)} /></label>
          <label className="form-field">Blood pressure<input className="form-input" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} placeholder="120/80" /></label>
          <label className="form-field">Temperature °C<input className="form-input" type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} /></label>
          <label className="form-field">Heart rate (bpm)<input className="form-input" type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} /></label>
          <label className="form-field">Oxygen saturation (%)<input className="form-input" type="number" min="0" max="100" value={spo2} onChange={(e) => setSpo2(e.target.value)} /></label>
        </div>
      </fieldset>
      <fieldset className="register-fieldset"><legend className="register-legend">Clinical intake questions</legend>
        {questions.length === 0 ? <p className="muted">No additional questionnaire questions are configured for this clinic.</p> : questions.map((question) => <label key={question.id} className="form-field">{question.questionText}{question.isRequired && ' *'}<textarea className="form-input form-textarea" required={question.isRequired} value={answers[question.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} /></label>)}
        <label className="form-field">Clinical notes<textarea className="form-input form-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </fieldset>
      <button className="primary-button" type="submit" disabled={busy || !patient}>{busy ? 'Saving medical assessment…' : 'Save medical assessment'}</button>
    </form>
  </section>
}
