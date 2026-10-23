import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import SubscriptionBlockedBanner from '../components/SubscriptionBlockedBanner'
import { useAuthStore } from '../stores/authStore'
import { getRoleExperience } from '../config/roleExperience'

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const userDisplayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : 'Account'

  const experience = getRoleExperience(tenant?.tenant_role)

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="app-sidebar__brand">
          <span className="app-sidebar__logo" aria-hidden="true">✦</span>
          <span className="app-sidebar__name">iDEAL Care</span>
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
          <h1 className="app-header__title">iDEAL Care</h1>
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
        </header>

        <SubscriptionBlockedBanner />

        <main className="app-main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

