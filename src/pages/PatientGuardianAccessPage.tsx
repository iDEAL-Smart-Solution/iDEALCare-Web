import { useEffect, useState } from 'react'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import type { GuardianAccessDto } from '../types/guardian'
import { guardianPermissions } from '../types/guardian'

export default function PatientGuardianAccessPage() {
  const [guardians, setGuardians] = useState<GuardianAccessDto[]>([])
  const [selections, setSelections] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    patientApi.listMyGuardians()
      .then((rows) => {
        if (!active) return
        setGuardians(rows)
        setSelections(Object.fromEntries(rows.map((row) => [row.guardianId, row.permissions])))
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(axios.isAxiosError(requestError) && requestError.response?.status === 404
          ? 'No patient profile is linked to this account.'
          : 'Guardian links could not be loaded. Refresh the page to try again.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  function toggle(guardianId: string, bit: number) {
    setSelections((current) => {
      const selected = current[guardianId] ?? 0
      return { ...current, [guardianId]: selected & bit ? selected & ~bit : selected | bit }
    })
  }

  async function approve(guardianId: string) {
    const permissions = selections[guardianId] ?? 0
    if (!permissions) return
    setBusyId(guardianId); setError(null); setNotice(null)
    try {
      const updated = await patientApi.setMyGuardianConsent(guardianId, permissions)
      setGuardians((current) => current.map((row) => row.guardianId === guardianId ? updated : row))
      setNotice('Guardian access approved with the selected permissions.')
    } catch { setError('Approval could not be saved. Please try again.') }
    finally { setBusyId(null) }
  }

  async function revoke(guardianId: string, isPending: boolean) {
    setBusyId(guardianId); setError(null); setNotice(null)
    try {
      await patientApi.revokeMyGuardian(guardianId)
      setGuardians((current) => current.map((row) => row.guardianId === guardianId
        ? { ...row, isActive: false, consentGranted: false, permissions: 0 }
        : row))
      setSelections((current) => ({ ...current, [guardianId]: 0 }))
      setNotice(isPending ? 'Guardian request declined.' : 'Guardian access revoked immediately.')
    } catch { setError('Guardian access could not be revoked. Please try again.') }
    finally { setBusyId(null) }
  }

  async function saveChanges(guardianId: string) {
    setBusyId(guardianId); setError(null); setNotice(null)
    try {
      const updated = await patientApi.setMyGuardianConsent(guardianId, selections[guardianId] ?? 0)
      setGuardians((current) => current.map((row) => row.guardianId === guardianId ? updated : row))
      setNotice((selections[guardianId] ?? 0) === 0 ? 'Guardian access revoked immediately.' : 'Guardian permissions updated immediately.')
    } catch { setError('Guardian permissions could not be updated. Please try again.') }
    finally { setBusyId(null) }
  }

  return <div className="guardian-access-page">
    <header className="patient-portal__header"><div><span className="eyebrow">Privacy & access</span><h2>Guardian access</h2><p className="muted">Approve guardian links and choose which parts of your care information each guardian can see.</p></div><button type="button" className="secondary-button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>{loading ? 'Loading…' : '↻ Refresh'}</button></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {notice && <div className="notice notice--success" role="status">{notice}</div>}
    {loading ? <p className="state-message">Loading guardian links…</p>
      : guardians.length === 0 ? <section className="patient-dashboard__panel"><h3>No guardian links yet</h3><p className="patient-dashboard__empty">A provider Owner or Admin can link a registered guardian to your patient profile. You will review the request here.</p></section>
        : <div className="guardian-access-page__list">{guardians.map((guardian) => {
          const selected = selections[guardian.guardianId] ?? guardian.permissions
          const pending = guardian.isActive && !guardian.consentGranted
          const active = guardian.isActive && guardian.consentGranted
          const changed = selected !== guardian.permissions
          return <section className="guardian-access-card" key={guardian.guardianId}>
            <header><div><span className="eyebrow">{pending ? 'Approval needed' : active ? 'Access active' : 'Access revoked'}</span><h3>{guardian.guardianFirstName} {guardian.guardianLastName}</h3><p>{guardian.guardianEmail} · {guardian.relationship}{guardian.isPrimary ? ' · Primary guardian' : ''}</p></div><span className={active ? 'guardian-management__status guardian-management__status--active' : 'guardian-management__status'}>{active ? 'Approved' : pending ? 'Pending' : 'Revoked'}</span></header>
            {guardian.isActive && <fieldset className="guardian-management__permissions guardian-access-card__permissions"><legend>{pending ? 'Select what this guardian may access' : 'Allowed information'}</legend>{guardianPermissions.map(({ bit, label }) => <label key={bit}><input type="checkbox" checked={(selected & bit) !== 0} onChange={() => toggle(guardian.guardianId, bit)} disabled={busyId === guardian.guardianId} />{label}</label>)}</fieldset>}
            <div className="guardian-access-card__actions">
              {pending && <><button type="button" className="primary-button" disabled={busyId === guardian.guardianId || selected === 0} onClick={() => void approve(guardian.guardianId)}>{busyId === guardian.guardianId ? 'Saving…' : 'Approve selected access'}</button><button type="button" className="secondary-button" disabled={busyId === guardian.guardianId} onClick={() => void revoke(guardian.guardianId, true)}>Decline request</button></>}
              {active && <><button type="button" className="primary-button" disabled={busyId === guardian.guardianId || !changed || selected === 0} onClick={() => void saveChanges(guardian.guardianId)}>{busyId === guardian.guardianId ? 'Saving…' : 'Save permissions'}</button><button type="button" className="secondary-button" disabled={busyId === guardian.guardianId} onClick={() => void revoke(guardian.guardianId, false)}>Revoke access</button></>}
            </div>
          </section>
        })}</div>}
  </div>
}
