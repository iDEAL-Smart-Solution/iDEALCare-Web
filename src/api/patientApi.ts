import apiClient from '../lib/apiClient'
import type {
  CreatePatientRequest,
  PatientDto,
  PatientRegistrationResponse,
  PatientSummaryDto,
  PagedResult,
  RegisterPatientAccountRequest,
  UpdatePatientRequest,
  UpdatePatientStatusRequest,
} from '../types/patient'
import type {
  GuardianAccessDto,
  GuardianPatientDto,
  GrantGuardianAccessRequest,
  UpdateGuardianPermissionsRequest,
} from '../types/guardian'

export const patientApi = {
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
    const response = await apiClient.get<GuardianPatientDto[]>(`/api/guardians/${guardianId}/patients`)
    return response.data
  },
}