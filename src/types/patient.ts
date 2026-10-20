export type Sex = 1 | 2 | 3 | 4
export type MaritalStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type CareLocationType = 1 | 2
export type PatientStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface PatientDto {
  id: string
  firstName: string
  middleName?: string | null
  lastName: string
  dateOfBirth: string
  age: number
  sex: Sex
  maritalStatus?: MaritalStatus | null
  occupation?: string | null
  religion?: string | null
  phoneNumber?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  nextOfKinFullName?: string | null
  nextOfKinRelationship?: string | null
  nextOfKinPhoneNumber?: string | null
  nextOfKinAlternativePhone?: string | null
  nextOfKinEmail?: string | null
  nextOfKinAddress?: string | null
  nextOfKinCountry?: string | null
  nextOfKinIsEmergencyContact?: boolean | null
  requestedServiceId?: string | null
  careLocationType: CareLocationType
  status: PatientStatus
  homeCareAddress?: string | null
  homeCareCity?: string | null
  homeCareState?: string | null
  homeCareCountry?: string | null
  createdAt: string
  updatedAt: string
}

export interface PatientSummaryDto {
  id: string
  fullName: string
  dateOfBirth: string
  age: number
  sex: Sex
  status: PatientStatus
  phoneNumber?: string | null
  email?: string | null
  createdAt: string
}

export interface PagedResult<T> {
  items: T[]
  pageNumber: number
  pageSize: number
  totalCount: number
}

interface PatientProfileFields {
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string
  sex: Sex
  maritalStatus?: MaritalStatus
  occupation?: string
  religion?: string
  phoneNumber?: string
  email?: string
  address?: string
  city?: string
  state?: string
  country?: string
  nextOfKinFullName?: string
  nextOfKinRelationship?: string
  nextOfKinPhoneNumber?: string
  nextOfKinAlternativePhone?: string
  nextOfKinEmail?: string
  nextOfKinAddress?: string
  nextOfKinCountry?: string
  nextOfKinIsEmergencyContact?: boolean
  requestedServiceId?: string
  careLocationType: CareLocationType
  homeCareAddress?: string
  homeCareCity?: string
  homeCareState?: string
  homeCareCountry?: string
}

export interface CreatePatientRequest extends PatientProfileFields {
  dateOfBirth: string
  sex: Sex
  careLocationType: CareLocationType
}

export interface UpdatePatientRequest extends PatientProfileFields {
  dateOfBirth: string
  sex: Sex
  careLocationType: CareLocationType
}

export interface UpdatePatientStatusRequest {
  status: PatientStatus
}

export interface RegisterPatientAccountRequest {
  domain: string
  email: string
  password: string
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string
  sex: Sex
  careLocationType: CareLocationType
}

export interface PatientRegistrationResponse {
  token: string
  expiresAt: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
  activeTenant: {
    tenantId: string
    name: string
    domain: string
    role: string
  }
}