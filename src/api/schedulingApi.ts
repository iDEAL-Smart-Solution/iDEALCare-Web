import apiClient from '../lib/apiClient'

export type AppointmentType = 1 | 2 | 3 | 4 | 5
export type AppointmentStatus = 1 | 2 | 3 | 4 | 5 | 6

export interface AppointmentDto {
  id: string
  patientId: string
  patientName?: string | null
  assignedStaffUserId?: string | null
  assignedStaffUserName?: string | null
  appointmentType: AppointmentType
  status: AppointmentStatus
  scheduledAt: string
  durationMinutes?: number | null
  location?: string | null
  notes?: string | null
  cancellationReason?: string | null
}

export interface AvailabilitySlotDto {
  id: string
  staffUserId?: string | null
  staffUserName?: string | null
  startAt: string
  endAt: string
  isBooked: boolean
}

export const appointmentTypes = [
  { value: 1, label: 'Physical assessment' },
  { value: 2, label: 'Admission' },
  { value: 3, label: 'Home visit' },
  { value: 4, label: 'Follow-up' },
  { value: 5, label: 'General' },
] as const

export const appointmentStatuses: Record<AppointmentStatus, string> = {
  1: 'Scheduled', 2: 'Confirmed', 3: 'Completed', 4: 'Cancelled', 5: 'Rescheduled', 6: 'No show',
}

export const schedulingApi = {
  async listAppointments(filters?: { fromDate?: string; toDate?: string; status?: AppointmentStatus }) {
    const response = await apiClient.get<AppointmentDto[]>('/api/scheduling/appointments', { params: filters })
    return response.data
  },
  async patientAppointments(patientId: string) {
    const response = await apiClient.get<AppointmentDto[]>(`/api/scheduling/appointments/patients/${patientId}`)
    return response.data
  },
  async availableSlots(fromDate?: string, toDate?: string) {
    const response = await apiClient.get<AvailabilitySlotDto[]>('/api/scheduling/availability-slots/available', { params: { fromDate, toDate } })
    return response.data
  },
  async allSlots(fromDate?: string, toDate?: string) {
    const response = await apiClient.get<AvailabilitySlotDto[]>('/api/scheduling/availability-slots', { params: { fromDate, toDate } })
    return response.data
  },
  async createSlot(body: { startAt: string; endAt: string }) {
    const response = await apiClient.post<AvailabilitySlotDto>('/api/scheduling/availability-slots', body)
    return response.data
  },
  async createAppointment(body: { patientId: string; assignedStaffUserId?: string; appointmentType: AppointmentType; scheduledAt: string; durationMinutes?: number; location?: string; notes?: string }) {
    const response = await apiClient.post<AppointmentDto>('/api/scheduling/appointments', body)
    return response.data
  },
  async bookSlot(body: { slotId: string; patientId: string; appointmentType: AppointmentType; location?: string; notes?: string }) {
    const response = await apiClient.post<AppointmentDto>('/api/scheduling/appointments/book-slot', body)
    return response.data
  },
  async cancel(id: string, cancellationReason?: string) {
    const response = await apiClient.post<AppointmentDto>(`/api/scheduling/appointments/${id}/cancel`, { cancellationReason })
    return response.data
  },
  async updateStatus(id: string, status: AppointmentStatus) {
    const response = await apiClient.patch<AppointmentDto>(`/api/scheduling/appointments/${id}/status`, { status })
    return response.data
  },
  async assignNurse(id: string, nurseUserId: string) {
    const response = await apiClient.patch<AppointmentDto>(`/api/scheduling/appointments/${id}/nurse`, { nurseUserId })
    return response.data
  },
}
