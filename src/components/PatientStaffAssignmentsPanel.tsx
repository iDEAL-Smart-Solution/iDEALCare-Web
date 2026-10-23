import { useEffect, useState } from 'react'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import { staffApi, type TenantStaffDto } from '../api/staffApi'

type Assignment = Awaited<ReturnType<typeof patientApi.listStaffAssignments>>[number]

export default function PatientStaffAssignmentsPanel({ patientId, patientIsActive }: { patientId: string; patientIsActive: boolean }) {
  const [members, setMembers] = useState<TenantStaffDto[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const [staff, assigned] = await Promise.all([staffApi.list(), patientApi.listStaffAssignments(patientId)])
      setMembers(staff); setAssignments(assigned)
    } catch (requestError) {
      setError(axios.isAxiosError(requestError)
        ? (requestError.response?.data as { message?: string } | undefined)?.message ?? 'Staff assignments could not be loaded.'
        : 'Staff assignments could not be loaded.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [patientId])

  const available = members.filter((member) => !assignments.some((assignment) => assignment.staffUserId === member.id))

  async function assign() {
    if (!selectedStaffId) return
    setSaving(true); setError(null)
    try { await patientApi.assignStaff(patientId, selectedStaffId); setSelectedStaffId(''); await load() }
    catch (requestError) { setError(axios.isAxiosError(requestError) ? (requestError.response?.data as { message?: string } | undefined)?.message ?? 'Staff could not be assigned.' : 'Staff could not be assigned.') }
    finally { setSaving(false) }
  }

  async function unassign(staffUserId: string) {
    setSaving(true); setError(null)
    try { await patientApi.unassignStaff(patientId, staffUserId); await load() }
    catch (requestError) { setError(axios.isAxiosError(requestError) ? (requestError.response?.data as { message?: string } | undefined)?.message ?? 'Staff assignment could not be removed.' : 'Staff assignment could not be removed.') }
    finally { setSaving(false) }
  }

  return <section className="review-card patient-staff-assignments">
    <div className="patient-staff-assignments__heading"><div><h3>Assigned care staff</h3><p className="muted">Only assigned staff can view this patient once their admission is active.</p></div><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button></div>
    {!patientIsActive && <p className="patient-staff-assignments__note">You can prepare the assignment now. Patient access for staff starts after admission.</p>}
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {loading ? <p className="muted">Loading assignments…</p> : assignments.length === 0 ? <p className="muted">No care staff assigned yet.</p> : <ul className="patient-staff-assignments__list">{assignments.map((assignment) => <li key={assignment.id}><div><strong>{assignment.staffFirstName} {assignment.staffLastName}</strong><span>{patientIsActive ? 'Patient access active' : 'Access waits for admission'}</span></div><button className="secondary-button" type="button" disabled={saving} onClick={() => void unassign(assignment.staffUserId)}>Remove</button></li>)}</ul>}
    {!loading && <div className="patient-staff-assignments__add"><label className="form-field"><span>Add staff member</span><select className="form-input" value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} disabled={saving || available.length === 0}><option value="">{available.length ? 'Choose care staff' : 'No unassigned staff available'}</option>{available.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName} · {member.role}</option>)}</select></label><button className="primary-button" type="button" disabled={saving || !selectedStaffId} onClick={() => void assign()}>{saving ? 'Saving…' : 'Assign staff'}</button></div>}
  </section>
}
