export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

/** JWT claim names are intentionally kept verbatim at this boundary. */
export interface TenantContext {
  tenant_id: string
  tenant_role: string
  tenantName?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  expiresAt: string
  user: AuthUser
  tenant: TenantContext
}
