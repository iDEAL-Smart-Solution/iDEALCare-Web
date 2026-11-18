import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { dashboardApi } from '../api/dashboardApi'
import type { OwnerDashboardSummary } from '../types/dashboard'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const role = tenant?.tenant_role?.toLowerCase() ?? ''

  const [data, setData] = useState<OwnerDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const summary = await dashboardApi.getOwnerSummary()
      setData(summary)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 402) {
        setData(null)
        return
      }

      setError('Failed to load dashboard metrics. Please check network connection.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime()
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHrs < 1) return 'Just now'
      if (diffHrs < 24) return `${diffHrs}h ago`
      return `${Math.floor(diffHrs / 24)}d ago`
    } catch {
      return isoString
    }
  }

  if (loading && !data) {
    return (
      <div className="owner-dashboard">
        <p className="state-message" role="status">Loading live dashboard telemetry...</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="owner-dashboard">
        <div className="subscription-notice subscription-notice--warning" role="alert">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => loadData()} style={{ marginLeft: 16 }}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { clinicInfo, clinicalMetrics, financialMetrics, subscription, recentAdmissions, alerts } = data
  const { bedOccupancy } = clinicalMetrics

  return (
    <div className="owner-dashboard">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="owner-dashboard__header">
        <div className="owner-dashboard__title-wrap">
          <div className="owner-dashboard__badge-row">
            <span className="owner-dashboard__tenant-badge">
              {role === 'owner' ? 'Owner Command' : 'Admin Workspace'}
            </span>
            <span className="owner-dashboard__facility-name">
              {clinicInfo.tenantName || tenant?.tenantName} · {clinicInfo.domain || `${tenant?.tenant_id}.idealcare.ng`}
            </span>
          </div>
          <h1 className="owner-dashboard__heading">
            Welcome, {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Medical Director'}
          </h1>
          <p className="owner-dashboard__subheading">
            {role === 'owner'
              ? 'Executive overview of clinical capacity and facility status.'
              : 'Operational overview of clinical capacity and facility status.'}
          </p>
        </div>

        <div className="owner-dashboard__actions">
          <button
            type="button"
            className="owner-dashboard__btn owner-dashboard__btn--secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
            aria-label="Refresh dashboard metrics"
          >
            <span className={`owner-dashboard__btn-icon ${refreshing ? 'owner-dashboard__btn-icon--spin' : ''}`}>
              ↻
            </span>
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
          <Link to="/app/patients" className="owner-dashboard__btn owner-dashboard__btn--secondary">
            <span className="owner-dashboard__btn-icon">📋</span>
            Patient Directory
          </Link>
          <Link to="/app/patients/new" className="owner-dashboard__btn owner-dashboard__btn--primary">
            <span className="owner-dashboard__btn-icon">+</span>
            Register Patient
          </Link>
        </div>
      </header>

      <nav className="dashboard-quick-links" aria-label="Operations shortcuts">
        <Link to="/app/configuration">Care setup</Link><Link to="/app/care-records">Care records</Link><Link to="/app/schedule">Schedule</Link><Link to="/app/messages">Messages</Link><Link to="/app/home-care">Home-care requests</Link><Link to="/app/facilities">Facilities and beds</Link>
      </nav>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <section className="owner-dashboard__kpi-grid" aria-label="Executive KPIs">

        {/* KPI 1: Inpatient Occupancy */}
        <div className="kpi-card kpi-card--purple">
          <div className="kpi-card__header">
            <span className="kpi-card__title">Inpatient Occupancy</span>
            <span className="kpi-card__icon" aria-hidden="true">🛏</span>
          </div>
          <div className="kpi-card__value-wrap">
            <span className="kpi-card__value">{bedOccupancy.occupied}</span>
            <span className="kpi-card__unit">/ {bedOccupancy.total} beds</span>
          </div>
          <div className="kpi-card__bar-track" aria-hidden="true">
            <div
              className="kpi-card__bar-fill"
              style={{ width: `${Math.min(100, bedOccupancy.occupancyRate)}%` }}
            />
          </div>
          <div className="kpi-card__footer">
            <span>{bedOccupancy.occupancyRate}% Capacity</span>
            <span className="kpi-card__tag kpi-card__tag--pending">
              {bedOccupancy.available} available
            </span>
          </div>
        </div>

        {/* KPI 2: Monthly Revenue */}
        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__header">
            <span className="kpi-card__title">Monthly Revenue</span>
            <span className="kpi-card__icon" aria-hidden="true">📈</span>
          </div>
          <div className="kpi-card__value-wrap">
            <span className="kpi-card__value">
              {financialMetrics.currency === 'NGN' ? '₦' : financialMetrics.currency}
              {Number(financialMetrics.monthlyRevenue).toLocaleString()}
            </span>
          </div>
          <div className="kpi-card__footer">
            <span className="kpi-card__tag kpi-card__tag--growth">
              {financialMetrics.revenueGrowthPercentage >= 0 ? '+' : ''}
              {financialMetrics.revenueGrowthPercentage}% vs last mo
            </span>
          </div>
        </div>

        {/* KPI 3: Outstanding Bills */}
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <span className="kpi-card__title">Outstanding Bills</span>
            <span className="kpi-card__icon" aria-hidden="true">📑</span>
          </div>
          <div className="kpi-card__value-wrap">
            <span className="kpi-card__value">
              {financialMetrics.currency === 'NGN' ? '₦' : financialMetrics.currency}
              {Number(financialMetrics.outstandingBalances).toLocaleString()}
            </span>
          </div>
          <div className="kpi-card__footer">
            <span className="kpi-card__tag kpi-card__tag--pending">
              {financialMetrics.pendingInvoicesCount} Pending invoices
            </span>
          </div>
        </div>

        {/* KPI 4: SaaS Subscription */}
        <div className="kpi-card kpi-card--info">
          <div className="kpi-card__header">
            <span className="kpi-card__title">SaaS Subscription</span>
            <span className="kpi-card__icon" aria-hidden="true">🛡️</span>
          </div>
          <div className="kpi-card__value-wrap">
            <span className="kpi-card__value" style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subscription.planName}
            </span>
          </div>
          <div className="kpi-card__footer">
            <span className={`kpi-card__tag ${subscription.status === 'Active' ? 'kpi-card__tag--stable' : 'kpi-card__tag--pending'}`}>
              {subscription.status} · {subscription.daysRemaining} days left
            </span>
          </div>
        </div>
      </section>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className="owner-dashboard__main-grid">
        {/* Left / Wide Column */}
        <div className="owner-dashboard__column">

          {/* Recent Admissions — LIVE from backend */}
          <section className="dashboard-card" aria-label="Recent Admissions">
            <div className="dashboard-card__header">
              <h2 className="dashboard-card__heading">
                <span aria-hidden="true">🏥</span> Recent Admissions
                <span className="dashboard-card__live-badge">LIVE</span>
              </h2>
              <Link to="/app/patients" className="dashboard-card__view-all">
                View all patients ({clinicalMetrics.totalRegisteredPatients}) →
              </Link>
            </div>

            <div className="admissions-table-wrap">
              {recentAdmissions.length === 0 ? (
                <p className="state-message">No admissions registered yet.</p>
              ) : (
                <table className="admissions-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Room / Bed</th>
                      <th>Admitted</th>
                      <th>Primary Nurse</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAdmissions.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link to={`/app/patients/${p.patientId}`} className="admissions-table__patient">
                            {p.patientName}
                          </Link>
                        </td>
                        <td>{p.roomBed}</td>
                        <td>{formatRelativeTime(p.admittedAt)}</td>
                        <td>{p.primaryNurse}</td>
                        <td>
                          <span className={`status-pill status-pill--${p.status.toLowerCase()}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Bed Occupancy Breakdown — LIVE */}
          <section className="dashboard-card" aria-label="Facility Bed Capacity">
            <div className="dashboard-card__header">
              <h2 className="dashboard-card__heading">
                <span aria-hidden="true">🛏</span> Facility Bed Capacity
                <span className="dashboard-card__live-badge">LIVE</span>
              </h2>
              <span className="owner-dashboard__facility-name">
                Total Beds: {bedOccupancy.total}
              </span>
            </div>

            {bedOccupancy.total > 0 ? (
              <div className="bed-breakdown">
                <div className="bed-breakdown__bar" aria-hidden="true">
                  <div
                    className="bed-breakdown__segment bed-breakdown__segment--occupied"
                    style={{ width: `${(bedOccupancy.occupied / bedOccupancy.total) * 100}%` }}
                    title={`Occupied: ${bedOccupancy.occupied}`}
                  />
                  <div
                    className="bed-breakdown__segment bed-breakdown__segment--available"
                    style={{ width: `${(bedOccupancy.available / bedOccupancy.total) * 100}%` }}
                    title={`Available: ${bedOccupancy.available}`}
                  />
                  <div
                    className="bed-breakdown__segment bed-breakdown__segment--maintenance"
                    style={{ width: `${(bedOccupancy.maintenance / bedOccupancy.total) * 100}%` }}
                    title={`Maintenance: ${bedOccupancy.maintenance}`}
                  />
                </div>
                <div className="bed-breakdown__legend">
                  <div className="bed-breakdown__item">
                    <span className="bed-breakdown__dot bed-breakdown__dot--occupied" />
                    <span><strong>{bedOccupancy.occupied}</strong> Occupied</span>
                  </div>
                  <div className="bed-breakdown__item">
                    <span className="bed-breakdown__dot bed-breakdown__dot--available" />
                    <span><strong>{bedOccupancy.available}</strong> Available</span>
                  </div>
                  <div className="bed-breakdown__item">
                    <span className="bed-breakdown__dot bed-breakdown__dot--maintenance" />
                    <span><strong>{bedOccupancy.maintenance}</strong> Maintenance</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="state-message">
                No facilities or beds have been configured yet.{' '}
                <Link to="/app/facilities">Set up your facility →</Link>
              </p>
            )}
          </section>
        </div>

        {/* Right / Narrow Column */}
        <div className="owner-dashboard__column">

          {/* Subscription Card — LIVE */}
          <section className="dashboard-card" aria-label="Tenant Subscription Details">
            <div className="dashboard-card__header">
              <h2 className="dashboard-card__heading">
                <span aria-hidden="true">💎</span> Clinic Subscription
              </h2>
              <span className={`sub-summary__status-badge ${subscription.status === 'Active' ? 'status-pill--stable' : 'status-pill--pendingreview'}`}>
                {subscription.status}
              </span>
            </div>
            <div style={{ padding: '4px 0' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>
                {subscription.planName}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
                ₦{Number(subscription.amount).toLocaleString()} / {subscription.billingFrequency.toLowerCase()}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Current period ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()} ({subscription.daysRemaining} days remaining)
              </div>
              <div style={{ marginTop: 12 }}>
                <Link to="/app/subscription" className="dashboard-card__view-all">
                  Manage subscription & billing →
                </Link>
              </div>
            </div>
          </section>

          {/* Alerts — LIVE */}
          <section className="dashboard-card" aria-label="Operational Alerts">
            <div className="dashboard-card__header">
              <h2 className="dashboard-card__heading">
                <span aria-hidden="true">🔔</span> Alerts
                <span className="dashboard-card__live-badge">LIVE</span>
              </h2>
              <span className="owner-dashboard__facility-name">
                {alerts.length} Active
              </span>
            </div>

            <div className="alerts-list">
              {alerts.length === 0 ? (
                <p className="state-message">No unread notifications.</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className={`alert-item alert-item--${alert.type}`}>
                    <span className="alert-item__icon" aria-hidden="true">
                      {alert.type === 'urgent' ? '⚠️' : alert.type === 'warning' ? '⚡' : 'ℹ️'}
                    </span>
                    <div className="alert-item__body">
                      <span className="alert-item__title">{alert.title}</span>
                      <span className="alert-item__desc">{alert.description}</span>
                      <span className="alert-item__time">{alert.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Staffing On Duty — LIVE */}
          <section className="dashboard-card" aria-label="Staffing Overview">
            <div className="dashboard-card__header">
              <h2 className="dashboard-card__heading">
                <span aria-hidden="true">👥</span> Staffing On Duty
                <span className="dashboard-card__live-badge">LIVE</span>
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
              <div style={{ padding: '12px', background: 'var(--surface-sunken)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {clinicalMetrics.nursesOnDuty}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Nurses On Duty
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--surface-sunken)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
                  {clinicalMetrics.totalCareStaff}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Total Care Staff
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
