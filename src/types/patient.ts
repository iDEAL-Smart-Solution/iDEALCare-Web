export type Sex = 1 | 2 | 3 | 4
export type MaritalStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type CareLocationType = 1 | 2
export type PatientStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface PatientDto {
  id: string
  firstName: string
  middleName?: string | null
  lastName: string
  dateOfBirth?: string | null
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
  registrationReviewReason?: string | null
  informationRequest?: string | null
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
  dateOfBirth?: string | null
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
  dateOfBirth?: string
  age?: number
  sex: Sex
  maritalStatus?: MaritalStatus
  occupation?: string
  religion?: string
  phoneNumber?: string
  email?: string
  userName?: string
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
  dateOfBirth?: string
  age?: number
  sex: Sex
  careLocationType: CareLocationType
}

export interface UpdatePatientRequest extends PatientProfileFields {
  dateOfBirth?: string
  age?: number
  maritalStatus?: MaritalStatus
  occupation?: string
  religion?: string
  sex: Sex
  careLocationType: CareLocationType
}

export interface UpdatePatientStatusRequest {
  status: PatientStatus
}

export interface ReviewPatientRegistrationRequest {
  decision: 'Approve' | 'Reject' | 'RequestInfo'
  reason?: string
}

export interface RegisterPatientAccountRequest {
  domain: string
  email: string
  userName: string
  password: string
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth?: string
  age?: number
  sex: Sex
  maritalStatus?: MaritalStatus
  occupation?: string
  religion?: string
  careLocationType: CareLocationType
  requestedServiceId?: string
  phoneNumber?: string
  address?: string
  city?: string
  state?: string
  country?: string
  nextOfKinFullName?: string
  nextOfKinRelationship?: string
  nextOfKinPhoneNumber?: string
  nextOfKinAlternativePhone?: string
  nextOfKinAddress?: string
  nextOfKinEmail?: string
  nextOfKinCountry?: string
  nextOfKinIsEmergencyContact?: boolean
}

export interface RegistrationInvoiceDto {
  id: string
  tenantId: string
  patientId: string
  invoiceType: number
  status: number
  totalAmount: number
  amountPaid: number
  outstandingAmount: number
  requiredDeposit?: number | null
  isRefundable: boolean
  carePeriodStart?: string | null
  carePeriodEnd?: string | null
  paymentDeadline?: string | null
  notes?: string | null
  createdAt: string
  items?: { id: string; itemType: number; description: string; amount: number }[]
}

export interface MedicalItemDto {
  id: string
  patientId: string
  name: string
  description?: string | null
  price: number
  status: 1 | 2 | 3 | 4
  paidAt?: string | null
  suppliedAt?: string | null
  createdAt: string
}

export interface PatientAppointmentDto {
  id: string
  appointmentType: number
  status: number
  scheduledAt: string
  durationMinutes?: number | null
  location?: string | null
  notes?: string | null
  assignedStaffUserName?: string | null
}

export interface PatientCareRecordDto {
  id: string
  patientId: string
  patientName?: string | null
  admissionId: string
  recordedByUserId: string
  recordedByName?: string | null
  recordType: number
  content: string
  recordedAt: string
  correctsRecordId?: string | null
}

import type { LoginResponse } from './auth'

export type PatientRegistrationResponse = LoginResponse