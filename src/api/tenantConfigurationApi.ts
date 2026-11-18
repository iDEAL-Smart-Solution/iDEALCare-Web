import apiClient from '../lib/apiClient'

export interface CareServiceDto {
  id: string; tenantId: string; name: string; description?: string | null; isActive: boolean
  availableForHomecare: boolean; availableForFacilityCare: boolean; price: number; bookingModel: 1 | 2
  requiredInformation?: string | null; requiredDocuments?: string | null; assessmentRequirements?: string | null
  createdAt: string; updatedAt?: string | null
}
export interface CareServiceRequest {
  name: string; description?: string; isActive: boolean; availableForHomecare: boolean; availableForFacilityCare: boolean
  price: number; bookingModel: 1 | 2; requiredInformation?: string; requiredDocuments?: string; assessmentRequirements?: string
}
export interface IntakeQuestionDto {
  id: string; questionText: string; answerType: number; isRequired: boolean; displayOrder: number; isActive: boolean
}
export interface IntakeQuestionRequest {
  questionText: string; answerType: number; isRequired: boolean; displayOrder: number; isActive: boolean
}
export const answerTypeLabels: Record<number, string> = { 1: 'Short text', 2: 'Long text', 3: 'Yes / no', 4: 'Number', 5: 'Date', 6: 'Single choice', 7: 'Multiple choice' }

export const tenantConfigurationApi = {
  async registrationCapacity() { return (await apiClient.get<{ availableSlots: number; reservedSlots: number; remainingSlots: number }>('/api/patients/registration-capacity/me')).data },
  async setRegistrationCapacity(availableSlots: number) { return (await apiClient.put<{ availableSlots: number; reservedSlots: number; remainingSlots: number }>('/api/patients/registration-capacity', { availableSlots })).data },
  async registrationExpiry() { return (await apiClient.get<{ unpaidExpiryHours: number }>('/api/patients/registration-expiry')).data },
  async setRegistrationExpiry(unpaidExpiryHours: number) { return (await apiClient.put<{ unpaidExpiryHours: number }>('/api/patients/registration-expiry', { unpaidExpiryHours })).data },
  async services() { return (await apiClient.get<CareServiceDto[]>('/api/care-services')).data },
  async createService(request: CareServiceRequest) { return (await apiClient.post<CareServiceDto>('/api/care-services', request)).data },
  async updateService(id: string, request: CareServiceRequest) { return (await apiClient.put<CareServiceDto>(`/api/care-services/${id}`, request)).data },
  async questions(isActive?: boolean) { return (await apiClient.get<IntakeQuestionDto[]>('/api/assessments/questions', { params: { isActive } })).data },
  async createQuestion(request: IntakeQuestionRequest) { return (await apiClient.post<IntakeQuestionDto>('/api/assessments/questions', request)).data },
  async updateQuestion(id: string, request: IntakeQuestionRequest) { return (await apiClient.put<IntakeQuestionDto>(`/api/assessments/questions/${id}`, request)).data },
}
