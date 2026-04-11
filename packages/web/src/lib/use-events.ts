'use client'

import { useEffect, useRef, useState } from 'react'

export interface TaskHelmEvent {
  id: string
  entity_type: string
  entity_id: string
  event_type: string
  payload: unknown
  created_at: string
}

export function useEvents(onEvent?: (event: TaskHelmEvent) => void) {
  const [events, setEvents] = useState<TaskHelmEvent[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/events')
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as TaskHelmEvent
        setEvents(prev => [event, ...prev].slice(0, 100))
        onEvent?.(event)
      } catch {
        // Ignore malformed events
      }
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- onEvent is intentionally excluded

  return { events, connected }
}
