import { useEffect, useState } from 'react'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import { careServiceApi } from '../api/careServiceApi'
import type { CareServiceCatalogItem } from '../types/careService'
import type { PatientSummaryDto } from '../types/patient'

const sexLabels: Record<number, string> = {
  1: 'Male',
  2: 'Female',
  3: 'Other',
  4: 'Not provided',
}

export default function RegistrationReviewPage() {
  const [pending, setPending] = useState<PatientSummaryDto[]>([])
  const [services, setServices] = useState<CareServiceCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Review modal state
  const [selectedPatient, setSelectedPatient] = useState<PatientSummaryDto | null>(null)
  const [decision, setDecision] = useState<'Approve' | 'Reject' | 'RequestInfo' | null>(null)
  const [reason, setReason] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function loadPending() {
    setLoading(true)
    setError(null)
    try {
      const data = await patientApi.listPendingReview()
      setPending(data)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403) {
          setError('You do not have permission to review registrations.')
        } else {
          setError('Failed to load pending registrations. Please try again.')
        }
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
    careServiceApi
      .getCatalog()
      .then(setServices)
      .catch(() => setServices([]))
  }, [])

  function openReview(patient: PatientSummaryDto, defaultDecision: 'Approve' | 'Reject' | 'RequestInfo') {
    setSelectedPatient(patient)
    setDecision(defaultDecision)
    setReason('')
    setActionError(null)
  }

  function closeReview() {
    setSelectedPatient(null)
    setDecision(null)
    setReason('')
    setActionError(null)
  }

  async function handleConfirmReview() {
    if (!selectedPatient || !decision) return
    if ((decision === 'Reject' || decision === 'RequestInfo') && !reason.trim()) {
      setActionError(`Please provide a reason when selecting ${decision === 'Reject' ? 'Reject' : 'Request Information'}.`)
      return
    }

    setSubmittingReview(true)
    setActionError(null)
    try {
      await patientApi.reviewRegistration(selectedPatient.id, {
        decision,
        reason: reason.trim() || undefined,
      })

      setSuccess(
        decision === 'Approve'
          ? `Registration approved for ${selectedPatient.fullName}. Patient can now proceed to fee payment.`
          : decision === 'RequestInfo'
          ? `Information requested from ${selectedPatient.fullName}.`
          : `Registration rejected for ${selectedPatient.fullName}.`
      )
      closeReview()
      await loadPending()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { message?: string })?.message
        setActionError(message ?? 'Failed to submit review decision.')
      } else {
        setActionError('Failed to submit review decision. Please try again.')
      }
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="review-page">
      <div className="review-page__header">
        <div>
          <span className="eyebrow">Patient Intake</span>
          <h2 className="review-page__title">Registration Reviews</h2>
          <p className="muted">
            Evaluate and approve prospective patient self-registrations awaiting clinical intake.
            {services.length > 0 && <span> · {services.length} catalog service{services.length === 1 ? '' : 's'} available</span>}
          </p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={loadPending}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : '↻ Refresh List'}
        </button>
      </div>

      {error && (
        <div className="notice notice--error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="notice notice--success" role="status">
          {success}
        </div>
      )}

      {loading ? (
        <div className="state-message">Loading pending registrations…</div>
      ) : pending.length === 0 ? (
        <div className="empty-reviews-card">
          <div className="empty-reviews-icon" aria-hidden="true">✓</div>
          <h3>All Caught Up</h3>
          <p className="muted">
            There are currently no patient registrations awaiting clinical review.
          </p>
        </div>
      ) : (
        <div className="review-grid">
          {pending.map((candidate) => (
            <div key={candidate.id} className="review-card">
              <div className="review-card__header">
                <div>
                  <h3 className="review-card__name">{candidate.fullName}</h3>
                  <span className="review-card__dob">
                    Age {candidate.age} · {sexLabels[candidate.sex] ?? 'Unspecified'}
                  </span>
                </div>
                <span className="status-badge status-badge--pending">Pending Review</span>
              </div>

              <div className="review-card__details">
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{candidate.email ?? 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{candidate.phoneNumber ?? 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date of Birth</span>
                  <span className="detail-value">{candidate.dateOfBirth}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Registered On</span>
                  <span className="detail-value">
                    {new Date(candidate.createdAt).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                  </span>
                </div>
              </div>

              <div className="review-card__actions">
                <button
                  type="button"
                  className="btn-review btn-review--approve"
                  onClick={() => openReview(candidate, 'Approve')}
                >
                  Approve Registration
                </button>
                
                <button
                  type="button"
                  className="btn-review btn-review--info"
                  onClick={() => openReview(candidate, 'RequestInfo')}
                >
                  Request Info
                </button>
                <button
                  type="button"
                  className="btn-review btn-review--reject"
                  onClick={() => openReview(candidate, 'Reject')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Confirmation Modal */}
      {selectedPatient && decision && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h3 className="modal-title">
              {decision === 'Approve'
                ? 'Approve Patient Registration'
                : decision === 'RequestInfo'
                ? 'Request Additional Information'
                : 'Reject Patient Registration'}
            </h3>
            <p className="modal-subtitle">
              Patient: <strong>{selectedPatient.fullName}</strong>
            </p>

            {actionError && (
              <div className="notice notice--error" role="alert" style={{ marginBottom: '14px' }}>
                {actionError}
              </div>
            )}

            {decision === 'Approve' ? (
              <p className="modal-explanation">
                Approving this registration advances the patient to the payment stage. A registration fee invoice is generated when the clinic has configured a fee.
              </p>
            ) : (
              <div className="form-field" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="review-reason">
                  {decision === 'RequestInfo'
                    ? 'Clinical / Onboarding questions for patient *'
                    : 'Reason for rejection *'}
                </label>
                <textarea
                  id="review-reason"
                  className="form-input form-textarea"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    decision === 'RequestInfo'
                      ? 'e.g. Please provide your previous medical history documents or emergency contact.'
                      : 'e.g. Incomplete verification or outside service coverage area.'
                  }
                  autoFocus
                />
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeReview}
                disabled={submittingReview}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`primary-button ${
                  decision === 'Approve'
                    ? 'btn-approve-confirm'
                    : decision === 'Reject'
                    ? 'btn-reject-confirm'
                    : 'btn-info-confirm'
                }`}
                onClick={handleConfirmReview}
                disabled={submittingReview}
              >
                {submittingReview
                  ? 'Saving Decision…'
                  : decision === 'Approve'
                  ? 'Confirm Approval'
                  : decision === 'Reject'
                  ? 'Confirm Rejection'
                  : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
