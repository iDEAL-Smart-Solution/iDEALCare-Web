import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import { setNavigate } from './lib/navigationRef'
import DashboardPage from './pages/DashboardPage'
import PatientDashboardPage from './pages/PatientDashboardPage'
import TeamDashboardPage from './pages/TeamDashboardPage'
import { getRoleEntryPoint } from './config/roleExperience'
import LoginPage from './pages/LoginPage'
import PatientsPage, { PatientCreatePage, PatientDetailPage } from './pages/PatientsPage'
import RegisterPage from './pages/RegisterPage'
import RegistrationReviewPage from './pages/RegistrationReviewPage'
import PatientBillsPage from './pages/PatientBillsPage'
import FirstLoginPasswordPage from './pages/FirstLoginPasswordPage'
import ProtectedRoute from './routes/ProtectedRoute'
import { useAuthStore } from './stores/authStore'

import SubscriptionPage from './pages/SubscriptionPage'
import PatientAssessmentPage from './pages/PatientAssessmentPage'
import PatientInformationPage from './pages/PatientInformationPage'
import AssessmentQueuePage from './pages/AssessmentQueuePage'
import StaffManagementPage from './pages/StaffManagementPage'
import BillingManagementPage from './pages/BillingManagementPage'
import GuardianDashboardPage from './pages/GuardianDashboardPage'
import GuardianRegisterPage from './pages/GuardianRegisterPage'
import GuardianManagementPage from './pages/GuardianManagementPage'
import PatientGuardianAccessPage from './pages/PatientGuardianAccessPage'

function RoleRoute({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const role = useAuthStore((s) => s.tenant?.tenant_role?.toLowerCase())
  return role && allowedRoles.includes(role)
    ? <>{children}</>
    : <Navigate to={getRoleEntryPoint(role)} replace />
}

function RoleEntryRedirect() {
  const role = useAuthStore((state) => state.tenant?.tenant_role)
  return <Navigate to={getRoleEntryPoint(role)} replace />
}

function TeamDashboardEntry() {
  const role = useAuthStore((state) => state.tenant?.tenant_role?.toLowerCase())
  return <TeamDashboardPage role={role === 'nurse' ? 'nurse' : 'staff'} />
}

/**
 * Root component.
 *
 * Restores authentication state once on mount, then renders the route tree.
 *
 * Also wires the router's navigate function into navigationRef so that
 * apiClient's response interceptor can perform programmatic navigation
 * without a hard reload (plain modules cannot call useNavigate directly).
 *
 * Route structure:
 *   /                  → redirect to /app/dashboard
 *   /login             → LoginPage (public)
 *   /app               → ProtectedRoute + AppLayout
 *   /app/dashboard     → DashboardPage
 *   /app/subscription  → SubscriptionPage
 */
export default function App() {
  const restoreAuth = useAuthStore((s) => s.restoreAuth)
  const nav = useNavigate()

  useEffect(() => {
    setNavigate(nav)
  }, [nav])

  useEffect(() => {
    restoreAuth()
  }, [restoreAuth])

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/guardian/register" element={<GuardianRegisterPage />} />
      <Route path="/first-login-password" element={<FirstLoginPasswordPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/app/tenant/dashboard" element={<RoleRoute allowedRoles={['owner', 'admin']}><DashboardPage /></RoleRoute>} />
          <Route path="/app/team/dashboard" element={<RoleRoute allowedRoles={['nurse', 'staff']}><TeamDashboardEntry /></RoleRoute>} />
          <Route path="/app/patient/dashboard" element={<RoleRoute allowedRoles={['patient']}><PatientDashboardPage /></RoleRoute>} />
          <Route path="/app/patient/guardians" element={<RoleRoute allowedRoles={['patient']}><PatientGuardianAccessPage /></RoleRoute>} />
          <Route path="/app/guardian/dashboard" element={<RoleRoute allowedRoles={['guardian']}><GuardianDashboardPage /></RoleRoute>} />
          <Route path="/app/dashboard" element={<RoleEntryRedirect />} />
          <Route path="/app/subscription" element={<RoleRoute allowedRoles={['owner', 'admin']}><SubscriptionPage /></RoleRoute>} />
          <Route path="/app/staff" element={<RoleRoute allowedRoles={['owner', 'admin']}><StaffManagementPage /></RoleRoute>} />
          <Route path="/app/guardians" element={<RoleRoute allowedRoles={['owner', 'admin']}><GuardianManagementPage /></RoleRoute>} />
          <Route path="/app/billing" element={<RoleRoute allowedRoles={['owner', 'admin']}><BillingManagementPage /></RoleRoute>} />
          <Route path="/app/patients" element={<RoleRoute allowedRoles={['owner', 'admin', 'nurse', 'staff']}><PatientsPage /></RoleRoute>} />
          <Route path="/app/patients/new" element={<RoleRoute allowedRoles={['owner', 'admin']}><PatientCreatePage /></RoleRoute>} />
          <Route path="/app/patients/:patientId" element={<RoleRoute allowedRoles={['owner', 'admin', 'nurse', 'staff']}><PatientDetailPage /></RoleRoute>} />
          <Route path="/app/registrations/review" element={<RoleRoute allowedRoles={['owner', 'admin']}><RegistrationReviewPage /></RoleRoute>} />
          <Route path="/app/assessments/queue" element={<RoleRoute allowedRoles={['owner', 'admin']}><AssessmentQueuePage /></RoleRoute>} />
          <Route path="/app/bills" element={<RoleRoute allowedRoles={['patient']}><PatientBillsPage /></RoleRoute>} />
          <Route path="/app/registration-fee" element={<RoleRoute allowedRoles={['patient']}><PatientBillsPage /></RoleRoute>} />
          <Route path="/app/onboarding/information" element={<RoleRoute allowedRoles={['patient']}><PatientInformationPage /></RoleRoute>} />
          <Route path="/app/patients/:patientId/assessment" element={<RoleRoute allowedRoles={['owner', 'admin', 'nurse', 'staff']}><PatientAssessmentPage /></RoleRoute>} />
          {/* /app → redirect to dashboard */}
          <Route path="/app" element={<RoleEntryRedirect />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
