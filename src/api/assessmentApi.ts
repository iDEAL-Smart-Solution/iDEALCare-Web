import apiClient from '../lib/apiClient'

export interface AssessmentQuestion {
  id: string
  questionText: string
  answerType: number
  isRequired: boolean
  displayOrder: number
}

export const assessmentApi = {
  async questions() {
    const response = await apiClient.get<AssessmentQuestion[]>('/api/assessments/questions', { params: { isActive: true } })
    return response.data
  },
  async createPhysicalAssessment(patientId: string, body: Record<string, unknown>) {
    const response = await apiClient.post(`/api/physical-assessments/patients/${patientId}`, body)
    return response.data
  },
  async createAssessment(body: { patientId: string; notes?: string; responses: { assessmentQuestionId: string; answer: string }[] }) {
    const response = await apiClient.post<{ id: string }>('/api/assessments', body)
    return response.data
  },
  async decide(assessmentId: string, body: { outcome: number; reason?: string; additionalInfoRequest?: string }) {
    const response = await apiClient.post(`/api/assessments/${assessmentId}/decisions`, body)
    return response.data
  },
}
