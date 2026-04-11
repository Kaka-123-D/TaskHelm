'use client'

import { useState, useEffect } from 'react'

interface NotificationItem {
  id: string
  title: string
  body: string | null
  level: string
  created_at: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          setNotifications(await res.json() as NotificationItem[])
        }
      } catch {
        // Ignore fetch errors
      }
    }
    void load()
    const interval = setInterval(() => void load(), 10000)
    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.filter(n => n.level !== 'info').length

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors relative"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute left-0 top-8 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-xs text-zinc-500">No notifications</p>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="p-3 border-b border-zinc-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    n.level === 'error' ? 'bg-red-400' :
                    n.level === 'warning' ? 'bg-yellow-400' :
                    n.level === 'success' ? 'bg-green-400' :
                    'bg-zinc-600'
                  }`} />
                  <span className="text-sm text-zinc-200">{n.title}</span>
                </div>
                {n.body && <p className="text-xs text-zinc-500 mt-1">{n.body}</p>}
                <span className="text-xs text-zinc-600 mt-1 block">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
