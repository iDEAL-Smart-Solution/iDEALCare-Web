import { useEffect, useRef, useState } from 'react'
import { useNotificationStore } from '../stores/notificationStore'

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function PatientNotificationsPopover() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const notifications = useNotificationStore((state) => state.notifications)
  const loading = useNotificationStore((state) => state.loading)
  const hasLoaded = useNotificationStore((state) => state.hasLoaded)
  const error = useNotificationStore((state) => state.error)
  const refresh = useNotificationStore((state) => state.refresh)
  const markRead = useNotificationStore((state) => state.markRead)

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  async function handleMarkRead(id: string) {
    try {
      await markRead(id)
    } catch {
      // Preserve the unread state if the server could not save the read receipt.
    }
  }

  return (
    <div className="notification-popover" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="notification-popover__trigger"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-controls="patient-notifications-panel"
        onClick={() => {
          const nextOpen = !open
          setOpen(nextOpen)
          if (nextOpen) void refresh()
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && <span className="notification-popover__badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <section className="notification-popover__panel" id="patient-notifications-panel" role="dialog" aria-label="Your notifications" aria-modal="false">
          <header className="notification-popover__header">
            <div>
              <h2>Notifications</h2>
              <p>{unreadCount === 0 ? 'You’re all caught up' : `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`}</p>
            </div>
            <button className="notification-popover__refresh" type="button" onClick={() => void refresh()} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </header>

          {error && <p className="notification-popover__error" role="alert">{error}</p>}
          {loading && !hasLoaded ? (
            <p className="notification-popover__empty" role="status">Loading notifications…</p>
          ) : notifications.length === 0 ? (
            <div className="notification-popover__empty">
              <span aria-hidden="true">✦</span>
              <p>New updates from your care team will appear here.</p>
            </div>
          ) : (
            <ul className="notification-popover__list">
              {notifications.map((notification) => (
                <li key={notification.id} className={`notification-popover__item${notification.isRead ? '' : ' notification-popover__item--unread'}`}>
                  <span className="notification-popover__mark" aria-hidden="true">{notification.isRead ? '•' : '✦'}</span>
                  <div className="notification-popover__content">
                    <h3>{notification.title}</h3>
                    <p>{notification.body}</p>
                    <time dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time>
                    {!notification.isRead && <button type="button" className="notification-popover__read" onClick={() => void handleMarkRead(notification.id)}>Mark as read</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
