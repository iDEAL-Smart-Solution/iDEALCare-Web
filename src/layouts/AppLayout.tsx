import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import SubscriptionBlockedBanner from '../components/SubscriptionBlockedBanner'
import { useAuthStore } from '../stores/authStore'
import './AppLayout.css'

/**
 * Authenticated application shell.
 *
 * Provides:
 *  - Sidebar with placeholder navigation entries
 *  - Header with app title and logged-in user display
 *  - Main content area rendered via <Outlet />
 *  - Logout action
 */
export default function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const userDisplayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : 'Account'

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
            <li>
              <NavLink
                to="/app/dashboard"
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link--active' : 'nav-link'
                }
              >
                <span className="nav-link__icon" aria-hidden="true">⊞</span>
                Dashboard
              </NavLink>
            </li>
            {/* Placeholder entries — feature teams replace these */}
            <li>
              <span className="nav-link nav-link--placeholder">
                <span className="nav-link__icon" aria-hidden="true">○</span>
                Patients
              </span>
            </li>
            <li>
              <span className="nav-link nav-link--placeholder">
                <span className="nav-link__icon" aria-hidden="true">○</span>
                Schedule
              </span>
            </li>
            <li>
              <span className="nav-link nav-link--placeholder">
                <span className="nav-link__icon" aria-hidden="true">○</span>
                Billing
              </span>
            </li>
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
            {user && (
              <span>
                {user.firstName} {user.lastName}
              </span>
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
