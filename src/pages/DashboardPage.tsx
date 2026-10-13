import { useAuthStore } from '../stores/authStore'
import './DashboardPage.css'

/**
 * Dashboard — placeholder page confirming the application shell is ready.
 * Feature teams replace this content when building their modules.
 */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)

  return (
    <div className="dashboard">
      <h2 className="dashboard__heading">
        {user ? `Welcome, ${user.firstName}` : 'Welcome'}
      </h2>
      <p className="dashboard__status">
        The application shell is ready. Feature development can begin.
      </p>

      {tenant && (
        <div className="dashboard__tenants">
          <h3 className="dashboard__tenants-title">Your organisation</h3>
          <ul className="dashboard__tenants-list">
            <li className="dashboard__tenant-item">
              <span className="dashboard__tenant-name">{tenant.tenantName ?? tenant.tenant_id}</span>
              <span className="dashboard__tenant-role">{tenant.tenant_role}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
