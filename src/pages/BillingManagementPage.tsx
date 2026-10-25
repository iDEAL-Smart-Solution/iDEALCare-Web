import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import axios from 'axios'
import { billingApi, type BillingInvoice, type BillingMedicalItem } from '../api/billingApi'
import { patientApi } from '../api/patientApi'
import type { PatientSummaryDto } from '../types/patient'

type BillKind = 'nursing' | 'extension' | 'item'
const money = (amount: number) => `₦${amount.toLocaleString()}`
const dateValue = (value: string) => value ? `${value}T00:00:00` : undefined

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: string[] } | undefined
    return data?.errors?.join(' ') || data?.message || 'The billing request could not be completed.'
  }
  return 'The billing request could not be completed.'
}

function PatientPicker({
  patients,
  selectedPatientId,
  onSelect,
  loading,
}: {
  patients: PatientSummaryDto[]
  selectedPatientId: string
  onSelect: (patientId: string) => void
  loading: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matchingPatients = normalizedQuery
    ? patients.filter((patient) => [patient.fullName, patient.phoneNumber, patient.email]
      .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)))
    : patients

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  function choosePatient(patientId: string) {
    onSelect(patientId)
    setQuery('')
    setOpen(false)
  }

  return <div className="billing-admin__patient-picker" ref={rootRef}>
    <span className="billing-admin__patient-label">Select patient</span>
    <button
      type="button"
      className="billing-admin__patient-trigger"
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={() => setOpen((isOpen) => !isOpen)}
      disabled={loading || !patients.length}
    >
      <span>{loading ? 'Loading patients…' : selectedPatient?.fullName ?? 'Choose patient'}</span>
      <span className="billing-admin__patient-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="billing-admin__patient-dropdown">
      <label className="billing-admin__patient-search">
        <span className="sr-only">Search patients by name, phone, or email</span>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}
          placeholder="Search patients…"
          aria-label="Search patients by name, phone, or email"
        />
      </label>
      <div className="billing-admin__patient-options" role="listbox" aria-label="Patients">
        {matchingPatients.length ? matchingPatients.map((patient) => <button
          type="button"
          role="option"
          aria-selected={patient.id === selectedPatientId}
          className={patient.id === selectedPatientId ? 'billing-admin__patient-option billing-admin__patient-option--selected' : 'billing-admin__patient-option'}
          key={patient.id}
          onClick={() => choosePatient(patient.id)}
        >
          <span>{patient.fullName}</span>
          <small>{patient.phoneNumber || patient.email || (patient.status === 6 ? 'Active' : `Status ${patient.status}`)}</small>
        </button>) : <p className="billing-admin__patient-empty">No patients match “{query}”.</p>}
      </div>
      <small className="billing-admin__patient-count">Showing {matchingPatients.length} of {patients.length} patients</small>
    </div>}
  </div>
}

