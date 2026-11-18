import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import SubscriptionBlockedBanner from '../components/SubscriptionBlockedBanner'
import { useAuthStore } from '../stores/authStore'
import { getRoleExperience } from '../config/roleExperience'
import { useNotificationStore } from '../stores/notificationStore'
import PatientNotificationsPopover from '../components/PatientNotificationsPopover'

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const refreshNotifications = useNotificationStore((s) => s.refresh)
  const clearNotifications = useNotificationStore((s) => s.clear)
  const canReceiveNotifications = Boolean(tenant?.tenant_role)

  useEffect(() => {
    if (!canReceiveNotifications) {
      clearNotifications()
      return
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshNotifications()
    }
    void refreshNotifications()
    const interval = window.setInterval(() => void refreshNotifications(), 30_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [canReceiveNotifications, user?.id, clearNotifications, refreshNotifications])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const userDisplayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : 'Account'

  const experience = getRoleExperience(tenant?.tenant_role)
  const tenantDisplayName = tenant?.tenantName?.trim() || 'iDEAL Care'

  useEffect(() => {
    const previousTitle = document.title
    document.title = tenantDisplayName
    return () => { document.title = previousTitle }
  }, [tenantDisplayName])

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="app-sidebar__brand">
          <span className="app-sidebar__logo" aria-hidden="true">✦</span>
          <span className="app-sidebar__name">{tenantDisplayName}</span>
        </div>

        <nav className="app-sidebar__nav">
          <ul role="list">
            {experience?.navigation.map((item) => <li key={`${item.label}-${item.path ?? 'placeholder'}`}>
              {item.placeholder ? <span className="nav-link nav-link--placeholder">
                <span className="nav-link__icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </span> : <NavLink to={item.path!} className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
                <span className="nav-link__icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>}
            </li>)}
          </ul>
        </nav>

        <div className="app-sidebar__footer">
          <div className="app-sidebar__user" aria-label="Signed-in user">
            <span className="app-sidebar__user-avatar" aria-hidden="true">
              {(user?.firstName?.[0] ?? '?').toUpperCase()}
            </span>
            <span className="app-sidebar__user-name">{userDisplayName}</span>
          </div>
          <button
            type="button"
            className="app-sidebar__logout"
            onClick={handleLogout}
            aria-label="Log out"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="app-body">
        <header className="app-header" role="banner">
          <h1 className="app-header__title">{tenantDisplayName}</h1>
          <div className="app-header__actions">
            {canReceiveNotifications && <PatientNotificationsPopover />}
            <div className="app-header__user">
            {tenant ? (
              <span>
                {tenant.tenantName ?? tenant.tenant_id} · {tenant.tenant_role}
              </span>
            ) : user ? (
              <span>
                {user.firstName} {user.lastName}
              </span>
            ) : (
              <span>Account</span>
            )}
            </div>
          </div>
        </header>

        <SubscriptionBlockedBanner />

        <main className="app-main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

