import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import axios from 'axios'
import { careRecordApi } from '../api/careRecordApi'
import { patientApi } from '../api/patientApi'
import { useAuthStore } from '../stores/authStore'
import type { GuardianPatientDto } from '../types/guardian'
import type { PatientCareRecordDto, PatientDto } from '../types/patient'

const PAGE_SIZE = 25
const recordTypes: Record<number, string> = {
  1: 'Care note', 2: 'Observation', 3: 'Medication', 4: 'Vital signs', 5: 'Input / output',
  6: 'Visit', 7: 'Nursing activity', 8: 'Condition change', 9: 'Other',
}
const messageFor = (error: unknown) => axios.isAxiosError(error)
  ? (error.response?.data as { message?: string } | undefined)?.message ?? 'Care record history could not be loaded.'
  : 'Care record history could not be loaded.'
const startOfDay = (value: string) => value ? new Date(`${value}T00:00:00`).toISOString() : undefined
const endOfDay = (value: string) => value ? new Date(`${value}T23:59:59.999`).toISOString() : undefined

export default function CareRecordsPage() {
  const role = useAuthStore((state) => state.tenant?.tenant_role?.toLowerCase() ?? '')
  if (role === 'patient') return <PatientCareRecords />
  if (role === 'guardian') return <GuardianCareRecords />
  return <StaffCareRecords role={role} />
}

function StaffCareRecords({ role }: { role: string }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [recordType, setRecordType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [applied, setApplied] = useState({ searchTerm: '', recordType: '', fromDate: '', toDate: '' })
  const [items, setItems] = useState<PatientCareRecordDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(nextPage = page) {
    setLoading(true); setError('')
    try {
      const result = await careRecordApi.searchHistory({
        searchTerm: applied.searchTerm || undefined,
        recordType: applied.recordType ? Number(applied.recordType) : undefined,
        fromDate: startOfDay(applied.fromDate), toDate: endOfDay(applied.toDate), page: nextPage, pageSize: PAGE_SIZE,
      })
      setItems(result.items); setTotal(result.totalCount); setPage(result.page)
    } catch (requestError) { setError(messageFor(requestError)) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load(1) }, [applied])

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    setApplied({ searchTerm: searchTerm.trim(), recordType, fromDate, toDate })
  }

  const heading = role === 'owner' || role === 'admin' ? 'Clinic care record history' : 'Assigned patients’ care records'
  const description = role === 'owner' || role === 'admin'
    ? 'Search the clinic’s care history by patient, note content, type, or date.'
    : 'Review the care history of patients currently assigned to you. Search is limited to your assigned patients.'
  return <CareRecordPageFrame heading={heading} description={description}>
    <CareRecordFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} recordType={recordType} setRecordType={setRecordType} fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} onSubmit={applyFilters} />
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    <CareRecordSummary records={items} total={total} />
    <CareRecordTimeline records={items} loading={loading} />
    <CareRecordPagination page={page} total={total} pageSize={PAGE_SIZE} onPage={(next) => void load(next)} loading={loading} />
  </CareRecordPageFrame>
}

function PatientCareRecords() {
  const [patient, setPatient] = useState<PatientDto | null>(null)
  const [records, setRecords] = useState<PatientCareRecordDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [recordType, setRecordType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError('')
      try {
        const me = await patientApi.getMe()
        const history = await patientApi.getCareRecords(me.id)
        if (active) { setPatient(me); setRecords(history) }
      } catch (requestError) { if (active) setError(messageFor(requestError)) }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => filterRecords(records, searchTerm, recordType, fromDate, toDate), [records, searchTerm, recordType, fromDate, toDate])
  return <CareRecordPageFrame heading="My care record history" description="Follow your care updates over time. Use the filters to find a note, observation, or condition update.">
    <CareRecordFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} recordType={recordType} setRecordType={setRecordType} fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} />
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {patient && <CareRecordSummary records={filtered} total={filtered.length} />}
    <CareRecordTimeline records={filtered} loading={loading} />
  </CareRecordPageFrame>
}

