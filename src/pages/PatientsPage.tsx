import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import PatientProfilePage from './PatientProfilePage'
import { careServiceApi } from '../api/careServiceApi'
import type { CareServiceCatalogItem } from '../types/careService'
import type { GuardianAccessDto } from '../types/guardian'
import type { CreatePatientRequest, MaritalStatus, PatientDto, PatientStatus, PatientSummaryDto, Sex, CareLocationType } from '../types/patient'
import { useAuthStore } from '../stores/authStore'

const PAGE_SIZE = 20
const statusLabels: Record<PatientStatus, string> = {
  1: 'Pending review', 2: 'Awaiting information', 3: 'Awaiting admission',
  4: 'Awaiting payment', 5: 'Awaiting admission', 6: 'Active',
  7: 'Rejected', 8: 'Discharged', 9: 'Terminated',
}
const permissionLabels = [
  [1, 'Patient profile'], [2, 'Medical information'], [4, 'Medical documents'],
  [8, 'Bills'], [16, 'Payments'], [32, 'Appointments'], [64, 'Care records'], [128, 'Messages'],
] as const

function workflowActions(status: PatientStatus): { status: PatientStatus; label: string }[] {
  switch (status) {
    case 1: return [{ status: 4, label: 'Approve registration' }, { status: 2, label: 'Request information' }, { status: 7, label: 'Reject registration' }]
    case 2: return [{ status: 1, label: 'Return to review' }]
    case 3:
    case 5: return [{ status: 6, label: 'Admit patient' }]
    case 6: return [{ status: 8, label: 'Discharge patient' }, { status: 9, label: 'Terminate admission' }]
    case 7: return [{ status: 1, label: 'Reopen registration' }]
    default: return []
  }
}

function apiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return 'Something went wrong. Please try again.'
  if (error.response?.status === 403) return 'You do not have permission to perform this action.'
  if (error.response?.status === 404) return 'The requested record was not found.'
  if (!error.response) return 'The service is unavailable. Please try again.'
  return 'The request could not be completed. Check the form and try again.'
}

function validatePatientForm(form: CreatePatientRequest) {
  const errors: Record<string, string> = {}
  if (!form.firstName.trim()) errors.firstName = 'First name is required.'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.'
  if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required.'
  else if (new Date(`${form.dateOfBirth}T00:00:00`) >= new Date()) errors.dateOfBirth = 'Date of birth must be in the past.'
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address.'
  if (form.email && !/^[a-zA-Z0-9._-]{3,50}$/.test(form.userName?.trim() ?? '')) errors.userName = 'Choose a username using 3–50 letters, numbers, periods, underscores, or hyphens.'
  if (form.careLocationType === 2 && !form.homeCareAddress?.trim()) errors.homeCareAddress = 'Home care address is required.'
  return errors
}

const emptyForm: CreatePatientRequest = {
  firstName: '', lastName: '', dateOfBirth: '', sex: 4, careLocationType: 1, userName: '',
}

export default function PatientsPage() {
  const { patientId } = useParams()
  return patientId ? <PatientDetailPage /> : <PatientList />
}

export function PatientCreatePage() {
  return <PatientEditor />
}

export function PatientDetailPage() {
  const { patientId } = useParams()
  if (!patientId || !isGuid(patientId)) {
    return <p className="state-message">The requested record was not found.</p>
  }
  return <PatientProfilePage patientId={patientId} />
}

function isGuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function PatientList() {
  const navigate = useNavigate()
  const tenantRole = useAuthStore((state) => state.tenant?.tenant_role?.toLowerCase())
  const canManagePatients = tenantRole === 'owner' || tenantRole === 'admin'
  const [patients, setPatients] = useState<PatientSummaryDto[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusPatient, setStatusPatient] = useState<PatientSummaryDto | null>(null)
  const [targetStatus, setTargetStatus] = useState<PatientStatus | null>(null)
  const [statusReason, setStatusReason] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    patientApi.list(page, PAGE_SIZE).then((result) => {
      if (!active) return
      setPatients(result.items); setTotal(result.totalCount); setError(null)
    }).catch((requestError: unknown) => { if (active) setError(apiErrorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page])

  function openStatusModal(patient: PatientSummaryDto, status: PatientStatus) {
    setStatusPatient(patient)
    setTargetStatus(status)
    setStatusReason('')
    setStatusMessage(null)
  }

  async function saveStatusChange(event: FormEvent) {
    event.preventDefault()
    if (!statusPatient || targetStatus === null) return
    const needsReason = targetStatus === 2 || targetStatus === 7
    if (needsReason && !statusReason.trim()) {
      setStatusMessage(targetStatus === 2 ? 'Enter the questions or information needed from the patient.' : 'Enter a reason for rejecting this registration.')
      return
    }
    setSavingStatus(true); setStatusMessage(null)
    try {
      if (statusPatient.status === 1 && targetStatus === 2) {
        await patientApi.reviewRegistration(statusPatient.id, { decision: 'RequestInfo', reason: statusReason.trim() })
      } else if (statusPatient.status === 1 && targetStatus === 7) {
        await patientApi.reviewRegistration(statusPatient.id, { decision: 'Reject', reason: statusReason.trim() })
      } else if (statusPatient.status === 1 && targetStatus === 4) {
        await patientApi.reviewRegistration(statusPatient.id, { decision: 'Approve' })
      } else if ((statusPatient.status === 3 || statusPatient.status === 5) && targetStatus === 6) {
        await patientApi.admit(statusPatient.id)
      } else {
        await patientApi.updateStatus(statusPatient.id, { status: targetStatus })
      }
      setStatusPatient(null); setTargetStatus(null)
      const result = await patientApi.list(page, PAGE_SIZE)
      setPatients(result.items); setTotal(result.totalCount)
    } catch (requestError) {
      setStatusMessage(apiErrorMessage(requestError))
    } finally { setSavingStatus(false) }
  }

  return <section className="patients-page">
    <div className="patients-page__header">
      <div><p className="eyebrow">Patient management</p><h2>All patients</h2><p className="muted">Manage registration and admission status from one place. Select a patient’s name to open their profile.</p></div>
      {canManagePatients && <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button className="primary-button" type="button" onClick={() => navigate('/app/patients/new')}>Register patient</button>
      </div>}
    </div>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {loading ? <p className="state-message">Loading patients...</p> : patients.length === 0 ? <p className="state-message">No patients found.</p> : <>
        <div className="patient-table-wrap"><table className="patient-table"><caption className="sr-only">Patients</caption><thead><tr><th>Name</th><th>Date of birth</th><th>Status</th><th>Contact</th>{canManagePatients && <th>Update admission flow</th>}</tr></thead><tbody>
        {patients.map((patient) => { const actions = canManagePatients ? workflowActions(patient.status) : []; return <tr key={patient.id}><td><Link to={`/app/patients/${patient.id}`}>{patient.fullName}</Link></td><td>{patient.dateOfBirth}</td><td><span className="status-pill">{statusLabels[patient.status]}</span></td><td>{patient.email ?? patient.phoneNumber ?? 'Not provided'}</td>{canManagePatients && <td><select className="form-input" aria-label={`Change status for ${patient.fullName}`} disabled={actions.length === 0} value="" onChange={(event) => { if (event.target.value) openStatusModal(patient, Number(event.target.value) as PatientStatus) }}><option value="">{actions.length ? 'Select action' : patient.status === 4 ? 'Payment pending' : 'No actions available'}</option>{actions.map((action) => <option key={action.status} value={action.status}>{action.label}</option>)}</select></td>}</tr>})}
      </tbody></table></div>
      <div className="pagination"><span>{total} patient{total === 1 ? '' : 's'}</span><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button type="button" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((value) => value + 1)}>Next</button></div>
    </>}
    {statusPatient && targetStatus !== null && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="patient-status-title"><form className="modal-content" onSubmit={saveStatusChange}><h3 id="patient-status-title" className="modal-title">{workflowActions(statusPatient.status).find((action) => action.status === targetStatus)?.label}</h3><p className="modal-subtitle">Patient: <strong>{statusPatient.fullName}</strong></p>{statusPatient.status === 1 && targetStatus === 4 && <p className="modal-explanation">Approve this registration. The patient will move to payment if the clinic has a registration fee configured.</p>}{targetStatus === 2 && <label className="form-field">Questions or information needed<textarea className="form-input form-textarea" rows={4} required value={statusReason} onChange={(event) => setStatusReason(event.target.value)} /></label>}{targetStatus === 7 && <label className="form-field">Reason for rejection<textarea className="form-input form-textarea" rows={4} required value={statusReason} onChange={(event) => setStatusReason(event.target.value)} /></label>}{targetStatus === 6 && <p className="modal-explanation">Admit this approved patient now. A medical assessment can be recorded separately during the visit.</p>}{statusMessage && <div className="notice notice--error" role="alert">{statusMessage}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setStatusPatient(null)} disabled={savingStatus}>Cancel</button><button className="primary-button" type="submit" disabled={savingStatus}>{savingStatus ? 'Saving…' : 'Confirm status change'}</button></div></form></div>}
  </section>
}

