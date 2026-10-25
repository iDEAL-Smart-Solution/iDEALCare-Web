import apiClient from '../lib/apiClient'

export interface ConversationDto {
  id: string
  patientId: string
  patientName?: string | null
  subject?: string | null
  isActive: boolean
  createdAt: string
  lastMessage?: MessageDto | null
}
export interface MessageDto {
  id: string
  conversationId: string
  senderUserId: string
  senderFullName?: string | null
  body: string
  status: number
  sentAt: string
  readAt?: string | null
}
export const communicationApi = {
  async createConversation(patientId: string, subject: string, initialMessage: string) {
    const response = await apiClient.post<ConversationDto>('/api/communication/conversations', {
      patientId, subject, initialMessage,
    })
    return response.data
  },
  async myConversations() {
    const response = await apiClient.get<ConversationDto[]>('/api/communication/conversations')
    return response.data
  },
  async messages(conversationId: string) {
    const response = await apiClient.get<MessageDto[]>(`/api/communication/conversations/${conversationId}/messages`)
    return response.data
  },
  async send(conversationId: string, body: string) {
    const response = await apiClient.post<MessageDto>(`/api/communication/conversations/${conversationId}/messages`, { body })
    return response.data
  },
}
