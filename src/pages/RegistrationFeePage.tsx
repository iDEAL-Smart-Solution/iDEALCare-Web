import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import { useAuthStore } from '../stores/authStore'
import type { PatientDto, RegistrationInvoiceDto } from '../types/patient'

const statusLabels: Record<number, string> = {
  1: 'Pending Review',
  2: 'Awaiting Information',
  3: 'Awaiting admission',
  4: 'Awaiting Registration Payment',
  5: 'Awaiting Admission',
  6: 'Active',
  7: 'Rejected',
  8: 'Discharged',
  9: 'Terminated',
}

export default function RegistrationFeePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const tenantDomain = useAuthStore((state) => state.tenant?.domain)

  const [patient, setPatient] = useState<PatientDto | null>(null)
  const [invoices, setInvoices] = useState<RegistrationInvoiceDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [paySuccess, setPaySuccess] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [capacityFull, setCapacityFull] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const me = await patientApi.getMe()
      setPatient(me)
      if (tenantDomain) {
        try { setCapacityFull((await patientApi.registrationCapacity(tenantDomain)).isFull) }
        catch { setCapacityFull(false) }
      }

      if (me?.id) {
        try {
          const invs = await patientApi.getInvoices(me.id)
          setInvoices(invs)
        } catch {
          // If no billing access or no invoices yet, invoices remain empty
          setInvoices([])
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          setError('No patient profile linked to this account.')
        } else {
          setError('Failed to load patient registration information.')
        }
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle Paystack callback reference in URL query params if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const reference = searchParams.get('reference') || searchParams.get('trxref')

    if (reference) {
      setVerifying(true)
      patientApi
        .verifyPayment(reference)
        .then((verification) => {
          if (verification.status === 2) {
            setPaySuccess('Payment verified successfully! Welcome to iDEAL Care.')
            setPayError(null)
          } else {
            setPaySuccess(null)
            setPayError(verification.status === 1
              ? 'Payment is still processing. Refresh the status in a moment.'
              : 'The payment was not completed. You can try again when ready.')
          }
          // Remove query params from URL
          navigate('/app/registration-fee', { replace: true })
          loadData()
        })
        .catch((verificationError: unknown) => {
          const message = axios.isAxiosError(verificationError)
            ? (verificationError.response?.data as { message?: string } | undefined)?.message
            : undefined
          setPaySuccess(null)
          setPayError(message ?? 'We could not verify this payment. Refresh the status or try again.')
          navigate('/app/registration-fee', { replace: true })
          // Even if webhook already handled it, refresh patient data
          loadData()
        })
        .finally(() => {
          setVerifying(false)
        })
    } else {
      loadData()
    }
  }, [location.search])

  useEffect(() => {
    let active = true
    const domain = tenantDomain?.trim() || window.location.hostname
    const refreshCapacity = () => patientApi.registrationCapacity(domain)
      .then((capacity) => { if (active) setCapacityFull(capacity.isFull) })
      .catch(() => { if (active) setCapacityFull(false) })
    void refreshCapacity()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshCapacity() }, 15000)
    return () => { active = false; window.clearInterval(timer) }
  }, [tenantDomain])

  async function handlePay(invoice: RegistrationInvoiceDto) {
    if (!patient) return
    setPaying(true)
    setPayError(null)

    try {
      const callbackUrl = window.location.origin + '/app/registration-fee'
      const paymentResponse = await patientApi.payInvoice(
        patient.id,
        invoice.id,
        invoice.outstandingAmount,
        callbackUrl
      )

      if (paymentResponse.authorizationUrl) {
        window.location.href = paymentResponse.authorizationUrl
      } else {
        setPaySuccess('Payment recorded successfully.')
        await loadData()
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { message?: string })?.message
        setPayError(message ?? 'Failed to initiate payment. Please try again.')
      } else {
        setPayError('Unable to process payment.')
      }
    } finally {
      setPaying(false)
    }
  }

  // Active registration invoice is an invoice of type 1 (Registration) or any unpaid invoice
  const regInvoice = invoices.find((i) => i.invoiceType === 1) ?? invoices[0]

  return (
    <div className="reg-fee-page">
      <div className="reg-fee-page__header">
        <div>
          <span className="eyebrow">Patient Portal</span>
          <h2 className="reg-fee-page__title">Registration & Onboarding</h2>
          <p className="muted">Track your registration status, fee payment, and clinical intake progress.</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : '↻ Refresh Status'}
        </button>
      </div>

      {verifying && (
        <div className="notice notice--info" role="status">
          Verifying your registration payment with payment gateway…
        </div>
      )}

      {error && (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      )}

      {paySuccess && (
        <div className="notice notice--success" role="status">
          {paySuccess}
        </div>
      )}

      {loading ? (
        <div className="state-message">Loading your registration details…</div>
      ) : !patient ? (
        <div className="reg-fee-card">
          <p className="state-message">No patient record found for your user account.</p>
        </div>
      ) : (
        <>
          {/* Stepper */}
          <div className="stepper-wrap" aria-label="Registration stages">
            <div className={`step-item ${patient.status >= 1 ? 'step-item--done' : ''}`}>
              <div className="step-circle">1</div>
              <span className="step-label">Application</span>
            </div>
            <div
              className={`step-item ${
                patient.status === 1
                  ? 'step-item--active'
                  : patient.status > 1 && patient.status !== 7
                  ? 'step-item--done'
                  : ''
              }`}
            >
              <div className="step-circle">2</div>
              <span className="step-label">Clinical Review</span>
            </div>
            <div
              className={`step-item ${
                patient.status === 4
                  ? 'step-item--active'
                  : patient.status === 3 || patient.status === 5 || patient.status === 6
                  ? 'step-item--done'
                  : ''
              }`}
            >
              <div className="step-circle">3</div>
              <span className="step-label">Registration Fee</span>
            </div>
            <div
                  className={`step-item ${
                    patient.status === 3 || patient.status === 5
                  ? 'step-item--active'
                  : patient.status === 6
                  ? 'step-item--done'
                  : ''
              }`}
            >
              <div className="step-circle">4</div>
              <span className="step-label">Admission</span>
            </div>
          </div>

          {/* Status Section */}
          <div className="reg-status-card">
            <div className="status-header">
              <div>
                <h3 className="patient-name">
                  {patient.firstName} {patient.lastName}
                </h3>
                <span className="patient-meta">
                  Age: {patient.age}{patient.dateOfBirth ? ` · DOB: ${patient.dateOfBirth}` : ''} · Care Location:{' '}
                  {patient.careLocationType === 2 ? 'Home Care' : 'Clinic / Facility'}
                </span>
              </div>
              <span
                className={`status-pill ${
                  patient.status === 1
                    ? 'status-pill--pending'
                    : patient.status === 4
                    ? 'status-pill--payment'
                    : patient.status === 3 || patient.status === 6
                    ? 'status-pill--success'
                    : 'status-pill--neutral'
                }`}
              >
                {statusLabels[patient.status] ?? 'Under Review'}
              </span>
            </div>

            {/* Dynamic Status Content */}
            {patient.status === 1 && (
              <div className="status-explanation status-explanation--review">
                <div className="explanation-icon" aria-hidden="true">⏳</div>
                <div>
                  <h4>Application Under Review</h4>
                  <p>
                    Thank you for registering with iDEAL Care. Your details have been submitted and are
                    currently undergoing clinical review by our medical intake team.
                  </p>
                  <p className="muted" style={{ marginTop: '6px' }}>
                    Once our clinical team completes the review, you will receive confirmation and your
                    registration fee payment request will be unlocked.
                  </p>
                </div>
              </div>
            )}

            {patient.status === 2 && (
              <div className="status-explanation status-explanation--info">
                <div className="explanation-icon" aria-hidden="true">ℹ</div>
                <div>
                  <h4>Additional Information Requested</h4>
                  <p>
                    Our clinical team has reviewed your application and requested additional details or
                    medical documentation before approving your registration.
                  </p>
                  <p className="muted" style={{ marginTop: '6px' }}>{patient.informationRequest || 'Please review the clinic request, provide the requested details to the clinic, and resubmit your registration.'}</p>
                  <Link className="primary-button" to="/app/onboarding/information">Provide information and resubmit</Link>
                </div>
              </div>
            )}

            {patient.status === 4 && (
              <div className="payment-box">
                <div className="payment-box__header">
                  <div>
                    <h4>Registration Fee Required</h4>
                    <p className="muted">
                      Your registration has been approved. Please pay the registration fee to finalize
                      your enrollment and proceed to physical assessment.
                    </p>
                  </div>
                </div>

                {capacityFull && <div className="notice notice--error" role="alert">The clinic has filled its registration capacity. Do not attempt to pay. The clinic has been notified and will contact you about next steps.</div>}

                {payError && (
                  <div className="notice notice--error" role="alert" style={{ margin: '14px 0' }}>
                    {payError}
                  </div>
                )}

                {regInvoice ? regInvoice.status === 5 ? (
                  <div className="notice notice--error" role="alert">This registration invoice has been closed because the clinic has no remaining capacity. Do not attempt to pay. Contact the clinic for further information.</div>
                ) : (
                  <div className="invoice-summary">
                    <div className="invoice-row">
                      <span>Fee Description:</span>
                      <strong>Patient Registration Fee</strong>
                    </div>
                    <div className="invoice-row">
                      <span>Total Amount:</span>
                      <strong>₦{regInvoice.totalAmount.toLocaleString()}</strong>
                    </div>
                    <div className="invoice-row">
                      <span>Amount Paid:</span>
                      <span>₦{regInvoice.amountPaid.toLocaleString()}</span>
                    </div>
                    <div className="invoice-row invoice-row--total">
                      <span>Outstanding Balance:</span>
                      <strong className="outstanding-amount">
                        ₦{regInvoice.outstandingAmount.toLocaleString()}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="primary-button btn-pay"
                      onClick={() => handlePay(regInvoice)}
                      disabled={paying || capacityFull}
                    >
                      {paying ? 'Connecting to Paystack…' : `Pay ₦${regInvoice.outstandingAmount.toLocaleString()}`}
                    </button>
                  </div>
                ) : (
                  <div className="state-message">
                    Generating registration fee invoice… Please click "Refresh Status" in a moment.
                  </div>
                )}
              </div>
            )}

            {(patient.status === 3 || patient.status === 5 || patient.status === 6) && (
              <div className="status-explanation status-explanation--success">
                <div className="explanation-icon" aria-hidden="true">✓</div>
                <div>
                  <h4>{patient.status === 5 ? 'Registration approved — ready for admission' : patient.status === 6 ? 'You are admitted to care' : 'Registration approved — ready for admission'}</h4>
                  <p>{patient.status === 6 ? 'Your admission is active. Contact your care team for next steps.' : 'Your registration has been approved and any required fee is paid. The care team can admit you when you arrive. Medical assessments are recorded separately during your visit.'}</p>
                  {regInvoice && regInvoice.amountPaid > 0 && (
                    <div className="receipt-details">
                      <span>Receipt: ₦{regInvoice.amountPaid.toLocaleString()} Paid</span>
                      <span className="muted">Invoice #{regInvoice.id.slice(0, 8)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {patient.status === 7 && (
              <div className="status-explanation status-explanation--error">
                <div className="explanation-icon" aria-hidden="true">✕</div>
                <div>
                  <h4>Registration Declined</h4>
                  <p>
                    {patient.registrationReviewReason || 'Unfortunately, your registration could not be accepted at this time.'}
                  </p>
                  <p className="muted">Contact the clinic if you need clarification or would like to discuss this decision.</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
