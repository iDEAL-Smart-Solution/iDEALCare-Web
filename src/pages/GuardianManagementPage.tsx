import { useEffect, useMemo, useState, type FormEvent } from 'react'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import type { GuardianDirectoryDto, GuardianPatientDto } from '../types/guardian'
import type { PatientSummaryDto } from '../types/patient'
import { guardianPermissions } from '../types/guardian'

function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message ?? 'Guardian management could not be loaded.'
    : 'Guardian management could not be loaded.'
}

async function listAllPatients() {
  const first = await patientApi.list(1, 100)
  const patients = [...first.items]
  for (let page = 2; patients.length < first.totalCount; page += 1) {
    const next = await patientApi.list(page, 100)
    patients.push(...next.items)
    if (next.items.length === 0) break
  }
  return patients
}

export default function GuardianManagementPage() {
  const [guardians, setGuardians] = useState<GuardianDirectoryDto[]>([])
  const [patients, setPatients] = useState<PatientSummaryDto[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    Promise.all([patientApi.listTenantGuardians(), listAllPatients()])
      .then(([guardianRows, patientRows]) => { if (active) { setGuardians(guardianRows); setPatients(patientRows) } })
      .catch((reason: unknown) => { if (active) setError(errorMessage(reason)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [version])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? guardians.filter((guardian) => `${guardian.firstName} ${guardian.lastName} ${guardian.email}`.toLowerCase().includes(term)) : guardians
  }, [guardians, search])

  return <div className="guardian-management-page">
    <header className="patient-portal__header"><div><span className="eyebrow">People & access</span><h2>Guardian management</h2><p className="muted">View registered guardian accounts, link them to patients, and manage access.</p></div><button className="secondary-button" type="button" onClick={() => setVersion((value) => value + 1)} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button></header>
    <label className="guardian-directory__search"><span>Search guardians</span><input className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></label>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {loading ? <p className="state-message">Loading guardian accounts…</p>
      : guardians.length === 0 ? <section className="patient-dashboard__panel"><h3>No guardian accounts yet</h3><p className="patient-dashboard__empty">Guardians appear here after they register on this provider’s portal.</p></section>
        : visible.length === 0 ? <p className="patient-dashboard__empty">No guardians match your search.</p>
          : <div className="guardian-directory__list">{visible.map((guardian) => <GuardianDirectoryCard key={guardian.id} guardian={guardian} patients={patients} onChanged={() => setVersion((value) => value + 1)} />)}</div>}
  </div>
}

function GuardianDirectoryCard({ guardian, patients, onChanged }: {
  guardian: GuardianDirectoryDto; patients: PatientSummaryDto[]; onChanged: () => void
}) {
  const [links, setLinks] = useState<GuardianPatientDto[]>([])
  const [patientId, setPatientId] = useState('')
  const [relationship, setRelationship] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [permissions, setPermissions] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadLinks() {
    try { setLinks(await patientApi.listAccessiblePatients(guardian.id)) }
    catch (reason) { setError(errorMessage(reason)) }
  }
  useEffect(() => { void loadLinks() }, [guardian.id])
  const linkedIds = new Set(links.map((link) => link.patientId))
  const unlinkedPatients = patients.filter((patient) => !linkedIds.has(patient.id))

  function toggle(bit: number) { setPermissions((current) => current & bit ? current & ~bit : current | bit) }
  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!patientId || !relationship.trim() || permissions === 0) return
    setBusy(true); setError(null)
    try {
      await patientApi.assignGuardian(patientId, { guardianId: guardian.id, relationship: relationship.trim(), isPrimary, permissions })
      setPatientId(''); setRelationship(''); setIsPrimary(false); setPermissions(0)
      await loadLinks(); onChanged()
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setBusy(false) }
  }
  async function updatePermission(link: GuardianPatientDto, bit: number) {
    const next = link.permissions & bit ? link.permissions & ~bit : link.permissions | bit
    setBusy(true); setError(null)
    try {
      await patientApi.updateGuardianPermissions(link.patientId, guardian.id, { grant: next & ~link.permissions, revoke: link.permissions & ~next })
      await loadLinks()
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setBusy(false) }
  }
  async function revoke(link: GuardianPatientDto) {
    setBusy(true); setError(null)
    try { await patientApi.revokeGuardian(link.patientId, guardian.id); await loadLinks() }
    catch (reason) { setError(errorMessage(reason)) }
    finally { setBusy(false) }
  }

  return <section className="guardian-directory__card">
    <header><div className="guardian-directory__avatar" aria-hidden="true">{guardian.firstName[0]}{guardian.lastName[0]}</div><div><h3>{guardian.firstName} {guardian.lastName}</h3><p>{guardian.email}</p></div></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    <div className="guardian-directory__assignments"><h4>Linked patients</h4>
      {links.length === 0 ? <p className="patient-dashboard__empty">No patients linked to this guardian.</p> : <ul>{links.map((link) => <li key={link.patientId}>
        <div><strong>{link.firstName} {link.lastName}</strong><span>{link.relationship}{link.isPrimary ? ' · Primary guardian' : ''}</span><span className={link.consentGranted ? 'guardian-management__status guardian-management__status--active' : 'guardian-management__status'}>{link.consentGranted ? 'Patient approved · access active' : 'Waiting for patient approval'}</span></div>
        <fieldset className="guardian-management__permissions"><legend>Permissions</legend>{guardianPermissions.map(({ bit, label }) => <label key={bit}><input type="checkbox" checked={(link.permissions & bit) !== 0} disabled={busy} onChange={() => void updatePermission(link, bit)} />{label}</label>)}</fieldset>
        <button className="secondary-button" type="button" disabled={busy} onClick={() => void revoke(link)}>Revoke</button>
      </li>)}</ul>}
    </div>
    <form className="guardian-directory__assign-form" onSubmit={(event) => void assign(event)}><h4>Assign a patient</h4>
      <div className="guardian-management__lookup"><label className="form-field"><span>Patient</span><select className="form-input" value={patientId} onChange={(event) => setPatientId(event.target.value)} disabled={busy || unlinkedPatients.length === 0}><option value="">{unlinkedPatients.length ? 'Choose a patient' : 'All patients linked'}</option>{unlinkedPatients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select></label>
        <label className="form-field"><span>Relationship</span><input className="form-input" value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="e.g. Daughter" disabled={busy} /></label>
        <label className="guardian-management__primary"><input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} disabled={busy} />Primary guardian</label>
      </div>
      <fieldset className="guardian-management__permissions"><legend>Permissions for this patient</legend>{guardianPermissions.map(({ bit, label }) => <label key={bit}><input type="checkbox" checked={(permissions & bit) !== 0} onChange={() => toggle(bit)} disabled={busy} />{label}</label>)}</fieldset>
      <p className="muted">The patient must approve before the guardian can view this information.</p>
      <button className="primary-button" type="submit" disabled={busy || !patientId || !relationship.trim() || permissions === 0}>{busy ? 'Saving…' : 'Assign guardian'}</button>
    </form>
  </section>
}
