export type GuardianPermission =
  | 1
  | 2
  | 4
  | 8
  | 16
  | 32
  | 64
  | 128

export interface GuardianAccessDto {
  id: string
  guardianId: string
  patientId: string
  relationship: string
  isPrimary: boolean
  consentGranted: boolean
  permissions: number
  consentGrantedAt?: string | null
  consentRevokedAt?: string | null
  isActive: boolean
}

export interface GrantGuardianAccessRequest {
  guardianId: string
  relationship: string
  isPrimary: boolean
  permissions: number
}

export interface UpdateGuardianPermissionsRequest {
  grant: number
  revoke: number
}

export interface GuardianPatientDto {
  patientId: string
  firstName: string
  lastName: string
  relationship: string
  isPrimary: boolean
  permissions: number
  consentGranted: boolean
  isActive: boolean
}