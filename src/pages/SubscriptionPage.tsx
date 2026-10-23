import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useSubscriptionStore } from '../stores/subscriptionStore'
import { subscriptionApi, type SubscriptionPlanDto } from '../api/subscriptionApi'
import type { TenantSubscriptionInfo } from '../types/dashboard'

export default function SubscriptionPage() {
  const tenant = useAuthStore((s) => s.tenant)
  const blockState = useSubscriptionStore((s) => s.blockState)
  const clearBlocked = useSubscriptionStore((s) => s.clearBlocked)

  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([])
  const [currentSub, setCurrentSub] = useState<TenantSubscriptionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [fetchedPlans, fetchedSub] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getCurrentSubscription(),
      ])
      setPlans(fetchedPlans)
      setCurrentSub(fetchedSub)

      if (fetchedSub.status === 'Active') {
        clearBlocked()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load subscription data from server.'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }, [clearBlocked])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle return from Paystack checkout redirect (URL contains reference / trxref)
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref')
    if (!reference) return

    let isMounted = true
    const verifyTransaction = async () => {
      setIsActionLoading(true)
      try {
        const updated = await subscriptionApi.verifyPayment(reference)
        if (isMounted) {
          setCurrentSub(updated)
          clearBlocked()
          setNotice({
            type: 'success',
            text: `Payment confirmed successfully! Your subscription tier (${updated.planName}) is now active.`,
          })
          // Remove reference from search query cleanly without navigation
          searchParams.delete('reference')
          searchParams.delete('trxref')
          setSearchParams(searchParams, { replace: true })
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Payment verification failed.'
              : 'Payment verification failed.'
          setNotice({ type: 'error', text: msg })
        }
      } finally {
        if (isMounted) {
          setIsActionLoading(false)
        }
      }
    }

    verifyTransaction()
    return () => {
      isMounted = false
    }
  }, [searchParams, setSearchParams, clearBlocked])

  const handlePayNow = async (planId: string) => {
    setIsActionLoading(true)
    setNotice(null)
    try {
      const callbackUrl = `${window.location.origin}/app/subscription`
      const res = await subscriptionApi.initializePayment({
        planId,
        callbackUrl,
      })

      if (res.authorizationUrl) {
        // Redirect to Paystack secure checkout URL
        window.location.href = res.authorizationUrl
      } else {
        setNotice({
          type: 'info',
          text: `Payment initiated with reference ${res.reference}.`,
        })
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Failed to initiate payment gateway.'
          : 'Failed to initiate payment gateway.'
      setNotice({ type: 'error', text: msg })
      setIsActionLoading(false)
    }
  }

  const handleVerifyStatus = async () => {
    setIsActionLoading(true)
    setNotice(null)
    try {
      const updated = await subscriptionApi.getCurrentSubscription()
      setCurrentSub(updated)
      if (updated.status === 'Active') {
        clearBlocked()
        setNotice({
          type: 'success',
          text: `Subscription verified: ${updated.planName} is Active with ${updated.daysRemaining} days remaining.`,
        })
      } else {
        setNotice({
          type: 'info',
          text: `Subscription status is currently: ${updated.status}. Payment is required to activate all clinic features.`,
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to verify subscription status.'
      setNotice({ type: 'error', text: msg })
    } finally {
      setIsActionLoading(false)
    }
  }

  const isCurrentPlan = (plan: SubscriptionPlanDto) => {
    if (currentSub?.planId) {
      return currentSub.planId.toLowerCase() === plan.id.toLowerCase()
    }
    if (currentSub?.planName) {
      return currentSub.planName.toLowerCase() === plan.name.toLowerCase()
    }
    return false
  }

  const formatCurrency = (amount: number, currency = 'NGN') => {
    const symbol = currency === 'NGN' ? '₦' : `${currency} `
    return `${symbol}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  const isSubscriptionActive = currentSub?.status === 'Active'

  return (
    <div className="subscription-page">
      <header className="subscription-page__header">
        <div>
          <div className="subscription-page__badge">Billing & Licensing</div>
          <h1 className="subscription-page__heading">Clinic Subscription Management</h1>
          <p className="subscription-page__subheading">
            Manage your organization's iDEAL Care tier, payment cycle, and clinic features.
          </p>
        </div>
        <Link to="/app/dashboard" className="subscription-page__back-btn">
          ← Back to Dashboard
        </Link>
      </header>

      {notice && (
        <div className={`subscription-notice subscription-notice--${notice.type}`} role="alert">
          <div className="subscription-notice__content">
            <span className="subscription-notice__icon">
              {notice.type === 'success' ? '✓' : notice.type === 'error' ? '⚠' : 'ℹ'}
            </span>
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            className="subscription-notice__dismiss"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {blockState && !isSubscriptionActive && (
        <div className="subscription-notice subscription-notice--warning" role="alert">
          <div className="subscription-notice__content">
            <span className="subscription-notice__icon">⚠</span>
            <div>
              <strong>Action Required: </strong>
              <span>
                {blockState.message ||
                  'Your organisation does not have an active subscription. A tenant administrator must complete the subscription payment before access is available.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="subscription-state-box">
          <p>Loading subscription details and active plans from server...</p>
        </div>
      ) : errorMessage ? (
        <div className="subscription-state-box">
          <p className="status-danger">{errorMessage}</p>
          <button type="button" className="subscription-btn subscription-btn--primary" onClick={loadData}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="subscription-plans-container">
            <h2 className="subscription-section-heading">Available Subscription Plans</h2>
            <div className="subscription-plans-grid">
              {plans.map((plan) => {
                const isSelected = isCurrentPlan(plan)
                const isPlanActive = isSelected && isSubscriptionActive

                return (
                  <div
                    key={plan.id}
                    className={`subscription-card ${isSelected ? 'subscription-card--primary' : ''} ${
                      isPlanActive ? 'subscription-card--active' : ''
                    }`}
                  >
                    <div className="subscription-card__tag-row">
                      {isPlanActive ? (
                        <span className="subscription-card__tag subscription-card__tag--active">Current Active Tier</span>
                      ) : isSelected ? (
                        <span className="subscription-card__tag">Assigned Tier</span>
                      ) : (
                        <span className="subscription-card__tag">Available Tier</span>
                      )}
                    </div>

                    <h3 className="subscription-card__plan-name">{plan.name}</h3>

                    <div className="subscription-card__price-row">
                      <span className="subscription-card__price">{formatCurrency(plan.price, plan.currency)}</span>
                      <span className="subscription-card__cycle">
                        / {plan.billingFrequency ? plan.billingFrequency.toLowerCase() : 'billing period'}
                      </span>
                    </div>

                    {plan.description && <p className="subscription-card__desc">{plan.description}</p>}

                    <div className="subscription-card__status-row">
                      <span className="subscription-card__status-label">Status</span>
                      <span
                        className={`status-pill ${
                          isPlanActive
                            ? 'status-pill--stable'
                            : isSelected
                            ? currentSub?.status === 'PendingPayment'
                              ? 'status-pill--pendingreview'
                              : 'status-pill--danger'
                            : 'status-pill--inactive'
                        }`}
                      >
                        {isSelected ? currentSub?.status || 'Pending Payment' : 'Available'}
                      </span>
                    </div>

                    <div className="subscription-card__action">
                      {isPlanActive ? (
                        <button type="button" className="subscription-btn subscription-btn--active" disabled>
                          ✓ Plan Active
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="subscription-btn subscription-btn--pay"
                          disabled={isActionLoading}
                          onClick={() => handlePayNow(plan.id)}
                        >
                          {isActionLoading
                            ? 'Processing...'
                            : isSelected
                            ? `Pay Now · ${formatCurrency(plan.price, plan.currency)}`
                            : `Select & Pay Now · ${formatCurrency(plan.price, plan.currency)}`}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="subscription-grid">
            {/* Organization & Licensing Details Card */}
            <div className="subscription-card">
              <h3 className="subscription-card__section-title">Organization Details</h3>
              <dl className="subscription-details-list">
                <div className="subscription-details-item">
                  <dt>Hospital Facility</dt>
                  <dd>{tenant?.tenantName || 'Teju Specialist Hospital'}</dd>
                </div>
                <div className="subscription-details-item">
                  <dt>Clinic Domain</dt>
                  <dd>{tenant?.domain || (tenant?.tenant_id ? `${tenant.tenant_id}.idealcare.ng` : 'tejuspecialisthospital.idealcare.ng')}</dd>
                </div>
                <div className="subscription-details-item">
                  <dt>Account Role</dt>
                  <dd>{tenant?.tenant_role || 'Owner'} (Full Administrative Access)</dd>
                </div>
                <div className="subscription-details-item">
                  <dt>Billing Gateway</dt>
                  <dd>Paystack Automated Billing (NGN · ₦)</dd>
                </div>
              </dl>

              <div className="subscription-card__footer" style={{ marginTop: 'auto', paddingTop: '12px' }}>
                <button
                  type="button"
                  className="subscription-btn subscription-btn--primary"
                  disabled={isActionLoading}
                  onClick={handleVerifyStatus}
                >
                  {isActionLoading ? 'Verifying...' : 'Verify Subscription Status'}
                </button>
              </div>
            </div>

            {/* Current Subscription Status Summary Card */}
            <div className="subscription-card">
              <h3 className="subscription-card__section-title">Subscription Overview</h3>
              <dl className="subscription-details-list">
                <div className="subscription-details-item">
                  <dt>Active Plan</dt>
                  <dd>{currentSub?.planName || 'No active plan'}</dd>
                </div>
                <div className="subscription-details-item">
                  <dt>Current Status</dt>
                  <dd>
                    <span
                      className={`status-pill ${
                        isSubscriptionActive
                          ? 'status-pill--stable'
                          : currentSub?.status === 'PendingPayment'
                          ? 'status-pill--pendingreview'
                          : 'status-pill--danger'
                      }`}
                    >
                      {currentSub?.status || 'Pending Payment'}
                    </span>
                  </dd>
                </div>
                <div className="subscription-details-item">
                  <dt>Current Period</dt>
                  <dd>
                    {currentSub?.currentPeriodStart && currentSub?.currentPeriodEnd
                      ? `${new Date(currentSub.currentPeriodStart).toLocaleDateString()} — ${new Date(
                          currentSub.currentPeriodEnd
                        ).toLocaleDateString()}`
                      : '—'}
                  </dd>
                </div>
                <div className="subscription-details-item">
                  <dt>Days Remaining</dt>
                  <dd>{currentSub?.daysRemaining !== undefined ? `${currentSub.daysRemaining} days` : '—'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