function GuardianCareRecords() {
  const [links, setLinks] = useState<GuardianPatientDto[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [records, setRecords] = useState<PatientCareRecordDto[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [recordType, setRecordType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const allowedLinks = links.filter((link) => link.isActive && link.consentGranted && (link.permissions & 64) !== 0)

  useEffect(() => {
    let active = true
    patientApi.listMyGuardianPatients()
      .then((result) => {
        if (!active) return
        const permitted = result.filter((link) => link.isActive && link.consentGranted && (link.permissions & 64) !== 0)
        setLinks(result)
        setSelectedPatientId((current) => permitted.some((link) => link.patientId === current) ? current : permitted[0]?.patientId ?? '')
      })
      .catch((requestError) => { if (active) setError(messageFor(requestError)) })
      .finally(() => { if (active) setLoadingLinks(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedPatientId) { setRecords([]); return }
    let active = true
    setLoadingRecords(true); setError('')
    patientApi.getCareRecords(selectedPatientId)
      .then((result) => { if (active) setRecords(result) })
      .catch((requestError) => { if (active) { setRecords([]); setError(messageFor(requestError)) } })
      .finally(() => { if (active) setLoadingRecords(false) })
    return () => { active = false }
  }, [selectedPatientId])

  const selectedLink = allowedLinks.find((link) => link.patientId === selectedPatientId)
  const filtered = useMemo(() => filterRecords(records, searchTerm, recordType, fromDate, toDate), [records, searchTerm, recordType, fromDate, toDate])
  return <CareRecordPageFrame heading="Authorized patient care history" description="Choose a linked patient. Only patients who have granted care record access are available here.">
    {loadingLinks ? <p className="state-message">Loading your authorized patient links…</p> : allowedLinks.length === 0 ? <div className="notice notice--info">No linked patients have granted you care record access.</div> : <>
      <label className="care-record-patient-select"><span>Patient</span><select className="form-input" value={selectedPatientId} onChange={(event) => { setRecords([]); setSelectedPatientId(event.target.value) }}>{allowedLinks.map((link) => <option key={link.patientId} value={link.patientId}>{link.firstName} {link.lastName} · {link.relationship}</option>)}</select></label>
      <CareRecordFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} recordType={recordType} setRecordType={setRecordType} fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} />
      {selectedLink && <CareRecordSummary records={filtered} total={filtered.length} />}
      {error && <div className="notice notice--error" role="alert">{error}</div>}
      <CareRecordTimeline records={filtered} loading={loadingRecords} />
    </>}
  </CareRecordPageFrame>
}

function CareRecordPageFrame({ heading, description, children }: { heading: string; description: string; children: ReactNode }) {
  return <main className="care-record-history">
    <header className="care-record-history__header"><div><p className="eyebrow">Care record history</p><h1>{heading}</h1><p className="muted">{description}</p></div></header>
    {children}
  </main>
}

function CareRecordFilters({ searchTerm, setSearchTerm, recordType, setRecordType, fromDate, setFromDate, toDate, setToDate, onSubmit }: {
  searchTerm: string; setSearchTerm: (value: string) => void; recordType: string; setRecordType: (value: string) => void
  fromDate: string; setFromDate: (value: string) => void; toDate: string; setToDate: (value: string) => void; onSubmit?: (event: FormEvent) => void
}) {
  return <form className="care-record-filters" onSubmit={onSubmit ?? ((event) => event.preventDefault())}>
    <label className="form-field care-record-filters__search"><span>Search patient name or note</span><input className="form-input" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Name, symptom, action, or note text" /></label>
    <label className="form-field"><span>Record type</span><select className="form-input" value={recordType} onChange={(event) => setRecordType(event.target.value)}><option value="">All types</option>{Object.entries(recordTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="form-field"><span>From</span><input className="form-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
    <label className="form-field"><span>To</span><input className="form-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
    {onSubmit && <button className="primary-button" type="submit">Apply filters</button>}
  </form>
}

function CareRecordSummary({ records, total }: { records: PatientCareRecordDto[]; total: number }) {
  const conditionUpdates = records.filter((record) => record.recordType === 8).length
  const latest = records.reduce<string | null>((date, record) => !date || record.recordedAt > date ? record.recordedAt : date, null)
  return <section className="care-record-summary" aria-label="Care record overview">
    <article><span>Matching records</span><strong>{total}</strong></article>
    <article><span>Condition changes shown</span><strong>{conditionUpdates}</strong></article>
    <article><span>Latest entry in view</span><strong>{latest ? new Date(latest).toLocaleDateString() : '—'}</strong></article>
  </section>
}

function CareRecordTimeline({ records, loading }: { records: PatientCareRecordDto[]; loading: boolean }) {
  if (loading) return <p className="state-message">Loading care history…</p>
  if (records.length === 0) return <section className="care-record-empty"><h2>No care records match</h2><p>Try another patient, search term, record type, or date range.</p></section>
  const groups = records.reduce<Record<string, PatientCareRecordDto[]>>((result, record) => {
    const key = new Date(record.recordedAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    ;(result[key] ??= []).push(record)
    return result
  }, {})
  return <div className="care-record-timeline">{Object.entries(groups).map(([day, entries]) => <section className="care-record-timeline__day" key={day}>
    <h2>{day}</h2><ol>{entries.map((record) => <li className={`care-record-entry care-record-entry--${record.recordType === 8 ? 'condition' : record.recordType === 4 ? 'vitals' : 'standard'}`} key={record.id}>
      <div className="care-record-entry__top"><span className="care-record-entry__type">{recordTypes[record.recordType] ?? 'Care update'}{record.correctsRecordId && <span className="care-record-entry__correction">Correction</span>}</span><time dateTime={record.recordedAt}>{new Date(record.recordedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time></div>
      {(record.patientName || record.recordedByName) && <p className="care-record-entry__meta">{record.patientName && <strong>{record.patientName}</strong>}{record.patientName && record.recordedByName && ' · '}{record.recordedByName && `Recorded by ${record.recordedByName}`}</p>}
      <p className="care-record-entry__content">{record.content}</p>
      <span className="care-record-entry__admission">Admission · {record.admissionId.slice(0, 8)}</span>
    </li>)}</ol>
  </section>)}</div>
}

function CareRecordPagination({ page, total, pageSize, loading, onPage }: { page: number; total: number; pageSize: number; loading: boolean; onPage: (page: number) => void }) {
  if (total <= pageSize) return null
  return <nav className="care-record-pagination" aria-label="Care record pages"><span>{total} records · page {page} of {Math.ceil(total / pageSize)}</span><div><button className="secondary-button" type="button" disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>Previous</button><button className="secondary-button" type="button" disabled={loading || page * pageSize >= total} onClick={() => onPage(page + 1)}>Next</button></div></nav>
}

function filterRecords(records: PatientCareRecordDto[], term: string, type: string, from: string, to: string) {
  const normalized = term.trim().toLowerCase()
  const start = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
  const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY
  return records.filter((record) => {
    const timestamp = new Date(record.recordedAt).getTime()
    const matchesTerm = !normalized || `${record.patientName ?? ''} ${record.content} ${recordTypes[record.recordType] ?? ''}`.toLowerCase().includes(normalized)
    return matchesTerm && (!type || record.recordType === Number(type)) && timestamp >= start && timestamp <= end
  }).sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
}