export default function BillingManagementPage() {
  const [patients, setPatients] = useState<PatientSummaryDto[]>([])
  const [patientId, setPatientId] = useState('')
  const [kind, setKind] = useState<BillKind>('nursing')
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [items, setItems] = useState<BillingMedicalItem[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loadingBills, setLoadingBills] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState('')
  const [deposit, setDeposit] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [originalInvoiceId, setOriginalInvoiceId] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemPrice, setItemPrice] = useState('')

  useEffect(() => {
    async function loadPatients() {
      const first = await patientApi.list(1, 100)
      const allPatients = [...first.items]
      for (let page = 2; allPatients.length < first.totalCount; page += 1) {
        const nextPage = await patientApi.list(page, 100)
        allPatients.push(...nextPage.items)
        if (!nextPage.items.length) break
      }
      setPatients(allPatients)
      if (allPatients.length) setPatientId(allPatients[0].id)
    }
    void loadPatients().catch((requestError: unknown) => setError(errorMessage(requestError)))
      .finally(() => setLoadingPatients(false))
  }, [])

  useEffect(() => {
    if (!patientId) { setInvoices([]); setItems([]); return }
    let active = true
    setLoadingBills(true); setError(null)
    Promise.all([billingApi.listInvoices(patientId), billingApi.listMedicalItems(patientId)])
      .then(([patientInvoices, patientItems]) => {
        if (!active) return
        setInvoices(patientInvoices); setItems(patientItems)
      })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) setLoadingBills(false) })
    return () => { active = false }
  }, [patientId])

  const nursingInvoices = useMemo(() => invoices.filter((invoice) => invoice.invoiceType === 2), [invoices])
  const originalInvoices = useMemo(() => nursingInvoices.filter((invoice) => !invoice.originalInvoiceId), [nursingInvoices])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!patientId) return
    setSaving(true); setError(null); setNotice(null)
    try {
      if (kind === 'nursing') {
        const amount = Number(totalAmount); const requiredDeposit = deposit ? Number(deposit) : undefined
        if (!(amount > 0) || (requiredDeposit !== undefined && (requiredDeposit <= 0 || requiredDeposit > amount))) {
          setError('Enter a positive total and a deposit no greater than that total.'); return
        }
        await billingApi.createNursingCareBill(patientId, {
          patientId, totalAmount: amount, requiredDeposit, carePeriodStart: dateValue(periodStart),
          carePeriodEnd: dateValue(periodEnd), paymentDeadline: dateValue(deadline), notes: notes.trim() || undefined,
        })
        setNotice('Nursing-care bill issued. The patient can now see the balance and pay toward it.')
      } else if (kind === 'extension') {
        const amount = Number(totalAmount); const requiredDeposit = deposit ? Number(deposit) : undefined
        if (!originalInvoiceId || !(amount > 0) || !periodStart || !periodEnd || periodEnd <= periodStart || (requiredDeposit !== undefined && (requiredDeposit <= 0 || requiredDeposit > amount))) {
          setError('Choose an original nursing-care bill, a positive total, a valid extension period, and a deposit no greater than the total.'); return
        }
        await billingApi.createExtension(patientId, originalInvoiceId, {
          originalInvoiceId, totalAmount: amount, requiredDeposit,
          extensionPeriodStart: dateValue(periodStart)!, extensionPeriodEnd: dateValue(periodEnd)!,
          paymentDeadline: dateValue(deadline), notes: notes.trim() || undefined,
        })
        setNotice('Nursing-care extension bill issued.')
      } else {
        const price = Number(itemPrice)
        if (!itemName.trim() || !(price > 0)) { setError('Enter a name and a price greater than zero for this medical item.'); return }
        await billingApi.createMedicalItem(patientId, { patientId, name: itemName.trim(), description: itemDescription.trim() || undefined, price })
        setNotice('Medical item charge added. This item must be paid in full before supply.')
      }
      setTotalAmount(''); setDeposit(''); setPeriodStart(''); setPeriodEnd(''); setDeadline(''); setNotes('')
      setOriginalInvoiceId(''); setItemName(''); setItemDescription(''); setItemPrice('')
      const [nextInvoices, nextItems] = await Promise.all([billingApi.listInvoices(patientId), billingApi.listMedicalItems(patientId)])
      setInvoices(nextInvoices); setItems(nextItems)
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setSaving(false) }
  }

  const patient = patients.find((item) => item.id === patientId)
  return <section className="billing-admin-page">
    <header className="patients-page__header"><div><p className="eyebrow">Patient accounts</p><h2>Billing management</h2><p className="muted">Issue care bills, extensions, and patient-specific medical item charges.</p></div></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {notice && <div className="notice notice--success" role="status">{notice}</div>}
    <section className="billing-admin__panel">
      <div className="billing-admin__patient"><PatientPicker patients={patients} selectedPatientId={patientId} onSelect={setPatientId} loading={loadingPatients} /></div>
      <div className="billing-admin__overview"><div><span>Selected patient</span><strong>{patient?.fullName ?? 'Select a patient'}</strong></div><div><span>Care bills</span><strong>{nursingInvoices.length}</strong></div><div><span>Medical items</span><strong>{items.length}</strong></div></div>
    </section>

    <div className="billing-admin__grid">
      <section className="billing-admin__panel">
        <div className="billing-admin__heading"><div><p className="eyebrow">Create charge</p><h3>Issue a patient bill</h3></div></div>
        <div className="billing-admin__categories" role="tablist" aria-label="Bill category">
          {([['nursing', 'Nursing care'], ['extension', 'Care extension'], ['item', 'Medical item']] as [BillKind, string][]).map(([value, label]) => <button type="button" role="tab" aria-selected={kind === value} className={kind === value ? 'billing-admin__category billing-admin__category--active' : 'billing-admin__category'} key={value} onClick={() => { setKind(value); setError(null) }}>{label}</button>)}
        </div>
        <form className="billing-admin__form" onSubmit={submit}>
          {kind === 'item' ? <>
            <Field label="Item name" value={itemName} onChange={setItemName} required maxLength={200} placeholder="e.g. Prescribed medication" />
            <Field label="Description" value={itemDescription} onChange={setItemDescription} maxLength={500} placeholder="Optional details" />
            <Field label="Full item price (₦)" value={itemPrice} onChange={setItemPrice} type="number" min="0.01" step="0.01" required />
            <p className="billing-admin__hint">Each medical item is its own charge and must be paid in full before it can be supplied. No deposit or partial item payments.</p>
          </> : <>
            {kind === 'extension' && <label className="form-field"><span>Original nursing-care bill *</span><select className="form-input" value={originalInvoiceId} onChange={(event) => setOriginalInvoiceId(event.target.value)} required><option value="">Choose an original bill</option>{originalInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{money(invoice.totalAmount)} · issued {new Date(invoice.createdAt).toLocaleDateString()} {invoice.notes ? `· ${invoice.notes}` : ''}</option>)}</select></label>}
            <Field label="Total care charge (₦)" value={totalAmount} onChange={setTotalAmount} type="number" min="0.01" step="0.01" required />
            <Field label="Required deposit (₦)" value={deposit} onChange={setDeposit} type="number" min="0.01" step="0.01" hint="Optional. Leave blank when the full amount is due upfront." />
            <div className="billing-admin__date-grid"><Field label={kind === 'extension' ? 'Extension starts' : 'Care period starts'} value={periodStart} onChange={setPeriodStart} type="date" required={kind === 'extension'} /><Field label={kind === 'extension' ? 'Extension ends' : 'Care period ends'} value={periodEnd} onChange={setPeriodEnd} type="date" required={kind === 'extension'} /></div>
            <Field label="Payment deadline" value={deadline} onChange={setDeadline} type="date" />
            <label className="form-field"><span>Bill notes</span><textarea className="form-input form-textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Care terms or additional details" /></label>
            <p className="billing-admin__hint">Refundability follows the tenant’s configured nursing-care policy. A deposit is a minimum upfront payment; the remaining balance can be paid in multiple payments.</p>
          </>}
          <button className="primary-button" type="submit" disabled={saving || !patientId || (kind === 'extension' && !originalInvoices.length)}>{saving ? 'Issuing…' : kind === 'item' ? 'Add medical item charge' : kind === 'extension' ? 'Issue extension bill' : 'Issue nursing-care bill'}</button>
          {kind === 'extension' && !originalInvoices.length && <p className="billing-admin__hint">This patient has no original nursing-care bill to extend yet.</p>}
        </form>
      </section>

      <section className="billing-admin__panel billing-admin__history">
        <div className="billing-admin__heading"><div><p className="eyebrow">Account activity</p><h3>Existing charges</h3></div><button type="button" className="secondary-button" onClick={() => { if (patientId) { setLoadingBills(true); Promise.all([billingApi.listInvoices(patientId), billingApi.listMedicalItems(patientId)]).then(([a,b]) => { setInvoices(a); setItems(b); setError(null) }).catch((e: unknown) => setError(errorMessage(e))).finally(() => setLoadingBills(false)) } }} disabled={loadingBills || !patientId}>Refresh</button></div>
        {loadingBills ? <p className="muted">Loading this patient’s bills…</p> : !patientId ? <p className="muted">Select a patient to see their bills.</p> : !invoices.length && !items.length ? <p className="muted">No bills or medical items have been issued for this patient.</p> : <div className="billing-admin__table-wrap"><table className="billing-admin__table"><thead><tr><th>Category</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Issued</th></tr></thead><tbody>
          {invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.invoiceType === 3 ? 'Care extension' : invoice.invoiceType === 1 ? 'Registration fee' : 'Nursing care'}</strong><small>{invoice.items?.map((line) => line.description).join(', ') || invoice.notes || '—'}{invoice.requiredDeposit ? ` · Deposit ${money(invoice.requiredDeposit)}` : ''}{invoice.paymentDeadline ? ` · Due ${new Date(invoice.paymentDeadline).toLocaleDateString()}` : ''}</small></td><td>{money(invoice.totalAmount)}</td><td>{money(invoice.amountPaid)}</td><td>{money(invoice.outstandingAmount)}</td><td>{invoice.status === 3 ? 'Paid' : invoice.status === 2 ? 'Partially paid' : invoice.status === 5 ? 'Cancelled' : 'Unpaid'}</td><td>{new Date(invoice.createdAt).toLocaleDateString()}</td></tr>)}
          {items.map((item) => <tr key={item.id}><td><strong>Medical item</strong><small>{item.name}{item.description ? ` · ${item.description}` : ''}</small></td><td>{money(item.price)}</td><td>{item.status === 1 || item.status === 4 ? money(0) : money(item.price)}</td><td>{item.status === 1 ? money(item.price) : money(0)}</td><td>{item.status === 1 ? 'Unpaid' : item.status === 4 ? 'Cancelled' : item.status === 3 ? 'Supplied' : 'Paid'}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td></tr>)}
        </tbody></table></div>}
      </section>
    </div>
    <p className="billing-admin__registration-note">Registration fees are created automatically from the tenant’s configured fee after a patient is accepted; they are non-refundable.</p>
  </section>
}

function Field({ label, value, onChange, type = 'text', required = false, min, step, maxLength, placeholder, hint }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string; step?: string; maxLength?: number; placeholder?: string; hint?: string }) {
  return <label className="form-field"><span>{label}{required ? ' *' : ''}</span><input className="form-input" type={type} value={value} required={required} min={min} step={step} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{hint && <small className="billing-admin__hint">{hint}</small>}</label>
}
