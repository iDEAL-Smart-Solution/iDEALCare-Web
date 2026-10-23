export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  mustChangePassword?: boolean
}

export interface TenantContext {
  tenant_id: string
  tenant_role: string
  tenantId?: string
  role?: string
  tenantName?: string
  domain?: string
}

export interface LoginRequest {
  email: string
  password: string
  domain?: string
}

export interface LoginResponse {
  accessToken: string
  expiresAt: string
  user: AuthUser
  tenant: TenantContext
}
