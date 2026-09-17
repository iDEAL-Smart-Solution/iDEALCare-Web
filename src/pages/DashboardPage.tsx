import { useAuthStore } from '../stores/authStore'
import './DashboardPage.css'

/**
 * Dashboard — placeholder page confirming the application shell is ready.
 * Feature teams replace this content when building their modules.
 */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const tenants = useAuthStore((s) => s.tenants)

  return (
    <div className="dashboard">
      <h2 className="dashboard__heading">
        {user ? `Welcome, ${user.firstName}` : 'Welcome'}
      </h2>
      <p className="dashboard__status">
        The application shell is ready. Feature development can begin.
      </p>

      {tenants.length > 0 && (
        <div className="dashboard__tenants">
          <h3 className="dashboard__tenants-title">Your organisations</h3>
          <ul className="dashboard__tenants-list">
            {tenants.map((t) => (
              <li key={t.tenantId} className="dashboard__tenant-item">
                <span className="dashboard__tenant-name">{t.tenantName}</span>
                <span className="dashboard__tenant-role">{t.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
