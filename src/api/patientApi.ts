import apiClient from '../lib/apiClient'
import type {
  CreatePatientRequest,
  PatientDto,
  PatientRegistrationResponse,
  PatientSummaryDto,
  PagedResult,
  RegisterPatientAccountRequest,
  RegistrationInvoiceDto,
  MedicalItemDto,
  PatientAppointmentDto,
  PatientCareRecordDto,
  ReviewPatientRegistrationRequest,
  UpdatePatientRequest,
  UpdatePatientStatusRequest,
} from '../types/patient'
import type {
  GuardianAccessDto,
  GuardianPatientDto,
  GuardianDirectoryDto,
  GuardianMedicalInformationDto,
  GuardianMedicalDocumentDto,
  GrantGuardianAccessRequest,
  UpdateGuardianPermissionsRequest,
} from '../types/guardian'

export const patientApi = {
  async registrationCapacity(domain: string) {
    return (await apiClient.get<{ remainingSlots: number; isFull: boolean }>('/api/patients/registration-capacity', { params: { domain } })).data
  },
  async registerAccount(request: RegisterPatientAccountRequest) {
    const response = await apiClient.post<PatientRegistrationResponse>(
      '/api/patients/register-account',
      request,
    )
    return response.data
  },

  async list(pageNumber = 1, pageSize = 20) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      throw new RangeError('pageNumber must be an integer of at least 1')
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new RangeError('pageSize must be an integer between 1 and 100')
    }

    const response = await apiClient.get<PagedResult<PatientSummaryDto>>('/api/patients', {
      params: { pageNumber, pageSize },
    })
    return response.data
  },

  async create(request: CreatePatientRequest) {
    const response = await apiClient.post<PatientDto>('/api/patients', request)
    return response.data
  },

  async get(patientId: string) {
    const response = await apiClient.get<PatientDto>(`/api/patients/${patientId}`)
    return response.data
  },

  async update(patientId: string, request: UpdatePatientRequest) {
    const response = await apiClient.put<PatientDto>(`/api/patients/${patientId}`, request)
    return response.data
  },

  async updateStatus(patientId: string, request: UpdatePatientStatusRequest) {
    const response = await apiClient.patch<PatientDto>(`/api/patients/${patientId}/status`, request)
    return response.data
  },

  async listGuardians(patientId: string) {
    const response = await apiClient.get<GuardianAccessDto[]>(`/api/patients/${patientId}/guardians`)
    return response.data
  },

  async listTenantGuardians() {
    const response = await apiClient.get<GuardianDirectoryDto[]>('/api/patients/guardians')
    return response.data
  },

  async listStaffAssignments(patientId: string) {
    const response = await apiClient.get<{ id: string; patientId: string; staffUserId: string; staffFirstName: string; staffLastName: string; assignedAt: string }[]>(
      `/api/patients/${patientId}/staff-assignments`,
    )
    return response.data
  },

  async assignStaff(patientId: string, staffUserId: string) {
    await apiClient.post(`/api/patients/${patientId}/staff-assignments`, { staffUserId })
  },

  async unassignStaff(patientId: string, staffUserId: string) {
    await apiClient.delete(`/api/patients/${patientId}/staff-assignments/${staffUserId}`)
  },

  async assignGuardian(patientId: string, request: GrantGuardianAccessRequest) {
    const response = await apiClient.post<GuardianAccessDto>(
      `/api/patients/${patientId}/guardians`,
      request,
    )
    return response.data
  },

  async updateGuardianPermissions(
    patientId: string,
    guardianId: string,
    request: UpdateGuardianPermissionsRequest,
  ) {
    const response = await apiClient.patch<GuardianAccessDto>(
      `/api/patients/${patientId}/guardians/${guardianId}/permissions`,
      request,
    )
    return response.data
  },

  async revokeGuardian(patientId: string, guardianId: string) {
    await apiClient.delete(`/api/patients/${patientId}/guardians/${guardianId}`)
  },

  async listAccessiblePatients(guardianId: string) {
    const response = await apiClient.get<GuardianPatientDto[]>(`/api/patients/by-guardian/${guardianId}`)
    return response.data
  },

  async listMyGuardianPatients() {
    const response = await apiClient.get<GuardianPatientDto[]>('/api/patients/guardian/me/patients')
    return response.data
  },

  async listMyGuardians() {
    const response = await apiClient.get<GuardianAccessDto[]>('/api/patients/me/guardians')
    return response.data
  },

  async setMyGuardianConsent(guardianId: string, permissions: number) {
    const response = await apiClient.put<GuardianAccessDto>(`/api/patients/me/guardians/${guardianId}/consent`, { permissions })
    return response.data
  },

  async revokeMyGuardian(guardianId: string) {
    await apiClient.delete(`/api/patients/me/guardians/${guardianId}`)
  },

  async findGuardianByEmail(email: string) {
    const response = await apiClient.get<GuardianDirectoryDto>('/api/patients/guardian-lookup', { params: { email } })
    return response.data
  },

  async getMe() {
    const response = await apiClient.get<PatientDto>('/api/patients/me')
    return response.data
  },

  async getMedicalInformation(patientId: string) {
    const response = await apiClient.get<GuardianMedicalInformationDto>(`/api/medical/patients/${patientId}/information`)
    return response.data
  },

  async getMedicalDocuments(patientId: string) {
    const response = await apiClient.get<GuardianMedicalDocumentDto[]>(`/api/medical/patients/${patientId}/documents`)
    return response.data
  },

  async resubmitRegistration() {
    const response = await apiClient.post<PatientDto>('/api/patients/me/resubmit')
    return response.data
  },

  async admit(patientId: string, bedId?: string) {
    const response = await apiClient.post<{ admissionId: string; bedId?: string | null }>(`/api/patients/${patientId}/admit`, undefined, { params: bedId ? { bedId } : undefined })
    return response.data
  },

  async listPendingReview() {
    const response = await apiClient.get<PatientSummaryDto[]>('/api/patients/pending-review')
    return response.data
  },

  async listAwaitingAdmission() {
    const response = await apiClient.get<PatientSummaryDto[]>('/api/patients/awaiting-admission')
    return response.data
  },

  async reviewRegistration(patientId: string, request: ReviewPatientRegistrationRequest) {
    const response = await apiClient.post<PatientDto>(`/api/patients/${patientId}/review`, request)
    return response.data
  },

  async getInvoices(patientId: string) {
    const response = await apiClient.get<RegistrationInvoiceDto[]>(`/api/billing/patients/${patientId}/invoices`)
    return response.data
  },

  async getMedicalItems(patientId: string) {
    const response = await apiClient.get<MedicalItemDto[]>(`/api/billing/patients/${patientId}/medical-items`)
    return response.data
  },

  async payMedicalItem(patientId: string, itemId: string, amount: number, callbackUrl?: string) {
    const response = await apiClient.post<{ paymentId: string; reference: string; authorizationUrl: string }>(
      `/api/billing/patients/${patientId}/medical-items/${itemId}/payments`,
      { medicalItemId: itemId, amount, callbackUrl },
    )
    return response.data
  },

  async getAppointments(patientId: string) {
    const response = await apiClient.get<PatientAppointmentDto[]>(`/api/scheduling/appointments/patients/${patientId}`)
    return response.data
  },

  async getCareRecords(patientId: string) {
    const response = await apiClient.get<PatientCareRecordDto[]>(`/api/care-records/patients/${patientId}`)
    return response.data
  },

  async getActiveAdmission(patientId: string) {
    const response = await apiClient.get<{ admissionId: string }>(`/api/care-records/patients/${patientId}/active-admission`)
    return response.data
  },

  async createCareRecord(patientId: string, request: { recordType: number; content: string; admissionId: string }) {
    const response = await apiClient.post<PatientCareRecordDto>(`/api/care-records/patients/${patientId}`, request)
    return response.data
  },

  async payInvoice(patientId: string, invoiceId: string, amount: number, callbackUrl?: string) {
    const response = await apiClient.post<{ paymentId: string; reference: string; authorizationUrl: string }>(
      `/api/billing/patients/${patientId}/invoices/${invoiceId}/payments`,
      { invoiceId, amount, callbackUrl }
    )
    return response.data
  },

  async verifyPayment(reference: string) {
    const response = await apiClient.post<{ status: number; reference: string }>(`/api/payments/verify/${reference}`)
    return response.data
  },
}
