import apiClient from '../lib/apiClient'
import type { PatientCareRecordDto } from '../types/patient'

export interface CareRecordHistoryPage {
  items: PatientCareRecordDto[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CareRecordHistoryFilter {
  searchTerm?: string
  recordType?: number
  fromDate?: string
  toDate?: string
  patientId?: string
  page?: number
  pageSize?: number
}

export const careRecordApi = {
  async searchHistory(filter: CareRecordHistoryFilter) {
    return (await apiClient.get<CareRecordHistoryPage>('/api/care-records/history', { params: filter })).data
  },
}
