export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface TenantMembership {
  tenantId: string
  tenantName: string
  role: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  expiresAt: string
  user: AuthUser
  tenants: TenantMembership[]
}
