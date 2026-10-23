// DEV-ONLY: Used exclusively when VITE_DEV_BYPASS_AUTH=true in .env.local
// This file is never executed in production. It lets developers skip the login
// screen during local UI development without needing a running backend.
import type { LoginResponse } from '../types/auth'

export const mockLoginResponse: LoginResponse = {
  accessToken: 'dev-bypass-token',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  user: {
    id: 'dev-user-id',
    firstName: 'Dev',
    lastName: 'User',
    email: 'dev@idealcare.ng',
  },
  tenant: {
    tenant_id: 'dev-tenant',
    tenant_role: 'Owner',
    tenantName: 'Dev Clinic',
  },
}
