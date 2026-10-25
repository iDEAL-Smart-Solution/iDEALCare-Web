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
  guardianFirstName: string
  guardianLastName: string
  guardianEmail?: string | null
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

export interface GuardianDirectoryDto {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface GuardianMedicalInformationDto {
  medicalHistory?: string | null
  currentDiagnosis?: string | null
  currentSymptoms?: string | null
  chronicConditions?: string | null
  previousSurgeriesOrProcedures?: string | null
  knownDisabilitiesOrLimitations?: string | null
  immunizationInformation?: string | null
  dietaryRequirements?: string | null
  otherRelevantInformation?: string | null
  allergies: { name?: string; reaction?: string | null; severity?: string | null; allergyType?: number }[]
  medications: { name?: string; dosage?: string; frequency?: string }[]
  medicalConditions: { name?: string; description?: string }[]
}

export interface GuardianMedicalDocumentDto {
  id: string
  documentType: number
  fileName: string
  fileUrl: string
  description?: string | null
  createdAt: string
}

export const guardianPermissions = [
  { bit: 1, label: 'Patient profile' },
  { bit: 2, label: 'Medical information' },
  { bit: 4, label: 'Medical documents' },
  { bit: 8, label: 'Bills' },
  { bit: 16, label: 'Payments' },
  { bit: 32, label: 'Appointments' },
  { bit: 64, label: 'Care records' },
  { bit: 128, label: 'Messages' },
] as const
