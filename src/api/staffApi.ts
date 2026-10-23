import apiClient from '../lib/apiClient'

export interface TenantStaffDto {
  id: string
  firstName: string
  lastName: string
  email: string
  userName: string
  role: 'Nurse' | 'Staff' | string
  isActive: boolean
}

export interface CreateTenantStaffRequest {
  firstName: string
  lastName: string
  email: string
  userName: string
  role: 'Nurse' | 'Staff'
}

export interface CreatedTenantStaffDto {
  staff: TenantStaffDto
  temporaryPassword: string
}

export const staffApi = {
  async list() {
    const response = await apiClient.get<TenantStaffDto[]>('/api/staff')
    return response.data
  },
  async create(request: CreateTenantStaffRequest) {
    const response = await apiClient.post<CreatedTenantStaffDto>('/api/staff', request)
    return response.data
  },
}
