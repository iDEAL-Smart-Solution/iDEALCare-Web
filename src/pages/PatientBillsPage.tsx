import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import type { MedicalItemDto, PatientDto, RegistrationInvoiceDto } from '../types/patient'

type BillFilter = 'all' | 'unpaid' | 'paid'
type BillRow = {
  id: string
  kind: 'invoice' | 'medical'
  category: string
  description: string
  total: number
  paid: number
  balance: number
  status: string
  installmentAllowed: boolean
  minimumPayment: number
  deadline?: string | null
  createdAt: string
  source: RegistrationInvoiceDto | MedicalItemDto
}

const currency = (amount: number) => `₦${amount.toLocaleString()}`

function invoiceCategory(type: number) {
  if (type === 1) return 'Registration fee'
  if (type === 2) return 'Nursing care'
  if (type === 3) return 'Nursing care extension'
  return 'Patient bill'
}

export default function PatientBillsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<PatientDto | null>(null)
  const [invoices, setInvoices] = useState<RegistrationInvoiceDto[]>([])
  const [medicalItems, setMedicalItems] = useState<MedicalItemDto[]>([])
  const [filter, setFilter] = useState<BillFilter>('all')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const me = await patientApi.getMe()
      setPatient(me)
      const [invoiceResult, itemResult] = await Promise.allSettled([
        patientApi.getInvoices(me.id),
        patientApi.getMedicalItems(me.id),
      ])
      setInvoices(invoiceResult.status === 'fulfilled' ? invoiceResult.value : [])
      setMedicalItems(itemResult.status === 'fulfilled' ? itemResult.value : [])
      if (invoiceResult.status === 'rejected' && itemResult.status === 'rejected') {
        setNotice({ kind: 'error', text: 'Bills could not be loaded. Please refresh the page.' })
      }
    } catch {
      setNotice({ kind: 'error', text: 'Patient billing information could not be loaded.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const reference = params.get('reference') || params.get('trxref')
    if (!reference) {
      void load()
      return
    }
    setVerifying(true)
    patientApi.verifyPayment(reference)
      .then((result) => setNotice(result.status === 2
        ? { kind: 'success', text: 'Payment confirmed successfully.' }
        : { kind: 'info', text: result.status === 1 ? 'Payment is processing. Refresh in a moment.' : 'Payment was not completed. You can try again.' }))
      .catch((err: unknown) => {
        const message = axios.isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined
        setNotice({ kind: 'error', text: message ?? 'We could not verify this payment. Refresh or try again.' })
      })
      .finally(() => {
        setVerifying(false)
        navigate('/app/bills', { replace: true })
        void load()
      })
  }, [location.search])

  const rows = useMemo<BillRow[]>(() => {
    const now = Date.now()
    const invoiceRows: BillRow[] = invoices.map((invoice) => {
      const overdue = invoice.status !== 3 && invoice.paymentDeadline && new Date(invoice.paymentDeadline).getTime() < now
      return {
        id: invoice.id,
        kind: 'invoice',
        category: invoiceCategory(invoice.invoiceType),
        description: invoice.items?.map((item) => item.description).filter(Boolean).join(', ') || invoice.notes || invoiceCategory(invoice.invoiceType),
        total: invoice.totalAmount,
        paid: invoice.status === 5 ? 0 : invoice.amountPaid,
        balance: invoice.status === 5 ? 0 : invoice.outstandingAmount,
        status: invoice.status === 3 ? 'Paid' : invoice.status === 5 ? 'Cancelled' : overdue ? 'Overdue' : invoice.status === 2 ? 'Partially paid' : 'Unpaid',
        installmentAllowed: (invoice.invoiceType === 2 || invoice.invoiceType === 3)
          && invoice.requiredDeposit != null && invoice.requiredDeposit > 0 && invoice.requiredDeposit < invoice.totalAmount,
        minimumPayment: invoice.status === 1 && invoice.requiredDeposit != null ? invoice.requiredDeposit : 0.01,
        deadline: invoice.paymentDeadline,
        createdAt: invoice.createdAt,
        source: invoice,
      }
    })
    const medicalRows: BillRow[] = medicalItems.map((item) => ({
      id: item.id,
      kind: 'medical',
      category: 'Medical item',
      description: [item.name, item.description].filter(Boolean).join(' · '),
      total: item.price,
      paid: item.status === 2 || item.status === 3 ? item.price : 0,
      balance: item.status === 1 ? item.price : 0,
      status: item.status === 1 ? 'Unpaid' : item.status === 4 ? 'Cancelled' : item.status === 3 ? 'Supplied' : 'Paid',
      installmentAllowed: false,
      minimumPayment: item.price,
      createdAt: item.createdAt,
      source: item,
    }))
    return [...invoiceRows, ...medicalRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [invoices, medicalItems])

  const visibleRows = rows.filter((row) => filter === 'all' || (filter === 'unpaid' ? row.balance > 0 : row.balance === 0 && row.status !== 'Cancelled'))
  const totalOutstanding = rows.reduce((sum, row) => sum + row.balance, 0)
  const totalPaid = rows.reduce((sum, row) => sum + row.paid, 0)

  async function pay(row: BillRow, selectedAmount = row.balance) {
    if (!patient || row.balance <= 0) return
    if (selectedAmount < row.minimumPayment || selectedAmount > row.balance) {
      setNotice({ kind: 'error', text: `Choose an amount between ${currency(row.minimumPayment)} and ${currency(row.balance)}.` })
      return
    }
    setPayingId(row.id)
    setNotice(null)
    try {
      const callbackUrl = `${window.location.origin}/app/bills`
      const response = row.kind === 'invoice'
        ? await patientApi.payInvoice(patient.id, row.id, selectedAmount, callbackUrl)
        : await patientApi.payMedicalItem(patient.id, row.id, row.total, callbackUrl)
      if (response.authorizationUrl) window.location.href = response.authorizationUrl
      else {
        setNotice({ kind: 'success', text: 'Payment initiated successfully.' })
        await load()
      }
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined
      setNotice({ kind: 'error', text: message ?? 'Could not start payment. Please try again.' })
    } finally {
      setPayingId(null)
    }
  }

  const statusText = patient?.status === 1 ? 'Your registration is under review.'
    : patient?.status === 2 ? patient.informationRequest || 'The care provider has requested more information.'
      : patient?.status === 3 || patient?.status === 5 ? 'Your registration is approved. The care team can complete your admission when you arrive.'
        : patient?.status === 4 ? 'Your registration is approved and the registration fee is now due.'
          : patient?.status === 7 ? patient.registrationReviewReason || 'Your registration was not accepted. Contact your care provider for more information.'
            : patient?.status === 6 ? 'Your admission is active.' : null

  return (
    <div className="patient-portal patient-bills">
      <header className="patient-portal__header">
        <div><span className="eyebrow">Patient portal</span><h2>Bills &amp; Payments</h2><p className="muted">Review all charges, payment status, and deadlines from your care provider.</p></div>
        <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh bills'}</button>
      </header>

      {verifying && <div className="notice notice--info" role="status">Confirming your payment…</div>}
      {notice && <div className={`notice notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</div>}
      {patient && patient.status !== 6 && statusText && <section className={`patient-bills__registration patient-bills__registration--${patient.status === 7 ? 'warning' : 'info'}`}>
        <div><span className="eyebrow">Registration status · {({ 1: 'Under review', 2: 'Information requested', 3: 'Approved', 4: 'Payment due', 5: 'Ready for admission', 7: 'Declined' } as Record<number, string>)[patient.status] ?? 'In progress'}</span><p>{statusText}</p></div>
        {patient.status === 2 && <Link className="secondary-button" to="/app/onboarding/information">Respond to request</Link>}
      </section>}

      <section className="patient-bills__totals" aria-label="Billing totals">
        <article><span>Total outstanding</span><strong>{currency(totalOutstanding)}</strong></article>
        <article><span>Total paid</span><strong>{currency(totalPaid)}</strong></article>
        <article><span>Charges</span><strong>{rows.length}</strong></article>
      </section>

      <section className="patient-bills__list">
        <div className="patient-bills__list-heading"><div><span className="eyebrow">Account activity</span><h3>All bills</h3></div>
          <div className="patient-bills__filters" role="group" aria-label="Filter bills">
            {(['all', 'unpaid', 'paid'] as const).map((option) => <button type="button" key={option} className={filter === option ? 'patient-bills__filter patient-bills__filter--active' : 'patient-bills__filter'} onClick={() => setFilter(option)}>{option === 'all' ? 'All' : option === 'unpaid' ? 'Unpaid' : 'Paid'}</button>)}
          </div>
        </div>
        {loading ? <p className="state-message">Loading bills…</p> : visibleRows.length === 0 ? <p className="patient-bills__empty">{filter === 'all' ? 'No bills have been issued yet.' : `No ${filter} bills.`}</p> : (
          <div className="patient-bills__table-wrap"><table className="patient-bills__table">
            <thead><tr><th>Bill</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
            <tbody>{visibleRows.map((row) => <tr key={`${row.kind}-${row.id}`}>
              <td><strong>{row.category}</strong><span>{row.description}</span><small>Issued {new Date(row.createdAt).toLocaleDateString()}</small></td>
              <td>{currency(row.total)}</td><td>{currency(row.paid)}</td><td className={row.balance > 0 ? 'patient-bills__balance' : ''}>{currency(row.balance)}</td>
              <td>{row.deadline ? new Date(row.deadline).toLocaleDateString() : '—'}</td>
              <td><span className={`patient-bills__status patient-bills__status--${row.status.toLowerCase().replaceAll(' ', '-')}`}>{row.status}</span></td>
              <td>{row.balance > 0 && (row.installmentAllowed ? <div className="patient-bills__installment"><label><span>Pay amount (₦)</span><input aria-label={`Amount to pay for ${row.category}`} type="number" min={row.minimumPayment} max={row.balance} step="0.01" value={paymentAmounts[row.id] ?? row.balance.toFixed(2)} onChange={(event) => setPaymentAmounts({ ...paymentAmounts, [row.id]: event.target.value })} disabled={payingId !== null} /></label><button type="button" className="primary-button patient-bills__pay" onClick={() => void pay(row, Number(paymentAmounts[row.id] ?? row.balance))} disabled={payingId !== null}>{payingId === row.id ? 'Opening…' : 'Pay selected amount'}</button><small>{row.status === 'Unpaid' ? `Minimum first payment: ${currency(row.minimumPayment)}` : 'Choose any amount up to the remaining balance.'}</small></div> : <button type="button" className="primary-button patient-bills__pay" onClick={() => void pay(row)} disabled={payingId !== null}>{payingId === row.id ? 'Opening…' : row.kind === 'medical' ? `Pay ${currency(row.total)} once` : `Pay ${currency(row.balance)}`}</button>)}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
      <p className="patient-bills__payment-note">Medical items must be paid in full in one payment. Nursing care balances can be paid according to the bill terms.</p>
    </div>
  )
}
