/**
 * Mock authentication data used when VITE_DEV_BYPASS_AUTH=true.
 *
 * Replace this file (or swap the import in authApi.ts) when real
 * authentication is ready — nothing else in the app needs to change.
 */
import type { LoginResponse } from '../types/auth'

export const mockLoginResponse: LoginResponse = {
  accessToken: 'dev-mock-token',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 h from now
  user: {
    id: 'dev-user-1',
    firstName: 'Dev',
    lastName: 'User',
    email: 'dev@idealcare.local',
  },
  tenants: [
    {
      tenantId: 'tenant-dev-1',
      tenantName: 'Demo Clinic',
      role: 'Owner',
    },
    {
      tenantId: 'tenant-dev-2',
      tenantName: 'Satellite Practice',
      role: 'Clinician',
    },
  ],
}
