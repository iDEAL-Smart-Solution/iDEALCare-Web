import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import apiClient from '../lib/apiClient'
import { patientApi } from '../api/patientApi'
import { assessmentApi, type AssessmentQuestion } from '../api/assessmentApi'
import PatientStaffAssignmentsPanel from '../components/PatientStaffAssignmentsPanel'
import PatientGuardiansPanel from '../components/PatientGuardiansPanel'
import PatientMedicalDocumentsPanel from '../components/PatientMedicalDocumentsPanel'
import { useAuthStore } from '../stores/authStore'
import type { PatientCareRecordDto, PatientDto, UpdatePatientRequest } from '../types/patient'

type MedicalRecord = {
  medicalHistory?: string | null
  currentDiagnosis?: string | null
  currentSymptoms?: string | null
  chronicConditions?: string | null
  previousSurgeriesOrProcedures?: string | null
  knownDisabilitiesOrLimitations?: string | null
  bloodGroup: number
  genotype: number
  immunizationInformation?: string | null
  familyMedicalHistory?: string | null
  dietaryRequirements?: string | null
  otherRelevantInformation?: string | null
}

const statusLabels: Record<number, string> = {
  1: 'Pending review', 2: 'Awaiting information', 3: 'Awaiting admission',
  4: 'Awaiting payment', 5: 'Awaiting admission', 6: 'Active',
  7: 'Rejected', 8: 'Discharged', 9: 'Terminated',
}
const sexLabels: Record<number, string> = { 1: 'Male', 2: 'Female', 3: 'Other', 4: 'Not provided' }
const maritalLabels: Record<number, string> = { 1: 'Single', 2: 'Married', 3: 'Divorced', 4: 'Widowed', 5: 'Separated', 6: 'Other', 7: 'Not provided' }
const bloodGroupLabels: Record<number, string> = { 1: 'A+', 2: 'A−', 3: 'B+', 4: 'B−', 5: 'AB+', 6: 'AB−', 7: 'O+', 8: 'O−', 9: 'Unknown', 10: 'Not provided' }
const genotypeLabels: Record<number, string> = { 1: 'AA', 2: 'AS', 3: 'SS', 4: 'AC', 5: 'SC', 6: 'CC', 7: 'Unknown', 8: 'Not provided' }

const emptyMedicalRecord: MedicalRecord = { bloodGroup: 10, genotype: 8 }

function patientForm(patient: PatientDto): UpdatePatientRequest {
  return {
    firstName: patient.firstName, middleName: patient.middleName ?? undefined, lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth ?? undefined, age: patient.age, sex: patient.sex, maritalStatus: patient.maritalStatus ?? undefined,
    occupation: patient.occupation ?? undefined, religion: patient.religion ?? undefined,
    phoneNumber: patient.phoneNumber ?? undefined, email: patient.email ?? undefined,
    address: patient.address ?? undefined, city: patient.city ?? undefined, state: patient.state ?? undefined,
    country: patient.country ?? undefined, nextOfKinFullName: patient.nextOfKinFullName ?? undefined,
    nextOfKinRelationship: patient.nextOfKinRelationship ?? undefined,
    nextOfKinPhoneNumber: patient.nextOfKinPhoneNumber ?? undefined,
    nextOfKinAlternativePhone: patient.nextOfKinAlternativePhone ?? undefined,
    nextOfKinEmail: patient.nextOfKinEmail ?? undefined, nextOfKinAddress: patient.nextOfKinAddress ?? undefined,
    nextOfKinCountry: patient.nextOfKinCountry ?? undefined,
    nextOfKinIsEmergencyContact: patient.nextOfKinIsEmergencyContact ?? undefined,
    requestedServiceId: patient.requestedServiceId ?? undefined, careLocationType: patient.careLocationType,
    homeCareAddress: patient.homeCareAddress ?? undefined, homeCareCity: patient.homeCareCity ?? undefined,
    homeCareState: patient.homeCareState ?? undefined, homeCareCountry: patient.homeCareCountry ?? undefined,
  }
}

