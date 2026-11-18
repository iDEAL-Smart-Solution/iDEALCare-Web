import apiClient from '../lib/apiClient'

export type MedicalDocumentType = 1 | 2 | 3 | 4 | 5 | 6 | 7
export interface MedicalDocumentDto {
  id: string
  patientId: string
  documentType: MedicalDocumentType
  fileName: string
  fileUrl: string
  description?: string | null
  uploadedByUserId: string
  createdAt: string
}

export const medicalDocumentTypes = [
  { value: 1, label: 'Medical report' }, { value: 2, label: 'Lab result' },
  { value: 3, label: 'Prescription' }, { value: 4, label: 'Discharge summary' },
  { value: 5, label: 'Imaging report' }, { value: 6, label: 'Referral letter' }, { value: 7, label: 'Other' },
] as const

export const medicalApi = {
  async listDocuments(patientId: string) {
    const response = await apiClient.get<MedicalDocumentDto[]>(`/api/medical/patients/${patientId}/documents`)
    return response.data
  },
  async uploadDocument(patientId: string, file: File, documentType: MedicalDocumentType, description?: string) {
    const form = new FormData()
    form.append('file', file); form.append('documentType', String(documentType))
    if (description?.trim()) form.append('description', description.trim())
    const response = await apiClient.post<MedicalDocumentDto>(`/api/medical/patients/${patientId}/documents`, form)
    return response.data
  },
  async deleteDocument(patientId: string, documentId: string) {
    await apiClient.delete(`/api/medical/patients/${patientId}/documents/${documentId}`)
  },
}
