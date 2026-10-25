import { create } from 'zustand'
import { notificationApi, type AppNotification } from '../api/notificationApi'

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  hasLoaded: boolean
  error: string | null
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  clear: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  hasLoaded: false,
  error: null,

  async refresh() {
    if (!get().hasLoaded) set({ loading: true })
    try {
      const [notifications, unreadCount] = await Promise.all([
        notificationApi.listMine(),
        notificationApi.getUnreadCount(),
      ])
      set({ notifications, unreadCount, hasLoaded: true, loading: false, error: null })
    } catch {
      set({ loading: false, hasLoaded: true, error: 'Notifications could not be loaded. Please try again.' })
    }
  },

  async markRead(id) {
    const current = get().notifications.find((item) => item.id === id)
    if (!current || current.isRead) return
    const updated = await notificationApi.markRead(id)
    set((state) => ({
      notifications: state.notifications.map((item) => item.id === id ? updated : item),
      unreadCount: Math.max(0, state.unreadCount - 1),
      error: null,
    }))
  },

  clear() {
    set({ notifications: [], unreadCount: 0, loading: false, hasLoaded: false, error: null })
  },
}))
