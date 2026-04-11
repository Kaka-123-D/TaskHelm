import { EventRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const encoder = new TextEncoder()
  let lastEventId = request.headers.get('Last-Event-ID') ?? ''

  const stream = new ReadableStream({
    start(controller) {
      const db = getDb()
      const eventRepo = new EventRepository(db)

      const sendEvents = () => {
        try {
          const events = eventRepo.findRecent(50)
          const newEvents = lastEventId
            ? events.filter(e => e.created_at > lastEventId)
            : events.slice(0, 10)

          for (const event of [...newEvents].reverse()) {
            const data = JSON.stringify({
              id: event.id,
              entity_type: event.entity_type,
              entity_id: event.entity_id,
              event_type: event.event_type,
              payload: event.payload_json ? JSON.parse(event.payload_json) : null,
              created_at: event.created_at,
            })
            controller.enqueue(encoder.encode(`id: ${event.created_at}\ndata: ${data}\n\n`))
            lastEventId = event.created_at
          }
        } catch {
          // Stream may be closed
        }
      }

      sendEvents()

      const interval = setInterval(sendEvents, 2000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
