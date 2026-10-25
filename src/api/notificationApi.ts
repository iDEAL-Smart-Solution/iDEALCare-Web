import apiClient from '../lib/apiClient'

export interface AppNotification {
  id: string
  type: number
  title: string
  body: string
  isRead: boolean
  createdAt: string
  readAt: string | null
  referenceId: string | null
  referenceType: string | null
}

export const notificationApi = {
  async listMine() {
    const response = await apiClient.get<AppNotification[]>('/api/notifications')
    return response.data
  },

  async getUnreadCount() {
    const response = await apiClient.get<{ count: number }>('/api/notifications/unread-count')
    return response.data.count
  },

  async markRead(id: string) {
    const response = await apiClient.patch<AppNotification>(`/api/notifications/${id}/read`)
    return response.data
  },
}