function errorText(error: unknown) {
  if (axios.isAxiosError(error)) return (error.response?.data as { message?: string } | undefined)?.message ?? 'The request could not be completed.'
  return 'The request could not be completed.'
}

export default function PatientProfilePage({ patientId }: { patientId: string }) {
  const tenantRole = useAuthStore((state) => state.tenant?.tenant_role?.toLowerCase())
  const [patient, setPatient] = useState<PatientDto | null>(null)
  const [medical, setMedical] = useState<MedicalRecord | null>(null)
  const [careRecords, setCareRecords] = useState<PatientCareRecordDto[]>([])
  const [activeAdmissionId, setActiveAdmissionId] = useState<string | null>(null)
  const [careRecordOpen, setCareRecordOpen] = useState(false)
  const [careRecordType, setCareRecordType] = useState(1)
  const [careRecordContent, setCareRecordContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [medicalOpen, setMedicalOpen] = useState(false)
  const [clinicalOpen, setClinicalOpen] = useState(false)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [condition, setCondition] = useState('')
  const [painScore, setPainScore] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [temperature, setTemperature] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [spo2, setSpo2] = useState('')
  const [form, setForm] = useState<UpdatePatientRequest | null>(null)
  const [medicalForm, setMedicalForm] = useState<MedicalRecord>(emptyMedicalRecord)
  const [saving, setSaving] = useState(false)
  const [admissionOpen, setAdmissionOpen] = useState(false)

  async function loadProfile() {
    setLoading(true); setError(null)
    try {
      const record = await patientApi.get(patientId)
      setPatient(record)
      setForm(patientForm(record))
      try { setCareRecords(await patientApi.getCareRecords(patientId)) }
      catch { setCareRecords([]) }
      if (record.status === 6) {
        try { setActiveAdmissionId((await patientApi.getActiveAdmission(patientId)).admissionId) }
        catch { setActiveAdmissionId(null) }
      } else setActiveAdmissionId(null)
      try {
        const response = await apiClient.get<MedicalRecord>(`/api/medical/patients/${patientId}/information`)
        setMedical(response.data)
        setMedicalForm(response.data)
      } catch (medicalError) {
        if (axios.isAxiosError(medicalError) && medicalError.response?.status === 404) {
          setMedical(null); setMedicalForm(emptyMedicalRecord)
        } else throw medicalError
      }
    } catch (requestError) { setError(errorText(requestError)) }
    finally { setLoading(false) }
  }

  useEffect(() => { void loadProfile() }, [patientId])

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    if (!form) return
    setSaving(true); setError(null)
    try {
      const updated = await patientApi.update(patientId, form)
      setPatient(updated); setForm(patientForm(updated)); setEditOpen(false); setNotice('Patient profile updated.')
    } catch (requestError) { setError(errorText(requestError)) }
    finally { setSaving(false) }
  }

  async function saveMedicalRecord(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null)
    try {
      const response = await apiClient.put<MedicalRecord>(`/api/medical/patients/${patientId}/information`, medicalForm)
      setMedical(response.data); setMedicalForm(response.data); setMedicalOpen(false); setNotice('Medical record and note saved.')
    } catch (requestError) { setError(errorText(requestError)) }
    finally { setSaving(false) }
  }

  async function openClinicalAssessment() {
    setError(null)
    try {
      setQuestions(await assessmentApi.questions())
      setAnswers({}); setClinicalNotes(''); setCondition(''); setPainScore(''); setBloodPressure(''); setTemperature(''); setHeartRate(''); setSpo2('')
      setClinicalOpen(true)
    } catch (requestError) { setError(errorText(requestError)) }
  }

  async function saveClinicalAssessment(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null)
    try {
      await assessmentApi.createAssessment({
        patientId, notes: clinicalNotes.trim() || undefined,
        responses: questions.filter((question) => answers[question.id]?.trim()).map((question) => ({ assessmentQuestionId: question.id, answer: answers[question.id].trim() })),
      })
      await assessmentApi.createPhysicalAssessment(patientId, {
        isComplete: true, generalPhysicalCondition: condition.trim() || undefined,
        painScore: painScore ? Number(painScore) : undefined, bloodPressure: bloodPressure.trim() || undefined,
        temperatureCelsius: temperature ? Number(temperature) : undefined,
        heartRateBpm: heartRate ? Number(heartRate) : undefined,
        oxygenSaturationPercent: spo2 ? Number(spo2) : undefined,
        additionalNotes: clinicalNotes.trim() || undefined,
      })
      setClinicalOpen(false); setNotice('Onsite clinical assessment saved. Admission status was not changed.')
    } catch (requestError) { setError(errorText(requestError)) }
    finally { setSaving(false) }
  }

  async function saveCareRecord(event: FormEvent) {
    event.preventDefault()
    if (!activeAdmissionId || !careRecordContent.trim()) return
    setSaving(true); setError(null)
    try {
      const created = await patientApi.createCareRecord(patientId, { recordType: careRecordType, content: careRecordContent.trim(), admissionId: activeAdmissionId })
      setCareRecords((records) => [created, ...records]); setCareRecordContent(''); setCareRecordOpen(false)
      setNotice('Care update added to the patient timeline.')
    } catch (requestError) { setError(errorText(requestError)) }
    finally { setSaving(false) }
  }

  function beginAdmission() {
    if (!patient) return
    setError(null)
    setAdmissionOpen(true)
  }

  async function admitPatient() {
    if (!patient) return
    setSaving(true); setError(null)
    try {
      await patientApi.admit(patientId)
      await loadProfile()
      setNotice('Patient admitted successfully.')
      setAdmissionOpen(false)
    } catch (requestError) { setError(errorText(requestError)) }
    finally { setSaving(false) }
  }

  if (loading) return <p className="state-message">Loading patient profile…</p>
  if (!patient) return <section className="patients-page"><div className="notice notice--error" role="alert">{error ?? 'Patient not found.'}</div><Link className="secondary-button" to="/app/patients">Back to patients</Link></section>

  const value = (item?: string | null) => item?.trim() || 'Not provided'
  return <section className="patients-page">
    <header className="patients-page__header"><div><p className="eyebrow">Patient record</p><h2>{patient.firstName} {patient.middleName ? `${patient.middleName} ` : ''}{patient.lastName}</h2><p className="muted">{patient.email ?? patient.phoneNumber ?? 'No contact details'} · {statusLabels[patient.status] ?? 'Unknown status'}</p></div><div className="modal-actions"><Link className="secondary-button" to="/app/patients">All patients</Link>{(tenantRole === 'owner' || tenantRole === 'admin') && <button type="button" className="secondary-button" onClick={() => { setForm(patientForm(patient)); setEditOpen(true) }}>Edit profile</button>}{(tenantRole === 'owner' || tenantRole === 'admin') && patient.status === 5 && <button type="button" className="primary-button" onClick={() => void beginAdmission()}>Admit patient</button>}<button type="button" className="secondary-button" onClick={() => { setMedicalForm(medical ?? emptyMedicalRecord); setMedicalOpen(true) }}>{medical ? 'Edit medical record / note' : 'Add medical record / note'}</button>{(tenantRole === 'owner' || tenantRole === 'admin') && (patient.status === 5 || patient.status === 6) && <button type="button" className="primary-button" onClick={() => void openClinicalAssessment()}>Record onsite assessment</button>}</div></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}{notice && <div className="notice notice--success" role="status">{notice}</div>}
    <div className="review-grid">
      <section className="review-card"><h3>Personal details</h3><dl className="profile-details"><Detail label="Date of birth" value={patient.dateOfBirth ?? 'Not provided'} /><Detail label="Age" value={String(patient.age)} /><Detail label="Sex" value={sexLabels[patient.sex] ?? 'Not provided'} /><Detail label="Marital status" value={maritalLabels[patient.maritalStatus ?? 7] ?? 'Not provided'} /><Detail label="Occupation" value={value(patient.occupation)} /><Detail label="Religion" value={value(patient.religion)} /></dl></section>
      <section className="review-card"><h3>Contact and address</h3><dl className="profile-details"><Detail label="Email" value={value(patient.email)} /><Detail label="Phone" value={value(patient.phoneNumber)} /><Detail label="Address" value={value(patient.address)} /><Detail label="City" value={value(patient.city)} /><Detail label="State" value={value(patient.state)} /><Detail label="Country" value={value(patient.country)} /></dl></section>
      <section className="review-card"><h3>Next of kin</h3><dl className="profile-details"><Detail label="Name" value={value(patient.nextOfKinFullName)} /><Detail label="Relationship" value={value(patient.nextOfKinRelationship)} /><Detail label="Phone" value={value(patient.nextOfKinPhoneNumber)} /><Detail label="Alternative phone" value={value(patient.nextOfKinAlternativePhone)} /><Detail label="Email" value={value(patient.nextOfKinEmail)} /><Detail label="Address" value={value(patient.nextOfKinAddress)} /><Detail label="Country" value={value(patient.nextOfKinCountry)} /><Detail label="Emergency contact" value={patient.nextOfKinIsEmergencyContact ? 'Yes' : 'No'} /></dl></section>
      <section className="review-card"><h3>Registration and care</h3><dl className="profile-details"><Detail label="Status" value={statusLabels[patient.status] ?? 'Unknown'} /><Detail label="Care location" value={patient.careLocationType === 2 ? 'Home care' : 'Clinic / facility'} /><Detail label="Requested service" value={value(patient.requestedServiceId)} /><Detail label="Home care address" value={value(patient.homeCareAddress)} /><Detail label="Home care city" value={value(patient.homeCareCity)} /><Detail label="Home care state" value={value(patient.homeCareState)} /><Detail label="Home care country" value={value(patient.homeCareCountry)} /><Detail label="Review reason" value={value(patient.registrationReviewReason)} /><Detail label="Information requested" value={value(patient.informationRequest)} /><Detail label="Registered" value={new Date(patient.createdAt).toLocaleDateString()} /></dl></section>
      <section className="review-card"><h3>Medical record</h3>{medical ? <dl className="profile-details"><Detail label="Blood group" value={bloodGroupLabels[medical.bloodGroup] ?? 'Not provided'} /><Detail label="Genotype" value={genotypeLabels[medical.genotype] ?? 'Not provided'} /><Detail label="History" value={value(medical.medicalHistory)} /><Detail label="Current diagnosis" value={value(medical.currentDiagnosis)} /><Detail label="Symptoms" value={value(medical.currentSymptoms)} /><Detail label="Chronic conditions" value={value(medical.chronicConditions)} /><Detail label="Surgeries" value={value(medical.previousSurgeriesOrProcedures)} /><Detail label="Allergies" value={(medical as MedicalRecord & { allergies?: { name: string }[] }).allergies?.map((item) => item.name).join(', ') || 'Not provided'} /><Detail label="Medications" value={(medical as MedicalRecord & { medications?: { name: string }[] }).medications?.map((item) => item.name).join(', ') || 'Not provided'} /><Detail label="Notes" value={value(medical.otherRelevantInformation)} /></dl> : <p className="muted">No medical record has been added yet.</p>}</section>
      <section className="review-card"><div className="patient-care-heading"><div><h3>Care record timeline</h3><p className="muted">Ongoing updates are shared with guardians who have care record access.</p><Link to="/app/care-records">Open full care record history →</Link></div>{patient.status === 6 && ['owner', 'admin', 'nurse', 'staff'].includes(tenantRole ?? '') && <button type="button" className="primary-button" onClick={() => setCareRecordOpen(true)} disabled={!activeAdmissionId}>Add care update</button>}</div>{careRecords.length === 0 ? <p className="muted">No care records have been recorded for this patient.</p> : <ol className="patient-care-timeline">{careRecords.map((record) => <li key={record.id}><div><strong>{careRecordTypeLabel(record.recordType)}</strong><time dateTime={record.recordedAt}>{new Date(record.recordedAt).toLocaleString()}</time></div><p>{record.content}</p></li>)}</ol>}</section>
      {(tenantRole === 'owner' || tenantRole === 'admin') && <PatientStaffAssignmentsPanel patientId={patientId} patientIsActive={patient.status === 6} />}
      {(tenantRole === 'owner' || tenantRole === 'admin') && <PatientGuardiansPanel patientId={patientId} />}
    </div>
    <PatientMedicalDocumentsPanel patientId={patientId} canUpload={tenantRole === 'owner' || tenantRole === 'admin'} canDelete={tenantRole === 'owner' || tenantRole === 'admin'} />

    {admissionOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admit-patient-title"><div className="modal-content"><h3 id="admit-patient-title" className="modal-title">Admit patient</h3><p className="modal-subtitle">{patient.firstName} {patient.lastName}</p><p className="modal-explanation">Confirm admission. Bed assignment is optional and is not needed to use the clinic registration capacity.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAdmissionOpen(false)} disabled={saving}>Cancel</button><button type="button" className="primary-button" onClick={() => void admitPatient()} disabled={saving}>{saving ? 'Admitting…' : 'Confirm admission'}</button></div></div></div>}

    {careRecordOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="care-record-title"><form className="modal-content" onSubmit={saveCareRecord}><h3 id="care-record-title" className="modal-title">Add care update</h3><p className="modal-subtitle">This entry is timestamped and visible to guardians with care record access. Describe changes from baseline, key observations, actions taken, response, and follow-up plan.</p><label className="form-field"><span>Update type</span><select className="form-input" value={careRecordType} onChange={(event) => setCareRecordType(Number(event.target.value))}>{[1,2,3,4,5,6,7,8,9].map((type) => <option key={type} value={type}>{careRecordTypeLabel(type)}</option>)}</select></label><RecordArea label="Care update" value={careRecordContent} onChange={setCareRecordContent} required /><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCareRecordOpen(false)} disabled={saving}>Cancel</button><button className="primary-button" type="submit" disabled={saving || !activeAdmissionId}>{saving ? 'Saving…' : 'Save care update'}</button></div></form></div>}

    {editOpen && form && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-patient-title"><form className="modal-content modal-content--wide" onSubmit={saveProfile}><h3 id="edit-patient-title" className="modal-title">Edit patient profile</h3><div className="form-grid">
      <ProfileInput label="First name" value={form.firstName} onChange={(firstName) => setForm({ ...form, firstName })} required />
      <ProfileInput label="Middle name" value={form.middleName ?? ''} onChange={(middleName) => setForm({ ...form, middleName })} />
      <ProfileInput label="Last name" value={form.lastName} onChange={(lastName) => setForm({ ...form, lastName })} required />
      <ProfileInput label="Date of birth (if known)" type="date" value={form.dateOfBirth ?? ''} onChange={(dateOfBirth) => setForm({ ...form, dateOfBirth: dateOfBirth || undefined })} />
      <ProfileInput label="Age" type="number" value={String(form.age ?? '')} onChange={(age) => setForm({ ...form, age: Number(age) })} required />
      <ProfileInput label="Email" type="email" value={form.email ?? ''} onChange={(email) => setForm({ ...form, email })} />
      <ProfileInput label="Phone" value={form.phoneNumber ?? ''} onChange={(phoneNumber) => setForm({ ...form, phoneNumber })} />
      <ProfileInput label="Address" value={form.address ?? ''} onChange={(address) => setForm({ ...form, address })} />
      <ProfileInput label="City" value={form.city ?? ''} onChange={(city) => setForm({ ...form, city })} />
      <ProfileInput label="State" value={form.state ?? ''} onChange={(state) => setForm({ ...form, state })} />
      <ProfileInput label="Country" value={form.country ?? ''} onChange={(country) => setForm({ ...form, country })} />
      <ProfileInput label="Occupation" value={form.occupation ?? ''} onChange={(occupation) => setForm({ ...form, occupation })} />
      <ProfileInput label="Religion" value={form.religion ?? ''} onChange={(religion) => setForm({ ...form, religion })} />
      <ProfileInput label="Next of kin name" value={form.nextOfKinFullName ?? ''} onChange={(nextOfKinFullName) => setForm({ ...form, nextOfKinFullName })} />
      <ProfileInput label="Next of kin relationship" value={form.nextOfKinRelationship ?? ''} onChange={(nextOfKinRelationship) => setForm({ ...form, nextOfKinRelationship })} />
      <ProfileInput label="Next of kin phone" value={form.nextOfKinPhoneNumber ?? ''} onChange={(nextOfKinPhoneNumber) => setForm({ ...form, nextOfKinPhoneNumber })} />
      <ProfileInput label="Next of kin address" value={form.nextOfKinAddress ?? ''} onChange={(nextOfKinAddress) => setForm({ ...form, nextOfKinAddress })} />
      <label className="form-field"><span>Sex</span><select className="form-input" value={form.sex} onChange={(event) => setForm({ ...form, sex: Number(event.target.value) as UpdatePatientRequest['sex'] })}><option value={1}>Male</option><option value={2}>Female</option><option value={3}>Other</option><option value={4}>Not provided</option></select></label>
      <label className="form-field"><span>Care location</span><select className="form-input" value={form.careLocationType} onChange={(event) => setForm({ ...form, careLocationType: Number(event.target.value) as UpdatePatientRequest['careLocationType'] })}><option value={1}>Facility</option><option value={2}>Home</option></select></label>
      <label className="form-field"><span>Marital status</span><select className="form-input" value={form.maritalStatus ?? ''} onChange={(event) => setForm({ ...form, maritalStatus: event.target.value ? Number(event.target.value) as UpdatePatientRequest['maritalStatus'] : undefined })}><option value="">Not provided</option>{['Single','Married','Divorced','Widowed','Separated','Other','Not provided'].map((item, index) => <option key={item} value={index + 1}>{item}</option>)}</select></label>
    </div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div></form></div>}

    {medicalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="medical-record-title"><form className="modal-content modal-content--wide" onSubmit={saveMedicalRecord}><h3 id="medical-record-title" className="modal-title">Medical record and notes</h3><div className="form-grid"><RecordArea label="Medical history" value={medicalForm.medicalHistory ?? ''} onChange={(medicalHistory) => setMedicalForm({ ...medicalForm, medicalHistory })} /><RecordArea label="Current diagnosis" value={medicalForm.currentDiagnosis ?? ''} onChange={(currentDiagnosis) => setMedicalForm({ ...medicalForm, currentDiagnosis })} /><RecordArea label="Current symptoms" value={medicalForm.currentSymptoms ?? ''} onChange={(currentSymptoms) => setMedicalForm({ ...medicalForm, currentSymptoms })} /><RecordArea label="Chronic conditions" value={medicalForm.chronicConditions ?? ''} onChange={(chronicConditions) => setMedicalForm({ ...medicalForm, chronicConditions })} /><RecordArea label="Previous surgeries or procedures" value={medicalForm.previousSurgeriesOrProcedures ?? ''} onChange={(previousSurgeriesOrProcedures) => setMedicalForm({ ...medicalForm, previousSurgeriesOrProcedures })} /><RecordArea label="Disabilities or limitations" value={medicalForm.knownDisabilitiesOrLimitations ?? ''} onChange={(knownDisabilitiesOrLimitations) => setMedicalForm({ ...medicalForm, knownDisabilitiesOrLimitations })} /><label className="form-field"><span>Blood group</span><select className="form-input" value={medicalForm.bloodGroup} onChange={(event) => setMedicalForm({ ...medicalForm, bloodGroup: Number(event.target.value) })}>{['A+','A−','B+','B−','AB+','AB−','O+','O−','Unknown','Not provided'].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label><label className="form-field"><span>Genotype</span><select className="form-input" value={medicalForm.genotype} onChange={(event) => setMedicalForm({ ...medicalForm, genotype: Number(event.target.value) })}>{['AA','AS','SS','AC','SC','CC','Unknown','Not provided'].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label><RecordArea label="Immunization information" value={medicalForm.immunizationInformation ?? ''} onChange={(immunizationInformation) => setMedicalForm({ ...medicalForm, immunizationInformation })} /><RecordArea label="Family medical history" value={medicalForm.familyMedicalHistory ?? ''} onChange={(familyMedicalHistory) => setMedicalForm({ ...medicalForm, familyMedicalHistory })} /><RecordArea label="Dietary requirements" value={medicalForm.dietaryRequirements ?? ''} onChange={(dietaryRequirements) => setMedicalForm({ ...medicalForm, dietaryRequirements })} /><RecordArea label="Clinical note" value={medicalForm.otherRelevantInformation ?? ''} onChange={(otherRelevantInformation) => setMedicalForm({ ...medicalForm, otherRelevantInformation })} /></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setMedicalOpen(false)} disabled={saving}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save medical record'}</button></div></form></div>}

    {clinicalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="clinical-assessment-title"><form className="modal-content modal-content--wide" onSubmit={saveClinicalAssessment}><h3 id="clinical-assessment-title" className="modal-title">Onsite medical assessment</h3><p className="modal-subtitle">Complete this with the patient present. It does not change their registration or admission status.</p><div className="form-grid"><ProfileInput label="General condition" value={condition} onChange={setCondition} required /><ProfileInput label="Pain score (0–10)" type="number" value={painScore} onChange={setPainScore} /><ProfileInput label="Blood pressure" value={bloodPressure} onChange={setBloodPressure} /><ProfileInput label="Temperature °C" type="number" value={temperature} onChange={setTemperature} /><ProfileInput label="Heart rate (bpm)" type="number" value={heartRate} onChange={setHeartRate} /><ProfileInput label="Oxygen saturation (%)" type="number" value={spo2} onChange={setSpo2} />{questions.map((question) => <RecordArea key={question.id} label={`${question.questionText}${question.isRequired ? ' *' : ''}`} value={answers[question.id] ?? ''} onChange={(answer) => setAnswers({ ...answers, [question.id]: answer })} required={question.isRequired} />)}<RecordArea label="Assessment note" value={clinicalNotes} onChange={setClinicalNotes} /></div>{error && <div className="notice notice--error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setClinicalOpen(false)} disabled={saving}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save assessment'}</button></div></form></div>}
  </section>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="profile-detail"><dt>{label}</dt><dd>{value}</dd></div>
}

function careRecordTypeLabel(recordType: number) {
  return ({ 1: 'Care note', 2: 'Observation', 3: 'Medication record', 4: 'Vital signs', 5: 'Input / output', 6: 'Visit', 7: 'Nursing activity', 8: 'Condition change', 9: 'Other' } as Record<number, string>)[recordType] ?? 'Care record'
}

function ProfileInput({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="form-field"><span>{label}{required ? ' *' : ''}</span><input className="form-input" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></label>
}

function RecordArea({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="form-field"><span>{label}</span><textarea className="form-input form-textarea" rows={3} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></label>
}
