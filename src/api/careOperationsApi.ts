import apiClient from '../lib/apiClient'

export type HomeCareStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7
export interface HomeCareRequestDto {
  id: string; patientId: string; patientName?: string | null; assignedStaffUserId?: string | null
  assignedStaffUserName?: string | null; address: string; city?: string | null; state?: string | null
  country?: string | null; locationNotes?: string | null; estimatedDistanceKm?: number | null
  estimatedTravelTime?: string | null; status: HomeCareStatus; providerNotes?: string | null; createdAt: string
}
export interface BedDto { id: string; roomId: string; label: string; status: 1 | 2 | 3 | 4; notes?: string | null }
export interface RoomDto { id: string; facilityId: string; name: string; description?: string | null; isActive: boolean; beds: BedDto[] }
export interface FacilityDto { id: string; name: string; address?: string | null; city?: string | null; state?: string | null; country?: string | null; isActive: boolean; rooms: RoomDto[] }

export const homeCareStatusLabels: Record<HomeCareStatus, string> = { 1: 'Requested', 2: 'Under review', 3: 'Approved', 4: 'Scheduled', 5: 'In progress', 6: 'Completed', 7: 'Cancelled' }
export const bedStatusLabels: Record<number, string> = { 1: 'Available', 2: 'Occupied', 3: 'Reserved', 4: 'Maintenance' }

export const careOperationsApi = {
  async myHomeCareRequests(patientId: string) { return (await apiClient.get<HomeCareRequestDto[]>(`/api/home-care/requests/patients/${patientId}`)).data },
  async createMyHomeCareRequest(body: { patientId: string; address?: string; city?: string; state?: string; country?: string; locationNotes?: string }) {
    return (await apiClient.post<HomeCareRequestDto>('/api/home-care/requests', body)).data
  },
  async homeCareRequests() { return (await apiClient.get<HomeCareRequestDto[]>('/api/home-care/requests')).data },
  async assessHomeCare(id: string, body: { estimatedDistanceKm?: number; estimatedTravelTime?: string; providerNotes?: string; status?: HomeCareStatus }) {
    return (await apiClient.patch<HomeCareRequestDto>(`/api/home-care/requests/${id}/assess-location`, body)).data
  },
  async assignHomeCareStaff(id: string, assignedStaffUserId?: string) {
    return (await apiClient.patch<HomeCareRequestDto>(`/api/home-care/requests/${id}/assign-staff`, { assignedStaffUserId })).data
  },
  async updateHomeCareStatus(id: string, status: HomeCareStatus, providerNotes?: string) {
    return (await apiClient.patch<HomeCareRequestDto>(`/api/home-care/requests/${id}/status`, { status, providerNotes })).data
  },
  async facilities() { return (await apiClient.get<FacilityDto[]>('/api/facilities', { params: { isActive: undefined } })).data },
  async createFacility(body: { name: string; address?: string; city?: string; state?: string; country?: string; isActive: boolean }) {
    return (await apiClient.post<FacilityDto>('/api/facilities', body)).data
  },
  async createRoom(facilityId: string, body: { name: string; description?: string; isActive: boolean }) {
    return (await apiClient.post<RoomDto>(`/api/facilities/${facilityId}/rooms`, body)).data
  },
  async createBed(facilityId: string, roomId: string, body: { label: string; status: number; notes?: string }) {
    return (await apiClient.post<BedDto>(`/api/facilities/${facilityId}/rooms/${roomId}/beds`, body)).data
  },
  async updateBedStatus(facilityId: string, roomId: string, bedId: string, status: number, notes?: string) {
    return (await apiClient.patch<BedDto>(`/api/facilities/${facilityId}/rooms/${roomId}/beds/${bedId}/status`, { status, notes })).data
  },
}