function PatientEditor({ patientId }: { patientId?: string }) {
  const navigate = useNavigate()
  const [patient, setPatient] = useState<PatientDto | null>(null)
  const [guardians, setGuardians] = useState<GuardianAccessDto[]>([])
  const [form, setForm] = useState<CreatePatientRequest>(emptyForm)
  const [services, setServices] = useState<CareServiceCatalogItem[]>([])
  const [loading, setLoading] = useState(Boolean(patientId))
  const [patientError, setPatientError] = useState<string | null>(null)
  const [guardiansLoading, setGuardiansLoading] = useState(Boolean(patientId))
  const [guardiansError, setGuardiansError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [admitting, setAdmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    careServiceApi.getCatalog()
      .then((items) => { if (active) setServices(items) })
      .catch(() => { if (active) setServices([]) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!patientId) return

    let active = true
    patientApi.get(patientId).then((result) => {
      if (!active) return
      setPatient(result); setForm(toForm(result)); setPatientError(null)
    }).catch((requestError: unknown) => { if (active) setPatientError(apiErrorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [patientId])

  useEffect(() => {
    if (!patientId) return

    let active = true
    patientApi.listGuardians(patientId).then((assigned) => {
      if (!active) return
      setGuardians(assigned); setGuardiansError(null)
    }).catch((requestError: unknown) => { if (active) setGuardiansError(apiErrorMessage(requestError)) })
      .finally(() => { if (active) setGuardiansLoading(false) })
    return () => { active = false }
  }, [patientId])

  async function retryGuardians() {
    if (!patientId) return
    setGuardiansLoading(true); setGuardiansError(null)
    try { setGuardians(await patientApi.listGuardians(patientId)) } catch (requestError) { setGuardiansError(apiErrorMessage(requestError)) } finally { setGuardiansLoading(false) }
  }

  async function save(event: FormEvent) {
    event.preventDefault(); const errors = validatePatientForm(form)
    if (Object.keys(errors).length) { setError(Object.values(errors)[0]); return }
    setSaving(true); setError(null); setSuccess(null)
    try {
      const result = patientId && patient
        ? await patientApi.update(patientId, form)
        : await patientApi.create(form)
      setPatient(result); setForm(toForm(result)); setSuccess('Patient profile saved.')
    } catch (requestError) { setError(apiErrorMessage(requestError)) } finally { setSaving(false) }
  }

  async function admitPatient() {
    if (!patientId) return
    setAdmitting(true); setError(null)
    try { await patientApi.admit(patientId); setPatient(await patientApi.get(patientId)); setSuccess('Patient admitted successfully.') }
    catch (requestError) { setError(apiErrorMessage(requestError)) }
    finally { setAdmitting(false) }
  }

  if (loading) return <p className="state-message">Loading patient...</p>
  if (patientId && !patient) return <p className="state-message" role="alert">{patientError ?? 'The requested record was not found.'}</p>
  return <section className="patients-page">
    <button className="back-link" type="button" onClick={() => navigate('/app/patients')}>Back to patients</button>
    <div className="patients-page__header"><div><p className="eyebrow">Patient profile</p><h2>{patient ? `${patient.firstName} ${patient.lastName}` : 'Register patient'}</h2></div>{patient && <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>{patient.status === 5 && <button type="button" className="primary-button" onClick={admitPatient} disabled={admitting}>{admitting ? 'Admitting…' : 'Admit patient'}</button>}{(patient.status === 5 || patient.status === 6) && <Link className="secondary-button" to={`/app/patients/${patient.id}/assessment`}>Record medical assessment</Link>}<span className="status-pill">{statusLabels[patient.status]}</span></div>}</div>
    {error && <div className="notice notice--error" role="alert">{error}</div>}{success && <div className="notice notice--success" role="status">{success}</div>}
    <form className="patient-form" onSubmit={save} noValidate><fieldset disabled={saving}><legend>{patient ? 'Edit profile' : 'New patient'}</legend><div className="form-grid">
      <Field label="First name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} required /><Field label="Middle name" value={form.middleName ?? ''} onChange={(value) => setForm({ ...form, middleName: value })} /><Field label="Last name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} required /><Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={(value) => setForm({ ...form, dateOfBirth: value })} required /><label className="form-field"><span>Sex</span><select value={form.sex} onChange={(event) => setForm({ ...form, sex: Number(event.target.value) as Sex })}><option value="1">Male</option><option value="2">Female</option><option value="3">Other</option><option value="4">Not provided</option></select></label><label className="form-field"><span>Marital status</span><select value={form.maritalStatus ?? ''} onChange={(event) => setForm({ ...form, maritalStatus: event.target.value ? Number(event.target.value) as MaritalStatus : undefined })}><option value="">Not provided</option><option value="1">Single</option><option value="2">Married</option><option value="3">Divorced</option><option value="4">Widowed</option><option value="5">Separated</option><option value="6">Other</option><option value="7">Not provided</option></select></label><Field label="Occupation" value={form.occupation ?? ''} onChange={(value) => setForm({ ...form, occupation: value })} /><Field label="Religion" value={form.religion ?? ''} onChange={(value) => setForm({ ...form, religion: value })} /><Field label="Email" type="email" value={form.email ?? ''} onChange={(value) => setForm({ ...form, email: value })} />{!patient && <><Field label="Portal username" value={form.userName ?? ''} onChange={(value) => setForm({ ...form, userName: value })} /><p className="field-hint">If an email is provided, this username and a temporary password will be sent to the patient for first sign-in.</p></>}<Field label="Phone" value={form.phoneNumber ?? ''} onChange={(value) => setForm({ ...form, phoneNumber: value })} /><label className="form-field"><span>Care location</span><select value={form.careLocationType} onChange={(event) => setForm({ ...form, careLocationType: Number(event.target.value) as CareLocationType })}><option value="1">Facility</option><option value="2">Home</option></select></label><Field label="Address" value={form.address ?? ''} onChange={(value) => setForm({ ...form, address: value })} /><Field label="City" value={form.city ?? ''} onChange={(value) => setForm({ ...form, city: value })} /><Field label="State" value={form.state ?? ''} onChange={(value) => setForm({ ...form, state: value })} /><Field label="Country" value={form.country ?? ''} onChange={(value) => setForm({ ...form, country: value })} /><label className="form-field"><span>Requested service</span><select aria-label="Requested service" value={form.requestedServiceId ?? ''} onChange={(event) => setForm({ ...form, requestedServiceId: event.target.value ? event.target.value : undefined })}><option value="">None / General registration</option>{form.requestedServiceId && !services.some((s) => s.id === form.requestedServiceId) && <option value={form.requestedServiceId}>Selected service ({form.requestedServiceId})</option>}{services.map((service) => <option key={service.id} value={service.id}>{service.name} (₦{service.price.toLocaleString()})</option>)}</select></label><Field label="Next-of-kin full name" value={form.nextOfKinFullName ?? ''} onChange={(value) => setForm({ ...form, nextOfKinFullName: value })} /><Field label="Next-of-kin relationship" value={form.nextOfKinRelationship ?? ''} onChange={(value) => setForm({ ...form, nextOfKinRelationship: value })} /><Field label="Next-of-kin phone" value={form.nextOfKinPhoneNumber ?? ''} onChange={(value) => setForm({ ...form, nextOfKinPhoneNumber: value })} /><Field label="Next-of-kin alternative phone" value={form.nextOfKinAlternativePhone ?? ''} onChange={(value) => setForm({ ...form, nextOfKinAlternativePhone: value })} /><Field label="Next-of-kin email" type="email" value={form.nextOfKinEmail ?? ''} onChange={(value) => setForm({ ...form, nextOfKinEmail: value })} /><Field label="Next-of-kin address" value={form.nextOfKinAddress ?? ''} onChange={(value) => setForm({ ...form, nextOfKinAddress: value })} /><Field label="Next-of-kin country" value={form.nextOfKinCountry ?? ''} onChange={(value) => setForm({ ...form, nextOfKinCountry: value })} /><label className="checkbox-field"><input type="checkbox" checked={form.nextOfKinIsEmergencyContact ?? false} onChange={(event) => setForm({ ...form, nextOfKinIsEmergencyContact: event.target.checked })} />Next of kin is emergency contact</label>{form.careLocationType === 2 && <><Field label="Home care address" value={form.homeCareAddress ?? ''} onChange={(value) => setForm({ ...form, homeCareAddress: value })} required /><Field label="Home care city" value={form.homeCareCity ?? ''} onChange={(value) => setForm({ ...form, homeCareCity: value })} /><Field label="Home care state" value={form.homeCareState ?? ''} onChange={(value) => setForm({ ...form, homeCareState: value })} /><Field label="Home care country" value={form.homeCareCountry ?? ''} onChange={(value) => setForm({ ...form, homeCareCountry: value })} /></>}</div><button className="primary-button" type="submit">{saving ? 'Saving...' : patient ? 'Save changes' : 'Create patient'}</button></fieldset></form>
    {patient && patientId && <GuardianPanel patientId={patientId} guardians={guardians} guardiansLoading={guardiansLoading} guardiansError={guardiansError} retryGuardians={retryGuardians} setGuardians={setGuardians} onError={setError} />}
  </section>
}

function GuardianPanel({ patientId, guardians, guardiansLoading, guardiansError, retryGuardians, setGuardians, onError }: { patientId: string; guardians: GuardianAccessDto[]; guardiansLoading: boolean; guardiansError: string | null; retryGuardians: () => Promise<void>; setGuardians: (value: GuardianAccessDto[]) => void; onError: (value: string | null) => void }) {
  const [guardianId, setGuardianId] = useState('')
  const [relationship, setRelationship] = useState('')
  const [permissions, setPermissions] = useState(1)
  const [isPrimary, setIsPrimary] = useState(false)
  const [busy, setBusy] = useState(false)
  async function assign(event: FormEvent) {
    event.preventDefault()
    if (!guardianId.trim() || !relationship.trim() || permissions === 0) {
      onError('Guardian ID, relationship, and at least one permission are required.')
      return
    }
    setBusy(true)
    try {
      const result = await patientApi.assignGuardian(patientId, { guardianId: guardianId.trim(), relationship: relationship.trim(), isPrimary, permissions })
      setGuardians([...guardians, result]); setGuardianId(''); setRelationship(''); setIsPrimary(false); onError(null)
    } catch (error) { onError(apiErrorMessage(error)) } finally { setBusy(false) }
  }
  return <section className="guardian-panel"><h3>Guardian access</h3>{guardiansLoading ? <p className="muted">Loading guardians...</p> : guardiansError ? <div className="notice notice--error" role="alert"><p>{guardiansError}</p><button className="secondary-button" type="button" onClick={retryGuardians}>Retry guardians</button></div> : guardians.length === 0 ? <p className="muted">No guardians assigned.</p> : <ul className="guardian-list">{guardians.map((guardian) => <li key={guardian.id}><div><strong>{guardian.relationship}</strong><span className="muted">{guardian.isActive ? 'Active access' : 'Inactive access'}</span></div><GuardianPermissionForm patientId={patientId} guardian={guardian} busy={busy} setBusy={setBusy} setGuardians={setGuardians} guardians={guardians} onError={onError} /></li>)}</ul>}<form className="guardian-form" onSubmit={assign}><h4>Assign existing guardian</h4><Field label="Guardian ID" value={guardianId} onChange={setGuardianId} required /><Field label="Relationship" value={relationship} onChange={setRelationship} required /><label className="checkbox-field"><input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />Primary guardian</label><fieldset className="permissions"><legend>Initial permissions</legend>{permissionLabels.map(([bit, label]) => <label key={bit}><input type="checkbox" checked={(permissions & bit) === bit} onChange={() => setPermissions((value) => value ^ bit)} />{label}</label>)}</fieldset><button className="secondary-button" type="submit" disabled={busy}>Assign guardian</button></form></section>
}

function GuardianPermissionForm({ patientId, guardian, busy, setBusy, setGuardians, guardians, onError }: { patientId: string; guardian: GuardianAccessDto; busy: boolean; setBusy: (value: boolean) => void; setGuardians: (value: GuardianAccessDto[]) => void; guardians: GuardianAccessDto[]; onError: (value: string | null) => void }) {
  const [grant, setGrant] = useState(0)
  const [revoke, setRevoke] = useState(0)
  const [open, setOpen] = useState(false)
  function toggle(bit: number, action: 'grant' | 'revoke') {
    if (action === 'grant') { setGrant((value) => value ^ bit); setRevoke((value) => value & ~bit) }
    else { setRevoke((value) => value ^ bit); setGrant((value) => value & ~bit) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (grant === 0 && revoke === 0) { onError('Select at least one permission to grant or revoke.'); return }
    setBusy(true)
    try { const result = await patientApi.updateGuardianPermissions(patientId, guardian.guardianId, { grant, revoke }); setGuardians(guardians.map((item) => item.id === guardian.id ? result : item)); setGrant(0); setRevoke(0); onError(null) }
    catch (error) { onError(apiErrorMessage(error)) } finally { setBusy(false) }
  }
  return <div className="guardian-actions"><button type="button" disabled={busy} onClick={() => setOpen(!open)}>{open ? 'Close permissions' : 'Manage permissions'}</button><button type="button" disabled={busy} onClick={async () => { try { await patientApi.revokeGuardian(patientId, guardian.guardianId); setGuardians(guardians.filter((item) => item.id !== guardian.id)) } catch (error) { onError(apiErrorMessage(error)) } }}>Revoke access</button>{open && <form className="permission-form" onSubmit={submit}><fieldset className="permissions"><legend>Grant or revoke permissions</legend>{permissionLabels.map(([bit, label]) => <div className="permission-row" key={bit}><span>{label}</span><label><input aria-label={`${label} Grant`} type="checkbox" checked={(grant & bit) === bit} onChange={() => toggle(bit, 'grant')} />Grant</label><label><input aria-label={`${label} Revoke`} type="checkbox" checked={(revoke & bit) === bit} onChange={() => toggle(bit, 'revoke')} />Revoke</label></div>)}</fieldset><button className="secondary-button" type="submit" disabled={busy}>Save permissions</button></form>}</div>
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="form-field"><span>{label}{required && ' *'}</span><input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></label> }
function toForm(patient: PatientDto): CreatePatientRequest {
  const responseOnlyFields = new Set(['id', 'age', 'status', 'createdAt', 'updatedAt'])
  const form = Object.fromEntries(
    Object.entries(patient).filter(([key]) => !responseOnlyFields.has(key)),
  )
  const normalized = Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, value ?? undefined]),
  )
  return normalized as unknown as CreatePatientRequest
}
